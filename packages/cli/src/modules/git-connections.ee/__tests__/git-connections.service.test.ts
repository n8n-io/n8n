import type { CreateGitConnectionDto, UpdateGitConnectionDto } from '@n8n/api-types';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { GitConnection } from '../database/entities/git-connection.entity';
import type { GitConnectionRepository } from '../database/repositories/git-connection.repository';
import type { GitConnectionsGitService } from '../git-connections-git.service';
import { GitConnectionsService } from '../git-connections.service';

describe('GitConnectionsService (credential state machine)', () => {
	const repository = mock<GitConnectionRepository>();
	const gitService = mock<GitConnectionsGitService>();
	const cipher = mock<Cipher>();
	const instanceSettings = mock<InstanceSettings>({ n8nFolder: '/tmp/n8n' });

	const service = new GitConnectionsService(repository, gitService, cipher, instanceSettings);

	const baseEntity = () => ({
		id: '1',
		name: 'c',
		repositoryUrl: 'git@github.com:o/r.git',
		branchName: 'main',
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	const sshEntity = (): GitConnection =>
		({
			...baseEntity(),
			connectionType: 'ssh',
			keyGeneratorType: 'ed25519',
			publicKey: 'PUB',
			encryptedPrivateKey: 'enc:PRIV',
			encryptedUsername: null,
			encryptedPassword: null,
		}) as GitConnection;

	const httpsEntity = (): GitConnection =>
		({
			...baseEntity(),
			repositoryUrl: 'https://github.com/o/r.git',
			connectionType: 'https',
			keyGeneratorType: null,
			publicKey: null,
			encryptedPrivateKey: null,
			encryptedUsername: 'enc:user',
			encryptedPassword: 'enc:pass',
		}) as GitConnection;

	beforeEach(() => {
		vi.clearAllMocks();
		repository.create.mockImplementation((input) => input as GitConnection);
		repository.save.mockImplementation(async (input) => {
			const entity = input as GitConnection;
			entity.createdAt ??= new Date();
			entity.updatedAt ??= new Date();
			return entity;
		});
		cipher.encryptV2.mockImplementation(async (value) => `enc:${value as string}`);
		gitService.generateSshKeyPair.mockResolvedValue({ publicKey: 'PUB', privateKey: 'PRIV' });
	});

	describe('create', () => {
		it('generates and encrypts an SSH key pair for ssh connections', async () => {
			await service.create({
				name: 'c',
				repositoryUrl: 'git@github.com:o/r.git',
				connectionType: 'ssh',
			} as CreateGitConnectionDto);

			const saved = repository.save.mock.calls[0][0] as GitConnection;
			expect(gitService.generateSshKeyPair).toHaveBeenCalledWith('ed25519');
			expect(saved.publicKey).toBe('PUB');
			expect(saved.encryptedPrivateKey).toBe('enc:PRIV');
			expect(saved.encryptedUsername).toBeNull();
		});

		it('rejects username/password on an ssh connection', async () => {
			await expect(
				service.create({
					name: 'c',
					repositoryUrl: 'git@github.com:o/r.git',
					connectionType: 'ssh',
					username: 'u',
					password: 'p',
				} as CreateGitConnectionDto),
			).rejects.toThrow(BadRequestError);
		});

		it('encrypts username and password for https connections', async () => {
			await service.create({
				name: 'c',
				repositoryUrl: 'https://github.com/o/r.git',
				connectionType: 'https',
				username: 'u',
				password: 'p',
			} as CreateGitConnectionDto);

			const saved = repository.save.mock.calls[0][0] as GitConnection;
			expect(saved.encryptedUsername).toBe('enc:u');
			expect(saved.encryptedPassword).toBe('enc:p');
			expect(saved.encryptedPrivateKey).toBeNull();
		});

		it('requires username and password together for https connections', async () => {
			await expect(
				service.create({
					name: 'c',
					repositoryUrl: 'https://github.com/o/r.git',
					connectionType: 'https',
					username: 'u',
				} as CreateGitConnectionDto),
			).rejects.toThrow(BadRequestError);
		});

		it('rejects keyGeneratorType on an https connection', async () => {
			await expect(
				service.create({
					name: 'c',
					repositoryUrl: 'https://github.com/o/r.git',
					connectionType: 'https',
					username: 'u',
					password: 'p',
					keyGeneratorType: 'rsa',
				} as CreateGitConnectionDto),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('update', () => {
		it('rejects changing the SSH key type after creation', async () => {
			repository.findOneBy.mockResolvedValue(sshEntity());
			await expect(
				service.update('1', { keyGeneratorType: 'rsa' } as UpdateGitConnectionDto),
			).rejects.toThrow(BadRequestError);
		});

		it('keeps existing keys when an ssh connection is updated without key changes', async () => {
			repository.findOneBy.mockResolvedValue(sshEntity());
			await service.update('1', { name: 'renamed' } as UpdateGitConnectionDto);

			expect(gitService.generateSshKeyPair).not.toHaveBeenCalled();
			const saved = repository.save.mock.calls[0][0] as GitConnection;
			expect(saved.encryptedPrivateKey).toBe('enc:PRIV');
		});

		it('clears the opposite credential set when switching https -> ssh', async () => {
			repository.findOneBy.mockResolvedValue(httpsEntity());
			await service.update('1', { connectionType: 'ssh' } as UpdateGitConnectionDto);

			const saved = repository.save.mock.calls[0][0] as GitConnection;
			expect(saved.encryptedPrivateKey).toBe('enc:PRIV');
			expect(saved.encryptedUsername).toBeNull();
			expect(saved.encryptedPassword).toBeNull();
		});

		it('requires credentials and clears keys when switching ssh -> https', async () => {
			repository.findOneBy.mockResolvedValue(sshEntity());
			await expect(
				service.update('1', { connectionType: 'https' } as UpdateGitConnectionDto),
			).rejects.toThrow(BadRequestError);

			repository.findOneBy.mockResolvedValue(sshEntity());
			await service.update('1', {
				connectionType: 'https',
				username: 'u',
				password: 'p',
			} as UpdateGitConnectionDto);

			const saved = repository.save.mock.calls.at(-1)![0] as GitConnection;
			expect(saved.encryptedUsername).toBe('enc:u');
			expect(saved.encryptedPassword).toBe('enc:p');
			expect(saved.encryptedPrivateKey).toBeNull();
			expect(saved.publicKey).toBeNull();
			expect(saved.keyGeneratorType).toBeNull();
		});

		it('invalidates the cached working copy on a branch-only change', async () => {
			repository.findOneBy.mockResolvedValue(sshEntity());
			await service.update('1', { branchName: 'release' } as UpdateGitConnectionDto);

			expect(gitService.resetWorkingCopy).toHaveBeenCalledWith('/tmp/n8n/git-connections/1');
		});

		it('does not touch the working copy on a name-only change', async () => {
			repository.findOneBy.mockResolvedValue(sshEntity());
			await service.update('1', { name: 'renamed' } as UpdateGitConnectionDto);

			expect(gitService.resetWorkingCopy).not.toHaveBeenCalled();
		});
	});
});
