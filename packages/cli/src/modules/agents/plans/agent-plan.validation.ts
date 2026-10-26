import isEqual from 'lodash/isEqual';
import { derivePlanGroups } from './agent-plan-state';

import {
	AgentPlanValidationError,
	parseAgentPlan,
	type AgentPlanDocument,
	type AgentPlanItem,
	type AgentPlanStatus,
} from './agent-plan.schema';

type Entry = { item: AgentPlanItem; parentId: string | null };
type PlanIndex = Map<string, Entry>;
export type AgentPlanReadiness = {
	ready: string[];
	blocked: Array<{ id: string; blockedBy: string[] }>;
};

export const isFinal = (status: AgentPlanStatus) =>
	status === 'done' || status === 'failed' || status === 'cancelled';

function fail(id: string, message: string): never {
	throw new AgentPlanValidationError(`Plan item ${id}: ${message}`);
}

/** Create an index of all tasks and groups to access by ID */
function indexPlan(document: AgentPlanDocument): PlanIndex {
	const index: PlanIndex = new Map();

	const add = (item: AgentPlanItem, parentId: string | null) => {
		if (index.has(item.id)) fail(item.id, 'IDs must be unique');
		index.set(item.id, { item, parentId });
	};

	for (const item of document.items) {
		add(item, null);
		if (item.kind === 'group') {
			for (const task of item.tasks) add(task, item.id);
		}
	}

	return index;
}

/** Traverse all nodes and check for cycles */
function assertAcyclic(edges: Map<string, string[]>) {
	const visited = new Set<string>();
	const visiting = new Set<string>();

	const visit = (id: string) => {
		if (visiting.has(id)) fail(id, 'References must not form a cycle');
		if (visited.has(id)) return;
		visiting.add(id);
		for (const dependency of edges.get(id) ?? []) visit(dependency);
		visiting.delete(id);
		visited.add(id);
	};

	for (const id of edges.keys()) visit(id);
}

/** Check that nodes has maximum one reference in "fallbackFor" of some other node */
function getReplacements(index: PlanIndex): Map<string, string> {
	const replacements = new Map<string, string>();

	for (const { item, parentId } of index.values()) {
		if (item.kind !== 'task' || !item.fallbackFor) continue;
		const original = index.get(item.fallbackFor);
		if (
			!original ||
			original.item.kind !== 'task' ||
			original.parentId !== parentId ||
			!['failed', 'cancelled'].includes(original.item.status)
		) {
			fail(item.id, 'A fallback must replace a Failed or Cancelled sibling task');
		}
		if (replacements.has(item.fallbackFor)) fail(item.id, 'A task can have only one replacement');
		replacements.set(item.fallbackFor, item.id);
	}

	assertAcyclic(
		new Map([...replacements].map(([original, replacement]) => [original, [replacement]])),
	);

	return replacements;
}

function blockedBy({ item, parentId }: Entry, index: PlanIndex): string[] {
	const dependencies = [...item.dependsOn, ...(index.get(parentId ?? '')?.item.dependsOn ?? [])];
	return [...new Set(dependencies)].filter((id) => index.get(id)?.item.status !== 'done');
}

function validateGraph(index: PlanIndex) {
	getReplacements(index);

	for (const entry of index.values()) {
		const { item, parentId } = entry;

		if (new Set(item.dependsOn).size !== item.dependsOn.length) {
			fail(item.id, 'Dependencies must be unique');
		}

		for (const dependency of item.dependsOn) {
			if (dependency === item.id || index.get(dependency)?.parentId !== parentId) {
				fail(item.id, 'Dependencies must reference other items at the same level');
			}
		}

		if (
			item.kind === 'group' &&
			isFinal(item.status) &&
			item.tasks.some((task) => !isFinal(task.status))
		) {
			fail(item.id, 'Every task must have a final status before the group has a final status');
		}
		if (
			!['pending', 'paused', 'cancelled'].includes(item.status) &&
			blockedBy(entry, index).length
		) {
			fail(item.id, 'Prerequisites must be Done before work starts or completes');
		}
	}

	assertAcyclic(new Map([...index].map(([id, { item }]) => [id, item.dependsOn])));
}

export function getAgentPlanReadiness(document: AgentPlanDocument): AgentPlanReadiness {
	const index = indexPlan(document);
	validateGraph(index);

	const readiness: AgentPlanReadiness = { ready: [], blocked: [] };

	for (const entry of index.values()) {
		if (!['pending', 'paused'].includes(entry.item.status)) continue;
		const dependencies = blockedBy(entry, index);
		if (dependencies.length) readiness.blocked.push({ id: entry.item.id, blockedBy: dependencies });
		else readiness.ready.push(entry.item.id);
	}

	return readiness;
}

export function prepareAgentPlan(
	data: unknown,
	formatVersion: number,
	previous: AgentPlanDocument | null,
	now: Date,
): AgentPlanDocument {
	const document = derivePlanGroups(parseAgentPlan(data, formatVersion));
	const index = indexPlan(document);
	const previousIndex = previous ? indexPlan(previous) : new Map<string, Entry>();
	const replacements = getReplacements(index);

	for (const { item } of index.values()) {
		if (!['pending', 'paused'].includes(item.status)) continue;
		if (new Set(item.dependsOn).size !== item.dependsOn.length) {
			fail(item.id, 'Dependencies must be unique');
		}

		item.dependsOn = [
			...new Set(
				item.dependsOn.map((id) => {
					let replacement = id;
					let next = replacements.get(replacement);
					while (next) {
						replacement = next;
						next = replacements.get(replacement);
					}
					return replacement;
				}),
			),
		];
	}

	for (const [id, { item }] of previousIndex) {
		if (
			!index.has(id) &&
			(item.status !== 'pending' ||
				(item.kind === 'group' && item.tasks.some((task) => task.status !== 'pending')))
		) {
			fail(id, 'Only Pending items with no started tasks can be removed');
		}
	}

	for (const [id, { item, parentId }] of index) {
		const old = previousIndex.get(id);
		if (
			item.kind === 'task' &&
			(item.startedAt !== (old?.item.startedAt ?? null) ||
				item.endedAt !== (old?.item.endedAt ?? null))
		) {
			fail(id, 'Timestamps are managed by the service');
		}
		if (!old) {
			if (item.kind === 'task' && item.jobId) fail(id, 'Only job registration can bind a task');
			if (item.status !== 'pending') fail(id, 'New items must be Pending');
			continue;
		}
		if (old.parentId !== parentId || old.item.kind !== item.kind) {
			fail(id, 'Existing items cannot change their type or group');
		}
		if (item.kind === 'task' && old.item.kind === 'task') {
			if (item.jobId !== old.item.jobId) fail(id, 'Only job registration can bind a task');
			if (item.jobId && item.status !== old.item.status)
				fail(id, 'The background job controls this task status');
			if (
				item.jobId &&
				(item.description !== old.item.description ||
					!isEqual(item.dependsOn, old.item.dependsOn) ||
					item.fallbackFor !== old.item.fallbackFor)
			)
				fail(id, 'Delegated task definitions cannot change');
			if (old.item.status === 'paused' && item.status !== 'paused')
				fail(id, 'Use resume_background_jobs to continue this task');
			if (isFinal(old.item.status) && item.status !== old.item.status) {
				if (old.item.status !== 'done' || item.status !== 'in_progress')
					fail(id, 'Create a new task for further work');
				const dependencies = new Set([id, ...(parentId ? [parentId] : [])]);
				if (
					[...previousIndex.values()].some(
						({ item: dependent }) =>
							dependent.startedAt &&
							dependent.dependsOn.some((dependency) => dependencies.has(dependency)),
					)
				) {
					fail(id, 'A task that depends on this work has already started');
				}
				item.endedAt = null;
			}
			if (
				isFinal(old.item.status) &&
				(item.description !== old.item.description ||
					!isEqual(item.dependsOn, old.item.dependsOn) ||
					item.fallbackFor !== old.item.fallbackFor)
			) {
				fail(id, 'Final task definitions cannot change');
			}
		}
		if (item.kind === 'task' && old.item.status === 'in_progress') {
			if (item.status === 'pending') fail(id, 'In progress items cannot become Pending');
			if (
				item.kind === 'task' &&
				old.item.kind === 'task' &&
				item.fallbackFor !== old.item.fallbackFor
			) {
				fail(id, 'An In progress task cannot change its fallbackFor');
			}
			if (
				item.kind === 'task' &&
				(item.description !== old.item.description || !isEqual(item.dependsOn, old.item.dependsOn))
			) {
				fail(id, 'An In progress task cannot change its description or dependencies');
			}
		}
		if (
			item.kind === 'task' &&
			old.item.status === 'pending' &&
			item.status !== 'pending' &&
			item.status !== 'cancelled'
		) {
			item.startedAt = now.toISOString();
		}
		if (item.kind === 'task' && !isFinal(old.item.status) && isFinal(item.status))
			item.endedAt = now.toISOString();
	}

	const resolved = derivePlanGroups(document);
	validateGraph(indexPlan(resolved));

	return resolved;
}
