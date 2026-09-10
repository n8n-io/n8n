import {
	createTeamProject,
	createWorkflow,
	createWorkflowWithHistory,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { SharedWorkflowRepository, VariablesRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher, type InstanceSettings } from 'n8n-core';
import { mkdtempSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableService } from '@/modules/data-table/data-table.service';
import {
	buildWorkflowReferencingDataTables,
	buildWorkflowReferencingVariables,
} from '@/modules/n8n-packages/__tests__/utils/test-builders';
import { createMember, createOwner } from '@test-integration/db/users';
import { createVariable } from '@test-integration/db/variables';
import { setupTestServer } from '@test-integration/utils';

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

async function createConnection() {
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
	await Container.get(PromotionConfigRepository).insertConfig({
		connectionId: connection.id,
		direction: 'promote',
		name: 'Promote',
		settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
	});
	const service = Container.get(PromotionsService);
	await service.clone(connection.id, 'promote');
	return connection;
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
	const endpoint = `/promotions/${project.id}/changes`;
	const agent = server.authAgentFor(owner);
	const initial = await agent.get(endpoint).expect(200);
	expect(initial.body.data).toHaveLength(4);
	expect(initial.body.data).toEqual(
		expect.arrayContaining([expect.objectContaining({ id: modified.id, status: 'new' })]),
	);
	await service.promote(connection.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual([]);

	const workflows = Container.get(WorkflowRepository);
	await workflows.update(publishable.id, { activeVersionId: publishable.versionId });
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual([
		expect.objectContaining({ id: publishable.id, status: 'modified' }),
	]);
	await workflows.update(publishable.id, { activeVersionId: null });
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual([]);
	await workflows.update(modified.id, { name: 'Renamed', settings: { executionOrder: 'v1' } });
	await workflows.update(archived.id, { isArchived: true });
	await workflows.delete(removed.id);
	const created = await createWorkflow({ name: 'New', nodes: [], connections: {} }, project);
	await createWorkflow({ name: 'Not in preview', nodes: [], connections: {} }, otherProject);

	const response = await agent.get(endpoint).expect(200);
	expect(response.body.data).toHaveLength(4);
	expect(response.body.data).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ id: modified.id, name: 'Renamed', status: 'modified' }),
			expect.objectContaining({ id: archived.id, status: 'archived' }),
			expect.objectContaining({
				id: removed.id,
				status: 'deleted',
				version: null,
				updatedAt: null,
			}),
			expect.objectContaining({ id: created.id, name: 'New', status: 'new' }),
		]),
	);
	expect(
		(await agent.get(endpoint).query({ search: 'renamed' }).expect(200)).body.data,
	).toHaveLength(1);
	await agent.get(endpoint).query({ order: 'invalid' }).expect(400);

	await service.promote(connection.id, owner, {
		commitMessage: 'Changes',
		canExportVariableValues: true,
	});
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual([]);
	await workflows.update(archived.id, { isArchived: false });
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual([
		expect.objectContaining({ id: archived.id, status: 'modified' }),
	]);
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: modified.id, role: 'workflow:owner' },
		{ projectId: otherProject.id },
	);
	const movedOut = await agent.get(endpoint).expect(400);
	expect(movedOut.body.message).toContain('moved out of this project');
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
	const endpoint = `/promotions/${project.id}/changes`;
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual([]);
	await variables.update(global.id, { value: 'changed global' });
	await Container.get(VariablesService).updateCache();
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual([]);
	await variables.update(scoped.id, { value: 'changed project' });
	await Container.get(VariablesService).updateCache();
	await tables.addColumn(table.id, project.id, { name: 'total', type: 'number' });
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual([
		expect.objectContaining({ id: withTable.id, status: 'modified', dependencyCount: 1 }),
		expect.objectContaining({ id: withVariable.id, status: 'modified', dependencyCount: 1 }),
	]);
	await Container.get(PromotionsService).promote(connection.id, owner, {
		commitMessage: 'Dependencies',
		canExportVariableValues: true,
	});
	await variables.delete([scoped.id, global.id]);
	await Container.get(VariablesService).updateCache();
	expect((await agent.get(endpoint).expect(200)).body.data).toEqual([
		expect.objectContaining({ id: withVariable.id, status: 'modified', dependencyCount: 1 }),
	]);
}, 30_000);

it('checks authentication, project export, and the promotions license before reading Git', async () => {
	const owner = await createOwner();
	const member = await createMember();
	const project = await createTeamProject('Private', owner);
	const endpoint = `/promotions/${project.id}/changes`;
	await server.authlessAgent.get(endpoint).expect(401);
	await server.authAgentFor(member).get(endpoint).expect(403);
	await linkUserToProject(member, project, 'project:admin');
	await server.authAgentFor(member).get(endpoint).expect(403);
	server.license.disable('feat:gitConnections');
	await server.authAgentFor(owner).get(endpoint).expect(403);
});
