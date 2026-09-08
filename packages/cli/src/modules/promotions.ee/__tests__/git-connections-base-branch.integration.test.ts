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
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { ProjectService } from '@/services/project.service.ee';
import { saveCredential } from '@test-integration/db/credentials';
import { createTag } from '@test-integration/db/tags';
import { createOwner } from '@test-integration/db/users';
import { createVariable } from '@test-integration/db/variables';
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
let owner: User;
let testRoot: string;
let service: GitConnectionsService;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'git-connections']);
	await testDb.init();

	connectionRepository = Container.get(GitConnectionRepository);
	connectionProjectRepository = Container.get(GitConnectionProjectRepository);

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
		'WorkflowTagMapping',
		'TagEntity',
		'Variables',
		'CredentialsEntity',
		'SharedCredentials',
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
	]);
	licenseMocker.reset();
	owner = await createOwner();
	testRoot = await mkdtemp(path.join(tmpdir(), 'n8n-git-base-branch-'));

	const cipher = mock<Cipher>();
	cipher.decryptV2.mockImplementation(async (value) => value);
	const instanceSettings = mock<InstanceSettings>({
		n8nFolder: path.join(testRoot, 'instance'),
	});
	const logger = mockLogger();
	service = new GitConnectionsService(
		connectionRepository,
		connectionProjectRepository,
		Container.get(ProjectRepository),
		Container.get(ProjectService),
		new GitConnectionsGitService(logger),
		Container.get(N8nPackagesService),
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

async function writeRemoteFile(remote: TestRemote, relativePath: string, content: string) {
	const filePath = path.join(remote.workingDir, relativePath);
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, content);
}

async function commitAndPushRemote(remote: TestRemote, message: string) {
	await remote.git.add(['--all']);
	await remote.git.commit(message);
	await remote.git.push('origin', 'main');
}

async function remoteBlobSha(remote: TestRemote, filePath: string): Promise<string> {
	return (await simpleGit(remote.bareDir).raw(['rev-parse', `main:${filePath}`])).trim();
}

async function snapshotWorkingTree(dir: string): Promise<Map<string, string>> {
	const snapshot = new Map<string, string>();
	const walk = async (current: string) => {
		for (const entry of await readdir(current, { withFileTypes: true })) {
			if (entry.name === '.git') continue;
			const entryPath = path.join(current, entry.name);
			if (entry.isDirectory()) await walk(entryPath);
			else snapshot.set(path.relative(dir, entryPath), await readFile(entryPath, 'utf-8'));
		}
	};
	await walk(dir);
	return snapshot;
}

function checkoutFolder(connectionId: string): string {
	return path.join(testRoot, 'instance', 'git-connections', connectionId, 'repository');
}

describe('Git connection base branch listing', () => {
	it('lists the project files plus shared credential, variable and tag files, and nothing from other projects', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const projectA = await createTeamProject('Orders', owner);
		const projectB = await createTeamProject('Marketing', owner);
		const credential = await saveCredential(
			{
				name: 'Header credential',
				type: 'httpHeaderAuth',
				data: { name: 'X-Auth', value: 'secret' },
			},
			{ user: owner, role: 'credential:owner' },
		);
		await createVariable('API_URL', 'https://api.example.com');
		const credentialWorkflow = await createWorkflow(
			{
				name: 'Process order',
				nodes: [
					{
						id: 'n1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
					},
				],
				connections: {},
			},
			projectA,
		);
		const variableWorkflow = await createWorkflow(
			{
				name: 'Sync inventory',
				nodes: [
					{
						id: 'n1',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [
									{ id: 'a0', name: 'field0', type: 'string', value: '={{ $vars.API_URL }}' },
								],
							},
						},
					},
				],
				connections: {},
			},
			projectA,
		);
		const tag = await createTag({ name: 'prod' }, credentialWorkflow);
		const otherWorkflow = await createWorkflow(
			{ name: 'Campaign', nodes: [], connections: {} },
			projectB,
		);

		await service.push(connection.id, owner, { commitMessage: 'Export projects' });

		const files = await service.listBaseBranchFiles(connection.id, projectA.id);

		expect(Object.fromEntries([...files.entries()].map(([id, file]) => [id, file.type]))).toEqual({
			[projectA.id]: 'project',
			[credentialWorkflow.id]: 'workflow',
			[variableWorkflow.id]: 'workflow',
			[credential.id]: 'credential',
			apiurl: 'variable',
			[tag.id]: 'tag',
		});
		expect(files.has(projectB.id)).toBe(false);
		expect(files.has(otherWorkflow.id)).toBe(false);

		expect(files.get(projectA.id)?.path).toMatch(/^n8n-export\/projects\/orders-/);
		expect(files.get(credential.id)?.path).toMatch(/^n8n-export\/credentials\//);
		expect(files.get('apiurl')?.path).toMatch(/^n8n-export\/variables\/apiurl-/);
		expect(files.get(tag.id)?.path).toMatch(/^n8n-export\/tags\//);

		for (const file of files.values()) {
			expect(file.blobSha).toBe(await remoteBlobSha(remote, file.path));
		}
	});

	it('reflects a remote update, parses hyphenated, spaced and Unicode slugs, and changes no file in the checkout', async () => {
		const remote = await createRemote();
		const projectPath = 'n8n-export/projects/ünïcode örders-Pj01ab23/project.json';
		const variablePath = 'n8n-export/variables/my var-Va45zz67/variable.json';
		await writeRemoteFile(remote, projectPath, '{"name":"Ünïcode örders"}');
		await writeRemoteFile(remote, variablePath, '{"name":"my var"}');
		await commitAndPushRemote(remote, 'Initial export');

		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const checkout = checkoutFolder(connection.id);
		const checkoutGit = simpleGit(checkout);
		await checkoutGit.raw(['checkout', '--detach']);
		const headBefore = (await checkoutGit.revparse(['HEAD'])).trim();
		const treeBefore = await snapshotWorkingTree(checkout);

		const firstListing = await service.listBaseBranchFiles(connection.id, 'Pj01ab23');
		expect([...firstListing.keys()].sort()).toEqual(['Pj01ab23', 'my var']);
		expect(firstListing.get('my var')).toEqual({
			path: variablePath,
			blobSha: await remoteBlobSha(remote, variablePath),
			type: 'variable',
		});

		const workflowPath =
			'n8n-export/projects/ünïcode örders-Pj01ab23/workflows/my-hyphen-ated-slug-Wf99zz88/workflow.json';
		await writeRemoteFile(remote, workflowPath, '{"name":"My hyphen-ated workflow"}');
		await commitAndPushRemote(remote, 'Add workflow');

		const secondListing = await service.listBaseBranchFiles(connection.id, 'Pj01ab23');

		expect(secondListing.get('Wf99zz88')).toEqual({
			path: workflowPath,
			blobSha: await remoteBlobSha(remote, workflowPath),
			type: 'workflow',
		});
		expect((await checkoutGit.revparse(['HEAD'])).trim()).toBe(headBefore);
		expect(await snapshotWorkingTree(checkout)).toEqual(treeBefore);
	});

	it('returns an empty listing when the remote branch has no commits yet', async () => {
		const bareDir = path.join(testRoot, 'empty-remote.git');
		await simpleGit().raw(['init', '--bare', bareDir]);
		const connection = await createConnection(bareDir);
		await service.clone(connection.id);

		const files = await service.listBaseBranchFiles(connection.id, 'Pj01ab23');

		expect(files.size).toBe(0);
	});
});
