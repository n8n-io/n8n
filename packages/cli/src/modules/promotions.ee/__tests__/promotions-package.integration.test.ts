import {
	AgentJsonConfigSchema,
	applyPackageResultSchema,
	type ApplyPackageResultDto,
	type ContinueApplyPackageDto,
	type PromotionProviderType,
} from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	mockLogger,
	testDb,
	testModules,
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
import { jsonParse, type INode } from 'n8n-workflow';
import assert from 'node:assert';
import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { BadRequestError } from '@n8n/errors';
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
import { PackageDirectoryInventoryReader } from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	ExportDependencyPolicy,
	ExportVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import { TagService } from '@/services/tag.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { createFolder } from '@test-integration/db/folders';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwnerWithApiKey } from '@test-integration/db/users';
import { createProjectVariable, createVariable } from '@test-integration/db/variables';
import { initNodeTypes, initCredentialsTypes, setupTestServer } from '@test-integration/utils';

import { PromotionEnvironmentProjectRepository } from '../database/repositories/promotion-environment-project.repository';
import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionRunRepository } from '../database/repositories/promotion-run.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import type { GitHostClients } from '../git-hosts/git-host-clients';
import { ApplyPreviewService } from '../apply-preview.service';
import { LocalPackageEntities } from '../local-package-entities.service';
import { PromotionChangeService } from '../promotion-change.service';
import { PromotionEnvironmentResolver } from '../promotion-environment.resolver';
import { PromotionProvidersService } from '../promotion-providers.service';
import { PromotionReviewGateService } from '../promotion-review-gate.service';
import { PromotionReviewsService } from '../promotion-reviews.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import { PromotionsGitService } from '../promotions-git.service';
import { PromotionsService } from '../promotions.service';
import { WorkingCopyUpdater } from '../working-copy-updater';
import { storedAgentConfig } from '@/modules/agents/__tests__/test-utils/stored-agent-config';

type TestRemote = {
	bareDir: string;
	workingDir: string;
	git: SimpleGit;
};

beforeAll(async () => await testModules.loadModules(['agents']));
const testServer = setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['n8n-packages', 'promotions', 'data-table'],
	enabledFeatures: ['feat:promotions'],
});
const licenseMocker = testServer.license;

mockInstance(ActiveWorkflowManager);

let providerRepository: PromotionProviderRepository;
let environmentRepository: PromotionEnvironmentRepository;
let linkRepository: PromotionEnvironmentProjectRepository;
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
	environmentRepository = Container.get(PromotionEnvironmentRepository);
	linkRepository = Container.get(PromotionEnvironmentProjectRepository);
	projectRepository = Container.get(ProjectRepository);
	projectService = Container.get(ProjectService);
	packagesService = Container.get(N8nPackagesService);

	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin', 'feat:folders', 'feat:promotions'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
});

beforeEach(async () => {
	await Container.get(AgentRepository).delete({});
	// Delete children before parents to satisfy the foreign keys.
	await Container.get(PromotionRunRepository).delete({});
	await linkRepository.delete({});
	await environmentRepository.delete({});
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
		new PromotionEnvironmentResolver(environmentRepository, linkRepository, projectRepository),
		new PromotionProvidersService(
			providerRepository,
			environmentRepository,
			gitService,
			cipher,
			mock<GitHostClients>(),
			mock<EventService>(),
		),
		workingDirectory,
		new WorkingCopyUpdater(instanceSettings, logger),
		gitService,
		projectRepository,
		Container.get(SharedWorkflowRepository),
		projectService,
		Container.get(FolderService),
		packagesService,
		Container.get(ApplyPreviewService),
		Container.get(PackageDirectoryInventoryReader),
		Container.get(PackageImportConfig),
		Container.get(PromotionRunRepository),
		Container.get(PromotionReviewsService),
		mock<EventService>(),
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

async function createInstanceEnvironments(
	remoteUrl: string,
	branches: { apply: string; promote: string } = { apply: 'main', promote: 'main' },
	createBranchOnPromotion = false,
	providerType: PromotionProviderType = 'git',
) {
	const provider = await providerRepository.insertProvider({
		name: 'Bot user',
		type: providerType,
		authType: 'token',
		config: {
			schemaVersion: 1,
			...(providerType === 'gitlab' && { baseUrl: 'https://gitlab.example.com' }),
		},
		auth: JSON.stringify({
			schemaVersion: 1,
			username: providerType === 'gitlab' ? 'n8n' : 'git-user',
			password: 'git-password',
		}),
	});
	const fields = {
		name: 'Production',
		scope: 'instance' as const,
		providerId: provider.id,
		remote: { schemaVersion: 1 as const, remoteUrl },
	};
	const apply = await environmentRepository.insertEnvironment({
		...fields,
		direction: 'apply',
		settings: { schemaVersion: 1, branchName: branches.apply },
	});
	const promote = await environmentRepository.insertEnvironment({
		...fields,
		direction: 'promote',
		settings: { schemaVersion: 1, baseBranchName: branches.promote, createBranchOnPromotion },
	});
	return { apply, promote };
}

async function snapshotApplyState() {
	return await Promise.all([
		Container.get(DataTableRepository).find({ order: { id: 'ASC' } }),
		Container.get(DataTableColumnRepository).find({ order: { id: 'ASC' } }),
		Container.get(ProjectRepository).find({ order: { id: 'ASC' } }),
		Container.get(ProjectRelationRepository)
			.find({
				relations: { role: true },
				order: { projectId: 'ASC', userId: 'ASC' },
			})
			.then((relations) => {
				for (const relation of relations) {
					relation.role.scopes.sort((a, b) => a.slug.localeCompare(b.slug));
				}
				return relations;
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

async function prepareBindingApply(unselectedVariableName?: string) {
	const remote = await createRemote();
	const environments = await createInstanceEnvironments(remote.bareDir);
	await service.clone(environments.promote.id, owner);
	await service.clone(environments.apply.id, owner);
	const project = await projectService.createTeamProject(
		owner,
		{
			name: 'Orders',
			icon: { type: 'icon', value: 'briefcase' },
		},
		{ description: 'Order workflows', customTelemetryTags: [{ key: ' team ', value: 'Sales' }] },
	);
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
	const unselectedVariable = unselectedVariableName
		? await createVariable(unselectedVariableName, 'unselected source value')
		: undefined;
	const unselectedWorkflow = unselectedVariable
		? await buildWorkflowReferencingVariables({
				name: 'Unselected workflow',
				project,
				variableNames: [unselectedVariable.key],
			})
		: undefined;
	const promoted = await service.promote(environments.promote.id, owner, {
		canExportVariableValues: true,
		commitMessage: 'Export orders',
	});
	if (unselectedVariable) await Container.get(VariablesRepository).delete(unselectedVariable.id);
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
	return {
		remote,
		environments,
		commitSha: promoted.git.commitSha,
		project,
		credential,
		variable,
		workflow,
		removedProject,
		unselectedWorkflow,
		unselectedVariable,
	};
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
	fileName: (typeof PACKAGE_ENTITY_LAYOUT)[
		| 'workflows'
		| 'folders'
		| 'projects'
		| 'agents']['fileName'],
): Promise<Array<{ id: string; name: string; target: string }>> {
	const exportRoot = path.join(inspectionDir, 'n8n');
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
	const exportRoot = path.join(inspectionDir, 'n8n');
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

/** The Apply preview, read through the test's `service` and its working directory. */
async function loadApplyPreview(projectId: string) {
	const preview = await changeService().getPreview(owner, projectId, 'apply', {
		sort: 'name',
		order: 'asc',
	});
	assert(preview.check && preview.commitSha && preview.revision);
	return {
		...preview,
		check: preview.check,
		commitSha: preview.commitSha,
		revision: preview.revision,
	};
}

function changeService() {
	return new PromotionChangeService(
		service,
		packagesService,
		Container.get(ApplyPreviewService),
		Container.get(WorkflowRepository),
		Container.get(SharedWorkflowRepository),
		Container.get(LocalPackageEntities),
		Container.get(PromotionEnvironmentResolver),
		Container.get(PromotionReviewGateService),
		mockLogger(),
	);
}

async function listApplyChanges(projectId: string) {
	const { changes } = await changeService().getChanges(owner, projectId, 'apply', {
		sort: 'name',
		order: 'asc',
	});
	return changes;
}

function dataTableNode(table: { id: string; name: string }): INode {
	return {
		id: `node-${table.id}`,
		name: table.name,
		type: 'n8n-nodes-base.dataTable',
		typeVersion: 1,
		position: [0, 0],
		parameters: { dataTableId: { __rl: true, mode: 'id', value: table.id } },
	};
}

/** Promotes a team project whose `Process order` workflow uses the `Orders` and `Customers` tables. */
async function promoteDataTableWorkflows() {
	const remote = await createRemote();
	const environments = await createInstanceEnvironments(remote.bareDir);
	await service.clone(environments.promote.id, owner);
	await service.clone(environments.apply.id, owner);
	const project = await createTeamProject('Sales', owner);
	const dataTableService = Container.get(DataTableService);
	const orders = await dataTableService.createDataTable(project.id, {
		name: 'Orders',
		columns: [
			{ name: 'email', type: 'string' },
			{ name: 'note', type: 'string' },
		],
	});
	const customers = await dataTableService.createDataTable(project.id, {
		name: 'Customers',
		columns: [{ name: 'email', type: 'string' }],
	});
	const workflow = await createWorkflow(
		{ name: 'Process order', nodes: [orders, customers].map(dataTableNode), connections: {} },
		project,
	);
	const plainWorkflow = await createWorkflow(
		{ name: 'Send report', nodes: [], connections: {} },
		project,
	);
	const promoted = await service.promote(environments.promote.id, owner, {
		canExportVariableValues: true,
		commitMessage: 'Export sales',
	});
	return {
		environments,
		commitSha: promoted.git.commitSha,
		project,
		workflow,
		plainWorkflow,
		orders,
		customers,
		dataTableService,
	};
}

function headerAuthNode(credential: { id: string; name: string }): INode {
	return {
		id: `node-${credential.id}`,
		name: credential.name,
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: { url: 'https://example.com' },
		credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
	};
}

/**
 * Promotes a team project whose `Charge` workflow uses the `Billing header` credential and whose
 * `Report` workflow uses the `Report header` credential.
 */
async function promoteCredentialWorkflows() {
	const remote = await createRemote();
	const environments = await createInstanceEnvironments(remote.bareDir);
	await service.clone(environments.promote.id, owner);
	await service.clone(environments.apply.id, owner);
	const project = await createTeamProject('Billing', owner);
	const credential = await saveCredential(
		{ name: 'Billing header', type: 'httpHeaderAuth', data: { name: 'X-Token', value: 'secret' } },
		{ project, role: 'credential:owner' },
	);
	const reportCredential = await saveCredential(
		{ name: 'Report header', type: 'httpHeaderAuth', data: { name: 'X-Token', value: 'secret' } },
		{ project, role: 'credential:owner' },
	);
	const workflow = await createWorkflow(
		{ name: 'Charge', nodes: [headerAuthNode(credential)], connections: {} },
		project,
	);
	const reportWorkflow = await createWorkflow(
		{ name: 'Report', nodes: [headerAuthNode(reportCredential)], connections: {} },
		project,
	);
	await service.promote(environments.promote.id, owner, {
		canExportVariableValues: true,
		commitMessage: 'Export billing',
	});
	return { remote, environments, project, credential, reportCredential, workflow, reportWorkflow };
}

/** Changes credential files on the branch, as a later promotion from the source would. */
async function changeBranchCredentials(
	remote: TestRemote,
	changes: Record<string, { name: string; data: Record<string, string> }>,
) {
	await remote.git.pull('origin', 'main');
	const walk = async (dir: string): Promise<void> => {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
				continue;
			}
			if (entry.name !== PACKAGE_ENTITY_LAYOUT.credentials.fileName) continue;
			const file = jsonParse<{ id: string }>(await readFile(fullPath, 'utf-8'));
			const change = changes[file.id];
			if (change) await writeFile(fullPath, JSON.stringify({ ...file, ...change }, null, 2));
		}
	};
	await walk(path.join(remote.workingDir, 'n8n'));
	// The manifest lists each credential name too, and the reader checks that both agree.
	const manifestPath = path.join(remote.workingDir, 'n8n', 'manifest.json');
	const manifest = jsonParse<{ credentials?: Array<{ id: string; name: string }> }>(
		await readFile(manifestPath, 'utf-8'),
	);
	for (const entry of manifest.credentials ?? []) {
		entry.name = changes[entry.id]?.name ?? entry.name;
	}
	await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
	await commitAndPushRemote(remote, 'Change credentials');
}

async function storedCredential(id: string) {
	const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });
	return {
		name: credential.name,
		updatedAt: credential.updatedAt,
		data: await Container.get(CredentialsService).decrypt(credential, true),
	};
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
	it('ignores role scope order in database snapshots', async () => {
		await createTeamProject('Orders', owner);
		const before = await snapshotApplyState();
		const repository = Container.get(ProjectRelationRepository);
		const findRelations = repository.find.bind(repository);
		const findSpy = vi.spyOn(repository, 'find').mockImplementationOnce(async (options) => {
			const relations = await findRelations(options);
			const relation = relations.find(({ role }) => role.scopes.length > 1);
			assert(relation);
			const originalSlugs = relation.role.scopes.map(({ slug }) => slug);
			relation.role.scopes.reverse();
			expect(relation.role.scopes.map(({ slug }) => slug)).not.toEqual(originalSlugs);
			return relations;
		});

		try {
			expect(await snapshotApplyState()).toEqual(before);
		} finally {
			findSpy.mockRestore();
		}
	});

	it('rejects a missing branch when the remote contains only tags', async () => {
		const remote = await createRemote();
		await remote.git.raw(['push', 'origin', 'HEAD:refs/tags/v1']);
		await simpleGit(remote.bareDir).raw(['update-ref', '-d', 'refs/heads/main']);
		const environments = await createInstanceEnvironments(remote.bareDir);

		await expect(service.clone(environments.promote.id, owner)).rejects.toThrow(
			'Remote branch does not exist: main',
		);
	});

	it.each([false, true])(
		'checks permission before exporting referenced variable values: %s',
		async (canExportVariableValues) => {
			const remote = await createRemote();
			const environments = await createInstanceEnvironments(remote.bareDir);
			await service.clone(environments.promote.id, owner);
			const originalHead = (await simpleGit(remote.bareDir).revparse(['main'])).trim();
			const project = await createTeamProject('Orders', owner);
			await createVariable('API_URL', 'https://api.example.com');
			await buildWorkflowReferencingVariables({
				name: 'Process order',
				project,
				variableNames: ['API_URL'],
			});

			const result = service.promote(environments.promote.id, owner, {
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

	it('exports all team projects and pushes to the base branch', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const project = await createTeamProject('Orders', owner);
		await Container.get(AgentRepository).save({
			id: 'local-agent',
			name: 'Local Agent',
			projectId: project.id,
			schema: storedAgentConfig(
				AgentJsonConfigSchema.parse({
					name: 'Local Agent',
					model: '',
					instructions: '',
					subAgents: { agents: [{ agentId: 'external-agent' }] },
				}),
			),
		});
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);

		const result = await service.promote(environments.promote.id, owner, {
			canExportVariableValues: false,
			commitMessage: 'Export orders',
		});

		const inspectionDir = path.join(testRoot, 'promote-inspection');
		await simpleGit().clone(remote.bareDir, inspectionDir, ['--branch', 'main', '--single-branch']);
		const inspectionGit = simpleGit(inspectionDir);
		const remoteHead = (await inspectionGit.revparse(['HEAD'])).trim();
		const pushedCommit = (await inspectionGit.log({ maxCount: 1 })).latest;
		const manifest = packageManifestSchema.parse(
			jsonParse(await readFile(path.join(inspectionDir, 'n8n', 'manifest.json'), 'utf-8')),
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
			readFile(path.join(inspectionDir, 'n8n', projectEntry.target, 'project.json')),
		).resolves.toBeDefined();
		await expect(
			readFile(path.join(inspectionDir, 'n8n', workflowEntry.target, 'workflow.json')),
		).resolves.toBeDefined();
		expect(result.git).toEqual({ commitSha: remoteHead, branchName: 'main' });
		expect(result.counts.workflows).toBe(1);
		expect(manifest.agents).toBeUndefined();
		await expect(
			readBranchEntities(inspectionDir, PACKAGE_ENTITY_LAYOUT.agents.fileName),
		).resolves.toEqual([]);
	});

	// GitLab remotes must use the provider host, so a local remote only works with plain Git.
	it.each(['git'] as const)(
		'creates a timestamped branch for each promotion with %s',
		async (providerType) => {
			const remote = await createRemote();
			const environments = await createInstanceEnvironments(
				remote.bareDir,
				{ apply: 'main', promote: 'main' },
				true,
				providerType,
			);
			await service.clone(environments.promote.id, owner);

			const project = await createTeamProject('Orders', owner);
			const workflow = await createWorkflow(
				{ name: 'Process order', nodes: [], connections: {} },
				project,
			);
			const baseCommit = (await remote.git.revparse(['main'])).trim();

			const first = await service.promote(environments.promote.id, owner, {
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

			const second = await service.promote(environments.promote.id, owner, {
				canExportVariableValues: false,
				commitMessage: 'Promote orders again',
			});

			expect(second.git.branchName).not.toBe(first.git.branchName);
			expect((await remoteGit.revparse([second.git.branchName])).trim()).toBe(second.git.commitSha);
			expect((await remoteGit.revparse([`${second.git.branchName}^`])).trim()).toBe(
				mergedBaseCommit,
			);
			expect((await remoteGit.revparse(['main'])).trim()).toBe(mergedBaseCommit);
		},
	);

	it('pushes a direct promotion after the base branch moved on the remote', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		const project = await createTeamProject('Orders', owner);
		await createWorkflow({ name: 'Process order', nodes: [], connections: {} }, project);
		const promote = async (commitMessage: string) =>
			await service.promote(environments.promote.id, owner, {
				canExportVariableValues: false,
				commitMessage,
			});
		await promote('First promotion');

		// A merged review moves the base branch outside n8n.
		await remote.git.fetch('origin', 'main');
		await remote.git.raw(['reset', '--hard', 'origin/main']);
		await writeFile(path.join(remote.workingDir, 'REVIEWED.md'), 'merged\n');
		await remote.git.add(['REVIEWED.md']);
		await remote.git.commit('Merge a promotion review');
		await remote.git.push('origin', 'main');
		const movedCommit = (await remote.git.revparse(['HEAD'])).trim();
		// An unchanged instance exports the same package, so add a workflow for a new commit.
		await createWorkflow({ name: 'Ship order', nodes: [], connections: {} }, project);

		const result = await promote('Second promotion');

		const { git } = await inspectBranch(remote.bareDir);
		expect(result.git.commitSha).not.toBe(movedCommit);
		expect((await git.revparse(['HEAD'])).trim()).toBe(result.git.commitSha);
		expect((await git.revparse(['HEAD^'])).trim()).toBe(movedCommit);
	});

	it('requires a clone after a branched promotion cannot restore its checkout', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(
			remote.bareDir,
			{ apply: 'main', promote: 'main' },
			true,
		);
		const { environmentId } = await service.clone(environments.promote.id, owner);
		const { repositoryFolder, descriptorFile } = workingDirectory.paths(environmentId);
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

		const result = await service.promote(environments.promote.id, owner, request);

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
		await expect(reloadedDirectory.readDescriptor(environmentId)).resolves.toBeNull();
		await environmentRepository.update(environmentId, {
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
		});
		const exportSpy = vi.spyOn(packagesService, 'exportPackageToDirectory');
		try {
			await expect(service.promote(environments.promote.id, owner, request)).rejects.toThrow(
				'not connected',
			);
			expect(exportSpy).not.toHaveBeenCalled();
			await service.clone(environments.promote.id, owner);
			await expect(service.promote(environments.promote.id, owner, request)).resolves.toMatchObject(
				{
					git: { branchName: 'main' },
				},
			);
			const remoteGit = simpleGit(remote.bareDir);
			expect((await remoteGit.revparse(['main^'])).trim()).toBe(baseCommit);
		} finally {
			exportSpy.mockRestore();
		}
	});

	it('requires the configured base branch for a branched promotion', async () => {
		const bareDir = path.join(testRoot, 'empty-remote.git');
		await simpleGit().raw(['init', '--bare', bareDir]);
		const environments = await createInstanceEnvironments(
			bareDir,
			{ apply: 'main', promote: 'main' },
			true,
		);
		await service.clone(environments.promote.id, owner);

		await expect(
			service.promote(environments.promote.id, owner, {
				canExportVariableValues: false,
				commitMessage: 'Promote orders',
			}),
		).rejects.toThrow('Remote branch does not exist: main');
		await expect(simpleGit(bareDir).raw(['show-ref', '--heads'])).resolves.toBe('');
	});

	it('applies the package and matches the managed target scope', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.apply.id, owner);

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
				dependencyPolicy: ExportDependencyPolicy.Fail,
				versionPolicy: ExportVersionPolicy.Latest,
			},
			{ targetDir: path.join(remote.workingDir, 'n8n') },
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

		const blocked = await service.apply(environments.apply.id, owner);
		assert(blocked.status === 'blocked');
		expect(blocked.check.conflicts).toEqual([
			{
				kind: 'project',
				code: 'project-deletion',
				project: { id: removedProject.id, name: 'Removed from Git' },
			},
		]);
		expect(await projectRepository.findOneBy({ id: removedProject.id })).not.toBeNull();

		const result = await service.continueApply(environments.apply.id, owner, {
			expectedSource: { environmentId: blocked.environmentId, ...blocked.git },
			confirmDestructiveChanges: true,
		});
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

	it('keeps a project whose folder is on the branch but missing from the manifest', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.apply.id, owner);
		const listed = await createTeamProject('Orders', owner);
		const unlisted = await createTeamProject('Unlisted', owner);
		const exportDir = path.join(remote.workingDir, 'n8n');
		await packagesService.exportPackageToDirectory(
			{
				user: owner,
				projectIds: [listed.id, unlisted.id],
				includeVariableValues: true,
				includeTags: true,
				dependencyPolicy: ExportDependencyPolicy.Fail,
				versionPolicy: ExportVersionPolicy.Latest,
			},
			{ targetDir: exportDir },
		);
		// A bad merge can drop a manifest entry and leave the project folder.
		const manifestPath = path.join(exportDir, 'manifest.json');
		const manifest = jsonParse<{ projects: Array<{ id: string }> }>(
			await readFile(manifestPath, 'utf-8'),
		);
		manifest.projects = manifest.projects.filter(({ id }) => id !== unlisted.id);
		await writeFile(manifestPath, JSON.stringify(manifest));
		await commitAndPushRemote(remote, 'Drop a manifest entry');

		const result = await service.apply(environments.apply.id, owner);

		assert(result.status === 'applied', JSON.stringify(result));
		expect(result.counts.projects.deleted).toBe(0);
		expect(await projectRepository.findOneBy({ id: unlisted.id })).not.toBeNull();
	});

	it('applies a package whose workflow sits two folders deep', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.apply.id, owner);

		const sourceProject = await createTeamProject('Orders', owner);
		const parentFolder = await createFolder(sourceProject, { name: 'Operations' });
		const childFolder = await createFolder(sourceProject, {
			name: 'Orders',
			parentFolder,
		});
		const sourceWorkflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {}, parentFolder: childFolder },
			sourceProject,
		);
		await packagesService.exportPackageToDirectory(
			{
				user: owner,
				projectIds: [sourceProject.id],
				includeVariableValues: true,
				includeTags: true,
				dependencyPolicy: ExportDependencyPolicy.Fail,
				versionPolicy: ExportVersionPolicy.Latest,
			},
			{ targetDir: path.join(remote.workingDir, 'n8n') },
		);
		await remote.git.add(['--all']);
		await remote.git.commit('Export nested orders');
		await remote.git.push('origin', 'main');

		// Apply into a fresh target: the project and its folders do not exist yet.
		await projectService.deleteProject(owner, sourceProject.id);
		await projectService.createTeamProject(
			owner,
			{ name: 'Orders (outdated)' },
			{ id: sourceProject.id },
		);

		const result = await service.apply(environments.apply.id, owner);
		assert(result.status === 'applied');

		const importedParent = await Container.get(FolderRepository).findOneBy({ id: parentFolder.id });
		const importedChild = await Container.get(FolderRepository).findOneBy({ id: childFolder.id });
		expect(importedParent?.parentFolderId).toBeNull();
		expect(importedChild?.parentFolderId).toBe(parentFolder.id);

		const importedWorkflow = await Container.get(WorkflowRepository).findOne({
			where: { id: sourceWorkflow.id },
			relations: { parentFolder: true },
		});
		expect(importedWorkflow?.name).toBe('Process order');
		expect(importedWorkflow?.parentFolder?.id).toBe(childFolder.id);
	});

	it.each([
		{ targetValue: '', shadow: false, missingProject: true },
		{ targetValue: 'configured target value', shadow: true, missingProject: false },
	])(
		'continues after binding setup with missing project: $missingProject',
		async ({ targetValue, shadow, missingProject }) => {
			const { environments, credential, variable, project, workflow, removedProject } =
				await prepareBindingApply();
			if (missingProject) await projectService.deleteProject(owner, project.id);
			const before = await snapshotApplyState();
			const agent = testServer.publicApiAgentFor(owner);
			const applyResponse = await agent
				.post(`/promotions/environments/${environments.apply.id}/apply`)
				.send({})
				.expect(200);
			const blocked = applyResponse.body;
			assert(blocked.status === 'blocked');
			expect(blocked.check.missingBindings).toEqual(
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
			const request = {
				expectedSource: { environmentId: blocked.environmentId, ...blocked.git },
				confirmDestructiveChanges: true,
			};

			const stillBlocked = (
				await agent
					.post(`/promotions/environments/${environments.apply.id}/apply/continue`)
					.send(request)
					.expect(200)
			).body;
			expect(stillBlocked).toEqual(blocked);
			expect(await snapshotApplyState()).toEqual(before);

			if (missingProject) {
				expect(blocked.check.missingProjects).toEqual([
					{
						id: project.id,
						name: project.name,
						icon: project.icon,
						description: project.description,
						customTelemetryTags: project.customTelemetryTags,
					},
				]);
				await agent.post('/projects').send(blocked.check.missingProjects[0]).expect(201);
				// A failed binding request must leave the created project in place.
				await agent.post('/credentials').send({ projectId: project.id }).expect(400);
				expect(await projectRepository.findOneBy({ id: project.id })).toMatchObject(
					blocked.check.missingProjects[0],
				);
			} else {
				await projectRepository.update(project.id, {
					name: 'Outdated',
					description: 'Outdated',
					icon: null,
					customTelemetryTags: [],
				});
			}

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
					.post(`/promotions/environments/${environments.apply.id}/apply/continue`)
					.send(request)
					.expect(200)
			).body;
			expect(wrongId.status).toBe('blocked');
			expect(wrongId.check.missingBindings).toContainEqual(
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
					.post(`/promotions/environments/${environments.apply.id}/apply/continue`)
					.send(request)
					.expect(200)
			).body;
			assert(result.status === 'applied', JSON.stringify(result));
			expect(result.warnings).toEqual(
				shadow ? [expect.objectContaining({ code: 'variable-shadowed', name: variable.key })] : [],
			);
			expect(await projectRepository.findOneBy({ id: project.id })).toMatchObject({
				id: project.id,
				name: project.name,
				icon: project.icon,
				description: project.description,
				customTelemetryTags: project.customTelemetryTags,
			});
			expect(result.counts.projects.created).toBe(0);

			expect(result.counts.credentials).toEqual({ matched: 1, stubbed: 0, updated: 0 });
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
		const { environments, remote, project } = await prepareBindingApply();
		await projectService.deleteProject(owner, project.id);
		const blocked = await service.apply(environments.apply.id, owner);
		assert(blocked.status === 'blocked');
		await testServer
			.publicApiAgentFor(owner)
			.post('/projects')
			.send(blocked.check.missingProjects[0])
			.expect(201);
		const before = await snapshotApplyState();
		await remote.git.pull('origin', 'main');
		await writeRemoteFile(remote, 'README.md', 'Updated description');
		await commitAndPushRemote(remote, 'Update description');
		const result = await service.continueApply(environments.apply.id, owner, {
			expectedSource: { environmentId: blocked.environmentId, ...blocked.git },
		});
		expect(result).toEqual({
			status: 'source-changed',
			environmentId: blocked.environmentId,
			git: { branchName: 'main', commitSha: (await remote.git.revparse(['HEAD'])).trim() },
		});
		expect(await snapshotApplyState()).toEqual(before);
		const reviewed = await service.apply(environments.apply.id, owner);
		expect(reviewed.status).toBe('blocked');
		expect(reviewed.git).toEqual(result.git);
		expect(await snapshotApplyState()).toEqual(before);
	});

	it('stops the first Apply when the reviewed commit moved and accepts the current one', async () => {
		const { environments, remote } = await prepareBindingApply();
		const reviewed = await service.apply(environments.apply.id, owner);
		assert(reviewed.status === 'blocked');
		const before = await snapshotApplyState();
		await remote.git.pull('origin', 'main');
		await writeRemoteFile(remote, 'README.md', 'Updated description');
		await commitAndPushRemote(remote, 'Update description');
		const source = { environmentId: reviewed.environmentId, ...reviewed.git };

		const moved = await service.apply(environments.apply.id, owner, source);
		expect(moved).toEqual({
			status: 'source-changed',
			environmentId: reviewed.environmentId,
			git: { branchName: 'main', commitSha: (await remote.git.revparse(['HEAD'])).trim() },
		});
		expect(await snapshotApplyState()).toEqual(before);

		const current = await service.apply(environments.apply.id, owner, { ...source, ...moved.git });
		expect(current.status).toBe('blocked');
		expect(await snapshotApplyState()).toEqual(before);
	});

	it('keeps the missing-manifest import error after a clear check', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.apply.id, owner);
		await writeRemoteFile(remote, 'n8n/.gitkeep', '');
		await commitAndPushRemote(remote, 'Add package directory');
		const before = await snapshotApplyState();
		await expect(service.apply(environments.apply.id, owner)).rejects.toThrow(/manifest/i);
		expect(await snapshotApplyState()).toEqual(before);
	});

	it('promotes an archived workflow and archives it on apply instead of removing it', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);

		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);
		const workflowRepository = Container.get(WorkflowRepository);
		await workflowRepository.update(workflow.id, { isArchived: true });

		const promoteResult = await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Archive order flow',
		});
		expect(promoteResult.counts.workflows).toBe(1);

		// The target still holds the active copy; the apply must archive it, not delete it.
		await workflowRepository.update(workflow.id, { isArchived: false });

		const firstApply = await service.apply(environments.apply.id, owner);
		assert(firstApply.status === 'applied');

		expect(await workflowRepository.findOneBy({ id: workflow.id })).toMatchObject({
			isArchived: true,
		});
		expect(firstApply.counts.workflows).toMatchObject({ updated: 1, deleted: 0, archived: 0 });

		// Archived on both sides now; a second apply must still succeed.
		const secondApply = await service.apply(environments.apply.id, owner);
		assert(secondApply.status === 'applied');

		expect(secondApply.counts.workflows).toMatchObject({ updated: 1, deleted: 0 });
		expect(await workflowRepository.findOneBy({ id: workflow.id })).toMatchObject({
			isArchived: true,
		});
	});

	it('promotes to its base branch and applies from a different branch', async () => {
		const remote = await createRemote();
		await createRemoteBranches(remote, ['staging', 'dev']);
		const environments = await createInstanceEnvironments(remote.bareDir, {
			apply: 'dev',
			promote: 'staging',
		});
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);

		// Seed `dev` with a package from somewhere else, then take that project away
		// so the Apply has to bring it back.
		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);
		const promoteResult = await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Promote to staging',
		});
		await remote.git.raw(['fetch', 'origin']);
		await remote.git.raw(['push', 'origin', 'refs/remotes/origin/staging:refs/heads/dev']);
		const devHead = (await remote.git.revparse(['origin/staging'])).trim();
		await Container.get(WorkflowRepository).delete({ id: workflow.id });

		const applyResult = await service.apply(environments.apply.id, owner);

		expect(promoteResult.git.branchName).toBe('staging');
		expect(applyResult.git).toEqual({ commitSha: devHead, branchName: 'dev' });
		expect(await Container.get(WorkflowRepository).findOneBy({ id: workflow.id })).toMatchObject({
			name: 'Process order',
		});

		// `main` never took part, so the packageless branch is untouched.
		const inspectionDir = path.join(testRoot, 'main-inspection');
		await simpleGit().clone(remote.bareDir, inspectionDir, ['--branch', 'main', '--single-branch']);
		await expect(readFile(path.join(inspectionDir, 'n8n', 'manifest.json'))).rejects.toThrow();
	});
});

describe('Apply a project selection', () => {
	it('imports only the selected workflow and preserves unselected instance content', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', [
			'Selected',
			'Sibling',
		]);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export orders',
		});
		const { dir } = await inspectBranch(remote.bareDir);
		expect((await readBranchEntities(dir, 'workflow.json')).map(({ id }) => id).sort()).toEqual(
			workflows.map(({ id }) => id).sort(),
		);

		const repository = Container.get(WorkflowRepository);
		await repository.delete(workflows[0].id);
		await repository.update(workflows[1].id, { name: 'Local sibling' });
		const other = await setupProjectWithWorkflows('Target only', ['Other workflow']);
		const siblingBefore = await repository.findOneByOrFail({ id: workflows[1].id });
		const otherBefore = await repository.findOneByOrFail({ id: other.workflows[0].id });
		const projectsBefore = await projectRepository.find({ order: { id: 'ASC' } });
		const sharesBefore = await Container.get(SharedWorkflowRepository).find({
			order: { workflowId: 'ASC', projectId: 'ASC' },
		});

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [workflows[0].id],
		});

		expect(result).toMatchObject({
			status: 'applied',
			counts: {
				projects: { created: 0, updated: 0, deleted: 0 },
				workflows: { created: 1, updated: 0, archived: 0, deleted: 0 },
			},
		});
		expect(await repository.findOneByOrFail({ id: workflows[0].id })).toMatchObject({
			name: workflows[0].name,
			isArchived: false,
		});
		expect(await repository.findOneByOrFail({ id: workflows[1].id })).toEqual(siblingBefore);
		expect(await repository.findOneByOrFail({ id: other.workflows[0].id })).toEqual(otherBefore);
		expect(await projectRepository.find({ order: { id: 'ASC' } })).toEqual(projectsBefore);
		expect(await repository.count()).toBe(3);
		const sharesAfter = await Container.get(SharedWorkflowRepository).find({
			order: { workflowId: 'ASC', projectId: 'ASC' },
		});
		expect(sharesAfter.filter(({ workflowId }) => workflowId !== workflows[0].id)).toEqual(
			sharesBefore,
		);
		expect(sharesAfter).toContainEqual(
			expect.objectContaining({
				workflowId: workflows[0].id,
				projectId: project.id,
				role: 'workflow:owner',
			}),
		);
	});

	it('deletes a selected workflow absent from the branch and keeps its sibling', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Sibling']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export sibling',
		});
		const removed = await createWorkflow(
			{ name: 'Target only', nodes: [], connections: {} },
			project,
		);
		const repository = Container.get(WorkflowRepository);
		const siblingBefore = await repository.findOneByOrFail({ id: workflows[0].id });

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [removed.id],
		});

		// Promotion applies the selection with `overwriteDeletionPolicy: 'hard-delete'`: an
		// archived-in-place workflow would stay on the target and read as a `deleted` diff row forever,
		// so a branch-absent selection is removed to make the diff converge.
		expect(result).toMatchObject({
			status: 'applied',
			counts: {
				workflows: { created: 0, updated: 0, archived: 0, deleted: 1 },
				projects: { deleted: 0 },
			},
		});
		expect(await repository.findOneBy({ id: removed.id })).toBeNull();
		expect(await repository.findOneByOrFail({ id: workflows[0].id })).toEqual(siblingBefore);
		expect(await repository.count()).toBe(1);
		expect(await projectRepository.findOneBy({ id: project.id })).not.toBeNull();
	});

	it('deletes a selected workflow that is already archived on the target', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project } = await setupProjectWithWorkflows('Orders', ['Sibling']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export sibling',
		});
		const archived = await createWorkflow(
			{ name: 'Archived target', nodes: [], connections: {}, isArchived: true },
			project,
		);
		const repository = Container.get(WorkflowRepository);

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [archived.id],
		});

		expect(result).toMatchObject({
			status: 'applied',
			counts: { workflows: { archived: 0, deleted: 1 } },
		});
		expect(await repository.findOneBy({ id: archived.id })).toBeNull();
		expect(await repository.count()).toBe(1);
	});

	it('applies a name change to the same workflow in the same folder', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Renamed order']);
		const folder = await createFolder(project, { name: 'Operations' });
		const repository = Container.get(WorkflowRepository);
		await repository.update(workflows[0].id, { parentFolder: folder });
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export renamed order',
		});
		await repository.update(workflows[0].id, { name: 'Original order' });

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [workflows[0].id],
		});

		expect(result).toMatchObject({
			status: 'applied',
			counts: { workflows: { created: 0, updated: 1 } },
		});
		expect(
			await repository.findOneOrFail({
				where: { id: workflows[0].id },
				relations: { parentFolder: true },
			}),
		).toMatchObject({
			id: workflows[0].id,
			name: 'Renamed order',
			parentFolder: { id: folder.id },
		});
		expect(await repository.count()).toBe(1);
	});

	it('moves a selected workflow to the folder the branch places it in', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Process order']);
		const repository = Container.get(WorkflowRepository);
		// Promote the workflow from inside `branchFolder` so the branch carries a folder placement.
		const branchFolder = await createFolder(project, { name: 'Branch folder' });
		await repository.update(workflows[0].id, { parentFolder: branchFolder });
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export foldered workflow',
		});
		// Move the same workflow to a different folder on the instance so the branch and instance
		// disagree on its placement. Apply follows the branch within the project.
		const localFolder = await createFolder(project, { name: 'Local folder' });
		await repository.update(workflows[0].id, { parentFolder: localFolder });

		expect(
			await service.applyProjectSelection(project.id, owner, {
				workflowIds: [workflows[0].id],
			}),
		).toMatchObject({ status: 'applied', counts: { workflows: { updated: 1, moved: 1 } } });

		const applied = await repository.findOne({
			where: { id: workflows[0].id },
			relations: { parentFolder: true },
		});
		expect(applied?.parentFolder?.id).toBe(branchFolder.id);
	});

	it('moves only the folders that hold a selected workflow', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Root', 'Inside']);
		const folders = Container.get(FolderRepository);
		const repository = Container.get(WorkflowRepository);
		// The branch holds folder X under Y, with the "Inside" workflow in X.
		const outer = await createFolder(project, { name: 'Y' });
		const inner = await createFolder(project, { name: 'X', parentFolder: outer });
		await repository.update(workflows[1].id, { parentFolder: inner });
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export nested folders',
		});
		// On this instance X sits at the project root.
		await folders.update(inner.id, { parentFolder: null });
		const parentOfX = async () =>
			(await folders.findOne({ where: { id: inner.id }, relations: { parentFolder: true } }))
				?.parentFolder?.id ?? null;

		// The root workflow is unrelated to X, so X stays where it is.
		expect(
			await service.applyProjectSelection(project.id, owner, { workflowIds: [workflows[0].id] }),
		).toMatchObject({ status: 'applied', counts: { folders: { moved: 0 } } });
		expect(await parentOfX()).toBeNull();

		// A workflow inside X needs X where the branch holds it.
		expect(
			await service.applyProjectSelection(project.id, owner, { workflowIds: [workflows[1].id] }),
		).toMatchObject({ status: 'applied', counts: { folders: { moved: 1 } } });
		expect(await parentOfX()).toBe(outer.id);
	});

	it('leaves the folders where they were when a workflow write fails', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Inside']);
		const folders = Container.get(FolderRepository);
		// The branch holds folder X under Y, with the workflow in X. Here X sits at the root.
		const outer = await createFolder(project, { name: 'Y' });
		const inner = await createFolder(project, { name: 'X', parentFolder: outer });
		await Container.get(WorkflowRepository).update(workflows[0].id, { parentFolder: inner });
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export nested folders',
		});
		await folders.update(inner.id, { parentFolder: null });
		const write = vi
			.spyOn(Container.get(WorkflowService), 'update')
			.mockRejectedValueOnce(new Error('Workflow write failed'));

		try {
			await expect(
				service.applyProjectSelection(project.id, owner, { workflowIds: [workflows[0].id] }),
			).rejects.toThrow('Workflow write failed');
		} finally {
			write.mockRestore();
		}

		const x = await folders.findOne({ where: { id: inner.id }, relations: { parentFolder: true } });
		expect(x?.parentFolder ?? null).toBeNull();
	});

	it('moves a selected workflow to the project root when the branch holds it there', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Process order']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export root workflow',
		});
		const repository = Container.get(WorkflowRepository);
		const localFolder = await createFolder(project, { name: 'Local folder' });
		await repository.update(workflows[0].id, { parentFolder: localFolder });

		expect(
			await service.applyProjectSelection(project.id, owner, {
				workflowIds: [workflows[0].id],
			}),
		).toMatchObject({ status: 'applied' });

		const applied = await repository.findOne({
			where: { id: workflows[0].id },
			relations: { parentFolder: true },
		});
		expect(applied?.parentFolder ?? null).toBeNull();
	});

	it('moves a workflow back to the branch placement on instance Apply and removes the emptied folder', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Process order']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export root workflow',
		});
		// The branch holds the workflow at the root and has no `Local` folder.
		const repository = Container.get(WorkflowRepository);
		const localFolder = await createFolder(project, { name: 'Local' });
		await repository.update(workflows[0].id, { parentFolder: localFolder });

		const result = await service.apply(environments.apply.id, owner);

		assert(result.status === 'applied');
		expect(result.counts.workflows.moved).toBe(1);
		expect(result.counts.folders.removed).toBe(1);
		const applied = await repository.findOne({
			where: { id: workflows[0].id },
			relations: { parentFolder: true },
		});
		expect(applied?.isArchived).toBe(false);
		expect(applied?.parentFolder ?? null).toBeNull();
		expect(await Container.get(FolderRepository).findOneBy({ id: localFolder.id })).toBeNull();
	});

	it('continues after the selected bindings are created while unselected bindings stay missing', async () => {
		const { project, workflow, credential, variable, unselectedWorkflow, unselectedVariable } =
			await prepareBindingApply('UNSELECTED_URL');
		assert(unselectedWorkflow);
		assert(unselectedVariable);
		const repository = Container.get(WorkflowRepository);
		const unselectedBefore = await repository.findOneByOrFail({ id: unselectedWorkflow.id });
		const before = await snapshotApplyState();

		const blocked = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [workflow.id],
		});
		assert(blocked.status === 'blocked');
		expect(blocked.check.missingBindings).toHaveLength(2);
		expect(blocked.check.missingBindings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ kind: 'credential', sourceId: credential.id }),
				expect.objectContaining({ kind: 'variable', name: variable.key }),
			]),
		);
		expect(blocked.check.missingBindings).not.toContainEqual(
			expect.objectContaining({ kind: 'variable', name: unselectedVariable.key }),
		);
		expect(
			blocked.check.missingBindings.flatMap(({ consumers }) =>
				consumers.flatMap(({ workflows }) => workflows.map(({ id }) => id)),
			),
		).toEqual([workflow.id, workflow.id]);
		expect(await snapshotApplyState()).toEqual(before);

		await testServer
			.publicApiAgentFor(owner)
			.post('/credentials')
			.send({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				projectId: project.id,
				data: { name: 'Authorization', value: 'target-secret' },
			})
			.expect(200);
		const targetVariable = await createVariable(variable.key, 'target value');
		const result = await service.continueApplyProjectSelection(project.id, owner, {
			workflowIds: [workflow.id],
			expectedSource: { environmentId: blocked.environmentId, ...blocked.git },
		});

		expect(result).toMatchObject({
			status: 'applied',
			counts: {
				projects: { deleted: 0 },
				workflows: { updated: 1, deleted: 0 },
				credentials: { matched: 1 },
			},
		});
		expect(await repository.findOneByOrFail({ id: workflow.id })).toMatchObject({
			name: workflow.name,
			nodes: workflow.nodes,
		});
		expect(await repository.findOneByOrFail({ id: unselectedWorkflow.id })).toEqual(
			unselectedBefore,
		);
		expect(
			await Container.get(VariablesRepository).findOneBy({ key: unselectedVariable.key }),
		).toBeNull();
		expect(
			await Container.get(VariablesRepository).findOneByOrFail({ id: targetVariable.id }),
		).toMatchObject({ value: 'target value' });
	});

	it('applies a selection when only an unselected workflow uses a data table whose change removes column values', async () => {
		const { project, plainWorkflow, orders, dataTableService } = await promoteDataTableWorkflows();
		await dataTableService.addColumn(orders.id, project.id, { name: 'extra', type: 'string' });
		const columnsBefore = await dataTableService.getColumns(orders.id, project.id);

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [plainWorkflow.id],
		});

		expect(result.status).toBe('applied');
		expect(await dataTableService.getColumns(orders.id, project.id)).toEqual(columnsBefore);

		const confirmed = await service.continueApplyProjectSelection(project.id, owner, {
			workflowIds: [plainWorkflow.id],
			expectedSource: { environmentId: result.environmentId, ...result.git },
			confirmDestructiveChanges: true,
		});

		expect(confirmed.status).toBe('applied');
		expect(await dataTableService.getColumns(orders.id, project.id)).toEqual(columnsBefore);
	});

	it('returns source-changed for a stale commit without importing workflows', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		const checkout = await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Branch name']);
		const promoted = await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export orders',
		});
		await Container.get(WorkflowRepository).update(workflows[0].id, { name: 'Local name' });
		const before = await snapshotApplyState();

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [workflows[0].id],
			expectedSource: {
				environmentId: checkout.environmentId,
				branchName: 'main',
				commitSha: '0'.repeat(40),
			},
		});

		expect(result).toEqual({
			status: 'source-changed',
			environmentId: checkout.environmentId,
			git: promoted.git,
		});
		expect(await snapshotApplyState()).toEqual(before);
	});

	it.each([
		{
			drift: 'a different name',
			changeLocalTag: async (tagId: string) =>
				await Container.get(TagRepository).update(tagId, { name: 'released' }),
		},
		{
			drift: 'a different id',
			changeLocalTag: async (tagId: string) =>
				await Container.get(TagService).reconcileTagId(tagId, 'localTagId'),
		},
	])(
		'keeps the tag of a selected workflow when the local tag has $drift',
		async ({ changeLocalTag }) => {
			const remote = await createRemote();
			const environments = await createInstanceEnvironments(remote.bareDir);
			await service.clone(environments.promote.id, owner);
			await service.clone(environments.apply.id, owner);
			const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Tagged']);
			const tag = await createTag({ name: 'release' }, workflows[0]);
			await service.promote(environments.promote.id, owner, {
				canExportVariableValues: true,
				commitMessage: 'Export tagged workflow',
			});
			await changeLocalTag(tag.id);

			const result = await service.applyProjectSelection(project.id, owner, {
				workflowIds: [workflows[0].id],
			});

			assert(result.status === 'applied', JSON.stringify(result));
			expect(
				await Container.get(WorkflowTagMappingRepository).findBy({ workflowId: workflows[0].id }),
			).toEqual([expect.objectContaining({ tagId: tag.id })]);
			expect(await Container.get(TagRepository).find({ select: ['id', 'name'] })).toEqual([
				expect.objectContaining({ id: tag.id, name: 'release' }),
			]);
			expect(await listApplyChanges(project.id)).toEqual([]);
		},
	);
});

describe('Apply leaves publish state to the target', () => {
	// The source published all three workflows. The target published `live`, left `draft`
	// unpublished, and has no `added` yet.
	const seedTarget = async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const project = await createTeamProject('Orders', owner);
		const repository = Container.get(WorkflowRepository);
		const live = await createActiveWorkflow({ name: 'Live' }, project);
		const draft = await createActiveWorkflow({ name: 'Draft' }, project);
		const added = await createActiveWorkflow({ name: 'Added' }, project);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export',
		});

		await repository.update(live.id, { name: 'Live (target)' });
		await repository.update(draft.id, { name: 'Draft (target)', activeVersionId: null });
		await Container.get(WorkflowPublicationTriggerStatusRepository).delete({
			workflowId: added.id,
		});
		await Container.get(WorkflowPublishedVersionRepository).delete({ workflowId: added.id });
		await repository.update(added.id, { activeVersionId: null });
		await repository.delete(added.id);
		return { environments, project, live, draft, added };
	};

	const expectTargetStateKept = async (
		{ live, draft, added }: Awaited<ReturnType<typeof seedTarget>>,
		counts: Extract<ApplyPackageResultDto, { status: 'applied' }>['counts'],
	) => {
		expect(counts.workflows).toMatchObject({ created: 1, updated: 2 });
		expect(counts.workflows.publishing).toMatchObject({
			published: 0,
			unpublished: 0,
			blocked: 0,
			failed: 0,
		});
		const repository = Container.get(WorkflowRepository);
		const applied = async (id: string) => await repository.findOneByOrFail({ id });
		expect(await applied(live.id)).toMatchObject({
			name: 'Live',
			activeVersionId: live.activeVersionId,
		});
		expect(await applied(draft.id)).toMatchObject({ name: 'Draft', activeVersionId: null });
		expect(await applied(added.id)).toMatchObject({ name: 'Added', activeVersionId: null });
	};

	it('keeps the target state of each workflow although the source published all of them', async () => {
		const seeded = await seedTarget();

		const result = await service.apply(seeded.environments.apply.id, owner);

		assert(result.status === 'applied', JSON.stringify(result));
		await expectTargetStateKept(seeded, result.counts);
	});

	it('keeps the target state of each selected workflow in a project apply', async () => {
		const seeded = await seedTarget();

		const result = await service.applyProjectSelection(seeded.project.id, owner, {
			workflowIds: [seeded.live.id, seeded.draft.id, seeded.added.id],
		});

		assert(result.status === 'applied', JSON.stringify(result));
		await expectTargetStateKept(seeded, result.counts);
	});
});

describe('Apply moves and renames within a project', () => {
	const connect = async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const promote = async () =>
			await service.promote(environments.promote.id, owner, {
				canExportVariableValues: true,
				commitMessage: 'Export',
			});
		return { environments, promote };
	};
	const placeOf = async (workflowId: string) =>
		await Container.get(WorkflowRepository).findOneOrFail({
			where: { id: workflowId },
			relations: { parentFolder: true },
		});
	const folderOf = async (folderId: string) =>
		await Container.get(FolderRepository).findOneOrFail({
			where: { id: folderId },
			relations: { parentFolder: true },
		});

	it('moves a published workflow to its branch folder and keeps it published', async () => {
		const { promote } = await connect();
		const project = await createTeamProject('Orders', owner);
		const folder = await createFolder(project, { name: 'Live' });
		const published = await createActiveWorkflow({ name: 'Process order' }, project);
		const repository = Container.get(WorkflowRepository);
		await repository.update(published.id, { parentFolder: folder });
		await promote();
		await repository.update(published.id, { parentFolder: null });

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [published.id],
		});

		assert(result.status === 'applied');
		expect(result.counts.workflows).toMatchObject({ updated: 1, moved: 1 });
		expect(result.counts.workflows.publishing.failed).toBe(0);
		const applied = await placeOf(published.id);
		expect(applied.parentFolder?.id).toBe(folder.id);
		expect(applied.activeVersionId).not.toBeNull();
	});

	it('moves an archived workflow to its branch folder and keeps it archived', async () => {
		const { environments, promote } = await connect();
		const {
			project,
			workflows: [archived],
		} = await setupProjectWithWorkflows('Orders', ['Old order']);
		const folder = await createFolder(project, { name: 'Old' });
		const repository = Container.get(WorkflowRepository);
		await repository.update(archived.id, { parentFolder: folder, isArchived: true });
		await promote();
		await repository.update(archived.id, { parentFolder: null });

		const result = await service.apply(environments.apply.id, owner);

		assert(result.status === 'applied');
		expect(result.counts.workflows.moved).toBe(1);
		const applied = await placeOf(archived.id);
		expect(applied.parentFolder?.id).toBe(folder.id);
		expect(applied.isArchived).toBe(true);
	});

	it('moves a workflow that uses a credential and keeps the credential', async () => {
		const { promote } = await connect();
		const project = await createTeamProject('Orders', owner);
		const credential = await saveCredential(
			{ name: 'Header credential', type: 'httpHeaderAuth', data: {} },
			{ project, role: 'credential:owner' },
		);
		const folder = await createFolder(project, { name: 'Calls' });
		const workflow = await createWorkflow(
			{
				name: 'Call API',
				nodes: [
					{
						id: 'n1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: { url: 'https://example.com' },
						credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
					},
				],
				connections: {},
				parentFolder: folder,
			},
			project,
		);
		await promote();
		await Container.get(WorkflowRepository).update(workflow.id, { parentFolder: null });

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [workflow.id],
		});

		assert(result.status === 'applied');
		expect(result.counts.credentials).toMatchObject({ matched: 1, stubbed: 0 });
		const applied = await placeOf(workflow.id);
		expect(applied.parentFolder?.id).toBe(folder.id);
		expect(applied.nodes[0].credentials?.httpHeaderAuth?.id).toBe(credential.id);
		expect(await Container.get(CredentialsRepository).count()).toBe(1);
	});

	it('swaps two folders back and renames one on instance Apply', async () => {
		const { environments, promote } = await connect();
		const {
			project,
			workflows: [inside],
		} = await setupProjectWithWorkflows('Orders', ['Inside']);
		// The branch holds A at the root, B under A, and the workflow in B.
		const a = await createFolder(project, { name: 'A' });
		const b = await createFolder(project, { name: 'B', parentFolder: a });
		await Container.get(WorkflowRepository).update(inside.id, { parentFolder: b });
		await promote();
		// Here the two folders swapped places, and A has another name.
		const folders = Container.get(FolderRepository);
		await folders.update(b.id, { parentFolder: null });
		await folders.update(a.id, { parentFolder: b, name: 'Local A' });

		const result = await service.apply(environments.apply.id, owner);

		assert(result.status === 'applied');
		expect(result.counts.folders).toMatchObject({ updated: 2, moved: 2, renamed: 1, removed: 0 });
		expect(await folderOf(a.id)).toMatchObject({ name: 'A', parentFolder: null });
		expect((await folderOf(b.id)).parentFolder?.id).toBe(a.id);
		expect((await placeOf(inside.id)).parentFolder?.id).toBe(b.id);
	});

	it('swaps two folders back on project Apply, moving the parent of the selected folder too', async () => {
		const { promote } = await connect();
		const {
			project,
			workflows: [inside],
		} = await setupProjectWithWorkflows('Orders', ['Inside']);
		// The branch holds A at the root, B under A, and the workflow in B.
		const a = await createFolder(project, { name: 'A' });
		const b = await createFolder(project, { name: 'B', parentFolder: a });
		await Container.get(WorkflowRepository).update(inside.id, { parentFolder: b });
		await promote();
		// Here B is at the root and A is under B. B can only move under A once A leaves B.
		const folders = Container.get(FolderRepository);
		await folders.update(b.id, { parentFolder: null });
		await folders.update(a.id, { parentFolder: b });

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [inside.id],
		});

		assert(result.status === 'applied');
		expect(result.counts.folders).toMatchObject({ updated: 2, moved: 2 });
		expect((await folderOf(a.id)).parentFolder ?? null).toBeNull();
		expect((await folderOf(b.id)).parentFolder?.id).toBe(a.id);
	});

	it('refuses an instance promote that would write a move between team projects', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		const {
			project: orders,
			workflows: [moved],
		} = await setupProjectWithWorkflows('Orders', ['Process order']);
		const { project: billing } = await setupProjectWithWorkflows('Billing', []);
		const promote = async () =>
			await service.promote(environments.promote.id, owner, {
				canExportVariableValues: true,
				commitMessage: 'Export',
			});
		await promote();
		const head = async () => (await simpleGit(remote.bareDir).revparse(['main'])).trim();
		const before = await head();
		await Container.get(SharedWorkflowRepository).update(
			{ workflowId: moved.id, role: 'workflow:owner' },
			{ projectId: billing.id },
		);

		await expect(promote()).rejects.toMatchObject({
			httpStatusCode: 400,
			message: expect.stringContaining(
				`workflow "${moved.name}" (${moved.id}) is in project "${billing.name}" here and in project "${orders.name}" on the branch`,
			),
		});
		expect(await head()).toBe(before);
	});

	it('renames only the folders that hold a selected workflow on project Apply', async () => {
		const { promote } = await connect();
		const {
			project,
			workflows: [report, old],
		} = await setupProjectWithWorkflows('Orders', ['Report', 'Old order']);
		const reports = await createFolder(project, { name: 'Reports' });
		const archive = await createFolder(project, { name: 'Archive' });
		const repository = Container.get(WorkflowRepository);
		await repository.update(report.id, { parentFolder: reports });
		await repository.update(old.id, { parentFolder: archive });
		await promote();
		const folders = Container.get(FolderRepository);
		await folders.update(reports.id, { name: 'Local reports' });
		await folders.update(archive.id, { name: 'Local archive' });

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [report.id],
		});

		assert(result.status === 'applied');
		expect(result.counts.folders).toMatchObject({ updated: 1, moved: 0, renamed: 1 });
		expect((await folderOf(reports.id)).name).toBe('Reports');
		expect((await folderOf(archive.id)).name).toBe('Local archive');
	});

	it('says when the branch project of a moved workflow does not exist here yet', async () => {
		const { environments, promote } = await connect();
		const {
			project: archive,
			workflows: [moved],
		} = await setupProjectWithWorkflows('Archive', ['Old order']);
		const { project: orders } = await setupProjectWithWorkflows('Orders', []);
		await promote();
		// The workflow left Archive, and Archive is gone from this instance.
		await Container.get(SharedWorkflowRepository).update(
			{ workflowId: moved.id, role: 'workflow:owner' },
			{ projectId: orders.id },
		);
		await projectService.deleteProject(owner, archive.id);

		expect(await service.apply(environments.apply.id, owner)).toMatchObject({
			status: 'blocked',
			check: {
				conflicts: expect.arrayContaining([
					expect.objectContaining({
						kind: 'workflow',
						code: 'moved',
						id: moved.id,
						project: { id: archive.id, name: 'Archive' },
						projectExists: false,
						instanceProject: { id: orders.id, name: 'Orders' },
					}),
				]),
			},
		});
		expect((await loadApplyPreview(orders.id)).check.movedWorkflows).toEqual([
			expect.objectContaining({ id: moved.id, projectExists: false }),
		]);
	});
});

describe('Check of the Apply preview', () => {
	it('reports the same blockers as Apply for all workflows of the project and changes nothing', async () => {
		const { project, workflow, unselectedWorkflow } = await prepareBindingApply('UNSELECTED_URL');
		assert(unselectedWorkflow);
		const before = await snapshotApplyState();

		const preview = await loadApplyPreview(project.id);

		expect(await snapshotApplyState()).toEqual(before);
		expect(preview.check.missingBindings).toHaveLength(3);
		// The blocked result holds the check without the lists of moves.
		const { movedWorkflows, movedFolders, ...applyCheck } = preview.check;
		expect(
			await service.applyProjectSelection(project.id, owner, {
				workflowIds: [workflow.id, unselectedWorkflow.id],
				expectedSource: { ...preview.source, commitSha: preview.commitSha },
				expectedPreviewRevision: preview.revision,
			}),
		).toEqual({
			status: 'blocked',
			environmentId: preview.source.environmentId,
			git: { commitSha: preview.commitSha, branchName: preview.source.branchName },
			check: applyCheck,
		});
	});

	it('reports a workflow that moved to another project, next to the blockers of other workflows', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const {
			project: orders,
			workflows: [moved],
		} = await setupProjectWithWorkflows('Orders', ['Moved workflow']);
		const { project: billing } = await setupProjectWithWorkflows('Billing', []);
		const variable = await createVariable('API_URL', 'source value');
		const dependent = await buildWorkflowReferencingVariables({
			name: 'Uses API_URL',
			project: orders,
			variableNames: [variable.key],
		});
		// The branch holds the workflow in Billing, while this instance still has it in Orders.
		const sharedWorkflows = Container.get(SharedWorkflowRepository);
		await sharedWorkflows.update(
			{ workflowId: moved.id, role: 'workflow:owner' },
			{ projectId: billing.id },
		);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Move a workflow to Billing',
		});
		await sharedWorkflows.update(
			{ workflowId: moved.id, role: 'workflow:owner' },
			{ projectId: orders.id },
		);
		await Container.get(VariablesRepository).delete(variable.id);
		await Container.get(VariablesService).updateCache();

		const { check } = await loadApplyPreview(orders.id);

		expect(check.movedWorkflows).toEqual([
			{
				id: moved.id,
				name: moved.name,
				project: { id: billing.id, name: billing.name },
				projectExists: true,
				instanceProject: { id: orders.id, name: orders.name },
			},
		]);
		expect(check.missingBindings).toEqual([
			expect.objectContaining({
				kind: 'variable',
				name: 'API_URL',
				consumers: [
					{
						project: { id: orders.id, name: orders.name },
						workflows: [{ id: dependent.id, name: dependent.name }],
					},
				],
			}),
		]);
	});

	it('reports a data table change that removes column values, with the workflow that uses the table', async () => {
		const { project, workflow, orders, dataTableService } = await promoteDataTableWorkflows();
		await dataTableService.addColumn(orders.id, project.id, { name: 'extra', type: 'string' });

		const { check } = await loadApplyPreview(project.id);

		expect(check.conflicts).toEqual([
			expect.objectContaining({
				code: 'destructive-change',
				id: orders.id,
				consumers: [
					{
						project: { id: project.id, name: project.name },
						workflows: [{ id: workflow.id, name: workflow.name }],
					},
				],
			}),
		]);
		expect(check.missingBindings).toEqual([]);
	});

	it('reports a global variable that a project variable overrides as a warning, not a blocker', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const project = await createTeamProject('Orders', owner);
		const variable = await createVariable('API_URL', 'global value');
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Uses API_URL',
			project,
			variableNames: [variable.key],
		});
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export orders',
		});
		await createProjectVariable(variable.key, 'project value', project);

		const { check } = await loadApplyPreview(project.id);

		expect(check).toMatchObject({
			missingBindings: [],
			accessRequirements: [],
			conflicts: [],
			warnings: [
				{
					code: 'variable-shadowed',
					name: 'API_URL',
					consumers: [
						{
							project: { id: project.id, name: project.name },
							workflows: [{ id: workflow.id, name: workflow.name }],
						},
					],
				},
			],
		});
	});
});

describe('Apply a project selection over the public API', () => {
	it('applies a selected workflow over the wire and preserves unselected content', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', [
			'Selected',
			'Sibling',
		]);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export orders',
		});
		const repository = Container.get(WorkflowRepository);
		await repository.delete(workflows[0].id);
		await repository.update(workflows[1].id, { name: 'Local sibling' });
		const siblingBefore = await repository.findOneByOrFail({ id: workflows[1].id });

		const response = await testServer
			.publicApiAgentFor(owner)
			.post(`/promotions/projects/${project.id}/apply`)
			.send({ workflowIds: [workflows[0].id] });

		expect(response.status, JSON.stringify(response.body)).toBe(200);
		expect(response.body).toMatchObject({
			status: 'applied',
			counts: {
				projects: { created: 0, updated: 0, deleted: 0 },
				workflows: { created: 1, updated: 0, archived: 0, deleted: 0 },
			},
		});
		expect(await repository.findOneByOrFail({ id: workflows[0].id })).toMatchObject({
			name: workflows[0].name,
			isArchived: false,
		});
		expect(await repository.findOneByOrFail({ id: workflows[1].id })).toEqual(siblingBefore);
	});

	it('returns blocked, then applies through Continue once the bindings exist', async () => {
		const { project, workflow, credential, variable } = await prepareBindingApply();
		const agent = testServer.publicApiAgentFor(owner);
		const before = await snapshotApplyState();

		const blocked = (
			await agent
				.post(`/promotions/projects/${project.id}/apply`)
				.send({ workflowIds: [workflow.id] })
				.expect(200)
		).body;
		expect(blocked.status).toBe('blocked');
		expect(blocked.check.missingBindings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ kind: 'credential', sourceId: credential.id }),
				expect.objectContaining({ kind: 'variable', name: variable.key }),
			]),
		);
		expect(blocked).not.toHaveProperty('counts');
		expect(await snapshotApplyState()).toEqual(before);

		await agent
			.post('/credentials')
			.send({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				projectId: project.id,
				data: { name: 'Authorization', value: 'target-secret' },
			})
			.expect(200);
		await createVariable(variable.key, 'target value');

		const result = (
			await agent
				.post(`/promotions/projects/${project.id}/apply/continue`)
				.send({
					workflowIds: [workflow.id],
					expectedSource: { environmentId: blocked.environmentId, ...blocked.git },
				})
				.expect(200)
		).body;
		expect(result.status, JSON.stringify(result)).toBe('applied');
		expect(result.counts.credentials).toMatchObject({ matched: 1 });
		expect(
			await Container.get(WorkflowRepository).findOneByOrFail({ id: workflow.id }),
		).toMatchObject({ name: workflow.name });
	});

	it('returns source-changed for a stale commit without importing', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		const checkout = await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Branch name']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export orders',
		});
		await Container.get(WorkflowRepository).update(workflows[0].id, { name: 'Local name' });
		const before = await snapshotApplyState();

		const response = await testServer
			.publicApiAgentFor(owner)
			.post(`/promotions/projects/${project.id}/apply`)
			.send({
				workflowIds: [workflows[0].id],
				expectedSource: {
					environmentId: checkout.environmentId,
					branchName: 'main',
					commitSha: '0'.repeat(40),
				},
			});

		expect(response.status, JSON.stringify(response.body)).toBe(200);
		expect(response.body).toMatchObject({
			status: 'source-changed',
			environmentId: checkout.environmentId,
		});
		expect(await snapshotApplyState()).toEqual(before);
	});

	it('rejects an empty, duplicate, or unknown selection with 400', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['Process order']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export orders',
		});
		const agent = testServer.publicApiAgentFor(owner);
		const before = await snapshotApplyState();

		// The DTO refuses an empty selection before any git work.
		await agent
			.post(`/promotions/projects/${project.id}/apply`)
			.send({ workflowIds: [] })
			.expect(400);
		// The DTO refuses duplicate ids.
		await agent
			.post(`/promotions/projects/${project.id}/apply`)
			.send({ workflowIds: [workflows[0].id, workflows[0].id] })
			.expect(400);
		// An id the project's branch and instance do not hold is refused.
		await agent
			.post(`/promotions/projects/${project.id}/apply`)
			.send({ workflowIds: ['not-a-real-id'] })
			.expect(400);
		expect(await snapshotApplyState()).toEqual(before);
	});

	it('reports a move between projects as blocked without importing', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);
		const {
			project: orders,
			workflows: [moved],
		} = await setupProjectWithWorkflows('Orders', ['Process order']);
		const { project: billing } = await setupProjectWithWorkflows('Billing', []);
		// The branch holds the workflow in Billing, while this instance still has it in Orders.
		const sharedWorkflows = Container.get(SharedWorkflowRepository);
		await sharedWorkflows.update(
			{ workflowId: moved.id, role: 'workflow:owner' },
			{ projectId: billing.id },
		);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Move a workflow to Billing',
		});
		await sharedWorkflows.update(
			{ workflowId: moved.id, role: 'workflow:owner' },
			{ projectId: orders.id },
		);
		const before = await snapshotApplyState();

		const response = await testServer
			.publicApiAgentFor(owner)
			.post(`/promotions/projects/${orders.id}/apply`)
			.send({ workflowIds: [moved.id] });

		expect(response.status, JSON.stringify(response.body)).toBe(200);
		expect(response.body).toMatchObject({
			status: 'blocked',
			check: {
				conflicts: [
					{
						kind: 'workflow',
						code: 'moved',
						id: moved.id,
						name: moved.name,
						project: { id: billing.id, name: billing.name },
						projectExists: true,
						instanceProject: { id: orders.id, name: orders.name },
					},
				],
			},
		});
		expect(await snapshotApplyState()).toEqual(before);
	});
});

describe('Apply credential changes', () => {
	const EXPRESSION = '={{ $vars.billingToken }}';

	it('writes the branch name and expression values to a matched credential on a full apply', async () => {
		const { remote, environments, credential, reportCredential } =
			await promoteCredentialWorkflows();
		await changeBranchCredentials(remote, {
			[credential.id]: { name: 'Billing header v2', data: { value: EXPRESSION } },
		});
		const reportBefore = await storedCredential(reportCredential.id);

		const result = await service.apply(environments.apply.id, owner);

		expect(result).toMatchObject({
			status: 'applied',
			counts: { credentials: { matched: 1, stubbed: 0, updated: 1 } },
		});
		expect(await storedCredential(credential.id)).toMatchObject({
			name: 'Billing header v2',
			data: { name: 'X-Token', value: EXPRESSION },
		});
		expect(await storedCredential(reportCredential.id)).toEqual(reportBefore);
	});

	it('writes nothing when the same branch is applied again', async () => {
		const { remote, environments, credential } = await promoteCredentialWorkflows();
		await changeBranchCredentials(remote, {
			[credential.id]: { name: 'Billing header v2', data: { value: EXPRESSION } },
		});
		await service.apply(environments.apply.id, owner);
		const before = await storedCredential(credential.id);

		const result = await service.apply(environments.apply.id, owner);

		expect(result).toMatchObject({
			status: 'applied',
			counts: { credentials: { matched: 2, stubbed: 0, updated: 0 } },
		});
		expect(await storedCredential(credential.id)).toEqual(before);
	});

	it('writes a credential that a selected workflow uses, and leaves one that only an unselected workflow uses', async () => {
		const { remote, project, credential, reportCredential, workflow } =
			await promoteCredentialWorkflows();
		await changeBranchCredentials(remote, {
			[credential.id]: { name: 'Billing header v2', data: { value: EXPRESSION } },
			[reportCredential.id]: { name: 'Report header v2', data: { value: EXPRESSION } },
		});
		const reportBefore = await storedCredential(reportCredential.id);

		const result = await service.applyProjectSelection(project.id, owner, {
			workflowIds: [workflow.id],
		});

		expect(result).toMatchObject({
			status: 'applied',
			counts: { credentials: { matched: 0, stubbed: 0, updated: 1 } },
		});
		expect(await storedCredential(credential.id)).toMatchObject({
			name: 'Billing header v2',
			data: { name: 'X-Token', value: EXPRESSION },
		});
		expect(await storedCredential(reportCredential.id)).toEqual(reportBefore);
	});

	it('blocks a selection apply when the actor cannot update a matched credential, and writes nothing', async () => {
		const { remote, project, credential, workflow } = await promoteCredentialWorkflows();
		await changeBranchCredentials(remote, {
			[credential.id]: { name: 'Billing header v2', data: { value: EXPRESSION } },
		});
		const member = await createMember();
		// Project editors and admins always hold `credential:update`: only a custom role lacks it.
		const role = await createCustomRoleWithScopeSlugs(
			[
				'project:read',
				'project:list',
				'project:update',
				'folder:create',
				'folder:read',
				'folder:update',
				'folder:list',
				'workflow:create',
				'workflow:read',
				'workflow:update',
				'workflow:import',
				'workflow:list',
				'workflow:delete',
				'workflow:publish',
				'credential:read',
				'credential:list',
			],
			{ roleType: 'project' },
		);
		await linkUserToProject(member, project, role.slug);
		const before = await snapshotApplyState();

		expect(
			await service.applyProjectSelection(project.id, member, { workflowIds: [workflow.id] }),
		).toMatchObject({
			status: 'blocked',
			check: {
				conflicts: [
					{
						kind: 'workflow',
						code: 'workflow-forbidden',
						reason: 'credential-update-forbidden',
						consumers: [
							{
								project: { id: project.id, name: project.name },
								workflows: [{ id: workflow.id, name: workflow.name }],
							},
						],
					},
				],
			},
		});
		expect(await snapshotApplyState()).toEqual(before);
	});
});

describe('Apply data table changes', () => {
	const applyFlow = async (
		flow: 'full' | 'selection',
		{ environments, project, workflow }: Awaited<ReturnType<typeof promoteDataTableWorkflows>>,
	) =>
		flow === 'full'
			? await service.apply(environments.apply.id, owner)
			: await service.applyProjectSelection(project.id, owner, { workflowIds: [workflow.id] });

	const renameNoteColumn = async (
		{ project, orders, dataTableService }: Awaited<ReturnType<typeof promoteDataTableWorkflows>>,
		name: string,
	) => {
		const note = (await dataTableService.getColumns(orders.id, project.id)).find(
			(column) => column.name === 'note',
		);
		assert(note);
		await dataTableService.renameColumn(orders.id, project.id, note.id, { name });
	};

	it.each([{ flow: 'full' as const }, { flow: 'selection' as const }])(
		'blocks a $flow apply whose data table change removes column values and writes nothing',
		async ({ flow }) => {
			const promoted = await promoteDataTableWorkflows();
			const { project, workflow, orders, dataTableService } = promoted;
			await dataTableService.addColumn(orders.id, project.id, { name: 'extra', type: 'string' });
			await dataTableService.insertRows(orders.id, project.id, [
				{ email: 'a@example.com', extra: 'keep me' },
			]);
			await dataTableService.updateDataTable(orders.id, project.id, { name: 'Local orders' });
			await renameNoteColumn(promoted, 'memo');
			await Container.get(WorkflowRepository).update(workflow.id, { name: 'Target workflow' });
			const before = await snapshotApplyState();

			const result = await applyFlow(flow, promoted);

			assert(result.status === 'blocked');
			expect(result.check.conflicts).toEqual([
				expect.objectContaining({
					kind: 'data-table',
					code: 'destructive-change',
					id: orders.id,
					name: 'Orders',
					consumers: [
						{
							project: { id: project.id, name: project.name },
							workflows: [{ id: workflow.id, name: 'Process order' }],
						},
					],
				}),
			]);
			const [conflict] = result.check.conflicts;
			assert(conflict.code === 'destructive-change');
			const { changes } = conflict;
			const removeExtra = {
				kind: 'remove-column',
				column: 'extra',
				type: 'string',
				destructive: true,
			};
			expect(changes).toContainEqual(removeExtra);
			expect(changes).toContainEqual({
				kind: 'rename-table',
				from: 'Local orders',
				to: 'Orders',
				destructive: false,
			});
			expect(changes).toContainEqual({
				kind: 'rename-column',
				from: 'memo',
				to: 'note',
				destructive: false,
			});
			expect(changes.filter(({ destructive }) => destructive)).toEqual([removeExtra]);
			expect(await snapshotApplyState()).toEqual(before);
			const { data } = await dataTableService.getManyRowsAndCount(orders.id, project.id, {});
			expect(data).toEqual([expect.objectContaining({ email: 'a@example.com', extra: 'keep me' })]);
			expect(applyPackageResultSchema.parse(result)).toEqual(result);
		},
	);

	it.each([{ flow: 'full' as const }, { flow: 'selection' as const }])(
		'applies a $flow column removal only after Continue confirms it and keeps the rows',
		async ({ flow }) => {
			const promoted = await promoteDataTableWorkflows();
			const { environments, project, workflow, orders, dataTableService } = promoted;
			await dataTableService.addColumn(orders.id, project.id, { name: 'extra', type: 'string' });
			await dataTableService.insertRows(orders.id, project.id, [
				{ email: 'a@example.com', extra: 'keep me' },
			]);
			await dataTableService.updateDataTable(orders.id, project.id, { name: 'Local orders' });
			const continueFlow = async (
				expectedSource: ContinueApplyPackageDto['expectedSource'],
				confirmDestructiveChanges?: boolean,
			): Promise<ApplyPackageResultDto> =>
				flow === 'full'
					? (
							await testServer
								.publicApiAgentFor(owner)
								.post(`/promotions/environments/${environments.apply.id}/apply/continue`)
								.send({ expectedSource, confirmDestructiveChanges })
								.expect(200)
						).body
					: await service.continueApplyProjectSelection(project.id, owner, {
							workflowIds: [workflow.id],
							expectedSource,
							confirmDestructiveChanges,
						});

			const blocked = await applyFlow(flow, promoted);
			assert(blocked.status === 'blocked');
			const expectedSource = { environmentId: blocked.environmentId, ...blocked.git };

			expect(await continueFlow(expectedSource)).toEqual(blocked);
			const { data: rowsBefore } = await dataTableService.getManyRowsAndCount(
				orders.id,
				project.id,
				{},
			);
			expect(rowsBefore).toEqual([expect.objectContaining({ extra: 'keep me' })]);

			const result = await continueFlow(expectedSource, true);

			assert(result.status === 'applied', JSON.stringify(result));
			expect(result.counts.dataTables.updated).toBe(1);
			expect(await dataTableService.getOne(orders.id, project.id)).toMatchObject({
				name: 'Orders',
			});
			expect(
				(await dataTableService.getColumns(orders.id, project.id)).map(({ name }) => name),
			).toEqual(['email', 'note']);
			const { data } = await dataTableService.getManyRowsAndCount(orders.id, project.id, {});
			expect(data).toEqual([expect.objectContaining({ email: 'a@example.com' })]);
			expect(data[0]).not.toHaveProperty('extra');
		},
	);

	it.each([{ flow: 'full' as const }, { flow: 'selection' as const }])(
		'applies a $flow data table change that removes no column values, counts the table as updated and recreates a missing table',
		async ({ flow }) => {
			const promoted = await promoteDataTableWorkflows();
			const { project, orders, customers, dataTableService } = promoted;
			const note = (await dataTableService.getColumns(orders.id, project.id)).find(
				({ name }) => name === 'note',
			);
			assert(note);
			await dataTableService.deleteColumn(orders.id, project.id, note.id);
			await dataTableService.updateDataTable(orders.id, project.id, { name: 'Local orders' });
			await dataTableService.deleteDataTable(customers.id, project.id);

			const result = await applyFlow(flow, promoted);

			assert(result.status === 'applied');
			expect(result.counts.dataTables).toEqual({ matched: 0, created: 1, updated: 1 });
			expect(await dataTableService.getOne(orders.id, project.id)).toMatchObject({
				name: 'Orders',
			});
			expect(
				(await dataTableService.getColumns(orders.id, project.id)).map(({ name, type }) => ({
					name,
					type,
				})),
			).toEqual([
				{ name: 'email', type: 'string' },
				{ name: 'note', type: 'string' },
			]);
			expect(await dataTableService.getOne(customers.id, project.id)).toMatchObject({
				name: 'Customers',
			});
		},
	);

	it.each([{ flow: 'full' as const }, { flow: 'selection' as const }])(
		'applies a $flow column rename without confirmation and keeps the values',
		async ({ flow }) => {
			const promoted = await promoteDataTableWorkflows();
			const { project, orders, dataTableService } = promoted;
			await renameNoteColumn(promoted, 'memo');
			await dataTableService.insertRows(orders.id, project.id, [
				{ email: 'a@example.com', memo: 'keep me' },
			]);

			const result = await applyFlow(flow, promoted);

			assert(result.status === 'applied', JSON.stringify(result));
			expect(result.counts.dataTables.updated).toBe(1);
			expect(
				(await dataTableService.getColumns(orders.id, project.id)).map(({ name }) => name),
			).toEqual(['email', 'note']);
			const { data } = await dataTableService.getManyRowsAndCount(orders.id, project.id, {});
			expect(data).toEqual([expect.objectContaining({ email: 'a@example.com', note: 'keep me' })]);
			expect(await listApplyChanges(project.id)).toEqual([]);
		},
	);
});

describe('Promote a project selection — branch effects', () => {
	it('promotes a first selection to a branch without a package, then adds to it', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		await setupProjectWithWorkflows('Billing', ['b1']);
		const promoteWorkflow = async (workflowId: string) =>
			await service.promoteProjectSelection(project.id, owner, {
				workflowIds: [workflowId],
				commitMessage: 'Promote selection',
				canExportVariableValues: true,
			});

		await promoteWorkflow(workflows[0].id);

		const first = await inspectBranch(remote.bareDir);
		expect((await readBranchEntities(first.dir, 'workflow.json')).map((w) => w.id)).toEqual([
			workflows[0].id,
		]);
		expect(
			(await readBranchEntities(first.dir, PACKAGE_ENTITY_LAYOUT.projects.fileName)).map(
				(p) => p.id,
			),
		).toEqual([project.id]);
		await expect(readFile(path.join(first.dir, 'README.md'), 'utf-8')).resolves.toBe(
			'# n8n promotions test\n',
		);

		await promoteWorkflow(workflows[1].id);

		const second = await inspectBranch(remote.bareDir);
		expect((await readBranchEntities(second.dir, 'workflow.json')).map((w) => w.id).sort()).toEqual(
			workflows.map((w) => w.id).sort(),
		);
	});

	it.each(['n8n', 'n8n/manifest.json'])(
		'restores committed %s that the local copy lost before it pushes a selection',
		async (lostPath) => {
			const remote = await createRemote();
			const environments = await createInstanceEnvironments(remote.bareDir);
			const { environmentId } = await service.clone(environments.promote.id, owner);
			const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
			const promoteWorkflow = async (workflowId: string) =>
				await service.promoteProjectSelection(project.id, owner, {
					workflowIds: [workflowId],
					commitMessage: 'Promote selection',
					canExportVariableValues: true,
				});
			await promoteWorkflow(workflows[0].id);

			const { repositoryFolder } = workingDirectory.paths(environmentId);
			await rm(path.join(repositoryFolder, lostPath), { recursive: true, force: true });

			// The direct promote resets the checkout to the remote branch first.
			await promoteWorkflow(workflows[1].id);

			const { dir } = await inspectBranch(remote.bareDir);
			expect((await readBranchEntities(dir, 'workflow.json')).map((w) => w.id).sort()).toEqual(
				workflows.map((w) => w.id).sort(),
			);
		},
	);

	it.each(['n8n', 'n8n/manifest.json'])(
		'refuses a selection when the local copy lost committed %s and the remote branch is gone',
		async (lostPath) => {
			const remote = await createRemote();
			const environments = await createInstanceEnvironments(remote.bareDir);
			const { environmentId } = await service.clone(environments.promote.id, owner);
			const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
			const promoteWorkflow = async (workflowId: string) =>
				await service.promoteProjectSelection(project.id, owner, {
					workflowIds: [workflowId],
					commitMessage: 'Promote selection',
					canExportVariableValues: true,
				});
			await promoteWorkflow(workflows[0].id);
			// Without a remote branch, the reset cannot restore the lost files.
			const remoteGit = simpleGit(remote.bareDir);
			await remoteGit.raw(['update-ref', '-d', 'refs/heads/main']);

			const { repositoryFolder } = workingDirectory.paths(environmentId);
			await rm(path.join(repositoryFolder, lostPath), { recursive: true, force: true });

			await expect(promoteWorkflow(workflows[1].id)).rejects.toThrow(
				'The local copy of the promote branch is incomplete',
			);
			expect((await remoteGit.raw(['branch', '--list', 'main'])).trim()).toBe('');
		},
	);

	it('pushes a first selection to an empty repository after a failed attempt', async () => {
		const bareDir = path.join(testRoot, 'empty-remote.git');
		await simpleGit().raw(['init', '--bare', bareDir]);
		const environments = await createInstanceEnvironments(bareDir);
		const { environmentId } = await service.clone(environments.promote.id, owner);
		const { repositoryFolder } = workingDirectory.paths(environmentId);
		const checkoutGit = simpleGit(repositoryFolder);
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1']);
		const request = {
			workflowIds: [workflows[0].id],
			commitMessage: 'Add w1',
			canExportVariableValues: true,
		};

		// The remote refuses the push, so the promote commits and then rolls the commit back.
		const preReceiveHook = path.join(bareDir, 'hooks', 'pre-receive');
		const pushAttempted = path.join(testRoot, 'push-attempted');
		await writeFile(preReceiveHook, `#!/bin/sh\ntouch '${pushAttempted}'\nexit 1\n`, {
			mode: 0o755,
		});
		await expect(service.promoteProjectSelection(project.id, owner, request)).rejects.toThrow();
		await expect(stat(pushAttempted)).resolves.toBeDefined();

		// The checkout is back to a branch with no commits and no package.
		await expect(stat(path.join(repositoryFolder, 'n8n'))).rejects.toMatchObject({
			code: 'ENOENT',
		});
		expect(
			(await checkoutGit.raw(['for-each-ref', '--format=%(objectname)', 'refs/heads/main'])).trim(),
		).toBe('');
		expect((await checkoutGit.status()).isClean()).toBe(true);

		await rm(preReceiveHook);
		await service.promoteProjectSelection(project.id, owner, request);

		expect((await simpleGit(bareDir).raw(['rev-list', '--count', 'main'])).trim()).toBe('1');
		const { dir } = await inspectBranch(bareDir);
		expect((await readBranchEntities(dir, 'workflow.json')).map((w) => w.id)).toEqual([
			workflows[0].id,
		]);
	});

	it('pushes a first branched selection off a base without a package', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(
			remote.bareDir,
			{ apply: 'main', promote: 'main' },
			true,
		);
		const { environmentId } = await service.clone(environments.promote.id, owner);
		const baseCommit = (await remote.git.revparse(['main'])).trim();
		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1']);

		const result = await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [workflows[0].id],
			commitMessage: 'Add w1',
			canExportVariableValues: true,
		});

		const remoteGit = simpleGit(remote.bareDir);
		expect((await remoteGit.revparse([`${result.git.branchName}^`])).trim()).toBe(baseCommit);
		expect((await remoteGit.revparse(['main'])).trim()).toBe(baseCommit);
		const { repositoryFolder } = workingDirectory.paths(environmentId);
		expect((await simpleGit(repositoryFolder).revparse(['HEAD'])).trim()).toBe(baseCommit);

		const { dir } = await inspectBranch(remote.bareDir, result.git.branchName);
		expect((await readBranchEntities(dir, 'workflow.json')).map((w) => w.id)).toEqual([
			workflows[0].id,
		]);
	});

	it('adds only the selected workflow, leaving existing workflows untouched', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2', 'w3']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		await Container.get(AgentRepository).save({
			id: 'uT9LdQx7rK2MvB4f',
			name: 'Local Agent',
			projectId: project.id,
			schema: null,
		});
		const w4 = await createWorkflow({ name: 'w4', nodes: [], connections: {} }, project);
		const result = await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [w4.id],
			commitMessage: 'Add w4',
			canExportVariableValues: true,
		});

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = await readBranchEntities(dir, 'workflow.json');
		const workflowIds = onBranch.map((w) => w.id);

		expect(onBranch).toHaveLength(4);
		expect(workflowIds).toContain(w4.id);
		for (const w of workflows) {
			expect(workflowIds).toContain(w.id);
		}
		expect(result.counts.workflows).toBe(1);
		await expect(readBranchEntities(dir, PACKAGE_ENTITY_LAYOUT.agents.fileName)).resolves.toEqual(
			[],
		);
	});

	it('pushes a branched selection to a new branch and leaves the base untouched', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(
			remote.bareDir,
			{ apply: 'main', promote: 'main' },
			true,
		);
		await service.clone(environments.promote.id, owner);

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		// A full promote seeds a branch. Merge it into the base, so a later selection
		// has a package to build on.
		const full = await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
			force: true,
		});
		await remote.git.fetch('origin', full.git.branchName);
		await remote.git.merge(['FETCH_HEAD']);
		await remote.git.push('origin', 'main');
		const baseCommit = (await remote.git.revparse(['main'])).trim();

		const w3 = await createWorkflow({ name: 'w3', nodes: [], connections: {} }, project);
		const result = await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [w3.id],
			commitMessage: 'Add w3',
			canExportVariableValues: true,
		});

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
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2', 'w3']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const before = await inspectBranch(remote.bareDir);
		const w1Target = (await readBranchEntities(before.dir, 'workflow.json')).find(
			(w) => w.id === workflows[0].id,
		)!.target;
		const w1FileBefore = await readFile(
			path.join(before.dir, 'n8n', w1Target, 'workflow.json'),
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

		await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [workflows[1].id],
			commitMessage: 'Update w2',
			canExportVariableValues: true,
		});

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = await readBranchEntities(dir, 'workflow.json');

		expect(onBranch).toHaveLength(3);
		expect(onBranch.find((w) => w.id === workflows[1].id)!.name).toBe('w2-updated');

		const w1Entry = onBranch.find((w) => w.id === workflows[0].id)!;
		expect(w1Entry).toEqual({ id: workflows[0].id, name: 'w1', target: w1Target });
		expect(await readFile(path.join(dir, 'n8n', w1Target, 'workflow.json'), 'utf-8')).toBe(
			w1FileBefore,
		);
	});

	it('deletes the selected workflow from the branch', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2', 'w3']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		// w3 is gone from the instance, so the project no longer owns it and the
		// promote classifies the selected id as a deletion.
		await Container.get(WorkflowRepository).delete({ id: workflows[2].id });
		await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [workflows[2].id],
			commitMessage: 'Delete w3',
			canExportVariableValues: true,
		});

		const { dir } = await inspectBranch(remote.bareDir);
		const workflowIds = (await readBranchEntities(dir, 'workflow.json')).map((w) => w.id);

		expect(workflowIds).toHaveLength(2);
		expect(workflowIds).not.toContain(workflows[2].id);
		expect(workflowIds).toContain(workflows[0].id);
		expect(workflowIds).toContain(workflows[1].id);
	});

	it('handles add and delete in the same promote atomically', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2', 'w3']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const headAfterFull = (
			await (await inspectBranch(remote.bareDir)).git.revparse(['HEAD'])
		).trim();

		const w4 = await createWorkflow({ name: 'w4', nodes: [], connections: {} }, project);
		// w3 is gone from the instance, so it promotes as a deletion next to the new w4.
		await Container.get(WorkflowRepository).delete({ id: workflows[2].id });
		await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [w4.id, workflows[2].id],
			commitMessage: 'Add w4, delete w3',
			canExportVariableValues: true,
		});

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
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project: p1, workflows: p1Workflows } = await setupProjectWithWorkflows('Orders', [
			'p1-w1',
		]);
		const { workflows: p2Workflows } = await setupProjectWithWorkflows('Billing', ['p2-w1']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});

		const p1w2 = await createWorkflow({ name: 'p1-w2', nodes: [], connections: {} }, p1);
		await service.promoteProjectSelection(p1.id, owner, {
			workflowIds: [p1w2.id],
			commitMessage: 'Add p1-w2',
			canExportVariableValues: true,
		});

		const workflowIds = (
			await readBranchEntities((await inspectBranch(remote.bareDir)).dir, 'workflow.json')
		).map((w) => w.id);

		expect(workflowIds).toContain(p1Workflows[0].id);
		expect(workflowIds).toContain(p1w2.id);
		expect(workflowIds).toContain(p2Workflows[0].id);
	});

	it('moves a renamed workflow to its new directory and removes the old one', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const oldTarget = (
			await readBranchEntities((await inspectBranch(remote.bareDir)).dir, 'workflow.json')
		).find((w) => w.id === workflows[1].id)!.target;

		await Container.get(WorkflowRepository).update(workflows[1].id, { name: 'Renamed' });
		await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [workflows[1].id],
			commitMessage: 'Rename w2',
			canExportVariableValues: true,
		});

		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = await readBranchEntities(dir, 'workflow.json');
		const renamed = onBranch.find((w) => w.id === workflows[1].id)!;

		expect(renamed.name).toBe('Renamed');
		expect(renamed.target).not.toBe(oldTarget);
		expect(renamed.target).toMatch(new RegExp(`/workflows/renamed-${workflows[1].id}$`));
		await expect(
			stat(path.join(dir, 'n8n', renamed.target, 'workflow.json')),
		).resolves.toBeDefined();
		await expect(stat(path.join(dir, 'n8n', oldTarget))).rejects.toThrow();
		expect(onBranch).toHaveLength(2);
	});

	it('moves a renamed folder, so unselected workflows ride along unchanged', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await service.clone(environments.apply.id, owner);

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
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const folderBefore = (
			await readBranchEntities((await inspectBranch(remote.bareDir)).dir, 'folder.json')
		).find((f) => f.id === folder.id)!;

		const folderRepository = Container.get(FolderRepository);
		await folderRepository.update(folder.id, { name: 'Revenue' });
		await service.promoteProjectSelection(project.id, owner, {
			workflowIds: [selected.id],
			commitMessage: 'Rename folder, promote one workflow',
			canExportVariableValues: true,
		});

		const { dir } = await inspectBranch(remote.bareDir);
		const folders = await readBranchEntities(dir, 'folder.json');
		const workflows = await readBranchEntities(dir, 'workflow.json');
		const folderEntry = folders.find((f) => f.id === folder.id)!;
		const selectedEntry = workflows.find((w) => w.id === selected.id)!;
		const unselectedEntry = workflows.find((w) => w.id === unselected.id)!;

		const renamedTarget = folderBefore.target.replace(/[^/]+$/, `revenue-${folder.id}`);
		expect(folderEntry).toMatchObject({ name: 'Revenue', target: renamedTarget });
		expect(selectedEntry.target).toBe(`${renamedTarget}/workflows/selected-${selected.id}`);
		expect(unselectedEntry.target).toBe(`${renamedTarget}/workflows/unselected-${unselected.id}`);
		expect(unselectedEntry).toMatchObject({ name: 'Unselected' });
		await expect(stat(path.join(dir, 'n8n', folderBefore.target))).rejects.toThrow();

		const workflowRepository = Container.get(WorkflowRepository);
		await workflowRepository.delete(unselected.id);
		await service.apply(environments.apply.id, owner);

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
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		await service.promote(environments.promote.id, owner, {
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
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		await service.promote(environments.promote.id, owner, {
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
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		await service.promote(environments.promote.id, owner, {
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

	it('refuses to drop a workflow that moved to another project, and pushes nothing', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project: orders, workflows } = await setupProjectWithWorkflows('Orders', ['w1', 'w2']);
		const { project: billing } = await setupProjectWithWorkflows('Billing', []);
		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Full promote',
		});
		const headBefore = (await simpleGit(remote.bareDir).revparse(['main'])).trim();

		// Move w1 to Billing. The branch still holds it under Orders from the full promote.
		// Dropping it from Orders would make the destination delete it, so the promote refuses.
		await Container.get(SharedWorkflowRepository).update(
			{ workflowId: workflows[0].id, role: 'workflow:owner' },
			{ projectId: billing.id },
		);

		await expect(
			service.promoteProjectSelection(orders.id, owner, {
				workflowIds: [workflows[0].id],
				canExportVariableValues: true,
			}),
		).rejects.toMatchObject({
			httpStatusCode: 400,
			message: expect.stringContaining(`${workflows[0].id} (now in project "Billing" here)`),
		});

		expect((await simpleGit(remote.bareDir).revparse(['main'])).trim()).toBe(headBefore);
		const { dir } = await inspectBranch(remote.bareDir);
		const onBranch = (await readBranchEntities(dir, 'workflow.json')).map((w) => w.id);
		expect(onBranch).toContain(workflows[0].id);
	});

	it('rejects a selection with a workflow that belongs to another project on the branch and pushes nothing', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const { project: orders } = await setupProjectWithWorkflows('Orders', ['w1']);
		const { workflows: billingWorkflows } = await setupProjectWithWorkflows('Billing', ['b1']);
		await service.promote(environments.promote.id, owner, {
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
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

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

		await service.promote(environments.promote.id, owner, {
			canExportVariableValues: true,
			commitMessage: 'Export projects',
		});
		const manifest = packageManifestSchema.parse(
			jsonParse(await simpleGit(remote.bareDir).show(['main:n8n/manifest.json'])),
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
				.map(({ target }) => `n8n/${entityFilePath(collection, target)}`),
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

	it("uses the project's promote environment instead of the instance one", async () => {
		const remote = await createRemote();
		const projectPath = `n8n/projects/orders-${project.id}/project.json`;
		await writeRemoteFile(remote, projectPath, '{"name":"Main"}');
		await commitAndPushRemote(remote, 'Export main project');
		await remote.git.checkoutLocalBranch('production');
		await writeRemoteFile(remote, projectPath, '{"name":"Production"}');
		await remote.git.add(['--all']);
		await remote.git.commit('Export production project');
		await remote.git.push('origin', 'production');
		const instance = await createInstanceEnvironments(remote.bareDir, {
			apply: 'production',
			promote: 'main',
		});
		await service.clone(instance.promote.id, owner);
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

		const projectPromote = await environmentRepository.insertEnvironment({
			name: 'Project production',
			scope: 'projects',
			providerId: instance.promote.providerId,
			remote: { schemaVersion: 1, remoteUrl: remote.bareDir },
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'production', createBranchOnPromotion: false },
		});
		await linkRepository.linkProject(project.id, projectPromote.id, 'promote');
		await service.clone(projectPromote.id, owner);

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
		const projectPath = `n8n/projects/ünïcode örders-${project.id}/project.json`;
		const variablePath = 'n8n/variables/my "quoted" var-Va45zz67/variable.json';
		await writeRemoteFile(remote, projectPath, '{"name":"Ünïcode örders"}');
		await writeRemoteFile(remote, variablePath, '{"name":"my var"}');
		await commitAndPushRemote(remote, 'Initial export');

		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const checkout = workingDirectory.paths(environments.promote.id).repositoryFolder;
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

		const workflowPath = `n8n/projects/ünïcode örders-${project.id}/workflows/my-hyphen-ated-slug-Wf99zz88/workflow.json`;
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
		const environments = await createInstanceEnvironments(bareDir);
		await service.clone(environments.promote.id, owner);

		const branch = await service.readBranchPackage(project.id, 'promote');

		expect(branch).toMatchObject({ commitSha: null, files: [] });
	});

	it('reads the package of the apply branch at one commit, contents included', async () => {
		const remote = await createRemote();
		const projectPath = `n8n/projects/orders-${project.id}/project.json`;
		await writeRemoteFile(remote, projectPath, '{"name":"Orders"}');
		await writeRemoteFile(remote, 'n8n/manifest.json', '{"packageFormatVersion":"1"}');
		await commitAndPushRemote(remote, 'Export');
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.apply.id, owner);

		const branch = await service.readBranchPackage(project.id, 'apply');

		expect(branch.commitSha).toBe((await simpleGit(remote.bareDir).revparse(['main'])).trim());
		expect(branch.files).toEqual([
			expect.objectContaining({ entityId: project.id, path: projectPath }),
		]);
		await expect(branch.readFiles([projectPath, 'n8n/manifest.json'])).resolves.toEqual(
			new Map([
				[projectPath, '{"name":"Orders"}'],
				['n8n/manifest.json', '{"packageFormatVersion":"1"}'],
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
		const projectRoot = `n8n/projects/orders-${project.id}`;
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
				path: 'n8n/variables/apiurl-2/variable.json',
			},
		];
		for (const entity of entities) {
			await writeRemoteFile(remote, entity.path, '{}');
		}
		await writeRemoteFile(remote, 'n8n/manifest.json', 'Not used for this listing');
		await writeRemoteFile(remote, 'n8n/workflows/standalone-Wf01/workflow.json', '{}');
		await writeRemoteFile(remote, 'n8n/folders/standalone-Fo01/folder.json', '{}');
		await writeRemoteFile(remote, `${projectRoot}/workflows/order-42/README.md`, 'Notes');
		await commitAndPushRemote(remote, 'Export scoped entities');
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);

		const files = await listBaseBranchFiles(project.id);

		expect(files.map(({ blobSha, ...entity }) => entity)).toEqual(expect.arrayContaining(entities));
		expect(files).toHaveLength(entities.length);
	});

	it('reports an unavailable remote before its first commit', async () => {
		const bareDir = path.join(testRoot, 'empty-remote.git');
		await simpleGit().raw(['init', '--bare', bareDir]);
		const environments = await createInstanceEnvironments(bareDir);
		await service.clone(environments.promote.id, owner);
		await rename(bareDir, `${bareDir}.offline`);

		await expect(listBaseBranchFiles(project.id)).rejects.toThrow(BadRequestError);
	});

	it('requires a fresh clone after a base-branch change and reports a deleted branch', async () => {
		const remote = await createRemote();
		const environments = await createInstanceEnvironments(remote.bareDir);
		await service.clone(environments.promote.id, owner);
		await remote.git.checkoutLocalBranch('production');
		const projectPath = `n8n/projects/orders-${project.id}/project.json`;
		await writeRemoteFile(remote, projectPath, '{}');
		await remote.git.add(['--all']);
		await remote.git.commit('Export production project');
		await remote.git.push('origin', 'production');
		await environmentRepository.update(environments.promote.id, {
			settings: { schemaVersion: 1, baseBranchName: 'production', createBranchOnPromotion: false },
		});
		await expect(listBaseBranchFiles(project.id)).rejects.toThrow('not connected');
		await service.clone(environments.promote.id, owner);

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
