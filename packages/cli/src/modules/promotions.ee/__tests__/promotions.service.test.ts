import type { PromotionApplyCheck } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { Project, ProjectRepository, SharedWorkflowRepository, User } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import assert from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, NotFoundError, ServiceUnavailableError } from '@n8n/errors';

import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import type {
	InventoryProject,
	InventoryWorkflow,
	PackageDirectoryInventoryReader,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import type { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	ExportDependencyPolicy,
	ExportVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import type { FolderService } from '@/services/folder.service';
import type { ProjectService } from '@/services/project.service.ee';

import type { PromotionEnvironmentResolver } from '../promotion-environment.resolver';
import type { PromotionProvidersService } from '../promotion-providers.service';
import type { PromotionRun } from '../database/entities/promotion-run.entity';
import type { PromotionRunRepository } from '../database/repositories/promotion-run.repository';
import type { PromotionReviewsService } from '../promotion-reviews.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import type { PromotionsGitService } from '../promotions-git.service';
import { ApplyPreviewService } from '../apply-preview.service';
import { GitCommitPackageReader } from '../git-commit-package-reader';
import { PromotionGitError } from '../promotions-git.error';
import { PromotionsService } from '../promotions.service';
import type { PromotionOperationInput, ResolvedPromotionConfig } from '../promotions.types';
import { WorkingCopyUpdater } from '../working-copy-updater';

vi.mock('node:fs/promises', async (importOriginal) => {
	const fs = await importOriginal<typeof import('node:fs/promises')>();
	return { ...fs, rm: vi.fn(fs.rm), stat: vi.fn(fs.stat) };
});

const ENVIRONMENT_ID = '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';
const REMOTE_URL = 'git@github.com:o/r.git';

const emptyManifest = packageManifestSchema.parse({
	packageFormatVersion: '1',
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
	const resolver = mock<PromotionEnvironmentResolver>();
	const providersService = mock<PromotionProvidersService>();
	const gitService = mock<PromotionsGitService>();
	const projectRepository = mock<ProjectRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const projectService = mock<ProjectService>();
	const folderService = mock<FolderService>();
	const n8nPackagesService = mock<N8nPackagesService>();
	const inventoryReader = mock<PackageDirectoryInventoryReader>();
	const packageImportConfig = mock<PackageImportConfig>();
	const runRepository = mock<PromotionRunRepository>();
	const reviewsService = mock<PromotionReviewsService>();
	const eventService = mock<EventService>();
	const actor = mock<User>({
		id: 'actor',
		firstName: 'Ada',
		lastName: 'Lovelace',
		email: 'ada@example.com',
	});
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	let n8nFolder: string;
	let workingDirectory: PromotionWorkingDirectoryService;
	let service: PromotionsService;
	let applyPreviewService: ApplyPreviewService;

	const operationInput = (
		config: ResolvedPromotionConfig,
		over: Partial<PromotionOperationInput> = {},
	): PromotionOperationInput => ({
		environmentId: ENVIRONMENT_ID,
		scope: 'instance',
		providerId: 'prov1',
		providerType: 'git',
		authType: 'ssh-key',
		encryptedAuth: 'enc:auth',
		hostBaseUrl: null,
		remote: { schemaVersion: 1, remoteUrl: REMOTE_URL },
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
			environmentId: input.environmentId,
			remoteUrl: input.remote.remoteUrl,
			checkoutBranchName: branchName,
		});
		gitService.hasCheckout.mockResolvedValue(true);
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		folderService.getFoldersByIds.mockResolvedValue([]);
		// Projects p1 and p2 exist on this instance.
		projectRepository.findTypesByIds.mockImplementation(async (ids) =>
			ids.filter((id) => ['p1', 'p2'].includes(id)).map((id) => ({ id, type: 'team' as const })),
		);
		// An empty remote by default, so the promote check for moved workflows has nothing to read.
		gitService.listBranchTree.mockResolvedValue({ commitSha: null, lsTreeOutput: '' });
		// The remote holds the base branch, so every promote resets the checkout to it.
		gitService.hasRemoteBranch.mockResolvedValue(true);
		// The base commit a promote resets to holds no package by default.
		gitService.prepareCheckoutForPromotion.mockResolvedValue({ commitSha: 'b'.repeat(40) });
		gitService.findPathsAtCommit.mockResolvedValue(new Set());
		n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-'));
		workingDirectory = new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder }));
		// Real, so that the move checks read the repository and folder mocks above.
		applyPreviewService = new ApplyPreviewService(
			n8nPackagesService,
			inventoryReader,
			mock(),
			sharedWorkflowRepository,
			projectRepository,
			folderService,
			mock(),
		);
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
			sharedWorkflowRepository,
			projectService,
			folderService,
			n8nPackagesService,
			applyPreviewService,
			inventoryReader,
			packageImportConfig,
			runRepository,
			reviewsService,
			eventService,
			logger,
		);
		runRepository.insertRun.mockResolvedValue(mock<PromotionRun>({ id: 'run-1' }));
		reviewsService.openMergeRequest.mockResolvedValue({ warnings: [] });
		providersService.decryptCredentials.mockResolvedValue({
			authType: 'ssh-key',
			privateKey: 'PRIV',
		});
	});

	afterEach(async () => {
		vi.mocked(rm).mockReset();
		vi.mocked(stat).mockReset();
		await rm(n8nFolder, { recursive: true, force: true });
	});

	describe('clone', () => {
		it('clones the configured branch and records what it cloned', async () => {
			const input = promoteInput();
			resolver.resolveForEnvironment.mockResolvedValue(input);

			const result = await service.clone(ENVIRONMENT_ID, actor);

			expect(gitService.clone).toHaveBeenCalledWith(
				expect.objectContaining({
					remoteUrl: REMOTE_URL,
					branchName: 'staging',
					environmentId: ENVIRONMENT_ID,
					credentials: { authType: 'ssh-key', privateKey: 'PRIV' },
				}),
			);
			await expect(workingDirectory.readDescriptor(ENVIRONMENT_ID)).resolves.toMatchObject({
				remoteUrl: REMOTE_URL,
				checkoutBranchName: 'staging',
			});
			expect(result).toEqual({
				environmentId: ENVIRONMENT_ID,
				direction: 'promote',
				branchName: 'staging',
				hasCheckout: true,
			});
			expect(eventService.emit).toHaveBeenCalledWith('promotion-environment-connected', {
				user: actor,
				environmentId: ENVIRONMENT_ID,
				direction: 'promote',
				outcome: 'success',
				durationMs: expect.any(Number),
			});
		});

		it('records a user failure when the clone is rejected as a bad request', async () => {
			resolver.resolveForEnvironment.mockResolvedValue(promoteInput());
			gitService.clone.mockRejectedValueOnce(new BadRequestError('cannot connect'));

			await expect(service.clone(ENVIRONMENT_ID, actor)).rejects.toThrow(BadRequestError);

			expect(eventService.emit).toHaveBeenCalledWith(
				'promotion-environment-connected',
				expect.objectContaining({ outcome: 'failed', failureKind: 'user' }),
			);
		});

		it('records a git remote failure when Git cannot reach the remote', async () => {
			resolver.resolveForEnvironment.mockResolvedValue(promoteInput());
			gitService.clone.mockRejectedValueOnce(
				new PromotionGitError('Could not complete the Git operation'),
			);

			await expect(service.clone(ENVIRONMENT_ID, actor)).rejects.toThrow(PromotionGitError);

			expect(eventService.emit).toHaveBeenCalledWith(
				'promotion-environment-connected',
				expect.objectContaining({ outcome: 'failed', failureKind: 'git_remote' }),
			);
		});

		it('records nothing when the clone fails, so the checkout stays unusable', async () => {
			resolver.resolveForEnvironment.mockResolvedValue(promoteInput());
			gitService.clone.mockRejectedValueOnce(new BadRequestError('cannot connect'));

			await expect(service.clone(ENVIRONMENT_ID, actor)).rejects.toThrow(BadRequestError);
			await expect(workingDirectory.readDescriptor(ENVIRONMENT_ID)).resolves.toBeNull();
		});
	});

	describe('disconnect', () => {
		it('removes the checkout but keeps the trusted host keys', async () => {
			const input = promoteInput();
			resolver.resolveForEnvironment.mockResolvedValue(input);
			await markCloned(input, 'staging');
			const paths = workingDirectory.paths(ENVIRONMENT_ID);
			await mkdir(paths.repositoryFolder, { recursive: true });
			await mkdir(paths.sshDir, { recursive: true });
			await writeFile(path.join(paths.sshDir, 'known_hosts'), 'github.com ssh-ed25519 AAAA');

			const result = await service.disconnect(ENVIRONMENT_ID);

			await expect(stat(paths.repositoryFolder)).rejects.toThrow();
			await expect(workingDirectory.readDescriptor(ENVIRONMENT_ID)).resolves.toBeNull();
			expect(await readFile(path.join(paths.sshDir, 'known_hosts'), 'utf-8')).toBe(
				'github.com ssh-ed25519 AAAA',
			);
			expect(result.hasCheckout).toBe(false);
		});
	});

	describe('promote', () => {
		beforeEach(async () => {
			const input = promoteInput();
			resolver.resolveForEnvironment.mockResolvedValue(input);
			await markCloned(input, 'staging');
			projectRepository.findTeamProjectIds.mockResolvedValue(['project-a', 'project-b']);
			inventoryReader.read.mockResolvedValue({
				projects: [],
				workflows: [],
				folders: [],
				credentials: [],
				variables: [],
				dataTables: [],
			});
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(new Map());
			gitService.commitAndPush.mockResolvedValue({ commitSha: 'newsha' });
			n8nPackagesService.exportPackageToDirectory.mockImplementation(
				async (_request, { targetDir }) => {
					await mkdir(path.join(targetDir, 'projects', 'alpha'), { recursive: true });
					await writeFile(path.join(targetDir, 'manifest.json'), '{"projects":[]}');
					await writeFile(path.join(targetDir, 'projects', 'alpha', 'project.json'), '{}');
					return {
						manifest: emptyManifest,
						counts: {
							agents: 0,
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

		describe('workflows on the branch that moved to another project', () => {
			const manifest = {
				projects: [{ id: 'p-billing', name: 'Billing', target: 'projects/billing' }],
				workflows: [
					{ id: 'w1', name: 'Invoices', target: 'projects/billing/workflows/w1' },
					{ id: 'w2', name: 'Reminders', target: 'projects/billing/folders/f/workflows/w2' },
				],
			};

			beforeEach(() => {
				gitService.prepareCheckoutForPromotion.mockResolvedValue({ commitSha: 'a'.repeat(40) });
				gitService.listBranchTree.mockResolvedValue({
					commitSha: 'a'.repeat(40),
					lsTreeOutput: 'n8n/manifest.json',
				});
				gitService.findPathsAtCommit.mockResolvedValue(new Set(['n8n/manifest.json']));
				gitService.readFilesAtCommit.mockResolvedValue(
					new Map([['n8n/manifest.json', JSON.stringify(manifest)]]),
				);
				projectRepository.findTypesByIds.mockResolvedValue([{ id: 'p-billing', type: 'team' }]);
			});

			it('refuses a promote while a branch workflow belongs to a personal project', async () => {
				sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
					new Map([
						['w1', mock<Project>({ id: 'p-billing', type: 'team', name: 'Billing' })],
						['w2', mock<Project>({ id: 'p-personal', type: 'personal', name: 'Ada Lovelace' })],
					]),
				);

				const refusal = service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'sync projects',
				});

				await expect(refusal).rejects.toMatchObject({
					httpStatusCode: 400,
					message: expect.stringContaining(
						'"Reminders" (w2) is in a personal project here and in team project "Billing" on the branch',
					),
				});
				// A personal project's name holds its owner's email.
				await expect(refusal).rejects.not.toMatchObject({
					message: expect.stringContaining('Ada Lovelace'),
				});
				// The check reads the manifest at the remote head, not the checkout on disk.
				expect(gitService.readFilesAtCommit).toHaveBeenCalledWith(
					expect.objectContaining({
						commitSha: 'a'.repeat(40),
						filePaths: ['n8n/manifest.json'],
					}),
				);
				expect(gitService.readTreeAtCommit).not.toHaveBeenCalled();
				expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
				expect(gitService.commitAndPush).not.toHaveBeenCalled();
			});

			it('refuses a promote while a branch workflow belongs to another team project', async () => {
				sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
					new Map([
						['w1', mock<Project>({ id: 'p-ops', type: 'team', name: 'Ops' })],
						['w2', mock<Project>({ id: 'p-billing', type: 'team', name: 'Billing' })],
					]),
				);

				await expect(
					service.promote(ENVIRONMENT_ID, actor, {
						canExportVariableValues: true,
						commitMessage: 'sync projects',
					}),
				).rejects.toMatchObject({
					httpStatusCode: 400,
					message: expect.stringContaining(
						'workflow "Invoices" (w1) is in project "Ops" here and in project "Billing" on the branch',
					),
				});
				expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
				expect(gitService.commitAndPush).not.toHaveBeenCalled();
			});

			it('refuses a promote while a branch folder belongs to another team project', async () => {
				gitService.readFilesAtCommit.mockResolvedValue(
					new Map([
						[
							'n8n/manifest.json',
							JSON.stringify({
								...manifest,
								folders: [{ id: 'f1', name: 'Payments', target: 'projects/billing/folders/f' }],
							}),
						],
					]),
				);
				sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(new Map());
				folderService.getFoldersByIds.mockResolvedValue([
					{ id: 'f1', homeProject: { id: 'p-ops', name: 'Ops', type: 'team' } },
				] as never);

				await expect(
					service.promote(ENVIRONMENT_ID, actor, {
						canExportVariableValues: true,
						commitMessage: 'sync projects',
					}),
				).rejects.toThrow(
					'folder "Payments" (f1) is in project "Ops" here and in project "Billing" on the branch',
				);
				expect(gitService.commitAndPush).not.toHaveBeenCalled();
			});

			it('promotes a move out of a branch project that no longer exists here', async () => {
				// Billing was deleted here and its workflows moved to Ops, so they can't move back. The
				// destination moves them to match instead.
				projectRepository.findTypesByIds.mockResolvedValue([]);
				sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
					new Map([['w1', mock<Project>({ id: 'p-ops', type: 'team', name: 'Ops' })]]),
				);

				await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'sync projects',
				});

				expect(gitService.commitAndPush).toHaveBeenCalled();
			});

			it('promotes when branch workflows stay in their project or are gone', async () => {
				// w1 stays in Billing. w2 has no owner any more, so the promote removes it.
				sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
					new Map([['w1', mock<Project>({ id: 'p-billing', type: 'team', name: 'Billing' })]]),
				);

				await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'sync projects',
				});

				expect(gitService.commitAndPush).toHaveBeenCalled();
			});

			it('refuses a promote when the branch manifest cannot be read', async () => {
				gitService.readFilesAtCommit.mockResolvedValue(
					new Map([['n8n/manifest.json', 'not json {']]),
				);

				await expect(
					service.promote(ENVIRONMENT_ID, actor, {
						canExportVariableValues: true,
						commitMessage: 'sync projects',
					}),
				).rejects.toMatchObject({
					httpStatusCode: 400,
					message: expect.stringContaining('"n8n/manifest.json" on the branch is not readable'),
				});
				expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			});

			it.each([
				{
					title: 'a workflow entry without a target',
					broken: { ...manifest, workflows: [manifest.workflows[0], { id: 'w9', name: 'Lost' }] },
					expected:
						'Entry 2 of "workflows" in "n8n/manifest.json" on the branch is not readable (id "w9")',
				},
				{
					title: 'a workflow entry that is not an object',
					broken: { ...manifest, workflows: ['w9'] },
					expected: 'Entry 1 of "workflows" in "n8n/manifest.json" on the branch is not readable,',
				},
				{
					title: 'a project entry without a name',
					broken: { ...manifest, projects: [{ id: 'p-billing', target: 'projects/billing' }] },
					expected:
						'Entry 1 of "projects" in "n8n/manifest.json" on the branch is not readable (id "p-billing")',
				},
			])('refuses a promote when the branch manifest has $title', async ({ broken, expected }) => {
				gitService.readFilesAtCommit.mockResolvedValue(
					new Map([['n8n/manifest.json', JSON.stringify(broken)]]),
				);

				await expect(
					service.promote(ENVIRONMENT_ID, actor, {
						canExportVariableValues: true,
						commitMessage: 'sync projects',
					}),
				).rejects.toMatchObject({
					httpStatusCode: 400,
					message: expect.stringContaining(expected),
				});
				expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			});

			it('promotes when the branch package holds no workflows', async () => {
				// The export leaves out an empty `workflows` list.
				gitService.readFilesAtCommit.mockResolvedValue(
					new Map([['n8n/manifest.json', JSON.stringify({ projects: manifest.projects })]]),
				);

				await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'sync projects',
				});

				expect(gitService.commitAndPush).toHaveBeenCalled();
			});

			it('skips the check on an empty remote or a branch without a package', async () => {
				gitService.listBranchTree.mockResolvedValue({
					commitSha: 'a'.repeat(40),
					lsTreeOutput: '',
				});
				gitService.findPathsAtCommit.mockResolvedValue(new Set());

				await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'first promote',
				});

				expect(gitService.readFilesAtCommit).not.toHaveBeenCalled();
				expect(gitService.commitAndPush).toHaveBeenCalled();
			});

			it('promotes, and so creates the branch, when the remote does not hold the branch', async () => {
				gitService.listBranchTree.mockRejectedValue(new Error("couldn't find remote ref staging"));
				gitService.hasRemoteBranch.mockResolvedValue(false);

				await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'first promote',
				});

				expect(gitService.prepareCheckoutForPromotion).not.toHaveBeenCalled();
				expect(gitService.readFilesAtCommit).not.toHaveBeenCalled();
				expect(gitService.commitAndPush).toHaveBeenCalled();
			});

			it('refuses a promote when the branch exists but cannot be read', async () => {
				const readFailure = new BadRequestError('Could not complete the Git operation');
				// A direct promote reads the branch when it resets the checkout to it.
				gitService.prepareCheckoutForPromotion.mockRejectedValue(readFailure);
				gitService.hasRemoteBranch.mockResolvedValue(true);

				await expect(
					service.promote(ENVIRONMENT_ID, actor, {
						canExportVariableValues: true,
						commitMessage: 'sync projects',
					}),
				).rejects.toBe(readFailure);
				expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
				expect(gitService.commitAndPush).not.toHaveBeenCalled();
			});

			it('refuses a promote when the remote cannot be reached', async () => {
				gitService.listBranchTree.mockRejectedValue(new Error('fetch failed'));
				gitService.hasRemoteBranch.mockRejectedValue(
					new BadRequestError('Could not complete the Git operation'),
				);

				await expect(
					service.promote(ENVIRONMENT_ID, actor, {
						canExportVariableValues: true,
						commitMessage: 'sync projects',
					}),
				).rejects.toThrow('Could not complete the Git operation');
				expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
				expect(gitService.commitAndPush).not.toHaveBeenCalled();
			});
		});

		it('writes the package into n8n and leaves the repository root alone', async () => {
			const { repositoryFolder } = workingDirectory.paths(ENVIRONMENT_ID);
			const packageFolder = path.join(repositoryFolder, 'n8n');
			await mkdir(path.join(repositoryFolder, '.git'), { recursive: true });
			await writeFile(path.join(repositoryFolder, '.git', 'HEAD'), 'ref: refs/heads/staging');
			// A file the user keeps at the repository root must survive the export.
			await writeFile(path.join(repositoryFolder, 'README.md'), '# my repo');
			// A stale package from a project that no longer exists must be removed.
			await mkdir(packageFolder, { recursive: true });
			await writeFile(path.join(packageFolder, 'stale.json'), '{}');

			const result = await service.promote(ENVIRONMENT_ID, actor, {
				canExportVariableValues: true,
				commitMessage: 'sync projects',
			});
			const stagingFolder = n8nPackagesService.exportPackageToDirectory.mock.calls[0][1].targetDir;

			expect(projectRepository.findTeamProjectIds).toHaveBeenCalled();
			expect(n8nPackagesService.exportPackageToDirectory).toHaveBeenCalledWith(
				{
					user: actor,
					projectIds: ['project-a', 'project-b'],
					includeAgents: false,
					includeVariableValues: true,
					canExportVariableValues: true,
					includeTags: true,
					includeArchivedWorkflows: true,
					dependencyPolicy: ExportDependencyPolicy.Fail,
					versionPolicy: ExportVersionPolicy.Latest,
				},
				{ targetDir: stagingFolder },
			);
			expect(path.dirname(stagingFolder)).toBe(repositoryFolder);
			expect(path.basename(stagingFolder)).toMatch(/^\.n8n-/);
			expect(await readFile(path.join(packageFolder, 'manifest.json'), 'utf-8')).toBe(
				'{"projects":[]}',
			);
			// `.git` and user files at the root are untouched.
			expect(await readFile(path.join(repositoryFolder, '.git', 'HEAD'), 'utf-8')).toBe(
				'ref: refs/heads/staging',
			);
			expect(await readFile(path.join(repositoryFolder, 'README.md'), 'utf-8')).toBe('# my repo');
			expect(result).toEqual({
				environmentId: ENVIRONMENT_ID,
				counts: {
					agents: 0,
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
					environmentId: ENVIRONMENT_ID,
					author: { name: 'Ada Lovelace', email: 'ada@example.com' },
					commitMessage: 'sync projects',
					force: false,
					stagePathspec: 'n8n',
					credentials: { authType: 'ssh-key', privateKey: 'PRIV' },
				}),
			);
			// A direct promote resets the checkout to the remote base branch before it exports.
			expect(gitService.prepareCheckoutForPromotion).toHaveBeenCalledWith(
				expect.objectContaining({ branchName: 'staging', environmentId: ENVIRONMENT_ID }),
			);
			expect(gitService.prepareCheckoutForPromotion.mock.invocationCallOrder[0]).toBeLessThan(
				n8nPackagesService.exportPackageToDirectory.mock.invocationCallOrder[0],
			);
			// The stale package is gone; only the freshly written one remains.
			await expect(stat(path.join(packageFolder, 'stale.json'))).rejects.toThrow();
			await expect(stat(stagingFolder)).rejects.toThrow();
		});

		it('emits one event with the exported counts when the push works', async () => {
			await service.promote(ENVIRONMENT_ID, actor, {
				canExportVariableValues: true,
				commitMessage: 'sync projects',
			});

			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('promotion-promoted', {
				user: actor,
				environmentId: ENVIRONMENT_ID,
				scope: 'instance',
				outcome: 'success',
				durationMs: expect.any(Number),
				counts: {
					agents: 0,
					workflows: 0,
					folders: 0,
					credentials: 0,
					dataTables: 0,
					variables: 0,
					tags: 0,
				},
				openedReview: false,
			});
		});

		it('generates a commit message when the request has none', async () => {
			await service.promote(ENVIRONMENT_ID, actor, { canExportVariableValues: true });

			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({
					commitMessage: 'Promote instance: 2 projects, 0 workflows',
				}),
			);
		});

		it('keeps the previous package when the export fails', async () => {
			const { repositoryFolder } = workingDirectory.paths(ENVIRONMENT_ID);
			const packageFolder = path.join(repositoryFolder, 'n8n');
			await mkdir(path.join(repositoryFolder, '.git'), { recursive: true });
			await writeFile(path.join(repositoryFolder, '.git', 'HEAD'), 'ref: refs/heads/staging');
			await writeFile(path.join(repositoryFolder, 'README.md'), '# my repo');
			await mkdir(packageFolder, { recursive: true });
			await writeFile(path.join(packageFolder, 'manifest.json'), '{"previous":true}');
			n8nPackagesService.exportPackageToDirectory.mockRejectedValueOnce(
				new BadRequestError('A project dependency is missing'),
			);

			await expect(
				service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				}),
			).rejects.toThrow(BadRequestError);
			const stagingFolder = n8nPackagesService.exportPackageToDirectory.mock.calls[0][1].targetDir;

			expect(eventService.emit).toHaveBeenCalledWith('promotion-promoted', {
				user: actor,
				environmentId: ENVIRONMENT_ID,
				scope: 'instance',
				outcome: 'failed',
				failureKind: 'user',
				durationMs: expect.any(Number),
			});
			expect(await readFile(path.join(repositoryFolder, '.git', 'HEAD'), 'utf-8')).toBe(
				'ref: refs/heads/staging',
			);
			expect(await readFile(path.join(repositoryFolder, 'README.md'), 'utf-8')).toBe('# my repo');
			expect(await readFile(path.join(packageFolder, 'manifest.json'), 'utf-8')).toBe(
				'{"previous":true}',
			);
			await expect(stat(stagingFolder)).rejects.toThrow();
		});

		it('refuses to promote before exporting when the direction is not connected', async () => {
			gitService.hasCheckout.mockResolvedValueOnce(false);

			await expect(
				service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				}),
			).rejects.toThrow('not connected');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
		});

		it('refuses to promote when the checkout was cloned from another branch', async () => {
			resolver.resolveForEnvironment.mockResolvedValue(
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
				service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				}),
			).rejects.toThrow('not connected');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		it('checks the base commit it reset to in branch mode, without a second fetch', async () => {
			resolver.resolveForEnvironment.mockResolvedValue(
				operationInput({
					direction: 'promote',
					settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
				}),
			);
			gitService.findPathsAtCommit.mockResolvedValue(new Set(['n8n/manifest.json']));
			gitService.readFilesAtCommit.mockResolvedValue(
				new Map([
					[
						'n8n/manifest.json',
						JSON.stringify({
							projects: [{ id: 'p-billing', name: 'Billing', target: 'projects/billing' }],
							workflows: [{ id: 'w1', name: 'Invoices', target: 'projects/billing/workflows/w1' }],
						}),
					],
				]),
			);
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([['w1', mock<Project>({ id: 'p9', type: 'personal' })]]),
			);

			await expect(
				service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				}),
			).rejects.toThrow('"Invoices" (w1) is in a personal project here');
			expect(gitService.listBranchTree).not.toHaveBeenCalled();
			expect(gitService.readFilesAtCommit).toHaveBeenCalledWith(
				expect.objectContaining({ commitSha: 'b'.repeat(40), filePaths: ['n8n/manifest.json'] }),
			);
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
		});

		it('pushes to a new timestamped branch when branching is enabled', async () => {
			resolver.resolveForEnvironment.mockResolvedValue(
				operationInput({
					direction: 'promote',
					settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
				}),
			);

			const result = await service.promote(ENVIRONMENT_ID, actor, {
				canExportVariableValues: true,
				commitMessage: 'm',
				force: true,
			});
			const targetBranchName = result.git.branchName;

			expect(targetBranchName).toMatch(
				/^n8n-promotion\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/,
			);
			expect(gitService.validateBranchName).toHaveBeenCalledWith(targetBranchName);
			expect(gitService.prepareCheckoutForPromotion).toHaveBeenCalledWith(
				expect.objectContaining({
					remoteUrl: REMOTE_URL,
					branchName: 'staging',
					environmentId: ENVIRONMENT_ID,
					credentials: { authType: 'ssh-key', privateKey: 'PRIV' },
				}),
			);
			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({ targetBranchName, force: false }),
			);
		});

		describe('review hook', () => {
			const branched = () =>
				operationInput({
					direction: 'promote',
					settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
				});

			it('opens a review for the pushed promotion branch and returns the review', async () => {
				const input = branched();
				resolver.resolveForEnvironment.mockResolvedValue(input);
				reviewsService.openMergeRequest.mockResolvedValue({
					review: { reviewId: 'review1', number: 3, webUrl: 'https://gitlab/mr/3' },
					warnings: [],
				});

				const result = await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: '\nReal title\nMore detail',
				});

				expect(gitService.commitAndPush).toHaveBeenCalledWith(
					expect.objectContaining({ commitMessage: '\nReal title\nMore detail' }),
				);
				expect(reviewsService.openMergeRequest).toHaveBeenCalledWith(
					input,
					actor,
					{
						branchName: result.git.branchName,
						baseBranchName: 'staging',
						commitSha: 'newsha',
						title: 'Real title',
						body: 'More detail',
					},
					'run-1',
				);
				expect(result.review).toEqual({
					reviewId: 'review1',
					number: 3,
					webUrl: 'https://gitlab/mr/3',
				});
				expect(result.warnings).toBeUndefined();
				expect(eventService.emit).toHaveBeenCalledWith(
					'promotion-promoted',
					expect.objectContaining({ outcome: 'success', openedReview: true }),
				);
				expect(runRepository.insertRun).toHaveBeenCalledWith(
					expect.objectContaining({
						details: expect.objectContaining({
							contents: { projectIds: ['project-a', 'project-b'] },
						}),
					}),
				);
			});

			it('titles the review with the generated message when the request has none', async () => {
				const input = branched();
				resolver.resolveForEnvironment.mockResolvedValue(input);

				const result = await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
				});

				expect(reviewsService.openMergeRequest).toHaveBeenCalledWith(
					input,
					actor,
					{
						branchName: result.git.branchName,
						baseBranchName: 'staging',
						commitSha: 'newsha',
						title: 'Promote instance: 2 projects, 0 workflows',
						body: '',
					},
					'run-1',
				);
			});

			it('does not open a review for a direct push to the base branch', async () => {
				const result = await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				});

				expect(reviewsService.openMergeRequest).not.toHaveBeenCalled();
				expect(runRepository.insertRun).toHaveBeenCalledWith({
					environmentId: ENVIRONMENT_ID,
					createdById: 'actor',
					direction: 'promote',
					type: 'git',
					details: { schemaVersion: 1, branchName: 'staging', commitSha: 'newsha' },
					reviewId: null,
				});
				expect(result.review).toBeUndefined();
				expect(result.warnings).toBeUndefined();
			});

			it('keeps the push and skips the review when the run cannot be recorded', async () => {
				runRepository.insertRun.mockRejectedValue(new Error('db down'));
				resolver.resolveForEnvironment.mockResolvedValue(branched());

				const plain = await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				});

				expect(plain.git.commitSha).toBe('newsha');
				expect(plain.review).toBeUndefined();
				expect(reviewsService.openMergeRequest).not.toHaveBeenCalled();
				expect(plain.warnings).toEqual([
					{ message: 'The push succeeded, but n8n could not record the promotion run.' },
				]);

				resolver.resolveForEnvironment.mockResolvedValue({
					...branched(),
					providerType: 'gitlab',
				});
				// The first promote drops trust until Git restores the base branch.
				await markCloned(branched(), 'staging');
				const gitlab = await service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				});

				expect(reviewsService.openMergeRequest).not.toHaveBeenCalled();
				expect(gitlab.warnings).toEqual([
					{
						message:
							'The push succeeded, but n8n could not record the promotion run, so no merge request was opened.',
					},
				]);
			});
		});

		it('stops before the commit when descriptor invalidation fails', async () => {
			resolver.resolveForEnvironment.mockResolvedValue(
				operationInput({
					direction: 'promote',
					settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
				}),
			);
			vi.spyOn(workingDirectory, 'invalidateDescriptor').mockRejectedValueOnce(
				new Error('Descriptor removal failed'),
			);

			await expect(
				service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				}),
			).rejects.toThrow('Descriptor removal failed');
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
			expect(runRepository.insertRun).not.toHaveBeenCalled();
			await expect(workingDirectory.readDescriptor(ENVIRONMENT_ID)).resolves.not.toBeNull();
		});

		it('keeps the checkout trusted when a branched promotion fails before the commit', async () => {
			resolver.resolveForEnvironment.mockResolvedValue(
				operationInput({
					direction: 'promote',
					settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
				}),
			);
			n8nPackagesService.exportPackageToDirectory.mockRejectedValueOnce(
				new Error('Missing workflow dependency'),
			);

			await expect(
				service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				}),
			).rejects.toThrow('Missing workflow dependency');
			await expect(workingDirectory.readDescriptor(ENVIRONMENT_ID)).resolves.not.toBeNull();
		});

		it('refuses to promote when the checkout was cloned from another remote', async () => {
			resolver.resolveForEnvironment.mockResolvedValue(
				promoteInput({ remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/other.git' } }),
			);

			await expect(
				service.promote(ENVIRONMENT_ID, actor, {
					canExportVariableValues: true,
					commitMessage: 'm',
				}),
			).rejects.toThrow('not connected');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		it('commits as n8n when the actor has no name or email', async () => {
			const bareActor = mock<User>({ id: 'x', firstName: '', lastName: '', email: undefined });

			await service.promote(ENVIRONMENT_ID, bareActor, {
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

			await service.promote(ENVIRONMENT_ID, partialActor, {
				canExportVariableValues: true,
				commitMessage: 'm',
			});

			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({ author: { name, email: 'ada@example.com' } }),
			);
		});

		it('forwards the force option to Git', async () => {
			await service.promote(ENVIRONMENT_ID, actor, {
				canExportVariableValues: true,
				commitMessage: 'm',
				force: true,
			});

			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({ force: true }),
			);
		});

		it('forwards variable value permission to the package exporter', async () => {
			await service.promote(ENVIRONMENT_ID, actor, {
				commitMessage: 'm',
				canExportVariableValues: false,
			});

			expect(n8nPackagesService.exportPackageToDirectory).toHaveBeenCalledWith(
				expect.objectContaining({ includeVariableValues: true, canExportVariableValues: false }),
				expect.any(Object),
			);
		});
	});

	describe('promoteProjectSelection push mechanics', () => {
		const actor = mock<User>({
			id: 'actor',
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
		});

		// classifySelection turns the sent ids into a selection: an id the project
		// owns becomes a push, an id it no longer owns becomes a deletion. Each test
		// declares the ownership it needs, so the resolved core runs on a real selection.
		const ownedByP1 = (...ids: string[]) =>
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map(ids.map((id) => [id, mock<Project>({ id: 'p1' })])),
			);

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
							agents: 0,
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
			resolver.resolveForProject.mockResolvedValue(input);
			await markCloned(input, 'staging');
			repositoryFolder = workingDirectory.paths(ENVIRONMENT_ID).repositoryFolder;
			packageFolder = path.join(repositoryFolder, 'n8n');
			projectRepository.findOneBy.mockResolvedValue({
				id: 'p1',
				name: 'Alpha',
				type: 'team',
			} as never);
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

			ownedByP1('w1', 'w2');
			await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1', 'w2'],
				commitMessage: 'm',
				canExportVariableValues: true,
			});

			expect(n8nPackagesService.exportPackageToDirectory).toHaveBeenCalledWith(
				expect.objectContaining({
					projectIds: ['p1'],
					projectWorkflowIds: ['w1', 'w2'],
					includeArchivedWorkflows: true,
					canExportVariableValues: true,
					dependencyPolicy: ExportDependencyPolicy.ReferenceOnly,
					versionPolicy: ExportVersionPolicy.Latest,
				}),
				expect.any(Object),
			);
		});

		it('pushes the selection to a new branch when branching is enabled', async () => {
			resolver.resolveForProject.mockResolvedValue(
				operationInput({
					direction: 'promote',
					settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
				}),
			);
			const invalidateDescriptor = vi.spyOn(workingDirectory, 'invalidateDescriptor');
			const files = {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			};
			await writeExportTree(packageFolder, files);
			mockExport(files);

			ownedByP1('w1');
			const result = await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1'],
				commitMessage: 'm',
				canExportVariableValues: true,
			});

			const targetBranchName = result.git.branchName;
			expect(targetBranchName).toMatch(
				/^n8n-promotion\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/,
			);
			expect(gitService.validateBranchName).toHaveBeenCalledWith(targetBranchName);
			expect(gitService.prepareCheckoutForPromotion).toHaveBeenCalledWith(
				expect.objectContaining({ branchName: 'staging', environmentId: ENVIRONMENT_ID }),
			);
			expect(invalidateDescriptor).toHaveBeenCalledWith(ENVIRONMENT_ID);
			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({ targetBranchName, branchName: 'staging', force: false }),
			);
		});

		it('fails without exporting when the package folder cannot be read', async () => {
			const readError = Object.assign(new Error('permission denied'), { code: 'EACCES' });
			const { stat: realStat } =
				await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
			vi.mocked(stat).mockImplementation(async (target, options) => {
				if (target === packageFolder) throw readError;
				return await realStat(target, options);
			});
			ownedByP1('w1');

			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).rejects.toBe(readError);
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
		});

		it('keeps the pushed selection and reports a warning when the review could not be opened', async () => {
			const input = operationInput({
				direction: 'promote',
				settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
			});
			resolver.resolveForProject.mockResolvedValue(input);
			const files = {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			};
			await writeExportTree(packageFolder, files);
			mockExport(files);
			reviewsService.openMergeRequest.mockResolvedValue({
				warnings: [{ message: 'no merge request' }],
			});

			ownedByP1('w1');
			const result = await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1'],
				commitMessage: 'm',
				canExportVariableValues: true,
			});

			expect(reviewsService.openMergeRequest).toHaveBeenCalledWith(
				input,
				actor,
				{
					branchName: result.git.branchName,
					baseBranchName: 'staging',
					commitSha: 'selsha',
					title: 'm',
					body: '',
				},
				'run-1',
			);
			expect(result.warnings).toEqual([{ message: 'no merge request' }]);
			expect(eventService.emit).toHaveBeenCalledWith(
				'promotion-promoted',
				expect.objectContaining({ outcome: 'success_with_warnings', openedReview: false }),
			);
			// The package keeps the pushed selection. No rollback happened.
			await expect(
				readFile(path.join(packageFolder, 'projects/alpha/workflows/w1/workflow.json'), 'utf8'),
			).resolves.toBe(workflowFile('w1'));
			await expect(stat(`${packageFolder}.pre-selection`)).rejects.toThrow();
		});

		it('opens the review with the generated message when the request has none', async () => {
			const input = operationInput({
				direction: 'promote',
				settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
			});
			resolver.resolveForProject.mockResolvedValue(input);
			const files = {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			};
			await writeExportTree(packageFolder, files);
			mockExport(files);

			ownedByP1('w1');
			const result = await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1'],
				canExportVariableValues: true,
			});

			expect(reviewsService.openMergeRequest).toHaveBeenCalledWith(
				input,
				actor,
				{
					branchName: result.git.branchName,
					baseBranchName: 'staging',
					commitSha: 'selsha',
					title: 'Promote 1 workflow from "Alpha"',
					body: '\nUpdated:\n- W1 (w1)',
				},
				'run-1',
			);
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

			ownedByP1('w1', 'w2');
			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1', 'w2'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
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

			ownedByP1('w1');
			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
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

			// The project no longer owns w-unknown, so it classifies as a deletion.
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(new Map());
			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w-unknown'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
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

			ownedByP1('w1');
			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).rejects.toMatchObject({
				meta: { workflowIds: ['w1'] },
			});
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
			expect(await readExported('projects/beta/workflows/w1/workflow.json')).toBe(
				branchWorkflowFile('w1', 'W1'),
			);
		});

		it('refuses the delete of a workflow that moved out to another project, and names it', async () => {
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify(alpha),
				'projects/alpha/workflows/w1/workflow.json': branchWorkflowFile('w1', 'W1'),
			});
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([['w1', mock<Project>({ id: 'p2', name: 'Ops', type: 'team' })]]),
			);

			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).rejects.toMatchObject({
				message: expect.stringContaining('w1 (now in project "Ops" here)'),
				meta: { workflowIds: ['w1'] },
			});
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(await readExported('projects/alpha/workflows/w1/workflow.json')).toBe(
				branchWorkflowFile('w1', 'W1'),
			);
		});

		it('refuses the delete of a workflow that moved to a personal project, without its name', async () => {
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify(alpha),
				'projects/alpha/workflows/w1/workflow.json': branchWorkflowFile('w1', 'W1'),
			});
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([
					[
						'w1',
						mock<Project>({ id: 'p9', name: 'Ada Lovelace <ada@example.com>', type: 'personal' }),
					],
				]),
			);

			const refusal = service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1'],
				commitMessage: 'm',
				canExportVariableValues: true,
			});

			await expect(refusal).rejects.toMatchObject({
				message: expect.stringContaining('w1 (now in a personal project here)'),
			});
			// A personal project's name holds its owner's email.
			await expect(refusal).rejects.not.toMatchObject({
				message: expect.stringContaining('ada@example.com'),
			});
		});

		it('still refuses a foreign id as not belonging to the project, not as a move', async () => {
			const beta = { id: 'p2', name: 'Beta', target: 'projects/beta' };
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({
					projects: [alpha, beta],
					workflows: [{ id: 'w-other', name: 'WOther', target: 'projects/beta/workflows/w-other' }],
				}),
				'projects/alpha/project.json': JSON.stringify(alpha),
				'projects/beta/project.json': JSON.stringify(beta),
				'projects/beta/workflows/w-other/workflow.json': branchWorkflowFile('w-other', 'WOther'),
			});
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([['w-other', mock<Project>({ id: 'p2', name: 'Beta' })]]),
			);

			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w-other'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).rejects.toThrow('Deleted workflows do not belong to the selected project: w-other');
		});

		it('describes the added, updated and removed workflows in the commit message', async () => {
			await writeExportTree(packageFolder, {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1'), wf('w3')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
				'projects/alpha/workflows/w3/workflow.json': workflowFile('w3'),
			});
			mockExport({
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1'), wf('w2')] }),
				'projects/alpha/project.json': JSON.stringify({ id: alpha.id, name: alpha.name }),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
				'projects/alpha/workflows/w2/workflow.json': workflowFile('w2'),
			});

			// w3 is not owned by p1 anymore, so it leaves the branch.
			ownedByP1('w1', 'w2');
			await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1', 'w2', 'w3'],
				canExportVariableValues: true,
			});

			expect(gitService.commitAndPush).toHaveBeenCalledWith(
				expect.objectContaining({
					commitMessage: [
						'Promote 3 workflows from "Alpha"',
						'Added:\n- W2 (w2)',
						'Updated:\n- W1 (w1)',
						'Removed:\n- W3 (w3)',
					].join('\n\n'),
				}),
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

			ownedByP1('w2');
			await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w2'],
				commitMessage: 'add w2',
				canExportVariableValues: true,
			});

			const snapshot = JSON.parse(await readExported('manifest.json')) as {
				workflows: Array<{ id: string }>;
			};
			expect(snapshot.workflows.map((w) => w.id).sort()).toEqual(['w1', 'w2']);
		});

		it('keeps the push result and removes staging when backup cleanup fails', async () => {
			const files = {
				'manifest.json': buildManifest({ projects: [alpha], workflows: [wf('w1')] }),
				'projects/alpha/project.json': JSON.stringify(alpha),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			};
			await writeExportTree(packageFolder, files);
			mockExport(files);
			const cleanupError = new Error('Backup cleanup failed');
			gitService.commitAndPush.mockImplementationOnce(async () => {
				vi.mocked(rm).mockRejectedValueOnce(cleanupError);
				return { commitSha: 'selsha' };
			});

			ownedByP1('w1');
			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).resolves.toMatchObject({ git: { commitSha: 'selsha', branchName: 'staging' } });

			const stagingFolder = n8nPackagesService.exportPackageToDirectory.mock.calls[0][1].targetDir;
			await expect(stat(stagingFolder)).rejects.toMatchObject({ code: 'ENOENT' });
			expect(logger.warn.mock.calls).toContainEqual([
				'Failed to remove the selection backup',
				{ prePushBackup: `${packageFolder}.pre-selection`, error: cleanupError },
			]);
		});

		it('restores the package and keeps the push error when staging cleanup fails', async () => {
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
			const pushError = new ServiceUnavailableError('timed out');
			const cleanupError = new Error('Staging cleanup failed');
			const { rm: realRm } =
				await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
			gitService.commitAndPush.mockImplementationOnce(async () => {
				const stagingFolder =
					n8nPackagesService.exportPackageToDirectory.mock.calls[0][1].targetDir;
				vi.mocked(rm).mockImplementation(async (target, options) => {
					if (target === stagingFolder) throw cleanupError;
					await realRm(target, options);
				});
				throw pushError;
			});

			ownedByP1('w2');
			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w2'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).rejects.toBe(pushError);

			const stagingFolder = n8nPackagesService.exportPackageToDirectory.mock.calls[0][1].targetDir;
			expect(logger.warn.mock.calls).toContainEqual([
				'Failed to remove the selection staging folder',
				{ stagingFolder, error: cleanupError },
			]);
			expect(gitService.commitAndPush.mock.calls).toContainEqual([
				expect.objectContaining({ rollbackOnFailure: true }),
			]);
			expect(await readExported('projects/alpha/workflows/w1/workflow.json')).toBe(
				workflowFile('w1'),
			);
			await expect(readExported('projects/alpha/workflows/w2/workflow.json')).rejects.toThrow();
		});

		it('refuses to promote a selection before the direction is cloned', async () => {
			gitService.hasCheckout.mockResolvedValueOnce(false);
			ownedByP1('w1', 'w2');

			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1', 'w2'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).rejects.toThrow('not connected');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
			expect(gitService.commitAndPush).not.toHaveBeenCalled();
		});

		it('refuses to promote a selection when the checkout was cloned from another branch', async () => {
			resolver.resolveForProject.mockResolvedValue(
				operationInput({
					direction: 'promote',
					settings: {
						schemaVersion: 1,
						baseBranchName: 'release',
						createBranchOnPromotion: false,
					},
				}),
			);
			ownedByP1('w1', 'w2');

			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1', 'w2'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).rejects.toThrow('not connected');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		it('refuses a project-scope environment', async () => {
			resolver.resolveForProject.mockResolvedValue(promoteInput({ scope: 'projects' }));
			ownedByP1('w1', 'w2');

			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1', 'w2'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).rejects.toThrow('instance environment');
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});

		it('refuses a missing project', async () => {
			projectRepository.findOneBy.mockResolvedValue(null);
			ownedByP1('w1', 'w2');

			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1', 'w2'],
					commitMessage: 'm',
					canExportVariableValues: true,
				}),
			).rejects.toThrow(NotFoundError);
			expect(n8nPackagesService.exportPackageToDirectory).not.toHaveBeenCalled();
		});
	});

	describe('promoteProjectSelection', () => {
		const actor = mock<User>({ id: 'actor', email: 'ada@example.com' });

		// The promote resolves the environment the same way the change preview does,
		// so a selection pushes to the environment the user previewed.
		beforeEach(() => {
			resolver.resolveForProject.mockResolvedValue(promoteInput());
		});

		// promoteSelectionResolved is private; the cast lets the spy see it.
		const spyPromoteSelectionResolved = () =>
			vi.spyOn(
				service as unknown as {
					promoteSelectionResolved: (...args: unknown[]) => Promise<unknown>;
				},
				'promoteSelectionResolved',
			);

		it('promotes live and archived workflows and pushes only missing ones as deletions', async () => {
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([
					['w1', mock<Project>({ id: 'p1' })],
					['w2', mock<Project>({ id: 'p1' })],
					['w4', mock<Project>({ id: 'p1' })],
					// w3 is left out on purpose: it no longer exists.
				]),
			);
			const promoteSelectionResolved = spyPromoteSelectionResolved().mockResolvedValue({} as never);

			await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1', 'w2', 'w3', 'w4'],
				canExportVariableValues: true,
			});

			expect(resolver.resolveForProject).toHaveBeenCalledWith('p1', 'promote');
			expect(promoteSelectionResolved).toHaveBeenCalledWith(
				promoteInput(),
				actor,
				expect.objectContaining({
					canExportVariableValues: true,
					commitMessage: undefined,
				}),
				{ projectId: 'p1', workflowIds: ['w1', 'w2', 'w4'], deletedWorkflowIds: ['w3'] },
				new Map(),
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'promotion-promoted',
				expect.objectContaining({
					scope: 'project',
					projectId: 'p1',
					selectedWorkflowCount: 4,
				}),
			);
		});

		it('forwards a client commit message when one is sent', async () => {
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([['w1', mock<Project>({ id: 'p1' })]]),
			);
			const promoteSelectionResolved = spyPromoteSelectionResolved().mockResolvedValue({} as never);

			await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1'],
				commitMessage: 'Promote checkout flow',
				canExportVariableValues: true,
			});

			expect(promoteSelectionResolved).toHaveBeenCalledWith(
				promoteInput(),
				actor,
				expect.objectContaining({ commitMessage: 'Promote checkout flow' }),
				{ projectId: 'p1', workflowIds: ['w1'], deletedWorkflowIds: [] },
				new Map(),
			);
		});

		it('pushes a workflow that is gone from the instance as a deletion', async () => {
			// w9 has no owner any more. The change list shows it as a deletion for p1.
			// assertDeletionsOnBranch rejects it later if the branch does not hold it.
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([['w1', mock<Project>({ id: 'p1' })]]),
			);
			const promoteSelectionResolved = spyPromoteSelectionResolved().mockResolvedValue({} as never);

			await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1', 'w9'],
				canExportVariableValues: false,
			});

			expect(promoteSelectionResolved).toHaveBeenCalledWith(
				promoteInput(),
				actor,
				expect.anything(),
				{ projectId: 'p1', workflowIds: ['w1'], deletedWorkflowIds: ['w9'] },
				new Map(),
			);
		});

		it('passes a workflow that another project owns now as a deletion, with where it is now', async () => {
			// w9 moved to "Ops". The branch check refuses it as a move when the branch holds it under p1.
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([
					['w1', mock<Project>({ id: 'p1' })],
					['w9', mock<Project>({ id: 'other', name: 'Ops', type: 'team' })],
				]),
			);
			const promoteSelectionResolved = spyPromoteSelectionResolved().mockResolvedValue({} as never);

			await service.promoteProjectSelection('p1', actor, {
				workflowIds: ['w1', 'w9'],
				canExportVariableValues: false,
			});

			expect(promoteSelectionResolved).toHaveBeenCalledWith(
				promoteInput(),
				actor,
				expect.anything(),
				{ projectId: 'p1', workflowIds: ['w1'], deletedWorkflowIds: ['w9'] },
				new Map([['w9', 'project "Ops"']]),
			);
		});

		it('rejects a selection with duplicate workflow ids', async () => {
			const promoteSelectionResolved = spyPromoteSelectionResolved();

			await expect(
				service.promoteProjectSelection('p1', actor, {
					workflowIds: ['w1', 'w1'],
					canExportVariableValues: false,
				}),
			).rejects.toThrow(BadRequestError);
			expect(promoteSelectionResolved).not.toHaveBeenCalled();
		});
	});

	describe('readBranchPackage', () => {
		const commitSha = 'c'.repeat(40);
		const workflowPath = 'n8n/projects/orders-p1/workflows/order-w1/workflow.json';

		beforeEach(async () => {
			const input = applyInput();
			resolver.resolveForProject.mockResolvedValue(input);
			await markCloned(input, 'dev');
		});

		it('lists the package of the branch at one commit and reads files from that commit', async () => {
			gitService.listBranchTree.mockResolvedValue({
				commitSha,
				lsTreeOutput:
					[
						'100644 blob m1\tn8n/manifest.json',
						'100644 blob p1\tn8n/projects/orders-p1/project.json',
						`100644 blob w1\t${workflowPath}`,
						'100644 blob x1\tn8n/projects/other-p2/project.json',
					].join('\0') + '\0',
			});
			gitService.readFilesAtCommit.mockResolvedValue(new Map([[workflowPath, '{"id":"w1"}']]));

			const branch = await service.readBranchPackage('p1', 'apply');

			expect(resolver.resolveForProject).toHaveBeenCalledWith('p1', 'apply');
			expect(gitService.listBranchTree).toHaveBeenCalledWith(
				expect.objectContaining({
					remoteUrl: REMOTE_URL,
					branchName: 'dev',
					environmentId: ENVIRONMENT_ID,
					credentials: { authType: 'ssh-key', privateKey: 'PRIV' },
					pathspecs: [
						'n8n/projects/',
						'n8n/credentials/',
						'n8n/data-tables/',
						'n8n/variables/',
						'n8n/tags/',
						'n8n/manifest.json',
					],
				}),
			);
			expect(branch).toMatchObject({
				environmentId: ENVIRONMENT_ID,
				branchName: 'dev',
				commitSha,
				hasManifest: true,
			});
			expect(branch.files.map(({ entityId, type }) => ({ entityId, type }))).toEqual([
				{ entityId: 'p1', type: 'project' },
				{ entityId: 'w1', type: 'workflow' },
			]);
			await expect(branch.readFiles([workflowPath])).resolves.toEqual(
				new Map([[workflowPath, '{"id":"w1"}']]),
			);
			expect(gitService.readFilesAtCommit).toHaveBeenCalledWith(
				expect.objectContaining({
					commitSha,
					branchName: 'dev',
					environmentId: ENVIRONMENT_ID,
					filePaths: [workflowPath],
				}),
			);
		});

		it('lists a branch without commits as empty and refuses to read a file from it', async () => {
			gitService.listBranchTree.mockResolvedValue({ commitSha: null, lsTreeOutput: '' });

			const branch = await service.readBranchPackage('p1', 'apply');

			expect(branch).toMatchObject({
				environmentId: ENVIRONMENT_ID,
				branchName: 'dev',
				commitSha: null,
				files: [],
				hasManifest: false,
			});
			await expect(branch.readFiles(['n8n/manifest.json'])).rejects.toThrow('no exported package');
			expect(gitService.readFilesAtCommit).not.toHaveBeenCalled();
		});

		it('refuses to read before the direction is cloned', async () => {
			gitService.hasCheckout.mockResolvedValueOnce(false);

			await expect(service.readBranchPackage('p1', 'apply')).rejects.toThrow('not connected');
			expect(gitService.listBranchTree).not.toHaveBeenCalled();
		});
	});

	describe('apply', () => {
		const actor = mock<User>({ id: 'actor', role: { slug: 'global:owner' } });

		const importResult = () =>
			({
				package: { sourceN8nVersion: '1.0.0', sourceId: 'src' },
				projects: [
					{ status: 'created', localId: 'p1' },
					{ status: 'updated', localId: 'p2' },
				],
				folders: [
					{ status: 'created' },
					{ status: 'skipped' },
					{ status: 'created' },
					{ status: 'updated', moved: true },
					{ status: 'updated', moved: true, renamed: true },
					{ status: 'updated', renamed: true },
				],
				workflows: [
					{ status: 'created', publishing: { state: 'published' } },
					{ status: 'created', publishing: { state: 'blocked', blockedReason: 'stub-credential' } },
					{ status: 'updated', moved: true, publishing: { state: 'unchanged' } },
				],
				removedWorkflows: [
					{ deletion: 'archived' },
					{ deletion: 'deleted' },
					{ deletion: 'deleted' },
				],
				removedFolders: [{}, {}],
				bindings: { workflows: {}, credentials: {} },
				credentials: { matched: ['c1'], stubbed: ['c2', 'c3'], updated: ['c4'] },
				dataTables: { matched: 1, created: 2, updated: 3 },
				variables: { matched: ['v1'], created: ['v2'], updated: ['v3'], stubbed: [], missing: [] },
				tags: { matched: [], created: ['t1'], renamed: ['t2'], reconciled: [], skipped: [] },
			}) as unknown as Awaited<ReturnType<N8nPackagesService['applyPackagePlan']>>;

		const plan = mock<PackageImportPlan>();
		const packageInventory = {
			projects: [mock<InventoryProject>({ id: 'p1' }), mock<InventoryProject>({ id: 'p2' })],
			workflows: [],
			folders: [],
			credentials: [],
			variables: [],
			dataTables: [],
		};
		const checked = (applyCheck: PromotionApplyCheck) => ({
			...applyCheck,
			movedWorkflows: [],
			movedFolders: [],
		});
		const noMoves = { workflows: [], folders: [] };
		let check: MockInstance<ApplyPreviewService['check']>;

		beforeEach(async () => {
			// The check of the plan is covered on its own. Here it only passes the moves through.
			check = vi
				.spyOn(applyPreviewService, 'check')
				.mockImplementation((_plan, _inventory, _selection, moves) => ({
					...checked({
						missingProjects: [],
						missingBindings: [],
						accessRequirements: [],
						conflicts: [],
						warnings: [],
					}),
					movedWorkflows: moves.workflows,
					movedFolders: moves.folders,
				}));
			const input = applyInput();
			resolver.resolveForEnvironment.mockResolvedValue(input);
			await markCloned(input, 'dev');
			gitService.listBranchTree.mockResolvedValue({ commitSha: 'remotesha', lsTreeOutput: '' });
			gitService.readTreeAtCommit.mockResolvedValue(
				new Map([['manifest.json', Buffer.from('{}')]]),
			);
			inventoryReader.read.mockResolvedValue(packageInventory);
			n8nPackagesService.planPackage.mockResolvedValue(plan);
			n8nPackagesService.applyPackagePlan.mockResolvedValue(importResult());
			projectRepository.findTeamProjectIds.mockResolvedValue(['p1', 'p2']);
			projectRepository.findTypesByIds.mockResolvedValue([
				{ id: 'p1', type: 'team' },
				{ id: 'p2', type: 'team' },
			]);
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(new Map());
			folderService.getFoldersByIds.mockResolvedValue([]);
		});

		describe('moves between projects', () => {
			const alpha = { id: 'p1', name: 'Alpha', path: 'projects/alpha' };
			const beta = { id: 'p2', name: 'Beta', path: 'projects/beta' };
			const invoices = (projectId: string) =>
				mock<InventoryWorkflow>({ id: 'wa1', name: 'Invoices', projectId });
			const inventoryWith = (
				workflows: InventoryWorkflow[],
				folders: Array<{ projectId: string; folder: { id: string; name: string } }> = [],
				projects = [alpha, beta],
			) => ({
				projects,
				workflows,
				folders: folders.map((entry) => ({
					path: 'projects/any/folders/payments/folder.json',
					...entry,
					folder: { ...entry.folder, parentFolderId: null },
				})),
				credentials: [],
				variables: [],
				dataTables: [],
			});
			const movedConflict = async () => {
				const result = await service.apply(ENVIRONMENT_ID, actor);
				assert(result.status === 'blocked');
				expect(n8nPackagesService.applyPackagePlan).not.toHaveBeenCalled();
				return result.check.conflicts.filter(({ code }) => code === 'moved');
			};

			it('blocks a workflow that the branch holds in another project, and names both projects', async () => {
				inventoryReader.read.mockResolvedValue(inventoryWith([invoices('p2')]));
				sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
					new Map([['wa1', mock<Project>({ id: 'p1', name: 'Alpha', type: 'team' })]]),
				);

				expect(await movedConflict()).toEqual([
					{
						kind: 'workflow',
						code: 'moved',
						id: 'wa1',
						name: 'Invoices',
						project: { id: 'p2', name: 'Beta' },
						projectExists: true,
						instanceProject: { id: 'p1', name: 'Alpha' },
					},
				]);
			});

			it('blocks a folder that the branch holds in another project', async () => {
				inventoryReader.read.mockResolvedValue(
					inventoryWith([], [{ projectId: 'p2', folder: { id: 'f1', name: 'Payments' } }]),
				);
				folderService.getFoldersByIds.mockResolvedValue([
					{ id: 'f1', homeProject: { id: 'p1', name: 'Alpha', type: 'team' } },
				] as never);

				expect(await movedConflict()).toEqual([
					expect.objectContaining({
						kind: 'folder',
						id: 'f1',
						project: { id: 'p2', name: 'Beta' },
						instanceProject: { id: 'p1', name: 'Alpha' },
					}),
				]);
			});

			it('imports when workflows and folders stay in their own project', async () => {
				inventoryReader.read.mockResolvedValue(
					inventoryWith(
						[invoices('p1')],
						[{ projectId: 'p1', folder: { id: 'f1', name: 'Payments' } }],
					),
				);
				sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
					new Map([['wa1', mock<Project>({ id: 'p1' })]]),
				);
				folderService.getFoldersByIds.mockResolvedValue([
					{ id: 'f1', homeProject: { id: 'p1' } },
				] as never);

				expect(await service.apply(ENVIRONMENT_ID, actor)).toMatchObject({ status: 'applied' });
			});
		});

		it('imports n8n with the fixed policy and counts the result by status', async () => {
			const result = await service.apply(ENVIRONMENT_ID, actor);

			expect(n8nPackagesService.planPackage).toHaveBeenCalledWith(
				{
					user: actor,
					projectConflictPolicy: 'overwrite',
					conflictPolicy: 'new-version',
					idPolicy: 'source',
					publishingPolicy: 'preserve-target-state',
					missingNodeTypeMode: 'fail',
					credentialMatchingMode: 'id-only',
					credentialMissingMode: 'must-preexist',
					credentialConflictPolicy: 'overwrite',
					folderConflictPolicy: 'overwrite',
					overwriteDeletionPolicy: 'hard-delete',
					dataTableMatchingMode: 'by-id',
					dataTableMissingMode: 'create',
					dataTableSchemaConflictPolicy: 'overwrite-non-destructive',
					variableMissingMode: 'must-preexist',
					variableConflictPolicy: 'keep-existing',
					tagMissingMode: 'create',
					tagConflictPolicy: 'rename',
					layoutConflictPolicy: 'follow-package',
					credentialPersonalRoute: 'exclude',
				},
				expect.any(GitCommitPackageReader),
				'enforce',
			);
			expect(n8nPackagesService.applyPackagePlan).toHaveBeenCalledWith(plan);
			expect(gitService.listBranchTree).toHaveBeenCalledWith(
				expect.objectContaining({
					remoteUrl: REMOTE_URL,
					branchName: 'dev',
					environmentId: ENVIRONMENT_ID,
					credentials: { authType: 'ssh-key', privateKey: 'PRIV' },
				}),
			);
			expect(result).toEqual({
				environmentId: ENVIRONMENT_ID,
				counts: {
					projects: { created: 1, updated: 1, skipped: 0, deleted: 0 },
					folders: { created: 2, updated: 3, skipped: 1, moved: 2, renamed: 2, removed: 2 },
					workflows: {
						created: 2,
						updated: 1,
						skipped: 0,
						moved: 1,
						archived: 1,
						deleted: 2,
						publishing: { published: 1, unpublished: 0, unchanged: 1, blocked: 1, failed: 0 },
					},
					credentials: { matched: 1, stubbed: 2, updated: 1 },
					dataTables: { matched: 1, created: 2, updated: 3 },
					variables: { matched: 1, created: 1, updated: 1, stubbed: 0, missing: 0 },
					tags: { matched: 0, created: 1, renamed: 1, reconciled: 0, skipped: 0 },
				},
				git: { commitSha: 'remotesha', branchName: 'dev' },
				status: 'applied',
				warnings: [],
			});
			expect(eventService.emit).toHaveBeenCalledWith('promotion-applied', {
				user: actor,
				environmentId: ENVIRONMENT_ID,
				scope: 'instance',
				outcome: 'applied',
				durationMs: expect.any(Number),
				workflowsChanged: 6,
				workflowsFailedToPublish: 0,
			});
		});

		const consumers = [
			{ project: { id: 'p1', name: 'Orders' }, workflows: [{ id: 'w1', name: 'Process order' }] },
		];
		const unresolved: PromotionApplyCheck = {
			missingProjects: [],
			missingBindings: [
				{
					kind: 'variable',
					name: 'API_URL',
					variableType: 'string',
					scope: { kind: 'global' },
					sourceValue: '',
					consumers,
				},
			],
			accessRequirements: [
				{
					kind: 'credential',
					code: 'access-required',
					sourceId: 'c1',
					name: 'Header',
					credentialType: 'httpHeaderAuth',
					consumers,
				},
			],
			conflicts: [
				{
					kind: 'variable',
					code: 'missing-definition',
					name: 'REGION',
					referenceFiles: ['workflow.json'],
					consumers,
				},
			],
			warnings: [
				{
					kind: 'variable',
					code: 'variable-shadowed',
					name: 'API_URL',
					scope: { kind: 'global' },
					consumers,
				},
			],
		};
		const request = {
			expectedSource: { environmentId: ENVIRONMENT_ID, branchName: 'dev', commitSha: 'remotesha' },
		};

		it('imports when only projects are missing', async () => {
			check.mockReturnValueOnce(
				checked({
					missingProjects: [{ id: 'p1', name: 'Orders' }],
					missingBindings: [],
					accessRequirements: [],
					conflicts: [],
					warnings: [],
				}),
			);
			expect(await service.apply(ENVIRONMENT_ID, actor)).toMatchObject({ status: 'applied' });
			expect(n8nPackagesService.applyPackagePlan).toHaveBeenCalledWith(plan);
		});

		it.each(['missingBindings', 'accessRequirements', 'conflicts'] as const)(
			'blocks on %s before import or reconciliation',
			async (group) => {
				const applyCheck = {
					missingProjects: [],
					missingBindings: [],
					accessRequirements: [],
					conflicts: [],
					warnings: [],
					[group]: unresolved[group],
				};
				check.mockReturnValueOnce(checked(applyCheck));
				expect(await service.apply(ENVIRONMENT_ID, actor)).toEqual({
					status: 'blocked',
					environmentId: ENVIRONMENT_ID,
					git: { commitSha: 'remotesha', branchName: 'dev' },
					check: applyCheck,
				});
				expect(check).toHaveBeenCalledWith(plan, packageInventory, undefined, noMoves);
				expect(n8nPackagesService.applyPackagePlan).not.toHaveBeenCalled();
				expect(eventService.emit).toHaveBeenCalledWith(
					'promotion-applied',
					expect.objectContaining({ outcome: 'blocked' }),
				);
				expect(projectService.deleteProject).not.toHaveBeenCalled();
			},
		);

		it('returns fresh groups on Continue and imports only after they clear', async () => {
			check.mockReturnValueOnce(checked(unresolved));
			expect(await service.apply(ENVIRONMENT_ID, actor)).toMatchObject({
				status: 'blocked',
				check: unresolved,
			});
			const fresh = { ...unresolved, missingBindings: [] };
			check.mockReturnValueOnce(checked(fresh));
			expect(await service.continueApply(ENVIRONMENT_ID, actor, request)).toMatchObject({
				status: 'blocked',
				check: fresh,
			});
			expect(n8nPackagesService.applyPackagePlan).not.toHaveBeenCalled();
			check.mockReturnValueOnce(
				checked({
					missingProjects: [],
					missingBindings: [],
					accessRequirements: [],
					conflicts: [],
					warnings: unresolved.warnings,
				}),
			);
			expect(await service.continueApply(ENVIRONMENT_ID, actor, request)).toMatchObject({
				status: 'applied',
				warnings: unresolved.warnings,
			});
			expect(check).toHaveBeenCalledTimes(3);
			expect(n8nPackagesService.applyPackagePlan).toHaveBeenCalledOnce();
		});

		it('imports with warnings on initial Apply', async () => {
			check.mockReturnValueOnce(
				checked({
					missingProjects: [],
					missingBindings: [],
					accessRequirements: [],
					conflicts: [],
					warnings: unresolved.warnings,
				}),
			);
			expect(await service.apply(ENVIRONMENT_ID, actor)).toMatchObject({
				status: 'applied',
				warnings: unresolved.warnings,
			});
		});

		it.each([{ commitSha: 'older' }, { branchName: 'older' }, { environmentId: 'older' }])(
			'stops Continue before the check when source differs: %j',
			async (change) => {
				expect(
					await service.continueApply(ENVIRONMENT_ID, actor, {
						expectedSource: { ...request.expectedSource, ...change },
					}),
				).toEqual({
					status: 'source-changed',
					environmentId: ENVIRONMENT_ID,
					git: { branchName: 'dev', commitSha: 'remotesha' },
				});
				expect(gitService.listBranchTree).toHaveBeenCalledOnce();
				expect(gitService.readTreeAtCommit).not.toHaveBeenCalled();
				expect(check).not.toHaveBeenCalled();
				expect(n8nPackagesService.applyPackagePlan).not.toHaveBeenCalled();
				expect(eventService.emit).toHaveBeenCalledWith(
					'promotion-applied',
					expect.objectContaining({ outcome: 'source_changed' }),
				);
				expect(projectRepository.findTeamProjectIds).not.toHaveBeenCalled();
			},
		);

		it('keeps importer errors and does not reconcile projects after failure', async () => {
			n8nPackagesService.applyPackagePlan.mockRejectedValueOnce(
				new BadRequestError('Import blocked'),
			);
			await expect(service.continueApply(ENVIRONMENT_ID, actor, request)).rejects.toThrow(
				'Import blocked',
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'promotion-applied',
				expect.objectContaining({ outcome: 'failed', failureKind: 'user' }),
			);
			expect(projectService.deleteProject).not.toHaveBeenCalled();
		});

		it('explains that the branch holds no package to import', async () => {
			gitService.readTreeAtCommit.mockResolvedValueOnce(new Map());
			await expect(service.apply(ENVIRONMENT_ID, actor)).rejects.toThrow(
				'no exported package to import',
			);
			expect(n8nPackagesService.planPackage).not.toHaveBeenCalled();
		});

		it('refuses to apply before fetching when the direction is not connected', async () => {
			gitService.hasCheckout.mockResolvedValueOnce(false);

			await expect(service.apply(ENVIRONMENT_ID, actor)).rejects.toThrow('not connected');
			expect(gitService.listBranchTree).not.toHaveBeenCalled();
			expect(n8nPackagesService.planPackage).not.toHaveBeenCalled();
		});

		describe('apply project selection', () => {
			const branchWorkflow = mock<InventoryWorkflow>({ id: 'w1', name: 'Orders', projectId: 'p1' });
			const foreignWorkflow = mock<InventoryWorkflow>({
				id: 'foreign',
				name: 'Foreign',
				projectId: 'p2',
			});
			// Owned by p1 on the instance, but the package now holds it under p2: a move.
			const movedWorkflow = mock<InventoryWorkflow>({
				id: 'moved',
				name: 'Moved',
				projectId: 'p2',
			});
			const project = mock<Project>({ id: 'p1', name: 'Alpha', type: 'team' });
			const foreignProject = mock<Project>({ id: 'p2', name: 'Ops', type: 'team' });
			const alpha = { id: 'p1', name: 'Alpha' };
			const ops = { id: 'p2', name: 'Ops' };
			const inventory = {
				projects: [
					{ ...alpha, path: 'projects/alpha' },
					{ ...ops, path: 'projects/ops' },
				],
				workflows: [branchWorkflow, foreignWorkflow, movedWorkflow],
				folders: [],
				credentials: [],
				variables: [],
				dataTables: [],
			};
			const payments = (projectId: string) => ({
				path: 'projects/any/folders/payments/folder.json',
				projectId,
				folder: { id: 'f1', name: 'Payments', parentFolderId: null },
			});

			beforeEach(async () => {
				const input = applyInput({ scope: 'projects' });
				resolver.resolveForProject.mockResolvedValue(input);
				await markCloned(input, 'dev');
				inventoryReader.read.mockResolvedValue(inventory);
				sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
					new Map([
						['deleted', project],
						['foreign', foreignProject],
						['moved', project],
					]),
				);
				n8nPackagesService.planPackageSelection.mockResolvedValue(plan);
			});

			it.each([
				{ workflowIds: ['w1'], selectedWorkflowIds: ['w1'], deletedWorkflowIds: [] },
				{ workflowIds: ['deleted'], selectedWorkflowIds: [], deletedWorkflowIds: ['deleted'] },
			])('classifies $workflowIds for import or deletion', async (selection) => {
				await service.applyProjectSelection('p1', actor, { workflowIds: selection.workflowIds });

				expect(inventoryReader.read).toHaveBeenCalledExactlyOnceWith(
					expect.any(GitCommitPackageReader),
				);
				expect(sharedWorkflowRepository.findOwnerProjectsByWorkflowIds).toHaveBeenCalledWith(
					selection.workflowIds,
				);
				const planned = {
					selectedProjectId: 'p1',
					selectedWorkflowIds: selection.selectedWorkflowIds,
					deletedWorkflowIds: selection.deletedWorkflowIds,
				};
				expect(n8nPackagesService.planPackageSelection).toHaveBeenCalledWith(
					{
						user: actor,
						overwriteDeletionPolicy: 'hard-delete',
						dataTableSchemaConflictPolicy: 'overwrite-non-destructive',
						tagConflictPolicy: 'rename',
						credentialConflictPolicy: 'overwrite',
						publishingPolicy: 'preserve-target-state',
						layoutConflictPolicy: 'follow-package',
						credentialPersonalRoute: 'exclude',
					},
					expect.any(GitCommitPackageReader),
					planned,
					'enforce',
				);
				expect(check).toHaveBeenCalledWith(plan, inventory, planned, noMoves);
			});

			it.each(['applyProjectSelection', 'continueApplyProjectSelection'] as const)(
				'%s reports a changed preview without importing',
				async (method) => {
					n8nPackagesService.exportPackageToWriter.mockResolvedValue(
						mock({ manifest: emptyManifest }),
					);
					const build = vi
						.spyOn(applyPreviewService, 'build')
						.mockResolvedValue(
							mock<Awaited<ReturnType<ApplyPreviewService['build']>>>({ revision: 'current' }),
						);

					expect(
						await service[method]('p1', actor, {
							workflowIds: ['w1'],
							expectedSource: request.expectedSource,
							expectedPreviewRevision: 'reviewed',
						}),
					).toMatchObject({ status: 'preview-changed' });
					expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('promotion-applied', {
						user: actor,
						environmentId: ENVIRONMENT_ID,
						scope: 'project',
						projectId: 'p1',
						outcome: 'preview_changed',
						durationMs: expect.any(Number),
					});
					expect(n8nPackagesService.planPackageSelection).not.toHaveBeenCalled();
					expect(n8nPackagesService.applyPackagePlan).not.toHaveBeenCalled();
					build.mockRestore();
				},
			);

			it.each([
				{ invalidIds: ['unknown'], label: 'unknown IDs' },
				{ invalidIds: ['foreign'], label: 'foreign project IDs' },
				{ invalidIds: ['unknown', 'foreign'], label: 'all invalid IDs together' },
			])('rejects $label before the check or import', async ({ invalidIds }) => {
				await expect(
					service.applyProjectSelection('p1', actor, {
						workflowIds: ['w1', 'deleted', ...invalidIds],
					}),
				).rejects.toMatchObject({
					httpStatusCode: 400,
					message: `The following workflows are not in this project's branch or instance: ${invalidIds.join(', ')}`,
				});
				expect(n8nPackagesService.planPackageSelection).not.toHaveBeenCalled();
			});

			it('blocks a workflow that moved into the project, and names both projects', async () => {
				// The branch holds `moved-in` under p1, while this instance still has it in p2.
				inventoryReader.read.mockResolvedValue({
					...inventory,
					workflows: [
						...inventory.workflows,
						mock<InventoryWorkflow>({ id: 'moved-in', name: 'Moved in', projectId: 'p1' }),
					],
				});
				sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
					new Map([['moved-in', foreignProject]]),
				);

				expect(
					await service.applyProjectSelection('p1', actor, { workflowIds: ['moved-in'] }),
				).toMatchObject({
					status: 'blocked',
					check: {
						conflicts: [
							expect.objectContaining({
								kind: 'workflow',
								code: 'moved',
								id: 'moved-in',
								project: alpha,
								instanceProject: ops,
							}),
						],
					},
				});
				expect(n8nPackagesService.applyPackagePlan).not.toHaveBeenCalled();
			});

			it('blocks every selection while a folder of this project on the branch is elsewhere here', async () => {
				inventoryReader.read.mockResolvedValue({ ...inventory, folders: [payments('p1')] });
				folderService.getFoldersByIds.mockResolvedValue([
					{ id: 'f1', homeProject: { id: 'p2', name: 'Ops', type: 'team' } },
				] as never);

				expect(
					await service.applyProjectSelection('p1', actor, { workflowIds: ['w1'] }),
				).toMatchObject({
					status: 'blocked',
					check: {
						conflicts: [
							expect.objectContaining({
								kind: 'folder',
								code: 'moved',
								id: 'f1',
								project: alpha,
								instanceProject: ops,
							}),
						],
					},
				});
				expect(n8nPackagesService.applyPackagePlan).not.toHaveBeenCalled();
			});

			it('applies while a folder of this project moved to another project on the branch', async () => {
				// The import of this project never reads a folder the branch holds elsewhere.
				inventoryReader.read.mockResolvedValue({ ...inventory, folders: [payments('p2')] });
				folderService.getFoldersByIds.mockResolvedValue([
					{ id: 'f1', homeProject: { id: 'p1', name: 'Alpha', type: 'team' } },
				] as never);

				await service.applyProjectSelection('p1', actor, { workflowIds: ['w1'] });

				expect(n8nPackagesService.applyPackagePlan).toHaveBeenCalled();
			});

			// Duplicate ids are rejected by ApplySelectionDto before the service runs.
			// See promotion-operations.dto.test.ts.

			describe.each(['applyProjectSelection', 'continueApplyProjectSelection'] as const)(
				'%s',
				(method) => {
					it.each([{ commitSha: 'older' }, { branchName: 'older' }, { environmentId: 'older' }])(
						'stops before classification when source differs: %j',
						async (change) => {
							expect(
								await service[method]('p1', actor, {
									workflowIds: ['w1'],
									expectedSource: { ...request.expectedSource, ...change },
								}),
							).toEqual({
								status: 'source-changed',
								environmentId: ENVIRONMENT_ID,
								git: { branchName: 'dev', commitSha: 'remotesha' },
							});
							expect(gitService.listBranchTree).toHaveBeenCalledOnce();
							expect(inventoryReader.read).not.toHaveBeenCalled();
							expect(n8nPackagesService.planPackageSelection).not.toHaveBeenCalled();
						},
					);

					it.each(['missingBindings', 'accessRequirements', 'conflicts'] as const)(
						'blocks on scoped %s before import',
						async (group) => {
							const applyCheck = {
								missingProjects: [],
								missingBindings: [],
								accessRequirements: [],
								conflicts: [],
								warnings: [],
								[group]: unresolved[group],
							};
							check.mockReturnValueOnce(checked(applyCheck));
							expect(
								await service[method]('p1', actor, {
									workflowIds: ['w1', 'deleted'],
									...request,
								}),
							).toEqual({
								status: 'blocked',
								environmentId: ENVIRONMENT_ID,
								git: { branchName: 'dev', commitSha: 'remotesha' },
								check: applyCheck,
							});
							expect(check).toHaveBeenCalledWith(
								plan,
								inventory,
								{
									selectedProjectId: 'p1',
									selectedWorkflowIds: ['w1'],
									deletedWorkflowIds: ['deleted'],
								},
								noMoves,
							);
							expect(n8nPackagesService.applyPackagePlan).not.toHaveBeenCalled();
							expect(projectRepository.findTeamProjectIds).not.toHaveBeenCalled();
							expect(projectService.deleteProject).not.toHaveBeenCalled();
						},
					);

					it('imports the selection and returns counts without project reconciliation', async () => {
						check.mockReturnValueOnce(
							checked({
								missingProjects: [],
								missingBindings: [],
								accessRequirements: [],
								conflicts: [],
								warnings: unresolved.warnings,
							}),
						);
						const result = await service[method]('p1', actor, {
							workflowIds: ['w1', 'deleted'],
							...request,
						});

						expect(resolver.resolveForProject).toHaveBeenCalledWith('p1', 'apply');
						expect(n8nPackagesService.planPackageSelection).toHaveBeenCalledExactlyOnceWith(
							expect.objectContaining({ publishingPolicy: 'preserve-target-state' }),
							expect.any(GitCommitPackageReader),
							{
								selectedProjectId: 'p1',
								selectedWorkflowIds: ['w1'],
								deletedWorkflowIds: ['deleted'],
							},
							'enforce',
						);
						expect(n8nPackagesService.applyPackagePlan).toHaveBeenCalledExactlyOnceWith(plan);
						expect(n8nPackagesService.planPackage).not.toHaveBeenCalled();
						expect(projectRepository.findTeamProjectIds).not.toHaveBeenCalled();
						expect(projectService.deleteProject).not.toHaveBeenCalled();
						expect(result).toMatchObject({
							status: 'applied',
							environmentId: ENVIRONMENT_ID,
							git: { branchName: 'dev', commitSha: 'remotesha' },
							counts: {
								projects: { created: 1, updated: 1, skipped: 0, deleted: 0 },
								workflows: { created: 2, updated: 1, skipped: 0, archived: 1, deleted: 2 },
							},
							warnings: unresolved.warnings,
						});
					});
				},
			);
		});
	});
});
