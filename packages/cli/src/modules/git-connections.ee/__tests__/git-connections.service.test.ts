import type { CreateGitConnectionDto, UpdateGitConnectionDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository, User } from '@n8n/db';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import type { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { ProjectService } from '@/services/project.service.ee';

import type { GitConnection } from '../database/entities/git-connection.entity';
import type { GitConnectionProjectRepository } from '../database/repositories/git-connection-project.repository';
import type { GitConnectionRepository } from '../database/repositories/git-connection.repository';
import type { GitConnectionsGitService } from '../git-connections-git.service';
import { GitConnectionsService } from '../git-connections.service';

vi.mock('@/permissions.ee/check-access');
const userHasScopesMock = userHasScopes as MockedFunction<typeof userHasScopes>;

describe('GitConnectionsService (credential state machine)', () => {
	const repository = mock<GitConnectionRepository>();
	const gitConnectionProjectRepository = mock<GitConnectionProjectRepository>();
	const projectRepository = mock<ProjectRepository>();
	const projectService = mock<ProjectService>();
	const gitService = mock<GitConnectionsGitService>();
	const n8nPackagesService = mock<N8nPackagesService>();
	const cipher = mock<Cipher>();
	const instanceSettings = mock<InstanceSettings>({ n8nFolder: '/tmp/n8n' });
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new GitConnectionsService(
		repository,
		gitConnectionProjectRepository,
		projectRepository,
		projectService,
		gitService,
		n8nPackagesService,
		cipher,
		instanceSettings,
		logger,
	);

	const baseEntity = () => ({
		id: '1',
		name: 'c',
		repositoryUrl: 'git@github.com:o/r.git',
		branchName: 'main',
		baseCommit: null,
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
		userHasScopesMock.mockResolvedValue(true);
		repository.count.mockResolvedValue(0);
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
		it('rejects a second connection without doing any key generation', async () => {
			repository.count.mockResolvedValue(1);

			await expect(
				service.create({
					name: 'c',
					repositoryUrl: 'git@github.com:o/r.git',
					connectionType: 'ssh',
				} as CreateGitConnectionDto),
			).rejects.toThrow(ConflictError);

			expect(gitService.generateSshKeyPair).not.toHaveBeenCalled();
			expect(repository.save).not.toHaveBeenCalled();
		});

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

	describe('push export', () => {
		let n8nFolder: string;
		let exportService: GitConnectionsService;
		const actor = mock<User>({
			id: 'actor',
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
		});

		beforeEach(async () => {
			n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-git-connection-export-'));
			exportService = new GitConnectionsService(
				repository,
				gitConnectionProjectRepository,
				projectRepository,
				projectService,
				gitService,
				n8nPackagesService,
				cipher,
				mock<InstanceSettings>({ n8nFolder }),
				logger,
			);
			repository.findOneBy.mockResolvedValue(sshEntity());
			projectRepository.findTeamProjectIds.mockResolvedValue(['project-a', 'project-b']);
			gitService.hasWorkingCopy.mockResolvedValue(true);
			gitService.commitAndPush.mockResolvedValue({ commitSha: 'newsha', head: 'newsha' });
			cipher.decryptV2.mockImplementation(async (value) => value.replace(/^enc:/, ''));
			n8nPackagesService.exportPackageToDirectory.mockImplementation(
				async (_request, { targetDir }) => {
					await mkdir(path.join(targetDir, 'projects', 'alpha'), { recursive: true });
					await writeFile(path.join(targetDir, 'manifest.json'), '{"projects":[]}');
					await writeFile(path.join(targetDir, 'projects', 'alpha', 'project.json'), '{}');
					return {
						counts: {
							workflows: 0,
							folders: 0,
							credentials: 0,
							dataTables: 0,
							variables: 0,
							tags: 0,
						},
					};
				},
			);
		});

		afterEach(async () => {
			await rm(n8nFolder, { recursive: true, force: true });
		});

		it('exports all team projects into the n8n-export subfolder, leaving the root untouched', async () => {
			const repositoryFolder = path.join(n8nFolder, 'git-connections', '1', 'repository');
			const exportFolder = path.join(repositoryFolder, 'n8n-export');
			await mkdir(path.join(repositoryFolder, '.git'), { recursive: true });
			await writeFile(path.join(repositoryFolder, '.git', 'HEAD'), 'ref: refs/heads/main');
			// A file the user keeps at the repository root must survive the export.
			await writeFile(path.join(repositoryFolder, 'README.md'), '# my repo');
			// A stale export from a project that no longer exists must be removed.
			await mkdir(exportFolder, { recursive: true });
			await writeFile(path.join(exportFolder, 'stale.json'), '{}');

			const result = await exportService.push('1', actor, { commitMessage: 'sync projects' });
			const stagingFolder = n8nPackagesService.exportPackageToDirectory.mock.calls[0][1].targetDir;

			expect(projectRepository.findTeamProjectIds).toHaveBeenCalled();
			expect(n8nPackagesService.exportPackageToDirectory).toHaveBeenCalledWith(
				{
					user: actor,
					projectIds: ['project-a', 'project-b'],
					includeVariableValues: true,
					canExportVariableValues: true,
					includeTags: true,
					includeArchivedWorkflows: true,
					missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.Fail,
					workflowVersionPolicy: WorkflowVersionPolicy.Latest,
				},
				{ targetDir: stagingFolder },
			);
			expect(path.dirname(stagingFolder)).toBe(repositoryFolder);
			expect(path.basename(stagingFolder)).toMatch(/^\.n8n-export-/);
			expect(await readFile(path.join(exportFolder, 'manifest.json'), 'utf-8')).toBe(
				'{"projects":[]}',
			);
			// `.git` and user files at the root are untouched.
			expect(await readFile(path.join(repositoryFolder, '.git', 'HEAD'), 'utf-8')).toBe(
				'ref: refs/heads/main',
			);
			expect(await readFile(path.join(repositoryFolder, 'README.md'), 'utf-8')).toBe('# my repo');
			expect(result).toEqual({
				connectionId: '1',
				counts: {
					workflows: 0,
					folders: 0,
					credentials: 0,
					dataTables: 0,
					variables: 0,
					tags: 0,
				},
				commitSha: 'newsha',
			});
			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({
					rootFolder: path.join(n8nFolder, 'git-connections', '1'),
					branchName: 'main',
					author: { name: 'Ada Lovelace', email: 'ada@example.com' },
					commitMessage: 'sync projects',
					force: false,
					stagePathspec: 'n8n-export',
					credentials: { type: 'ssh', privateKey: 'PRIV' },
				}),
			);
			expect((repository.save.mock.calls.at(-1)?.[0] as GitConnection).baseCommit).toBe('newsha');
			// The stale export is gone; only the freshly written package remains.
			await expect(stat(path.join(exportFolder, 'stale.json'))).rejects.toThrow();
			await expect(stat(stagingFolder)).rejects.toThrow();
		});

		it('keeps the previous export and repository root intact when export fails', async () => {
			const repositoryFolder = path.join(n8nFolder, 'git-connections', '1', 'repository');
			const exportFolder = path.join(repositoryFolder, 'n8n-export');
			await mkdir(path.join(repositoryFolder, '.git'), { recursive: true });
			await writeFile(path.join(repositoryFolder, '.git', 'HEAD'), 'ref: refs/heads/main');
			await writeFile(path.join(repositoryFolder, 'README.md'), '# my repo');
			await mkdir(exportFolder, { recursive: true });
			await writeFile(path.join(exportFolder, 'manifest.json'), '{"previous":true}');
			n8nPackagesService.exportPackageToDirectory.mockRejectedValueOnce(
				new BadRequestError('A project dependency is missing'),
			);

			await expect(exportService.push('1', actor, { commitMessage: 'm' })).rejects.toThrow(
				BadRequestError,
			);
			const stagingFolder = n8nPackagesService.exportPackageToDirectory.mock.calls[0][1].targetDir;

			expect(await readFile(path.join(repositoryFolder, '.git', 'HEAD'), 'utf-8')).toBe(
				'ref: refs/heads/main',
			);
			expect(await readFile(path.join(repositoryFolder, 'README.md'), 'utf-8')).toBe('# my repo');
			expect(await readFile(path.join(exportFolder, 'manifest.json'), 'utf-8')).toBe(
				'{"previous":true}',
			);
			await expect(stat(stagingFolder)).rejects.toThrow();
		});

		it('does not query projects or write files for a missing connection', async () => {
			repository.findOneBy.mockResolvedValueOnce(null);

			await expect(exportService.push('missing', actor, { commitMessage: 'm' })).rejects.toThrow(
				'Git connection not found',
			);
			expect(projectRepository.findTeamProjectIds).not.toHaveBeenCalled();
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		it('refuses to push when the repository is not cloned, before exporting', async () => {
			gitService.hasWorkingCopy.mockResolvedValueOnce(false);

			await expect(exportService.push('1', actor, { commitMessage: 'm' })).rejects.toThrow(
				'not cloned',
			);
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
		});

		it('refuses to push a connection with no branch', async () => {
			repository.findOneBy.mockResolvedValueOnce({
				...sshEntity(),
				branchName: null,
			} as GitConnection);

			await expect(exportService.push('1', actor, { commitMessage: 'm' })).rejects.toThrow(
				'branch name is required',
			);
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		it('forwards the force flag to the git service', async () => {
			await exportService.push('1', actor, { commitMessage: 'm', force: true });

			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({ force: true }),
			);
		});

		it('falls back to the n8n identity when the actor has no profile', async () => {
			const bareActor = mock<User>({ id: 'x', firstName: '', lastName: '', email: undefined });

			await exportService.push('1', bareActor, { commitMessage: 'm' });

			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({
					author: { name: 'n8n user', email: 'n8n@example.com' },
				}),
			);
		});

		it('propagates a timeout from the git service as a 503', async () => {
			gitService.commitAndPush.mockRejectedValueOnce(new ServiceUnavailableError('timed out'));

			await expect(exportService.push('1', actor, { commitMessage: 'm' })).rejects.toThrow(
				ServiceUnavailableError,
			);
		});
	});

	describe('adding and removing projects', () => {
		const teamProject = { id: 'p1', type: 'team' };
		const personalProject = { id: 'p1', type: 'personal' };
		const user = mock<User>({ id: 'u1' });

		beforeEach(() => {
			repository.findOneBy.mockResolvedValue(sshEntity());
		});

		describe('addProject', () => {
			it('creates a link for a team project', async () => {
				projectRepository.findOneBy.mockResolvedValue(teamProject as never);
				gitConnectionProjectRepository.linkProject.mockResolvedValue({
					projectId: 'p1',
					gitConnectionId: '1',
				} as never);

				const result = await service.addProject({ user, connectionId: '1', projectId: 'p1' });

				expect(userHasScopesMock).toHaveBeenCalledWith(user, ['project:update'], false, {
					projectId: 'p1',
				});
				expect(gitConnectionProjectRepository.linkProject).toHaveBeenCalledWith('p1', '1');
				expect(result).toEqual({ projectId: 'p1', gitConnectionId: '1' });
			});

			it('rejects re-adding a project linked to a different connection', async () => {
				projectRepository.findOneBy.mockResolvedValue(teamProject as never);
				gitConnectionProjectRepository.linkProject.mockResolvedValue({
					projectId: 'p1',
					gitConnectionId: 'other',
				} as never);

				await expect(
					service.addProject({ user, connectionId: '1', projectId: 'p1' }),
				).rejects.toThrow(ConflictError);
			});

			it('rejects when the user cannot edit the project', async () => {
				userHasScopesMock.mockResolvedValue(false);

				await expect(
					service.addProject({ user, connectionId: '1', projectId: 'p1' }),
				).rejects.toThrow(ForbiddenError);
				expect(projectRepository.findOneBy).not.toHaveBeenCalled();
				expect(gitConnectionProjectRepository.linkProject).not.toHaveBeenCalled();
			});

			it('rejects an unknown project with 404', async () => {
				projectRepository.findOneBy.mockResolvedValue(null);

				await expect(
					service.addProject({ user, connectionId: '1', projectId: 'missing' }),
				).rejects.toThrow(NotFoundError);
			});

			it('rejects a personal project with 400', async () => {
				projectRepository.findOneBy.mockResolvedValue(personalProject as never);

				await expect(
					service.addProject({ user, connectionId: '1', projectId: 'p1' }),
				).rejects.toThrow(BadRequestError);
			});

			it('rejects when the connection does not exist', async () => {
				repository.findOneBy.mockResolvedValue(null);

				await expect(
					service.addProject({ user, connectionId: 'missing', projectId: 'p1' }),
				).rejects.toThrow(NotFoundError);
				expect(projectRepository.findOneBy).not.toHaveBeenCalled();
			});
		});

		describe('removeProject', () => {
			it('removes a link that belongs to this connection', async () => {
				const link = { projectId: 'p1', gitConnectionId: '1' };
				gitConnectionProjectRepository.findByProjectId.mockResolvedValue(link as never);
				gitConnectionProjectRepository.unlinkProject.mockResolvedValue(1);

				await service.removeProject({ user, connectionId: '1', projectId: 'p1' });

				expect(userHasScopesMock).toHaveBeenCalledWith(user, ['project:update'], false, {
					projectId: 'p1',
				});
				expect(gitConnectionProjectRepository.unlinkProject).toHaveBeenCalledWith('p1', '1');
			});

			it('is a no-op when the project is not linked', async () => {
				gitConnectionProjectRepository.findByProjectId.mockResolvedValue(null);

				await service.removeProject({ user, connectionId: '1', projectId: 'p1' });

				expect(gitConnectionProjectRepository.unlinkProject).not.toHaveBeenCalled();
			});

			it('rejects when the user cannot edit the project', async () => {
				userHasScopesMock.mockResolvedValue(false);

				await expect(
					service.removeProject({ user, connectionId: '1', projectId: 'p1' }),
				).rejects.toThrow(ForbiddenError);
				expect(gitConnectionProjectRepository.findByProjectId).not.toHaveBeenCalled();
				expect(gitConnectionProjectRepository.unlinkProject).not.toHaveBeenCalled();
			});

			it('rejects removing a link owned by a different connection', async () => {
				gitConnectionProjectRepository.findByProjectId.mockResolvedValue({
					projectId: 'p1',
					gitConnectionId: 'other',
				} as never);

				await expect(
					service.removeProject({ user, connectionId: '1', projectId: 'p1' }),
				).rejects.toThrow(ConflictError);

				expect(gitConnectionProjectRepository.unlinkProject).not.toHaveBeenCalled();
			});

			it('rejects when the link is reassigned to another connection before the delete', async () => {
				gitConnectionProjectRepository.findByProjectId
					.mockResolvedValueOnce({ projectId: 'p1', gitConnectionId: '1' } as never)
					.mockResolvedValueOnce({ projectId: 'p1', gitConnectionId: 'other' } as never);
				gitConnectionProjectRepository.unlinkProject.mockResolvedValue(0);

				await expect(
					service.removeProject({ user, connectionId: '1', projectId: 'p1' }),
				).rejects.toThrow(ConflictError);

				expect(gitConnectionProjectRepository.unlinkProject).toHaveBeenCalledWith('p1', '1');
			});

			it('is a no-op when the link is removed by a concurrent request before the delete', async () => {
				gitConnectionProjectRepository.findByProjectId
					.mockResolvedValueOnce({ projectId: 'p1', gitConnectionId: '1' } as never)
					.mockResolvedValueOnce(null);
				gitConnectionProjectRepository.unlinkProject.mockResolvedValue(0);

				await expect(
					service.removeProject({ user, connectionId: '1', projectId: 'p1' }),
				).resolves.toBeUndefined();

				expect(gitConnectionProjectRepository.unlinkProject).toHaveBeenCalledWith('p1', '1');
			});
		});

		describe('listProjects', () => {
			it('returns the linked project IDs', async () => {
				gitConnectionProjectRepository.findProjectIdsByConnection.mockResolvedValue(['p1', 'p2']);

				const result = await service.listProjects('1');

				expect(result).toEqual({ projectIds: ['p1', 'p2'] });
			});
		});
	});

	describe('pull import', () => {
		let n8nFolder: string;
		let importService: GitConnectionsService;
		let exportFolder: string;
		const actor = mock<User>({ id: 'actor', role: { slug: 'global:owner' } });

		const importResult = () =>
			({
				package: { sourceN8nVersion: '1.0.0', sourceId: 'src', exportedAt: 'now' },
				projects: [
					{ status: 'created', localId: 'p1' },
					{ status: 'updated', localId: 'p2' },
				],
				folders: [{ status: 'created' }, { status: 'skipped' }, { status: 'created' }],
				workflows: [
					{ status: 'created', publishing: { state: 'published' } },
					{ status: 'created', publishing: { state: 'blocked', blockedReason: 'stub-credential' } },
					{ status: 'updated', publishing: { state: 'unchanged' } },
				],
				removedWorkflows: [
					{ deletion: 'archived' },
					{ deletion: 'deleted' },
					{ deletion: 'deleted' },
				],
				removedFolders: [{}, {}],
				bindings: { workflows: {}, credentials: {} },
				credentials: { matched: ['c1'], stubbed: ['c2', 'c3'] },
				dataTables: { matched: 1, created: 2 },
				variables: { matched: ['v1'], created: ['v2'], updated: ['v3'], stubbed: [], missing: [] },
				tags: { matched: [], created: ['t1'], renamed: ['t2'], reconciled: [], skipped: [] },
			}) as unknown as Awaited<ReturnType<N8nPackagesService['importPackageFromDirectory']>>;

		beforeEach(async () => {
			n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-git-connection-import-'));
			exportFolder = path.join(n8nFolder, 'git-connections', '1', 'repository', 'n8n-export');
			importService = new GitConnectionsService(
				repository,
				gitConnectionProjectRepository,
				projectRepository,
				projectService,
				gitService,
				n8nPackagesService,
				cipher,
				mock<InstanceSettings>({ n8nFolder }),
				logger,
			);
			repository.findOneBy.mockResolvedValue(sshEntity());
			gitService.hasWorkingCopy.mockResolvedValue(true);
			gitService.refreshWorkingCopy.mockResolvedValue({ head: 'remotesha' });
			cipher.decryptV2.mockImplementation(async (value) => value.replace(/^enc:/, ''));
			n8nPackagesService.importPackageFromDirectory.mockResolvedValue(importResult());
			projectRepository.findTeamProjectIds.mockResolvedValue(['p1', 'p2']);
		});

		afterEach(async () => {
			await rm(n8nFolder, { recursive: true, force: true });
		});

		it('imports from the n8n-export subfolder with the overwrite policy and maps counts by status', async () => {
			await mkdir(exportFolder, { recursive: true });

			const result = await importService.pull('1', actor);

			expect(n8nPackagesService.importPackageFromDirectory).toHaveBeenCalledWith(
				{
					user: actor,
					projectConflictPolicy: 'overwrite',
					workflowConflictPolicy: 'new-version',
					workflowIdPolicy: 'source',
					workflowPublishingPolicy: 'match-source',
					missingNodeTypeMode: 'fail',
					credentialMatchingMode: 'id-only',
					credentialMissingMode: 'create-stub',
					folderConflictPolicy: 'overwrite',
					overwriteDeletionPolicy: 'hard-delete',
					dataTableMatchingMode: 'by-id',
					dataTableMissingMode: 'create',
					dataTableSchemaConflictPolicy: 'fail',
					variableMissingMode: 'create-with-value',
					variableConflictPolicy: 'overwrite',
					tagMissingMode: 'create',
					tagConflictPolicy: 'rename',
				},
				{ sourceDir: exportFolder },
			);
			expect(gitService.refreshWorkingCopy).toHaveBeenCalledWith(
				expect.objectContaining({
					rootFolder: path.join(n8nFolder, 'git-connections', '1'),
					branchName: 'main',
					credentials: { type: 'ssh', privateKey: 'PRIV' },
				}),
			);
			expect((repository.save.mock.calls.at(-1)?.[0] as GitConnection).baseCommit).toBe(
				'remotesha',
			);
			expect(result).toEqual({
				connectionId: '1',
				counts: {
					projects: { created: 1, updated: 1, skipped: 0, deleted: 0 },
					folders: { created: 2, skipped: 1, removed: 2 },
					workflows: {
						created: 2,
						updated: 1,
						skipped: 0,
						archived: 1,
						deleted: 2,
						publishing: { published: 1, unpublished: 0, unchanged: 1, blocked: 1, failed: 0 },
					},
					credentials: { matched: 1, stubbed: 2 },
					dataTables: { matched: 1, created: 2 },
					variables: { matched: 1, created: 1, updated: 1, stubbed: 0, missing: 0 },
					tags: { matched: 0, created: 1, renamed: 1, reconciled: 0, skipped: 0 },
				},
				commitSha: 'remotesha',
			});
		});

		it('deletes team projects missing from the import', async () => {
			await mkdir(exportFolder, { recursive: true });
			projectRepository.findTeamProjectIds.mockResolvedValueOnce(['p1', 'p2', 'removed']);

			const result = await importService.pull('1', actor);

			expect(projectService.deleteProject).toHaveBeenCalledWith(actor, 'removed');
			expect(result.counts.projects.deleted).toBe(1);
		});

		it('fails with a clear error when there is no exported working copy', async () => {
			await expect(importService.pull('1', actor)).rejects.toThrow(
				'no exported working copy to import',
			);
			expect(n8nPackagesService.importPackageFromDirectory).not.toHaveBeenCalled();
		});

		it('does not touch the filesystem for a missing connection', async () => {
			repository.findOneBy.mockResolvedValueOnce(null);

			await expect(importService.pull('missing', actor)).rejects.toThrow(
				'Git connection not found',
			);
			expect(gitService.refreshWorkingCopy).not.toHaveBeenCalled();
			expect(n8nPackagesService.importPackageFromDirectory).not.toHaveBeenCalled();
		});

		it('refuses to pull when the repository is not cloned, before fetching', async () => {
			gitService.hasWorkingCopy.mockResolvedValueOnce(false);

			await expect(importService.pull('1', actor)).rejects.toThrow('not cloned');
			expect(gitService.refreshWorkingCopy).not.toHaveBeenCalled();
			expect(n8nPackagesService.importPackageFromDirectory).not.toHaveBeenCalled();
		});

		it('propagates a timeout from the git service as a 503', async () => {
			gitService.refreshWorkingCopy.mockRejectedValueOnce(new ServiceUnavailableError('timed out'));

			await expect(importService.pull('1', actor)).rejects.toThrow(ServiceUnavailableError);
			expect(n8nPackagesService.importPackageFromDirectory).not.toHaveBeenCalled();
		});
	});
});
