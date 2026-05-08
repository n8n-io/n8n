import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import {
	CredentialsRepository,
	FolderRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	TagRepository,
	VariablesRepository,
	WorkflowHistoryRepository,
	WorkflowRepository,
	WorkflowTagMappingRepository,
	generateNanoId,
	ProjectRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { existsSync } from 'fs';
import { mkdir, mkdtemp, readdir, readFile as fsReadFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, relative } from 'path';
import { Readable as ReadableImpl } from 'stream';
import type { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import * as tar from 'tar-stream';

import { TarPackageWriter } from '../io/tar/tar-package-writer';

import { createOwner } from '@test-integration/db/users';
import { createCredentials } from '@test-integration/db/credentials';
import { createTag, assignTagToWorkflow } from '@test-integration/db/tags';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { IdDeriver } from '../engine/id-deriver';
import { ImportExportService } from '../import-export.service';

// Mock license to allow team project creation
const licenseMock = mock<LicenseState>();
licenseMock.getMaxTeamProjects.mockReturnValue(-1); // unlimited
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}

/** Unpack a gzipped-tar package into the on-disk folder layout under `dir`. */
async function unpackTarToDir(buffer: Buffer, dir: string): Promise<void> {
	type Collected = { name: string; type: string; content: Buffer };
	const collected: Collected[] = [];
	const extract = tar.extract();

	extract.on('entry', (header, entryStream, next) => {
		const chunks: Buffer[] = [];
		entryStream.on('data', (c: Buffer) => chunks.push(c));
		entryStream.on('end', () => {
			if (typeof header.name === 'string' && header.name.length > 0) {
				collected.push({
					name: header.name,
					type: header.type ?? 'file',
					content: Buffer.concat(chunks),
				});
			}
			next();
		});
		entryStream.resume();
	});

	await pipeline(ReadableImpl.from(buffer), createGunzip(), extract);

	for (const entry of collected) {
		if (typeof entry.name !== 'string' || entry.name.length === 0) continue;
		const target = join(dir, entry.name);
		if (entry.type === 'directory') {
			await mkdir(target, { recursive: true });
		} else {
			await mkdir(dirname(target), { recursive: true });
			await writeFile(target, entry.content);
		}
	}
}

/** Walk a folder layout under `dir` and pack it into a fresh gzipped-tar package. */
async function packDirToTar(dir: string): Promise<Buffer> {
	const writer = new TarPackageWriter();

	async function walk(current: string): Promise<void> {
		const entries = await readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			const full = join(current, entry.name);
			const rel = relative(dir, full);
			if (entry.isDirectory()) {
				writer.writeDirectory(rel);
				await walk(full);
			} else {
				writer.writeFile(rel, await fsReadFile(full));
			}
		}
	}

	await walk(dir);
	return await streamToBuffer(writer.finalize());
}

async function createFolder(name: string, projectId: string, parentFolderId?: string) {
	const folderRepository = Container.get(FolderRepository);
	return await folderRepository.save(
		folderRepository.create({
			name,
			homeProject: { id: projectId },
			parentFolderId: parentFolderId ?? null,
		}),
	);
}

async function createVariable(key: string, value: string, projectId: string) {
	const variablesRepository = Container.get(VariablesRepository);
	return await variablesRepository.save({
		id: generateNanoId(),
		key,
		value,
		type: 'string',
		project: { id: projectId },
	});
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
	await testModules.loadModules(['import-export', 'data-table']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
		'Folder',
		'Variables',
		'Project',
		'TagEntity',
		'WorkflowTagMapping',
	]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('import-export integration', () => {
	let service: ImportExportService;

	beforeAll(() => {
		service = Container.get(ImportExportService);
	});

	describe('scenario 1: same instance — export project A, import into project B', () => {
		it('should recreate folders, workflows, credential stubs, and variables in the target project', async () => {
			// ---- Seed source project ----
			const owner = await createOwner();
			const projectA = await createTeamProject('Project A', owner);

			// Nested folders: Billing > Invoices
			const billing = await createFolder('Billing', projectA.id);
			const invoices = await createFolder('Invoices', projectA.id, billing.id);

			// Credential shared to project A
			const slackCred = await createCredentials(
				{ name: 'My Slack', type: 'slackApi', data: '' },
				projectA,
			);

			// Workflow in nested folder, referencing the credential
			const generateInvoice = await createWorkflow(
				{
					name: 'Generate Invoice',
					parentFolder: { id: invoices.id },
					nodes: [
						{
							id: 'node-1',
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							credentials: {
								slackApi: { id: slackCred.id, name: 'My Slack' },
							},
						},
					],
					connections: {},
				},
				projectA,
			);

			// Workflow at project root
			const syncOrders = await createWorkflow(
				{
					name: 'Sync Orders',
					nodes: [
						{
							id: 'node-2',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								value: '={{ $vars.API_URL }}',
							},
						},
					],
					connections: {},
				},
				projectA,
			);

			// Variable
			await createVariable('API_URL', 'https://api.example.com', projectA.id);

			// ---- Export ----
			const exportStream = await service.exportPackage({
				type: 'projects',
				user: owner,
				projectIds: [projectA.id],
			});
			const buffer = await streamToBuffer(exportStream);

			// ---- Create target project ----
			const projectB = await createTeamProject('Project B', owner);

			// ---- Import into project B ----
			const result = await service.importPackage(buffer, {
				user: owner,
				targetProjectId: projectB.id,
				mode: 'force',
				includeCredentialStubs: true,
				includeVariableValues: true,
				overwriteVariableValues: false,
			});

			// ---- Assertions ----

			// Project-scoped import creates a new project (by name from manifest),
			// so check the result
			expect(result.projects).toHaveLength(1);
			expect(result.projects[0].name).toBe('Project A');
			const targetProjectId = result.projects[0].id;

			// Folders: should have Billing > Invoices in target project
			const folderRepo = Container.get(FolderRepository);
			const targetFolders = await folderRepo.find({
				where: { homeProject: { id: targetProjectId } },
			});
			expect(targetFolders).toHaveLength(2);

			const targetBilling = targetFolders.find((f) => f.name === 'Billing');
			const targetInvoices = targetFolders.find((f) => f.name === 'Invoices');
			expect(targetBilling).toBeDefined();
			expect(targetInvoices).toBeDefined();
			expect(targetInvoices!.parentFolderId).toBe(targetBilling!.id);

			// Workflows: should have both workflows in target project
			const sharedWorkflowRepo = Container.get(SharedWorkflowRepository);
			const targetSharedWorkflows = await sharedWorkflowRepo.find({
				where: { projectId: targetProjectId },
				relations: ['workflow'],
			});
			expect(targetSharedWorkflows).toHaveLength(2);

			const targetWorkflowNames = targetSharedWorkflows.map((sw) => sw.workflow.name);
			expect(targetWorkflowNames).toContain('Generate Invoice');
			expect(targetWorkflowNames).toContain('Sync Orders');

			// "Generate Invoice" should be in the Invoices folder
			const targetGenInvoiceWf = targetSharedWorkflows.find(
				(sw) => sw.workflow.name === 'Generate Invoice',
			)!.workflow;
			const fullGenInvoice = await Container.get(WorkflowRepository).findOne({
				where: { id: targetGenInvoiceWf.id },
				relations: ['parentFolder'],
			});
			expect(fullGenInvoice!.parentFolder?.id).toBe(targetInvoices!.id);

			// Credential stub: should exist in target project
			const sharedCredRepo = Container.get(SharedCredentialsRepository);
			const targetSharedCreds = await sharedCredRepo.find({
				where: { projectId: targetProjectId },
				relations: ['credentials'],
			});
			expect(targetSharedCreds.length).toBeGreaterThanOrEqual(1);

			// On same-instance import, the credential resolver finds the existing
			// credential by name+type, so a stub may or may not be created. Either way,
			// the imported workflow's credential reference must be valid.
			const importedGenInvoice = await Container.get(WorkflowRepository).findOneByOrFail({
				id: targetGenInvoiceWf.id,
			});
			const slackNode = importedGenInvoice.nodes.find((n) => n.type === 'n8n-nodes-base.slack');
			expect(slackNode?.credentials?.slackApi?.id).toBeDefined();

			// The credential referenced by the workflow must actually exist
			const referencedCredId = slackNode!.credentials!.slackApi!.id!;
			const referencedCred = await Container.get(CredentialsRepository).findOneBy({
				id: referencedCredId,
			});
			expect(referencedCred).toBeDefined();
			expect(referencedCred!.type).toBe('slackApi');

			// Variables: should exist in target project
			const variablesRepo = Container.get(VariablesRepository);
			const targetVars = await variablesRepo.find({
				where: { project: { id: targetProjectId } },
			});
			expect(targetVars).toHaveLength(1);
			expect(targetVars[0].key).toBe('API_URL');
			expect(targetVars[0].value).toBe('https://api.example.com');

			// Source project A should be untouched
			const sourceSharedWorkflows = await sharedWorkflowRepo.find({
				where: { projectId: projectA.id },
			});
			expect(sourceSharedWorkflows).toHaveLength(2);

			const sourceFolders = await folderRepo.find({
				where: { homeProject: { id: projectA.id } },
			});
			expect(sourceFolders).toHaveLength(2);
		});
	});

	describe('scenario 2: cross-instance — export, clear DB, import', () => {
		it('should recreate everything from scratch on a fresh instance', async () => {
			// ---- Seed source instance ----
			const owner = await createOwner();
			const sourceProject = await createTeamProject('My App', owner);

			// Folder
			const etlFolder = await createFolder('ETL', sourceProject.id);

			// Credential
			const pgCred = await createCredentials(
				{ name: 'Prod Postgres', type: 'postgres', data: '' },
				sourceProject,
			);

			// Workflow in folder, referencing credential
			await createWorkflow(
				{
					name: 'Transform Data',
					parentFolder: { id: etlFolder.id },
					nodes: [
						{
							id: 'node-pg',
							name: 'Postgres',
							type: 'n8n-nodes-base.postgres',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							credentials: {
								postgres: { id: pgCred.id, name: 'Prod Postgres' },
							},
						},
					],
					connections: {},
				},
				sourceProject,
			);

			// Workflow at root, referencing a variable
			await createWorkflow(
				{
					name: 'Notify Team',
					nodes: [
						{
							id: 'node-slack',
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								channel: '={{ $vars.SLACK_CHANNEL }}',
							},
						},
					],
					connections: {},
				},
				sourceProject,
			);

			// Variable
			await createVariable('SLACK_CHANNEL', '#alerts', sourceProject.id);

			// ---- Export ----
			const exportStream = await service.exportPackage({
				type: 'projects',
				user: owner,
				projectIds: [sourceProject.id],
			});
			const buffer = await streamToBuffer(exportStream);

			// ---- Simulate fresh instance: clear all data ----
			await testDb.truncate([
				'WorkflowEntity',
				'SharedWorkflow',
				'CredentialsEntity',
				'SharedCredentials',
				'Folder',
				'Variables',
				'Project',
			]);

			// Need a fresh user on the "new instance"
			const newOwner = await createOwner();

			// ---- Import ----
			const result = await service.importPackage(buffer, {
				user: newOwner,
				mode: 'force',
				includeCredentialStubs: true,
				includeVariableValues: true,
				overwriteVariableValues: false,
			});

			// ---- Assertions ----

			// Project created
			expect(result.projects).toHaveLength(1);
			expect(result.projects[0].name).toBe('My App');
			const newProjectId = result.projects[0].id;

			// The project should exist in the DB
			const projectRepo = Container.get(ProjectRepository);
			const newProject = await projectRepo.findOneBy({ id: newProjectId });
			expect(newProject).toBeDefined();
			expect(newProject!.name).toBe('My App');
			expect(newProject!.type).toBe('team');

			// Folder: ETL should exist
			const folderRepo = Container.get(FolderRepository);
			const folders = await folderRepo.find({
				where: { homeProject: { id: newProjectId } },
			});
			expect(folders).toHaveLength(1);
			expect(folders[0].name).toBe('ETL');

			// Workflows: both should exist
			const sharedWorkflowRepo = Container.get(SharedWorkflowRepository);
			const sharedWorkflows = await sharedWorkflowRepo.find({
				where: { projectId: newProjectId },
				relations: ['workflow'],
			});
			expect(sharedWorkflows).toHaveLength(2);

			const workflowNames = sharedWorkflows.map((sw) => sw.workflow.name);
			expect(workflowNames).toContain('Transform Data');
			expect(workflowNames).toContain('Notify Team');

			// "Transform Data" should be in ETL folder
			const transformWf = sharedWorkflows.find(
				(sw) => sw.workflow.name === 'Transform Data',
			)!.workflow;
			const fullTransform = await Container.get(WorkflowRepository).findOne({
				where: { id: transformWf.id },
				relations: ['parentFolder'],
			});
			expect(fullTransform!.parentFolder?.id).toBe(folders[0].id);

			// Credential stub created
			const sharedCredRepo = Container.get(SharedCredentialsRepository);
			const sharedCreds = await sharedCredRepo.find({
				where: { projectId: newProjectId },
				relations: ['credentials'],
			});
			expect(sharedCreds.length).toBeGreaterThanOrEqual(1);
			const pgStub = sharedCreds.find(
				(sc) => sc.credentials.name === 'Prod Postgres' && sc.credentials.type === 'postgres',
			);
			expect(pgStub).toBeDefined();

			// Workflow credential remapping
			const importedTransform = await Container.get(WorkflowRepository).findOneByOrFail({
				id: transformWf.id,
			});
			const pgNode = importedTransform.nodes.find((n) => n.type === 'n8n-nodes-base.postgres');
			expect(pgNode?.credentials?.postgres?.id).toBe(pgStub!.credentials.id);
			// Must NOT still reference the old source credential ID
			expect(pgNode?.credentials?.postgres?.id).not.toBe(pgCred.id);

			// Variable created
			const variablesRepo = Container.get(VariablesRepository);
			const vars = await variablesRepo.find({
				where: { project: { id: newProjectId } },
			});
			expect(vars).toHaveLength(1);
			expect(vars[0].key).toBe('SLACK_CHANNEL');
			expect(vars[0].value).toBe('#alerts');
		});
	});

	describe('rejection scenarios', () => {
		async function exportProject(
			projectId: string,
			owner: Awaited<ReturnType<typeof createOwner>>,
		) {
			const stream = await service.exportPackage({
				type: 'projects',
				user: owner,
				projectIds: [projectId],
			});
			return await streamToBuffer(stream);
		}

		it('should reject import in auto mode when required variables are missing', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Vars Project', owner);

			// Workflow referencing a variable that IS included in the export
			await createWorkflow(
				{
					name: 'WF with var',
					nodes: [
						{
							id: 'n1',
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 1,
							position: [0, 0],
							parameters: { value: '={{ $vars.MISSING_VAR }}' },
						},
					],
					connections: {},
				},
				project,
			);

			// Do NOT create the variable — it won't be in the package or on target

			const buffer = await exportProject(project.id, owner);

			// Clear and re-seed a user for the "target"
			await testDb.truncate([
				'WorkflowEntity',
				'SharedWorkflow',
				'CredentialsEntity',
				'SharedCredentials',
				'Folder',
				'Variables',
				'Project',
			]);
			const newOwner = await createOwner();

			// Auto mode should reject because MISSING_VAR doesn't exist anywhere
			await expect(
				service.importPackage(buffer, {
					user: newOwner,
					mode: 'auto',
					includeCredentialStubs: true,
					includeVariableValues: false,
					overwriteVariableValues: false,
				}),
			).rejects.toThrow(BadRequestError);

			await expect(
				service.importPackage(buffer, {
					user: newOwner,
					mode: 'auto',
					includeCredentialStubs: true,
					includeVariableValues: false,
					overwriteVariableValues: false,
				}),
			).rejects.toThrow(/Missing required variables.*MISSING_VAR/);
		});

		it('should reject import in auto mode when credentials cannot be resolved and stubs are not requested', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Cred Project', owner);

			const cred = await createCredentials(
				{ name: 'My API Key', type: 'httpHeaderAuth', data: '' },
				project,
			);

			await createWorkflow(
				{
					name: 'WF with cred',
					nodes: [
						{
							id: 'n1',
							name: 'HTTP',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							credentials: {
								httpHeaderAuth: { id: cred.id, name: 'My API Key' },
							},
						},
					],
					connections: {},
				},
				project,
			);

			const buffer = await exportProject(project.id, owner);

			// Clear DB — credential won't exist on target
			await testDb.truncate([
				'WorkflowEntity',
				'SharedWorkflow',
				'CredentialsEntity',
				'SharedCredentials',
				'Folder',
				'Variables',
				'Project',
			]);
			const newOwner = await createOwner();

			// Auto mode WITHOUT includeCredentialStubs should reject
			await expect(
				service.importPackage(buffer, {
					user: newOwner,
					mode: 'auto',
					includeCredentialStubs: false,
					includeVariableValues: true,
					overwriteVariableValues: false,
				}),
			).rejects.toThrow(BadRequestError);

			await expect(
				service.importPackage(buffer, {
					user: newOwner,
					mode: 'auto',
					includeCredentialStubs: false,
					includeVariableValues: true,
					overwriteVariableValues: false,
				}),
			).rejects.toThrow(/Could not auto-resolve requirements.*My API Key/);
		});

		it('should reject import in auto mode when sub-workflow references cannot be resolved', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('SubWF Project', owner);

			// Workflow that calls a sub-workflow by ID that won't exist on target
			await createWorkflow(
				{
					name: 'Parent WF',
					nodes: [
						{
							id: 'n1',
							name: 'Execute Workflow',
							type: 'n8n-nodes-base.executeWorkflow',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								workflowId: 'non-existent-wf-id',
							},
						},
					],
					connections: {},
				},
				project,
			);

			const buffer = await exportProject(project.id, owner);

			await testDb.truncate([
				'WorkflowEntity',
				'SharedWorkflow',
				'CredentialsEntity',
				'SharedCredentials',
				'Folder',
				'Variables',
				'Project',
			]);
			const newOwner = await createOwner();

			await expect(
				service.importPackage(buffer, {
					user: newOwner,
					mode: 'auto',
					includeCredentialStubs: true,
					includeVariableValues: true,
					overwriteVariableValues: false,
				}),
			).rejects.toThrow(BadRequestError);

			await expect(
				service.importPackage(buffer, {
					user: newOwner,
					mode: 'auto',
					includeCredentialStubs: true,
					includeVariableValues: true,
					overwriteVariableValues: false,
				}),
			).rejects.toThrow(/Could not auto-resolve requirements.*sub-workflow/);
		});

		it('should allow force mode to bypass unresolved requirements', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Force Project', owner);

			const cred = await createCredentials(
				{ name: 'Some Cred', type: 'someApi', data: '' },
				project,
			);

			await createWorkflow(
				{
					name: 'WF needing everything',
					nodes: [
						{
							id: 'n1',
							name: 'Node',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: { url: '={{ $vars.SOME_VAR }}' },
							credentials: {
								someApi: { id: cred.id, name: 'Some Cred' },
							},
						},
						{
							id: 'n2',
							name: 'Execute Workflow',
							type: 'n8n-nodes-base.executeWorkflow',
							typeVersion: 1,
							position: [100, 0],
							parameters: { workflowId: 'missing-wf-id' },
						},
					],
					connections: {},
				},
				project,
			);

			const buffer = await exportProject(project.id, owner);

			await testDb.truncate([
				'WorkflowEntity',
				'SharedWorkflow',
				'CredentialsEntity',
				'SharedCredentials',
				'Folder',
				'Variables',
				'Project',
			]);
			const newOwner = await createOwner();

			// Force mode should succeed despite unresolved credentials,
			// variables, and sub-workflows
			const result = await service.importPackage(buffer, {
				user: newOwner,
				mode: 'force',
				includeCredentialStubs: false,
				includeVariableValues: false,
				overwriteVariableValues: false,
			});

			expect(result.projects).toHaveLength(1);
			expect(result.projects[0].name).toBe('Force Project');
		});

		it('should reject exporting a personal project', async () => {
			const owner = await createOwner();
			const personalProject = await Container.get(ProjectRepository).findOneOrFail({
				where: { type: 'personal', projectRelations: { userId: owner.id } },
			});

			await expect(
				service.exportPackage({
					type: 'projects',
					user: owner,
					projectIds: [personalProject.id],
				}),
			).rejects.toThrow(/personal project.*cannot be exported/i);
		});
	});

	describe('workflow versioning', () => {
		it('should add a new WorkflowHistory entry when re-importing a workflow', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Versioned', owner);

			const wf = await createWorkflow(
				{
					name: 'My Workflow',
					nodes: [],
					connections: {},
				},
				project,
			);

			// Capture history count before any import
			const historyRepo = Container.get(WorkflowHistoryRepository);
			const beforeCount = await historyRepo.count({ where: { workflowId: wf.id } });

			// Export and re-import the same workflow into the same project
			const stream = await service.exportPackage({
				type: 'workflows',
				user: owner,
				workflowIds: [wf.id],
			});
			const buffer = await streamToBuffer(stream);

			await service.importPackage(buffer, {
				user: owner,
				targetProjectId: project.id,
				mode: 'force',
				includeCredentialStubs: false,
				includeVariableValues: true,
				overwriteVariableValues: false,
			});

			// Find the new (HMAC-derived deterministic-id) workflow that the import wrote
			const importedWorkflowId = Container.get(IdDeriver).derive(project.id, wf.id);
			const afterCount = await historyRepo.count({
				where: { workflowId: importedWorkflowId },
			});

			// At least one history row exists for the imported version, so the
			// user can roll back to a pre-import state via the existing UI.
			expect(afterCount).toBeGreaterThan(beforeCount);

			const newest = await historyRepo.findOne({
				where: { workflowId: importedWorkflowId },
				order: { createdAt: 'DESC' },
			});
			expect(newest?.name).toBe('Imported from package');
			expect(newest?.description).toContain(`source workflow id: ${wf.id}`);
		});
	});

	describe('tags round-trip', () => {
		it('should export tags referenced by workflows and re-link them on cross-instance import', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Tagged Project', owner);

			const wf = await createWorkflow(
				{
					name: 'Tagged Workflow',
					nodes: [],
					connections: {},
				},
				sourceProject,
			);

			// Two tags, one used and one not, to verify only referenced tags are exported.
			const usedTag = await createTag({ name: 'production' });
			await createTag({ name: 'unused' });
			await assignTagToWorkflow(usedTag, wf);

			const stream = await service.exportPackage({
				type: 'projects',
				user: owner,
				projectIds: [sourceProject.id],
			});
			const buffer = await streamToBuffer(stream);

			await testDb.truncate([
				'WorkflowEntity',
				'SharedWorkflow',
				'CredentialsEntity',
				'SharedCredentials',
				'Folder',
				'Variables',
				'Project',
				'TagEntity',
				'WorkflowTagMapping',
			]);
			const newOwner = await createOwner();

			const result = await service.importPackage(buffer, {
				user: newOwner,
				mode: 'force',
				includeCredentialStubs: false,
				includeVariableValues: true,
				overwriteVariableValues: false,
			});

			expect(result.projects).toHaveLength(1);
			expect(result.tags).toBe(1);

			// Tag was created on the target instance
			const tags = await Container.get(TagRepository).find();
			expect(tags).toHaveLength(1);
			expect(tags[0].name).toBe('production');

			// Workflow → tag mapping was re-established
			const newWf = (await Container.get(WorkflowRepository).find({ relations: ['tags'] }))[0];
			expect(newWf.tags).toHaveLength(1);
			expect(newWf.tags?.[0].name).toBe('production');
		});

		it('should reuse an existing tag with the same name on the target instance', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Reuse Tag Project', owner);

			const wf = await createWorkflow(
				{ name: 'Tagged Workflow', nodes: [], connections: {} },
				sourceProject,
			);
			const sourceTag = await createTag({ name: 'shared-tag' });
			await assignTagToWorkflow(sourceTag, wf);

			const stream = await service.exportPackage({
				type: 'projects',
				user: owner,
				projectIds: [sourceProject.id],
			});
			const buffer = await streamToBuffer(stream);

			// Clear workflow data but keep a tag with the same name pre-existing on target.
			await testDb.truncate([
				'WorkflowEntity',
				'SharedWorkflow',
				'CredentialsEntity',
				'SharedCredentials',
				'Folder',
				'Variables',
				'Project',
				'TagEntity',
				'WorkflowTagMapping',
			]);
			const newOwner = await createOwner();
			const preExistingTag = await createTag({ name: 'shared-tag' });

			await service.importPackage(buffer, {
				user: newOwner,
				mode: 'force',
				includeCredentialStubs: false,
				includeVariableValues: true,
				overwriteVariableValues: false,
			});

			// Only one tag exists — the pre-existing one was reused.
			const tags = await Container.get(TagRepository).find();
			expect(tags).toHaveLength(1);
			expect(tags[0].id).toBe(preExistingTag.id);

			// Workflow is mapped to the pre-existing tag
			const mappingRepo = Container.get(WorkflowTagMappingRepository);
			const mappings = await mappingRepo.find();
			expect(mappings).toHaveLength(1);
			expect(mappings[0].tagId).toBe(preExistingTag.id);
		});
	});

	describe('bundle ↔ folder layout duality', () => {
		it('should round-trip losslessly through the unpacked folder layout', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Layout Source', owner);
			const wf = await createWorkflow(
				{
					name: 'Daily Sync',
					nodes: [
						{
							name: 'Start',
							type: 'n8n-nodes-base.start',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
				},
				sourceProject,
			);

			// Export → bundle (gzipped tar)
			const stream = await service.exportPackage({
				type: 'workflows',
				user: owner,
				workflowIds: [wf.id],
			});
			const bundle = await streamToBuffer(stream);

			// Unpack the bundle into a folder layout, then repack from disk into a
			// fresh bundle. Both forms must produce equivalent imports.
			const tempDir = await mkdtemp(join(tmpdir(), 'n8n-pkg-roundtrip-'));
			try {
				await unpackTarToDir(bundle, tempDir);

				// Sanity-check: the unpacked layout has the expected files on disk.
				expect(existsSync(join(tempDir, 'manifest.json'))).toBe(true);
				const workflowFiles = (await readdir(join(tempDir, 'workflows'))).filter(
					(entry) => !entry.endsWith('.json'),
				);
				expect(workflowFiles.length).toBeGreaterThanOrEqual(1);

				// Repack the layout into a fresh bundle and import it into a target project.
				const repacked = await packDirToTar(tempDir);

				const targetProject = await createTeamProject('Layout Target', owner);
				const result = await service.importPackage(repacked, {
					user: owner,
					targetProjectId: targetProject.id,
					mode: 'auto',
					includeCredentialStubs: false,
					includeVariableValues: true,
					overwriteVariableValues: false,
				});

				expect(result.workflows).toBe(1);

				// The repacked bundle imported the workflow with the same content.
				const importedId = Container.get(IdDeriver).derive(targetProject.id, wf.id);
				const imported = await Container.get(WorkflowRepository).findOne({
					where: { id: importedId },
				});
				expect(imported?.name).toBe('Daily Sync');
				expect(imported?.nodes).toHaveLength(1);
				expect(imported?.nodes[0].type).toBe('n8n-nodes-base.start');
			} finally {
				await rm(tempDir, { recursive: true, force: true });
			}
		});
	});
});
