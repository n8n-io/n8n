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
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import { ProjectService } from '@/services/project.service.ee';
import { createFolder } from '@test-integration/db/folders';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import type { GitConnection } from '../database/entities/git-connection.entity';
import { GitConnectionProjectRepository } from '../database/repositories/git-connection-project.repository';
import { GitConnectionRepository } from '../database/repositories/git-connection.repository';
import { GitConnectionsGitService } from '../git-connections-git.service';
import { GitConnectionsService } from '../git-connections.service';

type TestRemote = {
	bareDir: string;
	workingDir: string;
	git: SimpleGit;
};

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

let connectionRepository: GitConnectionRepository;
let connectionProjectRepository: GitConnectionProjectRepository;
let projectRepository: ProjectRepository;
let projectService: ProjectService;
let packagesService: N8nPackagesService;
let owner: User;
let testRoot: string;
let service: GitConnectionsService;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'git-connections']);
	await testDb.init();

	connectionRepository = Container.get(GitConnectionRepository);
	connectionProjectRepository = Container.get(GitConnectionProjectRepository);
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
	await connectionProjectRepository.delete({});
	await connectionRepository.delete({});
	await testDb.truncate([
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
	]);
	licenseMocker.reset();
	owner = await createOwner();
	testRoot = await mkdtemp(path.join(tmpdir(), 'n8n-git-roundtrip-'));

	const cipher = mock<Cipher>();
	cipher.decryptV2.mockImplementation(async (value) => value);
	const instanceSettings = mock<InstanceSettings>({
		n8nFolder: path.join(testRoot, 'instance'),
	});
	const logger = mockLogger();
	service = new GitConnectionsService(
		connectionRepository,
		connectionProjectRepository,
		projectRepository,
		projectService,
		new GitConnectionsGitService(logger),
		packagesService,
		cipher,
		instanceSettings,
		logger,
	);
});

afterEach(async () => {
	await rm(testRoot, { recursive: true, force: true });
});

async function createRemote(): Promise<TestRemote> {
	const bareDir = path.join(testRoot, 'remote.git');
	const workingDir = path.join(testRoot, 'remote-working');
	await simpleGit().raw(['init', '--bare', bareDir]);
	await simpleGit().raw(['init', '--initial-branch=main', workingDir]);

	const git = simpleGit(workingDir);
	await git.addConfig('user.name', 'n8n test');
	await git.addConfig('user.email', 'n8n-test@example.com');
	await writeFile(path.join(workingDir, 'README.md'), '# n8n Git connection test\n');
	await git.add(['README.md']);
	await git.commit('Initial commit');
	await git.raw(['remote', 'add', 'origin', bareDir]);
	await git.raw(['push', '--set-upstream', 'origin', 'main']);

	return { bareDir, workingDir, git };
}

async function createConnection(
	repositoryUrl: string,
	overrides: Partial<GitConnection> = {},
): Promise<GitConnection> {
	return await connectionRepository.save(
		connectionRepository.create({
			name: 'Production',
			repositoryUrl,
			branchName: 'main',
			connectionType: 'https',
			publicKey: null,
			encryptedPrivateKey: null,
			encryptedUsername: 'git-user',
			encryptedPassword: 'git-password',
			keyGeneratorType: null,
			baseCommit: null,
			...overrides,
		}),
	);
}

describe('Git connection push and pull', () => {
	it('exports all team projects, commits them, and pushes them to the remote branch', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);

		const result = await service.push(connection.id, owner, {
			commitMessage: 'Export orders',
		});

		const inspectionDir = path.join(testRoot, 'push-inspection');
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
			'n8n Git connection test',
		);
		await expect(
			readFile(path.join(inspectionDir, 'n8n-export', projectEntry.target, 'project.json')),
		).resolves.toBeDefined();
		await expect(
			readFile(path.join(inspectionDir, 'n8n-export', workflowEntry.target, 'workflow.json')),
		).resolves.toBeDefined();
		expect(result.commitSha).toBe(remoteHead);
		expect(result.branchName).toBe('main');
		expect(result.counts.workflows).toBe(1);
		expect((await connectionRepository.findOneByOrFail({ id: connection.id })).baseCommit).toBe(
			remoteHead,
		);
	});

	it('pushes each promote to a new timestamped branch when the connection requires branching', async () => {
		const remote = await createRemote();
		const mainTip = (await remote.git.revparse(['HEAD'])).trim();
		const connection = await createConnection(remote.bareDir, { createBranchOnPromotion: true });
		await service.clone(connection.id);

		const project = await createTeamProject('Orders', owner);
		await createWorkflow({ name: 'Process order', nodes: [], connections: {} }, project);

		const result = await service.push(connection.id, owner, { commitMessage: 'Promote orders' });

		const remoteGit = simpleGit(remote.bareDir);
		expect(result.branchName).toMatch(
			/^n8n-promotion\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/,
		);
		// The promotion branch is the configured branch plus exactly one commit.
		expect((await remoteGit.revparse([`refs/heads/${result.branchName}`])).trim()).toBe(
			result.commitSha,
		);
		expect((await remoteGit.revparse([`${result.branchName}^`])).trim()).toBe(mainTip);
		// The configured branch and the last synced commit did not move.
		expect((await remoteGit.revparse(['refs/heads/main'])).trim()).toBe(mainTip);
		expect(
			(await connectionRepository.findOneByOrFail({ id: connection.id })).baseCommit,
		).toBeNull();

		// A second promote lands on its own branch, also one commit ahead of the base.
		const second = await service.push(connection.id, owner, { commitMessage: 'Promote again' });
		expect(second.branchName).not.toBe(result.branchName);
		expect((await remoteGit.revparse([`${second.branchName}^`])).trim()).toBe(mainTip);
	});

	it('pulls the remote snapshot and makes the managed target scope match it', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

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

		const result = await service.pull(connection.id, owner);

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
		expect(result.commitSha).toBe(remoteHead);
		expect((await connectionRepository.findOneByOrFail({ id: connection.id })).baseCommit).toBe(
			remoteHead,
		);
	});
});
