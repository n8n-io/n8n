import type {
	PromotionEnvironmentChanges,
	PromotionEnvironmentChangesProject,
	PromotionPreview,
	PromotionProjectBlocker,
	PromotionResource,
} from '@n8n/api-types';
import { SharedWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@n8n/errors';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { projectHolding } from './branch-placement';
import { PACKAGE_SUBFOLDER } from './constants';
import { toInstanceProject, type InstanceProject } from './cross-project-moves';
import { exportInstancePackage } from './instance-package';
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
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly reviewGate: PromotionReviewGateService,
		private readonly dependencyGate: PromotionDependencyGate,
	) {}

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
	}: {
		user: User;
		input: PromotionOperationInput;
		projects: PromotionEnvironmentChangesProject[];
		exportableProjectIds: ReadonlySet<string>;
		readBranch: (projectIds: readonly string[]) => Promise<BranchPackage>;
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
			});
			dependencies = compared.dependencies;
			const marked = promoteBase
				? await this.markMovesAcrossProjects(compared.resources, promoteBase, projects)
				: compared.resources;
			const operable = new Set(projects.filter(({ canOperate }) => canOperate).map(({ id }) => id));
			resources = marked.map((resource) => ({
				...resource,
				selectable:
					resource.selectable &&
					resource.projectId !== undefined &&
					operable.has(resource.projectId),
			}));
		}

		// Seam for the dependency check: the report of the Promote preview is computed here.
		const dependencyReport = await this.dependencyGate.promoteReport({ user, input, projects });
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

	/**
	 * Marks a workflow that moved between a listed project and a project outside the view, like
	 * {@link markCrossProjectMoves}. The other project is named only when the user can read it.
	 */
	private async markMovesAcrossProjects(
		resources: PromotionResource[],
		branchManifest: PackageManifest,
		projects: readonly PromotionEnvironmentChangesProject[],
	): Promise<PromotionResource[]> {
		const visible = new Set(projects.map(({ id }) => id));
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

		return resources.map((resource) => {
			if (resource.type !== 'workflow') return resource;
			if (resource.change === 'deleted') {
				const owner = owners.get(resource.id);
				if (!owner || owner.id === resource.projectId) return resource;
				const { id, name } = toInstanceProject(owner);
				return { ...resource, movedToProject: visible.has(id) ? { id, name } : { id } };
			}
			if (resource.change !== 'added') return resource;
			const target = branchTargets.get(resource.id);
			const branchProject =
				target === undefined ? undefined : projectHolding(branchManifest.projects, target);
			return branchProject &&
				branchProject.id !== resource.projectId &&
				visible.has(branchProject.id)
				? { ...resource, movedFromProject: { id: branchProject.id, name: branchProject.name } }
				: resource;
		});
	}

	/** `readBranch` is a callback, so a project with an open review skips the git and export work. */
	async build({
		user,
		projectId,
		input,
		readBranch,
	}: {
		user: User;
		projectId: string;
		input: PromotionOperationInput;
		readBranch: () => Promise<BranchPackage>;
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
		});
		const resources = promoteBase
			? await this.markCrossProjectMoves(projectId, compared, promoteBase)
			: compared;
		const source = { environmentId: branch.environmentId, branchName: branch.branchName };
		return {
			commitSha: branch.commitSha,
			source,
			resources,
			dependencies,
			revision: previewRevision({ source, resources }),
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
