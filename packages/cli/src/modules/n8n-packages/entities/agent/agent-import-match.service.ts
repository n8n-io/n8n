import { ProjectScopeService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentsService } from '@/modules/agents/agents.service';

import type {
	AgentImportIdentities,
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
	): Promise<AgentImportMatches> {
		const result: AgentImportMatches = {
			projectId: context.projectId,
			sourceAgentIds: [...new Set(sourceAgentIds)],
			matches: new Map(),
		};
		if (sourceAgentIds.length === 0 || context.projectPendingCreation) return result;

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
			result.sourceAgentIds,
		);
		result.matches = new Map(candidates.map((agent) => [agent.id, agent]));
		return result;
	}

	/** Allocate only after matching. The planner decides which definitions it will apply. */
	async allocateAgentIds(matches: AgentImportMatches): Promise<AgentImportIdentities> {
		const result: AgentImportIdentities = {
			projectId: matches.projectId,
			identities: new Map(),
			idConflicts: [],
		};
		const unmatched = matches.sourceAgentIds.filter((id) => !matches.matches.has(id));
		const owners = await this.agentsService.findImportIdOwners(unmatched);
		const ownersById = new Map(owners.map((owner) => [owner.id, owner]));

		for (const sourceAgentId of matches.sourceAgentIds) {
			const owner = ownersById.get(sourceAgentId);
			if (owner) {
				result.idConflicts.push({
					sourceAgentId,
					existingAgentId: owner.id,
					existingProjectId: owner.projectId,
				});
				continue;
			}
			const existing = matches.matches.get(sourceAgentId) ?? null;
			result.identities.set(sourceAgentId, {
				sourceAgentId,
				targetAgentId: sourceAgentId,
				existing,
			});
		}
		return result;
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
