import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository, User } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import type { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import type { ProjectService } from '@/services/project.service.ee';

import type { PromotionConfigResolver } from '../promotion-config.resolver';
import type { PromotionProvidersService } from '../promotion-providers.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import type { PromotionsGitService } from '../promotions-git.service';
import { PromotionsService } from '../promotions.service';
import type { PromotionOperationInput, ResolvedPromotionConfig } from '../promotions.types';
import { WorkingCopyUpdater } from '../working-copy-updater';

const CONFIG_ID = 'cfg1';
const REMOTE_URL = 'git@github.com:o/r.git';

const emptyManifest = packageManifestSchema.parse({
	packageFormatVersion: '1',
	exportedAt: '2026-01-01T00:00:00.000Z',
	sourceN8nVersion: '1.0.0',
	sourceId: 'inst-1',
});

/** What an export writes for a workflow, so the branch can be read back. */
const branchWorkflowFile = (id: string, name: string) =>
	JSON.stringify({
		id,
		name,
		nodes: [],
		connections: {},
		versionId: `version-${id}`,
		parentFolderId: null,
		isPublished: false,
		isArchived: false,
	});

describe('PromotionsService', () => {
	const resolver = mock<PromotionConfigResolver>();
	const providersService = mock<PromotionProvidersService>();
	const gitService = mock<PromotionsGitService>();
	const projectRepository = mock<ProjectRepository>();
	const projectService = mock<ProjectService>();
	const n8nPackagesService = mock<N8nPackagesService>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	let n8nFolder: string;
	let workingDirectory: PromotionWorkingDirectoryService;
	let service: PromotionsService;

	const operationInput = (
		config: ResolvedPromotionConfig,
		over: Partial<PromotionOperationInput> = {},
	): PromotionOperationInput => ({
		connectionId: 'conn1',
		connectionScope: 'instance',
		configId: CONFIG_ID,
		providerId: 'prov1',
		providerType: 'git',
		authType: 'ssh-key',
		encryptedAuth: 'enc:auth',
		target: { schemaVersion: 1, remoteUrl: REMOTE_URL },
		config,
		...over,
	});

	const promoteInput = (over: Partial<PromotionOperationInput> = {}) =>
		operationInput(
			{
				direction: 'promote',
				settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: false },
			},
			over,
		);

	const applyInput = (over: Partial<PromotionOperationInput> = {}) =>
		operationInput({ direction: 'apply', settings: { schemaVersion: 1, branchName: 'dev' } }, over);

	/** Mark the checkout as cloned from the configuration the resolver returns. */
	const markCloned = async (input: PromotionOperationInput, branchName: string) => {
		await workingDirectory.writeDescriptor({
			schemaVersion: 1,
			configId: input.configId,
			connectionId: input.connectionId,
			remoteUrl: input.target.remoteUrl,
			checkoutBranchName: branchName,
		});
		gitService.hasCheckout.mockResolvedValue(true);
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-'));
		workingDirectory = new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder }));
		service = new PromotionsService(
			resolver,
			providersService,
			workingDirectory,
			new WorkingCopyUpdater(
				mock<InstanceSettings>({ n8nFolder, instanceId: 'inst-test' }),
				logger,
			),
			gitService,
			projectRepository,
			projectService,
			n8nPackagesService,
			logger,
		);
		providersService.decryptCredentials.mockResolvedValue({
			authType: 'ssh-key',
			privateKey: 'PRIV',
		});
	});

	afterEach(async () => {
		await rm(n8nFolder, { recursive: true, force: true });
	});

	describe('clone', () => {
		it('clones the configured branch and records what it cloned', async () => {
			const input = promoteInput();
			resolver.resolveForConnection.mockResolvedValue(input);

			const result = await service.clone('conn1', 'promote');

			expect(gitService.clone).toHaveBeenCalledWith(
				expect.objectContaining({
					remoteUrl: REMOTE_URL,
					branchName: 'staging',
					configId: CONFIG_ID,
					credentials: { authType: 'ssh-key', privateKey: 'PRIV' },
				}),
			);
			await expect(workingDirectory.readDescriptor(CONFIG_ID)).resolves.toMatchObject({
				remoteUrl: REMOTE_URL,
				checkoutBranchName: 'staging',
			});
			expect(result).toEqual({
				connectionId: 'conn1',
				configId: CONFIG_ID,
				direction: 'promote',
				branchName: 'staging',
				hasCheckout: true,
			});
		});

		it('records nothing when the clone fails, so the checkout stays unusable', async () => {
			resolver.resolveForConnection.mockResolvedValue(promoteInput());
			gitService.clone.mockRejectedValueOnce(new BadRequestError('cannot connect'));

			await expect(service.clone('conn1', 'promote')).rejects.toThrow(BadRequestError);
			await expect(workingDirectory.readDescriptor(CONFIG_ID)).resolves.toBeNull();
		});
	});

	describe('disconnect', () => {
		it('removes the checkout but keeps the trusted host keys', async () => {
			const input = promoteInput();
			resolver.resolveForConnection.mockResolvedValue(input);
			await markCloned(input, 'staging');
			const paths = workingDirectory.paths(CONFIG_ID);
			await mkdir(paths.repositoryFolder, { recursive: true });
			await mkdir(paths.sshDir, { recursive: true });
			await writeFile(path.join(paths.sshDir, 'known_hosts'), 'github.com ssh-ed25519 AAAA');

			const result = await service.disconnect('conn1', 'promote');

			await expect(stat(paths.repositoryFolder)).rejects.toThrow();
			await expect(workingDirectory.readDescriptor(CONFIG_ID)).resolves.toBeNull();
			expect(await readFile(path.join(paths.sshDir, 'known_hosts'), 'utf-8')).toBe(
				'github.com ssh-ed25519 AAAA',
			);
			expect(result.hasCheckout).toBe(false);
		});
	});

	describe('promote', () => {
		const actor = mock<User>({
			id: 'actor',
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
		});

		beforeEach(async () => {
			const input = promoteInput();
			resolver.resolveForConnection.mockResolvedValue(input);
			await markCloned(input, 'staging');
			projectRepository.findTeamProjectIds.mockResolvedValue(['project-a', 'project-b']);
			gitService.commitAndPush.mockResolvedValue({ commitSha: 'newsha' });
			n8nPackagesService.exportPackageToDirectory.mockImplementation(
				async (_request, { targetDir }) => {
					await mkdir(path.join(targetDir, 'projects', 'alpha'), { recursive: true });
					await writeFile(path.join(targetDir, 'manifest.json'), '{"projects":[]}');
					await writeFile(path.join(targetDir, 'projects', 'alpha', 'project.json'), '{}');
					return {
						manifest: emptyManifest,
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

		it('writes the package into n8n-export and leaves the repository root alone', async () => {
			const { repositoryFolder } = workingDirectory.paths(CONFIG_ID);
			const packageFolder = path.join(repositoryFolder, 'n8n-export');
			await mkdir(path.join(repositoryFolder, '.git'), { recursive: true });
			await writeFile(path.join(repositoryFolder, '.git', 'HEAD'), 'ref: refs/heads/staging');
			// A file the user keeps at the repository root must survive the export.
			await writeFile(path.join(repositoryFolder, 'README.md'), '# my repo');
			// A stale package from a project that no longer exists must be removed.
			await mkdir(packageFolder, { recursive: true });
			await writeFile(path.join(packageFolder, 'stale.json'), '{}');

			const result = await service.promote('conn1', actor, {
				canExportVariableValues: true,
				commitMessage: 'sync projects',
			});
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
			expect(await readFile(path.join(packageFolder, 'manifest.json'), 'utf-8')).toBe(
				'{"projects":[]}',
			);
			// `.git` and user files at the root are untouched.
			expect(await readFile(path.join(repositoryFolder, '.git', 'HEAD'), 'utf-8')).toBe(
				'ref: refs/heads/staging',
			);
			expect(await readFile(path.join(repositoryFolder, 'README.md'), 'utf-8')).toBe('# my repo');
			expect(result).toEqual({
				connectionId: 'conn1',
				configId: CONFIG_ID,
				counts: {
					workflows: 0,
					folders: 0,
					credentials: 0,
					dataTables: 0,
					variables: 0,
					tags: 0,
				},
				git: { commitSha: 'newsha', branchName: 'staging' },
			});
			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({
					remoteUrl: REMOTE_URL,
					branchName: 'staging',
					configId: CONFIG_ID,
					author: { name: 'Ada Lovelace', email: 'ada@example.com' },
					commitMessage: 'sync projects',
					force: false,
					stagePathspec: 'n8n-export',
					credentials: { authType: 'ssh-key', privateKey: 'PRIV' },
				}),
			);
			// The stale package is gone; only the freshly written one remains.
			await expect(stat(path.join(packageFolder, 'stale.json'))).rejects.toThrow();
			await expect(stat(stagingFolder)).rejects.toThrow();
		});

		it('keeps the previous package when the export fails', async () => {
			const { repositoryFolder } = workingDirectory.paths(CONFIG_ID);
			const packageFolder = path.join(repositoryFolder, 'n8n-export');
			await mkdir(path.join(repositoryFolder, '.git'), { recursive: true });
			await writeFile(path.join(repositoryFolder, '.git', 'HEAD'), 'ref: refs/heads/staging');
			await writeFile(path.join(repositoryFolder, 'README.md'), '# my repo');
			await mkdir(packageFolder, { recursive: true });
			await writeFile(path.join(packageFolder, 'manifest.json'), '{"previous":true}');
			n8nPackagesService.exportPackageToDirectory.mockRejectedValueOnce(
				new BadRequestError('A project dependency is missing'),
			);

			await expect(
				service.promote('conn1', actor, { canExportVariableValues: true, commitMessage: 'm' }),
			).rejects.toThrow(BadRequestError);
			const stagingFolder = n8nPackagesService.exportPackageToDirectory.mock.calls[0][1].targetDir;

			expect(await readFile(path.join(repositoryFolder, '.git', 'HEAD'), 'utf-8')).toBe(
				'ref: refs/heads/staging',
			);
			expect(await readFile(path.join(repositoryFolder, 'README.md'), 'utf-8')).toBe('# my repo');
			expect(await readFile(path.join(packageFolder, 'manifest.json'), 'utf-8')).toBe(
				'{"previous":true}',
			);
			await expect(stat(stagingFolder)).rejects.toThrow();
		});

		it('refuses to promote before exporting when the direction is not cloned', async () => {
			gitService.hasCheckout.mockResolvedValueOnce(false);

			await expect(
				service.promote('conn1', actor, { canExportVariableValues: true, commitMessage: 'm' }),
			).rejects.toThrow('not cloned');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
		});

		it('refuses to promote when the checkout was cloned from another branch', async () => {
			resolver.resolveForConnection.mockResolvedValue(
				operationInput({
					direction: 'promote',
					settings: {
						schemaVersion: 1,
						baseBranchName: 'release',
						createBranchOnPromotion: false,
					},
				}),
			);

			await expect(
				service.promote('conn1', actor, { canExportVariableValues: true, commitMessage: 'm' }),
			).rejects.toThrow('not cloned');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		// `createBranchOnPromotion` is not part of the cache identity, so flipping it
		// must leave the checkout alone.
		it('keeps the checkout usable when only the branching toggle changes', async () => {
			resolver.resolveForConnection.mockResolvedValue(
				operationInput({
					direction: 'promote',
					settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
				}),
			);

			await expect(
				service.promote('conn1', actor, { canExportVariableValues: true, commitMessage: 'm' }),
			).resolves.toMatchObject({
				git: { branchName: 'staging' },
			});
		});

		it('refuses to promote when the checkout was cloned from another remote', async () => {
			resolver.resolveForConnection.mockResolvedValue(
				promoteInput({ target: { schemaVersion: 1, remoteUrl: 'git@github.com:o/other.git' } }),
			);

			await expect(
				service.promote('conn1', actor, { canExportVariableValues: true, commitMessage: 'm' }),
			).rejects.toThrow('not cloned');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		it('commits as n8n when the actor has no name or email', async () => {
			const bareActor = mock<User>({ id: 'x', firstName: '', lastName: '', email: undefined });

			await service.promote('conn1', bareActor, {
				canExportVariableValues: true,
				commitMessage: 'm',
			});

			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({
					author: { name: 'n8n user', email: 'n8n@example.com' },
				}),
			);
		});

		it.each([
			{ firstName: 'Ada', lastName: '', name: 'Ada' },
			{ firstName: '', lastName: 'Lovelace', name: 'Lovelace' },
		])('uses the available profile name: $name', async ({ firstName, lastName, name }) => {
			const partialActor = mock<User>({ firstName, lastName, email: 'ada@example.com' });

			await service.promote('conn1', partialActor, {
				canExportVariableValues: true,
				commitMessage: 'm',
			});

			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({ author: { name, email: 'ada@example.com' } }),
			);
		});

		it('forwards the force option to Git', async () => {
			await service.promote('conn1', actor, {
				canExportVariableValues: true,
				commitMessage: 'm',
				force: true,
			});

			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({ force: true }),
			);
		});

		it('forwards variable value permission to the package exporter', async () => {
			await service.promote('conn1', actor, {
				commitMessage: 'm',
				canExportVariableValues: false,
			});

			expect(n8nPackagesService.exportPackageToDirectory).toHaveBeenCalledWith(
				expect.objectContaining({ includeVariableValues: true, canExportVariableValues: false }),
				expect.any(Object),
			);
		});
	});

	describe('promoteSelection', () => {
		const actor = mock<User>({
			id: 'actor',
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
		});
		const selection = { projectId: 'p1', workflowIds: ['w1', 'w2'], deletedWorkflowIds: [] };

		let packageFolder: string;
		let repositoryFolder: string;

		const writeExportTree = async (base: string, files: Record<string, string>) => {
			for (const [filePath, content] of Object.entries(files)) {
				const fullPath = path.join(base, filePath);
				await mkdir(path.dirname(fullPath), { recursive: true });
				await writeFile(fullPath, content);
			}
		};

		const buildManifest = (overrides: Record<string, unknown> = {}) =>
			JSON.stringify(
				{
					packageFormatVersion: '1',
					exportedAt: '2026-01-01T00:00:00.000Z',
					sourceN8nVersion: '1.0.0',
					sourceId: 'inst-1',
					...overrides,
				},
				null,
				'\t',
			);

		const mockExport = (files: Record<string, string>) => {
			n8nPackagesService.exportPackageToDirectory.mockImplementation(
				async (_request, { targetDir }) => {
					await writeExportTree(targetDir, files);
					const manifest = packageManifestSchema.parse(JSON.parse(files['manifest.json']));
					return {
						manifest,
						counts: {
							workflows: manifest.workflows?.length ?? 0,
							folders: manifest.folders?.length ?? 0,
							credentials: manifest.credentials?.length ?? 0,
							dataTables: manifest.dataTables?.length ?? 0,
							variables: manifest.variables?.length ?? 0,
							tags: manifest.tags?.length ?? 0,
						},
					};
				},
			);
		};

		const readExported = async (relative: string) =>
			await readFile(path.join(packageFolder, relative), 'utf-8');

		const alpha = { id: 'p1', name: 'Alpha', target: 'projects/alpha' };
		const wf = (id: string, name = id.toUpperCase()) => ({
			id,
			name,
			target: `projects/alpha/workflows/${id}`,
		});
		const workflowFile = (id: string) =>
			JSON.stringify({
				id,
				name: id.toUpperCase(),
				nodes: [],
				connections: {},
				versionId: `version-${id}`,
				parentFolderId: null,
				isPublished: false,
				isArchived: false,
			});

		beforeEach(async () => {
			const input = promoteInput();
			resolver.resolveForConnection.mockResolvedValue(input);
			await markCloned(input, 'staging');
			repositoryFolder = workingDirectory.paths(CONFIG_ID).repositoryFolder;
			packageFolder = path.join(repositoryFolder, 'n8n-export');
			projectRepository.findOneBy.mockResolvedValue({ id: 'p1', type: 'team' } as never);
			gitService.commitAndPush.mockResolvedValue({ commitSha: 'selsha' });
		});

		it('asks the exporter for the selected workflows of the project with reference-only dependencies', async () => {
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({ projects: [alpha] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
			});
			mockExport({
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1'), wf('w2')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
				'projects/alpha/workflows/w2/workflow.json': workflowFile('w2'),
			});

			await service.promoteSelection(
				'conn1',
				actor,
				{ commitMessage: 'm', canExportVariableValues: true },
				selection,
			);

			expect(n8nPackagesService.exportPackageToDirectory).toHaveBeenCalledWith(
				expect.objectContaining({
					projectIds: ['p1'],
					projectWorkflowIds: ['w1', 'w2'],
					includeArchivedWorkflows: true,
					canExportVariableValues: true,
					missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.ReferenceOnly,
					workflowVersionPolicy: WorkflowVersionPolicy.Latest,
				}),
				expect.any(Object),
			);
		});

		it('refuses a selection when the branch has no package', async () => {
			await mkdir(repositoryFolder, { recursive: true });

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'first selective', canExportVariableValues: true },
					{ projectId: 'p1', workflowIds: ['w1'], deletedWorkflowIds: [] },
				),
			).rejects.toThrow('Promote the instance first');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
		});

		it('refuses a selection when the export does not match the selected workflows', async () => {
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});
			mockExport({
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'm', canExportVariableValues: true },
					{ projectId: 'p1', workflowIds: ['w1', 'w2'], deletedWorkflowIds: [] },
				),
			).rejects.toThrow('The export does not match the selection (missing w2)');
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
			expect(await readExported('projects/alpha/workflows/w1/workflow.json')).toBe(
				workflowFile('w1'),
			);
		});

		it('cleans up the staging folder even when the export fails', async () => {
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({ projects: [alpha] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
			});
			n8nPackagesService.exportPackageToDirectory.mockRejectedValueOnce(
				new BadRequestError('export failed'),
			);

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'm', canExportVariableValues: true },
					{ projectId: 'p1', workflowIds: ['w1'], deletedWorkflowIds: [] },
				),
			).rejects.toThrow(BadRequestError);

			const stagingFolder = n8nPackagesService.exportPackageToDirectory.mock.calls[0][1].targetDir;
			await expect(stat(stagingFolder)).rejects.toThrow();
		});

		it('refuses a deletion that is not on the branch before export', async () => {
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify(alpha),
				'projects/alpha/workflows/w1/workflow.json': branchWorkflowFile('w1', 'W1'),
			});

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'm', canExportVariableValues: true },
					{ projectId: 'p1', workflowIds: [], deletedWorkflowIds: ['w-unknown'] },
				),
			).rejects.toThrow('Deleted workflows not found on the branch: w-unknown');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
			expect(await readExported('projects/alpha/workflows/w1/workflow.json')).toBe(
				branchWorkflowFile('w1', 'W1'),
			);
		});

		it('refuses a workflow that moved to another project before export', async () => {
			const beta = { id: 'p2', name: 'Beta', target: 'projects/beta' };
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({
					projects: [alpha, beta],
					workflows: [{ id: 'w1', name: 'W1', target: 'projects/beta/workflows/w1' }],
				}),
				'projects/alpha/project.json': JSON.stringify(alpha),
				'projects/beta/project.json': JSON.stringify(beta),
				'projects/beta/workflows/w1/workflow.json': branchWorkflowFile('w1', 'W1'),
			});

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'm', canExportVariableValues: true },
					{ projectId: 'p1', workflowIds: ['w1'], deletedWorkflowIds: [] },
				),
			).rejects.toThrow('These workflows moved to another project: w1');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
			expect(await readExported('projects/beta/workflows/w1/workflow.json')).toBe(
				branchWorkflowFile('w1', 'W1'),
			);
		});

		it('writes an import inventory that still lists unselected workflows', async () => {
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});
			mockExport({
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w2')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w2/workflow.json': workflowFile('w2'),
			});

			await service.promoteSelection(
				'conn1',
				actor,
				{ commitMessage: 'add w2', canExportVariableValues: true },
				{ projectId: 'p1', workflowIds: ['w2'], deletedWorkflowIds: [] },
			);

			const snapshot = JSON.parse(await readExported('manifest.json')) as {
				workflows: Array<{ id: string }>;
			};
			expect(snapshot.workflows.map((w) => w.id).sort()).toEqual(['w1', 'w2']);
		});

		it('restores the package when the remote push fails', async () => {
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});
			mockExport({
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w2')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w2/workflow.json': workflowFile('w2'),
			});
			gitService.commitAndPush.mockRejectedValueOnce(new ServiceUnavailableError('timed out'));

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'm', canExportVariableValues: true },
					{ projectId: 'p1', workflowIds: ['w2'], deletedWorkflowIds: [] },
				),
			).rejects.toThrow(ServiceUnavailableError);

			expect(await readExported('projects/alpha/workflows/w1/workflow.json')).toBe(
				workflowFile('w1'),
			);
			await expect(readExported('projects/alpha/workflows/w2/workflow.json')).rejects.toThrow();
		});

		it('refuses to promote a selection before the direction is cloned', async () => {
			gitService.hasCheckout.mockResolvedValueOnce(false);

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'm', canExportVariableValues: true },
					selection,
				),
			).rejects.toThrow('not cloned');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
		});

		it('refuses to promote a selection when the checkout was cloned from another branch', async () => {
			resolver.resolveForConnection.mockResolvedValue(
				operationInput({
					direction: 'promote',
					settings: {
						schemaVersion: 1,
						baseBranchName: 'release',
						createBranchOnPromotion: false,
					},
				}),
			);

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'm', canExportVariableValues: true },
					selection,
				),
			).rejects.toThrow('not cloned');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		it('refuses a project-scope connection', async () => {
			resolver.resolveForConnection.mockResolvedValue(
				promoteInput({ connectionScope: 'projects' }),
			);

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'm', canExportVariableValues: true },
					selection,
				),
			).rejects.toThrow('instance connection');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		it('refuses a missing project', async () => {
			projectRepository.findOneBy.mockResolvedValue(null);

			await expect(
				service.promoteSelection(
					'conn1',
					actor,
					{ commitMessage: 'm', canExportVariableValues: true },
					selection,
				),
			).rejects.toThrow(NotFoundError);
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});
	});

	describe('apply', () => {
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

		let packageFolder: string;

		beforeEach(async () => {
			const input = applyInput();
			resolver.resolveForConnection.mockResolvedValue(input);
			await markCloned(input, 'dev');
			packageFolder = path.join(workingDirectory.paths(CONFIG_ID).repositoryFolder, 'n8n-export');
			gitService.refreshCheckout.mockResolvedValue({ commitSha: 'remotesha' });
			n8nPackagesService.importPackageFromDirectory.mockResolvedValue(importResult());
			projectRepository.findTeamProjectIds.mockResolvedValue(['p1', 'p2']);
		});

		it('imports n8n-export with the fixed policy and counts the result by status', async () => {
			await mkdir(packageFolder, { recursive: true });

			const result = await service.apply('conn1', actor);

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
				{ sourceDir: packageFolder },
			);
			expect(gitService.refreshCheckout).toHaveBeenCalledWith(
				expect.objectContaining({
					remoteUrl: REMOTE_URL,
					branchName: 'dev',
					configId: CONFIG_ID,
					credentials: { authType: 'ssh-key', privateKey: 'PRIV' },
				}),
			);
			expect(result).toEqual({
				connectionId: 'conn1',
				configId: CONFIG_ID,
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
				git: { commitSha: 'remotesha', branchName: 'dev' },
			});
		});

		it('explains that the branch holds no package to import', async () => {
			await expect(service.apply('conn1', actor)).rejects.toThrow('no exported package to import');
			expect(n8nPackagesService.importPackageFromDirectory).not.toHaveBeenCalled();
		});

		it('refuses to apply before fetching when the direction is not cloned', async () => {
			gitService.hasCheckout.mockResolvedValueOnce(false);

			await expect(service.apply('conn1', actor)).rejects.toThrow('not cloned');
			expect(gitService.refreshCheckout).not.toHaveBeenCalled();
			expect(n8nPackagesService.importPackageFromDirectory).not.toHaveBeenCalled();
		});
	});
});
