import type {
	CreateGitConnectionDto,
	GitConnectionPublicDto,
	GitConnectionPushResultDto,
	UpdateGitConnectionDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';

import { GitConnection } from './database/entities/git-connection.entity';
import { GitConnectionProjectRepository } from './database/repositories/git-connection-project.repository';
import { GitConnectionRepository } from './database/repositories/git-connection.repository';
import { GitConnectionsGitService } from './git-connections-git.service';

/**
 * Prefix for the unique-named backups a repository swap leaves behind. Shared by
 * the swap that creates them and the sweep that reclaims them so the two can't drift.
 */
const PREVIOUS_REPOSITORY_PREFIX = 'repository-previous-';

@Service()
export class GitConnectionsService {
	private readonly exportMutex = pLimit(1);

	constructor(
		private readonly repository: GitConnectionRepository,
		private readonly projectConnectionRepository: GitConnectionProjectRepository,
		private readonly gitService: GitConnectionsGitService,
		private readonly n8nPackagesService: N8nPackagesService,
		private readonly cipher: Cipher,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('git-connections');
	}

	async create(input: CreateGitConnectionDto) {
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

	async push(connectionId: string, actor: User): Promise<GitConnectionPushResultDto> {
		return await this.exportMutex(
			async () => await this.exportProjectsToRepository(connectionId, actor),
		);
	}

	private async exportProjectsToRepository(
		connectionId: string,
		actor: User,
	): Promise<GitConnectionPushResultDto> {
		// Validates the connection exists (throws NotFound otherwise) before any export work.
		await this.getEntity(connectionId);
		const projectIds =
			await this.projectConnectionRepository.findProjectIdsByConnection(connectionId);
		const rootFolder = this.rootFolder(connectionId);
		const repositoryFolder = path.join(rootFolder, 'repository');
		const nextExportFolder = path.join(rootFolder, 'repository-export-next');

		this.logger.info('Exporting projects to Git connection repository', {
			connectionId,
			projectCount: projectIds.length,
		});

		await rm(nextExportFolder, { recursive: true, force: true });
		await this.sweepPreviousRepositories(rootFolder);
		let exportResult;
		try {
			exportResult = await this.n8nPackagesService.exportPackageToDirectory(
				{
					user: actor,
					projectIds,
					includeVariableValues: true,
					canExportVariableValues: true,
					includeTags: true,
					missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.Fail,
					workflowVersionPolicy: WorkflowVersionPolicy.Latest,
				},
				{ targetDir: nextExportFolder },
			);
		} catch (error) {
			// A failed export can contain an incomplete package, so it is not safe to retain.
			await rm(nextExportFolder, { recursive: true, force: true });
			throw error;
		}
		await this.replaceRepositoryContents(connectionId, repositoryFolder, nextExportFolder);

		// TODO: commit the working copy and push to the remote, then surface the
		// git operation result here.
		return {
			connectionId,
			counts: exportResult.counts,
		};
	}

	private async replaceRepositoryContents(
		connectionId: string,
		repositoryFolder: string,
		nextExportFolder: string,
	) {
		await mkdir(repositoryFolder, { recursive: true });
		const gitFolder = path.join(repositoryFolder, '.git');
		if (await this.pathExists(gitFolder)) {
			// Include Git metadata before the swap so the new working tree is complete when installed.
			await cp(gitFolder, path.join(nextExportFolder, '.git'), { recursive: true });
		}

		// A unique backup never overwrites recovery data left by an earlier failed operation.
		const previousRepositoryFolder = path.join(
			path.dirname(repositoryFolder),
			`${PREVIOUS_REPOSITORY_PREFIX}${randomUUID()}`,
		);
		// Keep the old tree intact until the complete staged tree is ready to take its place.
		await rename(repositoryFolder, previousRepositoryFolder);

		try {
			await rename(nextExportFolder, repositoryFolder);
		} catch (error) {
			try {
				// Restore service immediately and retain the staged export for inspection or retry.
				await rename(previousRepositoryFolder, repositoryFolder);
			} catch (rollbackError) {
				this.logger.error('Failed to restore Git connection repository after replacement error', {
					connectionId,
					rollbackError,
				});
			}
			throw error;
		}

		try {
			await rm(previousRepositoryFolder, { recursive: true, force: true });
		} catch (cleanupError) {
			// The new tree is already live, so leftover backup cleanup must not turn success into failure.
			this.logger.warn('Could not remove previous Git connection repository contents', {
				connectionId,
				cleanupError,
			});
		}
	}

	/**
	 * Best-effort removal of `repository-previous-*` backups left by an earlier
	 * failed or interrupted swap. Their unique names mean nothing overwrites them
	 * the way the fixed-name staging folder is, so without this sweep they
	 * accumulate. Runs under the same push mutex, so it can't race a live swap.
	 */
	private async sweepPreviousRepositories(rootFolder: string) {
		let entries: string[];
		try {
			entries = await readdir(rootFolder);
		} catch (error) {
			// No root folder yet (first push) means nothing to sweep.
			if (isErrnoException(error) && error.code === 'ENOENT') return;
			throw error;
		}

		const stale = entries.filter((name) => name.startsWith(PREVIOUS_REPOSITORY_PREFIX));
		await Promise.all(
			stale.map(async (name) => {
				try {
					await rm(path.join(rootFolder, name), { recursive: true, force: true });
				} catch (cleanupError) {
					// Cleanup is best-effort; a stuck backup must not fail the export.
					this.logger.warn('Could not remove stale Git connection repository backup', {
						rootFolder,
						name,
						cleanupError,
					});
				}
			}),
		);
	}

	private async pathExists(target: string) {
		try {
			await stat(target);
			return true;
		} catch (error) {
			// Only absence means false. Permission and I/O errors must stop the replacement.
			if (isErrnoException(error) && error.code === 'ENOENT') return false;
			throw error;
		}
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

/** Narrow unknown filesystem errors so callers can inspect standard Node.js error codes safely. */
function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof (error as { code: unknown }).code === 'string'
	);
}
