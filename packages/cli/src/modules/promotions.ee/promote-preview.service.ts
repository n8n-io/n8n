import type {
	PromotionEnvironmentChanges,
	PromotionEnvironmentChangesProject,
	PromotionPreview,
	PromotionProjectBlocker,
	PromotionResource,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@n8n/errors';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { PACKAGE_SUBFOLDER } from './constants';
import { exportInstancePackage } from './instance-package';
import { PromotionAccessService } from './promotion-access.service';
import { PromotionMovesService } from './promotion-moves.service';
import {
	blobsByPath,
	buildPreview,
	parsePackageManifest,
	previewRevision,
	scopeManifestToProject,
} from './promotion-preview';
import { PromotionReviewGateService } from './promotion-review-gate.service';
import { PromotionDependencyGate } from './promotion-dependency-gate.service';
import { checkoutBranchName } from './promotions-git.utils';
import type { BranchPackage, PromotionOperationInput } from './promotions.types';

/**
 * The Promote preview. The preview page and Promote both build it here, so Promote can stop when
 * the project or its branch changed after the user reviewed the page.
 */
@Service()
export class PromotePreviewService {
	constructor(
		private readonly packagesService: N8nPackagesService,
		private readonly movesService: PromotionMovesService,
		private readonly reviewGate: PromotionReviewGateService,
		private readonly dependencyGate: PromotionDependencyGate,
		private readonly access: PromotionAccessService,
	) {}

	/** The projects of the branch that the user can read: only their dependency files are shown. */
	private async readableBranchProjects(
		user: User,
		branch: PackageManifest | null,
	): Promise<Set<string>> {
		return await this.access.readableProjectIds(
			user,
			(branch?.projects ?? []).map(({ id }) => id),
		);
	}

	/**
	 * The Promote preview of an environment: the changes of every listed project, in one view.
	 * - `projects` are the projects that the user can read. Nothing of another project is shown.
	 * - `exportableProjectIds` are those that the user can export. Only they have resources.
	 * - A project with an open review has a blocker and no resources.
	 * - A resource is selectable only in a project that the user can promote.
	 */
	async buildForEnvironment({
		user,
		input,
		projects,
		exportableProjectIds,
		readBranch,
		skipDependencyReport = false,
	}: {
		user: User;
		input: PromotionOperationInput;
		projects: PromotionEnvironmentChangesProject[];
		exportableProjectIds: ReadonlySet<string>;
		readBranch: (projectIds: readonly string[]) => Promise<BranchPackage>;
		/** The Promote operation only compares the revision, and it checks the dependencies itself. */
		skipDependencyReport?: boolean;
	}): Promise<PromotionEnvironmentChanges> {
		const blockers = await this.findBlockers(
			input,
			projects.map(({ id }) => id),
		);
		const blocked = new Set(blockers.map(({ projectId }) => projectId));
		const comparedIds = projects
			.map(({ id }) => id)
			.filter((id) => exportableProjectIds.has(id) && !blocked.has(id));

		const branch = await readBranch(comparedIds);
		const source = { environmentId: branch.environmentId, branchName: branch.branchName };
		let resources: PromotionResource[] = [];
		let dependencies: PromotionEnvironmentChanges['dependencies'] = [];
		if (comparedIds.length > 0) {
			const instance = await exportInstancePackage(this.packagesService, user, comparedIds);
			const promoteBase =
				branch.hasManifest || branch.files.length > 0 ? await readBranchManifest(branch) : null;
			const compared = buildPreview({
				operation: { direction: 'promote', planned: null },
				projectIds: comparedIds,
				// The index reads each listed project only, so other projects of the branch stay out.
				base: { manifest: promoteBase, blobByPath: blobsByPath(branch.files) },
				desired: { manifest: instance.manifest, blobByPath: blobsByPath(instance.files) },
				readableProjectIds: await this.readableBranchProjects(user, promoteBase),
			});
			dependencies = compared.dependencies;
			// A workflow or folder that moved between two team projects is one moved row. The row
			// names the other project only when the user can read it.
			const marked = promoteBase
				? await this.movesService.markPromoteMoves({
						user,
						resources: compared.resources,
						branch: promoteBase,
						desired: instance.manifest,
						projectIds: comparedIds,
					})
				: compared.resources;
			const operable = new Set(projects.filter(({ canOperate }) => canOperate).map(({ id }) => id));
			resources = markNeededByBranch(marked, promoteBase).map((resource) => ({
				...resource,
				selectable:
					resource.selectable &&
					resource.projectId !== undefined &&
					operable.has(resource.projectId),
			}));
		}

		// The report of the Promote of every change that the user can promote.
		const dependencyReport =
			resources.length > 0 && !skipDependencyReport
				? await this.dependencyGate.promotePreviewReport({
						user,
						input,
						resources,
						operableProjectIds: new Set(
							projects.filter(({ canOperate }) => canOperate).map(({ id }) => id),
						),
					})
				: undefined;
		return {
			direction: 'promote',
			commitSha: branch.commitSha,
			source,
			projects,
			resources,
			dependencies,
			...(blockers.length > 0 ? { blockers } : {}),
			...(dependencyReport ? { dependencyReport } : {}),
			revision: previewRevision({
				source,
				resources,
				projects,
				...(blockers.length > 0 ? { blockers } : {}),
			}),
		};
	}

	/** The open review of each project. Only a branched promote opens a review. */
	async findBlockers(
		input: PromotionOperationInput,
		projectIds: readonly string[],
	): Promise<PromotionProjectBlocker[]> {
		if (input.config.direction !== 'promote' || !input.config.settings.createBranchOnPromotion) {
			return [];
		}
		const found = await this.reviewGate.findPromoteBlockers(projectIds, input.environmentId);
		return projectIds.flatMap((projectId) => {
			const blocker = found.get(projectId);
			return blocker ? [{ ...blocker, projectId }] : [];
		});
	}

	/** `readBranch` is a callback, so a project with an open review skips the git and export work. */
	async build({
		user,
		projectId,
		input,
		readBranch,
		skipDependencyReport = false,
	}: {
		user: User;
		projectId: string;
		input: PromotionOperationInput;
		readBranch: () => Promise<BranchPackage>;
		/** The Promote operation only compares the revision, and it checks the dependencies itself. */
		skipDependencyReport?: boolean;
	}): Promise<PromotionPreview> {
		// Only a branched promote opens a review. A direct push has nothing to wait for, even
		// when an older review of the environment is still open.
		const blocker =
			input.config.direction === 'promote' && input.config.settings.createBranchOnPromotion
				? await this.reviewGate.findPromoteBlocker(projectId, input.environmentId)
				: null;
		if (blocker) {
			const source = {
				environmentId: input.environmentId,
				branchName: checkoutBranchName(input.config),
			};
			return {
				commitSha: null,
				source,
				resources: [],
				dependencies: [],
				blocker,
				revision: previewRevision({ source, resources: [], blocker }),
			};
		}
		const branch = await readBranch();
		const instance = await exportInstancePackage(this.packagesService, user, [projectId]);
		// Promote compares with the branch manifest to see renames and moves. The manifest can list
		// other projects while this project has no files on the branch yet, and the move markers
		// still need it.
		const promoteBase =
			branch.hasManifest || branch.files.length > 0 ? await readBranchManifest(branch) : null;
		const { resources: compared, dependencies } = buildPreview({
			operation: { direction: 'promote', planned: null },
			projectIds: [projectId],
			base: {
				manifest:
					promoteBase && branch.files.length > 0
						? scopeManifestToProject(promoteBase, projectId)
						: null,
				blobByPath: blobsByPath(branch.files),
			},
			desired: { manifest: instance.manifest, blobByPath: blobsByPath(instance.files) },
			readableProjectIds: await this.readableBranchProjects(user, promoteBase),
		});
		// The moved row is on the page of each of the two projects. The Promote from either page
		// writes both sides.
		const resources = markNeededByBranch(
			promoteBase
				? await this.movesService.markPromoteMoves({
						user,
						resources: compared,
						branch: promoteBase,
						desired: instance.manifest,
						projectIds: [projectId],
					})
				: compared,
			promoteBase,
		);
		const source = { environmentId: branch.environmentId, branchName: branch.branchName };
		// The caller already checked that the user can promote the project.
		const dependencyReport = skipDependencyReport
			? undefined
			: await this.dependencyGate.promotePreviewReport({
					user,
					input,
					resources,
					operableProjectIds: new Set([projectId]),
					defaultProjectId: projectId,
				});
		return {
			commitSha: branch.commitSha,
			source,
			resources,
			dependencies,
			...(dependencyReport ? { dependencyReport } : {}),
			revision: previewRevision({ source, resources }),
		};
	}
}

/**
 * Marks each credential that the branch already references and does not hold: a workflow of
 * another project waits for it. The row says nothing about that workflow or its project.
 */
function markNeededByBranch(
	resources: PromotionResource[],
	branch: PackageManifest | null,
): PromotionResource[] {
	const onBranch = new Set((branch?.credentials ?? []).map(({ id }) => id));
	const needed = new Set(
		(branch?.requirements?.credentials ?? [])
			.filter(({ id, usedBy }) => !onBranch.has(id) && usedBy.length > 0)
			.map(({ id }) => id),
	);
	if (needed.size === 0) return resources;
	return resources.map((resource) =>
		resource.type === 'credential' && resource.selectable && needed.has(resource.id)
			? { ...resource, neededByBranch: true }
			: resource,
	);
}

/** The whole branch manifest, across every project of the package. */
async function readBranchManifest(branch: BranchPackage): Promise<PackageManifest> {
	const manifestPath = `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`;
	const manifest = parsePackageManifest((await branch.readFiles([manifestPath])).get(manifestPath));
	if (!manifest) {
		throw new BadRequestError('The package manifest on the branch cannot be read');
	}
	return manifest;
}
