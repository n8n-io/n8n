import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	mockLogger,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { FolderRepository, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import assert from 'node:assert';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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
import { buildWorkflowReferencingCredential } from '@/modules/n8n-packages/__tests__/utils/test-builders';
import { ProjectService } from '@/services/project.service.ee';
import { saveCredential } from '@test-integration/db/credentials';
import { createFolder } from '@test-integration/db/folders';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import type { GitConnection } from '../database/entities/git-connection.entity';
import { GitConnectionProjectRepository } from '../database/repositories/git-connection-project.repository';
import { GitConnectionRepository } from '../database/repositories/git-connection.repository';
import { GitConnectionsGitService } from '../git-connections-git.service';
import { GitConnectionsService } from '../git-connections.service';
import { WorkingCopyUpdater } from '../working-copy-updater';

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
		'CredentialsEntity',
		'SharedCredentials',
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
		instanceId: 'inst-roundtrip',
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
		new WorkingCopyUpdater(instanceSettings),
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

async function createConnection(repositoryUrl: string): Promise<GitConnection> {
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
		}),
	);
}

async function inspectBranch(
	bareDir: string,
	branch = 'main',
): Promise<{ git: SimpleGit; dir: string }> {
	const inspectionDir = path.join(testRoot, `inspection-${Date.now()}`);
	await simpleGit().clone(bareDir, inspectionDir, ['--branch', branch, '--single-branch']);
	return { git: simpleGit(inspectionDir), dir: inspectionDir };
}

async function readBranchManifest(inspectionDir: string) {
	return packageManifestSchema.parse(
		jsonParse(await readFile(path.join(inspectionDir, 'n8n-export', 'manifest.json'), 'utf-8')),
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
		expect(result.counts.workflows).toBe(1);
		expect((await connectionRepository.findOneByOrFail({ id: connection.id })).baseCommit).toBe(
			remoteHead,
		);
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

describe('Selective push', () => {
	async function setupProjectWithWorkflows(
		projectName: string,
		workflowNames: string[],
		connectionId: string,
	) {
		const project = await createTeamProject(projectName, owner);
		await connectionProjectRepository.linkProject(project.id, connectionId);
		const workflows = [];
		for (const name of workflowNames) {
			workflows.push(await createWorkflow({ name, nodes: [], connections: {} }, project));
		}
		return { project, workflows };
	}

	it('adds only the selected workflow, leaving existing workflows untouched', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const { project, workflows } = await setupProjectWithWorkflows(
			'Orders',
			['w1', 'w2', 'w3'],
			connection.id,
		);

		await service.push(connection.id, owner, { commitMessage: 'Full push' });

		const w4 = await createWorkflow({ name: 'w4', nodes: [], connections: {} }, project);

		const result = await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Add w4' },
			{ projectId: project.id, workflowIds: [w4.id], deletedWorkflowIds: [] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);

		expect(manifest.workflows).toHaveLength(4);
		const workflowIds = manifest.workflows!.map((w) => w.id);
		expect(workflowIds).toContain(w4.id);
		for (const w of workflows) {
			expect(workflowIds).toContain(w.id);
		}
		expect(result.counts.workflows).toBe(1);
	});

	it('updates only the selected workflow, leaving others untouched', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const { project, workflows } = await setupProjectWithWorkflows(
			'Orders',
			['w1', 'w2', 'w3'],
			connection.id,
		);

		await service.push(connection.id, owner, { commitMessage: 'Full push' });
		const before = await inspectBranch(remote.bareDir);
		const w1Target = (await readBranchManifest(before.dir)).workflows!.find(
			(w) => w.id === workflows[0].id,
		)!.target;
		const w1FileBefore = await readFile(
			path.join(before.dir, 'n8n-export', w1Target, 'workflow.json'),
			'utf-8',
		);

		// Change both w1 and w2 on the instance, but select only w2. A regression to
		// a full push would carry the w1 change to the branch as well.
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

		await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Update w2' },
			{
				projectId: project.id,
				workflowIds: [workflows[1].id],
				deletedWorkflowIds: [],
			},
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);

		expect(manifest.workflows).toHaveLength(3);
		expect(manifest.workflows!.find((w) => w.id === workflows[1].id)!.name).toBe('w2-updated');

		const w1Entry = manifest.workflows!.find((w) => w.id === workflows[0].id)!;
		expect(w1Entry).toEqual({ id: workflows[0].id, name: 'w1', target: w1Target });
		expect(await readFile(path.join(dir, 'n8n-export', w1Target, 'workflow.json'), 'utf-8')).toBe(
			w1FileBefore,
		);
	});

	it('keeps a workflow the committed manifest lost, because the directories decide', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const { project, workflows } = await setupProjectWithWorkflows(
			'Orders',
			['w1', 'w2'],
			connection.id,
		);

		await service.push(connection.id, owner, { commitMessage: 'Full push' });
		const before = await inspectBranch(remote.bareDir);
		const w1Target = (await readBranchManifest(before.dir)).workflows!.find(
			(w) => w.id === workflows[0].id,
		)!.target;

		// A merge that went wrong drops the entries from the manifest, while the
		// directories on the branch stay intact.
		const workingCopy = path.join(
			testRoot,
			'instance',
			'git-connections',
			connection.id,
			'repository',
		);
		const { workflows: _lost, ...withoutEntries } = await readBranchManifest(workingCopy);
		await writeFile(
			path.join(workingCopy, 'n8n-export', 'manifest.json'),
			JSON.stringify(withoutEntries, null, '\t'),
		);

		await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Update w2' },
			{ projectId: project.id, workflowIds: [workflows[1].id], deletedWorkflowIds: [] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);

		expect(manifest.workflows).toEqual(
			expect.arrayContaining([{ id: workflows[0].id, name: 'w1', target: w1Target }]),
		);
		await expect(
			stat(path.join(dir, 'n8n-export', w1Target, 'workflow.json')),
		).resolves.toBeDefined();
	});

	it('deletes the selected workflow from the branch', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const { project, workflows } = await setupProjectWithWorkflows(
			'Orders',
			['w1', 'w2', 'w3'],
			connection.id,
		);

		await service.push(connection.id, owner, { commitMessage: 'Full push' });

		await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Delete w3' },
			{
				projectId: project.id,
				workflowIds: [],
				deletedWorkflowIds: [workflows[2].id],
			},
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);

		expect(manifest.workflows).toHaveLength(2);
		const workflowIds = manifest.workflows!.map((w) => w.id);
		expect(workflowIds).not.toContain(workflows[2].id);
		expect(workflowIds).toContain(workflows[0].id);
		expect(workflowIds).toContain(workflows[1].id);
	});

	it('handles add and delete in the same push atomically', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const { project, workflows } = await setupProjectWithWorkflows(
			'Orders',
			['w1', 'w2', 'w3'],
			connection.id,
		);

		await service.push(connection.id, owner, { commitMessage: 'Full push' });

		const w4 = await createWorkflow({ name: 'w4', nodes: [], connections: {} }, project);

		await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Add w4, delete w3' },
			{
				projectId: project.id,
				workflowIds: [w4.id],
				deletedWorkflowIds: [workflows[2].id],
			},
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);

		expect(manifest.workflows).toHaveLength(3);
		const workflowIds = manifest.workflows!.map((w) => w.id);
		expect(workflowIds).toContain(w4.id);
		expect(workflowIds).not.toContain(workflows[2].id);
	});

	it('preserves workflows from other projects during selective push', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const { project: p1, workflows: p1Workflows } = await setupProjectWithWorkflows(
			'Orders',
			['p1-w1'],
			connection.id,
		);
		const { workflows: p2Workflows } = await setupProjectWithWorkflows(
			'Billing',
			['p2-w1'],
			connection.id,
		);

		await service.push(connection.id, owner, { commitMessage: 'Full push' });

		const p1w2 = await createWorkflow({ name: 'p1-w2', nodes: [], connections: {} }, p1);

		await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Add p1-w2' },
			{ projectId: p1.id, workflowIds: [p1w2.id], deletedWorkflowIds: [] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);

		const workflowIds = manifest.workflows!.map((w) => w.id);
		expect(workflowIds).toContain(p1Workflows[0].id);
		expect(workflowIds).toContain(p1w2.id);
		expect(workflowIds).toContain(p2Workflows[0].id);
	});

	async function saveProjectCredential(name: string, project: Project) {
		return await saveCredential(
			{ name, type: 'httpHeaderAuth', data: { name: 'X-Auth', value: 'secret' } },
			{ project, role: 'credential:owner' },
		);
	}

	it('pushes only the dependencies of the selected workflows', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const { project } = await setupProjectWithWorkflows('Orders', [], connection.id);
		const credA = await saveProjectCredential('Cred A', project);
		const credB = await saveProjectCredential('Cred B', project);
		const w1 = await buildWorkflowReferencingCredential({ name: 'w1', project, credential: credA });
		await buildWorkflowReferencingCredential({ name: 'w2', project, credential: credB });

		await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Push w1' },
			{ projectId: project.id, workflowIds: [w1.id], deletedWorkflowIds: [] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);

		expect(manifest.workflows!.map((w) => w.id)).toEqual([w1.id]);
		expect(manifest.credentials!.map((c) => c.id)).toEqual([credA.id]);
		expect(manifest.requirements?.credentials).toEqual([
			expect.objectContaining({ id: credA.id, usedByWorkflows: [w1.id] }),
		]);
		const credentialDir = path.join(dir, 'n8n-export', manifest.credentials![0].target);
		await expect(stat(path.join(credentialDir, 'credential.json'))).resolves.toBeDefined();
	});

	it('removes a dependency from the branch together with its last user', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const { project } = await setupProjectWithWorkflows('Orders', [], connection.id);
		const shared = await saveProjectCredential('Shared', project);
		const onlyW1 = await saveProjectCredential('Only W1', project);
		const w1 = await buildWorkflowReferencingCredential({
			name: 'w1',
			project,
			credential: onlyW1,
		});
		const w2 = await buildWorkflowReferencingCredential({
			name: 'w2',
			project,
			credential: shared,
		});

		await service.push(connection.id, owner, { commitMessage: 'Full push' });
		const before = await readBranchManifest((await inspectBranch(remote.bareDir)).dir);
		const onlyW1Target = before.credentials!.find((c) => c.id === onlyW1.id)!.target;

		await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Delete w1' },
			{ projectId: project.id, workflowIds: [], deletedWorkflowIds: [w1.id] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);

		expect(manifest.workflows!.map((w) => w.id)).toEqual([w2.id]);
		expect(manifest.credentials!.map((c) => c.id)).toEqual([shared.id]);
		expect(manifest.requirements?.credentials).toEqual([
			expect.objectContaining({ id: shared.id, usedByWorkflows: [w2.id] }),
		]);
		await expect(stat(path.join(dir, 'n8n-export', onlyW1Target))).rejects.toThrow();
	});

	it('moves a renamed workflow to its new directory and removes the old one', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const { project, workflows } = await setupProjectWithWorkflows(
			'Orders',
			['w1', 'w2'],
			connection.id,
		);

		await service.push(connection.id, owner, { commitMessage: 'Full push' });
		const before = await readBranchManifest((await inspectBranch(remote.bareDir)).dir);
		const oldTarget = before.workflows!.find((w) => w.id === workflows[1].id)!.target;

		await Container.get(WorkflowRepository).update(workflows[1].id, { name: 'Renamed' });
		await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Rename w2' },
			{ projectId: project.id, workflowIds: [workflows[1].id], deletedWorkflowIds: [] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);
		const renamed = manifest.workflows!.find((w) => w.id === workflows[1].id)!;

		expect(renamed.name).toBe('Renamed');
		expect(renamed.target).not.toBe(oldTarget);
		expect(renamed.target).toMatch(/\/workflows\/renamed$/);
		await expect(
			stat(path.join(dir, 'n8n-export', renamed.target, 'workflow.json')),
		).resolves.toBeDefined();
		await expect(stat(path.join(dir, 'n8n-export', oldTarget))).rejects.toThrow();
		expect(manifest.workflows).toHaveLength(2);
	});

	it('moves unselected workflows with their renamed folder so the branch still pulls', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const project = await createTeamProject('Orders', owner);
		await connectionProjectRepository.linkProject(project.id, connection.id);
		const folder = await createFolder(project, { name: 'Sales' });
		const selected = await createWorkflow(
			{ name: 'Selected', nodes: [], connections: {}, parentFolder: folder },
			project,
		);
		const unselected = await createWorkflow(
			{ name: 'Unselected', nodes: [], connections: {}, parentFolder: folder },
			project,
		);
		await service.push(connection.id, owner, { commitMessage: 'Full push' });

		const folderRepository = Container.get(FolderRepository);
		await folderRepository.update(folder.id, { name: 'Revenue' });
		await service.pushSelection(
			connection.id,
			owner,
			{ commitMessage: 'Rename folder, push one workflow' },
			{ projectId: project.id, workflowIds: [selected.id], deletedWorkflowIds: [] },
		);

		const { dir } = await inspectBranch(remote.bareDir);
		const manifest = await readBranchManifest(dir);
		const folderEntry = manifest.folders!.find((f) => f.id === folder.id)!;
		const unselectedEntry = manifest.workflows!.find((w) => w.id === unselected.id)!;

		expect(folderEntry.target).toMatch(/\/folders\/revenue$/);
		expect(unselectedEntry.target).toBe(`${folderEntry.target}/workflows/unselected`);
		await expect(
			stat(path.join(dir, 'n8n-export', unselectedEntry.target, 'workflow.json')),
		).resolves.toBeDefined();
		await expect(
			stat(path.join(dir, 'n8n-export', folderEntry.target.replace(/revenue$/, 'sales'))),
		).rejects.toThrow();

		// The importer resolves a workflow's folder from its path, so the moved
		// workflow must come back into the renamed folder on pull.
		const workflowRepository = Container.get(WorkflowRepository);
		await workflowRepository.delete(unselected.id);
		await service.pull(connection.id, owner);

		expect(
			await workflowRepository.findOne({
				where: { id: unselected.id },
				relations: ['parentFolder'],
			}),
		).toMatchObject({ name: 'Unselected', parentFolder: { id: folder.id } });
	});
});
