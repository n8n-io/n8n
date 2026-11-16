import type {
	PromotionDirection,
	PromotionPreview,
	PromotionResource,
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
import { SharedWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { jsonParse } from 'n8n-workflow';
import type { z } from 'zod';

import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { diffDataTableSchema } from '@/modules/n8n-packages/entities/data-table/data-table-compat';
import { gitBlobSha } from '@/modules/n8n-packages/io/hashing-package-writer';
import { PACKAGE_ENTITY_LAYOUT, entityIdOfSegment } from '@/modules/n8n-packages/io/manifest-entry';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import {
	packageManifestSchema,
	type PackageManifest,
} from '@/modules/n8n-packages/spec/manifest.schema';

import type { PackageFile } from './base-branch-files';
import { projectHolding } from './branch-placement';
import { toInstanceProject, type InstanceProject } from './cross-project-moves';
import { PACKAGE_SUBFOLDER } from './constants';
import { buildPreview, indexSide, scopeManifestToProject } from './promotion-preview';
import { PromotionEnvironmentResolver } from './promotion-environment.resolver';
import { PromotionReviewGateService } from './promotion-review-gate.service';
import { ApplyPreviewService } from './apply-preview.service';
import { exportInstancePackage } from './instance-package';
import {
	LocalPackageEntities,
	type LocalDataTable,
	type LocalTag,
} from './local-package-entities.service';
import { PromotionsService } from './promotions.service';
import { checkoutBranchName } from './promotions-git.utils';
import type { BranchPackage } from './promotions.types';

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
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly localEntities: LocalPackageEntities,
		private readonly environmentResolver: PromotionEnvironmentResolver,
		private readonly reviewGate: PromotionReviewGateService,
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
		if (direction === 'apply') return await this.getApplyPreview(user, projectId);
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
				resources: [],
				dependencies: [],
				blocker,
			};
		}
		const branch = await this.promotionsService.readBranchPackage(projectId, 'promote');
		const instance = await exportInstancePackage(this.packagesService, user, projectId);
		// Promote compares with the branch manifest to see renames and moves. The manifest can list
		// other projects while this project has no files on the branch yet, and the move markers
		// still need it.
		const promoteBase =
			branch.hasManifest || branch.files.length > 0 ? await this.readBranchManifest(branch) : null;
		const { resources, dependencies } = buildPreview({
			operation: { direction, planned: null },
			projectIds: [projectId],
			base: {
				manifest:
					promoteBase && branch.files.length > 0
						? scopeManifestToProject(promoteBase, projectId)
						: null,
				blobByPath: blobsByPath(branch.files),
			},
			desired: { manifest: instance.manifest, blobByPath: blobsByPath(instance.files) },
		});
		return {
			commitSha: branch.commitSha,
			source: { environmentId: branch.environmentId, branchName: branch.branchName },
			resources: promoteBase
				? await this.markCrossProjectMoves(projectId, resources, promoteBase)
				: resources,
			dependencies,
		};
	}

	/** The Apply preview, built from the import plan at the branch tip. */
	private async getApplyPreview(user: User, projectId: string): Promise<PromotionPreview> {
		this.assertCanPreview(user, 'apply');
		const branch = await this.promotionsService.readBranchPackage(projectId, 'apply');
		if (branch.commitSha === null) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}
		const [files, instance] = await Promise.all([
			this.promotionsService.readApplyPackageAtCommit(projectId, branch.commitSha),
			exportInstancePackage(this.packagesService, user, projectId),
		]);
		const preview = await this.applyPreviewService.build({ user, projectId, files, instance });
		return {
			commitSha: branch.commitSha,
			source: { environmentId: branch.environmentId, branchName: branch.branchName },
			...preview,
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
	 * Variable values are left out unless `canSeeVariableValues` is set.
	 */
	async getDetails(
		user: User,
		projectId: string,
		direction: PromotionDirection,
		{ commitSha, keys }: PromotionResourceDetailsRequestDto,
		{ canSeeVariableValues }: { canSeeVariableValues: boolean },
	): Promise<PromotionResourceDetails> {
		this.assertCanPreview(user, direction);
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
			exportInstancePackage(this.packagesService, user, projectId, {
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

		const details = keys.flatMap((key): PromotionResourceDetail[] => {
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
		return { details, missingKeys };
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
