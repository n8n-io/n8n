import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	mockLogger,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { FolderRepository, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import assert from 'node:assert';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { buildWorkflowReferencingVariables } from '@/modules/n8n-packages/__tests__/utils/test-builders';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import { ProjectService } from '@/services/project.service.ee';
import { createFolder } from '@test-integration/db/folders';
import { createOwner } from '@test-integration/db/users';
import { createVariable } from '@test-integration/db/variables';
import { LicenseMocker } from '@test-integration/license';

import { PromotionConfigRepository } from '../database/repositories/promotion-config.repository';
import { PromotionConnectionProjectRepository } from '../database/repositories/promotion-connection-project.repository';
import { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionConfigResolver } from '../promotion-config.resolver';
import { PromotionProvidersService } from '../promotion-providers.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import { PromotionsGitService } from '../promotions-git.service';
import { PromotionsService } from '../promotions.service';
import { WorkingCopyUpdater } from '../working-copy-updater';

type TestRemote = {
	bareDir: string;
	workingDir: string;
	git: SimpleGit;
};

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

let providerRepository: PromotionProviderRepository;
let connectionRepository: PromotionConnectionRepository;
let configRepository: PromotionConfigRepository;
let linkRepository: PromotionConnectionProjectRepository;
let projectRepository: ProjectRepository;
let projectService: ProjectService;
let packagesService: N8nPackagesService;
let owner: User;
let testRoot: string;
let service: PromotionsService;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'promotions']);
	await testDb.init();

	providerRepository = Container.get(PromotionProviderRepository);
	connectionRepository = Container.get(PromotionConnectionRepository);
	configRepository = Container.get(PromotionConfigRepository);
	linkRepository = Container.get(PromotionConnectionProjectRepository);
	projectRepository = Container.get(ProjectRepository);
	projectService = Container.get(ProjectService);
	packagesService = Container.get(N8nPackagesService);

	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin', 'feat:folders'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	// Delete children before parents to satisfy the foreign keys.
	await linkRepository.delete({});
	await configRepository.delete({});
	await connectionRepository.delete({});
	await providerRepository.delete({});
	await testDb.truncate([
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
		'Variables',
	]);
	await Container.get(VariablesService).updateCache();
	licenseMocker.reset();
	owner = await createOwner();
	testRoot = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-roundtrip-'));

	// The stored payload is written in plaintext, so the identity cipher can read it back.
	const cipher = mock<Cipher>();
	cipher.decryptV2.mockImplementation(async (value) => value);
	cipher.encryptV2.mockImplementation(async (value) => String(value));
	const logger = mockLogger();
	const gitService = new PromotionsGitService(logger);
	const instanceSettings = mock<InstanceSettings>({
		n8nFolder: path.join(testRoot, 'instance'),
		instanceId: 'inst-test',
	});
	service = new PromotionsService(
		new PromotionConfigResolver(
			configRepository,
			connectionRepository,
			linkRepository,
			projectRepository,
		),
		new PromotionProvidersService(providerRepository, connectionRepository, gitService, cipher),
		new PromotionWorkingDirectoryService(instanceSettings),
		new WorkingCopyUpdater(instanceSettings, logger),
		gitService,
		projectRepository,
		projectService,
		packagesService,
		logger,
	);
});

afterEach(async () => {
	// A finished git process can still hold a file for a moment, so retry.
	await rm(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

async function createRemote(): Promise<TestRemote> {
	const bareDir = path.join(testRoot, 'remote.git');
	const workingDir = path.join(testRoot, 'remote-working');
	await simpleGit().raw(['init', '--bare', bareDir]);
	await simpleGit().raw(['init', '--initial-branch=main', workingDir]);

	const git = simpleGit(workingDir);
	await git.addConfig('user.name', 'n8n test');
	await git.addConfig('user.email', 'n8n-test@example.com');
	await writeFile(path.join(workingDir, 'README.md'), '# n8n promotions test\n');
	await git.add(['README.md']);
	await git.commit('Initial commit');
	await git.raw(['remote', 'add', 'origin', bareDir]);
	await git.raw(['push', '--set-upstream', 'origin', 'main']);

	return { bareDir, workingDir, git };
}

/**
 * Writes the fixture through the repositories, so the local bare path is not
 * checked by the production remote URL validator.
 */
/** Branches the remote already has, so a clone finds them. */
async function createRemoteBranches(remote: TestRemote, branchNames: string[]) {
	for (const branchName of branchNames) {
		await remote.git.raw(['branch', branchName, 'main']);
	}
	await remote.git.raw(['push', 'origin', '--all']);
}

async function createInstanceConnection(
	remoteUrl: string,
	branches: { apply: string; promote: string } = { apply: 'main', promote: 'main' },
) {
	const provider = await providerRepository.insertProvider({
		name: 'Bot user',
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: JSON.stringify({
			schemaVersion: 1,
			username: 'git-user',
			password: 'git-password',
		}),
	});
	const connection = await connectionRepository.insertConnection({
		name: 'Production',
		scope: 'instance',
		providerId: provider.id,
		target: { schemaVersion: 1, remoteUrl },
	});
	await configRepository.insertConfig({
		connectionId: connection.id,
		direction: 'apply',
		name: 'Apply',
		settings: { schemaVersion: 1, branchName: branches.apply },
	});
	await configRepository.insertConfig({
		connectionId: connection.id,
		direction: 'promote',
		name: 'Promote',
		settings: {
			schemaVersion: 1,
			baseBranchName: branches.promote,
			createBranchOnPromotion: false,
		},
	});
	return connection;
}

async function inspectBranch(
	bareDir: string,
	branch = 'main',
): Promise<{ git: SimpleGit; dir: string }> {
	const inspectionDir = path.join(testRoot, `inspection-${Date.now()}`);
	await simpleGit().clone(bareDir, inspectionDir, ['--branch', branch, '--single-branch']);
	return { git: simpleGit(inspectionDir), dir: inspectionDir };
}

async function readBranchEntities(
	inspectionDir: string,
	fileName: 'workflow.json' | 'folder.json' | 'project.json',
): Promise<Array<{ id: string; name: string; target: string }>> {
	const exportRoot = path.join(inspectionDir, 'n8n-export');
	const found: Array<{ id: string; name: string; target: string }> = [];
	const walk = async (dir: string): Promise<void> => {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
				continue;
			}
			if (entry.name !== fileName) continue;
			const parsed = jsonParse<{ id: string; name: string }>(await readFile(fullPath, 'utf-8'));
			found.push({
				id: parsed.id,
				name: parsed.name,
				target: path.relative(exportRoot, path.dirname(fullPath)).split(path.sep).join('/'),
			});
		}
	};
	await walk(exportRoot);
	return found;
}

async function setupProjectWithWorkflows(projectName: string, workflowNames: string[]) {
	const project = await createTeamProject(projectName, owner);
	const workflows = [];
	for (const name of workflowNames) {
		workflows.push(await createWorkflow({ name, nodes: [], connections: {} }, project));
	}
	return { project, workflows };
}

describe('Promote and Apply', () => {
	it('rejects a missing branch when the remote contains only tags', async () => {
		const remote = await createRemote();
		await remote.git.raw(['push', 'origin', 'HEAD:refs/tags/v1']);
		await simpleGit(remote.bareDir).raw(['update-ref', '-d', 'refs/heads/main']);
		const connection = await createInstanceConnection(remote.bareDir);

		await expect(service.clone(connection.id, 'promote')).rejects.toThrow(
			'Remote branch does not exist: main',
		);
	});

	it.each([false, true])(
		'checks permission before exporting referenced variable values: %s',
		async (canExportVariableValues) => {
			const remote = await createRemote();
			const connection = await createInstanceConnection(remote.bareDir);
			await service.clone(connection.id, 'promote');
			const originalHead = (await simpleGit(remote.bareDir).revparse(['main'])).trim();
			const project = await createTeamProject('Orders', owner);
			await createVariable('API_URL', 'https://api.example.com');
			await buildWorkflowReferencingVariables({
				name: 'Process order',
				project,
				variableNames: ['API_URL'],
			});

			const result = service.promote(connection.id, owner, {
				commitMessage: 'Export orders',
				canExportVariableValues,
			});

			if (canExportVariableValues) {
				await expect(result).resolves.toMatchObject({ counts: { variables: 1 } });
				expect((await simpleGit(remote.bareDir).revparse(['main'])).trim()).not.toBe(originalHead);
			} else {
				await expect(result).rejects.toThrow('variable:list');
				expect((await simpleGit(remote.bareDir).revparse(['main'])).trim()).toBe(originalHead);
			}
		},
	);

	it('exports all team projects, commits them, and pushes them to the base branch', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);

		const result = await service.promote(connection.id, owner, {
			canExportVariableValues: false,
			commitMessage: 'Export orders',
		});

		const inspectionDir = path.join(testRoot, 'promote-inspection');
		await simpleGit().clone(remote.bareDir, inspectionDir, ['--branch', 'main', '--single-branch']);
		const inspectionGit = simpleGit(inspectionDir);
		const remoteHead = (await inspectionGit.revparse(['HEAD'])).trim();
		const pushedCommit = (await inspectionGit.log({ maxCount: 1 })).latest;
		const manifest = packageManifestSchema.parse(
			jsonParse(await readFile(path.join(inspectionDir, 'n8n-export', 'manifest.json'), 'utf-8')),
		);
		const projectEntry = manifest.projects?.find(({ id }) => id === project.id);
		const workflowEntry = manifest.workflows?.find(({ id }) => id === workflow.id);

		assert(projectEntry);
		assert(workflowEntry);
		assert(pushedCommit);
		assert(owner.firstName);
		assert(owner.lastName);
		expect(pushedCommit).toMatchObject({
			hash: remoteHead,
			message: 'Export orders',
			author_name: `${owner.firstName} ${owner.lastName}`,
			author_email: owner.email,
		});
		await expect(readFile(path.join(inspectionDir, 'README.md'), 'utf-8')).resolves.toContain(
			'n8n promotions test',
		);
		await expect(
			readFile(path.join(inspectionDir, 'n8n-export', projectEntry.target, 'project.json')),
		).resolves.toBeDefined();
		await expect(
			readFile(path.join(inspectionDir, 'n8n-export', workflowEntry.target, 'workflow.json')),
		).resolves.toBeDefined();
		expect(result.git).toEqual({ commitSha: remoteHead, branchName: 'main' });
		expect(result.counts.workflows).toBe(1);
	});

	it('applies the package and makes the managed target scope match it', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'apply');

		const sourceProject = await createTeamProject('Orders', owner);
		const sourceWorkflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			sourceProject,
		);
		await packagesService.exportPackageToDirectory(
			{
				user: owner,
				projectIds: [sourceProject.id],
				includeVariableValues: true,
				includeTags: true,
				missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.Fail,
				workflowVersionPolicy: WorkflowVersionPolicy.Latest,
			},
			{ targetDir: path.join(remote.workingDir, 'n8n-export') },
		);
		await remote.git.add(['--all']);
		await remote.git.commit('Export orders');
		await remote.git.push('origin', 'main');
		const remoteHead = (await remote.git.revparse(['HEAD'])).trim();

		await projectService.deleteProject(owner, sourceProject.id);
		const targetProject = await projectService.createTeamProject(
			owner,
			{ name: 'Orders (outdated)' },
			{ id: sourceProject.id },
		);
		const targetOnlyFolder = await createFolder(targetProject, { name: 'Legacy' });
		const targetOnlyWorkflow = await createWorkflow(
			{ name: 'Old order flow', nodes: [], connections: {}, parentFolder: targetOnlyFolder },
			targetProject,
		);
		const removedProject = await createTeamProject('Removed from Git', owner);

		const result = await service.apply(connection.id, owner);

		expect(await projectRepository.findOneBy({ id: removedProject.id })).toBeNull();
		expect(await projectRepository.findOneBy({ id: targetProject.id })).toMatchObject({
			name: 'Orders',
		});
		expect(
			await Container.get(WorkflowRepository).findOneBy({ id: sourceWorkflow.id }),
		).toMatchObject({ name: 'Process order' });
		expect(
			await Container.get(WorkflowRepository).findOneBy({ id: targetOnlyWorkflow.id }),
		).toBeNull();
		expect(await Container.get(FolderRepository).findOneBy({ id: targetOnlyFolder.id })).toBeNull();
		expect(result.counts.projects.deleted).toBe(1);
		expect(result.counts.workflows.deleted).toBe(1);
		expect(result.counts.folders.removed).toBe(1);
		expect(result.git).toEqual({ commitSha: remoteHead, branchName: 'main' });
	});

	it('promotes an archived workflow and archives it on apply instead of removing it', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');
		await service.clone(connection.id, 'apply');

		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);
		const workflowRepository = Container.get(WorkflowRepository);
		await workflowRepository.update(workflow.id, { isArchived: true });

		const promoteResult = await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Archive order flow',
		});
		expect(promoteResult.counts.workflows).toBe(1);

		// The target still holds the active copy; the apply must archive it, not delete it.
		await workflowRepository.update(workflow.id, { isArchived: false });

		const firstApply = await service.apply(connection.id, owner);

		expect(await workflowRepository.findOneBy({ id: workflow.id })).toMatchObject({
			isArchived: true,
		});
		expect(firstApply.counts.workflows).toMatchObject({ updated: 1, deleted: 0, archived: 0 });

		// Archived on both sides now; a second apply must still succeed.
		const secondApply = await service.apply(connection.id, owner);

		expect(secondApply.counts.workflows).toMatchObject({ updated: 1, deleted: 0 });
		expect(await workflowRepository.findOneBy({ id: workflow.id })).toMatchObject({
			isArchived: true,
		});
	});

	it('promotes to its base branch and applies from a different branch', async () => {
		const remote = await createRemote();
		await createRemoteBranches(remote, ['staging', 'dev']);
		const connection = await createInstanceConnection(remote.bareDir, {
			apply: 'dev',
			promote: 'staging',
		});
		await service.clone(connection.id, 'promote');
		await service.clone(connection.id, 'apply');

		// Seed `dev` with a package from somewhere else, then take that project away
		// so the Apply has to bring it back.
		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);
		const promoteResult = await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Promote to staging',
		});
		await remote.git.raw(['fetch', 'origin']);
		await remote.git.raw(['push', 'origin', 'refs/remotes/origin/staging:refs/heads/dev']);
		const devHead = (await remote.git.revparse(['origin/staging'])).trim();
		await Container.get(WorkflowRepository).delete({ id: workflow.id });

		const applyResult = await service.apply(connection.id, owner);

		expect(promoteResult.git.branchName).toBe('staging');
		expect(applyResult.git).toEqual({ commitSha: devHead, branchName: 'dev' });
		expect(await Container.get(WorkflowRepository).findOneBy({ id: workflow.id })).toMatchObject({
			name: 'Process order',
		});

		// `main` never took part, so the packageless branch is untouched.
		const inspectionDir = path.join(testRoot, 'main-inspection');
		await simpleGit().clone(remote.bareDir, inspectionDir, ['--branch', 'main', '--single-branch']);
		await expect(
			readFile(path.join(inspectionDir, 'n8n-export', 'manifest.json')),
		).rejects.toThrow();
	});
});

describe('Promote a selection', () => {
	it('adds only the selected workflow, leaving existing workflows untouched', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2', 'w3']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		const w4 = await createWorkflow({ name: 'w4', nodes: [], connections: {} }, project);
		const result = await service.promoteSelection(
			connection.id,
			owner,
			{ canExportVariableValues: true, commitMessage: 'Add w4' },
			{ projectId: project.id, workflowIds: [w4.id], deletedWorkflowIds: [] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = await readBranchEntities(dir, 'workflow.json');
		const workflowIds = onBranch.map((w) => w.id);

		expect(onBranch).toHaveLength(4);
		expect(workflowIds).toContain(w4.id);
		for (const w of workflows) {
			expect(workflowIds).toContain(w.id);
		}
		expect(result.counts.workflows).toBe(1);
	});

	it('updates only the selected workflow, leaving others untouched', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2', 'w3']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const before = await inspectBranch(remote.bareDir);
		const w1Target = (await readBranchEntities(before.dir, 'workflow.json')).find(
			(w) => w.id === workflows[0].id,
		)!.target;
		const w1FileBefore = await readFile(
			path.join(before.dir, 'n8n-export', w1Target, 'workflow.json'),
			'utf-8',
		);

		const workflowRepository = Container.get(WorkflowRepository);
		await workflowRepository.update(workflows[0].id, {
			name: 'w1-changed-but-not-selected',
			nodes: [
				{
					id: 'n1',
					name: 'NoOp',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});
		await workflowRepository.update(workflows[1].id, { name: 'w2-updated' });

		await service.promoteSelection(
			connection.id,
			owner,
			{ canExportVariableValues: true, commitMessage: 'Update w2' },
			{
				projectId: project.id,
				workflowIds: [workflows[1].id],
				deletedWorkflowIds: [],
			},
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = await readBranchEntities(dir, 'workflow.json');

		expect(onBranch).toHaveLength(3);
		expect(onBranch.find((w) => w.id === workflows[1].id)!.name).toBe('w2-updated');

		const w1Entry = onBranch.find((w) => w.id === workflows[0].id)!;
		expect(w1Entry).toEqual({ id: workflows[0].id, name: 'w1', target: w1Target });
		expect(await readFile(path.join(dir, 'n8n-export', w1Target, 'workflow.json'), 'utf-8')).toBe(
			w1FileBefore,
		);
	});

	it('deletes the selected workflow from the branch', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2', 'w3']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		await service.promoteSelection(
			connection.id,
			owner,
			{ canExportVariableValues: true, commitMessage: 'Delete w3' },
			{
				projectId: project.id,
				workflowIds: [],
				deletedWorkflowIds: [workflows[2].id],
			},
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const workflowIds = (await readBranchEntities(dir, 'workflow.json')).map((w) => w.id);

		expect(workflowIds).toHaveLength(2);
		expect(workflowIds).not.toContain(workflows[2].id);
		expect(workflowIds).toContain(workflows[0].id);
		expect(workflowIds).toContain(workflows[1].id);
	});

	it('handles add and delete in the same promote atomically', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2', 'w3']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const headAfterFull = (
			await (await inspectBranch(remote.bareDir)).git.revparse(['HEAD'])
		).trim();

		const w4 = await createWorkflow({ name: 'w4', nodes: [], connections: {} }, project);
		await service.promoteSelection(
			connection.id,
			owner,
			{ canExportVariableValues: true, commitMessage: 'Add w4, delete w3' },
			{
				projectId: project.id,
				workflowIds: [w4.id],
				deletedWorkflowIds: [workflows[2].id],
			},
		);

		const after = await inspectBranch(remote.bareDir);
		const workflowIds = (await readBranchEntities(after.dir, 'workflow.json')).map((w) => w.id);
		const commits = (await after.git.raw(['rev-list', '--count', `${headAfterFull}..HEAD`])).trim();

		expect(commits).toBe('1');
		expect(workflowIds).toHaveLength(3);
		expect(workflowIds).toContain(w4.id);
		expect(workflowIds).not.toContain(workflows[2].id);
	});

	it('preserves workflows from other projects during a selective promote', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project: p1, workflows: p1Workflows } = await setupProjectWithWorkflows('Orders', [
			'p1-w1',
		]);
		const { workflows: p2Workflows } = await setupProjectWithWorkflows('Billing', ['p2-w1']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		const p1w2 = await createWorkflow({ name: 'p1-w2', nodes: [], connections: {} }, p1);
		await service.promoteSelection(
			connection.id,
			owner,
			{ canExportVariableValues: true, commitMessage: 'Add p1-w2' },
			{ projectId: p1.id, workflowIds: [p1w2.id], deletedWorkflowIds: [] },
		);

		const workflowIds = (
			await readBranchEntities((await inspectBranch(remote.bareDir)).dir, 'workflow.json')
		).map((w) => w.id);

		expect(workflowIds).toContain(p1Workflows[0].id);
		expect(workflowIds).toContain(p1w2.id);
		expect(workflowIds).toContain(p2Workflows[0].id);
	});

	it('moves a renamed workflow to its new directory and removes the old one', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const oldTarget = (
			await readBranchEntities((await inspectBranch(remote.bareDir)).dir, 'workflow.json')
		).find((w) => w.id === workflows[1].id)!.target;

		await Container.get(WorkflowRepository).update(workflows[1].id, { name: 'Renamed' });
		await service.promoteSelection(
			connection.id,
			owner,
			{ canExportVariableValues: true, commitMessage: 'Rename w2' },
			{ projectId: project.id, workflowIds: [workflows[1].id], deletedWorkflowIds: [] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = await readBranchEntities(dir, 'workflow.json');
		const renamed = onBranch.find((w) => w.id === workflows[1].id)!;

		expect(renamed.name).toBe('Renamed');
		expect(renamed.target).not.toBe(oldTarget);
		expect(renamed.target).toMatch(new RegExp(`/workflows/renamed-${workflows[1].id}$`));
		await expect(
			stat(path.join(dir, 'n8n-export', renamed.target, 'workflow.json')),
		).resolves.toBeDefined();
		await expect(stat(path.join(dir, 'n8n-export', oldTarget))).rejects.toThrow();
		expect(onBranch).toHaveLength(2);
	});

	it('leaves a renamed folder alone, so unselected workflows keep their place', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');
		await service.clone(connection.id, 'apply');

		const project = await createTeamProject('Orders', owner);
		const folder = await createFolder(project, { name: 'Sales' });
		const selected = await createWorkflow(
			{ name: 'Selected', nodes: [], connections: {}, parentFolder: folder },
			project,
		);
		const unselected = await createWorkflow(
			{ name: 'Unselected', nodes: [], connections: {}, parentFolder: folder },
			project,
		);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const folderBefore = (
			await readBranchEntities((await inspectBranch(remote.bareDir)).dir, 'folder.json')
		).find((f) => f.id === folder.id)!;

		const folderRepository = Container.get(FolderRepository);
		await folderRepository.update(folder.id, { name: 'Revenue' });
		await service.promoteSelection(
			connection.id,
			owner,
			{ canExportVariableValues: true, commitMessage: 'Rename folder, promote one workflow' },
			{ projectId: project.id, workflowIds: [selected.id], deletedWorkflowIds: [] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const folders = await readBranchEntities(dir, 'folder.json');
		const workflows = await readBranchEntities(dir, 'workflow.json');
		const folderEntry = folders.find((f) => f.id === folder.id)!;
		const selectedEntry = workflows.find((w) => w.id === selected.id)!;
		const unselectedEntry = workflows.find((w) => w.id === unselected.id)!;

		expect(folderEntry).toMatchObject({ name: 'Sales', target: folderBefore.target });
		expect(selectedEntry.target).toBe(`${folderEntry.target}/workflows/selected-${selected.id}`);
		expect(unselectedEntry.target).toBe(
			`${folderEntry.target}/workflows/unselected-${unselected.id}`,
		);
		await expect(
			stat(path.join(dir, 'n8n-export', unselectedEntry.target, 'workflow.json')),
		).resolves.toBeDefined();
		const renamedTarget = folderEntry.target.replace(/[^/]+$/, `revenue-${folder.id}`);
		await expect(stat(path.join(dir, 'n8n-export', renamedTarget))).rejects.toThrow();

		const workflowRepository = Container.get(WorkflowRepository);
		await workflowRepository.delete(unselected.id);
		await service.apply(connection.id, owner);

		expect(
			await workflowRepository.findOne({
				where: { id: unselected.id },
				relations: ['parentFolder'],
			}),
		).toMatchObject({ name: 'Unselected', parentFolder: { id: folder.id } });
	});
});
