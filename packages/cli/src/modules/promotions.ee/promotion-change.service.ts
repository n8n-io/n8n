import type {
	PromotionDirection,
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
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import type { z } from 'zod';

import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { diffDataTableSchema } from '@/modules/n8n-packages/entities/data-table/data-table-compat';
import { gitBlobSha } from '@/modules/n8n-packages/io/hashing-package-writer';
import { PACKAGE_ENTITY_LAYOUT, entityIdOfSegment } from '@/modules/n8n-packages/io/manifest-entry';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { userHasScopes } from '@/permissions.ee/check-access';

import { PACKAGE_SUBFOLDER } from './constants';
import {
	blobsByPath,
	indexSide,
	indexProjects,
	resourceKey,
	type SideIndex,
	parseBranchJson,
	parsePackageManifest,
	previewEnvironment,
	previewSource,
	scopeManifestToProject,
} from './promotion-preview';
import { PromotionEnvironmentResolver } from './promotion-environment.resolver';
import { ApplyPreviewService } from './apply-preview.service';
import { PromotePreviewService } from './promote-preview.service';
import { exportInstancePackage, type InstancePackage } from './instance-package';
import { PromotionCredentialSelectionService } from './promotion-credential-selection.service';
import {
	LocalPackageEntities,
	type LocalDataTable,
	type LocalTag,
} from './local-package-entities.service';
import { PromotionsService } from './promotions.service';

const PROMOTION_SCOPES = {
	promote: 'promotions:promote',
	apply: 'promotions:apply',
} as const satisfies Record<PromotionDirection, Scope>;

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
		private readonly credentialSelection: PromotionCredentialSelectionService,
	) {}

	/**
	 * Every resource that the operation changes. Each resource has its place in the project and
	 * folder tree, and the workflows that use it.
	 */
	async getPreview(
		user: User,
		projectId: string,
		direction: PromotionDirection,
	): Promise<PromotionPreview> {
		await this.assertCanPreview(user, projectId, direction);
		if (direction === 'apply') return await this.getApplyPreview(user, projectId);
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
		const preview = await this.applyPreviewService.build({ user, projectId, files, instance });
		return {
			commitSha: branch.commitSha,
			source: previewSource(branch.input),
			environment: previewEnvironment(branch.input),
			...preview,
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
		const { commitSha, source, environment, files } =
			await this.promotionsService.readInstanceApplyPackage(environmentId);
		const preview = await this.applyPreviewService.buildInstance({ user, files });
		return { commitSha, source, environment, ...preview };
	}

	/**
	 * The file content of each requested resource on both sides, for the change cards.
	 * The branch side is read at the commit of the summary. The instance side is read now,
	 * so its blob SHA tells the caller whether the resource changed after the summary.
	 * Variable values are left out unless the user's role can list variables. The scopes of an
	 * API key do not matter, as for every promotion read.
	 */
	async getDetails(
		user: User,
		projectId: string,
		direction: PromotionDirection,
		{ commitSha, keys }: PromotionResourceDetailsRequestDto,
	): Promise<PromotionResourceDetails> {
		await this.assertCanPreview(user, projectId, direction);
		const canSeeVariableValues = hasGlobalScope(user, 'variable:list');
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
		// Promote lists the project's own credentials that the user can select. Details show no other.
		const selectableCredentialIds =
			direction === 'promote'
				? await this.credentialSelection.findSelectableIds(user, projectId)
				: [];
		const [branchFiles, instance] = await Promise.all([
			readBranch([manifestPath]),
			exportInstancePackage(this.packagesService, user, [projectId], {
				// Keep the content of the requested resources only. Variables match by name, not by ID.
				keepContent: (path) =>
					requestedIds.has(entityIdOfPath(path)) ||
					path.includes(`/${PACKAGE_ENTITY_LAYOUT.variables.directory}/`),
				// Promote lists the project's own credentials, so their details need them in the export.
				// Only the requested credentials need an export, because the content of the others is dropped.
				credentialIds: selectableCredentialIds.filter((id) => requestedIds.has(id)),
			}),
		]);
		const branchManifest = parseBranchManifest(branchFiles.get(manifestPath), projectId);
		const ownedCredentials = direction === 'promote';
		const visibleCredentialIds = new Set(selectableCredentialIds);
		const branchIndex = indexSide(
			{ manifest: branchManifest, blobByPath: new Map(), ownedCredentials, visibleCredentialIds },
			projectId,
		);
		const instanceIndex = indexSide(
			{
				manifest: instance.manifest,
				blobByPath: blobsByPath(instance.files),
				ownedCredentials,
				visibleCredentialIds,
			},
			projectId,
		);
		const hiddenKeys = await this.unreadableCredentialKeys(user, keys, branchIndex);
		// A resource can disappear after the summary, for example when a local workflow is deleted.
		const missingKeys = keys.filter(
			(key) => hiddenKeys.has(key) || (!branchIndex.has(key) && !instanceIndex.has(key)),
		);

		const details = await this.assembleDetails({
			keys: keys.filter((key) => !hiddenKeys.has(key)),
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
	): Promise<PromotionResourceDetails> {
		const canSeeVariableValues = hasGlobalScope(user, 'variable:list');
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

	/**
	 * The branch can hold a credential that the user cannot read on this instance, for example
	 * after its owner stopped sharing it with the project. Its content stays hidden, as in the export.
	 */
	private async unreadableCredentialKeys(
		user: User,
		keys: readonly string[],
		branchIndex: SideIndex,
	): Promise<Set<string>> {
		const hidden = new Set<string>();
		for (const key of keys) {
			const resource = branchIndex.get(key);
			if (resource?.type !== 'credential') continue;
			const canRead = await userHasScopes(user, ['credential:read'], false, {
				credentialId: resource.id,
			}).catch((error: unknown) => {
				// A credential that is gone from this instance has nobody who can read it.
				if (error instanceof NotFoundError) return false;
				throw error;
			});
			if (!canRead) hidden.add(key);
		}
		return hidden;
	}

	/** One route serves both directions, so the per-direction scope is checked here, not on the decorator. */
	private async assertCanPreview(user: User, projectId: string, direction: PromotionDirection) {
		const scope = PROMOTION_SCOPES[direction];
		// Promote reads the role in the project. Apply from a project role ships with LIGO-1476.
		const instanceRoleOnly = direction === 'apply';
		if (!(await userHasScopes(user, [scope], instanceRoleOnly, { projectId }))) {
			throw new ForbiddenError(
				`Change preview requires the ${scope} scope. Ask an administrator for access.`,
			);
		}
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
