import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { deepCopy } from 'n8n-workflow';

import { AgentSkillRefsService } from './agent-skill-refs.service';
import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import { fromAgentDocument } from './json-config/agent-document';
import { AgentHistoryRepository } from './repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import {
	getAgentDefinitionContent,
	getAgentTaskBody,
	type AgentDefinition,
	type PendingSkillRefs,
	type AgentDefinitionMetadata,
} from './utils/agent-definition';
import { saveAgentDraftFenced } from './utils/agent-draft.utils';

@Service()
export class AgentDefinitionService {
	constructor(
		private readonly taskRepository: AgentTaskRepository,
		private readonly historyRepository: AgentHistoryRepository,
		private readonly taskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly agentRepository: AgentRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly agentSkillRefs: AgentSkillRefsService,
	) {}

	/** Call after all draft writes, while the transaction still owns the agent row. */
	async captureVersion(
		agent: Agent,
		savedBy: User | string,
		ctx: OperationContext,
	): Promise<AgentHistory> {
		if (!agent.versionId) throw new ConflictError('Agent has no saved version');

		// Check for an existing snapshot
		const existing = await this.historyRepository.findByVersionAndAgentId(
			agent.versionId,
			agent.id,
			ctx,
		);
		if (existing) return existing;

		// Capture skill versions
		const pins = await this.agentSkillRefs.versionSnapshot(agent, ctx);

		// Insert a new history row
		const history = await this.historyRepository.saveVersion(
			{
				versionId: agent.versionId,
				agentId: agent.id,
				schema: agent.schema
					? {
							...agent.schema,
							integrations: (agent.integrations ?? []).filter(
								({ type }) => type === N8N_CHAT_INTEGRATION_TYPE,
							),
						}
					: null,
				tools: agent.tools,
				savedBy,
			},
			ctx,
		);

		// Link the skill versions
		await this.agentSkillRefs.pinVersion(history.versionId, pins, ctx);

		// Snapshot tasks
		const tasks = await this.taskRepository.findByAgentId(agent.id, ctx);
		await this.taskSnapshotRepository.saveForVersion(
			tasks.map((task) => ({
				...getAgentTaskBody(task),
				versionId: history.versionId,
				taskId: task.id,
				enabled: agent.schema?.tasks?.some((ref) => ref.id === task.id && ref.enabled) ?? false,
			})),
			ctx,
		);

		return history;
	}

	async readDraft(
		agent: Agent,
		ctx: OperationContext = {},
		pending?: PendingSkillRefs,
	): Promise<AgentDefinition> {
		const tasks = await this.taskRepository.findByAgentId(agent.id);
		if (!(await this.agentRepository.hasRevision(agent.id, agent.revision))) {
			throw new ConflictError('Agent was modified concurrently; please retry');
		}
		const skillRefs = pending
			? pending.skillRefs
			: await this.agentSkillRefs.refsForDraft(agent, ctx);
		const skills = await this.agentSkillRefs.skillsForRefs(skillRefs, ctx);
		return {
			...getAgentDefinitionContent(agent, skillRefs, skills),
			tasks: new Map(tasks.map((task) => [task.id, getAgentTaskBody(task)])),
		};
	}

	async readVersion(version: AgentHistory, ctx: OperationContext = {}): Promise<AgentDefinition> {
		const tasks = await this.taskSnapshotRepository.findByVersionId(version.versionId, ctx);
		const { skillRefs, skills } = await this.agentSkillRefs.readVersion(version, ctx);
		return {
			...getAgentDefinitionContent(version, skillRefs, skills),
			tasks: new Map(tasks.map((task) => [task.taskId, getAgentTaskBody(task)])),
		};
	}

	/**
	 * Replace the draft atomically. Return whether task bodies changed.
	 * The caller sets the version and integrations. The skill bodies of the
	 * definition are not written: skills live in the skills module. With
	 * `skillPinsFrom`, each skill ref is pinned to the version that this
	 * published version ran (revert).
	 */
	async replaceDraft(
		agent: Agent,
		definition: AgentDefinition,
		ctx: OperationContext = {},
		skillPinsFrom?: Pick<AgentHistory, 'versionId'>,
		metadata?: AgentDefinitionMetadata,
	): Promise<boolean> {
		// Preserve workflow input names in the JSON configuration.
		const document = structuredClone(definition.schema);
		const { config, skillRefs } = document
			? fromAgentDocument(document)
			: { config: null, skillRefs: undefined };
		return await this.transactionRunner.run(ctx, async (txCtx) => {
			agent.schema = config;
			agent.tools = deepCopy(definition.tools);
			if (agent.schema) agent.name = agent.schema.name;
			await saveAgentDraftFenced(this.agentRepository, agent, txCtx, metadata);
			if (skillPinsFrom) {
				await this.agentSkillRefs.restoreDraftRefs(agent, skillPinsFrom, skillRefs, txCtx);
			} else {
				await this.agentSkillRefs.replaceDraftRefs(agent, skillRefs, txCtx);
			}
			return await this.taskRepository.replaceForAgent(agent.id, definition.tasks, txCtx);
		});
	}
}
