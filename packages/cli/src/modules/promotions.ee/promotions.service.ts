import type {
	ApplyPackageResultDto,
	PromotePackageDto,
	PromotePackageResultDto,
	PromotionCheckoutPublicDto,
	PromotionDirection,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { UnexpectedError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
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
} from '@/modules/n8n-packages/n8n-packages.types';
import { ProjectService } from '@/services/project.service.ee';

import {
	BASE_BRANCH_DIRECTORIES,
	parseBaseBranchFiles,
	type BaseBranchFile,
} from './base-branch-files';
import { GIT_DEFAULT_COMMIT_EMAIL, GIT_DEFAULT_COMMIT_NAME, PACKAGE_SUBFOLDER } from './constants';
import { PromotionConfigResolver } from './promotion-config.resolver';
import { PromotionProvidersService } from './promotion-providers.service';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { PromotionsGitService } from './promotions-git.service';
import {
	buildPromotionBranchName,
	checkoutBranchName,
	repositoryUrl,
} from './promotions-git.utils';
import type { PromotionCacheDescriptor, PromotionOperationInput } from './promotions.types';

type ProjectReconciliationResult = { deletedProjectIds: string[] };

// Apply treats the package as source of truth; callers cannot override this policy.
const IMPORT_POLICY: Omit<ImportRequest, 'user'> = {
	projectConflictPolicy: ProjectConflictPolicy.Overwrite,
	workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
	workflowIdPolicy: WorkflowIdPolicy.Source,
	workflowPublishingPolicy: WorkflowPublishingPolicy.MatchSource,
	missingNodeTypeMode: MissingNodeTypeMode.Fail,
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'create-stub',
	folderConflictPolicy: FolderConflictPolicy.Overwrite,
	overwriteDeletionPolicy: OverwriteDeletionPolicy.HardDelete,
	dataTableMatchingMode: 'by-id',
	dataTableMissingMode: DataTableMissingMode.Create,
	dataTableSchemaConflictPolicy: DataTableSchemaConflictPolicy.Fail,
	variableMissingMode: VariableMissingMode.CreateWithValue,
	variableConflictPolicy: VariableConflictPolicy.Overwrite,
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
		private readonly gitService: PromotionsGitService,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly n8nPackagesService: N8nPackagesService,
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
		const targetBranchName = input.config.settings.createBranchOnPromotion
			? buildPromotionBranchName(new Date())
			: undefined;
		const credentials = await this.credentialsFor(input);
		if (targetBranchName) {
			await this.gitService.validateBranchName(targetBranchName);
			await this.gitService.prepareCheckoutForPromotion({
				remoteUrl: repositoryUrl(input),
				credentials,
				paths: this.workingDirectory.paths(input.configId),
				branchName,
				configId: input.configId,
			});
		}
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

	/** Imports the package from the configured branch and replaces instance content. */
	async apply(connectionId: string, actor: User): Promise<ApplyPackageResultDto> {
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

		const packageFolder = path.join(paths.repositoryFolder, PACKAGE_SUBFOLDER);
		if (!(await isDirectory(packageFolder))) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}

		this.logger.info('Importing a package', { connectionId, configId: input.configId });

		const result = await this.n8nPackagesService.importPackageFromDirectory(
			{ user: actor, ...IMPORT_POLICY },
			{ sourceDir: packageFolder },
		);
		const importedProjectIds = result.projects.map((project) => project.localId);
		const projectReconciliation = await this.reconcileTeamProjects(actor, importedProjectIds);

		return {
			connectionId: input.connectionId,
			configId: input.configId,
			counts: this.toApplyCounts({ importResult: result, projectReconciliation }),
			git: { commitSha, branchName },
		};
	}

	async listBaseBranchFiles(projectId: string): Promise<BaseBranchFile[]> {
		const input = await this.resolver.resolveForProject(projectId, 'promote');
		await this.assertCheckoutReady(input, 'listing branch files');

		const lsTreeOutput = await this.gitService.listBranchTree({
			remoteUrl: repositoryUrl(input),
			credentials: await this.credentialsFor(input),
			paths: this.workingDirectory.paths(input.configId),
			branchName: checkoutBranchName(input.config),
			configId: input.configId,
			pathspecs: BASE_BRANCH_DIRECTORIES.map((directory) => `${PACKAGE_SUBFOLDER}/${directory}/`),
		});

		return parseBaseBranchFiles(lsTreeOutput, { exportRoot: PACKAGE_SUBFOLDER, projectId });
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
		return {
			schemaVersion: 1,
			configId: input.configId,
			connectionId: input.connectionId,
			remoteUrl: repositoryUrl(input),
			checkoutBranchName: checkoutBranchName(input.config),
		};
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
	}): ApplyPackageResultDto['counts'] {
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
