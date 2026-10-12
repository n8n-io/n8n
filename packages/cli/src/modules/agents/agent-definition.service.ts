import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { deepCopy } from 'n8n-workflow';

import { AgentSkillRefsService } from './agent-skill-refs.service';
import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import { fromAgentDocument } from './json-config/agent-document';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import {
	getAgentDefinitionContent,
	getAgentTaskBody,
	type AgentDefinition,
	type PendingSkillRefs,
} from './utils/agent-definition';
import { saveAgentDraftFenced } from './utils/agent-draft.utils';

@Service()
export class AgentDefinitionService {
	constructor(
		private readonly taskRepository: AgentTaskRepository,
		private readonly taskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly agentRepository: AgentRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly agentSkillRefs: AgentSkillRefsService,
	) {}

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
		return {
			...getAgentDefinitionContent(agent, skillRefs),
			tasks: new Map(tasks.map((task) => [task.id, getAgentTaskBody(task)])),
		};
	}

	async readVersion(version: AgentHistory, ctx: OperationContext = {}): Promise<AgentDefinition> {
		const tasks = await this.taskSnapshotRepository.findByVersionId(version.versionId, ctx);
		const skillRefs = await this.agentSkillRefs.refsForVersion(version, ctx);
		return {
			...getAgentDefinitionContent(version, skillRefs),
			tasks: new Map(tasks.map((task) => [task.taskId, getAgentTaskBody(task)])),
		};
	}

	/**
	 * Replace the draft atomically. Return whether task bodies changed.
	 * The caller sets the version and integrations.
	 */
	async replaceDraft(
		agent: Agent,
		definition: AgentDefinition,
		ctx: OperationContext = {},
	): Promise<boolean> {
		// Preserve workflow input names in the JSON configuration.
		const document = structuredClone(definition.schema);
		const { config, skillRefs } = document
			? fromAgentDocument(document)
			: { config: null, skillRefs: undefined };
		return await this.transactionRunner.run(ctx, async (txCtx) => {
			agent.schema = config;
			agent.tools = deepCopy(definition.tools);
			agent.skills = deepCopy(definition.skills);
			if (agent.schema) agent.name = agent.schema.name;
			await saveAgentDraftFenced(this.agentRepository, agent, txCtx);
			await this.agentSkillRefs.replaceDraftRefs(agent, skillRefs, txCtx);
			return await this.taskRepository.replaceForAgent(agent.id, definition.tasks, txCtx);
		});
	}
}
