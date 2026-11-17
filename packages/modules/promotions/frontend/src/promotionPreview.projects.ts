import type {
	PromotionEnvironmentChangesProject,
	PromotionEnvironmentSelectionProject,
	PromotionProjectBlocker,
	PromotionResource,
} from '@n8n/api-types';

import {
	selectableKeys,
	type DisabledKeys,
	type ResourceKey,
	type SelectionGraph,
} from './promotionPreview.selection';
import {
	GROUP_ORDER,
	groupOf,
	hierarchyItems,
	toItem,
	type PreviewTreeGroup,
	type PreviewTreeItem,
} from './promotionPreview.tree';

/**
 * The changes view of an environment: the changes of several projects in one list, grouped by
 * project, and one selection across them.
 */

export type ChangesProject = PromotionEnvironmentChangesProject & {
	/** Promote: an open review holds the changes of the project. */
	blocker?: PromotionProjectBlocker;
};

type Resources = ReadonlyMap<ResourceKey, PromotionResource>;

/** The project that holds the resource. `undefined` for an instance-wide resource. */
export function projectIdOf(resources: Resources, resource: PromotionResource): string | undefined {
	if (resource.projectId !== undefined) return resource.projectId;
	// A server without `projectId` on its rows: the project is the top of the parent chain.
	const seen = new Set<ResourceKey>();
	let current: PromotionResource | undefined = resource;
	while (current && !seen.has(current.key)) {
		if (current.type === 'project') return current.id;
		seen.add(current.key);
		current = current.parentKey === null ? undefined : resources.get(current.parentKey);
	}
	return undefined;
}

/**
 * The projects of the view, in the order of the server. A server that sends no list gives the
 * projects of its rows, and the user can then operate each of them.
 */
export function changesProjects(
	resources: readonly PromotionResource[],
	projects: readonly PromotionEnvironmentChangesProject[] | undefined,
	blockers: readonly PromotionProjectBlocker[] = [],
): ChangesProject[] {
	const blockerOf = new Map(blockers.map((blocker) => [blocker.projectId, blocker]));
	if (projects) {
		return projects.map((project) => ({ ...project, blocker: blockerOf.get(project.id) }));
	}
	const found = new Map<string, ChangesProject>();
	for (const resource of resources) {
		if (resource.type === 'project') {
			found.set(resource.id, { id: resource.id, name: resource.name, canOperate: true });
		} else if (resource.projectId !== undefined && !found.has(resource.projectId)) {
			found.set(resource.projectId, {
				id: resource.projectId,
				name: resource.projectName ?? resource.projectId,
				canOperate: true,
			});
		}
	}
	return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The resources that users can select in one project. */
export function projectSelectableKeys(graph: SelectionGraph, projectId: string): ResourceKey[] {
	return selectableKeys(graph).filter((key) => {
		const resource = graph.resources.get(key);
		return resource !== undefined && projectIdOf(graph.resources, resource) === projectId;
	});
}

/**
 * The resources that users cannot add: every change of a project that the user can only read,
 * and of a project whose changes an open review holds.
 */
export function lockedProjectKeys(
	graph: SelectionGraph,
	projects: readonly ChangesProject[],
): DisabledKeys {
	const locked = new Set(
		projects.filter(({ canOperate, blocker }) => !canOperate || blocker).map(({ id }) => id),
	);
	if (locked.size === 0) return new Set();
	return new Set(
		selectableKeys(graph).filter((key) => {
			const resource = graph.resources.get(key);
			const projectId = resource ? projectIdOf(graph.resources, resource) : undefined;
			return projectId !== undefined && locked.has(projectId);
		}),
	);
}

/**
 * The selection of a request across projects. `extra` holds the credentials that "Include it"
 * added, with the project of each. A selected project without workflows sends no ids.
 */
export function toEnvironmentSelection(
	graph: SelectionGraph,
	selected: ReadonlySet<ResourceKey>,
	extra: ReadonlyMap<ResourceKey, string>,
	projectOrder: readonly string[] = [],
): PromotionEnvironmentSelectionProject[] {
	type Entry = { workflowIds: Set<string>; folderIds: Set<string>; credentialIds: Set<string> };
	const entries = new Map<string, Entry>();
	const entryOf = (projectId: string) => {
		const entry = entries.get(projectId) ?? {
			workflowIds: new Set<string>(),
			folderIds: new Set<string>(),
			credentialIds: new Set<string>(),
		};
		entries.set(projectId, entry);
		return entry;
	};

	for (const key of selected) {
		const resource = graph.resources.get(key);
		const projectId = resource ? projectIdOf(graph.resources, resource) : undefined;
		if (!resource || projectId === undefined) continue;
		const entry = entryOf(projectId);
		if (resource.type === 'workflow') entry.workflowIds.add(resource.id);
		if (resource.type === 'folder') entry.folderIds.add(resource.id);
	}
	for (const [key, projectId] of extra) {
		const [type, ...id] = key.split(':');
		if (type === 'credential') entryOf(projectId).credentialIds.add(id.join(':'));
		if (type === 'workflow') entryOf(projectId).workflowIds.add(id.join(':'));
	}

	const rank = (projectId: string) => {
		const index = projectOrder.indexOf(projectId);
		return index === -1 ? projectOrder.length : index;
	};
	return [...entries]
		.sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
		.map(([projectId, { workflowIds, folderIds, credentialIds }]) => ({
			projectId,
			workflowIds: [...workflowIds].sort(),
			folderIds: [...folderIds].sort(),
			...(credentialIds.size > 0 ? { credentialIds: [...credentialIds].sort() } : {}),
		}));
}

/** How many projects hold a change of the operation. */
export function changedProjectCount(graph: SelectionGraph, included: ReadonlySet<ResourceKey>) {
	const projectIds = new Set<string>();
	for (const key of included) {
		const resource = graph.resources.get(key);
		if (!resource || resource.change === 'unchanged') continue;
		const projectId = projectIdOf(graph.resources, resource);
		if (projectId !== undefined) projectIds.add(projectId);
	}
	return projectIds.size;
}

const byName = (a: PromotionResource, b: PromotionResource) =>
	a.name.localeCompare(b.name) || a.key.localeCompare(b.key);

function groupSections(
	members: ReadonlyMap<PreviewTreeGroup, PromotionResource[]>,
	label: (group: PreviewTreeGroup) => string,
	idPrefix: string,
): PreviewTreeItem[] {
	return GROUP_ORDER.flatMap((group) => {
		const resources = members.get(group);
		if (!resources) return [];
		return [
			{
				id: `${idPrefix}group:${group}`,
				label: label(group),
				kind: 'section' as const,
				children: [...resources].sort(byName).map((resource) => toItem(resource)),
			},
		];
	});
}

/**
 * The tree of the changes view. Each project is one group: its folders and workflows, then its
 * credentials, variables and data tables. Instance-wide resources follow, grouped by type.
 */
export function buildProjectTree(
	resources: readonly PromotionResource[],
	projects: readonly ChangesProject[],
	labels: { workflows: string; group: (group: PreviewTreeGroup) => string },
): PreviewTreeItem[] {
	const byKey = new Map(resources.map((resource) => [resource.key, resource]));
	const known = new Set(projects.map(({ id }) => id));
	const hierarchy = new Map<string, PromotionResource[]>();
	const dependencies = new Map<string, Map<PreviewTreeGroup, PromotionResource[]>>();
	const shared = new Map<PreviewTreeGroup, PromotionResource[]>();
	// Projects and folders that no listed project holds, such as a project that the Apply deletes.
	const other: PromotionResource[] = [];

	const push = <Key>(map: Map<Key, PromotionResource[]>, key: Key, resource: PromotionResource) => {
		const list = map.get(key) ?? [];
		list.push(resource);
		map.set(key, list);
	};

	for (const resource of resources) {
		// The group header stands for the project, so the project gets no row of its own.
		if (resource.type === 'project' && known.has(resource.id)) continue;
		const projectId = projectIdOf(byKey, resource);
		const group = groupOf(resource);
		if (projectId === undefined || !known.has(projectId)) {
			if (group === null) other.push(resource);
			else push(shared, group, resource);
		} else if (group === null || resource.type === 'workflow') {
			push(hierarchy, projectId, resource);
		} else {
			const groups =
				dependencies.get(projectId) ?? new Map<PreviewTreeGroup, PromotionResource[]>();
			dependencies.set(projectId, groups);
			push(groups, group, resource);
		}
	}

	const items: PreviewTreeItem[] = projects.map((project) => ({
		id: `project:${project.id}`,
		label: project.name,
		icon: 'layers',
		kind: 'project',
		projectId: project.id,
		children: [
			...hierarchyItems(hierarchy.get(project.id) ?? []),
			...groupSections(dependencies.get(project.id) ?? new Map(), labels.group, `${project.id}:`),
		],
	}));
	const otherItems = hierarchyItems(other);
	return [
		...items,
		...(otherItems.length > 0
			? [
					{
						id: 'section:workflows',
						label: labels.workflows,
						kind: 'section' as const,
						children: otherItems,
					},
				]
			: []),
		...groupSections(shared, labels.group, ''),
	];
}
