import isEqual from 'lodash/isEqual';

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

const isFinal = (status: AgentPlanStatus) => status !== 'pending' && status !== 'in_progress';

function fail(id: string, message: string): never {
	throw new AgentPlanValidationError(`Plan item ${id}: ${message}`);
}

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
		if (!['pending', 'cancelled'].includes(item.status) && blockedBy(entry, index).length) {
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
		if (entry.item.status !== 'pending') continue;
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
	const document = parseAgentPlan(data, formatVersion);
	const index = indexPlan(document);
	const previousIndex = previous ? indexPlan(previous) : new Map<string, Entry>();
	const replacements = getReplacements(index);
	for (const { item } of index.values()) {
		if (item.status !== 'pending') continue;
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
			item.startedAt !== (old?.item.startedAt ?? null) ||
			item.endedAt !== (old?.item.endedAt ?? null)
		) {
			fail(id, 'Timestamps are managed by the service');
		}
		if (!old) {
			if (item.status !== 'pending') fail(id, 'New items must be Pending');
			continue;
		}
		if (old.parentId !== parentId || old.item.kind !== item.kind) {
			fail(id, 'Existing items cannot change their type or group');
		}
		if (isFinal(old.item.status) && !isEqual(old.item, item)) {
			fail(id, 'Final items cannot change');
		}
		if (old.item.status === 'in_progress') {
			if (item.status === 'pending') fail(id, 'In progress items cannot become Pending');
			if (
				item.kind === 'task' &&
				(item.description !== old.item.description || !isEqual(item.dependsOn, old.item.dependsOn))
			) {
				fail(id, 'An In progress task cannot change its description or dependencies');
			}
		}
		if (old.item.status === 'pending' && item.status !== 'pending' && item.status !== 'cancelled') {
			item.startedAt = now.toISOString();
		}
		if (!isFinal(old.item.status) && isFinal(item.status)) item.endedAt = now.toISOString();
	}
	validateGraph(index);
	return document;
}
