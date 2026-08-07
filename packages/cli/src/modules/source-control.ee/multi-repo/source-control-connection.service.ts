import { Logger } from '@n8n/backend-common';
import { ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import { rmSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

import { SOURCE_CONTROL_DEFAULT_BRANCH, SOURCE_CONTROL_DEFAULT_BRANCH_COLOR } from '../constants';
import { generateSshKeyPair, sourceControlFoldersExistCheck } from '../source-control-helper.ee';
import { SourceControlConfig } from '../source-control.config';
import { ConnectionGit } from './connection-git';
import type {
	ClaimScopePayload,
	ConnectionResponse,
	CreateConnectionPayload,
	UpdateConnectionPayload,
} from './multi-repo.types';
import type { SourceControlConnection } from './source-control-connection.entity';
import { SourceControlConnectionRepository } from './source-control-connection.repository';
import { SourceControlScopeRepository } from './source-control-scope.repository';
import type { KeyPairType } from '../types/key-pair-type';

const CONNECTIONS_GIT_FOLDER = 'git-connections';
const CONNECTIONS_SSH_FOLDER = 'ssh-connections';
const SSH_KEY_NAME = 'key';

@Service()
export class SourceControlConnectionService {
	constructor(
		private readonly connectionRepository: SourceControlConnectionRepository,
		private readonly scopeRepository: SourceControlScopeRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly cipher: Cipher,
		private readonly instanceSettings: InstanceSettings,
		private readonly sourceControlConfig: SourceControlConfig,
		private readonly logger: Logger,
	) {}

	workDirFor(connectionId: string): string {
		return path.join(this.instanceSettings.n8nFolder, CONNECTIONS_GIT_FOLDER, connectionId);
	}

	sshFolderFor(connectionId: string): string {
		return path.join(this.instanceSettings.n8nFolder, CONNECTIONS_SSH_FOLDER, connectionId);
	}

	async list(): Promise<ConnectionResponse[]> {
		const connections = await this.connectionRepository.findAllWithScopes();
		return connections.map((connection) => this.toResponse(connection));
	}

	async get(connectionId: string): Promise<SourceControlConnection> {
		const connection = await this.connectionRepository.findWithScopes(connectionId);
		if (!connection) throw new UserError(`Source control connection ${connectionId} not found`);
		return connection;
	}

	async create(payload: CreateConnectionPayload): Promise<ConnectionResponse> {
		const connection = this.connectionRepository.create({
			repositoryUrl: payload.repositoryUrl,
			branchName: payload.branchName ?? SOURCE_CONTROL_DEFAULT_BRANCH,
			branchColor: payload.branchColor ?? SOURCE_CONTROL_DEFAULT_BRANCH_COLOR,
			branchReadOnly: payload.branchReadOnly ?? false,
			connectionType: payload.connectionType,
			connected: false,
			publicKey: null,
			encryptedPrivateKey: null,
			encryptedUsername: null,
			encryptedPassword: null,
			scopes: [],
		});

		if (payload.connectionType === 'https') {
			connection.encryptedUsername = await this.cipher.encryptV2(payload.httpsUsername ?? '');
			connection.encryptedPassword = await this.cipher.encryptV2(payload.httpsPassword ?? '');
		} else {
			const keyPair = await generateSshKeyPair(
				payload.keyGeneratorType ?? this.sourceControlConfig.defaultKeyPairType,
			);
			connection.publicKey = keyPair.publicKey;
			connection.encryptedPrivateKey = await this.cipher.encryptV2(keyPair.privateKey);
		}

		const saved = await this.connectionRepository.save(connection);
		return this.toResponse({ ...saved, scopes: [] });
	}

	async update(
		connectionId: string,
		payload: UpdateConnectionPayload,
	): Promise<ConnectionResponse> {
		const connection = await this.get(connectionId);

		if (payload.branchName !== undefined) connection.branchName = payload.branchName;
		if (payload.branchColor !== undefined) connection.branchColor = payload.branchColor;
		if (payload.branchReadOnly !== undefined) connection.branchReadOnly = payload.branchReadOnly;
		if (payload.httpsUsername !== undefined) {
			connection.encryptedUsername = await this.cipher.encryptV2(payload.httpsUsername);
		}
		if (payload.httpsPassword !== undefined) {
			connection.encryptedPassword = await this.cipher.encryptV2(payload.httpsPassword);
		}

		const saved = await this.connectionRepository.save(connection);
		return this.toResponse(saved);
	}

	async delete(connectionId: string): Promise<void> {
		await this.connectionRepository.delete({ id: connectionId });
		rmSync(this.workDirFor(connectionId), { recursive: true, force: true });
		rmSync(this.sshFolderFor(connectionId), { recursive: true, force: true });
	}

	async regenerateKeyPair(
		connectionId: string,
		keyGeneratorType?: KeyPairType,
	): Promise<ConnectionResponse> {
		const connection = await this.get(connectionId);
		const keyPair = await generateSshKeyPair(
			keyGeneratorType ?? this.sourceControlConfig.defaultKeyPairType,
		);
		connection.publicKey = keyPair.publicKey;
		connection.encryptedPrivateKey = await this.cipher.encryptV2(keyPair.privateKey);
		const saved = await this.connectionRepository.save(connection);
		return this.toResponse(saved);
	}

	async connect(connectionId: string, user: User): Promise<ConnectionResponse> {
		const connection = await this.get(connectionId);
		const git = await this.gitFor(connection);
		await git.initAndTrack(connection.branchName, user);
		connection.connected = true;
		const saved = await this.connectionRepository.save(connection);
		return this.toResponse(saved);
	}

	async disconnect(connectionId: string): Promise<ConnectionResponse> {
		const connection = await this.get(connectionId);
		connection.connected = false;
		const saved = await this.connectionRepository.save(connection);
		return this.toResponse(saved);
	}

	async getBranches(connectionId: string): Promise<{ branches: string[]; currentBranch: string }> {
		const connection = await this.get(connectionId);
		const git = await this.gitFor(connection);
		await git.fetch();
		return await git.getBranches();
	}

	async claimScope(connectionId: string, payload: ClaimScopePayload): Promise<void> {
		if (payload.scopeType === 'instance') {
			const existing = await this.scopeRepository.findInstanceScope();
			if (existing && existing.connectionId !== connectionId) {
				throw new UserError('Another connection already owns the instance scope');
			}
			if (existing) return;
			await this.scopeRepository.save(
				this.scopeRepository.create({ connectionId, scopeType: 'instance', projectId: null }),
			);
			return;
		}

		// The unique index on projectId surfaces double-claims; message it as a domain error.
		const claimed = await this.scopeRepository.findScopeForProject(payload.projectId!);
		if (claimed) {
			if (claimed.connectionId === connectionId) return;
			throw new UserError('This project is already owned by another connection');
		}
		await this.scopeRepository.save(
			this.scopeRepository.create({
				connectionId,
				scopeType: 'project',
				projectId: payload.projectId,
			}),
		);
	}

	async unclaimProject(projectId: string): Promise<void> {
		await this.scopeRepository.delete({ scopeType: 'project', projectId });
	}

	async removeInstanceScope(connectionId: string): Promise<void> {
		await this.scopeRepository.delete({ scopeType: 'instance', connectionId });
	}

	/**
	 * Projects a connection pushes/pulls. A `project` scope owns exactly that
	 * project; the `instance` scope owns the derived complement — every team
	 * project no other connection has claimed. Personal projects are out of
	 * scope for the POC.
	 */
	async resolveOwnedProjectIds(connectionId: string): Promise<string[]> {
		const connection = await this.get(connectionId);
		const projectScopes = connection.scopes.filter((scope) => scope.scopeType === 'project');
		if (projectScopes.length > 0 || !connection.scopes.some((s) => s.scopeType === 'instance')) {
			return projectScopes
				.map((scope) => scope.projectId)
				.filter((id): id is string => id !== null);
		}

		const teamProjects = await this.projectRepository.find({
			select: ['id'],
			where: { type: 'team' },
		});
		const claimedIds = new Set(await this.scopeRepository.findClaimedProjectIds());
		return teamProjects.map((project) => project.id).filter((id) => !claimedIds.has(id));
	}

	async gitFor(connection: SourceControlConnection): Promise<ConnectionGit> {
		const sshFolder = this.sshFolderFor(connection.id);
		let privateKeyPath: string | undefined;
		let httpsCredentials: { username: string; password: string } | undefined;

		if (connection.connectionType === 'ssh') {
			sourceControlFoldersExistCheck([sshFolder]);
			privateKeyPath = path.join(sshFolder, SSH_KEY_NAME);
			writeFileSync(
				privateKeyPath,
				(await this.cipher.decryptV2(connection.encryptedPrivateKey ?? '')) + '\n',
				{ mode: 0o600 },
			);
		} else {
			httpsCredentials = {
				username: await this.cipher.decryptV2(connection.encryptedUsername ?? ''),
				password: await this.cipher.decryptV2(connection.encryptedPassword ?? ''),
			};
		}

		return new ConnectionGit({
			workDir: this.workDirFor(connection.id),
			sshFolder,
			connectionType: connection.connectionType,
			repositoryUrl: connection.repositoryUrl,
			httpsCredentials,
			privateKeyPath,
			logger: this.logger,
		});
	}

	private toResponse(connection: SourceControlConnection): ConnectionResponse {
		return {
			id: connection.id,
			repositoryUrl: connection.repositoryUrl,
			branchName: connection.branchName,
			branchReadOnly: connection.branchReadOnly,
			branchColor: connection.branchColor,
			connectionType: connection.connectionType,
			connected: connection.connected,
			publicKey: connection.publicKey,
			scopes: (connection.scopes ?? []).map((scope) => ({
				id: scope.id,
				scopeType: scope.scopeType,
				projectId: scope.projectId,
			})),
		};
	}
}
