import { ProjectScopeService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentsService } from '@/modules/agents/agents.service';
import type { AgentImportIdentity } from '@/modules/agents/repositories/agent.repository';

import type {
	AgentImportMatchContext,
	AgentImportMatches,
	AgentTaskIdConflict,
	PreparedAgent,
} from './agent-import.types';

interface ImportedTask {
	sourceAgentId: string;
	sourceTaskId: string;
}

@Service()
export class AgentImportMatchService {
	constructor(
		private readonly projectScopeService: ProjectScopeService,
		private readonly agentsService: AgentsService,
		private readonly agentTaskService: AgentTaskService,
	) {}

	async findBySourceAgentIds(
		context: AgentImportMatchContext,
		sourceAgentIds: string[],
	): Promise<Map<string, AgentImportIdentity>> {
		if (sourceAgentIds.length === 0 || context.projectPendingCreation) return new Map();

		const readableProjects = await this.projectScopeService.getProjectIds(context.user, [
			'agent:read',
		]);
		if (readableProjects !== null && !readableProjects.includes(context.projectId)) {
			throw new ForbiddenError(
				'You do not have permission to read Agents in the destination project.',
			);
		}
		const candidates = await this.agentsService.findImportCandidates(
			context.projectId,
			sourceAgentIds,
		);
		return new Map(candidates.map((agent) => [agent.id, agent]));
	}

	async findImportMatches(
		context: AgentImportMatchContext,
		sourceAgentIds: string[],
	): Promise<AgentImportMatches> {
		const matches = await this.findBySourceAgentIds(context, sourceAgentIds);
		const unmatched = [...new Set(sourceAgentIds)].filter((id) => !matches.has(id));
		const owners = await this.agentsService.findImportIdOwners(unmatched);
		const ownersById = new Map(owners.map((owner) => [owner.id, owner]));
		return {
			matches,
			idConflicts: unmatched.flatMap((sourceAgentId) => {
				const owner = ownersById.get(sourceAgentId);
				return owner ? [{ sourceAgentId, existingProjectId: owner.projectId }] : [];
			}),
		};
	}

	async findTaskIdConflicts(
		agents: Array<Pick<PreparedAgent, 'sourceAgentId' | 'tasks'>>,
	): Promise<AgentTaskIdConflict[]> {
		const importedTasks = agents.flatMap(({ sourceAgentId, tasks }) =>
			Object.keys(tasks).map((sourceTaskId) => ({ sourceAgentId, sourceTaskId })),
		);
		const owners = await this.agentTaskService.findImportIdOwners(
			importedTasks.map(({ sourceTaskId }) => sourceTaskId),
		);
		const ownersById = new Map(owners.map(({ id, agentId }) => [id, agentId]));
		const conflicts: AgentTaskIdConflict[] = [];
		const available: ImportedTask[] = [];
		for (const task of importedTasks) {
			const conflictingAgentId = ownersById.get(task.sourceTaskId);
			if (conflictingAgentId !== undefined && conflictingAgentId !== task.sourceAgentId) {
				conflicts.push({ ...task, conflictingAgentId });
			} else {
				available.push(task);
			}
		}
		return [...conflicts, ...findPlannedTaskIdConflicts(available)];
	}
}

function findPlannedTaskIdConflicts(tasks: ImportedTask[]): AgentTaskIdConflict[] {
	const byTaskId = new Map<string, ImportedTask[]>();
	for (const task of tasks) {
		const group = byTaskId.get(task.sourceTaskId) ?? [];
		group.push(task);
		byTaskId.set(task.sourceTaskId, group);
	}
	const conflicts: AgentTaskIdConflict[] = [];
	for (const task of tasks) {
		const other = byTaskId
			.get(task.sourceTaskId)
			?.find(({ sourceAgentId }) => sourceAgentId !== task.sourceAgentId);
		if (other) {
			conflicts.push({ ...task, conflictingAgentId: other.sourceAgentId });
		}
	}
	return conflicts;
}
