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
import type { Project, User } from '@n8n/db';
import { FolderRepository, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import assert from 'node:assert';
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
	workflowMetadataFilePath,
	type ManifestEntityCollection,
} from '@/modules/n8n-packages/io/manifest-entry';
import { saveCredential } from '@test-integration/db/credentials';
import { createTag } from '@test-integration/db/tags';
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
let workingDirectory: PromotionWorkingDirectoryService;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'promotions', 'data-table']);
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
		'WorkflowTagMapping',
		'TagEntity',
		'CredentialsEntity',
		'SharedCredentials',
		'DataTable',
		'DataTableColumn',
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
		'Variables',
	]);
	await Container.get(VariablesService).updateCache();
	mockDataTableSizeValidator();
	licenseMocker.reset();
	owner = await createOwner();
	testRoot = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-roundtrip-'));

	// The stored payload is written in plaintext, so the identity cipher can read it back.
	const cipher = mock<Cipher>();
	cipher.decryptV2.mockImplementation(async (value) => value);
	cipher.encryptV2.mockImplementation(async (value) => String(value));
	const logger = mockLogger();
	const gitService = new PromotionsGitService(logger);
	workingDirectory = new PromotionWorkingDirectoryService(
		mock<InstanceSettings>({ n8nFolder: path.join(testRoot, 'instance') }),
	);
	service = new PromotionsService(
		new PromotionConfigResolver(
			configRepository,
			connectionRepository,
			linkRepository,
			projectRepository,
		),
		new PromotionProvidersService(providerRepository, connectionRepository, gitService, cipher),
		workingDirectory,
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

describe('Promotion base branch listing', () => {
	let project: Project;

	beforeEach(async () => {
		project = await createTeamProject('Orders', owner);
	});

	it('lists the exported project and its top-level dependencies', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const projectB = await createTeamProject('Marketing', owner);
		const parentFolder = await createFolder(project, { name: 'Operations' });
		const childFolder = await createFolder(project, { name: 'Orders', parentFolder });
		const dataTableService = Container.get(DataTableService);
		const projectTable = await dataTableService.createDataTable(project.id, {
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
		const workflow = await createWorkflow(
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
			project,
		);
		const tag = await createTag({ name: 'prod' }, workflow);
		await createWorkflow({ name: 'Campaign', nodes: [], connections: {} }, projectB);

		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export projects',
		});
		const manifest = packageManifestSchema.parse(
			jsonParse(await simpleGit(remote.bareDir).show(['main:n8n-export/manifest.json'])),
		);
		const projectEntry = manifest.projects?.find(({ id }) => id === project.id);
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
				.flatMap(({ target }) => [
					`n8n-export/${entityFilePath(collection, target)}`,
					...(collection === 'workflows' ? [`n8n-export/${workflowMetadataFilePath(target)}`] : []),
				]),
		);

		const files = await service.listBaseBranchFiles(project.id);

		expect(files.map(({ key, type }) => ({ key, type }))).toEqual(
			expect.arrayContaining([
				{ key: project.id, type: 'project' },
				{ key: parentFolder.id, type: 'folder' },
				{ key: childFolder.id, type: 'folder' },
				{ key: workflow.id, type: 'workflow' },
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

	it('uses the project promote config instead of the instance or apply config', async () => {
		const remote = await createRemote();
		const projectPath = `n8n-export/projects/orders-${project.id}/project.json`;
		await writeRemoteFile(remote, projectPath, '{"name":"Main"}');
		await commitAndPushRemote(remote, 'Export main project');
		await remote.git.checkoutLocalBranch('production');
		await writeRemoteFile(remote, projectPath, '{"name":"Production"}');
		await remote.git.add(['--all']);
		await remote.git.commit('Export production project');
		await remote.git.push('origin', 'production');
		const instance = await createInstanceConnection(remote.bareDir, {
			apply: 'production',
			promote: 'main',
		});
		await service.clone(instance.id, 'promote');
		expect(await service.listBaseBranchFiles(project.id)).toEqual([
			{
				key: project.id,
				path: projectPath,
				blobSha: await remoteBlobSha(remote, projectPath),
				type: 'project',
			},
		]);

		const connection = await connectionRepository.insertConnection({
			name: 'Project production',
			scope: 'projects',
			providerId: instance.providerId,
			target: { schemaVersion: 1, remoteUrl: remote.bareDir },
		});
		await configRepository.insertConfig({
			connectionId: connection.id,
			direction: 'promote',
			name: 'Promote',
			settings: { schemaVersion: 1, baseBranchName: 'production', createBranchOnPromotion: false },
		});
		await linkRepository.linkProject(project.id, connection.id);
		await service.clone(connection.id, 'promote');

		expect(await service.listBaseBranchFiles(project.id)).toEqual([
			{
				key: project.id,
				path: projectPath,
				blobSha: (await remote.git.revparse([`production:${projectPath}`])).trim(),
				type: 'project',
			},
		]);
	});

	it('reads remote updates without changing a dirty, detached checkout', async () => {
		const remote = await createRemote();
		const projectPath = `n8n-export/projects/ünïcode örders-${project.id}/project.json`;
		const variablePath = 'n8n-export/variables/my "quoted" var-Va45zz67/variable.json';
		await writeRemoteFile(remote, projectPath, '{"name":"Ünïcode örders"}');
		await writeRemoteFile(remote, variablePath, '{"name":"my var"}');
		await commitAndPushRemote(remote, 'Initial export');

		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const config = await configRepository.findByConnectionAndDirection(connection.id, 'promote');
		assert(config);
		const checkout = workingDirectory.paths(config.id).repositoryFolder;
		const checkoutGit = simpleGit(checkout);
		await checkoutGit.addConfig('core.autocrlf', 'true');
		await checkoutGit.raw(['checkout', '--detach']);
		await writeFile(path.join(checkout, projectPath), 'Local changes\r\n');
		await writeFile(path.join(checkout, 'untracked.txt'), 'Untracked file\n');
		const headBefore = (await checkoutGit.revparse(['HEAD'])).trim();
		const treeBefore = await snapshotWorkingTree(checkout);

		const firstListing = await service.listBaseBranchFiles(project.id);
		expect(firstListing).toHaveLength(2);
		expect(firstListing).toContainEqual({
			key: 'my "quoted" var',
			path: variablePath,
			blobSha: await remoteBlobSha(remote, variablePath),
			type: 'variable',
		});

		const workflowPath = `n8n-export/projects/ünïcode örders-${project.id}/workflows/my-hyphen-ated-slug-Wf99zz88/workflow.json`;
		await writeRemoteFile(remote, workflowPath, '{"name":"My hyphen-ated workflow"}');
		await commitAndPushRemote(remote, 'Add workflow');

		const secondListing = await service.listBaseBranchFiles(project.id);

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
		const connection = await createInstanceConnection(bareDir);
		await service.clone(connection.id, 'promote');

		const files = await service.listBaseBranchFiles(project.id);

		expect(files).toEqual([]);
	});

	it('preserves files with matching IDs or variable slugs across collections and scopes', async () => {
		const remote = await createRemote();
		const projectRoot = `n8n-export/projects/orders-${project.id}`;
		const entities = [
			{ key: '42', type: 'folder', path: `${projectRoot}/folders/legacy-42/folder.json` },
			{
				key: '42',
				type: 'workflow',
				path: `${projectRoot}/folders/legacy-42/workflows/order-42/workflow.json`,
			},
			{ key: '42', type: 'credential', path: `${projectRoot}/credentials/api-42/credential.json` },
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
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const files = await service.listBaseBranchFiles(project.id);

		expect(files.map(({ blobSha, ...entity }) => entity)).toEqual(expect.arrayContaining(entities));
		expect(files).toHaveLength(entities.length);
	});

	it('reports an unavailable remote before its first commit', async () => {
		const bareDir = path.join(testRoot, 'empty-remote.git');
		await simpleGit().raw(['init', '--bare', bareDir]);
		const connection = await createInstanceConnection(bareDir);
		await service.clone(connection.id, 'promote');
		await rename(bareDir, `${bareDir}.offline`);

		await expect(service.listBaseBranchFiles(project.id)).rejects.toThrow(BadRequestError);
	});

	it('requires a fresh clone after a base-branch change and reports a deleted branch', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');
		await remote.git.checkoutLocalBranch('production');
		const projectPath = `n8n-export/projects/orders-${project.id}/project.json`;
		await writeRemoteFile(remote, projectPath, '{}');
		await remote.git.add(['--all']);
		await remote.git.commit('Export production project');
		await remote.git.push('origin', 'production');
		const config = await configRepository.findByConnectionAndDirection(connection.id, 'promote');
		assert(config);
		await configRepository.replaceConfig(config.id, {
			name: 'Promote',
			settings: { schemaVersion: 1, baseBranchName: 'production', createBranchOnPromotion: false },
		});
		await expect(service.listBaseBranchFiles(project.id)).rejects.toThrow('not cloned');
		await service.clone(connection.id, 'promote');

		const files = await service.listBaseBranchFiles(project.id);

		expect(files).toEqual([
			{
				key: project.id,
				path: projectPath,
				blobSha: (await remote.git.revparse([`production:${projectPath}`])).trim(),
				type: 'project',
			},
		]);

		await remote.git.raw(['push', 'origin', '--delete', 'production']);
		await simpleGit(remote.bareDir).raw(['update-ref', '-d', 'refs/heads/main']);
		await expect(service.listBaseBranchFiles(project.id)).rejects.toThrow(BadRequestError);
	});
});
