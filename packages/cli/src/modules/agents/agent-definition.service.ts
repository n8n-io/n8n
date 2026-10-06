import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import {
	getAgentDefinitionContent,
	getAgentTaskBody,
	type AgentDefinition,
} from './utils/agent-definition';

@Service()
export class AgentDefinitionService {
	constructor(
		private readonly taskRepository: AgentTaskRepository,
		private readonly taskSnapshotRepository: AgentTaskSnapshotRepository,
	) {}

	async readDraft(agent: Agent): Promise<AgentDefinition> {
		const tasks = await this.taskRepository.findByAgentId(agent.id);
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
}
