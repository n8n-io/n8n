import type {
	CreateGitConnectionDto,
	GitConnectionPublicDto,
	UpdateGitConnectionDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
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

	async push(connectionId: string, actor: User): Promise<void> {
		await this.exportMutex(async () => await this.exportProjectsToRepository(connectionId, actor));
	}

	private async exportProjectsToRepository(connectionId: string, actor: User): Promise<void> {
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
		try {
			await this.n8nPackagesService.exportPackageToDirectory(
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
			await this.replaceRepositoryContents(repositoryFolder, nextExportFolder);
		} finally {
			await rm(nextExportFolder, { recursive: true, force: true });
		}

		// Git staging and remote synchronization will be added after the package layout is reviewed.
	}

	private async replaceRepositoryContents(repositoryFolder: string, nextExportFolder: string) {
		await mkdir(repositoryFolder, { recursive: true });
		const currentEntries = await readdir(repositoryFolder);
		await Promise.all(
			currentEntries
				.filter((entry) => entry !== '.git')
				.map(
					async (entry) =>
						await rm(path.join(repositoryFolder, entry), { recursive: true, force: true }),
				),
		);

		const exportedEntries = await readdir(nextExportFolder);
		await Promise.all(
			exportedEntries.map(
				async (entry) =>
					await rename(path.join(nextExportFolder, entry), path.join(repositoryFolder, entry)),
			),
		);
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
