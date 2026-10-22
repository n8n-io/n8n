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
import { cp, mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { UnexpectedError } from 'n8n-workflow';

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

		const branch = await this.workingCopy.assertSelectionFitsBranch(packageFolder, selection);

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
	 * Live and archived workflows export; an id this project no longer owns (gone,
	 * or moved to another project) leaves the branch, matching the change list.
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

		const selection = await this.classifySelection(projectId, request.workflowIds);

		return await this.promoteSelectionResolved(
			input,
			actor,
			{
				commitMessage: request.commitMessage ?? PROMOTE_SELECTION_COMMIT_MESSAGE,
				canExportVariableValues: request.canExportVariableValues,
			},
			selection,
		);
	}

	/**
	 * Splits selected ids into pushes and deletions, using the current instance
	 * state. A live or archived workflow this project owns exports; an id it no
	 * longer owns — gone from the instance, or moved to another project — leaves
	 * the branch. This matches the change list, which shows both as deletions.
	 * assertDeletionsOnBranch rejects a deletion the branch does not hold under
	 * this project, so a foreign id never writes.
	 */
	private async classifySelection(
		projectId: string,
		workflowIds: string[],
	): Promise<SelectivePushOptions> {
		const ownerProjects =
			await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);

		const live: string[] = [];
		const deleted: string[] = [];
		for (const id of workflowIds) {
			// This project does not own the workflow: it is gone, or it moved to
			// another project. Either way the project has dropped it, so promote it
			// as a deletion.
			if (ownerProjects.get(id)?.id !== projectId) {
				deleted.push(id);
				continue;
			}
			// Archived workflows travel like live ones, so the branch keeps them
			// archived instead of removing them, matching a full promote.
			live.push(id);
		}

		return { projectId, workflowIds: live, deletedWorkflowIds: deleted };
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

	private async classifyApplySelection(
		inventory: PackageDirectoryInventory,
		projectId: string,
		workflowIds: string[],
	): Promise<{ selection: ImportSelection; movedWorkflowIds: string[] }> {
		const branchWorkflowIds = new Set(
			inventory.workflows
				.filter((workflow) => workflow.projectId === projectId)
				.map(({ id }) => id),
		);
		const packageWorkflowIds = new Set(inventory.workflows.map(({ id }) => id));
		const ownerProjects =
			await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);

		const selectedWorkflowIds: string[] = [];
		const deletedWorkflowIds: string[] = [];
		const movedWorkflowIds: string[] = [];
		const invalidWorkflowIds: string[] = [];
		for (const id of workflowIds) {
			if (branchWorkflowIds.has(id)) {
				selectedWorkflowIds.push(id);
			} else if (ownerProjects.get(id)?.id === projectId) {
				// The instance still owns it here. If the package holds it under another
				// project it is a cross-project move, which a selective apply cannot make;
				// otherwise the package dropped it, so it is a deletion.
				if (packageWorkflowIds.has(id)) {
					movedWorkflowIds.push(id);
				} else {
					deletedWorkflowIds.push(id);
				}
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
			movedWorkflowIds,
		};
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
		const { selection, movedWorkflowIds } = await this.classifyApplySelection(
			inventory,
			projectId,
			[...new Set([...branchWorkflowIds, ...ownedWorkflowIds])],
		);
		const preflight = await this.bindingPreflight.checkInventory({
			inventory,
			selection: {
				selectedProjectId: projectId,
				selectedWorkflowIds: selection.selectedWorkflowIds,
			},
		});

		const projects = new Map(inventory.projects.map(({ id, name }) => [id, { id, name }]));
		const movedWorkflows = inventory.workflows
			.filter(({ id }) => movedWorkflowIds.includes(id))
			.map(({ id, name, projectId: branchProjectId }) => {
				const project = projects.get(branchProjectId);
				// The reader requires a project file for every project directory.
				if (!project)
					throw new UnexpectedError(`Package inventory has no project "${branchProjectId}"`);
				return { id, name, project };
			})
			.sort((a, b) => a.id.localeCompare(b.id));

		return {
			environmentId: input.environmentId,
			git: { commitSha, branchName },
			preflight,
			movedWorkflows,
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
		const { selection, movedWorkflowIds } = await this.classifyApplySelection(
			inventory,
			projectId,
			workflowIds,
		);
		if (movedWorkflowIds.length > 0) {
			// Mirror the import engine, which rejects a move-shaped change with 409.
			throw new ConflictError(
				`These workflows moved to another project: ${movedWorkflowIds.join(', ')}. A selective apply cannot move them. Apply all projects instead.`,
			);
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

		const preflight = await this.bindingPreflight.checkDirectory({
			sourceDir: packageFolder,
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

		this.logger.info('Importing a package', {
			environmentId,
			confirmDestructiveChanges,
		});

		const result = await this.n8nPackagesService.importPackageFromDirectory(
			{
				user: actor,
				...IMPORT_POLICY,
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
		const operation = {
			paths: this.workingDirectory.paths(input.environmentId),
			branchName: checkoutBranchName(input.config),
			environmentId: input.environmentId,
			commitSha,
		};
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
				...tally(importResult.folders, ['created', 'skipped'] as const),
				removed: importResult.removedFolders.length,
			},
			workflows: {
				...tally(importResult.workflows, ['created', 'updated', 'skipped'] as const),
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
