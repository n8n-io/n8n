import {
	type CreateGitConnectionDto,
	GitConnectionProjectListPublicDto,
	GitConnectionProjectPublicDto,
	type GitConnectionPublicDto,
	type GitConnectionPullResultDto,
	type GitConnectionPushResultDto,
	type PushGitConnectionDto,
	type UpdateGitConnectionDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
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
import { userHasScopes } from '@/permissions.ee/check-access';
import { ProjectService } from '@/services/project.service.ee';

import { GIT_DEFAULT_COMMIT_EMAIL, GIT_DEFAULT_COMMIT_NAME } from './constants';
import { GitConnectionProject } from './database/entities/git-connection-project.entity';
import { GitConnection } from './database/entities/git-connection.entity';
import { GitConnectionProjectRepository } from './database/repositories/git-connection-project.repository';
import { GitConnectionRepository } from './database/repositories/git-connection.repository';
import { GitConnectionsGitService } from './git-connections-git.service';
import { WorkingCopyUpdater } from './working-copy-updater';
import type { SelectivePushOptions } from './working-copy-updater';

export type { SelectivePushOptions };

/**
 * Subfolder of the working copy that holds the n8n-managed export. Keeping it
 * separate from the repository root leaves `.git` and any files the user commits
 * at the root untouched, and scopes the export's cleanup to a single directory.
 */
const EXPORT_SUBFOLDER = 'n8n-export';

type ManageProjectLinkOptions = {
	user: User;
	connectionId: string;
	projectId: string;
};

type ProjectReconciliationResult = {
	deletedProjectIds: string[];
};

// Pull treats the working copy as source of truth; callers cannot override this policy.
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

@Service()
export class GitConnectionsService {
	constructor(
		private readonly repository: GitConnectionRepository,
		private readonly gitConnectionProjectRepository: GitConnectionProjectRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly gitService: GitConnectionsGitService,
		private readonly n8nPackagesService: N8nPackagesService,
		private readonly cipher: Cipher,
		private readonly instanceSettings: InstanceSettings,
		private readonly workingCopy: WorkingCopyUpdater,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('git-connections');
	}

	async create(input: CreateGitConnectionDto) {
		// First iteration: the single git connection row *is* the instance connection.
		// Checked before any key generation so a rejected call does no work.
		if ((await this.repository.count()) > 0) {
			throw new ConflictError('A Git connection already exists');
		}
		this.gitService.validateRepositoryUrl(input.repositoryUrl, input.connectionType);
		if (input.branchName) await this.gitService.validateBranchName(input.branchName);

		const connection = this.repository.create({
			name: input.name,
			repositoryUrl: input.repositoryUrl,
			branchName: input.branchName ?? null,
			connectionType: input.connectionType,
			publicKey: null,
			encryptedPrivateKey: null,
			encryptedUsername: null,
			encryptedPassword: null,
			keyGeneratorType: null,
			baseCommit: null,
		});
		await this.applyNewAuthentication(connection, input);
		return this.toPublic(await this.repository.save(connection));
	}

	async findOne(id: string) {
		return this.toPublic(await this.getEntity(id));
	}

	async list(offset: number, limit: number) {
		const result = await this.repository.getManyAndCount({ skip: offset, take: limit });
		return { ...result, data: result.data.map((connection) => this.toSummary(connection)) };
	}

	async update(id: string, input: UpdateGitConnectionDto) {
		if (Object.keys(input).length === 0)
			throw new BadRequestError('At least one field is required');
		const current = await this.getEntity(id);
		const targetType = input.connectionType ?? current.connectionType;
		const targetUrl = input.repositoryUrl ?? current.repositoryUrl;
		this.gitService.validateRepositoryUrl(targetUrl, targetType);
		if (input.branchName) await this.gitService.validateBranchName(input.branchName);

		// Any auth or target (url/branch) change invalidates the cached working
		// copy on disk — the branch is part of the target, so a branch-only change
		// must invalidate too, otherwise the clone stays on the old branch.
		const changesTarget =
			input.connectionType !== undefined ||
			input.repositoryUrl !== undefined ||
			input.branchName !== undefined ||
			input.username !== undefined ||
			input.password !== undefined ||
			input.keyGeneratorType !== undefined;

		const updated = this.repository.create({ ...current });
		if (input.name !== undefined) updated.name = input.name;
		if (input.repositoryUrl !== undefined) updated.repositoryUrl = input.repositoryUrl;
		if (input.branchName !== undefined) updated.branchName = input.branchName;

		await this.applyUpdatedAuthentication(updated, current, input);

		const saved = await this.repository.save(updated);
		if (changesTarget) await this.resetWorkingCopy(id);
		return this.toPublic(saved);
	}

	async clone(id: string, branchName?: string) {
		const connection = await this.getEntity(id);
		const effectiveBranch = branchName ?? connection.branchName;
		if (!effectiveBranch) throw new BadRequestError('A branch name is required to clone');
		const credentials = await this.decryptCredentials(connection);
		await this.gitService.clone({
			connection,
			credentials,
			branchName: effectiveBranch,
			rootFolder: this.rootFolder(id),
		});
		connection.branchName = effectiveBranch;
		return this.toPublic(await this.repository.save(connection));
	}

	async disconnect(id: string) {
		const connection = await this.getEntity(id);
		await this.resetWorkingCopy(id);
		return this.toPublic(connection);
	}

	async delete(id: string) {
		const connection = await this.getEntity(id);
		await this.purge(id);
		await this.repository.remove(connection);
	}

	async push(
		connectionId: string,
		actor: User,
		input: PushGitConnectionDto,
	): Promise<GitConnectionPushResultDto> {
		const connection = await this.getEntity(connectionId);
		// TODO(LIGO-1030): resolve timestamped branch when "branching required" is on.
		const { branchName } = connection;
		if (!branchName) throw new BadRequestError('A branch name is required to push');

		const rootFolder = this.rootFolder(connectionId);
		if (!(await this.gitService.hasWorkingCopy(rootFolder))) {
			throw new BadRequestError(
				'This Git connection repository is not cloned. Clone it before pushing.',
			);
		}

		// The instance connection covers every team project; personal projects are
		// out of scope for the first iteration.
		const projectIds = await this.projectRepository.findTeamProjectIds();
		const repositoryFolder = path.join(rootFolder, 'repository');
		const exportFolder = path.join(repositoryFolder, EXPORT_SUBFOLDER);

		this.logger.info('Exporting projects to Git connection repository', {
			connectionId,
			projectCount: projectIds.length,
		});

		await mkdir(repositoryFolder, { recursive: true });
		const stagingFolder = await mkdtemp(path.join(repositoryFolder, `.${EXPORT_SUBFOLDER}-`));

		try {
			const exportResult = await this.n8nPackagesService.exportPackageToDirectory(
				{
					user: actor,
					projectIds,
					includeVariableValues: true,
					canExportVariableValues: true,
					includeTags: true,
					// personal projects are excluded, so a team workflow calling a personal
					// sub-workflow blocks the whole push; intended for now, see LIGO-1089
					missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.Fail,
					workflowVersionPolicy: WorkflowVersionPolicy.Latest,
				},
				{ targetDir: stagingFolder },
			);

			// Replace the managed export only after the new package is complete.
			await rm(exportFolder, { recursive: true, force: true });
			await rename(stagingFolder, exportFolder);

			const credentials = await this.decryptCredentials(connection);
			const { commitSha, head } = await this.gitService.commitAndPush({
				connection,
				credentials,
				rootFolder,
				branchName,
				author: this.commitAuthor(actor),
				commitMessage: input.commitMessage,
				force: input.force ?? false,
				stagePathspec: EXPORT_SUBFOLDER,
			});

			connection.baseCommit = head;
			await this.repository.save(connection);

			return { connectionId, counts: exportResult.counts, commitSha };
		} finally {
			await rm(stagingFolder, { recursive: true, force: true });
		}
	}

	/**
	 * Push selected workflows of one project and their dependencies to the
	 * branch. Unselected workflows stay as-is, and so do the projects and
	 * folders the branch already holds: a selective push creates a container,
	 * never renames one, so nothing moves that the user did not select.
	 */
	async pushSelection(
		connectionId: string,
		actor: User,
		input: PushGitConnectionDto,
		selection: SelectivePushOptions,
	): Promise<GitConnectionPushResultDto> {
		const connection = await this.getEntity(connectionId);
		// TODO(LIGO-1030): resolve timestamped branch when "branching required" is on.
		const { branchName } = connection;
		if (!branchName) throw new BadRequestError('A branch name is required to push');

		this.workingCopy.validateSelection(selection);
		await this.assertProjectLinked(connectionId, selection.projectId);

		const rootFolder = this.rootFolder(connectionId);
		if (!(await this.gitService.hasWorkingCopy(rootFolder))) {
			throw new BadRequestError(
				'This Git connection repository is not cloned. Clone it before pushing.',
			);
		}

		const repositoryFolder = path.join(rootFolder, 'repository');
		const exportFolder = path.join(repositoryFolder, EXPORT_SUBFOLDER);

		// No prior export: bootstrap from an empty branch.
		const isFirstPush = !(await this.exportedWorkingCopyExists(exportFolder));
		if (isFirstPush) {
			await mkdir(exportFolder, { recursive: true });
		}

		const branchState = isFirstPush ? {} : await this.workingCopy.readBranchState(exportFolder);

		this.workingCopy.assertDeletionsOnBranch(branchState, selection);

		const stagingFolder = await mkdtemp(path.join(repositoryFolder, `.${EXPORT_SUBFOLDER}-`));

		try {
			// The exporter writes only the selected workflows, the folders on the
			// path to them, and the dependencies they use. Ids outside the project
			// make it throw.
			await this.n8nPackagesService.exportPackageToDirectory(
				{
					user: actor,
					projectIds: [selection.projectId],
					projectWorkflowIds: selection.workflowIds,
					includeVariableValues: true,
					canExportVariableValues: true,
					includeTags: true,
					missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.ReferenceOnly,
					workflowVersionPolicy: WorkflowVersionPolicy.Latest,
				},
				{ targetDir: stagingFolder },
			);

			const mergedManifest = await this.workingCopy.applySelection(
				exportFolder,
				stagingFolder,
				branchState,
				new Set(selection.deletedWorkflowIds),
			);

			const credentials = await this.decryptCredentials(connection);
			const { commitSha, head } = await this.gitService.commitAndPush({
				connection,
				credentials,
				rootFolder,
				branchName,
				author: this.commitAuthor(actor),
				commitMessage: input.commitMessage,
				force: input.force ?? false,
				stagePathspec: EXPORT_SUBFOLDER,
			});

			connection.baseCommit = head;
			await this.repository.save(connection);

			return {
				connectionId,
				counts: this.workingCopy.deltaCounts(branchState, mergedManifest, selection),
				commitSha,
			};
		} finally {
			await rm(stagingFolder, { recursive: true, force: true });
		}
	}

	async addProject({
		user,
		connectionId,
		projectId,
	}: ManageProjectLinkOptions): Promise<GitConnectionProjectPublicDto> {
		// Validates the connection exists (throws NotFound otherwise) before any project link work.
		await this.getEntity(connectionId);

		await this.assertProjectAccess(user, projectId);
		await this.assertProjectCanBeAdded(projectId);

		const link = await this.gitConnectionProjectRepository.linkProject(projectId, connectionId);
		if (link.gitConnectionId !== connectionId) {
			throw new ConflictError('Project is already added to another Git connection');
		}
		return this.toLinkPublic(link);
	}

	async removeProject({ user, connectionId, projectId }: ManageProjectLinkOptions): Promise<void> {
		// Validates the connection exists (throws NotFound otherwise) before any project link work.
		await this.getEntity(connectionId);

		await this.assertProjectAccess(user, projectId);
		const existing = await this.gitConnectionProjectRepository.findByProjectId(projectId);
		if (!existing) return;
		if (existing.gitConnectionId !== connectionId) {
			throw new ConflictError('Project is added to another Git connection');
		}
		const removed = await this.gitConnectionProjectRepository.unlinkProject(
			projectId,
			connectionId,
		);
		if (removed === 0) {
			// The link changed between our read and the delete. Re-read: a different
			// owner is a conflict; a missing link stays a no-op.
			const current = await this.gitConnectionProjectRepository.findByProjectId(projectId);
			if (current && current.gitConnectionId !== connectionId) {
				throw new ConflictError('Project is added to another Git connection');
			}
		}
	}

	async listProjects(id: string): Promise<GitConnectionProjectListPublicDto> {
		// Validates the connection exists (throws NotFound otherwise) before any project link work.
		await this.getEntity(id);

		const projectIds = await this.gitConnectionProjectRepository.findProjectIdsByConnection(id);
		return GitConnectionProjectListPublicDto.parse({ projectIds });
	}

	// Only let the caller manage links for projects they can edit, on top of the
	// route's global `gitConnection:manageProjects` scope.
	private async assertProjectAccess(user: User, projectId: string) {
		const allowed = await userHasScopes(user, ['project:update'], false, { projectId });
		if (!allowed) throw new ForbiddenError('You do not have access to this project');
	}

	private async assertProjectCanBeAdded(projectId: string) {
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (!project) throw new NotFoundError('Project not found');
		if (project.type !== 'team') {
			throw new BadRequestError('Only team projects can be added to a Git connection');
		}
	}

	private toLinkPublic(link: GitConnectionProject): GitConnectionProjectPublicDto {
		return GitConnectionProjectPublicDto.parse({
			projectId: link.projectId,
			gitConnectionId: link.gitConnectionId,
		});
	}

	async pull(connectionId: string, actor: User): Promise<GitConnectionPullResultDto> {
		const connection = await this.getEntity(connectionId);
		const { branchName } = connection;
		if (!branchName) throw new BadRequestError('A branch name is required to pull');

		const rootFolder = this.rootFolder(connectionId);
		if (!(await this.gitService.hasWorkingCopy(rootFolder))) {
			throw new BadRequestError(
				'This Git connection repository is not cloned. Clone it before pulling.',
			);
		}

		const credentials = await this.decryptCredentials(connection);
		const { head } = await this.gitService.refreshWorkingCopy({
			connection,
			credentials,
			rootFolder,
			branchName,
		});

		const importFolder = path.join(rootFolder, 'repository', EXPORT_SUBFOLDER);
		if (!(await this.exportedWorkingCopyExists(importFolder))) {
			throw new BadRequestError(
				'The remote branch has no exported working copy to import. Push projects to it first.',
			);
		}

		this.logger.info('Importing projects from Git connection repository', { connectionId });

		const result = await this.n8nPackagesService.importPackageFromDirectory(
			{ user: actor, ...IMPORT_POLICY },
			{ sourceDir: importFolder },
		);
		const importedProjectIds = result.projects.map((project) => project.localId);
		const projectReconciliation = await this.reconcileTeamProjects(actor, importedProjectIds);

		connection.baseCommit = head;
		await this.repository.save(connection);

		return {
			connectionId,
			counts: this.toPullCounts({ importResult: result, projectReconciliation }),
			commitSha: head,
		};
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
			user.firstName && user.lastName
				? `${user.firstName} ${user.lastName}`
				: GIT_DEFAULT_COMMIT_NAME;
		return { name, email: user.email ?? GIT_DEFAULT_COMMIT_EMAIL };
	}

	private async exportedWorkingCopyExists(folder: string): Promise<boolean> {
		try {
			return (await stat(folder)).isDirectory();
		} catch {
			return false;
		}
	}

	private toPullCounts({
		importResult,
		projectReconciliation,
	}: {
		importResult: ImportResult;
		projectReconciliation: ProjectReconciliationResult;
	}): GitConnectionPullResultDto['counts'] {
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
				// Publishing happens after writes, so failures are reported without failing the pull.
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

	private async applyNewAuthentication(
		connection: GitConnection,
		input: Pick<
			CreateGitConnectionDto,
			'connectionType' | 'keyGeneratorType' | 'username' | 'password'
		>,
	) {
		if (input.connectionType === 'ssh') {
			if (input.username !== undefined || input.password !== undefined) {
				throw new BadRequestError('Username and password are only valid for HTTPS connections');
			}
			const keyType = input.keyGeneratorType ?? 'ed25519';
			const keyPair = await this.gitService.generateSshKeyPair(keyType);
			connection.publicKey = keyPair.publicKey;
			connection.encryptedPrivateKey = await this.cipher.encryptV2(keyPair.privateKey);
			connection.keyGeneratorType = keyType;
			return;
		}

		if (input.keyGeneratorType !== undefined) {
			throw new BadRequestError('Key generator type is only valid for SSH connections');
		}
		this.validateHttpsCredentials(input.username, input.password, true);
		connection.encryptedUsername = await this.cipher.encryptV2(input.username!);
		connection.encryptedPassword = await this.cipher.encryptV2(input.password!);
	}

	private async applyUpdatedAuthentication(
		updated: GitConnection,
		current: GitConnection,
		input: UpdateGitConnectionDto,
	) {
		const targetType = input.connectionType ?? current.connectionType;
		if (targetType === 'ssh') {
			if (input.username !== undefined || input.password !== undefined) {
				throw new BadRequestError('Username and password are only valid for HTTPS connections');
			}
			if (current.connectionType === 'ssh') {
				if (input.keyGeneratorType && input.keyGeneratorType !== current.keyGeneratorType) {
					throw new BadRequestError('SSH key type cannot be changed after creation');
				}
				return;
			}
			const keyType = input.keyGeneratorType ?? 'ed25519';
			const pair = await this.gitService.generateSshKeyPair(keyType);
			updated.connectionType = 'ssh';
			updated.publicKey = pair.publicKey;
			updated.encryptedPrivateKey = await this.cipher.encryptV2(pair.privateKey);
			updated.keyGeneratorType = keyType;
			updated.encryptedUsername = null;
			updated.encryptedPassword = null;
			return;
		}

		if (input.keyGeneratorType !== undefined) {
			throw new BadRequestError('Key generator type is only valid for SSH connections');
		}
		const switching = current.connectionType === 'ssh';
		this.validateHttpsCredentials(input.username, input.password, switching);
		updated.connectionType = 'https';
		if (input.username !== undefined && input.password !== undefined) {
			updated.encryptedUsername = await this.cipher.encryptV2(input.username);
			updated.encryptedPassword = await this.cipher.encryptV2(input.password);
		}
		updated.publicKey = null;
		updated.encryptedPrivateKey = null;
		updated.keyGeneratorType = null;
	}

	private validateHttpsCredentials(username?: string, password?: string, required = false) {
		if ((username === undefined) !== (password === undefined) || (required && !username)) {
			throw new BadRequestError('HTTPS username and password must be provided together');
		}
		if ([username, password].some((value) => value !== undefined && value.trim().length === 0)) {
			throw new BadRequestError('HTTPS username and password must not be blank');
		}
		if ([username, password].some((value) => value && /[\r\n\0]/.test(value))) {
			throw new BadRequestError('HTTPS credentials contain unsupported characters');
		}
	}

	private async decryptCredentials(connection: GitConnection) {
		if (connection.connectionType === 'ssh') {
			if (!connection.encryptedPrivateKey) throw new BadRequestError('SSH private key is missing');
			return {
				type: 'ssh' as const,
				privateKey: await this.cipher.decryptV2(connection.encryptedPrivateKey),
			};
		}
		if (!connection.encryptedUsername || !connection.encryptedPassword) {
			throw new BadRequestError('HTTPS credentials are missing');
		}
		return {
			type: 'https' as const,
			username: await this.cipher.decryptV2(connection.encryptedUsername),
			password: await this.cipher.decryptV2(connection.encryptedPassword),
		};
	}

	private async getEntity(id: string) {
		const connection = await this.repository.findOneBy({ id });
		if (!connection) throw new NotFoundError('Git connection not found');
		return connection;
	}

	private rootFolder(id: string) {
		return path.join(this.instanceSettings.n8nFolder, 'git-connections', id);
	}

	/** Drop the cached working copy but keep the pinned host key. */
	private async resetWorkingCopy(id: string) {
		await this.gitService.resetWorkingCopy(this.rootFolder(id));
	}

	/** Remove everything on disk for a connection, including the pinned host key. */
	private async purge(id: string) {
		await this.gitService.cleanup(this.rootFolder(id));
	}

	private async assertProjectLinked(connectionId: string, projectId: string): Promise<void> {
		const link = await this.gitConnectionProjectRepository.findByProjectId(projectId);
		if (!link || link.gitConnectionId !== connectionId) {
			throw new BadRequestError('The project is not linked to this Git connection');
		}
	}

	private toPublic(connection: GitConnection): GitConnectionPublicDto {
		return {
			id: connection.id,
			name: connection.name,
			repositoryUrl: connection.repositoryUrl,
			branchName: connection.branchName,
			connectionType: connection.connectionType,
			publicKey: connection.publicKey,
			keyGeneratorType: connection.keyGeneratorType,
			baseCommit: connection.baseCommit,
			createdAt: connection.createdAt.toISOString(),
			updatedAt: connection.updatedAt.toISOString(),
		};
	}

	private toSummary(connection: GitConnection) {
		const { publicKey: _, ...summary } = this.toPublic(connection);
		return summary;
	}
}
