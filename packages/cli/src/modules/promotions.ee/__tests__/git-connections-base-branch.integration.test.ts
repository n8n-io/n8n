import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	mockInstance,
	mockLogger,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableService } from '@/modules/data-table/data-table.service';
import {
	PACKAGE_ENTITY_LAYOUT,
	entityFilePath,
	type ManifestEntityCollection,
} from '@/modules/n8n-packages/io/manifest-entry';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import { ProjectService } from '@/services/project.service.ee';
import { saveCredential } from '@test-integration/db/credentials';
import { createFolder } from '@test-integration/db/folders';
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
	await testModules.loadModules(['n8n-packages', 'git-connections', 'data-table']);
	await testDb.init();
	mockDataTableSizeValidator();

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
		'DataTable',
		'DataTableColumn',
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
	await rm(testRoot, { recursive: true, force: true, maxRetries: 3 });
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

describe('Git connection base branch listing', () => {
	it('lists the exported project and its top-level dependencies', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const projectA = await createTeamProject('Orders', owner);
		const projectB = await createTeamProject('Marketing', owner);
		const parentFolder = await createFolder(projectA, { name: 'Operations' });
		const childFolder = await createFolder(projectA, { name: 'Orders', parentFolder });
		const dataTableService = Container.get(DataTableService);
		const projectTable = await dataTableService.createDataTable(projectA.id, {
			name: 'Orders',
			columns: [{ name: 'email', type: 'string' }],
		});
		const sharedTable = await dataTableService.createDataTable(
			(await getPersonalProject(owner)).id,
			{
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			},
		);
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
				parentFolder: childFolder,
				nodes: [
					{
						id: 'n1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: { url: '={{ $vars.API_URL }}' },
						credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
					},
					...[projectTable, sharedTable].map((table, index) => ({
						id: `table${index}`,
						name: table.name,
						type: 'n8n-nodes-base.dataTable',
						typeVersion: 1,
						position: [index * 200, 200] as [number, number],
						parameters: { dataTableId: { __rl: true, mode: 'id', value: table.id } },
					})),
				],
				connections: {},
			},
			projectA,
		);
		const tag = await createTag({ name: 'prod' }, credentialWorkflow);
		await createWorkflow({ name: 'Campaign', nodes: [], connections: {} }, projectB);

		await service.push(connection.id, owner, { commitMessage: 'Export projects' });
		const manifest = packageManifestSchema.parse(
			jsonParse(await simpleGit(remote.bareDir).show(['main:n8n-export/manifest.json'])),
		);
		const projectEntry = manifest.projects?.find(({ id }) => id === projectA.id);
		assert(projectEntry);
		const collections = Object.keys(PACKAGE_ENTITY_LAYOUT) as ManifestEntityCollection[];
		const expectedPaths = collections.flatMap((collection) =>
			(manifest[collection] ?? [])
				.filter(
					({ target }) =>
						!target.startsWith(`${PACKAGE_ENTITY_LAYOUT.projects.directory}/`) ||
						target === projectEntry.target ||
						target.startsWith(`${projectEntry.target}/`),
				)
				.map(({ target }) => `n8n-export/${entityFilePath(collection, target)}`),
		);

		const files = await service.listBaseBranchFiles(connection.id, projectA.id);

		expect(files.map(({ key, type }) => ({ key, type }))).toEqual(
			expect.arrayContaining([
				{ key: projectA.id, type: 'project' },
				{ key: parentFolder.id, type: 'folder' },
				{ key: childFolder.id, type: 'folder' },
				{ key: credentialWorkflow.id, type: 'workflow' },
				{ key: credential.id, type: 'credential' },
				{ key: 'apiurl', type: 'variable' },
				{ key: tag.id, type: 'tag' },
				{ key: projectTable.id, type: 'dataTable' },
				{ key: sharedTable.id, type: 'dataTable' },
			]),
		);
		expect(files.map(({ path }) => path).sort()).toEqual(expectedPaths.sort());

		for (const file of files) {
			expect(file.blobSha).toBe(await remoteBlobSha(remote, file.path));
		}
	});

	it('reads remote updates without changing a dirty, detached checkout', async () => {
		const remote = await createRemote();
		const projectPath = 'n8n-export/projects/ünïcode örders-Pj01ab23/project.json';
		const variablePath = 'n8n-export/variables/my "quoted" var-Va45zz67/variable.json';
		await writeRemoteFile(remote, projectPath, '{"name":"Ünïcode örders"}');
		await writeRemoteFile(remote, variablePath, '{"name":"my var"}');
		await commitAndPushRemote(remote, 'Initial export');

		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const checkout = path.join(
			testRoot,
			'instance',
			'git-connections',
			connection.id,
			'repository',
		);
		const checkoutGit = simpleGit(checkout);
		await checkoutGit.addConfig('core.autocrlf', 'true');
		await checkoutGit.raw(['checkout', '--detach']);
		await writeFile(path.join(checkout, projectPath), 'Local changes\r\n');
		await writeFile(path.join(checkout, 'untracked.txt'), 'Untracked file\n');
		const headBefore = (await checkoutGit.revparse(['HEAD'])).trim();
		const treeBefore = await snapshotWorkingTree(checkout);

		const firstListing = await service.listBaseBranchFiles(connection.id, 'Pj01ab23');
		expect(firstListing).toHaveLength(2);
		expect(firstListing).toContainEqual({
			key: 'my "quoted" var',
			path: variablePath,
			blobSha: await remoteBlobSha(remote, variablePath),
			type: 'variable',
		});

		const workflowPath =
			'n8n-export/projects/ünïcode örders-Pj01ab23/workflows/my-hyphen-ated-slug-Wf99zz88/workflow.json';
		await writeRemoteFile(remote, workflowPath, '{"name":"My hyphen-ated workflow"}');
		await commitAndPushRemote(remote, 'Add workflow');

		const secondListing = await service.listBaseBranchFiles(connection.id, 'Pj01ab23');

		expect(secondListing).toContainEqual({
			key: 'Wf99zz88',
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

		expect(files).toEqual([]);
	});

	it('preserves files with matching IDs or variable slugs across collections and scopes', async () => {
		const remote = await createRemote();
		const projectRoot = 'n8n-export/projects/orders-Pj01';
		const entities = [
			{ key: '42', type: 'folder', path: `${projectRoot}/folders/legacy-42/folder.json` },
			{
				key: '42',
				type: 'workflow',
				path: `${projectRoot}/folders/legacy-42/workflows/order-42/workflow.json`,
			},
			{ key: '42', type: 'credential', path: `${projectRoot}/credentials/api-42/credential.json` },
			{
				key: '42',
				type: 'dataTable',
				path: `${projectRoot}/data-tables/orders-42/data-table.json`,
			},
			{ key: 'apiurl', type: 'variable', path: `${projectRoot}/variables/apiurl-1/variable.json` },
			{ key: 'apiurl', type: 'variable', path: 'n8n-export/variables/apiurl-2/variable.json' },
		];
		for (const entity of entities) {
			await writeRemoteFile(remote, entity.path, '{}');
		}
		await writeRemoteFile(remote, 'n8n-export/manifest.json', 'Not used for this listing');
		await writeRemoteFile(remote, 'n8n-export/workflows/standalone-Wf01/workflow.json', '{}');
		await writeRemoteFile(remote, 'n8n-export/folders/standalone-Fo01/folder.json', '{}');
		await writeRemoteFile(remote, `${projectRoot}/workflows/order-42/README.md`, 'Notes');
		await commitAndPushRemote(remote, 'Export scoped entities');
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);

		const files = await service.listBaseBranchFiles(connection.id, 'Pj01');

		expect(files.map(({ blobSha, ...entity }) => entity)).toEqual(expect.arrayContaining(entities));
		expect(files).toHaveLength(entities.length);
	});

	it('reports an unavailable remote before its first commit', async () => {
		const bareDir = path.join(testRoot, 'empty-remote.git');
		await simpleGit().raw(['init', '--bare', bareDir]);
		const connection = await createConnection(bareDir);
		await service.clone(connection.id);
		await rename(bareDir, `${bareDir}.offline`);

		await expect(service.listBaseBranchFiles(connection.id, 'Pj01ab23')).rejects.toThrow(
			BadRequestError,
		);
	});

	it('lists a branch outside the original single-branch clone', async () => {
		const remote = await createRemote();
		const connection = await createConnection(remote.bareDir);
		await service.clone(connection.id);
		await remote.git.checkoutLocalBranch('production');
		const projectPath = 'n8n-export/projects/orders-Pj01ab23/project.json';
		await writeRemoteFile(remote, projectPath, '{}');
		await remote.git.add(['--all']);
		await remote.git.commit('Export production project');
		await remote.git.push('origin', 'production');
		await connectionRepository.update(connection.id, { branchName: 'production' });

		const files = await service.listBaseBranchFiles(connection.id, 'Pj01ab23');

		expect(files).toEqual([
			{
				key: 'Pj01ab23',
				path: projectPath,
				blobSha: (await remote.git.revparse([`production:${projectPath}`])).trim(),
				type: 'project',
			},
		]);

		await remote.git.raw(['push', 'origin', '--delete', 'production']);
		await expect(service.listBaseBranchFiles(connection.id, 'Pj01ab23')).rejects.toThrow(
			BadRequestError,
		);
	});
});
