import type {
	PromotionBlocker,
	PromotionDependencyWarning,
	PromotionDirection,
	PromotionMissingDependency,
	PromotionPreview,
	PromotionPreviewCheck,
	PromotionPromoteCheck,
	PromotionResource,
	PromotionResourceDependency,
	PromotionResourceType,
} from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import {
	PACKAGE_ENTITY_LAYOUT,
	entityFilePath,
	type ManifestEntityCollection,
} from '@/modules/n8n-packages/io/manifest-entry';
import {
	packageManifestSchema,
	type ManifestEntry,
	type PackageManifest,
	type WorkflowManifestEntry,
} from '@/modules/n8n-packages/spec/manifest.schema';
import { getWorkflowConsumerIds } from '@/modules/n8n-packages/spec/requirement-consumers';
import type { PackageRequirementConsumer } from '@/modules/n8n-packages/spec/requirements.schema';

import type { PlannedChange } from './apply-preview';
import type { PackageFile } from './base-branch-files';
import { PACKAGE_SUBFOLDER } from './constants';
import { compare } from './package-references';
import { checkoutBranchName } from './promotions-git.utils';
import type { PromotionOperationInput } from './promotions.types';

/** One side of the comparison: its manifest, and the Git blob SHA of each file path. */
export type PreviewSide = {
	manifest: PackageManifest | null;
	blobByPath: ReadonlyMap<string, string>;
	/**
	 * Lists the credentials that the project holds in its own folder, even when no workflow uses
	 * them. The file decides a change, like any other resource. A package file holds no secret
	 * value, so a secret that changes is not a change. An expression, the name and the type are.
	 */
	ownedCredentials?: boolean;
	/**
	 * The owned credentials that the user can see. A credential outside it is left out of the owned
	 * list, so the user cannot see its name or type. Without it, every owned credential is listed.
	 */
	visibleCredentialIds?: ReadonlySet<string>;
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

const RESOURCE_TYPES = {
	projects: 'project',
	folders: 'folder',
	workflows: 'workflow',
	credentials: 'credential',
	dataTables: 'dataTable',
	variables: 'variable',
	tags: 'tag',
} as const satisfies Partial<Record<ManifestEntityCollection, PromotionResourceType>>;

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

	// A credential in the project's folder belongs to the project, whether or not a workflow uses it.
	if (side.ownedCredentials) {
		for (const credential of (manifest.credentials ?? []).filter(inProject)) {
			if (side.visibleCredentialIds && !side.visibleCredentialIds.has(credential.id)) continue;
			add('credentials', credential, resourceKey('credential', credential.id));
		}
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
		planned,
		removals,
	}: {
		direction: PromotionDirection;
		before: SideResource | undefined;
		planned: ReadonlyMap<string, PlannedChange> | null;
		removals?: ReadonlySet<string>;
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

	if (removals?.has(resource.key)) return { ...withoutChanges, change: 'deleted' };
	if (change === 'deleted') {
		// Neither direction deletes dependencies. Their files and rows stay.
		if (type !== 'workflow' && type !== 'project' && type !== 'folder') return null;
		// Projects and folders stay too. They remain as context for the deleted workflows inside them.
		// When the plan lists the removals, a workflow that it keeps stays too.
		if (type !== 'workflow' || removals) return unchanged();
	}

	if (direction === 'promote') return resource;

	// The import plan decides for projects, folders, tags, data tables and bound credentials. A tag
	// can exist here under another name or id, so the files of the two sides do not tell. A folder
	// that Apply moves or renames within its project keeps the change of the comparison.
	const plannedChange = planned?.get(resource.key);
	if (!plannedChange) {
		// Without a plan entry, Apply does not write a credential or a variable. One that this
		// instance lacks stays `added`, so the page can ask for it.
		if ((type === 'credential' || type === 'variable') && change !== 'added') return unchanged();
		return resource;
	}
	if (plannedChange.change === 'unchanged') {
		return {
			...unchanged(),
			...(plannedChange.name !== undefined ? { name: plannedChange.name } : {}),
		};
	}
	const previousName = plannedChange.previousName ?? resource.previousName;
	return {
		...withoutChanges,
		change: plannedChange.change,
		...(previousName !== undefined ? { previousName } : {}),
		...(plannedChange.previousId !== undefined ? { previousId: plannedChange.previousId } : {}),
	};
}

/**
 * A workflow, or a project or folder that the operation adds or changes. On Promote also a
 * credential that the project owns and that the operation adds or changes. A credential outside the
 * folder of its owner project has no parent here, and only its owner project can select it.
 */
function isSelectable(
	{ type, change, parentKey }: PromotionResource,
	direction: PromotionDirection,
): boolean {
	if (type === 'workflow') return true;
	const changed = change === 'added' || change === 'modified';
	// `parentKey` is set only when the credential sits in the folder of a project or a folder in it.
	if (type === 'credential') return direction === 'promote' && changed && parentKey !== null;
	return (type === 'project' || type === 'folder') && changed;
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
	operation: {
		direction: PromotionDirection;
		/** Apply only: what the import plan does, by resource key. */
		planned: ReadonlyMap<string, PlannedChange> | null;
		/**
		 * Whole-instance Apply only: the keys of everything that Apply deletes. Any other resource
		 * that the branch lacks stays, such as a sub-workflow that the branch calls.
		 */
		removals?: ReadonlySet<string>;
	} | null;
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
		const resource = operation ? applyOperationRules(compared, { ...operation, before }) : compared;
		if (resource)
			all.set(
				key,
				operation
					? { ...resource, selectable: isSelectable(resource, operation.direction) }
					: resource,
			);
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
	// Promote selects whole containers, so it lists the workflows inside a changed one. Apply moves
	// or renames a folder only together with a selected workflow inside it, so it lists those too.
	if (operation) {
		for (const key of [...listed]) {
			const container = desiredIndex.get(key);
			const listsInside =
				container?.type === 'folder' ||
				(operation.direction === 'promote' && container?.type === 'project');
			if (!container || !listsInside) continue;
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

/** Raise when the preview changes shape, so that a revision from an older version never matches. */
const PREVIEW_SCHEMA_VERSION = 3;

/** JSON with object keys in a fixed order, so equal values give equal text. */
export function canonicalJson(value: unknown): string {
	return JSON.stringify(value, (_key, nested: unknown) =>
		nested !== null && typeof nested === 'object' && !Array.isArray(nested)
			? Object.fromEntries(Object.entries(nested).sort(([a], [b]) => compare(a, b)))
			: nested,
	);
}

/**
 * A hash of what a preview shows, so an operation can stop when it changed. It leaves out
 * `changes` and `dependencies`: they come from the same data, and `changes` holds a save time.
 * It also leaves out the commit, because a commit for another project changes nothing here.
 * A Promote hashes its branch setting, because its confirmation says where the push goes.
 * The environment name and provider type only label the preview, so they stay out.
 */
export function previewRevision(shown: {
	resources: PromotionResource[];
	check?: PromotionPreviewCheck;
	source?: PromotionPreview['source'];
	createBranchOnPromotion?: boolean;
	blocker?: PromotionBlocker;
	missingDependencies?: PromotionMissingDependency[];
	warnings?: PromotionDependencyWarning[];
}): string {
	return revisionOf(shown);
}

/** A hash of the two lists of an instance Promote check. The check has no resources. */
export function promoteCheckRevision(
	shown: Pick<PromotionPromoteCheck, 'missingDependencies' | 'warnings'>,
): string {
	return revisionOf(shown);
}

function revisionOf(shown: object): string {
	return createHash('sha256')
		.update(canonicalJson({ schemaVersion: PREVIEW_SCHEMA_VERSION, ...shown }))
		.digest('hex');
}

/** The environment and branch that a preview reads. Apply sends it back as its expected source. */
export function previewSource(input: PromotionOperationInput): PromotionPreview['source'] {
	return { environmentId: input.environmentId, branchName: checkoutBranchName(input.config) };
}

/**
 * How the environment of a preview presents itself. The UI shows it, so a user who can only
 * preview does not need to read the environment settings. It stays out of the revision.
 */
export function previewEnvironment(
	input: PromotionOperationInput,
): PromotionPreview['environment'] {
	const { environmentName, providerType, config } = input;
	return {
		name: environmentName,
		providerType,
		...(config.direction === 'promote'
			? { createBranchOnPromotion: config.settings.createBranchOnPromotion }
			: {}),
	};
}

/** Parses JSON read from Git. `undefined` when it is not valid JSON. */
export function parseBranchJson<T = unknown>(raw: string): T | undefined {
	try {
		return jsonParse<T>(raw);
	} catch {
		return undefined;
	}
}

/** Parses a package manifest read from Git. `null` when the file is missing or invalid. */
export function parsePackageManifest(raw: string | undefined): PackageManifest | null {
	const manifest = packageManifestSchema.safeParse(parseBranchJson(raw ?? ''));
	return manifest.success ? manifest.data : null;
}

export function blobsByPath(files: readonly PackageFile[]): Map<string, string> {
	return new Map(files.map(({ path, blobSha }) => [path, blobSha]));
}
