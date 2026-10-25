import {
	parsePromotionRunDetails,
	promotionRunTypeSchema,
	type ApplyCheckResult,
	type ApplyPackageDto,
	type ApplyPackageResultDto,
	type ApplySelectionDto,
	type ContinueApplyPackageDto,
	type ContinueApplySelectionDto,
	type PromotePackageDto,
	type PromotePackageResultDto,
	type PromoteRequest,
	type PromotionBindingConflict,
	type PromotionCheckoutPublicDto,
	type PromotionDirection,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, SharedWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { cp, mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import { DirectoryPackageReader } from '@/modules/n8n-packages/io/directory/directory-package-reader';
import {
	PackageDirectoryInventoryReader,
	type PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import {
	CredentialConflictPolicy,
	DataTableMissingMode,
	DataTableSchemaConflictPolicy,
	ExportDependencyPolicy,
	ExportVersionPolicy,
	FolderConflictPolicy,
	MissingNodeTypeMode,
	OverwriteDeletionPolicy,
	PlacementPolicy,
	ProjectConflictPolicy,
	TagConflictPolicy,
	TagMissingMode,
	VariableConflictPolicy,
	VariableMissingMode,
	WorkflowConflictPolicy,
	WorkflowIdPolicy,
	WorkflowPublishingPolicy,
	type ImportRequest,
	type ImportResult,
	type ImportSelection,
} from '@/modules/n8n-packages/n8n-packages.types';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';

import { BASE_BRANCH_DIRECTORIES, parseBaseBranchFiles } from './base-branch-files';
import {
	GIT_DEFAULT_COMMIT_EMAIL,
	GIT_DEFAULT_COMMIT_NAME,
	PACKAGE_SUBFOLDER,
	PROMOTE_SELECTION_COMMIT_MESSAGE,
} from './constants';
import { PromotionBindingPreflightService } from './promotion-binding-preflight.service';
import { PromotionEnvironmentResolver } from './promotion-environment.resolver';
import { PromotionProvidersService } from './promotion-providers.service';
import { PromotionRunRepository } from './database/repositories/promotion-run.repository';
import { PromotionReviewsService } from './promotion-reviews.service';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { PromotionsGitService } from './promotions-git.service';
import {
	buildCacheDescriptor,
	buildPromotionBranchName,
	checkoutBranchName,
	repositoryUrl,
} from './promotions-git.utils';
import type {
	BranchPackage,
	PackageCommit,
	PromotionCacheDescriptor,
	PromotionGitCredentials,
	PromotionOperationInput,
} from './promotions.types';
import { WorkingCopyUpdater, type SelectivePushOptions } from './working-copy-updater';

type ProjectReconciliationResult = { deletedProjectIds: string[] };

/** Conflicts that `confirmDestructiveChanges` lets the apply continue past. */
function isConfirmableConflict(code: PromotionBindingConflict['code']): boolean {
	return code === 'destructive-change' || code === 'project-deletion';
}

// Apply treats the package as source of truth. Callers cannot override this policy,
// but a confirmed Continue uses `overwrite` for data tables.
const IMPORT_POLICY: Omit<ImportRequest, 'user'> = {
	projectConflictPolicy: ProjectConflictPolicy.Overwrite,
	workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
	workflowIdPolicy: WorkflowIdPolicy.Source,
	workflowPublishingPolicy: WorkflowPublishingPolicy.MatchSource,
	missingNodeTypeMode: MissingNodeTypeMode.Fail,
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'must-preexist',
	credentialConflictPolicy: CredentialConflictPolicy.KeepExisting,
	folderConflictPolicy: FolderConflictPolicy.Overwrite,
	overwriteDeletionPolicy: OverwriteDeletionPolicy.HardDelete,
	dataTableMatchingMode: 'by-id',
	dataTableMissingMode: DataTableMissingMode.Create,
	dataTableSchemaConflictPolicy: DataTableSchemaConflictPolicy.OverwriteNonDestructive,
	variableMissingMode: VariableMissingMode.MustPreexist,
	variableConflictPolicy: VariableConflictPolicy.KeepExisting,
	tagMissingMode: TagMissingMode.Create,
	tagConflictPolicy: TagConflictPolicy.Rename,
};

/**
 * Runs the package operations against a resolved configuration. Every entry point
 * resolves first, so the whole operation works from one snapshot.
 */
@Service()
export class PromotionsService {
	constructor(
		private readonly resolver: PromotionEnvironmentResolver,
		private readonly providersService: PromotionProvidersService,
		private readonly workingDirectory: PromotionWorkingDirectoryService,
		private readonly workingCopy: WorkingCopyUpdater,
		private readonly gitService: PromotionsGitService,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectService: ProjectService,
		private readonly folderService: FolderService,
		private readonly n8nPackagesService: N8nPackagesService,
		private readonly bindingPreflight: PromotionBindingPreflightService,
		private readonly inventoryReader: PackageDirectoryInventoryReader,
		private readonly packageImportConfig: PackageImportConfig,
		private readonly runRepository: PromotionRunRepository,
		private readonly reviewsService: PromotionReviewsService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/** Clones the environment's branch into local storage. Safe to call repeatedly. */
	async clone(environmentId: string): Promise<PromotionCheckoutPublicDto> {
		const input = await this.resolver.resolveForEnvironment(environmentId);
		const branchName = checkoutBranchName(input.config);

		await this.gitService.clone({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths: this.workingDirectory.paths(input.environmentId),
			branchName,
			environmentId: input.environmentId,
		});
		// Only a finished clone gets a descriptor, so a failed one stays unusable.
		await this.workingDirectory.writeDescriptor(this.descriptorFor(input));

		return { ...this.checkoutIdentity(input), branchName, hasCheckout: true };
	}

	/**
	 * Removes the environment's local checkout. Keeps the pinned SSH host keys, and
	 * changes no branch, package, or instance content.
	 */
	async disconnect(environmentId: string): Promise<PromotionCheckoutPublicDto> {
		const input = await this.resolver.resolveForEnvironment(environmentId);
		await this.workingDirectory.resetCheckout(input.environmentId);
		return {
			...this.checkoutIdentity(input),
			branchName: checkoutBranchName(input.config),
			hasCheckout: false,
		};
	}

	/** Exports every team project and pushes the package to the configured branch. */
	async promote(
		environmentId: string,
		actor: User,
		request: PromotePackageDto & { canExportVariableValues: boolean },
	): Promise<PromotePackageResultDto> {
		const input = await this.resolver.resolveForEnvironment(environmentId, 'promote');
		this.assertInstanceScope(input, 'Promote');
		await this.assertCheckoutReady(input, 'promoting');

		const branchName = checkoutBranchName(input.config);
		const credentials = await this.credentialsFor(input);
		const targetBranchName = await this.prepareTargetBranch(input, branchName, credentials);
		const { repositoryFolder } = this.workingDirectory.paths(input.environmentId);
		const packageFolder = path.join(repositoryFolder, PACKAGE_SUBFOLDER);
		await this.assertNoWorkflowsMovedOutOfTeamProjects(input, branchName, credentials);

		// The instance environment covers every team project, including projects with
		// their own environment. Personal projects stay out of scope.
		const projectIds = await this.projectRepository.findTeamProjectIds();

		this.logger.info('Exporting projects for a promotion', {
			environmentId,
			projectCount: projectIds.length,
		});

		await mkdir(repositoryFolder, { recursive: true });
		const stagingFolder = await mkdtemp(path.join(repositoryFolder, `.${PACKAGE_SUBFOLDER}-`));

		let pushed: { commitSha: string; counts: PromotePackageResultDto['counts'] };
		try {
			const exportResult = await this.n8nPackagesService.exportPackageToDirectory(
				{
					user: actor,
					projectIds,
					includeAgents: false,
					includeVariableValues: true,
					canExportVariableValues: request.canExportVariableValues,
					includeTags: true,
					// Archived workflows travel too, so the target archives them instead of removing them.
					includeArchivedWorkflows: true,
					// personal projects are excluded, so a team workflow calling a personal
					// sub-workflow blocks the whole promotion; intended for now, see LIGO-1089
					dependencyPolicy: ExportDependencyPolicy.Fail,
					versionPolicy: ExportVersionPolicy.Latest,
				},
				{ targetDir: stagingFolder },
			);

			// Replace the managed package only after the new one is complete.
			await rm(packageFolder, { recursive: true, force: true });
			await rename(stagingFolder, packageFolder);

			if (targetBranchName) {
				// The commit moves the local base branch. Remove trust before it moves, and
				// restore trust only after the base branch is back on its own commit.
				await this.workingDirectory.invalidateDescriptor(input.environmentId);
			}

			const { commitSha } = await this.gitService.commitAndPush({
				remoteUrl: repositoryUrl(input),
				credentials,
				paths: this.workingDirectory.paths(input.environmentId),
				branchName,
				targetBranchName,
				environmentId: input.environmentId,
				author: this.commitAuthor(actor),
				commitMessage: request.commitMessage,
				// A promotion branch must be new, so force does not apply.
				force: targetBranchName ? false : (request.force ?? false),
				stagePathspec: PACKAGE_SUBFOLDER,
				onCheckoutRestored: async () =>
					await this.workingDirectory.writeDescriptor(this.descriptorFor(input)),
			});
			pushed = { commitSha, counts: exportResult.counts };
		} finally {
			await rm(stagingFolder, { recursive: true, force: true });
		}

		return {
			environmentId: input.environmentId,
			counts: pushed.counts,
			git: { commitSha: pushed.commitSha, branchName: targetBranchName ?? branchName },
			...(await this.openReview(input, actor, {
				promotionBranchName: targetBranchName,
				commitSha: pushed.commitSha,
				title: request.commitMessage,
			})),
		};
	}

	/** Records the push, then opens a review for a promotion branch. This does not throw. */
	private async openReview(
		input: PromotionOperationInput,
		actor: User,
		push: { promotionBranchName: string | undefined; commitSha: string; title: string },
	): Promise<Pick<PromotePackageResultDto, 'review' | 'warnings'>> {
		const recorded = await this.recordPromoteRun(input, actor, {
			branchName: push.promotionBranchName ?? checkoutBranchName(input.config),
			commitSha: push.commitSha,
		});
		// A review without a run cannot be rendered: the branch and commit live on the run.
		if (!recorded.runId) {
			const opensMergeRequest = input.providerType === 'gitlab' && !!push.promotionBranchName;
			return {
				warnings: [
					{
						message: opensMergeRequest
							? 'The push succeeded, but n8n could not record the promotion run, so no merge request was opened.'
							: 'The push succeeded, but n8n could not record the promotion run.',
					},
				],
			};
		}
		if (!push.promotionBranchName) return {};
		const lines = push.title.split('\n');
		const titleIndex = lines.findIndex((line) => line.trim() !== '');
		if (titleIndex === -1) {
			return {
				warnings: [
					{
						message: 'No merge request was opened.',
					},
				],
			};
		}
		const { review, warnings } = await this.reviewsService.openMergeRequest(
			input,
			actor,
			{
				branchName: push.promotionBranchName,
				baseBranchName: checkoutBranchName(input.config),
				commitSha: push.commitSha,
				title: lines[titleIndex].trim(),
				body: lines.slice(titleIndex + 1).join('\n'),
			},
			recorded.runId,
		);
		return {
			...(review && { review }),
			...(warnings.length > 0 && { warnings }),
		};
	}

	/** Writes the run after the push. A failure becomes a warning. The push stays. */
	private async recordPromoteRun(
		input: PromotionOperationInput,
		actor: User,
		git: { branchName: string; commitSha: string },
	): Promise<{ runId?: string }> {
		try {
			const type = promotionRunTypeSchema.parse('git');
			const run = await this.runRepository.insertRun({
				environmentId: input.environmentId,
				createdById: actor.id,
				direction: input.config.direction,
				type,
				details: parsePromotionRunDetails(type, {
					schemaVersion: 1,
					branchName: git.branchName,
					commitSha: git.commitSha,
				}),
				reviewId: null,
			});
			return { runId: run.id };
		} catch (error) {
			this.logger.error('Could not record the promotion run', { error });
			return {};
		}
	}

	/**
	 * Selective promote against an already-resolved environment. Unselected workflows
	 * keep their content. A renamed project or folder moves its branch directory,
	 * so the unselected workflows inside it move with it. A promotion branch is
	 * always new, so force never applies.
	 */
	private async promoteSelectionResolved(
		input: PromotionOperationInput,
		actor: User,
		request: { commitMessage: string; canExportVariableValues: boolean },
		selection: SelectivePushOptions,
		movedOwnerNames: ReadonlyMap<string, string> = new Map(),
	): Promise<PromotePackageResultDto> {
		// NOTE: This assertion needs adjusting once we add full support for project-scoped promotions.
		this.assertInstanceScope(input, 'Promote');

		this.workingCopy.validateSelection(selection);
		await this.assertTeamProject(selection.projectId);
		await this.assertCheckoutReady(input, 'promoting');

		const branchName = checkoutBranchName(input.config);
		const credentials = await this.credentialsFor(input);
		// A branched environment resets the checkout to the latest base here, so the
		// selection applies on top of it and pushes to a fresh promotion branch.
		const targetBranchName = await this.prepareTargetBranch(input, branchName, credentials);

		const { repositoryFolder } = this.workingDirectory.paths(input.environmentId);
		const packageFolder = path.join(repositoryFolder, PACKAGE_SUBFOLDER);
		// No package yet means this selection becomes the first export.
		const packageExisted = await pathExists(packageFolder);
		if (
			!(await pathExists(path.join(packageFolder, MANIFEST_FILE))) &&
			(await this.gitService.hasCommittedPath({
				paths: this.workingDirectory.paths(input.environmentId),
				branchName,
				environmentId: input.environmentId,
				pathspec: `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`,
			}))
		) {
			// The commit holds a manifest the checkout lost. A push would drop branch content or metadata.
			throw new BadRequestError(
				'The local copy of the promote branch is incomplete. Disconnect and connect it again in the instance environment settings.',
			);
		}

		const branch = await this.workingCopy.assertSelectionFitsBranch(
			packageFolder,
			selection,
			movedOwnerNames,
		);

		const stagingFolder = await mkdtemp(path.join(repositoryFolder, `.${PACKAGE_SUBFOLDER}-`));
		const prePushBackup = `${packageFolder}.pre-selection`;
		let backedUp = false;
		let keepPrePushBackup = false;

		let pushed: { commitSha: string; counts: PromotePackageResultDto['counts'] };
		try {
			if (packageExisted) {
				await rm(prePushBackup, { recursive: true, force: true });
				await cp(packageFolder, prePushBackup, { recursive: true, verbatimSymlinks: true });
				backedUp = true;
			}

			// The exporter does the selecting: it writes the selected workflows and
			// what they need, so nothing has to be filtered out afterwards.
			const { manifest: staging, counts } = await this.n8nPackagesService.exportPackageToDirectory(
				{
					user: actor,
					projectIds: [selection.projectId],
					projectWorkflowIds: selection.workflowIds,
					includeVariableValues: true,
					canExportVariableValues: request.canExportVariableValues,
					includeTags: true,
					includeArchivedWorkflows: true,
					// A sub-workflow nobody selected stays a reference. Failing here would
					// block a promote whose sub-workflow the branch already holds.
					dependencyPolicy: ExportDependencyPolicy.ReferenceOnly,
					versionPolicy: ExportVersionPolicy.Latest,
				},
				{ targetDir: stagingFolder },
			);

			await this.workingCopy.applySelection(
				packageFolder,
				stagingFolder,
				staging,
				selection,
				branch,
			);

			if (targetBranchName) {
				// The commit moves the local base branch. Remove trust before it moves, and
				// restore trust only after the base branch is back on its own commit.
				await this.workingDirectory.invalidateDescriptor(input.environmentId);
			}

			const { commitSha } = await this.gitService.commitAndPush({
				remoteUrl: repositoryUrl(input),
				credentials,
				paths: this.workingDirectory.paths(input.environmentId),
				branchName,
				targetBranchName,
				environmentId: input.environmentId,
				author: this.commitAuthor(actor),
				commitMessage: request.commitMessage,
				// A promotion branch must be new, so force never applies.
				force: false,
				stagePathspec: PACKAGE_SUBFOLDER,
				rollbackOnFailure: true,
				onCheckoutRestored: async () =>
					await this.workingDirectory.writeDescriptor(this.descriptorFor(input)),
			});
			pushed = { commitSha, counts };
		} catch (error) {
			if (backedUp) {
				await rm(packageFolder, { recursive: true, force: true }).catch((restoreError: unknown) => {
					this.logger.warn('Failed to remove the incomplete selection after a failed promote', {
						packageFolder,
						error: restoreError,
					});
				});
				try {
					await rename(prePushBackup, packageFolder);
				} catch (restoreError: unknown) {
					keepPrePushBackup = true;
					this.logger.warn(
						'Failed to restore the package from the pre-selection copy. The copy is at the backup path.',
						{ packageFolder, backupFolder: prePushBackup, error: restoreError },
					);
				}
			} else if (!packageExisted) {
				await rm(packageFolder, { recursive: true, force: true }).catch((cleanupError: unknown) => {
					this.logger.warn('Failed to remove the first selection after a failed promote', {
						packageFolder,
						error: cleanupError,
					});
				});
			}
			throw error;
		} finally {
			// A first push has no backup of its own. Keep any backup left by an earlier failure.
			if (packageExisted && !keepPrePushBackup) {
				await rm(prePushBackup, { recursive: true, force: true }).catch((error: unknown) => {
					this.logger.warn('Failed to remove the selection backup', { prePushBackup, error });
				});
			}
			await rm(stagingFolder, { recursive: true, force: true }).catch((error: unknown) => {
				this.logger.warn('Failed to remove the selection staging folder', { stagingFolder, error });
			});
		}

		return {
			environmentId: input.environmentId,
			counts: pushed.counts,
			git: { commitSha: pushed.commitSha, branchName: targetBranchName ?? branchName },
			...(await this.openReview(input, actor, {
				promotionBranchName: targetBranchName,
				commitSha: pushed.commitSha,
				title: request.commitMessage,
			})),
		};
	}

	/**
	 * Promotes a client-chosen set of a project's workflows. The client sends ids
	 * only; the server reads each one now, so the push carries the current state.
	 * Live and archived workflows export; an id that is gone from the instance leaves
	 * the branch. A workflow that moved to another project is refused.
	 */
	async promoteProjectSelection(
		projectId: string,
		actor: User,
		request: PromoteRequest & { canExportVariableValues: boolean },
	): Promise<PromotePackageResultDto> {
		if (new Set(request.workflowIds).size !== request.workflowIds.length) {
			throw new BadRequestError('workflowIds contains duplicates');
		}

		// Resolve like the change preview does, so the promote pushes to the environment
		// the user previewed. resolveForProject validates the project and environment too.
		const input = await this.resolver.resolveForProject(projectId, 'promote');

		const { selection, movedOwnerNames } = await this.classifySelection(
			projectId,
			request.workflowIds,
		);

		return await this.promoteSelectionResolved(
			input,
			actor,
			{
				commitMessage: request.commitMessage ?? PROMOTE_SELECTION_COMMIT_MESSAGE,
				canExportVariableValues: request.canExportVariableValues,
			},
			selection,
			movedOwnerNames,
		);
	}

	/**
	 * Splits selected ids into pushes and deletions, using the current instance
	 * state. A live or archived workflow this project owns exports; an id it no
	 * longer owns leaves the branch. An id that another project owns now is also
	 * returned in `movedOwnerNames`: assertSelectionFitsBranch refuses it when the
	 * branch holds it under this project (a move), and assertDeletionsOnBranch
	 * rejects it when the branch holds it elsewhere (a foreign id).
	 */
	private async classifySelection(
		projectId: string,
		workflowIds: string[],
	): Promise<{ selection: SelectivePushOptions; movedOwnerNames: Map<string, string> }> {
		const ownerProjects =
			await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);

		const live: string[] = [];
		const deleted: string[] = [];
		const movedOwnerNames = new Map<string, string>();
		for (const id of workflowIds) {
			const owner = ownerProjects.get(id);
			if (owner?.id === projectId) {
				// Archived workflows travel like live ones, so the branch keeps them
				// archived instead of removing them, matching a full promote.
				live.push(id);
				continue;
			}
			if (owner) movedOwnerNames.set(id, owner.name);
			deleted.push(id);
		}

		return {
			selection: { projectId, workflowIds: live, deletedWorkflowIds: deleted },
			movedOwnerNames,
		};
	}

	/** Checks package bindings and imports only when no blocking issues remain. */
	async apply(
		environmentId: string,
		actor: User,
		expectedSource?: ApplyPackageDto['expectedSource'],
	): Promise<ApplyPackageResultDto> {
		return await this.applyFromSource(environmentId, actor, expectedSource);
	}

	async continueApply(
		environmentId: string,
		actor: User,
		request: ContinueApplyPackageDto,
	): Promise<ApplyPackageResultDto> {
		return await this.applyFromSource(
			environmentId,
			actor,
			request.expectedSource,
			request.confirmDestructiveChanges === true,
		);
	}

	async applyProjectSelection(
		projectId: string,
		actor: User,
		request: ApplySelectionDto,
	): Promise<ApplyPackageResultDto> {
		return await this.applySelectionFromSource(
			projectId,
			actor,
			request.workflowIds,
			request.expectedSource,
		);
	}

	async continueApplyProjectSelection(
		projectId: string,
		actor: User,
		request: ContinueApplySelectionDto,
	): Promise<ApplyPackageResultDto> {
		return await this.applySelectionFromSource(
			projectId,
			actor,
			request.workflowIds,
			request.expectedSource,
			request.confirmDestructiveChanges === true,
		);
	}

	/** `moves` comes from findCrossProjectMoves, so a moved workflow is never planned as a deletion. */
	private async classifyApplySelection(
		inventory: PackageDirectoryInventory,
		projectId: string,
		workflowIds: string[],
		moves: CrossProjectMoves,
	): Promise<{ selection: ImportSelection }> {
		const branchWorkflowIds = new Set(
			inventory.workflows
				.filter((workflow) => workflow.projectId === projectId)
				.map(({ id }) => id),
		);
		const movedWorkflowIds = new Set(moves.workflows.map(({ id }) => id));
		const ownerProjects =
			await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);

		const selectedWorkflowIds: string[] = [];
		const deletedWorkflowIds: string[] = [];
		const invalidWorkflowIds: string[] = [];
		for (const id of workflowIds) {
			if (branchWorkflowIds.has(id)) {
				selectedWorkflowIds.push(id);
			} else if (ownerProjects.get(id)?.id === projectId) {
				// The instance still owns it here. A move is reported, not deleted; otherwise the
				// package dropped it, so it is a deletion.
				if (!movedWorkflowIds.has(id)) deletedWorkflowIds.push(id);
			} else {
				invalidWorkflowIds.push(id);
			}
		}

		if (invalidWorkflowIds.length > 0) {
			throw new BadRequestError(
				`The following workflows are not in this project's branch or instance: ${invalidWorkflowIds.join(', ')}`,
			);
		}

		return {
			selection: { selectedProjectId: projectId, selectedWorkflowIds, deletedWorkflowIds },
		};
	}

	/**
	 * Workflows and folders that the package holds under one project and this instance holds under
	 * another. Apply cannot move them between projects. With `projectId`, workflows count when they
	 * move into or out of that project, and folders only when the package holds them under it: the
	 * import of that project never touches a folder that the package holds elsewhere.
	 */
	private async findCrossProjectMoves(
		inventory: PackageDirectoryInventory,
		projectId?: string,
	): Promise<CrossProjectMoves> {
		const branchProjects = new Map(inventory.projects.map(({ id, name }) => [id, { id, name }]));
		const branchProjectOf = (id: string) => {
			const project = branchProjects.get(id);
			// The reader requires a project file for every project directory.
			if (!project) throw new UnexpectedError(`Package inventory has no project "${id}"`);
			return project;
		};
		type Move = Omit<CrossProjectMove, 'projectExists'>;
		const toMove = (
			{ id, name }: { id: string; name: string },
			branchProjectId: string,
			instanceProject: { id: string; name: string } | undefined,
		): Move[] =>
			instanceProject &&
			instanceProject.id !== branchProjectId &&
			(projectId === undefined || projectId === branchProjectId || projectId === instanceProject.id)
				? [
						{
							id,
							name,
							project: branchProjectOf(branchProjectId),
							instanceProject: { id: instanceProject.id, name: instanceProject.name },
						},
					]
				: [];
		const byId = (a: Move, b: Move) => a.id.localeCompare(b.id);

		const owners = await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(
			inventory.workflows.map(({ id }) => id),
		);
		const homes = new Map(
			(
				await this.folderService.getFoldersByIds(inventory.folders.map(({ folder }) => folder.id))
			).map(({ id, homeProject }) => [id, homeProject]),
		);

		const workflows = inventory.workflows
			.flatMap((workflow) => toMove(workflow, workflow.projectId, owners.get(workflow.id)))
			.sort(byId);
		const folders = inventory.folders
			.filter((entry) => projectId === undefined || entry.projectId === projectId)
			.flatMap(({ folder, projectId: branchProjectId }) =>
				toMove(folder, branchProjectId, homes.get(folder.id)),
			)
			.sort(byId);
		if (workflows.length === 0 && folders.length === 0) return { workflows: [], folders: [] };

		// Instance-wide Apply creates missing projects, but only after this check refuses the move.
		const existing = new Set(await this.projectRepository.findTeamProjectIds());
		const withExists = (move: Move) => ({ ...move, projectExists: existing.has(move.project.id) });
		return { workflows: workflows.map(withExists), folders: folders.map(withExists) };
	}

	/**
	 * Runs the Apply preflight for every workflow that the Apply preview of the project can list.
	 * It reads the package at the preview's commit and writes nothing. Moved workflows are
	 * returned instead of rejected.
	 */
	async checkApplyBlockers(projectId: string, commitSha: string): Promise<ApplyCheckResult> {
		const input = await this.resolver.resolveForProject(projectId, 'apply');
		await this.assertCheckoutReady(input, 'checking Apply blockers');

		const branchName = checkoutBranchName(input.config);
		const files = await this.gitService.readTreeAtCommit({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths: this.workingDirectory.paths(input.environmentId),
			branchName,
			environmentId: input.environmentId,
			commitSha,
			directory: PACKAGE_SUBFOLDER,
			limits: this.packageImportConfig,
		});
		if (files.size === 0) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}
		const inventory = await this.inventoryReader.read({
			listEntries: async () => [...files.keys()],
			readFile: async (entryPath) => {
				const content = files.get(entryPath);
				if (!content) throw new BadRequestError(`Package does not contain entry: ${entryPath}`);
				return content;
			},
		});

		const branchWorkflowIds = inventory.workflows
			.filter((workflow) => workflow.projectId === projectId)
			.map(({ id }) => id);
		const ownedWorkflowIds = await this.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects([
			projectId,
		]);
		const moves = await this.findCrossProjectMoves(inventory, projectId);
		const { selection } = await this.classifyApplySelection(
			inventory,
			projectId,
			[...new Set([...branchWorkflowIds, ...ownedWorkflowIds])],
			moves,
		);
		const preflight = await this.bindingPreflight.checkInventory({
			inventory,
			selection: {
				selectedProjectId: projectId,
				selectedWorkflowIds: selection.selectedWorkflowIds,
			},
		});

		return {
			environmentId: input.environmentId,
			git: { commitSha, branchName },
			preflight,
			movedWorkflows: moves.workflows,
			movedFolders: moves.folders,
		};
	}

	private async applySelectionFromSource(
		projectId: string,
		actor: User,
		workflowIds: string[],
		expectedSource?: ApplySelectionDto['expectedSource'],
		confirmDestructiveChanges = false,
	): Promise<ApplyPackageResultDto> {
		const input = await this.resolver.resolveForProject(projectId, 'apply');
		await this.assertCheckoutReady(input, 'applying');

		const branchName = checkoutBranchName(input.config);
		const paths = this.workingDirectory.paths(input.environmentId);
		const { commitSha } = await this.gitService.refreshCheckout({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths,
			branchName,
			environmentId: input.environmentId,
		});

		const identity = {
			environmentId: input.environmentId,
			git: { commitSha, branchName },
		};
		if (
			expectedSource &&
			(expectedSource.environmentId !== input.environmentId ||
				expectedSource.branchName !== branchName ||
				expectedSource.commitSha !== commitSha)
		) {
			this.logger.info('Apply stopped because the source changed', {
				status: 'source-changed',
				...identity,
			});
			return { status: 'source-changed', ...identity };
		}

		const packageFolder = path.join(paths.repositoryFolder, PACKAGE_SUBFOLDER);
		if (!(await isDirectory(packageFolder))) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}

		const reader = new DirectoryPackageReader(packageFolder, this.packageImportConfig);
		const inventory = await this.inventoryReader.read(reader);
		const moves = await this.findCrossProjectMoves(inventory, projectId);
		const { selection } = await this.classifyApplySelection(
			inventory,
			projectId,
			workflowIds,
			moves,
		);
		// A folder the package holds under this project but this instance holds elsewhere blocks
		// every selection: the import would meet it whatever the user selected.
		const requested = new Set(workflowIds);
		const blocking = {
			workflows: moves.workflows.filter(({ id }) => requested.has(id)),
			folders: moves.folders,
		};
		if (blocking.workflows.length > 0 || blocking.folders.length > 0) {
			throw new ConflictError(describeCrossProjectMoves(blocking));
		}
		const preflight = await this.bindingPreflight.checkInventory({
			inventory,
			selection: {
				selectedProjectId: projectId,
				selectedWorkflowIds: selection.selectedWorkflowIds,
			},
		});
		const blockingConflicts = confirmDestructiveChanges
			? preflight.conflicts.filter(({ code }) => !isConfirmableConflict(code))
			: preflight.conflicts;
		if (
			preflight.missingBindings.length > 0 ||
			preflight.accessRequirements.length > 0 ||
			blockingConflicts.length > 0
		) {
			this.logger.info('Apply blocked by unresolved bindings', {
				status: 'blocked',
				...identity,
				bindingCounts: {
					missingBindings: preflight.missingBindings.length,
					accessRequirements: preflight.accessRequirements.length,
					conflicts: preflight.conflicts.length,
					warnings: preflight.warnings.length,
				},
			});
			return { status: 'blocked', ...identity, preflight };
		}

		this.logger.info('Importing a package selection', {
			...identity,
			projectId,
			selectedCount: selection.selectedWorkflowIds.length,
			deletedCount: selection.deletedWorkflowIds?.length ?? 0,
			confirmDestructiveChanges,
		});

		const result = await this.n8nPackagesService.importPackageSelectionFromDirectory(
			{
				user: actor,
				overwriteDeletionPolicy: OverwriteDeletionPolicy.HardDelete,
				dataTableSchemaConflictPolicy: confirmDestructiveChanges
					? DataTableSchemaConflictPolicy.Overwrite
					: IMPORT_POLICY.dataTableSchemaConflictPolicy,
				tagConflictPolicy: IMPORT_POLICY.tagConflictPolicy,
				placementPolicy: PlacementPolicy.FollowPackage,
			},
			{ sourceDir: packageFolder },
			selection,
		);

		return {
			status: 'applied',
			...identity,
			counts: this.toApplyCounts({
				importResult: result,
				projectReconciliation: { deletedProjectIds: [] },
			}),
			warnings: preflight.warnings,
		};
	}

	private async applyFromSource(
		environmentId: string,
		actor: User,
		expectedSource?: ApplyPackageDto['expectedSource'],
		confirmDestructiveChanges = false,
	): Promise<ApplyPackageResultDto> {
		const input = await this.resolver.resolveForEnvironment(environmentId, 'apply');
		this.assertInstanceScope(input, 'Apply');
		await this.assertCheckoutReady(input, 'applying');

		const branchName = checkoutBranchName(input.config);
		const paths = this.workingDirectory.paths(input.environmentId);

		const { commitSha } = await this.gitService.refreshCheckout({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths,
			branchName,
			environmentId: input.environmentId,
		});

		const identity = {
			environmentId: input.environmentId,
			git: { commitSha, branchName },
		};
		if (
			expectedSource &&
			(expectedSource.environmentId !== input.environmentId ||
				expectedSource.branchName !== branchName ||
				expectedSource.commitSha !== commitSha)
		) {
			this.logger.info('Apply stopped because the source changed', {
				status: 'source-changed',
				...identity,
			});
			return { status: 'source-changed', ...identity };
		}

		const packageFolder = path.join(paths.repositoryFolder, PACKAGE_SUBFOLDER);
		if (!(await isDirectory(packageFolder))) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}

		const inventory = await this.inventoryReader.read(
			new DirectoryPackageReader(packageFolder, this.packageImportConfig),
		);
		const moves = await this.findCrossProjectMoves(inventory);
		if (moves.workflows.length > 0 || moves.folders.length > 0) {
			throw new ConflictError(describeCrossProjectMoves(moves));
		}

		const preflight = await this.bindingPreflight.checkInventory({ inventory });
		const blockingConflicts = confirmDestructiveChanges
			? preflight.conflicts.filter(({ code }) => !isConfirmableConflict(code))
			: preflight.conflicts;
		if (
			preflight.missingBindings.length > 0 ||
			preflight.accessRequirements.length > 0 ||
			blockingConflicts.length > 0
		) {
			this.logger.info('Apply blocked by unresolved bindings', {
				status: 'blocked',
				...identity,
				bindingCounts: {
					missingBindings: preflight.missingBindings.length,
					accessRequirements: preflight.accessRequirements.length,
					conflicts: preflight.conflicts.length,
					warnings: preflight.warnings.length,
				},
			});
			return { status: 'blocked', ...identity, preflight };
		}

		this.logger.info('Importing a package', {
			environmentId,
			confirmDestructiveChanges,
		});

		const result = await this.n8nPackagesService.importPackageFromDirectory(
			{
				user: actor,
				...IMPORT_POLICY,
				placementPolicy: PlacementPolicy.FollowPackage,
				dataTableSchemaConflictPolicy: confirmDestructiveChanges
					? DataTableSchemaConflictPolicy.Overwrite
					: IMPORT_POLICY.dataTableSchemaConflictPolicy,
			},
			{ sourceDir: packageFolder },
		);
		const importedProjectIds = result.projects.map((project) => project.localId);
		const confirmedProjectIds = preflight.conflicts.flatMap((conflict) =>
			conflict.code === 'project-deletion' ? conflict.project.id : [],
		);
		const projectReconciliation = await this.reconcileTeamProjects(
			actor,
			importedProjectIds,
			confirmedProjectIds,
		);

		return {
			status: 'applied',
			...identity,
			counts: this.toApplyCounts({ importResult: result, projectReconciliation }),
			warnings: preflight.warnings,
		};
	}

	async readBranchPackage(
		projectId: string,
		direction: PromotionDirection,
	): Promise<BranchPackage> {
		const input = await this.resolver.resolveForProject(projectId, direction);
		await this.assertCheckoutReady(input, 'listing branch files');

		const paths = this.workingDirectory.paths(input.environmentId);
		const branchName = checkoutBranchName(input.config);
		const { commitSha, lsTreeOutput } = await this.gitService.listBranchTree({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths,
			branchName,
			environmentId: input.environmentId,
			pathspecs: BASE_BRANCH_DIRECTORIES.map((directory) => `${PACKAGE_SUBFOLDER}/${directory}/`),
		});

		return {
			environmentId: input.environmentId,
			branchName,
			commitSha,
			files: parseBaseBranchFiles(lsTreeOutput, { exportRoot: PACKAGE_SUBFOLDER, projectId }),
			readFiles: async (filePaths) => {
				if (commitSha === null) {
					throw new BadRequestError(
						'The remote branch has no exported package to import. Promote to it first.',
					);
				}
				return await this.gitService.readFilesAtCommit({
					paths,
					branchName,
					environmentId: input.environmentId,
					commitSha,
					filePaths,
				});
			},
		};
	}

	/**
	 * Reads files at a commit that an earlier change preview reported. The branch may have
	 * moved since then, so this reads the commit and not the branch tip. Paths that the commit
	 * does not hold are left out, for example the manifest before the first promotion.
	 */
	async readBranchFilesAtCommit(
		projectId: string,
		direction: PromotionDirection,
		commitSha: string,
		filePaths: readonly string[],
	): Promise<Map<string, string>> {
		const input = await this.resolver.resolveForProject(projectId, direction);
		await this.assertCheckoutReady(input, 'reading branch files');
		return await this.readExistingFiles(
			{
				paths: this.workingDirectory.paths(input.environmentId),
				branchName: checkoutBranchName(input.config),
				environmentId: input.environmentId,
				commitSha,
			},
			filePaths,
		);
	}

	/**
	 * Fetches the head and the baseline of a promotion review into the checkout of its
	 * environment, and returns the package at each. The Git service chooses the baseline.
	 */
	async readReviewCommits(
		environmentId: string,
		request: {
			headRef: string;
			headCommitSha: string;
			baseline: { targetBranchName: string } | { commitSha: string; targetBranchName?: string };
		},
	): Promise<{ baseline: PackageCommit; head: PackageCommit }> {
		const input = await this.resolver.resolveForEnvironment(environmentId, 'promote');
		await this.assertCheckoutReady(input, 'reading a review');
		const operation = {
			paths: this.workingDirectory.paths(input.environmentId),
			branchName: checkoutBranchName(input.config),
			environmentId: input.environmentId,
		};
		const { baselineCommitSha } = await this.gitService.fetchReviewCommits({
			...operation,
			...request,
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
		});
		const atCommit = (commitSha: string): PackageCommit => ({
			commitSha,
			listFiles: async () =>
				await this.gitService.listFilesAtCommit({
					...operation,
					commitSha,
					directory: PACKAGE_SUBFOLDER,
				}),
			readFiles: async (filePaths) =>
				await this.readExistingFiles({ ...operation, commitSha }, filePaths),
		});
		return { baseline: atCommit(baselineCommitSha), head: atCommit(request.headCommitSha) };
	}

	private async readExistingFiles(
		operation: Omit<Parameters<PromotionsGitService['readFilesAtCommit']>[0], 'filePaths'>,
		filePaths: readonly string[],
	): Promise<Map<string, string>> {
		const existing = await this.gitService.findPathsAtCommit({ ...operation, filePaths });
		return await this.gitService.readFilesAtCommit({
			...operation,
			filePaths: filePaths.filter((path) => existing.has(path)),
		});
	}

	/**
	 * Resolves the branch one promotion pushes to, honoring the resolved environment.
	 * When the environment creates a branch per promotion, this validates the new name
	 * and resets the checkout to the latest base, so the promotion builds on it.
	 * Otherwise the push targets the base branch and there is nothing to prepare.
	 */
	private async prepareTargetBranch(
		input: PromotionOperationInput,
		branchName: string,
		credentials: PromotionGitCredentials,
	): Promise<string | undefined> {
		if (input.config.direction !== 'promote' || !input.config.settings.createBranchOnPromotion) {
			return undefined;
		}
		const targetBranchName = buildPromotionBranchName(new Date());
		await this.gitService.validateBranchName(targetBranchName);
		await this.gitService.prepareCheckoutForPromotion({
			remoteUrl: repositoryUrl(input),
			credentials,
			paths: this.workingDirectory.paths(input.environmentId),
			branchName,
			environmentId: input.environmentId,
		});
		return targetBranchName;
	}

	/**
	 * A workflow on the branch that a personal project owns now is not exported, because personal
	 * projects stay out of scope. The promote would drop it from the branch, and Apply would then
	 * delete it on the destination. Refuse until the workflow moves back to its team project.
	 *
	 * This reads the manifest at the remote branch head, not the checkout on disk, which can be
	 * behind the remote. It does not apply the import limits, which a promote never needed.
	 */
	private async assertNoWorkflowsMovedOutOfTeamProjects(
		input: PromotionOperationInput,
		branchName: string,
		credentials: PromotionGitCredentials,
	): Promise<void> {
		const paths = this.workingDirectory.paths(input.environmentId);
		const manifestPath = `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`;
		let head: { commitSha: string | null; lsTreeOutput: string };
		try {
			head = await this.gitService.listBranchTree({
				remoteUrl: repositoryUrl(input),
				credentials,
				paths,
				branchName,
				environmentId: input.environmentId,
				pathspecs: [manifestPath],
			});
		} catch (error) {
			// A missing branch holds no workflow to drop, and a fetch that fails also fails the push,
			// so the promote can go on. It creates the branch when the branch is missing.
			this.logger.warn('Skipped the moved-workflow check because the branch could not be read', {
				error,
			});
			return;
		}
		// An empty remote, or a branch without a package: nothing on the branch can be dropped.
		if (head.commitSha === null || head.lsTreeOutput === '') return;

		const files = await this.gitService.readFilesAtCommit({
			paths,
			branchName,
			environmentId: input.environmentId,
			commitSha: head.commitSha,
			filePaths: [manifestPath],
		});
		const workflows = readBranchWorkflowPlacements(files.get(manifestPath), manifestPath);
		if (workflows.length === 0) return;

		const owners = await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(
			workflows.map(({ id }) => id),
		);
		const moved = workflows.flatMap(({ id, name, projectName }) => {
			const owner = owners.get(id);
			return owner !== undefined && owner.type !== 'team'
				? [
						`"${name}" (${id}) is in personal project "${owner.name}" here and in team project "${projectName}" on the branch`,
					]
				: [];
		});
		if (moved.length > 0) {
			throw new BadRequestError(
				`A promotion does not include personal projects, so these workflows would be deleted on the destination: ${moved.join('; ')}. Move them back to the team project the branch holds them in, then promote again.`,
			);
		}
	}

	/**
	 * Project environments can be configured and resolved, but running a package
	 * operation on one is not implemented. The current export and import cover the
	 * whole instance, so this rejects before any export, import, or Git write.
	 */
	private assertInstanceScope(input: PromotionOperationInput, operation: string) {
		if (input.scope !== 'instance') {
			throw new BadRequestError(
				`${operation} is only available on an instance environment. Project environments are not supported yet.`,
			);
		}
	}

	private async assertTeamProject(projectId: string) {
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (!project) throw new NotFoundError('Project not found');
		if (project.type !== 'team') {
			throw new BadRequestError('Only team projects can use a promotion environment');
		}
	}

	/**
	 * A checkout counts as ready only when it exists and was cloned from the
	 * environment we just resolved. Another process may have changed the remote or
	 * the branch, which cannot invalidate this machine's cache.
	 */
	private async assertCheckoutReady(input: PromotionOperationInput, gerund: string) {
		const { repositoryFolder } = this.workingDirectory.paths(input.environmentId);
		const cloned = await this.gitService.hasCheckout(repositoryFolder);
		const current =
			cloned && (await this.workingDirectory.matchesDescriptor(this.descriptorFor(input)));
		if (!current) {
			throw new BadRequestError(
				`This ${input.config.direction} environment is not connected. Connect it before ${gerund}.`,
			);
		}
	}

	private descriptorFor(input: PromotionOperationInput): PromotionCacheDescriptor {
		return buildCacheDescriptor({
			environmentId: input.environmentId,
			remote: input.remote,
			config: input.config,
		});
	}

	private checkoutIdentity(input: PromotionOperationInput) {
		return {
			environmentId: input.environmentId,
			direction: input.config.direction,
		};
	}

	/** Credentials are decrypted for one operation and never cached. */
	private async credentialsFor(input: PromotionOperationInput) {
		return await this.providersService.decryptCredentials({
			authType: input.authType,
			auth: input.encryptedAuth,
		});
	}

	/** Deletes only the projects that the user confirmed and that the import did not keep. */
	private async reconcileTeamProjects(
		actor: User,
		importedProjectIds: string[],
		confirmedProjectIds: string[],
	): Promise<ProjectReconciliationResult> {
		const imported = new Set(importedProjectIds);
		const confirmed = new Set(confirmedProjectIds);
		const teamProjectIds = await this.projectRepository.findTeamProjectIds();
		const removedProjectIds = teamProjectIds.filter(
			(projectId) => confirmed.has(projectId) && !imported.has(projectId),
		);

		for (const projectId of removedProjectIds) {
			await this.projectService.deleteProject(actor, projectId);
		}

		return { deletedProjectIds: removedProjectIds };
	}

	private commitAuthor(user: User): { name: string; email: string } {
		const name =
			[user.firstName, user.lastName].filter(Boolean).join(' ') || GIT_DEFAULT_COMMIT_NAME;
		return { name, email: user.email ?? GIT_DEFAULT_COMMIT_EMAIL };
	}

	private toApplyCounts({
		importResult,
		projectReconciliation,
	}: {
		importResult: ImportResult;
		projectReconciliation: ProjectReconciliationResult;
	}): Extract<ApplyPackageResultDto, { status: 'applied' }>['counts'] {
		const tally = <S extends string>(rows: Array<{ status: S }>, statuses: readonly S[]) => {
			const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<S, number>;
			for (const { status } of rows) counts[status] += 1;
			return counts;
		};

		return {
			projects: {
				...tally(importResult.projects, ['created', 'updated', 'skipped'] as const),
				deleted: projectReconciliation.deletedProjectIds.length,
			},
			folders: {
				...tally(importResult.folders, ['created', 'skipped', 'moved'] as const),
				removed: importResult.removedFolders.length,
			},
			workflows: {
				...tally(importResult.workflows, ['created', 'updated', 'skipped'] as const),
				moved: importResult.workflows.filter(({ moved }) => moved).length,
				archived: importResult.removedWorkflows.filter(({ deletion }) => deletion === 'archived')
					.length,
				deleted: importResult.removedWorkflows.filter(({ deletion }) => deletion === 'deleted')
					.length,
				// Publishing happens after writes, so failures are reported without failing the apply.
				publishing: tally(
					importResult.workflows.map(({ publishing }) => ({ status: publishing.state })),
					['published', 'unpublished', 'unchanged', 'blocked', 'failed'] as const,
				),
			},
			credentials: {
				matched: importResult.credentials.matched.length,
				stubbed: importResult.credentials.stubbed.length,
			},
			dataTables: {
				matched: importResult.dataTables.matched,
				created: importResult.dataTables.created,
				updated: importResult.dataTables.updated,
			},
			variables: {
				matched: importResult.variables.matched.length,
				created: importResult.variables.created.length,
				updated: importResult.variables.updated.length,
				stubbed: importResult.variables.stubbed.length,
				missing: importResult.variables.missing.length,
			},
			tags: {
				matched: importResult.tags.matched.length,
				created: importResult.tags.created.length,
				renamed: importResult.tags.renamed.length,
				reconciled: importResult.tags.reconciled.length,
				skipped: importResult.tags.skipped.length,
			},
		};
	}
}

/** Throws on any error except a missing path, so an unreadable package never looks empty. */
async function pathExists(target: string): Promise<boolean> {
	try {
		await stat(target);
		return true;
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
		throw error;
	}
}

async function isDirectory(folder: string): Promise<boolean> {
	try {
		return (await stat(folder)).isDirectory();
	} catch {
		return false;
	}
}

type CrossProjectMove = ApplyCheckResult['movedWorkflows'][number];
type CrossProjectMoves = { workflows: CrossProjectMove[]; folders: CrossProjectMove[] };

/**
 * Names each item and both of its projects, so the user knows what to move and where. An item
 * can't move here to a branch project that does not exist here yet, so then only the source fix
 * is offered.
 */
function describeCrossProjectMoves({ workflows, folders }: CrossProjectMoves): string {
	const describe =
		(type: 'workflow' | 'folder') =>
		({ id, name, project, projectExists, instanceProject }: CrossProjectMove) =>
			`${type} "${name}" (${id}) is in project "${instanceProject.name}" here and in project "${project.name}" on the branch${projectExists ? '' : `, and project "${project.name}" does not exist on this instance yet`}`;
	const moved = [...workflows.map(describe('workflow')), ...folders.map(describe('folder'))];
	const remedy = [...workflows, ...folders].every(({ projectExists }) => projectExists)
		? 'Move them on this instance to match the branch, or move them back on the source instance and promote again.'
		: 'Move them back on the source instance, then promote again.';
	return `Apply can't move workflows or folders between projects: ${moved.join('; ')}. ${remedy}`;
}

/**
 * The id, name and team project of every workflow that the branch manifest lists. It fails closed:
 * a manifest it cannot read could hide a workflow that Apply would delete.
 */
function readBranchWorkflowPlacements(
	raw: string | undefined,
	manifestPath: string,
): Array<{ id: string; name: string; projectName: string }> {
	let manifest: unknown;
	try {
		manifest = raw === undefined ? undefined : jsonParse(raw);
	} catch {
		manifest = undefined;
	}
	if (!isRecord(manifest) || !Array.isArray(manifest.workflows)) {
		throw new BadRequestError(
			`"${manifestPath}" on the branch is not readable, so promote can't check it for workflows that moved to a personal project. Fix the file on the branch, then promote again.`,
		);
	}
	const projects = readManifestRefs(manifest.projects ?? [], 'projects', manifestPath);

	return readManifestRefs(manifest.workflows, 'workflows', manifestPath).map(
		({ id, name, target }) => ({
			id,
			name,
			projectName:
				projects.find((project) => target.startsWith(`${project.target}/`))?.name ?? 'unknown',
		}),
	);
}

type ManifestRef = { id: string; name: string; target: string };

/** Refuses the whole list on one broken entry, because skipping it could hide a workflow. */
function readManifestRefs(list: unknown, key: string, manifestPath: string): ManifestRef[] {
	const entries: unknown[] = Array.isArray(list) ? list : [list];
	return entries.map((entry, index) => {
		if (isManifestRef(entry)) return entry;
		const id = isRecord(entry) && typeof entry.id === 'string' ? ` (id "${entry.id}")` : '';
		throw new BadRequestError(
			`Entry ${index + 1} of "${key}" in "${manifestPath}" on the branch is not readable${id}, so promote can't check it for workflows that moved to a personal project. Fix the file on the branch, then promote again.`,
		);
	});
}

function isManifestRef(value: unknown): value is ManifestRef {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		typeof value.target === 'string'
	);
}
