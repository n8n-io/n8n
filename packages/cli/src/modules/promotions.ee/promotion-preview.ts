import type {
	PromotionDirection,
	PromotionResource,
	PromotionResourceDependency,
	PromotionResourceType,
} from '@n8n/api-types';

import {
	PACKAGE_ENTITY_LAYOUT,
	entityFilePath,
	type ManifestEntityCollection,
} from '@/modules/n8n-packages/io/manifest-entry';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { getWorkflowConsumerIds } from '@/modules/n8n-packages/spec/requirement-consumers';
import type { PackageRequirementConsumer } from '@/modules/n8n-packages/spec/requirements.schema';

import { PACKAGE_SUBFOLDER } from './constants';

/** One side of the comparison: its manifest, and the Git blob SHA of each file path. */
export type PreviewSide = {
	manifest: PackageManifest | null;
	blobByPath: ReadonlyMap<string, string>;
};

/** A resource as one side of the comparison holds it. */
export type SideResource = {
	key: string;
	type: PromotionResourceType;
	id: string;
	name: string;
	target: string;
	parentKey: string | null;
	/** Path of the resource file in the package, used to read its content. */
	path: string;
	blobSha: string | null;
};

export type SideIndex = ReadonlyMap<string, SideResource>;

/**
 * Resources that already exist on this instance, but that no local workflow uses, so the local
 * export does not hold them. Apply reuses them instead of creating them. Maps hold the local names.
 */
export type ApplyDestination = {
	credentialNames: ReadonlyMap<string, string>;
	tagNames: ReadonlyMap<string, string>;
	variableKeys: ReadonlySet<string>;
	/** The blob SHA of each data table, serialized as the package stores it. */
	dataTables: ReadonlyMap<string, { blobSha: string }>;
};

const RESOURCE_TYPES = {
	projects: 'project',
	folders: 'folder',
	workflows: 'workflow',
	credentials: 'credential',
	dataTables: 'dataTable',
	variables: 'variable',
	tags: 'tag',
} as const satisfies Partial<Record<ManifestEntityCollection, PromotionResourceType>>;

/** Apply keeps the existing state of these resources, so their changes do not show on Apply. */
const KEPT_BY_APPLY = new Set<PromotionResourceType>([
	'project',
	'folder',
	'tag',
	'credential',
	'variable',
]);

const TYPE_ORDER: PromotionResourceType[] = [
	'project',
	'folder',
	'workflow',
	'credential',
	'dataTable',
	'variable',
	'tag',
];

export function resourceKey(type: Exclude<PromotionResourceType, 'variable'>, id: string): string {
	return `${type}:${id}`;
}

export function variableResourceKey(name: string, projectId: string | null): string {
	const encoded = encodeURIComponent(name);
	return projectId === null
		? `variable:global:${encoded}`
		: `variable:project:${projectId}:${encoded}`;
}

function packagePath(collection: ManifestEntityCollection, target: string): string {
	return `${PACKAGE_SUBFOLDER}/${entityFilePath(collection, target)}`;
}

/**
 * The target of the project or folder that holds an entry. A top-level folder sits in the
 * project's `folders` directory, and a child folder sits directly in its parent folder.
 * Other entries sit in a collection directory, such as `workflows`, inside their container.
 */
function containerTarget(collection: ManifestEntityCollection, target: string): string {
	const segments = target.split('/');
	if (collection !== 'folders') return segments.slice(0, -2).join('/');
	const container = segments.slice(0, -1);
	return container[container.length - 1] === PACKAGE_ENTITY_LAYOUT.folders.directory
		? container.slice(0, -1).join('/')
		: container.join('/');
}

/**
 * Lists the project's resources on one side: the project, its folders and workflows, and the
 * dependencies that its workflows require. Other projects' resources on the branch stay out.
 */
export function indexSide(side: PreviewSide, projectId: string): Map<string, SideResource> {
	const index = new Map<string, SideResource>();
	const { manifest } = side;
	const project = manifest?.projects?.find(({ id }) => id === projectId);
	if (!manifest || !project) return index;

	const inProject = ({ target }: ManifestEntry) => target.startsWith(`${project.target}/`);
	const folders = (manifest.folders ?? []).filter(inProject);
	const containerKeys = new Map<string, string>([
		[project.target, resourceKey('project', project.id)],
		...folders.map((folder): [string, string] => [folder.target, resourceKey('folder', folder.id)]),
	]);

	const add = (collection: keyof typeof RESOURCE_TYPES, entry: ManifestEntry, key: string) => {
		const path = packagePath(collection, entry.target);
		index.set(key, {
			key,
			type: RESOURCE_TYPES[collection],
			id: entry.id,
			name: entry.name,
			target: entry.target,
			parentKey: containerKeys.get(containerTarget(collection, entry.target)) ?? null,
			path,
			blobSha: side.blobByPath.get(path) ?? null,
		});
	};

	add('projects', project, resourceKey('project', project.id));
	for (const folder of folders) add('folders', folder, resourceKey('folder', folder.id));
	for (const workflow of (manifest.workflows ?? []).filter(inProject)) {
		add('workflows', workflow, resourceKey('workflow', workflow.id));
	}

	const requirements = manifest.requirements;
	for (const collection of ['credentials', 'dataTables', 'tags'] as const) {
		const entries = new Map(manifest[collection]?.map((entry) => [entry.id, entry]));
		for (const { id } of requirements?.[collection] ?? []) {
			const entry = entries.get(id);
			if (entry) add(collection, entry, resourceKey(RESOURCE_TYPES[collection], id));
		}
	}

	// A workflow reads the project's variable first, so it shadows a global one with the same name.
	for (const { name } of requirements?.variables ?? []) {
		const entries = (manifest.variables ?? []).filter((entry) => entry.name === name);
		const entry = entries.find(inProject) ?? entries.find((candidate) => !inProject(candidate));
		if (entry) {
			add('variables', entry, variableResourceKey(name, inProject(entry) ? projectId : null));
		}
	}

	return index;
}

function workflowsInside(index: SideIndex, target: string): SideResource[] {
	return [...index.values()].filter(
		(resource) => resource.type === 'workflow' && resource.target.startsWith(`${target}/`),
	);
}

/** Sets which changes the operation leaves out, so the preview shows only what will happen. */
function applyOperationRules(
	resource: PromotionResource,
	{
		direction,
		before,
		after,
		desired,
		destination,
	}: {
		direction: PromotionDirection;
		before: SideResource | undefined;
		after: SideResource | undefined;
		desired: SideIndex;
		destination: ApplyDestination | null;
	},
): PromotionResource | null {
	const { type, change } = resource;
	const { previousName: _name, previousParentKey: _parent, ...withoutChanges } = resource;
	// When the operation keeps the current state, show the current name and place.
	const unchanged = (): PromotionResource => ({
		...withoutChanges,
		...(before ? { name: before.name, parentKey: before.parentKey } : {}),
		change: 'unchanged',
	});

	if (change === 'deleted') {
		// Neither direction deletes dependencies. Their files and rows stay.
		if (type !== 'workflow' && type !== 'project' && type !== 'folder') return null;
		// Projects and folders stay too. They remain as context for the deleted workflows inside them.
		if (type !== 'workflow') return unchanged();
	}

	if (direction === 'promote') {
		// Promote writes a folder only together with a workflow inside it.
		if (
			type === 'folder' &&
			change !== 'unchanged' &&
			after &&
			workflowsInside(desired, after.target).length === 0
		) {
			return null;
		}
		return resource;
	}

	// Apply keeps the names and properties of existing projects, folders, and tags, and the
	// values of existing credentials and variables. A folder move stays: Apply reports it as a conflict.
	if (change === 'modified') {
		if (type === 'folder' && resource.previousParentKey !== undefined) {
			return {
				...withoutChanges,
				name: before?.name ?? resource.name,
				previousParentKey: resource.previousParentKey,
			};
		}
		if (KEPT_BY_APPLY.has(type)) return unchanged();
	}

	if (change === 'added' && destination) {
		let localName: string | undefined;
		if (type === 'credential') localName = destination.credentialNames.get(resource.id);
		if (type === 'tag') localName = destination.tagNames.get(resource.id);
		if (type === 'variable' && destination.variableKeys.has(resource.key))
			localName = resource.name;
		if (localName !== undefined) return { ...withoutChanges, name: localName, change: 'unchanged' };

		const localTable = type === 'dataTable' ? destination.dataTables.get(resource.id) : undefined;
		if (localTable) {
			return {
				...resource,
				change: localTable.blobSha === resource.revision.after ? 'unchanged' : 'modified',
				revision: { ...resource.revision, before: localTable.blobSha },
			};
		}
	}

	return resource;
}

function compareResource(
	current: SideResource,
	before: SideResource | undefined,
	after: SideResource | undefined,
	isArchived: (path: string) => boolean,
): PromotionResource {
	let change: PromotionResource['change'] = 'unchanged';
	if (!before) change = 'added';
	else if (!after) change = 'deleted';
	else if (before.blobSha !== after.blobSha) {
		change = after.type === 'workflow' && isArchived(after.path) ? 'archived' : 'modified';
	}

	return {
		key: current.key,
		type: current.type,
		id: current.id,
		name: current.name,
		...(before && after && before.name !== after.name ? { previousName: before.name } : {}),
		parentKey: current.parentKey,
		...(before && after && before.parentKey !== after.parentKey
			? { previousParentKey: before.parentKey }
			: {}),
		change,
		selectable: current.type === 'workflow',
		revision: { before: before?.blobSha ?? null, after: after?.blobSha ?? null },
	};
}

/**
 * The workflow-to-dependency links, read from the side that the operation sends. Sub-workflows
 * are references only: the operation does not carry them with the workflow. A sub-workflow that
 * neither side holds still gets a row, so the preview can show that the workflow calls it.
 */
function dependencyLinks(desired: PreviewSide, desiredIndex: SideIndex, projectId: string) {
	const links: PromotionResourceDependency[] = [];
	const missingWorkflows = new Map<string, PromotionResource>();
	const add = (
		requirement: { usedBy: PackageRequirementConsumer[] },
		key: string,
		included = true,
	) => {
		for (const workflowId of getWorkflowConsumerIds(requirement)) {
			links.push({ workflowKey: resourceKey('workflow', workflowId), resourceKey: key, included });
		}
	};
	const requirements = desired.manifest?.requirements;
	for (const collection of ['credentials', 'dataTables', 'tags'] as const) {
		for (const requirement of requirements?.[collection] ?? []) {
			add(requirement, resourceKey(RESOURCE_TYPES[collection], requirement.id));
		}
	}
	for (const requirement of requirements?.variables ?? []) {
		const projectKey = variableResourceKey(requirement.name, projectId);
		add(
			requirement,
			desiredIndex.has(projectKey) ? projectKey : variableResourceKey(requirement.name, null),
		);
	}
	for (const requirement of requirements?.workflows ?? []) {
		const key = resourceKey('workflow', requirement.id);
		add(requirement, key, false);
		missingWorkflows.set(key, {
			key,
			type: 'workflow',
			id: requirement.id,
			name: requirement.name ?? requirement.id,
			parentKey: null,
			change: 'unchanged',
			selectable: false,
			revision: { before: null, after: null },
		});
	}
	return { links, missingWorkflows };
}

/**
 * Builds the resources that the preview lists:
 * - every resource that the operation changes;
 * - the workflows that carry a change: workflows that use a changed dependency, and on Promote
 *   the workflows inside a changed folder or project, because selecting them sends the change;
 * - the dependencies of listed workflows, and the projects and folders above every listed resource.
 */
export function buildPreview({
	direction,
	projectId,
	base,
	desired,
	isArchived,
	destination,
}: {
	direction: PromotionDirection;
	projectId: string;
	base: PreviewSide;
	desired: PreviewSide;
	isArchived: (path: string) => boolean;
	destination: ApplyDestination | null;
}): { resources: PromotionResource[]; dependencies: PromotionResourceDependency[] } {
	const baseIndex = indexSide(base, projectId);
	const desiredIndex = indexSide(desired, projectId);

	const all = new Map<string, PromotionResource>();
	for (const key of new Set([...baseIndex.keys(), ...desiredIndex.keys()])) {
		const before = baseIndex.get(key);
		const after = desiredIndex.get(key);
		const current = after ?? before;
		if (!current) continue;
		const resource = applyOperationRules(compareResource(current, before, after, isArchived), {
			direction,
			before,
			after,
			desired: desiredIndex,
			destination,
		});
		if (resource) all.set(key, resource);
	}

	const { links, missingWorkflows } = dependencyLinks(desired, desiredIndex, projectId);
	for (const [key, row] of missingWorkflows) {
		if (!all.has(key)) all.set(key, row);
	}
	const dependencies = links.filter(
		(link) => all.has(link.workflowKey) && all.has(link.resourceKey),
	);

	const listed = new Set<string>();
	for (const [key, resource] of all) {
		if (resource.change !== 'unchanged') listed.add(key);
	}
	for (const link of dependencies) {
		if (listed.has(link.resourceKey) && link.included) listed.add(link.workflowKey);
	}
	if (direction === 'promote') {
		for (const key of [...listed]) {
			const container = desiredIndex.get(key);
			if (container?.type !== 'folder' && container?.type !== 'project') continue;
			for (const workflow of workflowsInside(desiredIndex, container.target))
				listed.add(workflow.key);
		}
	}
	// A listed sub-workflow brings its own dependencies, so repeat until nothing new joins.
	let grew = true;
	while (grew) {
		grew = false;
		for (const link of dependencies) {
			if (listed.has(link.workflowKey) && !listed.has(link.resourceKey)) {
				listed.add(link.resourceKey);
				grew = true;
			}
		}
	}
	for (const key of [...listed]) {
		let parentKey = all.get(key)?.parentKey ?? null;
		while (parentKey !== null && !listed.has(parentKey) && all.has(parentKey)) {
			listed.add(parentKey);
			parentKey = all.get(parentKey)?.parentKey ?? null;
		}
	}

	const resources = [...listed]
		.flatMap((key) => all.get(key) ?? [])
		.sort(
			(a, b) =>
				TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
				a.name.localeCompare(b.name) ||
				a.key.localeCompare(b.key),
		);
	return {
		resources,
		dependencies: dependencies.filter((link) => listed.has(link.workflowKey)),
	};
}
