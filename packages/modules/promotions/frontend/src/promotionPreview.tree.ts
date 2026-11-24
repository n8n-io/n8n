import type { PromotionPreview, PromotionResource, PromotionResourceType } from '@n8n/api-types';
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
};

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

function toItem(resource: PromotionResource, children?: PreviewTreeItem[]): PreviewTreeItem {
	return {
		id: resource.key,
		label: resource.name,
		icon: resourceIcon(resource.type),
		kind: 'resource',
		...(children && children.length > 0 ? { children } : {}),
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

export function buildPreviewTree(
	preview: Pick<PromotionPreview, 'resources'>,
	labels: { workflows: string; group: (group: PreviewTreeGroup) => string },
): PreviewTreeItem[] {
	const hierarchy: PromotionResource[] = [];
	const groups = new Map<PreviewTreeGroup, PromotionResource[]>();
	for (const resource of preview.resources) {
		const group = groupOf(resource);
		if (group === null) hierarchy.push(resource);
		else {
			const members = groups.get(group) ?? [];
			members.push(resource);
			groups.set(group, members);
		}
	}

	const sections: PreviewTreeItem[] = [];
	const roots = hierarchyItems(hierarchy);
	if (hierarchy.some(({ type }) => type === 'workflow')) {
		sections.push({
			id: 'section:workflows',
			label: labels.workflows,
			kind: 'section',
			children: roots,
			memberKeys: hierarchy.filter(({ type }) => type === 'workflow').map(({ key }) => key),
		});
	} else {
		// Without a workflow the project is not a list of workflows. Its own row stands at the top,
		// with the folders below it, so a project or a credential promote does not read "Workflows".
		sections.push(...roots);
	}

	for (const group of GROUP_ORDER) {
		const members = groups.get(group);
		if (!members) continue;
		sections.push({
			id: `group:${group}`,
			label: labels.group(group),
			kind: 'section',
			children: [...members].sort(byFolderThenName).map((resource) => toItem(resource)),
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
