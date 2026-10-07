import { ProjectScopeService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { generateAgentResourceId } from '@/modules/agents/utils/agent-resource-id';

import type {
	AgentImportIdentities,
	AgentImportMatchContext,
	AgentImportMatches,
	AgentTaskImportMappings,
	PreparedAgent,
	ResolvedAgentImportIdentity,
} from './agent-import.types';
import { WorkflowIdPolicy } from '../../n8n-packages.types';

interface TaskMapping {
	sourceAgentId: string;
	targetAgentId: string;
	sourceTaskId: string;
	targetTaskId: string;
	matched: boolean;
}

@Service()
export class AgentImportMatchService {
	constructor(
		private readonly projectScopeService: ProjectScopeService,
		private readonly agentRepository: AgentRepository,
		private readonly taskRepository: AgentTaskRepository,
	) {}

	async findBySourceAgentIds(
		context: AgentImportMatchContext,
		sourceAgentIds: string[],
	): Promise<AgentImportMatches> {
		const result: AgentImportMatches = {
			projectId: context.projectId,
			sourceAgentIds: [...new Set(sourceAgentIds)],
			matches: new Map(),
			lineageConflicts: [],
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
		const candidates = await this.agentRepository.findImportCandidates(
			context.projectId,
			result.sourceAgentIds,
		);
		const { matches, ambiguous } = matchSourceIds(
			result.sourceAgentIds,
			candidates,
			(agent) => agent.sourceAgentId,
		);
		result.matches = matches;
		result.lineageConflicts = [...ambiguous].map(([sourceAgentId, existingAgents]) => ({
			sourceAgentId,
			projectId: context.projectId,
			existingAgents,
		}));
		return result;
	}

	/** Allocate only after matching. The planner decides which definitions it will apply. */
	async allocateAgentIds(
		matches: AgentImportMatches,
		idPolicy: WorkflowIdPolicy = WorkflowIdPolicy.Source,
	): Promise<AgentImportIdentities> {
		const result: AgentImportIdentities = {
			projectId: matches.projectId,
			idPolicy,
			identities: new Map(),
			lineageConflicts: matches.lineageConflicts,
			idConflicts: [],
		};
		const ambiguous = new Set(matches.lineageConflicts.map(({ sourceAgentId }) => sourceAgentId));
		const unmatched = matches.sourceAgentIds.filter(
			(id) => !matches.matches.has(id) && !ambiguous.has(id),
		);
		const owners =
			idPolicy === WorkflowIdPolicy.Source
				? await this.agentRepository.findImportIdOwners(unmatched)
				: [];
		const ownersById = new Map(owners.map((owner) => [owner.id, owner]));

		for (const sourceAgentId of matches.sourceAgentIds) {
			if (ambiguous.has(sourceAgentId)) continue;
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
			let targetAgentId = existing?.id ?? sourceAgentId;
			if (!existing && idPolicy === WorkflowIdPolicy.New) targetAgentId = generateNanoId();
			result.identities.set(sourceAgentId, { sourceAgentId, targetAgentId, existing });
		}
		return result;
	}

	async mapTaskIds(
		agents: Array<Pick<PreparedAgent, 'sourceAgentId' | 'tasks'>>,
		identities: AgentImportIdentities,
	): Promise<AgentTaskImportMappings> {
		const result: AgentTaskImportMappings = {
			taskIdsBySourceAgentId: new Map(),
			lineageConflicts: [],
			idConflicts: [],
		};
		const mappings: TaskMapping[] = [];
		for (const agent of agents) {
			const identity = identities.identities.get(agent.sourceAgentId);
			if (!identity) continue;
			result.taskIdsBySourceAgentId.set(agent.sourceAgentId, new Map());
			mappings.push(
				...(await this.matchTasks(identity, Object.keys(agent.tasks), identities.idPolicy, result)),
			);
		}
		const sourceCreates =
			identities.idPolicy === WorkflowIdPolicy.Source
				? mappings.filter(({ matched }) => !matched).map(({ targetTaskId }) => targetTaskId)
				: [];
		const owners = await this.taskRepository.findImportIdOwners(sourceCreates);
		const ownersById = new Map(owners.map(({ id, agentId }) => [id, agentId]));
		const available: TaskMapping[] = [];
		for (const mapping of mappings) {
			const conflictingAgentId = mapping.matched ? undefined : ownersById.get(mapping.targetTaskId);
			if (conflictingAgentId !== undefined) {
				result.idConflicts.push(toTaskIdConflict(mapping, conflictingAgentId));
			} else {
				available.push(mapping);
			}
		}
		collectTaskMappings(available, result);
		return result;
	}

	private async matchTasks(
		identity: ResolvedAgentImportIdentity,
		sourceTaskIds: string[],
		idPolicy: WorkflowIdPolicy,
		result: AgentTaskImportMappings,
	): Promise<TaskMapping[]> {
		const { sourceAgentId, targetAgentId } = identity;
		const candidates = await this.taskRepository.findImportCandidates(targetAgentId, sourceTaskIds);
		const { matches, ambiguous } = matchSourceIds(
			sourceTaskIds,
			candidates,
			(task) => task.sourceTaskId,
		);
		for (const [sourceTaskId, tasks] of ambiguous) {
			result.lineageConflicts.push({
				sourceAgentId,
				targetAgentId,
				sourceTaskId,
				existingTaskIds: tasks.map(({ id }) => id),
			});
		}
		const reservedIds = new Set(candidates.map(({ id }) => id));
		const mappings: TaskMapping[] = [];
		for (const sourceTaskId of sourceTaskIds) {
			if (ambiguous.has(sourceTaskId)) continue;
			const existing = matches.get(sourceTaskId);
			let targetTaskId = existing?.id ?? sourceTaskId;
			if (!existing && idPolicy === WorkflowIdPolicy.New) {
				targetTaskId = generateAgentResourceId('task', reservedIds);
			}
			reservedIds.add(targetTaskId);
			mappings.push({
				sourceAgentId,
				targetAgentId,
				sourceTaskId,
				targetTaskId,
				matched: existing !== undefined,
			});
		}
		return mappings;
	}
}

/** A stored source identity excludes the local-ID fallback. Ambiguity excludes both. */
function matchSourceIds<T extends { id: string }>(
	sourceIds: string[],
	candidates: T[],
	getSourceId: (candidate: T) => string | null,
) {
	const requested = new Set(sourceIds);
	const bySourceId = new Map<string, T[]>();
	for (const candidate of candidates) {
		const sourceId = getSourceId(candidate);
		if (sourceId === null || !requested.has(sourceId)) continue;
		const group = bySourceId.get(sourceId) ?? [];
		group.push(candidate);
		bySourceId.set(sourceId, group);
	}
	const matches = new Map<string, T>();
	const ambiguous = new Map<string, T[]>();
	for (const [sourceId, group] of bySourceId) {
		if (group.length === 1) matches.set(sourceId, group[0]);
		else
			ambiguous.set(
				sourceId,
				group.toSorted((left, right) => left.id.localeCompare(right.id)),
			);
	}
	for (const candidate of candidates) {
		if (
			getSourceId(candidate) !== null ||
			!requested.has(candidate.id) ||
			bySourceId.has(candidate.id)
		)
			continue;
		matches.set(candidate.id, candidate);
	}
	return { matches, ambiguous };
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
