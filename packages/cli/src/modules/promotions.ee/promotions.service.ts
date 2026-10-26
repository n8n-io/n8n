import {
	parsePromotionRunDetails,
	promotionRunTypeSchema,
	type ApplyPackageDto,
	type ApplyPackageResultDto,
	type ApplySelectionDto,
	type ContinueApplyPackageDto,
	type ContinueApplySelectionDto,
	type PromotePackageDto,
	type PromotePackageResultDto,
	type PromoteRequest,
	type PromotionApplyCheck,
	type PromotionBindingConflict,
	type PromotionBindingPreflightResult,
	type PromotionCheckoutPublicDto,
	type PromotionDirection,
	type PromotionRunContents,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, SharedWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { cp, mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError, NotFoundError } from '@n8n/errors';

import {
	PackageDirectoryInventoryReader,
	type PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import { manifestEntrySchema } from '@/modules/n8n-packages/spec/manifest.schema';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
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
	ImportConflictPolicy,
	WorkflowIdPolicy,
	WorkflowPublishingPolicy,
	type ImportRequest,
	type ImportResult,
	type ImportSelection,
} from '@/modules/n8n-packages/n8n-packages.types';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';

import { BASE_BRANCH_DIRECTORIES, parseBaseBranchFiles } from './base-branch-files';
import { projectHolding } from './branch-placement';
import { crossProjectMoves, describePromotedMoves } from './cross-project-moves';
import { GIT_DEFAULT_COMMIT_EMAIL, GIT_DEFAULT_COMMIT_NAME, PACKAGE_SUBFOLDER } from './constants';
import {
	buildInstancePromotionCommitMessage,
	buildSelectionPromotionCommitMessage,
} from './promotion-commit-message';
import { applySelectionRequest, ApplyPreviewService } from './apply-preview.service';
import { GitCommitPackageReader } from './git-commit-package-reader';
import { exportInstancePackage } from './instance-package';
import { compare } from './package-references';
import { PromotionEnvironmentResolver } from './promotion-environment.resolver';
import { PromotionProvidersService } from './promotion-providers.service';
import { PromotionRunRepository } from './database/repositories/promotion-run.repository';
import { PromotionReviewsService } from './promotion-reviews.service';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { PromotionsGitService } from './promotions-git.service';
import { PromotionsWorkflowsMovedCrossProjectError } from './promotions-selective-push.error';
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
import {
	WorkingCopyUpdater,
	type ScannedBranch,
	type SelectivePushOptions,
} from './working-copy-updater';

type ProjectReconciliationResult = { deletedProjectIds: string[] };

type PushedPromotion = {
	commitSha: string;
	counts: PromotePackageResultDto['counts'];
	commitMessage: string;
};

/** Conflicts that `confirmDestructiveChanges` lets the apply continue past. */
function isConfirmableConflict(code: PromotionBindingConflict['code']): boolean {
	return code === 'destructive-change' || code === 'project-deletion';
}

// Apply treats the package as source of truth. Callers cannot override this policy,
// but a confirmed Continue uses `overwrite` for data tables.
const IMPORT_POLICY: Omit<ImportRequest, 'user'> = {
	projectConflictPolicy: ProjectConflictPolicy.Overwrite,
	conflictPolicy: ImportConflictPolicy.NewVersion,
	idPolicy: WorkflowIdPolicy.Source,
	publishingPolicy: WorkflowPublishingPolicy.MatchSource,
	missingNodeTypeMode: MissingNodeTypeMode.Fail,
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'must-preexist',
	credentialConflictPolicy: CredentialConflictPolicy.Overwrite,
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
		private readonly applyPreviewService: ApplyPreviewService,
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
		const target = await this.prepareTargetBranch(input, branchName, credentials);
		const targetBranchName = target?.targetBranchName;
		const { repositoryFolder } = this.workingDirectory.paths(input.environmentId);
		const packageFolder = path.join(repositoryFolder, PACKAGE_SUBFOLDER);
		await this.assertNoProjectMovesSinceBranch(
			input,
			branchName,
			credentials,
			target?.baseCommitSha,
		);

		// The instance environment covers every team project, including projects with
		// their own environment. Personal projects stay out of scope.
		const projectIds = await this.projectRepository.findTeamProjectIds();

		this.logger.info('Exporting projects for a promotion', {
			environmentId,
			projectCount: projectIds.length,
		});

		await mkdir(repositoryFolder, { recursive: true });
		const stagingFolder = await mkdtemp(path.join(repositoryFolder, `.${PACKAGE_SUBFOLDER}-`));

		let pushed: PushedPromotion;
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

			const commitMessage =
				request.commitMessage ??
				buildInstancePromotionCommitMessage({
					projectCount: projectIds.length,
					workflowCount: exportResult.counts.workflows,
				});
			const { commitSha } = await this.gitService.commitAndPush({
				remoteUrl: repositoryUrl(input),
				credentials,
				paths: this.workingDirectory.paths(input.environmentId),
				branchName,
				targetBranchName,
				environmentId: input.environmentId,
				author: this.commitAuthor(actor),
				commitMessage,
				// A promotion branch must be new, so force does not apply.
				force: targetBranchName ? false : (request.force ?? false),
				stagePathspec: PACKAGE_SUBFOLDER,
				onCheckoutRestored: async () =>
					await this.workingDirectory.writeDescriptor(this.descriptorFor(input)),
			});
			pushed = { commitSha, counts: exportResult.counts, commitMessage };
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
				commitMessage: pushed.commitMessage,
				promotionRunContents: { projectIds },
			})),
		};
	}

	/** Records the push, then opens a review for a promotion branch. This does not throw. */
	private async openReview(
		input: PromotionOperationInput,
		actor: User,
		push: {
			promotionBranchName: string | undefined;
			commitSha: string;
			commitMessage: string;
			promotionRunContents: PromotionRunContents;
		},
	): Promise<Pick<PromotePackageResultDto, 'review' | 'warnings'>> {
		const recorded = await this.recordPromoteRun(input, actor, {
			branchName: push.promotionBranchName ?? checkoutBranchName(input.config),
			commitSha: push.commitSha,
			// Only a promotion branch has a review, and the review gate reads the project list.
			...(push.promotionBranchName && { promotionRunContents: push.promotionRunContents }),
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
		// The first line becomes the merge request title, the rest its description.
		const lines = push.commitMessage.split('\n');
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
		git: { branchName: string; commitSha: string; promotionRunContents?: PromotionRunContents },
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
					...(git.promotionRunContents && { contents: git.promotionRunContents }),
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
		request: { commitMessage?: string; canExportVariableValues: boolean },
		selection: SelectivePushOptions,
		movedTo: ReadonlyMap<string, string>,
	): Promise<PromotePackageResultDto> {
		// NOTE: This assertion needs adjusting once we add full support for project-scoped promotions.
		this.assertInstanceScope(input, 'Promote');

		this.workingCopy.validateSelection(selection);
		const project = await this.assertTeamProject(selection.projectId);
		await this.assertCheckoutReady(input, 'promoting');

		const branchName = checkoutBranchName(input.config);
		const credentials = await this.credentialsFor(input);
		// A branched environment resets the checkout to the latest base here, so the
		// selection applies on top of it and pushes to a fresh promotion branch.
		const targetBranchName = (await this.prepareTargetBranch(input, branchName, credentials))
			?.targetBranchName;

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
		// After the branch checks, so an id the branch holds elsewhere gets its own error first. The
		// destination can't tell a move from a removal and would delete the workflow.
		if (movedTo.size > 0) {
			throw new PromotionsWorkflowsMovedCrossProjectError(
				[...movedTo].map(([id, place]) => ({ id, detail: `now in ${place} here` })),
			);
		}

		const stagingFolder = await mkdtemp(path.join(repositoryFolder, `.${PACKAGE_SUBFOLDER}-`));
		const prePushBackup = `${packageFolder}.pre-selection`;
		let backedUp = false;
		let keepPrePushBackup = false;

		let pushed: PushedPromotion;
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

			const commitMessage =
				request.commitMessage ??
				this.defaultSelectionCommitMessage(project.name, selection, staging, branch);
			const { commitSha } = await this.gitService.commitAndPush({
				remoteUrl: repositoryUrl(input),
				credentials,
				paths: this.workingDirectory.paths(input.environmentId),
				branchName,
				targetBranchName,
				environmentId: input.environmentId,
				author: this.commitAuthor(actor),
				commitMessage,
				// A promotion branch must be new, so force never applies.
				force: false,
				stagePathspec: PACKAGE_SUBFOLDER,
				rollbackOnFailure: true,
				onCheckoutRestored: async () =>
					await this.workingDirectory.writeDescriptor(this.descriptorFor(input)),
			});
			pushed = { commitSha, counts, commitMessage };
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
				commitMessage: pushed.commitMessage,
				promotionRunContents: { projectIds: [selection.projectId] },
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

		const { selection, movedTo } = await this.classifySelection(projectId, request.workflowIds);

		return await this.promoteSelectionResolved(
			input,
			actor,
			{
				commitMessage: request.commitMessage,
				canExportVariableValues: request.canExportVariableValues,
			},
			selection,
			movedTo,
		);
	}

	/**
	 * Splits selected ids into pushes and deletions, using the current instance
	 * state. A live or archived workflow this project owns exports; an id it no
	 * longer owns leaves the branch. An id that another project owns now is also
	 * returned in `movedTo`, which says where it is now, because promote refuses it
	 * as a move.
	 */
	private async classifySelection(
		projectId: string,
		workflowIds: string[],
	): Promise<{ selection: SelectivePushOptions; movedTo: Map<string, string> }> {
		const ownerProjects =
			await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);

		const live: string[] = [];
		const deleted: string[] = [];
		const movedTo = new Map<string, string>();
		for (const id of workflowIds) {
			const owner = ownerProjects.get(id);
			if (owner?.id === projectId) {
				// Archived workflows travel like live ones, so the branch keeps them
				// archived instead of removing them, matching a full promote.
				live.push(id);
				continue;
			}
			// A personal project's name holds its owner's email, and error messages reach the UI and
			// telemetry, so it stays out.
			if (owner) {
				movedTo.set(id, owner.type === 'team' ? `project "${owner.name}"` : 'a personal project');
			}
			deleted.push(id);
		}

		return {
			selection: { projectId, workflowIds: live, deletedWorkflowIds: deleted },
			movedTo,
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
		return await this.applySelectionFromSource(projectId, actor, request.workflowIds, {
			expectedSource: request.expectedSource,
			expectedPreviewRevision: request.expectedPreviewRevision,
		});
	}

	async continueApplyProjectSelection(
		projectId: string,
		actor: User,
		request: ContinueApplySelectionDto,
	): Promise<ApplyPackageResultDto> {
		return await this.applySelectionFromSource(projectId, actor, request.workflowIds, {
			expectedSource: request.expectedSource,
			expectedPreviewRevision: request.expectedPreviewRevision,
			confirmDestructiveChanges: request.confirmDestructiveChanges === true,
		});
	}

	/** `movedWorkflowIds` comes from findCrossProjectMoves, so a moved workflow is never planned as a deletion. */
	private async classifyApplySelection(
		inventory: PackageDirectoryInventory,
		projectId: string,
		workflowIds: string[],
		movedWorkflowIds: ReadonlySet<string>,
	): Promise<ImportSelection> {
		const branchWorkflowIds = new Set(
			inventory.workflows
				.filter((workflow) => workflow.projectId === projectId)
				.map(({ id }) => id),
		);
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

		return { selectedProjectId: projectId, selectedWorkflowIds, deletedWorkflowIds };
	}

	/**
	 * Reads the package files at a commit of the Apply branch, keyed by their path in the package.
	 * Empty when the commit holds no package.
	 */
	async readApplyPackageAtCommit(
		projectId: string,
		commitSha: string,
	): Promise<Map<string, Buffer>> {
		const input = await this.resolver.resolveForProject(projectId, 'apply');
		await this.assertCheckoutReady(input, 'reading the Apply branch');
		return await this.gitService.readTreeAtCommit({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths: this.workingDirectory.paths(input.environmentId),
			branchName: checkoutBranchName(input.config),
			environmentId: input.environmentId,
			commitSha,
			directory: PACKAGE_SUBFOLDER,
			limits: this.packageImportConfig,
		});
	}

	private async applySelectionFromSource(
		projectId: string,
		actor: User,
		workflowIds: string[],
		{
			expectedSource,
			expectedPreviewRevision,
			confirmDestructiveChanges = false,
		}: {
			expectedSource?: ApplySelectionDto['expectedSource'];
			expectedPreviewRevision?: string;
			confirmDestructiveChanges?: boolean;
		},
	): Promise<ApplyPackageResultDto> {
		const input = await this.resolver.resolveForProject(projectId, 'apply');
		await this.assertCheckoutReady(input, 'applying');

		const tip = await this.readApplyTip(input, expectedSource);
		if (tip.status === 'source-changed') return tip;
		const { identity, files } = tip;

		if (expectedPreviewRevision !== undefined) {
			const preview = await this.applyPreviewService.build({
				user: actor,
				projectId,
				files,
				instance: await exportInstancePackage(this.n8nPackagesService, actor, projectId),
			});
			if (preview.revision !== expectedPreviewRevision) {
				this.logger.info('Apply stopped because the preview changed', {
					status: 'preview-changed',
					...identity,
				});
				return { status: 'preview-changed', ...identity };
			}
		}

		const reader = new GitCommitPackageReader(files);
		const inventory = await this.inventoryReader.read(reader);
		const moves = await this.applyPreviewService.findCrossProjectMoves(inventory, projectId);
		const selection = await this.classifyApplySelection(
			inventory,
			projectId,
			workflowIds,
			new Set(moves.workflows.map(({ id }) => id)),
		);
		const plan = await this.n8nPackagesService.planPackageSelection(
			applySelectionRequest(actor, confirmDestructiveChanges),
			reader,
			selection,
			'enforce',
		);
		// A folder the package holds under this project but this instance holds elsewhere blocks
		// every selection: the import would meet it whatever the user selected.
		const requested = new Set(workflowIds);
		const check = this.applyPreviewService.check(plan, inventory, selection, {
			...moves,
			workflows: moves.workflows.filter(({ id }) => requested.has(id)),
		});
		const preflight = {
			...check.preflight,
			conflicts: [...check.preflight.conflicts, ...moveConflicts(check)],
		};
		if (this.isBlocked(preflight, confirmDestructiveChanges, identity)) {
			return { status: 'blocked', ...identity, preflight };
		}

		this.logger.info('Importing a package selection', {
			...identity,
			projectId,
			selectedCount: selection.selectedWorkflowIds.length,
			deletedCount: selection.deletedWorkflowIds?.length ?? 0,
			confirmDestructiveChanges,
		});
		const result = await this.n8nPackagesService.applyPackagePlan(plan);

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

		const tip = await this.readApplyTip(input, expectedSource);
		if (tip.status === 'source-changed') return tip;
		const { identity, files } = tip;

		const reader = new GitCommitPackageReader(files);
		const inventory = await this.inventoryReader.read(reader);
		const moves = await this.applyPreviewService.findCrossProjectMoves(inventory);
		const plan = await this.n8nPackagesService.planPackage(
			// Both Apply flows share the policies of a selection.
			{ ...IMPORT_POLICY, ...applySelectionRequest(actor, confirmDestructiveChanges) },
			reader,
			'enforce',
		);
		const check = this.applyPreviewService.check(plan, inventory, undefined, moves);
		const preflight = {
			...check.preflight,
			conflicts: [
				...check.preflight.conflicts,
				...moveConflicts(check),
				...(await this.projectDeletions(inventory)),
			],
		};
		if (this.isBlocked(preflight, confirmDestructiveChanges, identity)) {
			return { status: 'blocked', ...identity, preflight };
		}

		this.logger.info('Importing a package', {
			environmentId,
			confirmDestructiveChanges,
		});
		const result = await this.n8nPackagesService.applyPackagePlan(plan);
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

	/**
	 * Fetches the Apply branch and reads the package at its tip. The working copy stays as it is,
	 * so Apply imports the commit that it compared, not the files on disk.
	 */
	private async readApplyTip(
		input: PromotionOperationInput,
		expectedSource: ApplyPackageDto['expectedSource'],
	): Promise<
		| Extract<ApplyPackageResultDto, { status: 'source-changed' }>
		| {
				status: 'current';
				identity: { environmentId: string; git: { commitSha: string; branchName: string } };
				files: Map<string, Buffer>;
		  }
	> {
		const branchName = checkoutBranchName(input.config);
		const operation = {
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths: this.workingDirectory.paths(input.environmentId),
			branchName,
			environmentId: input.environmentId,
		};
		const { commitSha } = await this.gitService.listBranchTree({
			...operation,
			pathspecs: [`${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`],
		});
		if (commitSha === null) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}

		const identity = { environmentId: input.environmentId, git: { commitSha, branchName } };
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

		const files = await this.gitService.readTreeAtCommit({
			...operation,
			commitSha,
			directory: PACKAGE_SUBFOLDER,
			limits: this.packageImportConfig,
		});
		if (files.size === 0) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}
		return { status: 'current', identity, files };
	}

	private isBlocked(
		preflight: PromotionBindingPreflightResult,
		confirmDestructiveChanges: boolean,
		identity: { environmentId: string; git: { commitSha: string; branchName: string } },
	): boolean {
		const blockingConflicts = confirmDestructiveChanges
			? preflight.conflicts.filter(({ code }) => !isConfirmableConflict(code))
			: preflight.conflicts;
		const blocked =
			preflight.missingBindings.length > 0 ||
			preflight.accessRequirements.length > 0 ||
			blockingConflicts.length > 0;
		if (blocked) {
			this.logger.info('Apply blocked', {
				status: 'blocked',
				...identity,
				bindingCounts: {
					missingBindings: preflight.missingBindings.length,
					accessRequirements: preflight.accessRequirements.length,
					conflicts: preflight.conflicts.length,
					warnings: preflight.warnings.length,
				},
			});
		}
		return blocked;
	}

	/** A full Apply deletes the team projects that the package does not hold. */
	private async projectDeletions(
		inventory: PackageDirectoryInventory,
	): Promise<PromotionBindingConflict[]> {
		const packageProjectIds = new Set(inventory.projects.map(({ id }) => id));
		const deletedIds = (await this.projectRepository.findTeamProjectIds()).filter(
			(id) => !packageProjectIds.has(id),
		);
		if (deletedIds.length === 0) return [];

		const projects = await this.projectRepository.findTeamProjectInfoByIds(deletedIds);
		return projects
			.sort((a, b) => compare(a.name, b.name) || compare(a.id, b.id))
			.map(({ id, name }) => ({
				kind: 'project',
				code: 'project-deletion',
				project: { id, name },
			}));
	}

	async readBranchPackage(
		projectId: string,
		direction: PromotionDirection,
	): Promise<BranchPackage> {
		const input = await this.resolver.resolveForProject(projectId, direction);
		await this.assertCheckoutReady(input, 'listing branch files');

		const paths = this.workingDirectory.paths(input.environmentId);
		const branchName = checkoutBranchName(input.config);
		const manifestPath = `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`;
		const { commitSha, lsTreeOutput } = await this.gitService.listBranchTree({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths,
			branchName,
			environmentId: input.environmentId,
			pathspecs: [
				...BASE_BRANCH_DIRECTORIES.map((directory) => `${PACKAGE_SUBFOLDER}/${directory}/`),
				manifestPath,
			],
		});

		return {
			environmentId: input.environmentId,
			branchName,
			commitSha,
			// The parser skips the manifest, which sits at the package root.
			files: parseBaseBranchFiles(lsTreeOutput, { exportRoot: PACKAGE_SUBFOLDER, projectId }),
			hasManifest: lsTreeOutput.split('\0').some((record) => record.endsWith(`\t${manifestPath}`)),
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
	 * `baseCommitSha` is the base commit the checkout was reset to.
	 */
	private async prepareTargetBranch(
		input: PromotionOperationInput,
		branchName: string,
		credentials: PromotionGitCredentials,
	): Promise<{ targetBranchName: string; baseCommitSha: string } | undefined> {
		if (input.config.direction !== 'promote' || !input.config.settings.createBranchOnPromotion) {
			return undefined;
		}
		const targetBranchName = buildPromotionBranchName(new Date());
		await this.gitService.validateBranchName(targetBranchName);
		const { commitSha } = await this.gitService.prepareCheckoutForPromotion({
			remoteUrl: repositoryUrl(input),
			credentials,
			paths: this.workingDirectory.paths(input.environmentId),
			branchName,
			environmentId: input.environmentId,
		});
		return { targetBranchName, baseCommitSha: commitSha };
	}

	/**
	 * Refuses a promote that would write a move between projects to the branch.
	 * - A workflow that a personal project owns now is not exported, because personal projects stay
	 *   out of scope. The promote would drop it from the branch, and Apply would then delete it on
	 *   the destination.
	 * - A workflow or folder that another team project holds now would reach the branch, but Apply
	 *   refuses moves between projects, so the destination would be stuck until it moves back. Only
	 *   an item whose branch project still exists here is refused, because only it can move back.
	 */
	private async assertNoProjectMovesSinceBranch(
		input: PromotionOperationInput,
		branchName: string,
		credentials: PromotionGitCredentials,
		baseCommitSha?: string,
	): Promise<void> {
		const manifest = await this.readRemoteManifest(input, branchName, credentials, baseCommitSha);
		if (manifest === null) return;
		const branch = readBranchPlacements(manifest, BRANCH_MANIFEST_PATH);
		if (branch.workflows.length === 0 && branch.folders.length === 0) return;

		const [owners, folders, existingProjects] = await Promise.all([
			this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(
				branch.workflows.map(({ id }) => id),
			),
			this.folderService.getFoldersByIds(branch.folders.map(({ folder }) => folder.id)),
			this.projectRepository.findTypesByIds(branch.projects.map(({ id }) => id)),
		]);
		const droppedWorkflows = branch.workflows.filter(({ id }) => {
			const owner = owners.get(id);
			return owner !== undefined && owner.type !== 'team';
		});
		if (droppedWorkflows.length > 0) {
			throw new BadRequestError(describeWorkflowsMovedToPersonalProjects(droppedWorkflows));
		}

		const moves = crossProjectMoves({
			inventory: branch,
			owners,
			folderHomes: new Map(folders.map(({ id, homeProject }) => [id, homeProject])),
			existingProjectIds: new Set(existingProjects.map(({ id }) => id)),
		});
		// An item whose branch project was deleted here can't move back, for example after a project
		// delete that transferred its workflows. It reaches the branch, and the destination can then
		// move it to match before Apply.
		const refused = {
			...moves,
			workflows: moves.workflows.filter(({ projectExists }) => projectExists),
			folders: moves.folders.filter(({ projectExists }) => projectExists),
		};
		if (refused.workflows.length > 0 || refused.folders.length > 0) {
			throw new BadRequestError(describePromotedMoves(refused));
		}
	}

	/**
	 * The branch manifest at the remote head, not the checkout on disk, which can be behind the
	 * remote. It does not apply the import limits, which a promote never needed. `null` when the
	 * branch holds nothing to check: the remote doesn't hold the branch (the push creates it), the
	 * remote is empty, or the branch has no package. Any other read failure throws, so a transient
	 * error never skips the check. With `knownHead`, a commit just fetched from the remote (branch
	 * mode), it reads that commit and skips a second fetch.
	 */
	private async readRemoteManifest(
		input: PromotionOperationInput,
		branchName: string,
		credentials: PromotionGitCredentials,
		knownHead?: string,
	): Promise<string | null> {
		const paths = this.workingDirectory.paths(input.environmentId);
		const local = { paths, branchName, environmentId: input.environmentId };
		const commitSha =
			knownHead ??
			(await this.fetchManifestHead({ ...local, remoteUrl: repositoryUrl(input), credentials }));
		if (commitSha === null) return null;

		const present = await this.gitService.findPathsAtCommit({
			...local,
			commitSha,
			filePaths: [BRANCH_MANIFEST_PATH],
		});
		if (!present.has(BRANCH_MANIFEST_PATH)) return null;

		const files = await this.gitService.readFilesAtCommit({
			...local,
			commitSha,
			filePaths: [BRANCH_MANIFEST_PATH],
		});
		return files.get(BRANCH_MANIFEST_PATH) ?? '';
	}

	/** Fetches the branch and returns its head, or `null` when there is no branch or commit yet. */
	private async fetchManifestHead(
		operation: Parameters<PromotionsGitService['hasRemoteBranch']>[0],
	): Promise<string | null> {
		try {
			const head = await this.gitService.listBranchTree({
				...operation,
				pathspecs: [BRANCH_MANIFEST_PATH],
			});
			return head.commitSha;
		} catch (error) {
			if (await this.gitService.hasRemoteBranch(operation)) throw error;
			return null;
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
		return project;
	}

	/** A selected workflow the branch already holds counts as updated, otherwise as added. */
	private defaultSelectionCommitMessage(
		projectName: string,
		selection: SelectivePushOptions,
		staging: PackageManifest,
		branch: ScannedBranch,
	): string {
		const onBranch = new Map((branch.state.workflows ?? []).map((w) => [w.id, w.name]));
		const exported = new Map((staging.workflows ?? []).map((w) => [w.id, w.name]));
		const pushed = selection.workflowIds.map((id) => ({ id, name: exported.get(id) ?? id }));

		return buildSelectionPromotionCommitMessage({
			projectName,
			added: pushed.filter(({ id }) => !onBranch.has(id)),
			updated: pushed.filter(({ id }) => onBranch.has(id)),
			removed: selection.deletedWorkflowIds.map((id) => ({ id, name: onBranch.get(id) ?? id })),
		});
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
				...tally(importResult.folders, ['created', 'updated', 'skipped'] as const),
				moved: importResult.folders.filter(({ moved }) => moved).length,
				renamed: importResult.folders.filter(({ renamed }) => renamed).length,
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
				updated: importResult.credentials.updated.length,
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

const BRANCH_MANIFEST_PATH = `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`;

/** Leaves out the personal project's name: it holds the owner's email, and error text reaches the UI and telemetry. */
function describeWorkflowsMovedToPersonalProjects(moved: BranchPlacements['workflows']): string {
	const items = moved.map(
		({ id, name, projectName }) =>
			`"${name}" (${id}) is in a personal project here and in team project "${projectName}" on the branch`,
	);
	return `A promotion does not include personal projects, so these workflows would be deleted on the destination: ${items.join('; ')}. Move them back to the team project the branch holds them in, then promote again.`;
}

/** The parts of `manifest.json` that promote checks. The export leaves out an empty list. */
const branchPlacementsSchema = z.object({
	projects: z.array(manifestEntrySchema).optional(),
	workflows: z.array(manifestEntrySchema).optional(),
	folders: z.array(manifestEntrySchema).optional(),
});

type BranchPlacements = {
	projects: Array<{ id: string; name: string }>;
	workflows: Array<{ id: string; name: string; projectId: string; projectName: string }>;
	folders: Array<{ projectId: string; folder: { id: string; name: string } }>;
};

/**
 * The team project of every workflow and folder that the branch manifest lists. It fails closed
 * and names the broken entry: skipping it could hide a workflow that Apply would delete.
 */
function readBranchPlacements(raw: string | undefined, manifestPath: string): BranchPlacements {
	let json: unknown;
	try {
		json = raw === undefined ? undefined : jsonParse(raw);
	} catch {
		json = undefined;
	}
	const parsed = branchPlacementsSchema.safeParse(json);
	if (!parsed.success) {
		const [key, index] = parsed.error.issues[0]?.path ?? [];
		const list = typeof key === 'string' && isRecord(json) ? json[key] : undefined;
		const entry: unknown =
			Array.isArray(list) && typeof index === 'number' ? list[index] : undefined;
		const id = isRecord(entry) && typeof entry.id === 'string' ? ` (id "${entry.id}")` : '';
		const part =
			typeof key === 'string' && typeof index === 'number'
				? `Entry ${index + 1} of "${key}" in "${manifestPath}"`
				: `"${manifestPath}"`;
		throw new BadRequestError(
			`${part} on the branch is not readable${id}, so promote can't check it for workflows and folders that moved between projects. Fix the file on the branch, then promote again.`,
		);
	}

	const { projects = [], workflows = [], folders = [] } = parsed.data;
	// An entry outside every project directory has no project to compare, so it is left out.
	return {
		projects: projects.map(({ id, name }) => ({ id, name })),
		workflows: workflows.flatMap(({ id, name, target }) => {
			const project = projectHolding(projects, target);
			return project ? [{ id, name, projectId: project.id, projectName: project.name }] : [];
		}),
		folders: folders.flatMap(({ id, name, target }) => {
			const project = projectHolding(projects, target);
			return project ? [{ projectId: project.id, folder: { id, name } }] : [];
		}),
	};
}

/** Apply cannot move a workflow or folder between projects, so each move blocks. */
function moveConflicts({
	movedWorkflows,
	movedFolders,
}: PromotionApplyCheck): PromotionBindingConflict[] {
	return [
		...movedWorkflows.map((move) => ({
			kind: 'workflow' as const,
			code: 'moved' as const,
			...move,
		})),
		...movedFolders.map((move) => ({ kind: 'folder' as const, code: 'moved' as const, ...move })),
	];
}
