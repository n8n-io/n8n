import type {
	PromotableResource,
	PromotionChanges,
	PromotionChangesQueryDto,
	PromotionDirection,
	PromotionPreview,
	PromotionResource,
	PromotionResourceDetail,
	PromotionResourceDetails,
	PromotionResourceDetailsRequestDto,
	PromotionResourceType,
	PromotionVariableScope,
} from '@n8n/api-types';
import {
	serializedCredentialSchema,
	serializedDataTableSchema,
	serializedFolderSchema,
	serializedProjectSchema,
	serializedTagSchema,
	serializedVariableSchema,
	serializedWorkflowSchema,
} from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import {
	CredentialsRepository,
	SharedWorkflowRepository,
	VariablesRepository,
	WorkflowRepository,
	type User,
	type VariableKeyScope,
	type WorkflowEntity,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';

import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { diffDataTableSchema } from '@/modules/n8n-packages/entities/data-table/data-table-compat';
import { DataTableSerializer } from '@/modules/n8n-packages/entities/data-table/data-table.serializer';
import { TagImporter } from '@/modules/n8n-packages/entities/tag/tag-importer';
import { serializeTag } from '@/modules/n8n-packages/entities/tag/tag.exporter';
import { formatEntityFile } from '@/modules/n8n-packages/io/entity-file-format';
import { gitBlobSha, HashingPackageWriter } from '@/modules/n8n-packages/io/hashing-package-writer';
import {
	PACKAGE_ENTITY_LAYOUT,
	entityFilePath,
	type ManifestEntityCollection,
} from '@/modules/n8n-packages/io/manifest-entry';
import { generateSlug } from '@/modules/n8n-packages/io/slug.utils';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	ExportDependencyPolicy,
	ExportVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import {
	packageManifestSchema,
	type ManifestEntry,
	type PackageManifest,
	type WorkflowManifestEntry,
} from '@/modules/n8n-packages/spec/manifest.schema';
import { getWorkflowConsumerIds } from '@/modules/n8n-packages/spec/requirement-consumers';
import type { PackageRequirements } from '@/modules/n8n-packages/spec/requirements.schema';

import { parsePackageFiles, type PackageFile } from './base-branch-files';
import { projectHolding } from './branch-placement';
import { toInstanceProject, type InstanceProject } from './cross-project-moves';
import { PACKAGE_SUBFOLDER } from './constants';
import { diffPackageFiles } from './diff-package-files';
import {
	buildPreview,
	indexSide,
	scopeManifestToProject,
	variableResourceKey,
	type ApplyDestination,
	type PreviewSide,
} from './promotion-preview';
import { PromotionEnvironmentResolver } from './promotion-environment.resolver';
import { PromotionReviewGateService } from './promotion-review-gate.service';
import { PromotionsService } from './promotions.service';
import { checkoutBranchName } from './promotions-git.utils';
import type { BranchPackage } from './promotions.types';

const DEPENDENCY_COLLECTIONS = {
	credentials: 'credentials',
	dataTables: 'dataTables',
	variables: 'variables',
	tags: 'tags',
	workflows: 'workflows',
	nodeTypes: null,
} as const satisfies Record<
	Exclude<keyof PackageRequirements, 'agents'>,
	ManifestEntityCollection | null
>;

const PROMOTION_SCOPES = {
	promote: 'promotions:promote',
	apply: 'promotions:apply',
} as const satisfies Record<PromotionDirection, Scope>;

type DesiredPackage = {
	files: readonly PackageFile[];
	manifest: PackageManifest;
};

type InstancePackage = DesiredPackage & {
	/** File content by package path, for the files that the caller asked to keep. */
	contents: ReadonlyMap<string, string>;
};

type ProjectComparison = {
	branch: BranchPackage;
	/** Read for Apply only. Promote reads it when the preview needs it. */
	branchManifest: PackageManifest | null;
	instance: InstancePackage;
	destinationVariables: readonly VariableKeyScope[] | null;
	rows: PromotableResource[];
};

type LocalDataTable = { content: string; blobSha: string };

type LocalTag = LocalDataTable & { id: string; name: string };

export type DetailSide = { content: string | null; blobSha: string | null };

type PackageDiff = {
	changedIds: Set<string>;
	renamedIds: Set<string>;
	modifiedIds: Set<string>;
	dependencyCounts: Map<string, number>;
	desiredWorkflows: Map<string, WorkflowManifestEntry>;
};

@Service()
export class PromotionChangeService {
	constructor(
		private readonly promotionsService: PromotionsService,
		private readonly packagesService: N8nPackagesService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly variablesRepository: VariablesRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly tagImporter: TagImporter,
		private readonly dataTableService: DataTableService,
		private readonly dataTableSerializer: DataTableSerializer,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly environmentResolver: PromotionEnvironmentResolver,
		private readonly reviewGate: PromotionReviewGateService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/**
	 * Lists the workflows that differ between the project on this instance and the
	 * branch of its config for `direction`. The rows describe the receiving side.
	 * Promote compares the branch (base) with the instance (desired). Apply swaps the
	 * sides: the instance is the base, and the branch is what the instance becomes.
	 */
	async getChanges(
		user: User,
		projectId: string,
		direction: PromotionDirection,
		query: PromotionChangesQueryDto,
	): Promise<PromotionChanges> {
		return toChanges(await this.compareProject(user, projectId, direction), query);
	}

	/**
	 * The change list, plus every resource that the operation changes. Each resource has its
	 * place in the project and folder tree, and the workflows that use it.
	 */
	async getPreview(
		user: User,
		projectId: string,
		direction: PromotionDirection,
		query: PromotionChangesQueryDto,
	): Promise<PromotionPreview> {
		if (direction === 'promote') {
			// The gate runs before the git and export work, so a blocked project skips both.
			this.assertCanPreview(user, direction);
			const input = await this.environmentResolver.resolveForProject(projectId, direction);
			// Only a branched promote opens a review. A direct push has nothing to wait for, even
			// when an older review of the environment is still open.
			const blocker =
				input.config.direction === 'promote' && input.config.settings.createBranchOnPromotion
					? await this.reviewGate.findPromoteBlocker(projectId, input.environmentId)
					: null;
			if (blocker) {
				return {
					commitSha: null,
					source: {
						environmentId: input.environmentId,
						branchName: checkoutBranchName(input.config),
					},
					changes: [],
					resources: [],
					dependencies: [],
					blocker,
				};
			}
		}
		const comparison = await this.compareProject(user, projectId, direction);
		const { branch, instance } = comparison;
		// Promote compares with the branch manifest to see renames and moves. The manifest can list
		// other projects while this project has no files on the branch yet, and the move markers
		// still need it.
		const promoteBase =
			direction === 'promote' && (branch.hasManifest || branch.files.length > 0)
				? await this.readBranchManifest(branch)
				: null;
		const branchSide: PreviewSide = {
			manifest:
				comparison.branchManifest ??
				(promoteBase && branch.files.length > 0
					? scopeManifestToProject(promoteBase, projectId)
					: null),
			blobByPath: blobsByPath(branch.files),
		};
		const instanceSide: PreviewSide = {
			manifest: instance.manifest,
			blobByPath: blobsByPath(instance.files),
		};
		const destination =
			direction === 'apply'
				? await this.loadApplyDestination(
						branchSide.manifest,
						instance.manifest,
						comparison.destinationVariables,
					)
				: null;
		const { resources, dependencies } = buildPreview({
			operation: { direction, destination },
			projectIds: [projectId],
			base: direction === 'promote' ? branchSide : instanceSide,
			desired: direction === 'promote' ? instanceSide : branchSide,
		});
		return {
			...toChanges(comparison, query),
			resources: promoteBase
				? await this.markCrossProjectMoves(projectId, resources, promoteBase)
				: resources,
			dependencies,
		};
	}

	/**
	 * A project promote refuses a workflow that moved between projects, so the preview names the
	 * other project on both sides of the move:
	 * - a deleted workflow that another project owns now on this instance moved out;
	 * - an added workflow that the branch holds under another project moved in.
	 */
	private async markCrossProjectMoves(
		projectId: string,
		resources: PromotionResource[],
		branchManifest: PackageManifest,
	): Promise<PromotionResource[]> {
		const deletedIds = resources
			.filter(({ type, change }) => type === 'workflow' && change === 'deleted')
			.map(({ id }) => id);
		const owners =
			deletedIds.length > 0
				? await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(deletedIds)
				: new Map<string, InstanceProject>();
		const branchTargets = new Map(
			(branchManifest.workflows ?? []).map(({ id, target }) => [id, target]),
		);
		const elsewhere = <P extends { id: string }>(project: P | undefined) =>
			project && project.id !== projectId ? project : undefined;
		const branchProjectOf = (id: string) => {
			const target = branchTargets.get(id);
			return target === undefined ? undefined : projectHolding(branchManifest.projects, target);
		};

		return resources.map((resource) => {
			if (resource.type !== 'workflow') return resource;
			const owner = resource.change === 'deleted' ? elsewhere(owners.get(resource.id)) : undefined;
			if (owner) return { ...resource, movedToProject: toInstanceProject(owner) };
			// The branch holds team projects only, so its project name is safe to show.
			const branchProject =
				resource.change === 'added' ? elsewhere(branchProjectOf(resource.id)) : undefined;
			return branchProject
				? { ...resource, movedFromProject: { id: branchProject.id, name: branchProject.name } }
				: resource;
		});
	}

	/**
	 * The file content of each requested resource on both sides, for the change cards.
	 * The branch side is read at the commit of the summary. The instance side is read now,
	 * so its blob SHA tells the caller whether the resource changed after the summary.
	 */
	async getDetails(
		user: User,
		projectId: string,
		direction: PromotionDirection,
		{ commitSha, keys }: PromotionResourceDetailsRequestDto,
	): Promise<PromotionResourceDetails> {
		this.assertCanPreview(user, direction);
		const requestedIds = new Set(keys.map((key) => key.slice(key.lastIndexOf(':') + 1)));
		const readBranch = async (paths: readonly string[]) =>
			commitSha === null
				? new Map<string, string>()
				: await this.promotionsService.readBranchFilesAtCommit(
						projectId,
						direction,
						commitSha,
						paths,
					);
		const manifestPath = `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`;
		const [branchFiles, instance] = await Promise.all([
			readBranch([manifestPath]),
			this.exportInstancePackage(user, projectId, {
				// Keep the content of the requested resources only. Variables match by name, not by ID.
				keepContent: (path) =>
					requestedIds.has(entityIdOfPath(path)) ||
					path.includes(`/${PACKAGE_ENTITY_LAYOUT.variables.directory}/`),
			}),
		]);
		const branchManifest = parseBranchManifest(branchFiles.get(manifestPath), projectId);
		const branchIndex = indexSide({ manifest: branchManifest, blobByPath: new Map() }, projectId);
		const instanceIndex = indexSide(
			{ manifest: instance.manifest, blobByPath: blobsByPath(instance.files) },
			projectId,
		);
		// A resource can disappear after the summary, for example when a local workflow is deleted.
		const missingKeys = keys.filter((key) => !branchIndex.has(key) && !instanceIndex.has(key));

		const branchContents = await readBranch(
			keys.flatMap((key) => branchIndex.get(key)?.path ?? []),
		);
		// Apply reuses a data table that exists on this instance, even when no local workflow uses it.
		const localTables =
			direction === 'apply'
				? await this.loadLocalDataTables(
						keys.flatMap((key) => {
							const resource = branchIndex.get(key);
							return resource?.type === 'dataTable' && !instanceIndex.has(key) ? [resource.id] : [];
						}),
					)
				: new Map<string, LocalDataTable>();
		// Apply also reuses a tag that exists on this instance, by ID or by name.
		const localTags =
			direction === 'apply'
				? await this.loadLocalTags(
						keys.flatMap((key) => {
							const resource = branchIndex.get(key);
							return resource?.type === 'tag' && !instanceIndex.has(key) ? [resource] : [];
						}),
					)
				: new Map<string, LocalTag>();
		const canSeeVariableValues = hasGlobalScope(user, 'variable:list');

		const details = keys.flatMap((key): PromotionResourceDetail[] => {
			const fromBranch = branchIndex.get(key);
			const fromInstance = instanceIndex.get(key);
			const resource = fromInstance ?? fromBranch;
			if (!resource) return [];
			const branchContent = fromBranch && branchContents.get(fromBranch.path);
			const localCopy =
				fromBranch && (fromBranch.type === 'tag' ? localTags : localTables).get(fromBranch.id);
			const branchSide: DetailSide =
				branchContent === undefined
					? { content: null, blobSha: null }
					: { content: branchContent, blobSha: gitBlobSha(branchContent) };
			const instanceSide: DetailSide = fromInstance
				? {
						content: instance.contents.get(fromInstance.path) ?? null,
						blobSha: fromInstance.blobSha,
					}
				: localCopy
					? { content: localCopy.content, blobSha: localCopy.blobSha }
					: { content: null, blobSha: null };
			const [before, after] =
				direction === 'promote' ? [branchSide, instanceSide] : [instanceSide, branchSide];
			return [
				toDetail({
					key,
					type: resource.type,
					before,
					after,
					hideVariableValues: resource.type === 'variable' && !canSeeVariableValues,
				}),
			];
		});
		return { details, missingKeys };
	}

	private async compareProject(
		user: User,
		projectId: string,
		direction: PromotionDirection,
	): Promise<ProjectComparison> {
		this.assertCanPreview(user, direction);
		const branch = await this.promotionsService.readBranchPackage(projectId, direction);
		// Apply reads the branch manifest before the export, so an empty branch fails without one.
		const branchDesired =
			direction === 'apply' ? await this.readBranchDesired(branch, projectId) : null;
		const [instance, destinationVariables] = await Promise.all([
			this.exportInstancePackage(user, projectId),
			branchDesired === null
				? null
				: this.variablesRepository.findKeysInProjectsOrGlobal(
						branchDesired.manifest.requirements?.variables?.map(({ name }) => name) ?? [],
						[projectId],
					),
		]);
		const { base, desired } =
			branchDesired === null
				? { base: branch.files, desired: instance }
				: { base: instance.files, desired: branchDesired };
		const diff = this.diffPackages({ projectId, direction, base, desired, destinationVariables });
		// A deleted row in apply is a local workflow, so its name and version come from the database.
		const metadata = await this.workflowRepository.findByIds(
			[...diff.changedIds].filter((id) => direction === 'apply' || diff.desiredWorkflows.has(id)),
			{ fields: ['name', 'updatedAt', 'versionCounter'] },
		);
		const rows = buildPromotableResources({ ...diff, base, metadata });

		return {
			branch,
			branchManifest: branchDesired?.manifest ?? null,
			instance,
			destinationVariables,
			rows,
		};
	}

	/** One route serves both directions, so the per-direction scope is checked here, not on the decorator. */
	private assertCanPreview(user: User, direction: PromotionDirection) {
		const scope = PROMOTION_SCOPES[direction];
		if (!hasGlobalScope(user, scope)) {
			throw new ForbiddenError(
				`Change preview requires the ${scope} scope. Ask an administrator for access.`,
			);
		}
	}

	private diffPackages({
		projectId,
		direction,
		base,
		desired,
		destinationVariables,
	}: {
		projectId: string;
		direction: PromotionDirection;
		base: readonly PackageFile[];
		desired: DesiredPackage;
		destinationVariables: readonly VariableKeyScope[] | null;
	}): PackageDiff {
		const previewId = randomUUID();
		const { manifest } = desired;
		const changes = diffPackageFiles(base, desired.files);
		const changedIds = new Set<string>();
		const renamedIds = new Set<string>();
		const modifiedIds = new Set<string>();
		const changedPaths = new Set<string>();
		for (const fileChange of changes) {
			if (fileChange.change !== 'added') changedPaths.add(fileChange.base.path);
			if (fileChange.change !== 'deleted') changedPaths.add(fileChange.desired.path);
			const file = fileChange.change === 'deleted' ? fileChange.base : fileChange.desired;
			if (file.type === 'workflow') {
				changedIds.add(file.entityId);
				if (fileChange.change === 'renamed' || fileChange.change === 'renamed-and-modified') {
					renamedIds.add(file.entityId);
				}
				if (fileChange.change !== 'renamed') modifiedIds.add(file.entityId);
			}
			this.logger.debug('Promotion file change', {
				previewId,
				projectId,
				direction,
				...fileChange,
			});
		}
		const { affectedWorkflowIds, dependencyCounts } = calculateDependencyImpact({
			base,
			manifest,
			changedPaths,
			projectId,
			destinationVariables,
		});
		for (const workflowId of affectedWorkflowIds) {
			changedIds.add(workflowId);
			modifiedIds.add(workflowId);
		}
		const desiredWorkflows = new Map(manifest.workflows?.map((entry) => [entry.id, entry]));
		this.logger.debug('Promotion change preview', {
			previewId,
			projectId,
			direction,
			baseFileCount: base.length,
			desiredFileCount: desired.files.length,
			fileChangeCount: changes.length,
			workflowIds: [...changedIds],
		});
		return { changedIds, renamedIds, modifiedIds, dependencyCounts, desiredWorkflows };
	}

	private async exportInstancePackage(
		user: User,
		projectId: string,
		{ keepContent }: { keepContent?: (path: string) => boolean } = {},
	): Promise<InstancePackage> {
		const writer = new HashingPackageWriter();
		const contents = new Map<string, string>();
		const { manifest } = await this.packagesService.exportPackageToWriter(
			{
				user,
				projectIds: [projectId],
				includeAgents: false,
				includeArchivedWorkflows: true,
				includeTags: true,
				includeVariableValues: true,
				versionPolicy: ExportVersionPolicy.Latest,
				dependencyPolicy: ExportDependencyPolicy.ReferenceOnly,
			},
			{
				writeDirectory: (path) => writer.writeDirectory(path),
				writeFile(path, content) {
					writer.writeFile(path, content);
					const packagePath = `${PACKAGE_SUBFOLDER}/${path}`;
					if (keepContent?.(packagePath)) contents.set(packagePath, String(content));
				},
			},
		);
		const files = parsePackageFiles(
			writer.finalize().map((file) => ({
				...file,
				path: `${PACKAGE_SUBFOLDER}/${file.path}`,
			})),
			{ exportRoot: PACKAGE_SUBFOLDER, projectId },
		);
		return { files, manifest, contents };
	}

	private async readBranchDesired(
		branch: BranchPackage,
		projectId: string,
	): Promise<DesiredPackage> {
		const manifest = await this.readBranchManifest(branch);
		return { files: branch.files, manifest: scopeManifestToProject(manifest, projectId) };
	}

	/** The whole branch manifest, across every project of the package. */
	private async readBranchManifest(branch: BranchPackage): Promise<PackageManifest> {
		const manifestPath = `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`;
		const manifest = parsePackageManifest(
			(await branch.readFiles([manifestPath])).get(manifestPath),
		);
		if (!manifest) {
			throw new BadRequestError('The package manifest on the branch cannot be read');
		}
		return manifest;
	}

	/**
	 * Apply reuses credentials, tags, variables, and data tables that already exist on this
	 * instance. The local export holds only those that local workflows use, so the others are
	 * looked up here. Otherwise the preview would show them as new.
	 */
	private async loadApplyDestination(
		branchManifest: PackageManifest | null,
		instanceManifest: PackageManifest,
		variables: readonly VariableKeyScope[] | null,
	): Promise<ApplyDestination> {
		const requirements = branchManifest?.requirements;
		const exportedTableIds = new Set(instanceManifest.dataTables?.map(({ id }) => id));
		const [credentials, tags, dataTables] = await Promise.all([
			this.credentialsRepository.findNamesByIds(
				requirements?.credentials?.map(({ id }) => id) ?? [],
			),
			this.loadLocalTags(requirements?.tags ?? []),
			this.loadLocalDataTables(
				(requirements?.dataTables ?? [])
					.map(({ id }) => id)
					.filter((id) => !exportedTableIds.has(id)),
			),
		]);
		return {
			credentialNames: new Map(credentials.map(({ id, name }) => [id, name])),
			tags,
			variableKeys: new Set(
				(variables ?? []).map(({ key, projectId }) => variableResourceKey(key, projectId)),
			),
			dataTables,
		};
	}

	/**
	 * Finds the local tag that Apply uses for each branch tag: the tag with the same ID, else the tag
	 * with the same name. Serializes each tag as the package stores it, so it compares with branch files.
	 */
	private async loadLocalTags(
		branchTags: ReadonlyArray<{ id: string; name: string }>,
	): Promise<Map<string, LocalTag>> {
		const local = await this.tagImporter.findLocalTags(branchTags);
		return new Map(
			branchTags.flatMap(({ id, name }): Array<[string, LocalTag]> => {
				const tag = local.byId.get(id) ?? local.byName.get(name.trim());
				if (!tag) return [];
				const content = formatEntityFile(serializeTag(tag));
				return [[id, { id: tag.id, name: tag.name, content, blobSha: gitBlobSha(content) }]];
			}),
		);
	}

	/** Serializes local data tables as the package stores them, so they compare with branch files. */
	private async loadLocalDataTables(ids: string[]): Promise<Map<string, LocalDataTable>> {
		if (ids.length === 0 || !this.moduleRegistry.isActive('data-table')) return new Map();
		const tables = await this.dataTableService.findDataTablesByIds(ids);
		return new Map(
			tables.map((table) => {
				const content = formatEntityFile(this.dataTableSerializer.serialize(table));
				return [table.id, { content, blobSha: gitBlobSha(content) }];
			}),
		);
	}
}

function parseBranchJson<T = unknown>(raw: string): T | undefined {
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

/** Parses the branch manifest and keeps this project's part. `null` when the file is missing or invalid. */
function parseBranchManifest(raw: string | undefined, projectId: string): PackageManifest | null {
	const manifest = parsePackageManifest(raw);
	return manifest && scopeManifestToProject(manifest, projectId);
}

function blobsByPath(files: readonly PackageFile[]): Map<string, string> {
	return new Map(files.map(({ path, blobSha }) => [path, blobSha]));
}

/** Entity directories end with `-<id>`, and the entity file sits inside that directory. */
function entityIdOfPath(path: string): string {
	const segments = path.split('/');
	const directory = segments[segments.length - 2] ?? '';
	return directory.slice(directory.lastIndexOf('-') + 1);
}

function toChanges(
	{ branch, rows }: ProjectComparison,
	query: PromotionChangesQueryDto,
): PromotionChanges {
	return {
		commitSha: branch.commitSha,
		source: { environmentId: branch.environmentId, branchName: branch.branchName },
		changes: applyQuery(rows, query),
	};
}

/**
 * Reads one side of a resource. `null` when the side has no file, or when its file does not
 * match the package format.
 */
function parseContent<Schema extends z.ZodTypeAny>(
	schema: Schema,
	content: string | null,
): z.output<Schema> | null {
	if (content === null) return null;
	const parsed = schema.safeParse(parseBranchJson(content));
	return parsed.success ? parsed.data : null;
}

export function toDetail({
	key,
	type,
	before,
	after,
	hideVariableValues,
}: {
	key: string;
	type: PromotionResourceType;
	before: DetailSide;
	after: DetailSide;
	hideVariableValues: boolean;
}): PromotionResourceDetail {
	const parseSides = <Schema extends z.ZodTypeAny>(schema: Schema) => ({
		key,
		before: parseContent(schema, before.content),
		after: parseContent(schema, after.content),
		revision: { before: before.blobSha, after: after.blobSha },
	});
	switch (type) {
		case 'project':
			return { type, ...parseSides(serializedProjectSchema) };
		case 'folder':
			return { type, ...parseSides(serializedFolderSchema) };
		case 'workflow':
			return { type, ...parseSides(serializedWorkflowSchema) };
		case 'credential':
			return { type, ...parseSides(serializedCredentialSchema) };
		case 'tag':
			return { type, ...parseSides(serializedTagSchema) };
		case 'variable': {
			const detail = { type, ...parseSides(serializedVariableSchema) };
			if (!hideVariableValues) return detail;
			for (const content of [detail.before, detail.after]) {
				if (content) delete content.value;
			}
			return { ...detail, valueHidden: true };
		}
		case 'dataTable': {
			const detail = { type, ...parseSides(serializedDataTableSchema) };
			const { before: current, after: incoming } = detail;
			if (!current || !incoming) return detail;
			return { ...detail, dataTableChanges: diffDataTableSchema(incoming, current) };
		}
	}
}

function applyQuery(
	changes: PromotableResource[],
	query: Pick<PromotionChangesQueryDto, 'search' | 'sort' | 'order'>,
): PromotableResource[] {
	const search = query.search?.toLowerCase();
	return changes
		.filter(({ name }) => !search || name.toLowerCase().includes(search))
		.sort((a, b) => {
			const comparison = (a[query.sort] ?? '').localeCompare(b[query.sort] ?? '');
			return (query.order === 'desc' ? -comparison : comparison) || a.id.localeCompare(b.id);
		});
}

function calculateDependencyImpact({
	base,
	manifest,
	changedPaths,
	projectId,
	destinationVariables,
}: {
	base: readonly PackageFile[];
	manifest: PackageManifest;
	changedPaths: ReadonlySet<string>;
	projectId: string;
	destinationVariables: readonly VariableKeyScope[] | null;
}) {
	const destinationVariableKeys =
		destinationVariables &&
		new Set(
			destinationVariables.map(({ key, projectId: owner }) =>
				variableKey(key, owner === null ? 'global' : 'project'),
			),
		);
	const baseDependencies = new Map<string, PackageFile[]>();
	for (const file of base) {
		const key = JSON.stringify([
			file.fileName,
			file.type === 'variable' ? file.slug : file.entityId,
		]);
		const group = baseDependencies.get(key) ?? [];
		group.push(file);
		baseDependencies.set(key, group);
	}
	const affectedWorkflowIds = new Set<string>();
	const dependencyCounts = new Map<string, number>();
	for (const collection of Object.values(DEPENDENCY_COLLECTIONS)) {
		if (collection === null) continue;
		const entries = new Map(
			manifest[collection]?.map((entry) => [
				collection === 'variables' ? entry.name : entry.id,
				entry,
			]),
		);
		for (const requirement of manifest.requirements?.[collection] ?? []) {
			const key = 'id' in requirement ? requirement.id : requirement.name;
			const entry = entries.get(key);
			const baseKey = collection === 'variables' ? generateSlug(key, 'variable') : key;
			const group =
				baseDependencies.get(
					JSON.stringify([PACKAGE_ENTITY_LAYOUT[collection].fileName, baseKey]),
				) ?? [];
			const projectFiles = group.filter((file) => file.projectId === projectId);
			const scopedFiles = projectFiles.length ? projectFiles : group;
			const sameId = entry ? scopedFiles.filter(({ entityId }) => entityId === entry.id) : [];
			const previous = sameId.length ? sameId : scopedFiles;
			const currentPath = entry
				? `${PACKAGE_SUBFOLDER}/${entityFilePath(collection, entry.target)}`
				: undefined;
			let dependencyChanged = false;
			if (collection === 'variables') {
				dependencyChanged = variableChanged({
					name: key,
					entry,
					baseFiles: group,
					projectId,
					destinationVariableKeys,
				});
			} else if (collection !== 'workflows') {
				dependencyChanged =
					previous.some(({ path }) => changedPaths.has(path)) ||
					(currentPath !== undefined && changedPaths.has(currentPath));
			}
			for (const workflowId of getWorkflowConsumerIds(requirement)) {
				dependencyCounts.set(workflowId, (dependencyCounts.get(workflowId) ?? 0) + 1);
				if (dependencyChanged) affectedWorkflowIds.add(workflowId);
			}
		}
	}
	return { affectedWorkflowIds, dependencyCounts };
}

function variableChanged({
	name,
	entry,
	baseFiles,
	projectId,
	destinationVariableKeys,
}: {
	name: string;
	entry: ManifestEntry | undefined;
	baseFiles: readonly PackageFile[];
	projectId: string;
	destinationVariableKeys: ReadonlySet<string> | null;
}): boolean {
	const desiredScope = entryScope(entry);
	if (destinationVariableKeys === null) return filesScope(baseFiles, projectId) !== desiredScope;
	const exists = (scope: PromotionVariableScope['kind']) =>
		destinationVariableKeys.has(variableKey(name, scope));
	if (desiredScope === undefined) return exists('project') || exists('global');
	return !exists(desiredScope);
}

function entryScope(entry: ManifestEntry | undefined): PromotionVariableScope['kind'] | undefined {
	if (!entry) return undefined;
	return entry.target.startsWith(`${PACKAGE_ENTITY_LAYOUT.projects.directory}/`)
		? 'project'
		: 'global';
}

function filesScope(
	files: readonly PackageFile[],
	projectId: string,
): PromotionVariableScope['kind'] | undefined {
	if (files.some((file) => file.projectId === projectId)) return 'project';
	if (files.length > 0) return 'global';
	return undefined;
}

function variableKey(name: string, scope: PromotionVariableScope['kind']): string {
	return JSON.stringify([scope, name]);
}

function buildPromotableResources({
	base,
	desiredWorkflows,
	changedIds,
	renamedIds,
	modifiedIds,
	metadata,
	dependencyCounts,
}: {
	base: readonly PackageFile[];
	desiredWorkflows: ReadonlyMap<string, WorkflowManifestEntry>;
	changedIds: ReadonlySet<string>;
	renamedIds: ReadonlySet<string>;
	modifiedIds: ReadonlySet<string>;
	metadata: ReadonlyArray<Pick<WorkflowEntity, 'id' | 'name' | 'updatedAt' | 'versionCounter'>>;
	dependencyCounts: ReadonlyMap<string, number>;
}): PromotableResource[] {
	const metadataById = new Map(metadata.map((workflow) => [workflow.id, workflow]));
	const baseWorkflowSlugs = new Map(
		base.filter(({ type }) => type === 'workflow').map(({ entityId, slug }) => [entityId, slug]),
	);
	return [...changedIds].map((id) => {
		const entry = desiredWorkflows.get(id);
		const workflow = metadataById.get(id);
		let status: PromotableResource['status'] = 'modified';
		if (!entry) status = 'deleted';
		else if (!baseWorkflowSlugs.has(id)) status = 'new';
		// A package from before the flag has no value, so its archived workflows list as modified.
		else if (entry.isArchived) status = 'archived';
		else if (renamedIds.has(id)) {
			status = modifiedIds.has(id) ? 'renamed-and-modified' : 'renamed';
		}
		return {
			id,
			name: entry?.name ?? workflow?.name ?? baseWorkflowSlugs.get(id) ?? id,
			type: 'workflow',
			status,
			version: workflow?.versionCounter ?? null,
			updatedAt: workflow?.updatedAt.toISOString() ?? null,
			updatedBy: null,
			dependencyCount: dependencyCounts.get(id) ?? 0,
		};
	});
}
