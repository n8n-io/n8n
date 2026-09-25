import type {
	ApplyPackageDto,
	ApplyPackageResultDto,
	ApplySelectionDto,
	ContinueApplyPackageDto,
	ContinueApplySelectionDto,
	PromotePackageDto,
	PromotePackageResultDto,
	PromoteRequest,
	PromotionCheckoutPublicDto,
	PromotionDirection,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, SharedWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { cp, mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { UnexpectedError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { DirectoryPackageReader } from '@/modules/n8n-packages/io/directory/directory-package-reader';
import { PackageDirectoryInventoryReader } from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import {
	DataTableMissingMode,
	DataTableSchemaConflictPolicy,
	FolderConflictPolicy,
	MissingNodeTypeMode,
	MissingWorkflowDependencyPolicy,
	OverwriteDeletionPolicy,
	ProjectConflictPolicy,
	TagConflictPolicy,
	TagMissingMode,
	VariableConflictPolicy,
	VariableMissingMode,
	WorkflowConflictPolicy,
	WorkflowIdPolicy,
	WorkflowPublishingPolicy,
	WorkflowVersionPolicy,
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
import { PromotionConfigResolver } from './promotion-config.resolver';
import { PromotionProvidersService } from './promotion-providers.service';
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

// Apply treats the package as source of truth; callers cannot override this policy.
const IMPORT_POLICY: Omit<ImportRequest, 'user'> = {
	projectConflictPolicy: ProjectConflictPolicy.Overwrite,
	workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
	workflowIdPolicy: WorkflowIdPolicy.Source,
	workflowPublishingPolicy: WorkflowPublishingPolicy.MatchSource,
	missingNodeTypeMode: MissingNodeTypeMode.Fail,
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'must-preexist',
	folderConflictPolicy: FolderConflictPolicy.Overwrite,
	overwriteDeletionPolicy: OverwriteDeletionPolicy.HardDelete,
	dataTableMatchingMode: 'by-id',
	dataTableMissingMode: DataTableMissingMode.Create,
	dataTableSchemaConflictPolicy: DataTableSchemaConflictPolicy.Fail,
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
		private readonly resolver: PromotionConfigResolver,
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
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/** Clones one direction into local storage. Safe to call repeatedly. */
	async clone(
		connectionId: string,
		direction: PromotionDirection,
	): Promise<PromotionCheckoutPublicDto> {
		const input = await this.resolver.resolveForConnection(connectionId, direction);
		const branchName = checkoutBranchName(input.config);

		await this.gitService.clone({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths: this.workingDirectory.paths(input.configId),
			branchName,
			configId: input.configId,
		});
		// Only a finished clone gets a descriptor, so a failed one stays unusable.
		await this.workingDirectory.writeDescriptor(this.descriptorFor(input));

		return { ...this.checkoutIdentity(input), branchName, hasCheckout: true };
	}

	/**
	 * Removes this direction's local checkout. Keeps the pinned SSH host keys, and
	 * changes no branch, package, or instance content.
	 */
	async disconnect(
		connectionId: string,
		direction: PromotionDirection,
	): Promise<PromotionCheckoutPublicDto> {
		const input = await this.resolver.resolveForConnection(connectionId, direction);
		await this.workingDirectory.resetCheckout(input.configId);
		return {
			...this.checkoutIdentity(input),
			branchName: checkoutBranchName(input.config),
			hasCheckout: false,
		};
	}

	/** Exports every team project and pushes the package to the configured branch. */
	async promote(
		connectionId: string,
		actor: User,
		request: PromotePackageDto & { canExportVariableValues: boolean },
	): Promise<PromotePackageResultDto> {
		const input = await this.resolver.resolveForConnection(connectionId, 'promote');
		if (input.config.direction !== 'promote') {
			throw new UnexpectedError('Resolved an invalid promotion direction');
		}
		this.assertInstanceScope(input, 'Promote');
		await this.assertCheckoutReady(input, 'promoting');

		const branchName = checkoutBranchName(input.config);
		const credentials = await this.credentialsFor(input);
		const targetBranchName = await this.prepareTargetBranch(input, branchName, credentials);
		const { repositoryFolder } = this.workingDirectory.paths(input.configId);
		const packageFolder = path.join(repositoryFolder, PACKAGE_SUBFOLDER);

		// The instance connection covers every team project, including projects with
		// their own connection. Personal projects stay out of scope.
		const projectIds = await this.projectRepository.findTeamProjectIds();

		this.logger.info('Exporting projects for a promotion', {
			connectionId,
			configId: input.configId,
			projectCount: projectIds.length,
		});

		await mkdir(repositoryFolder, { recursive: true });
		const stagingFolder = await mkdtemp(path.join(repositoryFolder, `.${PACKAGE_SUBFOLDER}-`));

		try {
			const exportResult = await this.n8nPackagesService.exportPackageToDirectory(
				{
					user: actor,
					projectIds,
					includeVariableValues: true,
					canExportVariableValues: request.canExportVariableValues,
					includeTags: true,
					// Archived workflows travel too, so the target archives them instead of removing them.
					includeArchivedWorkflows: true,
					// personal projects are excluded, so a team workflow calling a personal
					// sub-workflow blocks the whole promotion; intended for now, see LIGO-1089
					missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.Fail,
					workflowVersionPolicy: WorkflowVersionPolicy.Latest,
				},
				{ targetDir: stagingFolder },
			);

			// Replace the managed package only after the new one is complete.
			await rm(packageFolder, { recursive: true, force: true });
			await rename(stagingFolder, packageFolder);

			if (targetBranchName) {
				// The commit moves the local base branch. Remove trust before it moves, and
				// restore trust only after the base branch is back on its own commit.
				await this.workingDirectory.invalidateDescriptor(input.configId);
			}

			const { commitSha } = await this.gitService.commitAndPush({
				remoteUrl: repositoryUrl(input),
				credentials,
				paths: this.workingDirectory.paths(input.configId),
				branchName,
				targetBranchName,
				configId: input.configId,
				author: this.commitAuthor(actor),
				commitMessage: request.commitMessage,
				// A promotion branch must be new, so force does not apply.
				force: targetBranchName ? false : (request.force ?? false),
				stagePathspec: PACKAGE_SUBFOLDER,
				onCheckoutRestored: async () =>
					await this.workingDirectory.writeDescriptor(this.descriptorFor(input)),
			});

			return {
				connectionId: input.connectionId,
				configId: input.configId,
				counts: exportResult.counts,
				git: { commitSha, branchName: targetBranchName ?? branchName },
			};
		} finally {
			await rm(stagingFolder, { recursive: true, force: true });
		}
	}

	/**
	 * Selective promote against an already-resolved connection. Unselected workflows
	 * stay as-is, and so do the projects and folders the branch already holds: a
	 * selection creates a container, never renames one, so nothing moves that the
	 * user did not select. A promotion branch is always new, so force never applies.
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
		// A branched config resets the checkout to the latest base here, so the
		// selection applies on top of it and pushes to a fresh promotion branch.
		const targetBranchName = await this.prepareTargetBranch(input, branchName, credentials);

		const { repositoryFolder } = this.workingDirectory.paths(input.configId);
		const packageFolder = path.join(repositoryFolder, PACKAGE_SUBFOLDER);
		if (!(await this.hasExportedPackage(packageFolder))) {
			throw new BadRequestError(
				'The local checkout has no exported package. Promote the instance first, then promote a selection.',
			);
		}

		const branch = await this.workingCopy.assertSelectionFitsBranch(packageFolder, selection);

		const stagingFolder = await mkdtemp(path.join(repositoryFolder, `.${PACKAGE_SUBFOLDER}-`));
		const prePushBackup = `${packageFolder}.pre-selection`;
		let backedUp = false;
		let keepPrePushBackup = false;

		try {
			await rm(prePushBackup, { recursive: true, force: true });
			await cp(packageFolder, prePushBackup, { recursive: true, verbatimSymlinks: true });
			backedUp = true;

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
					missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.ReferenceOnly,
					workflowVersionPolicy: WorkflowVersionPolicy.Latest,
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
				await this.workingDirectory.invalidateDescriptor(input.configId);
			}

			const { commitSha } = await this.gitService.commitAndPush({
				remoteUrl: repositoryUrl(input),
				credentials,
				paths: this.workingDirectory.paths(input.configId),
				branchName,
				targetBranchName,
				configId: input.configId,
				author: this.commitAuthor(actor),
				commitMessage: request.commitMessage,
				// A promotion branch must be new, so force never applies.
				force: false,
				stagePathspec: PACKAGE_SUBFOLDER,
				rollbackOnFailure: true,
				onCheckoutRestored: async () =>
					await this.workingDirectory.writeDescriptor(this.descriptorFor(input)),
			});

			return {
				connectionId: input.connectionId,
				configId: input.configId,
				counts,
				git: { commitSha, branchName: targetBranchName ?? branchName },
			};
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
			}
			throw error;
		} finally {
			if (!keepPrePushBackup) {
				await rm(prePushBackup, { recursive: true, force: true }).catch((error: unknown) => {
					this.logger.warn('Failed to remove the selection backup', { prePushBackup, error });
				});
			}
			await rm(stagingFolder, { recursive: true, force: true }).catch((error: unknown) => {
				this.logger.warn('Failed to remove the selection staging folder', { stagingFolder, error });
			});
		}
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

		// Resolve like the change preview does, so the promote pushes to the connection
		// the user previewed. resolveForProject validates the project and connection too.
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
		connectionId: string,
		actor: User,
		expectedSource?: ApplyPackageDto['expectedSource'],
	): Promise<ApplyPackageResultDto> {
		return await this.applyFromSource(connectionId, actor, expectedSource);
	}

	async continueApply(
		connectionId: string,
		actor: User,
		request: ContinueApplyPackageDto,
	): Promise<ApplyPackageResultDto> {
		return await this.applyFromSource(connectionId, actor, request.expectedSource);
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
		);
	}

	private async classifyApplySelection(
		packageFolder: string,
		projectId: string,
		workflowIds: string[],
	): Promise<ImportSelection> {
		if (new Set(workflowIds).size !== workflowIds.length) {
			throw new BadRequestError('workflowIds contains duplicates');
		}

		const reader = new DirectoryPackageReader(packageFolder, this.packageImportConfig);
		const inventory = await this.inventoryReader.read(reader);
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
				deletedWorkflowIds.push(id);
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

	private async applySelectionFromSource(
		projectId: string,
		actor: User,
		workflowIds: string[],
		expectedSource?: ApplySelectionDto['expectedSource'],
	): Promise<ApplyPackageResultDto> {
		const input = await this.resolver.resolveForProject(projectId, 'apply');
		await this.assertCheckoutReady(input, 'applying');

		const branchName = checkoutBranchName(input.config);
		const paths = this.workingDirectory.paths(input.configId);
		const { commitSha } = await this.gitService.refreshCheckout({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths,
			branchName,
			configId: input.configId,
		});

		const identity = {
			connectionId: input.connectionId,
			configId: input.configId,
			git: { commitSha, branchName },
		};
		if (
			expectedSource &&
			(expectedSource.configId !== input.configId ||
				expectedSource.branchName !== branchName ||
				expectedSource.commitSha !== commitSha)
		) {
			return { status: 'source-changed', ...identity };
		}

		const packageFolder = path.join(paths.repositoryFolder, PACKAGE_SUBFOLDER);
		if (!(await isDirectory(packageFolder))) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}

		const selection = await this.classifyApplySelection(packageFolder, projectId, workflowIds);
		const preflight = await this.bindingPreflight.checkDirectory({
			sourceDir: packageFolder,
			selection: {
				selectedProjectId: projectId,
				selectedWorkflowIds: selection.selectedWorkflowIds,
			},
		});
		if (
			preflight.missingBindings.length > 0 ||
			preflight.accessRequirements.length > 0 ||
			preflight.conflicts.length > 0
		) {
			return { status: 'blocked', ...identity, preflight };
		}

		const result = await this.n8nPackagesService.importPackageSelectionFromDirectory(
			{ user: actor },
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
		connectionId: string,
		actor: User,
		expectedSource?: ApplyPackageDto['expectedSource'],
	): Promise<ApplyPackageResultDto> {
		const input = await this.resolver.resolveForConnection(connectionId, 'apply');
		this.assertInstanceScope(input, 'Apply');
		await this.assertCheckoutReady(input, 'applying');

		const branchName = checkoutBranchName(input.config);
		const paths = this.workingDirectory.paths(input.configId);

		const { commitSha } = await this.gitService.refreshCheckout({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths,
			branchName,
			configId: input.configId,
		});

		const identity = {
			connectionId: input.connectionId,
			configId: input.configId,
			git: { commitSha, branchName },
		};
		if (
			expectedSource &&
			(expectedSource.configId !== input.configId ||
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
		if (
			preflight.missingBindings.length > 0 ||
			preflight.accessRequirements.length > 0 ||
			preflight.conflicts.length > 0
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

		this.logger.info('Importing a package', { connectionId, configId: input.configId });

		const result = await this.n8nPackagesService.importPackageFromDirectory(
			{ user: actor, ...IMPORT_POLICY },
			{ sourceDir: packageFolder },
		);
		const importedProjectIds = result.projects.map((project) => project.localId);
		const projectReconciliation = await this.reconcileTeamProjects(actor, importedProjectIds);

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

		const paths = this.workingDirectory.paths(input.configId);
		const branchName = checkoutBranchName(input.config);
		const { commitSha, lsTreeOutput } = await this.gitService.listBranchTree({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths,
			branchName,
			configId: input.configId,
			pathspecs: BASE_BRANCH_DIRECTORIES.map((directory) => `${PACKAGE_SUBFOLDER}/${directory}/`),
		});

		return {
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
					configId: input.configId,
					commitSha,
					filePaths,
				});
			},
		};
	}

	/**
	 * Resolves the branch one promotion pushes to, honoring the resolved config.
	 * When the config creates a branch per promotion, this validates the new name
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
			paths: this.workingDirectory.paths(input.configId),
			branchName,
			configId: input.configId,
		});
		return targetBranchName;
	}

	/**
	 * Project connections can be configured and resolved, but running a package
	 * operation on one is not implemented. The current export and import cover the
	 * whole instance, so this rejects before any export, import, or Git write.
	 */
	private assertInstanceScope(input: PromotionOperationInput, operation: string) {
		if (input.connectionScope !== 'instance') {
			throw new BadRequestError(
				`${operation} is only available on the instance connection. Project connections are not supported yet.`,
			);
		}
	}

	private async assertTeamProject(projectId: string) {
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (!project) throw new NotFoundError('Project not found');
		if (project.type !== 'team') {
			throw new BadRequestError('Only team projects can use a promotion connection');
		}
	}

	private async hasExportedPackage(packageFolder: string): Promise<boolean> {
		try {
			return (await stat(path.join(packageFolder, MANIFEST_FILE))).isFile();
		} catch {
			return false;
		}
	}

	/**
	 * A checkout counts as ready only when it exists and was cloned from the
	 * configuration we just resolved. Another process may have changed the remote or
	 * the branch, which cannot invalidate this machine's cache.
	 */
	private async assertCheckoutReady(input: PromotionOperationInput, gerund: string) {
		const { repositoryFolder } = this.workingDirectory.paths(input.configId);
		const cloned = await this.gitService.hasCheckout(repositoryFolder);
		const current =
			cloned && (await this.workingDirectory.matchesDescriptor(this.descriptorFor(input)));
		if (!current) {
			throw new BadRequestError(
				`This ${input.config.direction} configuration is not cloned. Clone it before ${gerund}.`,
			);
		}
	}

	private descriptorFor(input: PromotionOperationInput): PromotionCacheDescriptor {
		return buildCacheDescriptor({
			connectionId: input.connectionId,
			configId: input.configId,
			target: input.target,
			config: input.config,
		});
	}

	private checkoutIdentity(input: PromotionOperationInput) {
		return {
			connectionId: input.connectionId,
			configId: input.configId,
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

	private async reconcileTeamProjects(
		actor: User,
		importedProjectIds: string[],
	): Promise<ProjectReconciliationResult> {
		const imported = new Set(importedProjectIds);
		const teamProjectIds = await this.projectRepository.findTeamProjectIds();
		const removedProjectIds = teamProjectIds.filter((projectId) => !imported.has(projectId));

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

async function isDirectory(folder: string): Promise<boolean> {
	try {
		return (await stat(folder)).isDirectory();
	} catch {
		return false;
	}
}
