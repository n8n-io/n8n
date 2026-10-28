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
import type {
	ManifestEntry,
	PackageManifest,
	WorkflowManifestEntry,
} from '@/modules/n8n-packages/spec/manifest.schema';
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
	/** Only a workflow entry carries the flag; every other resource is active. */
	isArchived: boolean;
};

export type SideIndex = ReadonlyMap<string, SideResource>;

/**
 * Resources that already exist on this instance, but that no local workflow uses, so the local
 * export does not hold them. Apply reuses them instead of creating them. Maps hold the local names.
 */
export type ApplyDestination = {
	credentialNames: ReadonlyMap<string, string>;
	/** The local tag that Apply uses for each branch tag ID, with its blob SHA. */
	tags: ReadonlyMap<string, { id: string; name: string; blobSha: string }>;
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
const KEPT_BY_APPLY = new Set<PromotionResourceType>(['project', 'credential', 'variable']);

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

	const add = (
		collection: keyof typeof RESOURCE_TYPES,
		entry: ManifestEntry | WorkflowManifestEntry,
		key: string,
	) => {
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
			isArchived: 'isArchived' in entry && entry.isArchived,
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

/**
 * Lists the resources of several projects on one side. Each project resolves its own variables,
 * so the manifest is scoped to each project in turn. A shared dependency is listed once.
 */
export function indexProjects(
	side: PreviewSide,
	projectIds: readonly string[],
): Map<string, SideResource> {
	const index = new Map<string, SideResource>();
	if (!side.manifest) return index;
	for (const projectId of projectIds) {
		const scoped = { ...side, manifest: scopeManifestToProject(side.manifest, projectId) };
		for (const [key, resource] of indexSide(scoped, projectId)) index.set(key, resource);
	}
	return index;
}

/**
 * Keeps only this project's workflows, the requirement rows they use, and the
 * variables they can see, so a dependency change on the branch cannot list
 * another project's workflows or resolve a name to another project's variable.
 */
export function scopeManifestToProject(
	manifest: PackageManifest,
	projectId: string,
): PackageManifest {
	const projectTarget = manifest.projects?.find(({ id }) => id === projectId)?.target;
	const inProject = ({ target }: ManifestEntry) =>
		projectTarget !== undefined && target.startsWith(`${projectTarget}/`);
	const workflows = (manifest.workflows ?? []).filter(inProject);
	const workflowIds = new Set(workflows.map(({ id }) => id));
	// Variables resolve by name, and the project's own variable shadows the global one.
	const variables = new Map<string, ManifestEntry>();
	for (const entry of manifest.variables ?? []) {
		const isGlobal = !entry.target.startsWith(`${PACKAGE_ENTITY_LAYOUT.projects.directory}/`);
		if (inProject(entry) || (isGlobal && !variables.has(entry.name))) {
			variables.set(entry.name, entry);
		}
	}
	const scopeRows = <T extends { usedBy: PackageRequirementConsumer[] }>(rows: T[] | undefined) => {
		const kept = rows
			?.map((row) => ({
				...row,
				usedBy: row.usedBy.filter(({ kind, id }) => kind === 'workflow' && workflowIds.has(id)),
			}))
			.filter((row) => row.usedBy.length > 0);
		return kept?.length ? kept : undefined;
	};
	const { requirements } = manifest;
	return {
		...manifest,
		workflows,
		variables: [...variables.values()],
		requirements: requirements && {
			credentials: scopeRows(requirements.credentials),
			dataTables: scopeRows(requirements.dataTables),
			workflows: scopeRows(requirements.workflows),
			variables: scopeRows(requirements.variables),
			tags: scopeRows(requirements.tags),
			nodeTypes: scopeRows(requirements.nodeTypes),
		},
	};
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

	// Apply keeps the names and properties of existing projects, and the values of existing
	// credentials and variables. It renames tags. It moves and renames a folder within its project.
	if (change === 'modified') {
		if (type === 'folder') {
			return resource.previousName !== undefined || resource.previousParentKey !== undefined
				? resource
				: unchanged();
		}
		if (KEPT_BY_APPLY.has(type)) return unchanged();
	}

	if (change === 'added' && destination) {
		// Apply renames the local tag with the branch ID, or moves the local tag with the branch name
		// to the branch ID. Tags are instance-wide, so this also changes workflows outside the project.
		const localTag = type === 'tag' ? destination.tags.get(resource.id) : undefined;
		if (localTag) {
			const revision = { ...resource.revision, before: localTag.blobSha };
			if (localTag.id !== resource.id) {
				return { ...withoutChanges, change: 'modified', previousId: localTag.id, revision };
			}
			if (localTag.name !== resource.name) {
				return { ...withoutChanges, change: 'modified', previousName: localTag.name, revision };
			}
			return { ...withoutChanges, change: 'unchanged', revision };
		}

		let localName: string | undefined;
		if (type === 'credential') localName = destination.credentialNames.get(resource.id);
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
): PromotionResource {
	let change: PromotionResource['change'] = 'unchanged';
	if (!before) change = 'added';
	else if (!after) change = 'deleted';
	else if (before.blobSha !== after.blobSha) {
		change = after.isArchived ? 'archived' : 'modified';
	}
	// The files hold no project, so a move between two project roots keeps the same file.
	else if (before.parentKey !== after.parentKey) change = 'modified';

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
function dependencyLinks(
	desired: PreviewSide,
	desiredIndex: SideIndex,
	projectIds: readonly string[],
) {
	const links: PromotionResourceDependency[] = [];
	const missingWorkflows = new Map<string, PromotionResource>();
	if (!desired.manifest) return { links, missingWorkflows };
	for (const projectId of projectIds) {
		const manifest = scopeManifestToProject(desired.manifest, projectId);
		addProjectLinks(manifest, desiredIndex, projectId, links, missingWorkflows);
	}
	return { links, missingWorkflows };
}

function addProjectLinks(
	manifest: PackageManifest,
	desiredIndex: SideIndex,
	projectId: string,
	links: PromotionResourceDependency[],
	missingWorkflows: Map<string, PromotionResource>,
) {
	const add = (
		requirement: { usedBy: PackageRequirementConsumer[] },
		key: string,
		included = true,
	) => {
		for (const workflowId of getWorkflowConsumerIds(requirement)) {
			links.push({ workflowKey: resourceKey('workflow', workflowId), resourceKey: key, included });
		}
	};
	const requirements = manifest.requirements;
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
}

/**
 * Builds the resources that the preview lists:
 * - every resource that the operation changes;
 * - the workflows that carry a change: workflows that use a changed dependency, and on Promote
 *   the workflows inside a changed folder or project, because selecting them sends the change;
 * - the dependencies of listed workflows, and the projects and folders above every listed resource.
 */
export function buildPreview({
	operation,
	projectIds,
	base,
	desired,
}: {
	/**
	 * The operation whose rules decide what changes. `null` lists every difference between the
	 * sides: a review shows what its commits already changed, which an operation did not write.
	 */
	operation: { direction: PromotionDirection; destination: ApplyDestination | null } | null;
	/** Both sides are indexed across all of them, so a workflow that moves between them stays one row. */
	projectIds: readonly string[];
	base: PreviewSide;
	desired: PreviewSide;
}): { resources: PromotionResource[]; dependencies: PromotionResourceDependency[] } {
	const baseIndex = indexProjects(base, projectIds);
	const desiredIndex = indexProjects(desired, projectIds);

	const all = new Map<string, PromotionResource>();
	for (const key of new Set([...baseIndex.keys(), ...desiredIndex.keys()])) {
		const before = baseIndex.get(key);
		const after = desiredIndex.get(key);
		const current = after ?? before;
		if (!current) continue;
		const compared = compareResource(current, before, after);
		const resource = operation
			? applyOperationRules(compared, { ...operation, before, after, desired: desiredIndex })
			: compared;
		if (resource) all.set(key, resource);
	}

	const { links, missingWorkflows } = dependencyLinks(desired, desiredIndex, projectIds);
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
	// Promote selects whole containers, so it lists the workflows inside a changed one.
	if (operation?.direction === 'promote') {
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
