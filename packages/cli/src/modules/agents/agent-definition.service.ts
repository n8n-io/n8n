import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { deepCopy } from 'n8n-workflow';

import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import {
	getAgentDefinitionContent,
	getAgentTaskBody,
	type AgentDefinition,
} from './utils/agent-definition';
import { saveAgentDraftFenced } from './utils/agent-draft.utils';

@Service()
export class AgentDefinitionService {
	constructor(
		private readonly taskRepository: AgentTaskRepository,
		private readonly taskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly agentRepository: AgentRepository,
		private readonly transactionRunner: TransactionRunner,
	) {}

	async readDraft(agent: Agent): Promise<AgentDefinition> {
		const tasks = await this.taskRepository.findByAgentId(agent.id);
		if (!(await this.agentRepository.hasRevision(agent.id, agent.revision))) {
			throw new ConflictError('Agent was modified concurrently; please retry');
		}
		return {
			...getAgentDefinitionContent(agent),
			tasks: new Map(tasks.map((task) => [task.id, getAgentTaskBody(task)])),
		};
	}

	async readVersion(version: AgentHistory, ctx: OperationContext = {}): Promise<AgentDefinition> {
		const tasks = await this.taskSnapshotRepository.findByVersionId(version.versionId, ctx);
		return {
			...getAgentDefinitionContent(version),
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
		return await this.transactionRunner.run(ctx, async (txCtx) => {
			// Preserve workflow input names in the JSON configuration.
			agent.schema = structuredClone(definition.schema);
			agent.tools = deepCopy(definition.tools);
			agent.skills = deepCopy(definition.skills);
			if (agent.schema) agent.name = agent.schema.name;
			await saveAgentDraftFenced(this.agentRepository, agent, txCtx);
			return await this.taskRepository.replaceForAgent(agent.id, definition.tasks, txCtx);
		});
	}
}
