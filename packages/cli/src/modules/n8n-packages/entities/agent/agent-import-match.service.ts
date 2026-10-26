import { ProjectScopeService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentsService } from '@/modules/agents/agents.service';

import type {
	AgentImportIdentities,
	AgentImportMatchContext,
	AgentImportMatches,
	AgentTaskImportMappings,
	PreparedAgent,
} from './agent-import.types';

interface TaskMapping {
	sourceAgentId: string;
	targetAgentId: string;
	sourceTaskId: string;
	targetTaskId: string;
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

	async mapTaskIds(
		agents: Array<Pick<PreparedAgent, 'sourceAgentId' | 'tasks'>>,
		identities: AgentImportIdentities,
	): Promise<AgentTaskImportMappings> {
		const result: AgentTaskImportMappings = {
			taskIdsBySourceAgentId: new Map(),
			idConflicts: [],
		};
		const mappings: TaskMapping[] = [];
		for (const agent of agents) {
			const identity = identities.identities.get(agent.sourceAgentId);
			if (!identity) continue;
			result.taskIdsBySourceAgentId.set(agent.sourceAgentId, new Map());
			for (const sourceTaskId of Object.keys(agent.tasks)) {
				mappings.push({
					sourceAgentId: agent.sourceAgentId,
					targetAgentId: identity.targetAgentId,
					sourceTaskId,
					targetTaskId: sourceTaskId,
				});
			}
		}
		const owners = await this.agentTaskService.findImportIdOwners(
			mappings.map(({ targetTaskId }) => targetTaskId),
		);
		const ownersById = new Map(owners.map(({ id, agentId }) => [id, agentId]));
		const available: TaskMapping[] = [];
		for (const mapping of mappings) {
			const conflictingAgentId = ownersById.get(mapping.targetTaskId);
			if (conflictingAgentId !== undefined && conflictingAgentId !== mapping.targetAgentId) {
				result.idConflicts.push(toTaskIdConflict(mapping, conflictingAgentId));
			} else {
				available.push(mapping);
			}
		}
		collectTaskMappings(available, result);
		return result;
	}
}

function toTaskIdConflict(mapping: TaskMapping, conflictingAgentId: string) {
	const { sourceAgentId, sourceTaskId, targetAgentId, targetTaskId } = mapping;
	return { sourceAgentId, sourceTaskId, targetAgentId, targetTaskId, conflictingAgentId };
}

function collectTaskMappings(mappings: TaskMapping[], result: AgentTaskImportMappings): void {
	const byTargetId = new Map<string, TaskMapping[]>();
	for (const mapping of mappings) {
		const group = byTargetId.get(mapping.targetTaskId) ?? [];
		group.push(mapping);
		byTargetId.set(mapping.targetTaskId, group);
	}
	for (const group of byTargetId.values()) {
		for (const mapping of group) {
			const other = group.find(({ targetAgentId }) => targetAgentId !== mapping.targetAgentId);
			if (other) {
				result.idConflicts.push(toTaskIdConflict(mapping, other.targetAgentId));
				continue;
			}
			result.taskIdsBySourceAgentId
				.get(mapping.sourceAgentId)
				?.set(mapping.sourceTaskId, mapping.targetTaskId);
		}
	}
}
