import type {
	PromotionMissingDependency,
	PromotionPreview,
	PromotionResource,
	PromotionResourceType,
} from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';

import type { ResourceKey } from './promotionPreview.selection';

/**
 * The resource tree of the promotion preview pages. Projects, folders and workflows follow the
 * project hierarchy: under the heading "Workflows" when the project has workflows, and as a plain
 * project row when it has none. Dependencies are grouped by type and appear once, however many
 * workflows use them.
 */

export type PreviewTreeGroup = 'credential' | 'dataTable' | 'variable' | 'tag' | 'subWorkflow';

export type PreviewTreeItem = {
	/** The resource key, or a section or group id. */
	id: string;
	label: string;
	icon?: IconName;
	/** A section heading groups resources: workflows by project and folder, the others by type. */
	kind: 'section' | 'resource';
	children?: PreviewTreeItem[];
	/** A section counts these resources: workflows only in "Workflows", never projects or folders. */
	memberKeys?: ResourceKey[];
	/**
	 * A dependency that users cannot select, because it is outside their access or in a personal
	 * project. The row is locked: unchecked, disabled and muted, with the reason on a lock.
	 */
	locked?: LockedDependency;
	/** A label row that users cannot select or open, such as the project of an outside workflow. */
	plain?: boolean;
};

export type LockedDependency = Pick<
	PromotionMissingDependency,
	'kind' | 'group' | 'accessible' | 'project'
>;

/** The groups of a dependency that a Promote does not carry, and that the tree shows as locked. */
const LOCKED_GROUPS = new Set<PromotionMissingDependency['group']>([
	'personal',
	'outside-access',
	'other-project',
]);

/**
 * Sub-workflows come first, next to the workflows. The others follow the project tabs:
 * credentials, variables, data tables. Tags come last.
 */
const GROUP_ORDER: readonly PreviewTreeGroup[] = [
	'subWorkflow',
	'credential',
	'variable',
	'dataTable',
	'tag',
];

const RESOURCE_ICONS: Record<PromotionResourceType, IconName> = {
	project: 'layers',
	folder: 'folder',
	workflow: 'workflow',
	credential: 'key-round',
	dataTable: 'table',
	variable: 'variable',
	tag: 'tags',
};

export function resourceIcon(type: PromotionResourceType): IconName {
	return RESOURCE_ICONS[type];
}

/** Projects and folders hold other resources. */
export const isContainer = (resource: PromotionResource) =>
	resource.type === 'project' || resource.type === 'folder';

/** Projects and folders without a change only give structure. They get no change card. */
function hasCard(resource: PromotionResource): boolean {
	return !isContainer(resource) || resource.change !== 'unchanged';
}

/** The dependency group of a resource, or `null` when it belongs to the project hierarchy. */
function groupOf(resource: PromotionResource): PreviewTreeGroup | null {
	switch (resource.type) {
		case 'project':
		case 'folder':
			return null;
		case 'workflow':
			// Workflows outside the project appear only as sub-workflows that a listed workflow calls.
			return resource.parentKey === null ? 'subWorkflow' : null;
		default:
			return resource.type;
	}
}

function byFolderThenName(a: PromotionResource, b: PromotionResource) {
	return (
		Number(b.type === 'folder') - Number(a.type === 'folder') ||
		a.name.localeCompare(b.name) ||
		a.key.localeCompare(b.key)
	);
}

function toItem(
	resource: PromotionResource,
	children?: PreviewTreeItem[],
	locked?: LockedDependency,
): PreviewTreeItem {
	return {
		id: resource.key,
		label: resource.name,
		icon: resourceIcon(resource.type),
		kind: 'resource',
		...(children && children.length > 0 ? { children } : {}),
		...(locked ? { locked } : {}),
	};
}

/** A credential that the Promote cannot carry. It has no resource, so the tree adds a row for it. */
function lockedCredentialItem(dependency: PromotionMissingDependency): PreviewTreeItem {
	const { kind, group, accessible, project } = dependency;
	return {
		id: `locked:credential:${dependency.id ?? dependency.name}`,
		label: dependency.name,
		icon: resourceIcon('credential'),
		kind: 'resource',
		locked: { kind, group, accessible, ...(project ? { project } : {}) },
	};
}

function hierarchyItems(resources: PromotionResource[]): PreviewTreeItem[] {
	const keys = new Set(resources.map((resource) => resource.key));
	const childrenOf = new Map<ResourceKey | null, PromotionResource[]>();
	for (const resource of resources) {
		// A parent outside the listed resources would hide the item, so it moves to the top level.
		const parentKey =
			resource.parentKey !== null && keys.has(resource.parentKey) ? resource.parentKey : null;
		const siblings = childrenOf.get(parentKey) ?? [];
		siblings.push(resource);
		childrenOf.set(parentKey, siblings);
	}

	const build = (parentKey: ResourceKey | null): PreviewTreeItem[] =>
		(childrenOf.get(parentKey) ?? [])
			.sort(byFolderThenName)
			.map((resource) => toItem(resource, build(resource.key)));
	return build(null);
}

/** A workflow of another project. The user can access its project, or cannot. */
type OutsideWorkflow = { item: PreviewTreeItem; project?: { id: string; name: string } };

/**
 * The workflows of other projects, as locked rows. One that belongs to a project that the user may
 * know is under a row with the name of the project. The others share one row, "Other projects",
 * which comes last. The tree never shows an owner.
 */
function outsideWorkflowRows(
	resources: readonly PromotionResource[],
	dependencies: readonly PromotionMissingDependency[],
	known: ReadonlySet<ResourceKey>,
	otherProjectsLabel: string,
): PreviewTreeItem[] {
	const dependencyOf = new Map(
		dependencies.flatMap((entry) =>
			entry.kind === 'workflow' && entry.id ? [[`workflow:${entry.id}`, entry] as const] : [],
		),
	);
	const outside: OutsideWorkflow[] = [
		...resources.map((resource): OutsideWorkflow => {
			const entry = dependencyOf.get(resource.key);
			return {
				item: toItem(
					resource,
					undefined,
					entry
						? {
								kind: entry.kind,
								group: entry.group,
								accessible: entry.accessible,
								project: entry.project,
							}
						: { kind: 'workflow', group: 'outside-access', accessible: false },
				),
				project: entry?.project,
			};
		}),
		...dependencies
			.filter(
				(entry) =>
					entry.kind === 'workflow' &&
					LOCKED_GROUPS.has(entry.group) &&
					!(entry.id && known.has(`workflow:${entry.id}`)),
			)
			.map(
				(entry): OutsideWorkflow => ({
					item: {
						id: `locked:workflow:${entry.id ?? entry.name}`,
						label: entry.name,
						icon: resourceIcon('workflow'),
						kind: 'resource',
						locked: {
							kind: entry.kind,
							group: entry.group,
							accessible: entry.accessible,
							...(entry.project ? { project: entry.project } : {}),
						},
					},
					project: entry.project,
				}),
			),
	];
	if (outside.length === 0) return [];

	const byProject = new Map<string, { name: string; items: PreviewTreeItem[] }>();
	const others: PreviewTreeItem[] = [];
	for (const { item, project } of outside) {
		if (!project) {
			others.push(item);
			continue;
		}
		const entry = byProject.get(project.id) ?? { name: project.name, items: [] };
		entry.items.push(item);
		byProject.set(project.id, entry);
	}
	const byLabel = (a: PreviewTreeItem, b: PreviewTreeItem) => a.label.localeCompare(b.label);
	const row = (id: string, label: string, items: PreviewTreeItem[]): PreviewTreeItem => ({
		id: `locked-project:${id}`,
		label,
		icon: resourceIcon('project'),
		kind: 'resource',
		plain: true,
		children: items.sort(byLabel),
	});
	return [
		...[...byProject]
			.sort(([, a], [, b]) => a.name.localeCompare(b.name))
			.map(([id, { name, items }]) => row(id, name, items)),
		...(others.length > 0 ? [row('other', otherProjectsLabel, others)] : []),
	];
}

export function buildPreviewTree(
	preview: Pick<PromotionPreview, 'resources'>,
	labels: {
		workflows: string;
		/** The row for outside workflows of projects that users may not know. */
		otherProjects?: string;
		group: (group: PreviewTreeGroup) => string;
	},
	dependencies: readonly PromotionMissingDependency[] = [],
): PreviewTreeItem[] {
	const hierarchy: PromotionResource[] = [];
	const outsideResources: PromotionResource[] = [];
	const groups = new Map<PreviewTreeGroup, PromotionResource[]>();
	for (const resource of preview.resources) {
		const group = groupOf(resource);
		if (group === null) hierarchy.push(resource);
		else if (group === 'subWorkflow') outsideResources.push(resource);
		else {
			const members = groups.get(group) ?? [];
			members.push(resource);
			groups.set(group, members);
		}
	}

	const sections: PreviewTreeItem[] = [];
	const known = new Set(preview.resources.map(({ key }) => key));
	const roots = hierarchyItems(hierarchy);
	const outsideRows = outsideWorkflowRows(
		outsideResources,
		dependencies,
		known,
		labels.otherProjects ?? 'Other projects',
	);
	if (hierarchy.some(({ type }) => type === 'workflow')) {
		sections.push({
			id: 'section:workflows',
			label: labels.workflows,
			kind: 'section',
			// The workflows of other projects are the last items of the group.
			children: [...roots, ...outsideRows],
			memberKeys: hierarchy.filter(({ type }) => type === 'workflow').map(({ key }) => key),
		});
	} else {
		// Without a workflow the project is not a list of workflows. Its own row stands at the top,
		// with the folders below it, so a project or a credential promote does not read "Workflows".
		sections.push(...roots, ...outsideRows);
	}

	const lockedCredentials = dependencies
		.filter(
			(entry) =>
				entry.kind === 'credential' &&
				LOCKED_GROUPS.has(entry.group) &&
				!(entry.id && known.has(`credential:${entry.id}`)),
		)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(lockedCredentialItem);

	for (const group of GROUP_ORDER) {
		const members = groups.get(group) ?? [];
		const locked = group === 'credential' ? lockedCredentials : [];
		if (members.length === 0 && locked.length === 0) continue;
		sections.push({
			id: `group:${group}`,
			label: labels.group(group),
			kind: 'section',
			// A locked row is the last item of its group.
			children: [
				...[...members].sort(byFolderThenName).map((resource) => toItem(resource)),
				...locked,
			],
			memberKeys: members.map(({ key }) => key),
		});
	}
	return sections;
}

/** The order of the change cards. It follows the tree, so the tree and the cards agree. */
export function cardOrder(
	items: readonly PreviewTreeItem[],
	resources: ReadonlyMap<ResourceKey, PromotionResource>,
): ResourceKey[] {
	return flattenPreviewTree(items)
		.map(({ item }) => item)
		.filter((item) => {
			const resource = resources.get(item.id);
			return item.kind === 'resource' && resource !== undefined && hasCard(resource);
		})
		.map((item) => item.id);
}

type PreviewTreeRow = {
	item: PreviewTreeItem;
	/** Nesting below projects and folders. Section and group headings do not indent. */
	indent: number;
};

/** The rows of the tree, top to bottom. */
export function flattenPreviewTree(
	items: readonly PreviewTreeItem[],
	indent = 0,
): PreviewTreeRow[] {
	return items.flatMap((item) => [
		{ item, indent },
		...(item.children
			? flattenPreviewTree(item.children, item.kind === 'resource' ? indent + 1 : indent)
			: []),
	]);
}
