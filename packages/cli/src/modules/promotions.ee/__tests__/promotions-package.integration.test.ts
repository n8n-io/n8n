import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	mockInstance,
	mockLogger,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	CredentialsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	VariablesRepository,
	TagRepository,
	WorkflowHistoryRepository,
	WorkflowTagMappingRepository,
	FolderRepository,
	ProjectRepository,
	ProjectRelationRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowPublishedVersionRepository,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import assert from 'node:assert';
import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { CredentialTypes } from '@/credential-types';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { DataTableColumnRepository } from '@/modules/data-table/data-table-column.repository';
import { DataTableService } from '@/modules/data-table/data-table.service';
import {
	PACKAGE_ENTITY_LAYOUT,
	entityFilePath,
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
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { createProjectVariable, createVariable } from '@test-integration/db/variables';
import { initNodeTypes, initCredentialsTypes, setupTestServer } from '@test-integration/utils';

import { PromotionConfigRepository } from '../database/repositories/promotion-config.repository';
import { PromotionConnectionProjectRepository } from '../database/repositories/promotion-connection-project.repository';
import { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionBindingPreflightService } from '../promotion-binding-preflight.service';
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

const testServer = setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['n8n-packages', 'promotions', 'data-table'],
	enabledFeatures: ['feat:gitConnections'],
});
const licenseMocker = testServer.license;

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
	await initNodeTypes();
	await initCredentialsTypes();
	mockInstance(CredentialTypes).recognizes.mockReturnValue(true);

	providerRepository = Container.get(PromotionProviderRepository);
	connectionRepository = Container.get(PromotionConnectionRepository);
	configRepository = Container.get(PromotionConfigRepository);
	linkRepository = Container.get(PromotionConnectionProjectRepository);
	projectRepository = Container.get(ProjectRepository);
	projectService = Container.get(ProjectService);
	packagesService = Container.get(N8nPackagesService);

	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin', 'feat:folders', 'feat:gitConnections'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
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
	owner = await createOwnerWithApiKey();
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
	workingDirectory = new PromotionWorkingDirectoryService(instanceSettings);
	service = new PromotionsService(
		new PromotionConfigResolver(
			configRepository,
			connectionRepository,
			linkRepository,
			projectRepository,
		),
		new PromotionProvidersService(providerRepository, connectionRepository, gitService, cipher),
		workingDirectory,
		new WorkingCopyUpdater(instanceSettings, logger),
		gitService,
		projectRepository,
		Container.get(SharedWorkflowRepository),
		projectService,
		packagesService,
		Container.get(PromotionBindingPreflightService),
		logger,
	);
	Container.set(PromotionsService, service);
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
	createBranchOnPromotion = false,
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
			createBranchOnPromotion,
		},
	});
	return connection;
}

async function snapshotApplyState() {
	return await Promise.all([
		Container.get(DataTableRepository).find({ order: { id: 'ASC' } }),
		Container.get(DataTableColumnRepository).find({ order: { id: 'ASC' } }),
		Container.get(ProjectRepository).find({ order: { id: 'ASC' } }),
		Container.get(ProjectRelationRepository).find({
			relations: { role: true },
			order: { projectId: 'ASC', userId: 'ASC' },
		}),
		Container.get(WorkflowRepository).find({ order: { id: 'ASC' } }),
		Container.get(SharedWorkflowRepository).find({
			order: { workflowId: 'ASC', projectId: 'ASC' },
		}),
		Container.get(WorkflowHistoryRepository).find({ order: { versionId: 'ASC' } }),
		Container.get(WorkflowPublishHistoryRepository).find({ order: { id: 'ASC' } }),
		Container.get(WorkflowPublishedVersionRepository).find({ order: { workflowId: 'ASC' } }),
		Container.get(WorkflowPublicationOutboxRepository).find({ order: { id: 'ASC' } }),
		Container.get(WorkflowPublicationTriggerStatusRepository).find({
			order: { workflowId: 'ASC', nodeId: 'ASC' },
		}),
		Container.get(FolderRepository).find({ order: { id: 'ASC' } }),
		Container.get(TagRepository).find({ order: { id: 'ASC' } }),
		Container.get(WorkflowTagMappingRepository).find({
			order: { workflowId: 'ASC', tagId: 'ASC' },
		}),
		Container.get(CredentialsRepository).find({ order: { id: 'ASC' } }),
		Container.get(SharedCredentialsRepository).find({
			order: { credentialsId: 'ASC', projectId: 'ASC' },
		}),
		Container.get(VariablesRepository).find({ order: { id: 'ASC' } }),
	]);
}

async function prepareBindingApply() {
	const remote = await createRemote();
	const connection = await createInstanceConnection(remote.bareDir);
	await service.clone(connection.id, 'promote');
	await service.clone(connection.id, 'apply');
	const project = await createTeamProject('Orders', owner);
	const credential = await saveCredential(
		{ name: 'Header credential', type: 'httpHeaderAuth', data: {} },
		{ project, role: 'credential:owner' },
	);
	const variable = await createVariable('API_URL', 'source value');
	const workflow = await createWorkflow(
		{
			name: 'Process order',
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
			],
			connections: {},
		},
		project,
	);
	await service.promote(connection.id, owner, {
		canExportVariableValues: true,
		commitMessage: 'Export orders',
	});
	await Container.get(CredentialsRepository).delete(credential.id);
	await Container.get(VariablesRepository).delete(variable.id);
	await Container.get(VariablesService).updateCache();
	await Container.get(WorkflowRepository).update(workflow.id, { name: 'Target workflow' });
	const removedProject = await createTeamProject('Target only', owner);
	await createWorkflow(
		{ name: 'Target only workflow', nodes: [], connections: {} },
		removedProject,
	);
	await createFolder(removedProject, { name: 'Target only folder' });
	return { remote, connection, project, credential, variable, workflow, removedProject };
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

/** Reads the `isArchived` flag of a workflow file on the branch, by id. */
async function readBranchWorkflowArchived(
	inspectionDir: string,
	workflowId: string,
): Promise<boolean | undefined> {
	const exportRoot = path.join(inspectionDir, 'n8n-export');
	let archived: boolean | undefined;
	const walk = async (dir: string): Promise<void> => {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
				continue;
			}
			if (entry.name !== 'workflow.json') continue;
			const parsed = jsonParse<{ id: string; isArchived: boolean }>(
				await readFile(fullPath, 'utf-8'),
			);
			if (parsed.id === workflowId) archived = parsed.isArchived;
		}
	};
	await walk(exportRoot);
	return archived;
}

async function setupProjectWithWorkflows(projectName: string, workflowNames: string[]) {
	const project = await createTeamProject(projectName, owner);
	const workflows = [];
	for (const name of workflowNames) {
		workflows.push(await createWorkflow({ name, nodes: [], connections: {} }, project));
	}
	return { project, workflows };
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

	it('creates one timestamped branch for each promotion', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(
			remote.bareDir,
			{ apply: 'main', promote: 'main' },
			true,
		);
		await service.clone(connection.id, 'promote');

		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);
		const baseCommit = (await remote.git.revparse(['main'])).trim();

		const first = await service.promote(connection.id, owner, {
			canExportVariableValues: false,
			commitMessage: 'Promote orders',
			force: true,
		});
		const remoteGit = simpleGit(remote.bareDir);

		expect(first.git.branchName).toMatch(
			/^n8n-promotion\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/,
		);
		expect((await remoteGit.revparse([first.git.branchName])).trim()).toBe(first.git.commitSha);
		expect((await remoteGit.revparse([`${first.git.branchName}^`])).trim()).toBe(baseCommit);
		expect((await remoteGit.revparse(['main'])).trim()).toBe(baseCommit);

		await remote.git.fetch('origin', first.git.branchName);
		await remote.git.merge(['FETCH_HEAD']);
		await remote.git.push('origin', 'main');
		const mergedBaseCommit = (await remote.git.revparse(['main'])).trim();
		await Container.get(WorkflowRepository).update(workflow.id, { name: 'Process order v2' });

		const second = await service.promote(connection.id, owner, {
			canExportVariableValues: false,
			commitMessage: 'Promote orders again',
		});

		expect(second.git.branchName).not.toBe(first.git.branchName);
		expect((await remoteGit.revparse([second.git.branchName])).trim()).toBe(second.git.commitSha);
		expect((await remoteGit.revparse([`${second.git.branchName}^`])).trim()).toBe(mergedBaseCommit);
		expect((await remoteGit.revparse(['main'])).trim()).toBe(mergedBaseCommit);
	});

	it('requires a clone after a branched promotion cannot restore its checkout', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(
			remote.bareDir,
			{ apply: 'main', promote: 'main' },
			true,
		);
		const { configId } = await service.clone(connection.id, 'promote');
		const { repositoryFolder, descriptorFile } = workingDirectory.paths(configId);
		const checkoutGit = simpleGit(repositoryFolder);
		const baseCommit = (await checkoutGit.revparse(['HEAD'])).trim();
		const invalidateDescriptor = workingDirectory.invalidateDescriptor.bind(workingDirectory);
		vi.spyOn(workingDirectory, 'invalidateDescriptor').mockImplementation(async (id) => {
			if ((await checkoutGit.revparse(['HEAD'])).trim() !== baseCommit) {
				throw new Error('Descriptor removal failed after commit');
			}
			await invalidateDescriptor(id);
		});
		// Keep the index locked after commit so the real Git reset fails.
		await writeFile(
			path.join(repositoryFolder, '.git', 'hooks', 'post-commit'),
			'#!/bin/sh\ntouch "$(git rev-parse --git-path index.lock)"\n',
			{ mode: 0o755 },
		);
		const request = { canExportVariableValues: false, commitMessage: 'Promote package' };

		const result = await service.promote(connection.id, owner, request);

		expect((await checkoutGit.revparse(['HEAD'])).trim()).toBe(result.git.commitSha);
		expect(result.git.commitSha).not.toBe(baseCommit);
		expect((await simpleGit(remote.bareDir).revparse([result.git.branchName])).trim()).toBe(
			result.git.commitSha,
		);
		await expect(readFile(descriptorFile)).rejects.toMatchObject({ code: 'ENOENT' });
		// A new service instance must also reject the cache after a restart.
		const reloadedDirectory = new PromotionWorkingDirectoryService(
			mock<InstanceSettings>({ n8nFolder: path.join(testRoot, 'instance') }),
		);
		await expect(reloadedDirectory.readDescriptor(configId)).resolves.toBeNull();
		await configRepository.update(configId, {
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
		});
		const exportSpy = vi.spyOn(packagesService, 'exportPackageToDirectory');
		try {
			await expect(service.promote(connection.id, owner, request)).rejects.toThrow('not cloned');
			expect(exportSpy).not.toHaveBeenCalled();
			await service.clone(connection.id, 'promote');
			await expect(service.promote(connection.id, owner, request)).resolves.toMatchObject({
				git: { branchName: 'main' },
			});
			const remoteGit = simpleGit(remote.bareDir);
			expect((await remoteGit.revparse(['main^'])).trim()).toBe(baseCommit);
		} finally {
			exportSpy.mockRestore();
		}
	});

	it('requires the configured base branch for a branched promotion', async () => {
		const bareDir = path.join(testRoot, 'empty-remote.git');
		await simpleGit().raw(['init', '--bare', bareDir]);
		const connection = await createInstanceConnection(
			bareDir,
			{ apply: 'main', promote: 'main' },
			true,
		);
		await service.clone(connection.id, 'promote');

		await expect(
			service.promote(connection.id, owner, {
				canExportVariableValues: false,
				commitMessage: 'Promote orders',
			}),
		).rejects.toThrow('Remote branch does not exist: main');
		await expect(simpleGit(bareDir).raw(['show-ref', '--heads'])).resolves.toBe('');
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
		assert(result.status === 'applied');

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

	it.each([
		{ targetValue: '', shadow: false },
		{ targetValue: 'configured target value', shadow: true },
	])(
		'blocks without writes and continues with target value %j',
		async ({ targetValue, shadow }) => {
			const { connection, credential, variable, project, workflow, removedProject } =
				await prepareBindingApply();
			const before = await snapshotApplyState();
			const agent = testServer.publicApiAgentFor(owner);
			const applyResponse = await agent
				.post(`/promotions/connections/${connection.id}/apply`)
				.send({})
				.expect(200);
			const blocked = applyResponse.body;
			assert(blocked.status === 'blocked');
			expect(blocked.preflight.missingBindings).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ kind: 'credential', sourceId: credential.id }),
					expect.objectContaining({
						kind: 'variable',
						name: variable.key,
						sourceValue: variable.value,
					}),
				]),
			);
			expect(await snapshotApplyState()).toEqual(before);
			expect(blocked).not.toHaveProperty('counts');
			const request = { expectedSource: { configId: blocked.configId, ...blocked.git } };

			const stillBlocked = (
				await agent
					.post(`/promotions/connections/${connection.id}/apply/continue`)
					.send(request)
					.expect(200)
			).body;
			expect(stillBlocked).toEqual(blocked);
			expect(await snapshotApplyState()).toEqual(before);

			const targetData = { name: 'Authorization', value: 'target-secret' };
			const createBody = {
				id: credential.id,
				name: credential.name,
				type: credential.type,
				projectId: project.id,
				data: targetData,
			};
			await agent
				.post('/credentials')
				.send({ ...createBody, id: 'different-id' })
				.expect(200);
			const wrongId = (
				await agent
					.post(`/promotions/connections/${connection.id}/apply/continue`)
					.send(request)
					.expect(200)
			).body;
			expect(wrongId.status).toBe('blocked');
			expect(wrongId.preflight.missingBindings).toContainEqual(
				expect.objectContaining({ kind: 'credential', sourceId: credential.id }),
			);
			const created = await agent.post('/credentials').send(createBody).expect(200);
			expect(created.body.id).toBe(credential.id);
			expect(created.body).not.toHaveProperty('data');
			const stored = await Container.get(CredentialsRepository).findOneByOrFail({
				id: credential.id,
			});
			const targetVariable = await createVariable(variable.key, targetValue);
			const override = shadow
				? await createProjectVariable(variable.key, 'project override', project)
				: undefined;
			const result = (
				await agent
					.post(`/promotions/connections/${connection.id}/apply/continue`)
					.send(request)
					.expect(200)
			).body;
			assert(result.status === 'applied', JSON.stringify(result));
			expect(result.warnings).toEqual(
				shadow ? [expect.objectContaining({ code: 'variable-shadowed', name: variable.key })] : [],
			);
			expect(result.counts.credentials).toEqual({ matched: 1, stubbed: 0 });
			expect(result.counts.variables).toMatchObject({ created: 0, updated: 0, stubbed: 0 });
			expect(
				await Container.get(VariablesRepository).findOneByOrFail({ id: targetVariable.id }),
			).toMatchObject({ value: targetValue });
			if (override)
				expect(
					await Container.get(VariablesRepository).findOneByOrFail({ id: override.id }),
				).toMatchObject({ value: 'project override' });
			expect(
				await Container.get(WorkflowRepository).findOneByOrFail({ id: workflow.id }),
			).toMatchObject({
				name: workflow.name,
				nodes: [
					expect.objectContaining({
						credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
					}),
				],
			});
			expect(
				await Container.get(CredentialsRepository).findOneByOrFail({ id: credential.id }),
			).toEqual(stored);
			expect(await projectRepository.findOneBy({ id: removedProject.id })).toBeNull();
		},
	);

	it('stops Continue when the remote commit changes and permits a new review', async () => {
		const { connection, remote } = await prepareBindingApply();
		const blocked = await service.apply(connection.id, owner);
		assert(blocked.status === 'blocked');
		const before = await snapshotApplyState();
		await remote.git.pull('origin', 'main');
		await writeRemoteFile(remote, 'README.md', 'Updated description');
		await commitAndPushRemote(remote, 'Update description');
		const result = await service.continueApply(connection.id, owner, {
			expectedSource: { configId: blocked.configId, ...blocked.git },
		});
		expect(result).toEqual({
			status: 'source-changed',
			connectionId: connection.id,
			configId: blocked.configId,
			git: { branchName: 'main', commitSha: (await remote.git.revparse(['HEAD'])).trim() },
		});
		expect(await snapshotApplyState()).toEqual(before);
		const reviewed = await service.apply(connection.id, owner);
		expect(reviewed.status).toBe('blocked');
		expect(reviewed.git).toEqual(result.git);
		expect(await snapshotApplyState()).toEqual(before);
	});

	it('stops the first Apply when the reviewed commit moved and accepts the current one', async () => {
		const { connection, remote } = await prepareBindingApply();
		const reviewed = await service.apply(connection.id, owner);
		assert(reviewed.status === 'blocked');
		const before = await snapshotApplyState();
		await remote.git.pull('origin', 'main');
		await writeRemoteFile(remote, 'README.md', 'Updated description');
		await commitAndPushRemote(remote, 'Update description');
		const source = { configId: reviewed.configId, ...reviewed.git };

		const moved = await service.apply(connection.id, owner, source);
		expect(moved).toEqual({
			status: 'source-changed',
			connectionId: connection.id,
			configId: reviewed.configId,
			git: { branchName: 'main', commitSha: (await remote.git.revparse(['HEAD'])).trim() },
		});
		expect(await snapshotApplyState()).toEqual(before);

		const current = await service.apply(connection.id, owner, { ...source, ...moved.git });
		expect(current.status).toBe('blocked');
		expect(await snapshotApplyState()).toEqual(before);
	});

	it('keeps the missing-manifest import error after a clear preflight', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'apply');
		await writeRemoteFile(remote, 'n8n-export/.gitkeep', '');
		await commitAndPushRemote(remote, 'Add package directory');
		const before = await snapshotApplyState();
		await expect(service.apply(connection.id, owner)).rejects.toThrow(/manifest/i);
		expect(await snapshotApplyState()).toEqual(before);
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
		assert(firstApply.status === 'applied');

		expect(await workflowRepository.findOneBy({ id: workflow.id })).toMatchObject({
			isArchived: true,
		});
		expect(firstApply.counts.workflows).toMatchObject({ updated: 1, deleted: 0, archived: 0 });

		// Archived on both sides now; a second apply must still succeed.
		const secondApply = await service.apply(connection.id, owner);
		assert(secondApply.status === 'applied');

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
	it('refuses a selection when the branch has no package yet', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1']);

		await expect(
			service.promoteSelection(
				connection.id,
				owner,
				{ canExportVariableValues: true, commitMessage: 'Add w1' },
				{ projectId: project.id, workflowIds: [workflows[0].id], deletedWorkflowIds: [] },
			),
		).rejects.toThrow('Promote the instance first');
	});

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

	it('pushes a branched selection to a new branch and leaves the base untouched', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(
			remote.bareDir,
			{ apply: 'main', promote: 'main' },
			true,
		);
		await service.clone(connection.id, 'promote');

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		// A full promote seeds a branch. Merge it into the base, so a later selection
		// has a package to build on.
		const full = await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
			force: true,
		});
		await remote.git.fetch('origin', full.git.branchName);
		await remote.git.merge(['FETCH_HEAD']);
		await remote.git.push('origin', 'main');
		const baseCommit = (await remote.git.revparse(['main'])).trim();

		const w3 = await createWorkflow({ name: 'w3', nodes: [], connections: {} }, project);
		const result = await service.promoteSelection(
			connection.id,
			owner,
			{ canExportVariableValues: true, commitMessage: 'Add w3' },
			{ projectId: project.id, workflowIds: [w3.id], deletedWorkflowIds: [] },
		);

		const remoteGit = simpleGit(remote.bareDir);
		expect(result.git.branchName).toMatch(
			/^n8n-promotion\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/,
		);
		// The selection lands on the new branch, off the current base.
		expect((await remoteGit.revparse([result.git.branchName])).trim()).toBe(result.git.commitSha);
		expect((await remoteGit.revparse([`${result.git.branchName}^`])).trim()).toBe(baseCommit);
		// The base branch stays where it was.
		expect((await remoteGit.revparse(['main'])).trim()).toBe(baseCommit);

		const { dir } = await inspectBranch(remote.bareDir, result.git.branchName);
		const workflowIds = (await readBranchEntities(dir, 'workflow.json')).map((w) => w.id);
		expect(workflowIds).toContain(w3.id);
		for (const w of workflows) expect(workflowIds).toContain(w.id);
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

describe('Promote a project selection', () => {
	it('promotes a selected live workflow and returns the pushed branch and commit', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		const w3 = await createWorkflow({ name: 'w3', nodes: [], connections: {} }, project);
		const result = await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [w3.id],
			canExportVariableValues: true,
		});

		const remoteHead = (await simpleGit(remote.bareDir).revparse(['main'])).trim();
		expect(result.git).toEqual({ commitSha: remoteHead, branchName: 'main' });
		expect(result.counts.workflows).toBe(1);

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = (await readBranchEntities(dir, 'workflow.json')).map((w) => w.id);
		expect(onBranch).toContain(w3.id);
	});

	it('keeps an archived selected workflow on the branch, archived', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		const workflowRepository = Container.get(WorkflowRepository);
		await workflowRepository.update(workflows[0].id, { isArchived: true });

		await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [workflows[0].id],
			canExportVariableValues: true,
		});

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = (await readBranchEntities(dir, 'workflow.json')).map((w) => w.id);
		// The archived workflow stays on the branch, carried as archived, the same
		// way a full promote treats it, so the two promotes do not fight.
		expect(onBranch).toContain(workflows[0].id);
		expect(await readBranchWorkflowArchived(dir, workflows[0].id)).toBe(true);
		expect(onBranch).toContain(workflows[1].id);
	});

	it('promotes a workflow archived since the last promote as an archived write', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		// A workflow created and archived after the baseline is not on the branch.
		const workflowRepository = Container.get(WorkflowRepository);
		const w3 = await createWorkflow({ name: 'w3', nodes: [], connections: {} }, project);
		await workflowRepository.update(w3.id, { isArchived: true });

		// Selecting it next to a valid workflow must not fail the whole request; it
		// is written to the branch as archived rather than treated as a deletion.
		await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [workflows[0].id, w3.id],
			canExportVariableValues: true,
		});

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = (await readBranchEntities(dir, 'workflow.json')).map((w) => w.id);
		expect(onBranch).toContain(w3.id);
		expect(await readBranchWorkflowArchived(dir, w3.id)).toBe(true);
		expect(onBranch).toContain(workflows[0].id);
	});

	it('drops a workflow that moved to another project from the branch as a deletion', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project: orders, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		const { project: billing } = await setupProjectWithWorkflows('Billing', []);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		// Move w1 to Billing. Orders no longer owns it, so its change list shows it
		// as a deletion. The branch still holds it under Orders from the full promote.
		await Container.get(SharedWorkflowRepository).update(
			{ workflowId: workflows[0].id, role: 'workflow:owner' },
			{ projectId: billing.id },
		);

		await service.promoteProjectSelection(orders.id, owner, {
			workflowIds: [workflows[0].id],
			canExportVariableValues: true,
		});

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = (await readBranchEntities(dir, 'workflow.json')).map((w) => w.id);
		expect(onBranch).not.toContain(workflows[0].id);
		expect(onBranch).toContain(workflows[1].id);
	});

	it('rejects a selection with a workflow that belongs to another project on the branch and pushes nothing', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const { project: orders } = await setupProjectWithWorkflows('Orders', ['w1']);
		const { workflows: billingWorkflows } = await setupProjectWithWorkflows('Billing', ['b1']);
		await service.promote(connection.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const headBefore = (await simpleGit(remote.bareDir).revparse(['main'])).trim();

		// b1 belongs to Billing, so Orders classifies it as a deletion. The branch
		// holds it under Billing, so assertDeletionsOnBranch refuses it before any write.
		await expect(
			service.promoteProjectSelection(orders.id, owner, {
				workflowIds: [billingWorkflows[0].id],
				canExportVariableValues: true,
			}),
		).rejects.toThrow('do not belong to the selected project');

		expect((await simpleGit(remote.bareDir).revparse(['main'])).trim()).toBe(headBefore);
	});
});

describe('Promotion base branch listing', () => {
	let project: Project;
	const listBaseBranchFiles = async (projectId: string) =>
		(await service.readBranchPackage(projectId, 'promote')).files;

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
		const variable = await createVariable('API_URL', 'https://api.example.com');
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
				.map(({ target }) => `n8n-export/${entityFilePath(collection, target)}`),
		);

		const files = await listBaseBranchFiles(project.id);

		expect(files.map(({ entityId, type }) => ({ entityId, type }))).toEqual(
			expect.arrayContaining([
				{ entityId: project.id, type: 'project' },
				{ entityId: parentFolder.id, type: 'folder' },
				{ entityId: childFolder.id, type: 'folder' },
				{ entityId: workflow.id, type: 'workflow' },
				{ entityId: credential.id, type: 'credential' },
				{ entityId: variable.id, type: 'variable' },
				{ entityId: tag.id, type: 'tag' },
				{ entityId: projectTable.id, type: 'dataTable' },
				{ entityId: sharedTable.id, type: 'dataTable' },
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
		expect(await listBaseBranchFiles(project.id)).toEqual([
			{
				entityId: project.id,
				slug: 'orders',
				projectId: project.id,
				fileName: 'project.json',
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

		expect(await listBaseBranchFiles(project.id)).toEqual([
			{
				entityId: project.id,
				slug: 'orders',
				projectId: project.id,
				fileName: 'project.json',
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

		const firstListing = await listBaseBranchFiles(project.id);
		expect(firstListing).toHaveLength(2);
		expect(firstListing).toContainEqual({
			entityId: 'Va45zz67',
			slug: 'my "quoted" var',
			projectId: null,
			fileName: 'variable.json',
			path: variablePath,
			blobSha: await remoteBlobSha(remote, variablePath),
			type: 'variable',
		});

		const workflowPath = `n8n-export/projects/ünïcode örders-${project.id}/workflows/my-hyphen-ated-slug-Wf99zz88/workflow.json`;
		await writeRemoteFile(remote, workflowPath, '{"name":"My hyphen-ated workflow"}');
		await commitAndPushRemote(remote, 'Add workflow');

		const secondListing = await listBaseBranchFiles(project.id);

		expect(secondListing).toContainEqual({
			entityId: 'Wf99zz88',
			slug: 'my-hyphen-ated-slug',
			projectId: project.id,
			fileName: 'workflow.json',
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

		const branch = await service.readBranchPackage(project.id, 'promote');

		expect(branch).toMatchObject({ commitSha: null, files: [] });
	});

	it('reads the package of the apply branch at one commit, contents included', async () => {
		const remote = await createRemote();
		const projectPath = `n8n-export/projects/orders-${project.id}/project.json`;
		await writeRemoteFile(remote, projectPath, '{"name":"Orders"}');
		await writeRemoteFile(remote, 'n8n-export/manifest.json', '{"packageFormatVersion":"1"}');
		await commitAndPushRemote(remote, 'Export');
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'apply');

		const branch = await service.readBranchPackage(project.id, 'apply');

		expect(branch.commitSha).toBe((await simpleGit(remote.bareDir).revparse(['main'])).trim());
		expect(branch.files).toEqual([
			expect.objectContaining({ entityId: project.id, path: projectPath }),
		]);
		await expect(branch.readFiles([projectPath, 'n8n-export/manifest.json'])).resolves.toEqual(
			new Map([
				[projectPath, '{"name":"Orders"}'],
				['n8n-export/manifest.json', '{"packageFormatVersion":"1"}'],
			]),
		);

		// A later push is read at its own commit, and the earlier commit stays readable.
		await writeRemoteFile(remote, projectPath, '{"name":"Renamed"}');
		await commitAndPushRemote(remote, 'Rename');
		const later = await service.readBranchPackage(project.id, 'apply');
		expect(later.commitSha).not.toBe(branch.commitSha);
		expect((await later.readFiles([projectPath])).get(projectPath)).toBe('{"name":"Renamed"}');
		expect((await branch.readFiles([projectPath])).get(projectPath)).toBe('{"name":"Orders"}');
	});

	it('preserves files with matching IDs or variable slugs across collections and scopes', async () => {
		const remote = await createRemote();
		const projectRoot = `n8n-export/projects/orders-${project.id}`;
		const entities = [
			{
				entityId: '42',
				slug: 'legacy',
				projectId: project.id,
				fileName: 'folder.json',
				type: 'folder',
				path: `${projectRoot}/folders/legacy-42/folder.json`,
			},
			{
				entityId: '42',
				slug: 'order',
				projectId: project.id,
				fileName: 'workflow.json',
				type: 'workflow',
				path: `${projectRoot}/folders/legacy-42/workflows/order-42/workflow.json`,
			},
			{
				entityId: '42',
				slug: 'api',
				projectId: project.id,
				fileName: 'credential.json',
				type: 'credential',
				path: `${projectRoot}/credentials/api-42/credential.json`,
			},
			{
				entityId: '1',
				slug: 'apiurl',
				projectId: project.id,
				fileName: 'variable.json',
				type: 'variable',
				path: `${projectRoot}/variables/apiurl-1/variable.json`,
			},
			{
				entityId: '2',
				slug: 'apiurl',
				projectId: null,
				fileName: 'variable.json',
				type: 'variable',
				path: 'n8n-export/variables/apiurl-2/variable.json',
			},
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

		const files = await listBaseBranchFiles(project.id);

		expect(files.map(({ blobSha, ...entity }) => entity)).toEqual(expect.arrayContaining(entities));
		expect(files).toHaveLength(entities.length);
	});

	it('reports an unavailable remote before its first commit', async () => {
		const bareDir = path.join(testRoot, 'empty-remote.git');
		await simpleGit().raw(['init', '--bare', bareDir]);
		const connection = await createInstanceConnection(bareDir);
		await service.clone(connection.id, 'promote');
		await rename(bareDir, `${bareDir}.offline`);

		await expect(listBaseBranchFiles(project.id)).rejects.toThrow(BadRequestError);
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
		await expect(listBaseBranchFiles(project.id)).rejects.toThrow('not cloned');
		await service.clone(connection.id, 'promote');

		const files = await listBaseBranchFiles(project.id);

		expect(files).toEqual([
			{
				entityId: project.id,
				slug: 'orders',
				projectId: project.id,
				fileName: 'project.json',
				path: projectPath,
				blobSha: (await remote.git.revparse([`production:${projectPath}`])).trim(),
				type: 'project',
			},
		]);

		await remote.git.raw(['push', 'origin', '--delete', 'production']);
		await simpleGit(remote.bareDir).raw(['update-ref', '-d', 'refs/heads/main']);
		await expect(listBaseBranchFiles(project.id)).rejects.toThrow(BadRequestError);
	});
});
