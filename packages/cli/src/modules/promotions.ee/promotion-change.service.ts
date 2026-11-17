import type {
	PromotionDirection,
	PromotionEnvironmentChanges,
	PromotionEnvironmentChangesProject,
	PromotionProjectEnvironments,
	PromotionInstanceApplyPreview,
	PromotionPreview,
	PromotionResourceDetail,
	PromotionResourceDetails,
	PromotionResourceDetailsRequestDto,
	PromotionResourceType,
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
import { ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { z } from 'zod';

import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { diffDataTableSchema } from '@/modules/n8n-packages/entities/data-table/data-table-compat';
import { gitBlobSha } from '@/modules/n8n-packages/io/hashing-package-writer';
import { PACKAGE_ENTITY_LAYOUT, entityIdOfSegment } from '@/modules/n8n-packages/io/manifest-entry';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { PACKAGE_SUBFOLDER } from './constants';
import {
	blobsByPath,
	indexSide,
	indexProjects,
	resourceKey,
	type SideIndex,
	parseBranchJson,
	parsePackageManifest,
	scopeManifestToProject,
} from './promotion-preview';
import { PromotionAccessService } from './promotion-access.service';
import { PromotionDependencyGate } from './promotion-dependency-gate.service';
import { PromotionEnvironmentProjectsService } from './promotion-environment-projects.service';
import { PromotionEnvironmentResolver } from './promotion-environment.resolver';
import { ApplyPreviewService } from './apply-preview.service';
import { PromotePreviewService } from './promote-preview.service';
import {
	EMPTY_INSTANCE_PACKAGE,
	exportInstancePackage,
	type InstancePackage,
} from './instance-package';
import {
	LocalPackageEntities,
	type LocalDataTable,
	type LocalTag,
} from './local-package-entities.service';
import { PromotionsService, selectableCredentialIds } from './promotions.service';

export type DetailSide = { content: string | null; blobSha: string | null };

@Service()
export class PromotionChangeService {
	constructor(
		private readonly promotionsService: PromotionsService,
		private readonly packagesService: N8nPackagesService,
		private readonly applyPreviewService: ApplyPreviewService,
		private readonly promotePreviewService: PromotePreviewService,
		private readonly localEntities: LocalPackageEntities,
		private readonly environmentResolver: PromotionEnvironmentResolver,
		private readonly projectRepository: ProjectRepository,
		private readonly accessService: PromotionAccessService,
		private readonly environmentProjects: PromotionEnvironmentProjectsService,
		private readonly dependencyGate: PromotionDependencyGate,
	) {}

	/**
	 * The environments that serve a project, for a user who can read it. The project header
	 * uses it, so it needs no global promotion scope.
	 */
	async getProjectEnvironments(
		user: User,
		projectId: string,
	): Promise<PromotionProjectEnvironments> {
		await this.accessService.assertCanRead(user, projectId);
		const { promote, apply } = await this.environmentResolver.describeForProject(projectId);
		const [canPromote, canApply] = await Promise.all([
			promote ? this.accessService.canOperate(user, projectId, 'promote') : false,
			apply ? this.accessService.canOperate(user, projectId, 'apply') : false,
		]);
		return {
			...(promote?.config.direction === 'promote'
				? {
						promote: {
							id: promote.id,
							name: promote.name,
							providerType: promote.providerType,
							allowIncomplete: promote.config.settings.allowIncomplete,
							createBranchOnPromotion: promote.config.settings.createBranchOnPromotion,
							branchName: promote.config.settings.baseBranchName,
							canOperate: canPromote,
						},
					}
				: {}),
			...(apply?.config.direction === 'apply'
				? {
						apply: {
							id: apply.id,
							name: apply.name,
							providerType: apply.providerType,
							allowIncomplete: apply.config.settings.allowIncomplete,
							branchName: apply.config.settings.branchName,
							canOperate: canApply,
						},
					}
				: {}),
		};
	}

	/**
	 * Every resource that the operation changes. Each resource has its place in the project and
	 * folder tree, and the workflows that use it.
	 */
	async getPreview(
		user: User,
		projectId: string,
		direction: PromotionDirection,
	): Promise<PromotionPreview> {
		if (direction === 'apply') return await this.getApplyPreview(user, projectId);
		await this.accessService.assertCanOperate(user, [projectId], direction);
		const input = await this.environmentResolver.resolveForProject(projectId, direction);
		return await this.promotePreviewService.build({
			user,
			projectId,
			input,
			readBranch: async () => await this.promotionsService.readBranchPackage(projectId, 'promote'),
		});
	}

	/** The Apply preview, built from the import plan at the branch tip. */
	private async getApplyPreview(user: User, projectId: string): Promise<PromotionPreview> {
		await this.accessService.assertCanOperate(user, [projectId], 'apply');
		const branch = await this.promotionsService.readBranchPackage(projectId, 'apply');
		if (branch.commitSha === null) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}
		const [files, instance] = await Promise.all([
			this.promotionsService.readApplyPackageAtCommit(projectId, branch.commitSha),
			exportInstancePackage(this.packagesService, user, [projectId]),
		]);
		const input = await this.environmentResolver.resolveForProject(projectId, 'apply');
		const { selection, ...preview } = await this.applyPreviewService.build({
			user,
			projectId,
			input,
			files,
			instance,
		});
		// The revision keeps the check of the plan. The report replaces the rows that it describes.
		// It reads the selection of the plan, which holds the projects that the moves added.
		const { check, dependencyReport } = await this.dependencyGate.applyPreviewReport(
			{
				user,
				input,
				files,
				selection: this.dependencyGate.toCheckSelection(
					selection,
					selectableCredentialIds(preview.resources, projectId),
				),
			},
			preview.check,
		);
		return {
			commitSha: branch.commitSha,
			source: { environmentId: branch.environmentId, branchName: branch.branchName },
			...preview,
			check,
			...(dependencyReport ? { dependencyReport } : {}),
		};
	}

	/**
	 * The preview of a whole-instance Apply: every change, what stops it and what it deletes,
	 * built from the import plan at the branch tip.
	 */
	async getInstanceApplyPreview(
		user: User,
		environmentId: string,
	): Promise<PromotionInstanceApplyPreview> {
		const { commitSha, source, files } =
			await this.promotionsService.readInstanceApplyPackage(environmentId);
		const input = await this.environmentResolver.resolveForEnvironment(environmentId, 'apply');
		const preview = await this.applyPreviewService.buildInstance({ user, input, files });
		const { check, dependencyReport } = await this.dependencyGate.applyPreviewReport(
			{ user, input, files, selection: 'instance' },
			preview.check,
		);
		return {
			commitSha,
			source,
			...preview,
			// The revision stays the one of the plan: the Apply compares it without the report.
			resources: withKeptItems(preview.resources, dependencyReport),
			check,
			...(dependencyReport ? { dependencyReport } : {}),
		};
	}

	/**
	 * The changes view of an environment, for Promote and for Apply. It lists the changes of every
	 * project of the environment that the user can read, and each resource names its project.
	 * It needs no global promotion scope, and it works for both environment scopes.
	 */
	async getEnvironmentChanges(
		user: User,
		environmentId: string,
		direction: PromotionDirection,
	): Promise<PromotionEnvironmentChanges> {
		const input = await this.environmentResolver.resolveForEnvironment(environmentId, direction);
		if (direction === 'promote') {
			const preview = await this.promotionsService.buildPromoteEnvironmentPreview(user, input);
			this.assertSeesProject(preview.projects);
			return preview;
		}
		const { commitSha, source, files } =
			await this.promotionsService.readEnvironmentApplyPackage(input);
		const { projects, resources, dependencies, check, dependencyReport, revision } =
			await this.promotionsService.buildApplyEnvironmentPreview(user, input, files);
		this.assertSeesProject(projects);
		return {
			direction,
			commitSha,
			source,
			projects,
			resources,
			dependencies,
			check,
			...(dependencyReport ? { dependencyReport } : {}),
			revision,
		};
	}

	/**
	 * The file content of resources of the changes view of an environment, like
	 * {@link getDetails}. Only the projects that the user can read are indexed, so a key of
	 * another project counts as missing.
	 */
	async getEnvironmentChangeDetails(
		user: User,
		environmentId: string,
		direction: PromotionDirection,
		{ commitSha, keys }: PromotionResourceDetailsRequestDto,
		{ canSeeVariableValues }: { canSeeVariableValues: boolean },
	): Promise<PromotionResourceDetails> {
		const input = await this.environmentResolver.resolveForEnvironment(environmentId, direction);
		const requestedIds = new Set(keys.map((key) => key.slice(key.indexOf(':') + 1)));
		const readBranch = async (paths: readonly string[]) =>
			commitSha === null
				? new Map<string, string>()
				: await this.promotionsService.readEnvironmentFilesAtCommit(input, commitSha, paths);
		const manifestPath = `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`;
		const branchManifest = parsePackageManifest(
			(await readBranch([manifestPath])).get(manifestPath),
		);
		const { projects, exportableProjectIds, existingProjectIds } =
			await this.environmentProjects.forView(user, input, direction, branchManifest?.projects);
		this.assertSeesProject(projects);

		const projectIds = projects.map(({ id }) => id);
		const exportedIds = projectIds.filter(
			(id) => existingProjectIds.has(id) && exportableProjectIds.has(id),
		);
		const instance =
			exportedIds.length > 0
				? await exportInstancePackage(this.packagesService, user, exportedIds, {
						// Keep the content of the requested resources only. Variables match by name, not by ID.
						keepContent: (path) =>
							requestedIds.has(entityIdOfPath(path)) ||
							path.includes(`/${PACKAGE_ENTITY_LAYOUT.variables.directory}/`),
					})
				: EMPTY_INSTANCE_PACKAGE;
		const branchIndex = indexProjects(
			{ manifest: branchManifest, blobByPath: new Map() },
			projectIds,
		);
		const instanceIndex = indexProjects(
			{ manifest: instance.manifest, blobByPath: blobsByPath(instance.files) },
			exportedIds,
		);
		const missingKeys = keys.filter((key) => !branchIndex.has(key) && !instanceIndex.has(key));
		const details = await this.assembleDetails({
			keys,
			direction,
			branchIndex,
			instanceIndex,
			instance,
			readBranch,
			canSeeVariableValues,
		});
		return { details, missingKeys };
	}

	/** A user without a project in the environment gets no view, not an empty one. */
	private assertSeesProject(projects: readonly PromotionEnvironmentChangesProject[]): void {
		if (projects.length === 0) {
			throw new ForbiddenError('You do not have access to a project of this environment');
		}
	}

	/**
	 * The file content of each requested resource on both sides, for the change cards.
	 * The branch side is read at the commit of the summary. The instance side is read now,
	 * so its blob SHA tells the caller whether the resource changed after the summary.
	 * Variable values are left out unless `canSeeVariableValues` is set.
	 */
	async getDetails(
		user: User,
		projectId: string,
		direction: PromotionDirection,
		{ commitSha, keys }: PromotionResourceDetailsRequestDto,
		{ canSeeVariableValues }: { canSeeVariableValues: boolean },
	): Promise<PromotionResourceDetails> {
		await this.accessService.assertCanOperate(user, [projectId], direction);
		const requestedIds = new Set(keys.map((key) => key.slice(key.indexOf(':') + 1)));
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
			exportInstancePackage(this.packagesService, user, [projectId], {
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

		const details = await this.assembleDetails({
			keys,
			direction,
			branchIndex,
			instanceIndex,
			instance,
			readBranch,
			canSeeVariableValues,
		});
		return { details, missingKeys };
	}

	/**
	 * The file content of resources of the whole-instance Apply preview, like {@link getDetails}.
	 * A deleted project also deletes what it owns that no workflow uses. That is not in the
	 * export. Such a data table has its current content as the before side. Such a credential or
	 * variable has nothing to show, so it counts as missing.
	 */
	async getInstanceApplyDetails(
		user: User,
		environmentId: string,
		{ commitSha, keys }: PromotionResourceDetailsRequestDto,
		{ canSeeVariableValues }: { canSeeVariableValues: boolean },
	): Promise<PromotionResourceDetails> {
		// The whole-instance preview always has a commit.
		if (commitSha === null) {
			throw new BadRequestError('Send the commitSha of the whole-instance Apply preview.');
		}
		const requestedIds = new Set(keys.map((key) => key.slice(key.indexOf(':') + 1)));
		const readBranch = async (paths: readonly string[]) =>
			await this.promotionsService.readInstanceApplyFilesAtCommit(environmentId, commitSha, paths);
		const manifestPath = `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`;
		const teamProjectIds = await this.projectRepository.findTeamProjectIds();
		const [branchFiles, instance] = await Promise.all([
			readBranch([manifestPath]),
			exportInstancePackage(this.packagesService, user, teamProjectIds, {
				// Keep the content of the requested resources only. Variables match by name, not by ID.
				keepContent: (path) =>
					requestedIds.has(entityIdOfPath(path)) ||
					path.includes(`/${PACKAGE_ENTITY_LAYOUT.variables.directory}/`),
			}),
		]);
		const branchManifest = parsePackageManifest(branchFiles.get(manifestPath));
		const branchProjectIds = new Set(branchManifest?.projects?.map(({ id }) => id));
		const projectIds = [...new Set([...teamProjectIds, ...branchProjectIds])];
		const branchIndex = indexProjects(
			{ manifest: branchManifest, blobByPath: new Map() },
			projectIds,
		);
		const instanceIndex = indexProjects(
			{ manifest: instance.manifest, blobByPath: blobsByPath(instance.files) },
			projectIds,
		);
		const unindexed = keys.filter((key) => !branchIndex.has(key) && !instanceIndex.has(key));
		// A deleted project also deletes its data tables that no workflow uses. The preview shows
		// their schema, so the detail holds their current content.
		const tablePrefix = resourceKey('dataTable', '');
		const [details, localTables] = await Promise.all([
			this.assembleDetails({
				keys,
				direction: 'apply',
				branchIndex,
				instanceIndex,
				instance,
				readBranch,
				canSeeVariableValues,
			}),
			this.localEntities.dataTables(
				unindexed.flatMap((key) =>
					key.startsWith(tablePrefix) ? [key.slice(tablePrefix.length)] : [],
				),
			),
		]);
		const found = new Set<string>();
		for (const [id, table] of localTables) {
			const key = resourceKey('dataTable', id);
			found.add(key);
			details.push(
				toDetail({
					key,
					type: 'dataTable',
					before: table,
					after: { content: null, blobSha: null },
					hideVariableValues: false,
				}),
			);
		}
		return { details, missingKeys: unindexed.filter((key) => !found.has(key)) };
	}

	/** Reads both sides of each requested resource that an index holds. */
	private async assembleDetails({
		keys,
		direction,
		branchIndex,
		instanceIndex,
		instance,
		readBranch,
		canSeeVariableValues,
	}: {
		keys: readonly string[];
		direction: PromotionDirection;
		branchIndex: SideIndex;
		instanceIndex: SideIndex;
		instance: InstancePackage;
		readBranch: (paths: readonly string[]) => Promise<Map<string, string>>;
		canSeeVariableValues: boolean;
	}): Promise<PromotionResourceDetail[]> {
		const branchContents = await readBranch(
			keys.flatMap((key) => branchIndex.get(key)?.path ?? []),
		);
		// Apply reuses a data table that exists on this instance, even when no local workflow uses it.
		const localTables =
			direction === 'apply'
				? await this.localEntities.dataTables(
						keys.flatMap((key) => {
							const resource = branchIndex.get(key);
							return resource?.type === 'dataTable' && !instanceIndex.has(key) ? [resource.id] : [];
						}),
					)
				: new Map<string, LocalDataTable>();
		// Apply also reuses a tag that exists on this instance, by ID or by name.
		const localTags =
			direction === 'apply'
				? await this.localEntities.tags(
						keys.flatMap((key) => {
							const resource = branchIndex.get(key);
							return resource?.type === 'tag' && !instanceIndex.has(key) ? [resource] : [];
						}),
					)
				: new Map<string, LocalTag>();

		return keys.flatMap((key): PromotionResourceDetail[] => {
			const fromBranch = branchIndex.get(key);
			const fromInstance = instanceIndex.get(key);
			const resource = fromInstance ?? fromBranch;
			if (!resource) return [];
			const rawBranchContent = fromBranch && branchContents.get(fromBranch.path);
			// The summary compares the workflow file as Apply writes it, so the detail shows the same.
			const branchContent =
				rawBranchContent !== undefined && direction === 'apply' && fromBranch?.type === 'workflow'
					? this.applyPreviewService.workflowFileForApply(rawBranchContent)
					: rawBranchContent;
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
	}
}

/** Parses the branch manifest and keeps this project's part. `null` when the file is missing or invalid. */
function parseBranchManifest(raw: string | undefined, projectId: string): PackageManifest | null {
	const manifest = parsePackageManifest(raw);
	return manifest && scopeManifestToProject(manifest, projectId);
}

/** Entity directories end with `-<id>`, and the entity file sits inside that directory. */
function entityIdOfPath(path: string): string {
	const segments = path.split('/');
	return entityIdOfSegment(segments[segments.length - 2] ?? '');
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

/**
 * The plan lists what reconciliation deletes. The dependency check then keeps a workflow that
 * the package still calls, and a project that owns a credential that the package uses. The rows
 * of the kept items show no change, so the preview lists only what the Apply deletes.
 */
function withKeptItems(
	resources: PromotionPreview['resources'],
	report: PromotionPreview['dependencyReport'],
): PromotionPreview['resources'] {
	const keptWorkflowKeys = new Set(
		(report?.keptWorkflows ?? []).map(({ id }) => resourceKey('workflow', id)),
	);
	const keptProjectKeys = new Set(
		(report?.keptProjects ?? []).map(({ project }) => resourceKey('project', project.id)),
	);
	if (keptWorkflowKeys.size === 0 && keptProjectKeys.size === 0) return resources;
	const byKey = new Map(resources.map((resource) => [resource.key, resource]));
	const inKeptProject = (resource: PromotionPreview['resources'][number]) => {
		const seen = new Set<string>();
		let current: typeof resource | undefined = resource;
		while (current && !seen.has(current.key)) {
			if (keptProjectKeys.has(current.key)) return true;
			seen.add(current.key);
			current = current.parentKey === null ? undefined : byKey.get(current.parentKey);
		}
		return false;
	};
	return resources.map((resource) =>
		resource.change === 'deleted' && (keptWorkflowKeys.has(resource.key) || inKeptProject(resource))
			? { ...resource, change: 'unchanged' as const }
			: resource,
	);
}
