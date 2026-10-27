import { AgentJsonConfigSchema, type PromotionDirection } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	createWorkflowWithHistory,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	CredentialsRepository,
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	TagRepository,
	type User,
	VariablesRepository,
	WorkflowRepository,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Cipher, type InstanceSettings } from 'n8n-core';
import { mkdtempSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { onTestFinished, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableService } from '@/modules/data-table/data-table.service';
import {
	buildWorkflowReferencingCredential,
	buildWorkflowReferencingDataTables,
	buildWorkflowReferencingVariables,
	executeWorkflowNode,
} from '@/modules/n8n-packages/__tests__/utils/test-builders';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import { TagService } from '@/services/tag.service';
import { saveCredential } from '@test-integration/db/credentials';
import { createTag } from '@test-integration/db/tags';
import { createMember, createOwner } from '@test-integration/db/users';
import { createFolder } from '@test-integration/db/folders';
import { createVariable } from '@test-integration/db/variables';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

import { PACKAGE_SUBFOLDER } from '../constants';
import type { PromotionEnvironment } from '../database/entities/promotion-environment.entity';
import { PromotionEnvironmentProjectRepository } from '../database/repositories/promotion-environment-project.repository';
import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionChangesController } from '../promotion-changes.controller';
import { PromotionsGitService } from '../promotions-git.service';
import { PromotionsService } from '../promotions.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import { storedAgentConfig } from '@/modules/agents/__tests__/test-utils/stored-agent-config';

const instanceFolder = mkdtempSync(path.join(tmpdir(), 'promotion-preview-'));
Container.set(
	PromotionWorkingDirectoryService,
	new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder: instanceFolder })),
);
mockInstance(ActiveWorkflowManager);
beforeAll(async () => await testModules.loadModules(['agents']));
const server = setupTestServer({
	endpointGroups: ['promotions'],
	modules: ['promotions', 'n8n-packages', 'data-table'],
	enabledFeatures: ['feat:promotions', 'feat:projectRole:admin'],
});

let remoteFolder: string;

beforeEach(async () => {
	await Container.get(PromotionEnvironmentProjectRepository).delete({});
	await Container.get(AgentRepository).delete({});
	await Container.get(PromotionEnvironmentRepository).delete({});
	await Container.get(PromotionProviderRepository).delete({});
	await testDb.truncate([
		'WorkflowTagMapping',
		'TagEntity',
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
async function createInstanceEnvironments(directions: PromotionDirection[] = ['promote']) {
	const provider = await Container.get(PromotionProviderRepository).insertProvider({
		name: 'Preview',
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: await Container.get(Cipher).encryptV2(
			JSON.stringify({ schemaVersion: 1, username: 'test', password: 'test' }),
		),
	});
	const environments = {} as Record<PromotionDirection, PromotionEnvironment>;
	for (const direction of directions) {
		environments[direction] = await addEnvironment(provider.id, direction);
	}
	return environments;
}

async function addEnvironment(providerId: string, direction: PromotionDirection) {
	const environment = await Container.get(PromotionEnvironmentRepository).insertEnvironment({
		name: 'Preview',
		scope: 'instance',
		providerId,
		remote: { schemaVersion: 1, remoteUrl: remoteFolder },
		...(direction === 'promote'
			? {
					direction,
					settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
				}
			: { direction, settings: { schemaVersion: 1, branchName: 'main' } }),
	});
	await Container.get(PromotionsService).clone(environment.id);
	return environment;
}

async function remoteHead(): Promise<string> {
	return (await simpleGit(remoteFolder).revparse(['main'])).trim();
}

/** The source a preview reports for an environment created by `createInstanceEnvironments`. */
function sourceOf(environment: PromotionEnvironment) {
	return { environmentId: environment.id, branchName: 'main' };
}

it("previews against the project's environment, not the instance one", async () => {
	const owner = await createOwner();
	const linked = await createTeamProject('Linked', owner);
	const other = await createTeamProject('Other', owner);
	const instance = await createInstanceEnvironments();
	const projectPromote = await Container.get(PromotionEnvironmentRepository).insertEnvironment({
		name: 'Project',
		scope: 'projects',
		providerId: instance.promote.providerId,
		remote: { schemaVersion: 1, remoteUrl: remoteFolder },
		direction: 'promote',
		settings: { schemaVersion: 1, baseBranchName: 'production', createBranchOnPromotion: false },
	});
	await Container.get(PromotionEnvironmentProjectRepository).linkProject(
		linked.id,
		projectPromote.id,
		'promote',
	);
	await Container.get(PromotionsService).clone(projectPromote.id);
	const agent = server.authAgentFor(owner);

	const linkedPreview = await agent.get(`/promotions/${linked.id}/changes/promote`).expect(200);
	expect(linkedPreview.body.data.source).toEqual({
		environmentId: projectPromote.id,
		branchName: 'production',
	});
	const otherPreview = await agent.get(`/promotions/${other.id}/changes/promote`).expect(200);
	expect(otherPreview.body.data.source).toEqual(sourceOf(instance.promote));
}, 30_000);

it('lists new, changed, moved, archived, restored and deleted workflows through the endpoint', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Preview', owner);
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
	const otherProject = await createTeamProject('Other', owner);
	const publishable = await createWorkflowWithHistory(
		{ name: 'Publication', nodes: [], connections: {} },
		project,
	);
	const modified = await createWorkflow({ name: 'Modified', nodes: [], connections: {} }, project);
	const archived = await createWorkflow({ name: 'Archived', nodes: [], connections: {} }, project);
	const removed = await createWorkflow({ name: 'Removed', nodes: [], connections: {} }, project);
	const environments = await createInstanceEnvironments();
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
	await service.promote(environments.promote.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	expect((await agent.get(endpoint).expect(200)).body.data).toMatchObject({
		commitSha: await remoteHead(),
		source: sourceOf(environments.promote),
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

	await service.promote(environments.promote.id, owner, {
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
	const movedOutPreview = (await agent.get(endpoint).expect(200)).body.data;
	// Promote refuses a workflow that moved to another project, so the preview names that project.
	expect(movedOutPreview.resources).toContainEqual(
		expect.objectContaining({
			key: `workflow:${modified.id}`,
			change: 'deleted',
			movedToProject: { id: otherProject.id, name: otherProject.name },
		}),
	);
	// The other side of the same move: the branch still holds the workflow in the first project.
	const movedInPreview = (
		await agent.get(`/promotions/${otherProject.id}/changes/promote`).expect(200)
	).body.data;
	expect(movedInPreview.resources).toContainEqual(
		expect.objectContaining({
			key: `workflow:${modified.id}`,
			change: 'added',
			movedFromProject: { id: project.id, name: project.name },
		}),
	);
	// A personal project's name holds its owner's email, so the preview leaves it out.
	const personal = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id);
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: modified.id, role: 'workflow:owner' },
		{ projectId: personal.id },
	);
	expect((await agent.get(endpoint).expect(200)).body.data.resources).toContainEqual(
		expect.objectContaining({
			key: `workflow:${modified.id}`,
			movedToProject: { id: personal.id },
		}),
	);
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: modified.id, role: 'workflow:owner' },
		{ projectId: otherProject.id },
	);
	const movedOut = movedOutPreview.changes;
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

it('marks a workflow that moved into a project that has no files on the branch yet', async () => {
	const owner = await createOwner();
	const billing = await createTeamProject('Billing', owner);
	const workflow = await createWorkflow({ name: 'Invoices', nodes: [], connections: {} }, billing);
	const environments = await createInstanceEnvironments();
	await Container.get(PromotionsService).promote(environments.promote.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	// Created after the promote, so the branch holds nothing for it.
	const later = await createTeamProject('Later', owner);
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: workflow.id, role: 'workflow:owner' },
		{ projectId: later.id },
	);
	const branch = await Container.get(PromotionsService).readBranchPackage(later.id, 'promote');
	expect(branch.files).toEqual([]);
	expect(branch.hasManifest).toBe(true);

	const preview = (
		await server.authAgentFor(owner).get(`/promotions/${later.id}/changes/promote`).expect(200)
	).body.data;

	expect(preview.resources).toContainEqual(
		expect.objectContaining({
			key: `workflow:${workflow.id}`,
			change: 'added',
			movedFromProject: { id: billing.id, name: billing.name },
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
	const environments = await createInstanceEnvironments();
	await Container.get(PromotionsService).promote(environments.promote.id, owner, {
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
	const environments = await createInstanceEnvironments();
	const service = Container.get(PromotionsService);
	await service.promote(environments.promote.id, owner, {
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
	const environments = await createInstanceEnvironments();
	await Container.get(PromotionsService).promote(environments.promote.id, owner, {
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
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([]);
	// The workflow falls back to the global variable.
	await variables.delete(scoped.id);
	await Container.get(VariablesService).updateCache();
	await tables.addColumn(table.id, project.id, { name: 'total', type: 'number' });
	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([
		expect.objectContaining({ id: withTable.id, status: 'modified', dependencyCount: 1 }),
		expect.objectContaining({ id: withVariable.id, status: 'modified', dependencyCount: 1 }),
	]);
	await Container.get(PromotionsService).promote(environments.promote.id, owner, {
		commitMessage: 'Dependencies',
		canExportVariableValues: true,
	});
	await variables.delete(global.id);
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
	const environments = await createInstanceEnvironments(['promote', 'apply']);
	const service = Container.get(PromotionsService);
	await service.promote(environments.promote.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	const baseline = await remoteHead();
	const agent = server.authAgentFor(owner);
	const endpoint = `/promotions/${project.id}/changes/promote`;
	const applyEndpoint = `/promotions/${project.id}/changes/apply`;

	const synced = await agent.get(applyEndpoint).expect(200);
	expect(synced.body.data).toMatchObject({
		commitSha: baseline,
		source: sourceOf(environments.apply),
		changes: [],
	});

	await workflows.update(renamed.id, { name: 'Local name', settings: { executionOrder: 'v1' } });
	await workflows.update(archived.id, { isArchived: false });
	await workflows.delete(incoming.id);
	const outgoing = await createWorkflow({ name: 'Outgoing', nodes: [], connections: {} }, project);
	await Container.get(VariablesRepository).delete(variable.id);
	await Container.get(VariablesService).updateCache();

	const readFromGit = vi.spyOn(Container.get(PromotionsGitService), 'readFilesAtCommit');
	const response = await agent.get(applyEndpoint).expect(200);
	expect(response.body.data.commitSha).toBe(baseline);
	expect(readFromGit.mock.calls.flatMap(([{ filePaths }]) => filePaths)).toEqual([
		`${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`,
	]);
	readFromGit.mockRestore();
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

	await service.promote(environments.promote.id, owner, {
		commitMessage: 'Sync',
		canExportVariableValues: true,
	});
	const after = await agent.get(applyEndpoint).expect(200);
	expect(after.body.data).toMatchObject({
		commitSha: await remoteHead(),
		source: sourceOf(environments.apply),
		changes: [],
	});
	expect(after.body.data.commitSha).not.toBe(baseline);
}, 30_000);

it('counts a variable on apply only when this instance lacks it in the scope of the branch', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Destination', owner);
	const promoted = await createVariable('API_URL', 'https://source.example.com');
	await Container.get(VariablesService).updateCache();
	const dependent = await buildWorkflowReferencingVariables({
		name: 'Dependent',
		project,
		variableNames: ['API_URL'],
	});
	const environments = await createInstanceEnvironments(['promote', 'apply']);
	await Container.get(PromotionsService).promote(environments.promote.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});
	const agent = server.authAgentFor(owner);
	const applyEndpoint = `/promotions/${project.id}/changes/apply`;
	const variables = Container.get(VariablesRepository);

	// A binding creates the variable with a new ID and the destination's own value.
	await variables.delete(promoted.id);
	const bound = await createVariable('API_URL', 'https://destination.example.com');
	await Container.get(VariablesService).updateCache();
	expect((await agent.get(applyEndpoint).expect(200)).body.data.changes).toEqual([]);

	// A project variable that shadows the global one leaves the global out of this instance export.
	await variables.save({
		id: 'ProjectUrl',
		key: 'API_URL',
		value: 'https://project.example.com',
		project,
	});
	await Container.get(VariablesService).updateCache();
	expect((await agent.get(applyEndpoint).expect(200)).body.data.changes).toEqual([]);

	await variables.delete(bound.id);
	await Container.get(VariablesService).updateCache();
	expect((await agent.get(applyEndpoint).expect(200)).body.data.changes).toEqual([
		expect.objectContaining({ id: dependent.id, status: 'modified', dependencyCount: 1 }),
	]);
}, 30_000);

it('answers for a destination that has only an apply environment', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Destination', owner);
	const workflow = await createWorkflow(
		{ name: 'Local only', nodes: [], connections: {} },
		project,
	);
	const environments = await createInstanceEnvironments(['apply']);
	const agent = server.authAgentFor(owner);
	const endpoint = `/promotions/${project.id}/changes/promote`;
	const applyEndpoint = `/promotions/${project.id}/changes/apply`;

	// The branch has no commit yet, so there is no package to read. Promote has no environment here.
	const exportSpy = vi.spyOn(Container.get(N8nPackagesService), 'exportPackageToWriter');
	const empty = await agent.get(applyEndpoint).expect(400);
	expect(empty.body.message).toContain('no exported package');
	// The branch is read before the export, so an empty branch costs no project export.
	expect(exportSpy).not.toHaveBeenCalled();
	exportSpy.mockRestore();
	await agent.get(endpoint).expect(404);

	// A source instance promotes the project, then the destination is left with Apply only.
	const promote = await addEnvironment(environments.apply.providerId, 'promote');
	const service = Container.get(PromotionsService);
	await service.promote(promote.id, owner, {
		commitMessage: 'From the source',
		canExportVariableValues: true,
	});
	await Container.get(PromotionEnvironmentRepository).delete({ id: promote.id });
	await Container.get(WorkflowRepository).delete(workflow.id);

	const response = await agent.get(applyEndpoint).expect(200);
	expect(response.body.data).toMatchObject({
		commitSha: await remoteHead(),
		source: sourceOf(environments.apply),
		changes: [expect.objectContaining({ id: workflow.id, name: 'Local only', status: 'new' })],
	});
	await agent.get(endpoint).expect(404);
}, 30_000);

it('lists nothing after apply, although the destination mints its own version', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Destination', owner);
	const workflow = await createWorkflow({ name: 'Orders', nodes: [], connections: {} }, project);
	const environments = await createInstanceEnvironments(['promote', 'apply']);
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
	await service.promote(environments.promote.id, owner, {
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

	expect((await service.apply(environments.apply.id, owner)).status).toBe('applied');

	expect((await agent.get(endpoint).expect(200)).body.data.changes).toEqual([]);
	const stored = await workflows.findOneByOrFail({ id: workflow.id });
	expect(stored.nodes).toHaveLength(1);
	expect(stored.versionId).not.toBe('source-version');
}, 30_000);

it('lists every local workflow as deleted when a valid branch manifest has no entry for the project', async () => {
	const owner = await createOwner();
	const otherProject = await createTeamProject('Other', owner);
	await createWorkflow({ name: 'Elsewhere', nodes: [], connections: {} }, otherProject);
	const environments = await createInstanceEnvironments(['promote', 'apply']);
	await Container.get(PromotionsService).promote(environments.promote.id, owner, {
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
	const blockersEndpoint = `${applyEndpoint}/blockers?commitSha=${'0'.repeat(40)}`;
	await server.authlessAgent.get(endpoint).expect(401);
	await server.authlessAgent.get(blockersEndpoint).expect(401);
	await server.authAgentFor(member).get(endpoint).expect(403);
	await server.authAgentFor(member).get(applyEndpoint).expect(403);
	await server.authAgentFor(member).get(blockersEndpoint).expect(403);
	// A project admin manages the project, but lacks the global promotion scopes.
	await linkUserToProject(member, project, 'project:admin');
	await server.authAgentFor(member).get(endpoint).expect(403);
	await server.authAgentFor(member).get(applyEndpoint).expect(403);
	await server.authAgentFor(member).get(blockersEndpoint).expect(403);
	await server.authAgentFor(owner).get(`/promotions/${project.id}/changes/sideways`).expect(404);
	server.license.disable('feat:promotions');
	await server.authAgentFor(owner).get(endpoint).expect(403);
	await server.authAgentFor(owner).get(blockersEndpoint).expect(403);
});

// No built-in role has the read scope without the apply scope, so the requests above cannot tell them apart.
it('requires the global apply scope for the Apply check', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		PromotionChangesController as Controller,
	);

	expect(metadata.routes.get('getApplyBlockers')?.accessScope).toEqual({
		scope: 'promotions:apply',
		globalOnly: true,
	});
});

it('checks Apply blockers at the commit of the Apply preview, also after a newer push', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Orders', owner);
	const firstVariable = await createVariable('FIRST_URL', 'https://first.example.com');
	await buildWorkflowReferencingVariables({
		name: 'Uses FIRST_URL',
		project,
		variableNames: [firstVariable.key],
	});
	const environments = await createInstanceEnvironments(['promote', 'apply']);
	const service = Container.get(PromotionsService);
	await service.promote(environments.promote.id, owner, {
		commitMessage: 'First',
		canExportVariableValues: true,
	});
	const agent = server.authAgentFor(owner);
	const preview = await agent.get(`/promotions/${project.id}/changes/apply`).expect(200);
	const { commitSha } = preview.body.data;

	const secondVariable = await createVariable('SECOND_URL', 'https://second.example.com');
	await buildWorkflowReferencingVariables({
		name: 'Uses SECOND_URL',
		project,
		variableNames: [secondVariable.key],
	});
	await service.promote(environments.promote.id, owner, {
		commitMessage: 'Second',
		canExportVariableValues: true,
	});
	await Container.get(VariablesRepository).delete([firstVariable.id, secondVariable.id]);
	await Container.get(VariablesService).updateCache();

	const response = await agent
		.get(`/promotions/${project.id}/changes/apply/blockers`)
		.query({ commitSha })
		.expect(200);

	expect(response.body.data.git.commitSha).toBe(commitSha);
	expect(response.body.data.preflight.missingBindings).toEqual([
		expect.objectContaining({ kind: 'variable', name: 'FIRST_URL' }),
	]);
}, 30_000);

describe('resources in the preview', () => {
	const promoteBaseline = async (environmentId: string, owner: User) =>
		await Container.get(PromotionsService).promote(environmentId, owner, {
			commitMessage: 'Baseline',
			canExportVariableValues: true,
		});

	it('lists a renamed nested folder with the workflows that carry the rename, unchanged themselves', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Reports', owner);
		const reports = await createFolder(project, { name: 'Reports' });
		const weekly = await createFolder(project, { name: 'Weekly', parentFolder: reports });
		const workflow = await createWorkflow(
			{ name: 'Weekly report', nodes: [], connections: {}, parentFolder: weekly },
			project,
		);
		const environments = await createInstanceEnvironments();
		await promoteBaseline(environments.promote.id, owner);
		await Container.get(FolderRepository).update(weekly.id, { name: 'Monthly' });

		const { body } = await server
			.authAgentFor(owner)
			.get(`/promotions/${project.id}/changes/promote`)
			.expect(200);

		// Promote writes a folder rename only together with a selected workflow inside the folder.
		expect(body.data.resources).toEqual([
			expect.objectContaining({ key: `project:${project.id}`, change: 'unchanged' }),
			expect.objectContaining({
				key: `folder:${weekly.id}`,
				name: 'Monthly',
				previousName: 'Weekly',
				parentKey: `folder:${reports.id}`,
				change: 'modified',
				selectable: false,
			}),
			expect.objectContaining({
				key: `folder:${reports.id}`,
				parentKey: `project:${project.id}`,
				change: 'unchanged',
			}),
			expect.objectContaining({
				key: `workflow:${workflow.id}`,
				parentKey: `folder:${weekly.id}`,
				change: 'unchanged',
				selectable: true,
			}),
		]);
	}, 30_000);

	it('lists a changed data table once, with each workflow that uses it, and describes the new column', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Orders', owner);
		const tables = Container.get(DataTableService);
		const table = await tables.createDataTable(project.id, {
			name: 'Orders',
			columns: [{ name: 'customer', type: 'string' }],
		});
		const importing = await buildWorkflowReferencingDataTables({
			name: 'Import orders',
			project,
			references: [{ dataTableId: table.id }],
		});
		const shipping = await buildWorkflowReferencingDataTables({
			name: 'Ship orders',
			project,
			references: [{ dataTableId: table.id }],
		});
		const environments = await createInstanceEnvironments();
		await promoteBaseline(environments.promote.id, owner);
		await tables.addColumn(table.id, project.id, { name: 'total', type: 'number' });
		const agent = server.authAgentFor(owner);

		const { body } = await agent.get(`/promotions/${project.id}/changes/promote`).expect(200);

		const tableKey = `dataTable:${table.id}`;
		expect(body.data.resources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ key: tableKey, change: 'modified' }),
				expect.objectContaining({
					key: `workflow:${importing.id}`,
					change: 'unchanged',
					selectable: true,
				}),
				expect.objectContaining({
					key: `workflow:${shipping.id}`,
					change: 'unchanged',
					selectable: true,
				}),
			]),
		);
		expect(body.data.resources.filter(({ key }: { key: string }) => key === tableKey)).toHaveLength(
			1,
		);
		expect(body.data.dependencies).toEqual(
			expect.arrayContaining([
				{ workflowKey: `workflow:${importing.id}`, resourceKey: tableKey, included: true },
				{ workflowKey: `workflow:${shipping.id}`, resourceKey: tableKey, included: true },
			]),
		);

		const details = await agent
			.post(`/promotions/${project.id}/changes/promote/details`)
			.send({ commitSha: body.data.commitSha, keys: [tableKey] })
			.expect(200);
		expect(details.body.data.details).toEqual([
			expect.objectContaining({
				key: tableKey,
				type: 'dataTable',
				dataTableChanges: [expect.objectContaining({ kind: 'add-column', column: 'total' })],
			}),
		]);
		// The preview shows the table schema only. Rows never travel with a promotion.
		expect(details.body.data.details[0].after).not.toHaveProperty('rows');
	}, 30_000);

	it('lists sub-workflows as references that the operation does not carry, with their own dependencies', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Escalations', owner);
		const table = await Container.get(DataTableService).createDataTable(project.id, {
			name: 'Contacts',
			columns: [{ name: 'email', type: 'string' }],
		});
		const notify = await buildWorkflowReferencingDataTables({
			name: 'Notify',
			project,
			references: [{ dataTableId: table.id }],
		});
		const escalate = await createWorkflow(
			{ name: 'Escalate', nodes: [executeWorkflowNode(notify.id)], connections: {} },
			project,
		);
		const environments = await createInstanceEnvironments();
		await promoteBaseline(environments.promote.id, owner);
		// The new error workflow no longer exists, so neither side holds it. The reference still shows.
		await Container.get(WorkflowRepository).update(escalate.id, {
			settings: { errorWorkflow: 'DeletedErrorFlow' },
		});

		const { body } = await server
			.authAgentFor(owner)
			.get(`/promotions/${project.id}/changes/promote`)
			.expect(200);

		expect(body.data.resources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ key: `workflow:${escalate.id}`, change: 'modified' }),
				expect.objectContaining({ key: `workflow:${notify.id}`, change: 'unchanged' }),
				expect.objectContaining({ key: `dataTable:${table.id}`, change: 'unchanged' }),
				expect.objectContaining({
					key: 'workflow:DeletedErrorFlow',
					selectable: false,
					revision: { before: null, after: null },
				}),
			]),
		);
		expect(body.data.dependencies).toEqual(
			expect.arrayContaining([
				{
					workflowKey: `workflow:${escalate.id}`,
					resourceKey: `workflow:${notify.id}`,
					included: false,
				},
				{
					workflowKey: `workflow:${escalate.id}`,
					resourceKey: 'workflow:DeletedErrorFlow',
					included: false,
				},
				{
					workflowKey: `workflow:${notify.id}`,
					resourceKey: `dataTable:${table.id}`,
					included: true,
				},
			]),
		);
	}, 30_000);

	it('leaves out changes that Apply does not make and reuses a credential that already exists', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Billing', owner);
		const folder = await createFolder(project, { name: 'Invoices' });
		await createWorkflow(
			{ name: 'Send invoices', nodes: [], connections: {}, parentFolder: folder },
			project,
		);
		const credential = await saveCredential(
			{ name: 'Billing API', type: 'httpHeaderAuth', data: {} },
			{ project, role: 'credential:owner' },
		);
		const charge = await buildWorkflowReferencingCredential({
			name: 'Charge customers',
			project,
			credential,
		});
		const environments = await createInstanceEnvironments(['promote', 'apply']);
		await promoteBaseline(environments.promote.id, owner);
		// Apply keeps the local credential name, but gives the folder the name on the branch. The
		// credential stays, but no local workflow uses it, so the local export does not hold it.
		await Container.get(FolderRepository).update(folder.id, { name: 'Local invoices' });
		await Container.get(CredentialsRepository).update(credential.id, { name: 'Local billing API' });
		await Container.get(WorkflowRepository).delete(charge.id);

		const { body } = await server
			.authAgentFor(owner)
			.get(`/promotions/${project.id}/changes/apply`)
			.expect(200);

		expect(body.data.resources).toEqual([
			expect.objectContaining({ key: `project:${project.id}`, change: 'unchanged' }),
			expect.objectContaining({
				key: `folder:${folder.id}`,
				name: 'Invoices',
				previousName: 'Local invoices',
				change: 'modified',
			}),
			expect.objectContaining({ key: `workflow:${charge.id}`, change: 'added' }),
			expect.objectContaining({
				key: `credential:${credential.id}`,
				name: 'Local billing API',
				change: 'unchanged',
			}),
		]);
	}, 30_000);

	it.each([
		{
			drift: 'a renamed local tag',
			changeLocalTag: async (tagId: string) =>
				await Container.get(TagRepository).update(tagId, { name: 'released' }),
			expected: { previousName: 'released' },
			local: { name: 'released' },
		},
		{
			drift: 'a renamed local tag that no local workflow uses',
			changeLocalTag: async (tagId: string) => {
				await Container.get(TagRepository).update(tagId, { name: 'released' });
				await Container.get(WorkflowTagMappingRepository).delete({ tagId });
			},
			expected: { previousName: 'released' },
			local: { name: 'released' },
		},
		{
			drift: 'a local tag with the same name and another id',
			changeLocalTag: async (tagId: string) =>
				await Container.get(TagService).reconcileTagId(tagId, 'localTagId'),
			expected: { previousId: 'localTagId' },
			local: { id: 'localTagId', name: 'release' },
		},
	])(
		'lists and details the tag change that Apply makes for $drift',
		async ({ changeLocalTag, expected, local }) => {
			const owner = await createOwner();
			const project = await createTeamProject('Releases', owner);
			const workflow = await createWorkflow({ name: 'Ship', nodes: [], connections: {} }, project);
			const tag = await createTag({ name: 'release' }, workflow);
			const environments = await createInstanceEnvironments(['promote', 'apply']);
			await promoteBaseline(environments.promote.id, owner);
			await changeLocalTag(tag.id);

			const agent = server.authAgentFor(owner);
			const endpoint = `/promotions/${project.id}/changes/apply`;
			const summary = (await agent.get(endpoint).expect(200)).body.data;
			const key = `tag:${tag.id}`;
			const resource = summary.resources.find(
				(candidate: { key: string }) => candidate.key === key,
			);
			const { body } = await agent
				.post(`${endpoint}/details`)
				.send({ commitSha: summary.commitSha, keys: [key] })
				.expect(200);

			expect(resource).toEqual(
				expect.objectContaining({ name: 'release', change: 'modified', ...expected }),
			);
			// The card shows the local tag, with the revision of the summary, so it is not stale.
			expect(body.data.details).toEqual([
				expect.objectContaining({
					before: expect.objectContaining(local),
					after: expect.objectContaining({ id: tag.id, name: 'release' }),
					revision: resource.revision,
				}),
			]);
		},
		30_000,
	);

	it('returns both sides of a changed workflow from the reviewed commit and reports later local changes', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Finance', owner);
		const workflow = await createWorkflow({ name: 'Invoice', nodes: [], connections: {} }, project);
		const environments = await createInstanceEnvironments();
		await promoteBaseline(environments.promote.id, owner);
		const workflows = Container.get(WorkflowRepository);
		await workflows.update(workflow.id, { name: 'Invoice v2' });
		const draft = await createWorkflow({ name: 'Draft', nodes: [], connections: {} }, project);
		const agent = server.authAgentFor(owner);
		const endpoint = `/promotions/${project.id}/changes/promote`;
		const key = `workflow:${workflow.id}`;
		const summary = (await agent.get(endpoint).expect(200)).body.data;
		const { revision } = summary.resources.find(
			(resource: { key: string }) => resource.key === key,
		);
		const loadDetail = async () =>
			(
				await agent
					.post(`${endpoint}/details`)
					.send({ commitSha: summary.commitSha, keys: [key] })
					.expect(200)
			).body.data.details[0];

		expect(await loadDetail()).toEqual(
			expect.objectContaining({
				before: expect.objectContaining({ name: 'Invoice' }),
				after: expect.objectContaining({ name: 'Invoice v2' }),
				revision,
			}),
		);

		// A local edit after the summary changes the local blob SHA, so the card can ask for a refresh.
		await workflows.update(workflow.id, { name: 'Invoice v3' });
		// The draft was never promoted, so after its deletion neither side holds it.
		await workflows.delete(draft.id);
		await Container.get(PromotionsService).promote(environments.promote.id, owner, {
			commitMessage: 'Moves the branch',
			canExportVariableValues: true,
		});
		const later = await loadDetail();
		expect(later.revision.after).not.toBe(revision.after);
		// The branch moved, but the detail still reads the reviewed commit.
		expect(later.revision.before).toBe(revision.before);
		expect(later.before).toEqual(expect.objectContaining({ name: 'Invoice' }));

		const draftKey = `workflow:${draft.id}`;
		const { body } = await agent
			.post(`${endpoint}/details`)
			.send({ commitSha: summary.commitSha, keys: [key, draftKey] })
			.expect(200);
		expect(body.data.details).toEqual([expect.objectContaining({ key })]);
		expect(body.data.missingKeys).toEqual([draftKey]);
	}, 30_000);

	it('returns both sides of a project whose id has a colon', async () => {
		const owner = await createOwner();
		const projects = Container.get(ProjectRepository);
		const project = await projects.save(
			projects.create({ id: 'Finance:EU', name: 'Finance', type: 'team', creatorId: owner.id }),
		);
		await linkUserToProject(owner, project, 'project:admin');
		await createWorkflow({ name: 'Invoice', nodes: [], connections: {} }, project);
		const environments = await createInstanceEnvironments();
		await promoteBaseline(environments.promote.id, owner);
		await projects.update(project.id, { name: 'Finance EU' });
		const agent = server.authAgentFor(owner);
		const endpoint = `/promotions/${project.id}/changes/promote`;
		const key = `project:${project.id}`;
		const summary = (await agent.get(endpoint).expect(200)).body.data;

		const { body } = await agent
			.post(`${endpoint}/details`)
			.send({ commitSha: summary.commitSha, keys: [key] })
			.expect(200);

		expect(body.data.details).toEqual([
			expect.objectContaining({
				key,
				before: expect.objectContaining({ name: 'Finance' }),
				after: expect.objectContaining({ name: 'Finance EU' }),
			}),
		]);
		expect(body.data.missingKeys).toEqual([]);
	}, 30_000);

	it('loads details before the first promotion when the repository holds only a README', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('New team', owner);
		const workflow = await createWorkflow({ name: 'Invoice', nodes: [], connections: {} }, project);
		const seed = await mkdtemp(path.join(tmpdir(), 'promotion-preview-seed-'));
		onTestFinished(async () => await rm(seed, { recursive: true, force: true }));
		const git = simpleGit(seed);
		await git.init();
		await git.addConfig('user.email', 'test@example.com').addConfig('user.name', 'Test');
		await writeFile(path.join(seed, 'README.md'), '# Workflows\n');
		await git.add('README.md').commit('Add README');
		await git.push(remoteFolder, 'HEAD:main');
		await createInstanceEnvironments();
		const agent = server.authAgentFor(owner);
		const endpoint = `/promotions/${project.id}/changes/promote`;
		const summary = (await agent.get(endpoint).expect(200)).body.data;
		expect(summary.commitSha).toEqual(expect.any(String));

		const { body } = await agent
			.post(`${endpoint}/details`)
			.send({ commitSha: summary.commitSha, keys: [`workflow:${workflow.id}`] })
			.expect(200);

		expect(body.data.details).toEqual([
			expect.objectContaining({
				before: null,
				after: expect.objectContaining({ name: 'Invoice' }),
			}),
		]);
	}, 30_000);
});
