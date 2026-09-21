import type { PromotionDirection } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	createWorkflowWithHistory,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	FolderRepository,
	SharedWorkflowRepository,
	VariablesRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher, type InstanceSettings } from 'n8n-core';
import { mkdtempSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { onTestFinished, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableService } from '@/modules/data-table/data-table.service';
import {
	buildWorkflowReferencingDataTables,
	buildWorkflowReferencingVariables,
} from '@/modules/n8n-packages/__tests__/utils/test-builders';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { createMember, createOwner } from '@test-integration/db/users';
import { createFolder } from '@test-integration/db/folders';
import { createVariable } from '@test-integration/db/variables';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

import { PromotionConfigRepository } from '../database/repositories/promotion-config.repository';
import { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionsService } from '../promotions.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';

const instanceFolder = mkdtempSync(path.join(tmpdir(), 'promotion-preview-'));
Container.set(
	PromotionWorkingDirectoryService,
	new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder: instanceFolder })),
);
mockInstance(ActiveWorkflowManager);
const server = setupTestServer({
	endpointGroups: ['promotions'],
	modules: ['promotions', 'n8n-packages', 'data-table'],
	enabledFeatures: ['feat:gitConnections', 'feat:projectRole:admin'],
});

let remoteFolder: string;

beforeEach(async () => {
	await Container.get(PromotionConfigRepository).delete({});
	await Container.get(PromotionConnectionRepository).delete({});
	await Container.get(PromotionProviderRepository).delete({});
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'Folder',
		'ProjectRelation',
		'Project',
		'Variables',
		'DataTable',
		'DataTableColumn',
	]);
	await Container.get(VariablesService).updateCache();
	mockDataTableSizeValidator();
	remoteFolder = await mkdtemp(path.join(tmpdir(), 'promotion-preview-remote-'));
	await simpleGit().raw(['init', '--bare', remoteFolder]);
});

afterEach(async () => {
	await rm(remoteFolder, { recursive: true, force: true });
});

afterAll(async () => {
	await rm(instanceFolder, { recursive: true, force: true });
});

/** Both directions point at `main` of the same remote, so one instance can play source and destination. */
async function createConnection(directions: PromotionDirection[] = ['promote']) {
	const provider = await Container.get(PromotionProviderRepository).insertProvider({
		name: 'Preview',
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: await Container.get(Cipher).encryptV2(
			JSON.stringify({ schemaVersion: 1, username: 'test', password: 'test' }),
		),
	});
	const connection = await Container.get(PromotionConnectionRepository).insertConnection({
		name: 'Preview',
		scope: 'instance',
		providerId: provider.id,
		target: { schemaVersion: 1, remoteUrl: remoteFolder },
	});
	for (const direction of directions) {
		await addConfig(connection.id, direction);
		await Container.get(PromotionsService).clone(connection.id, direction);
	}
	return connection;
}

async function addConfig(connectionId: string, direction: PromotionDirection) {
	const configs = Container.get(PromotionConfigRepository);
	if (direction === 'promote') {
		await configs.insertConfig({
			connectionId,
			direction,
			name: 'Promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
		});
	} else {
		await configs.insertConfig({
			connectionId,
			direction,
			name: 'Apply',
			settings: { schemaVersion: 1, branchName: 'main' },
		});
	}
}

async function remoteHead(): Promise<string> {
	return (await simpleGit(remoteFolder).revparse(['main'])).trim();
}

it('lists new, changed, moved, archived, restored and deleted workflows through the endpoint', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Preview', owner);
	const otherProject = await createTeamProject('Other', owner);
	const publishable = await createWorkflowWithHistory(
		{ name: 'Publication', nodes: [], connections: {} },
		project,
	);
	const modified = await createWorkflow({ name: 'Modified', nodes: [], connections: {} }, project);
	const archived = await createWorkflow({ name: 'Archived', nodes: [], connections: {} }, project);
	const removed = await createWorkflow({ name: 'Removed', nodes: [], connections: {} }, project);
	const connection = await createConnection();
	const service = Container.get(PromotionsService);
	const endpoint = `/promotions/${project.id}/changes/promote`;
	const agent = server.authAgentFor(owner);
	const initial = await agent.get(endpoint).expect(200);
	// The branch has no commit yet, so there is no commit to pin.
	expect(initial.body.data.commitSha).toBeNull();
	expect(initial.body.data.changes).toHaveLength(4);
	expect(initial.body.data.changes).toEqual(
		expect.arrayContaining([expect.objectContaining({ id: modified.id, status: 'new' })]),
	);
	await service.promote(connection.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual({
		commitSha: await remoteHead(),
		changes: [],
	});

	const workflows = Container.get(WorkflowRepository);
	// Publication is state in the metadata file, not content, so it never lists.
	await workflows.update(publishable.id, { activeVersionId: publishable.versionId });
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([]);
	await workflows.update(modified.id, { name: 'Renamed', settings: { executionOrder: 'v1' } });
	await workflows.update(archived.id, { isArchived: true });
	await workflows.delete(removed.id);
	const created = await createWorkflow({ name: 'New', nodes: [], connections: {} }, project);
	await createWorkflow({ name: 'Not in preview', nodes: [], connections: {} }, otherProject);

	const response = await agent.get(endpoint).expect(200);
	expect(response.body.data.changes).toHaveLength(4);
	expect(response.body.data.changes).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ id: modified.id, name: 'Renamed', status: 'renamed-and-modified' }),
			expect.objectContaining({ id: archived.id, status: 'archived' }),
			expect.objectContaining({
				id: removed.id,
				name: 'removed',
				status: 'deleted',
				version: null,
				updatedAt: null,
			}),
			expect.objectContaining({ id: created.id, name: 'New', status: 'new' }),
		]),
	);
	expect(
		(await agent.get(endpoint).query({ search: 'renamed' }).expect(200)).body.data.changes,
	).toHaveLength(1);
	await agent.get(endpoint).query({ order: 'invalid' }).expect(400);

	await service.promote(connection.id, owner, {
		commitMessage: 'Changes',
		canExportVariableValues: true,
	});
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([]);
	await workflows.update(archived.id, { isArchived: false });
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([
		expect.objectContaining({ id: archived.id, status: 'modified' }),
	]);
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: modified.id, role: 'workflow:owner' },
		{ projectId: otherProject.id },
	);
	const movedOut = (await agent.get(endpoint).expect(200)).body.data.changes;
	expect(movedOut).toHaveLength(2);
	expect(movedOut).toContainEqual(
		expect.objectContaining({
			id: modified.id,
			name: 'renamed',
			status: 'deleted',
			version: null,
			updatedAt: null,
		}),
	);
}, 30_000);

it('preserves workflow moves and changes across workflow files', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Moves', owner);
	const folder = await createFolder(project, { name: 'Original' });
	const workflow = await createWorkflowWithHistory(
		{ name: 'Move', nodes: [], connections: {}, parentFolder: folder },
		project,
	);
	const connection = await createConnection();
	await Container.get(PromotionsService).promote(connection.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	const endpoint = `/promotions/${project.id}/changes/promote`;
	const agent = server.authAgentFor(owner);
	const workflows = Container.get(WorkflowRepository);
	const folders = Container.get(FolderRepository);

	await folders.update(folder.id, { name: 'Renamed' });
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([
		expect.objectContaining({ id: workflow.id, status: 'renamed' }),
	]);

	// Publishing does not turn the move into a modification.
	await workflows.update(workflow.id, { activeVersionId: workflow.versionId });
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([
		expect.objectContaining({ id: workflow.id, status: 'renamed' }),
	]);

	await workflows.update(workflow.id, { activeVersionId: null, parentFolder: null });
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([
		expect.objectContaining({ id: workflow.id, status: 'renamed-and-modified' }),
	]);

	await workflows.update(workflow.id, { parentFolder: folder });
	await folders.update(folder.id, { name: folder.name });
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([]);
}, 30_000);

it('logs file hashes without workflow content', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Diagnostics', owner);
	const workflow = await createWorkflow(
		{
			name: 'Diagnostic',
			nodes: [
				{
					id: 'diagnostic-node',
					name: 'Diagnostic',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [0, 0],
					parameters: { value: 'fixture-base-value' },
				},
			],
			connections: {},
		},
		project,
	);
	const connection = await createConnection();
	const service = Container.get(PromotionsService);
	await service.promote(connection.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	const base = (await service.readBranchPackage(project.id, 'promote')).files.find(
		(file) => file.entityId === workflow.id && file.fileName === 'workflow.json',
	);
	const workflows = Container.get(WorkflowRepository);
	await workflows.update(workflow.id, {
		versionId: 'changed-version',
		nodes: [
			{
				id: 'diagnostic-node',
				name: 'Diagnostic',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					value: 'fixture-desired-value',
					password: 'fixture-password',
					note: 'Contact fixture@example.test',
				},
			},
		],
	});
	const variable = await createVariable('DIAGNOSTIC', 'fixture-variable-value');
	await Container.get(VariablesService).updateCache();
	const endpoint = `/promotions/${project.id}/changes/promote`;
	const agent = server.authAgentFor(owner);
	const debug = vi.mocked(Container.get(Logger).scoped('promotions').debug);
	const logging = Container.get(GlobalConfig).logging;
	const { level, scopes } = logging;
	onTestFinished(() => {
		Object.assign(logging, { level, scopes });
	});

	logging.level = 'debug';
	logging.scopes = [];
	debug.mockClear();
	const withoutDiagnostics = await agent.get(endpoint).expect(200);
	expect(debug.mock.calls.map(([message]) => message).join('\n')).not.toContain('versionId');

	logging.scopes = ['promotions'];
	debug.mockClear();
	const response = await agent.get(endpoint).expect(200);
	expect(response.body.data.changes).toEqual(withoutDiagnostics.body.data.changes);
	expect(debug).toHaveBeenCalledWith(
		'Promotion file change',
		expect.objectContaining({
			projectId: project.id,
			change: 'modified',
			base: expect.objectContaining({ blobSha: base?.blobSha }),
			desired: expect.objectContaining({ entityId: workflow.id, blobSha: expect.any(String) }),
		}),
	);
	const output = JSON.stringify(debug.mock.calls);
	expect(output).not.toContain('fixture-base-value');
	expect(output).not.toContain('fixture-desired-value');
	expect(output).not.toContain('changed-version');
	expect(output).not.toContain(workflow.versionId);
	expect(output).not.toContain('fixture-password');
	expect(output).not.toContain('fixture@example.test');
	expect(output).not.toContain('fixture-variable-value');

	// The version id stays changed. It lives in the metadata file, which the preview skips.
	await workflows.update(workflow.id, { nodes: workflow.nodes });
	await Container.get(VariablesRepository).delete(variable.id);
	await Container.get(VariablesService).updateCache();
	debug.mockClear();
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([]);
	expect(debug).toHaveBeenCalledWith(
		'Promotion change preview',
		expect.objectContaining({ projectId: project.id, fileChangeCount: 0, workflowIds: [] }),
	);
	expect(debug.mock.calls.map(([message]) => message).join('\n')).not.toContain('versionId');
}, 30_000);

it('detects variable and data table changes without reporting shadowed or unrelated dependencies', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Dependencies', owner);
	const global = await createVariable('API_URL', 'global');
	const variables = Container.get(VariablesRepository);
	const scoped = await variables.save({
		id: 'VariableZ',
		key: 'API_URL',
		value: 'project',
		project,
	});
	await variables.save({ id: 'VariableA', key: 'APIURL', value: 'other', project });
	await Container.get(VariablesService).updateCache();
	await buildWorkflowReferencingVariables({
		name: 'Same slug',
		project,
		variableNames: ['APIURL'],
	});
	const withVariable = await buildWorkflowReferencingVariables({
		name: 'Variable',
		project,
		variableNames: ['API_URL', 'API_URL'],
	});
	const tables = Container.get(DataTableService);
	const table = await tables.createDataTable(project.id, {
		name: 'Orders',
		columns: [{ name: 'name', type: 'string' }],
	});
	const withTable = await buildWorkflowReferencingDataTables({
		name: 'Table',
		project,
		references: [{ dataTableId: table.id }],
	});
	await createWorkflow({ name: 'Unrelated', nodes: [], connections: {} }, project);
	const connection = await createConnection();
	await Container.get(PromotionsService).promote(connection.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	const agent = server.authAgentFor(owner);
	const endpoint = `/promotions/${project.id}/changes/promote`;
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([]);
	await variables.update(global.id, { value: 'changed global' });
	await Container.get(VariablesService).updateCache();
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([]);
	await variables.update(scoped.id, { value: 'changed project' });
	await Container.get(VariablesService).updateCache();
	await tables.addColumn(table.id, project.id, { name: 'total', type: 'number' });
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([
		expect.objectContaining({ id: withTable.id, status: 'modified', dependencyCount: 1 }),
		expect.objectContaining({ id: withVariable.id, status: 'modified', dependencyCount: 1 }),
	]);
	await Container.get(PromotionsService).promote(connection.id, owner, {
		commitMessage: 'Dependencies',
		canExportVariableValues: true,
	});
	await variables.delete([scoped.id, global.id]);
	await Container.get(VariablesService).updateCache();
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([
		expect.objectContaining({ id: withVariable.id, status: 'modified', dependencyCount: 1 }),
	]);
}, 30_000);

it('lists what applying the branch changes on this instance, named and archived as the branch says', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Destination', owner);
	const otherProject = await createTeamProject('Other', owner);
	const variable = await createVariable('SHARED_URL', 'https://before.example.com');
	await Container.get(VariablesService).updateCache();
	const renamed = await createWorkflow(
		{ name: 'Branch name', nodes: [], connections: {} },
		project,
	);
	const archived = await createWorkflow(
		{ name: 'Archived on branch', nodes: [], connections: {} },
		project,
	);
	const incoming = await createWorkflow({ name: 'Incoming', nodes: [], connections: {} }, project);
	const dependent = await buildWorkflowReferencingVariables({
		name: 'Dependent',
		project,
		variableNames: ['SHARED_URL'],
	});
	const elsewhere = await buildWorkflowReferencingVariables({
		name: 'Elsewhere',
		project: otherProject,
		variableNames: ['SHARED_URL'],
	});
	const workflows = Container.get(WorkflowRepository);
	await workflows.update(archived.id, { isArchived: true });
	const connection = await createConnection(['promote', 'apply']);
	const service = Container.get(PromotionsService);
	await service.promote(connection.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	const baseline = await remoteHead();
	const agent = server.authAgentFor(owner);
	const endpoint = `/promotions/${project.id}/changes/promote`;
	const applyEndpoint = `/promotions/${project.id}/changes/apply`;

	const synced = await agent.get(applyEndpoint).expect(200);
	expect(synced.body.data).toEqual({ commitSha: baseline, changes: [] });

	await workflows.update(renamed.id, { name: 'Local name', settings: { executionOrder: 'v1' } });
	await workflows.update(archived.id, { isArchived: false });
	await workflows.delete(incoming.id);
	const outgoing = await createWorkflow({ name: 'Outgoing', nodes: [], connections: {} }, project);
	await Container.get(VariablesRepository).update(variable.id, {
		value: 'https://after.example.com',
	});
	await Container.get(VariablesService).updateCache();

	const response = await agent.get(applyEndpoint).expect(200);
	expect(response.body.data.commitSha).toBe(baseline);
	expect(response.body.data.changes).toHaveLength(5);
	expect(response.body.data.changes).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: renamed.id,
				name: 'Branch name',
				status: 'renamed-and-modified',
			}),
			expect.objectContaining({ id: archived.id, name: 'Archived on branch', status: 'archived' }),
			expect.objectContaining({
				id: incoming.id,
				name: 'Incoming',
				status: 'new',
				version: null,
				updatedAt: null,
			}),
			// A deleted row is a local workflow, so it keeps its name and version instead of a slug.
			expect.objectContaining({
				id: outgoing.id,
				name: 'Outgoing',
				status: 'deleted',
				version: expect.any(Number),
			}),
			expect.objectContaining({ id: dependent.id, status: 'modified', dependencyCount: 1 }),
		]),
	);
	// The branch manifest covers every project, but only this project's workflows may show.
	expect(response.body.data.changes.map(({ id }: { id: string }) => id)).not.toContain(
		elsewhere.id,
	);
	// The Promote side keeps reading the instance as the desired state.
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: renamed.id,
				name: 'Local name',
				status: 'renamed-and-modified',
			}),
			expect.objectContaining({ id: incoming.id, status: 'deleted' }),
			expect.objectContaining({ id: outgoing.id, name: 'Outgoing', status: 'new' }),
		]),
	);

	await service.promote(connection.id, owner, {
		commitMessage: 'Sync',
		canExportVariableValues: true,
	});
	const after = await agent.get(applyEndpoint).expect(200);
	expect(after.body.data).toEqual({ commitSha: await remoteHead(), changes: [] });
	expect(after.body.data.commitSha).not.toBe(baseline);
}, 30_000);

it('answers for a destination that has only an apply configuration', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Destination', owner);
	const workflow = await createWorkflow(
		{ name: 'Local only', nodes: [], connections: {} },
		project,
	);
	const connection = await createConnection(['apply']);
	const agent = server.authAgentFor(owner);
	const endpoint = `/promotions/${project.id}/changes/promote`;
	const applyEndpoint = `/promotions/${project.id}/changes/apply`;

	// The branch has no commit yet, so there is no package to read. Promote has no config here.
	const exportSpy = vi.spyOn(Container.get(N8nPackagesService), 'exportPackageToWriter');
	const empty = await agent.get(applyEndpoint).expect(400);
	expect(empty.body.message).toContain('no exported package');
	// The branch is read before the export, so an empty branch costs no project export.
	expect(exportSpy).not.toHaveBeenCalled();
	exportSpy.mockRestore();
	await agent.get(endpoint).expect(400);

	// A source instance promotes the project, then the destination is left with Apply only.
	await addConfig(connection.id, 'promote');
	const service = Container.get(PromotionsService);
	await service.clone(connection.id, 'promote');
	await service.promote(connection.id, owner, {
		commitMessage: 'From the source',
		canExportVariableValues: true,
	});
	const configs = Container.get(PromotionConfigRepository);
	const promoteConfig = await configs.findByConnectionAndDirection(connection.id, 'promote');
	await configs.delete({ id: promoteConfig?.id });
	await Container.get(WorkflowRepository).delete(workflow.id);

	const response = await agent.get(applyEndpoint).expect(200);
	expect(response.body.data).toEqual({
		commitSha: await remoteHead(),
		changes: [expect.objectContaining({ id: workflow.id, name: 'Local only', status: 'new' })],
	});
	await agent.get(endpoint).expect(400);
}, 30_000);

it('lists nothing after apply, although the destination mints its own version', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Destination', owner);
	const workflow = await createWorkflow({ name: 'Orders', nodes: [], connections: {} }, project);
	const connection = await createConnection(['promote', 'apply']);
	const service = Container.get(PromotionsService);
	const workflows = Container.get(WorkflowRepository);
	await initNodeTypes();
	// The source edits the workflow and promotes it.
	await workflows.update(workflow.id, {
		versionId: 'source-version',
		nodes: [
			{
				id: 'set',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
	});
	await service.promote(connection.id, owner, {
		commitMessage: 'Source edit',
		canExportVariableValues: true,
	});
	// The destination still runs the previous content under a version of its own.
	await workflows.update(workflow.id, { versionId: 'destination-version', nodes: [] });
	const agent = server.authAgentFor(owner);
	const endpoint = `/promotions/${project.id}/changes/apply`;
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([
		expect.objectContaining({ id: workflow.id, status: 'modified' }),
	]);

	expect((await service.apply(connection.id, owner)).status).toBe('applied');

	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([]);
	const stored = await workflows.findOneByOrFail({ id: workflow.id });
	expect(stored.nodes).toHaveLength(1);
	expect(stored.versionId).not.toBe('source-version');
}, 30_000);

it('lists every local workflow as deleted when a valid branch manifest has no entry for the project', async () => {
	const owner = await createOwner();
	const otherProject = await createTeamProject('Other', owner);
	await createWorkflow({ name: 'Elsewhere', nodes: [], connections: {} }, otherProject);
	const connection = await createConnection(['promote', 'apply']);
	await Container.get(PromotionsService).promote(connection.id, owner, {
		commitMessage: 'Without the project',
		canExportVariableValues: true,
	});
	// The project appears after the promotion, so the branch manifest does not know it.
	const project = await createTeamProject('Destination', owner);
	const workflow = await createWorkflow(
		{ name: 'Local only', nodes: [], connections: {} },
		project,
	);

	const response = await server
		.authAgentFor(owner)
		.get(`/promotions/${project.id}/changes/apply`)
		.expect(200);
	expect(response.body.data.changes).toEqual([
		expect.objectContaining({
			id: workflow.id,
			name: 'Local only',
			status: 'deleted',
			version: expect.any(Number),
			updatedAt: expect.any(String),
		}),
	]);
}, 30_000);

it('checks authentication, the scopes of each direction, and the promotions license before reading Git', async () => {
	const owner = await createOwner();
	const member = await createMember();
	const project = await createTeamProject('Private', owner);
	const endpoint = `/promotions/${project.id}/changes/promote`;
	const applyEndpoint = `/promotions/${project.id}/changes/apply`;
	await server.authlessAgent.get(endpoint).expect(401);
	await server.authAgentFor(member).get(endpoint).expect(403);
	await server.authAgentFor(member).get(applyEndpoint).expect(403);
	// A project admin can export and update the project, but lacks the global push and pull scopes.
	await linkUserToProject(member, project, 'project:admin');
	await server.authAgentFor(member).get(endpoint).expect(403);
	await server.authAgentFor(member).get(applyEndpoint).expect(403);
	await server.authAgentFor(owner).get(`/promotions/${project.id}/changes/sideways`).expect(404);
	server.license.disable('feat:gitConnections');
	await server.authAgentFor(owner).get(endpoint).expect(403);
});
