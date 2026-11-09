import {
	AgentJsonConfigSchema,
	type PromotionDirection,
	type PromotionResource,
} from '@n8n/api-types';
import {
	createTeamProject,
	createWorkflow,
	createWorkflowWithHistory,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
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
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { mkdtempSync } from 'node:fs';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { mockDataTableSizeValidator } from '@n8n/backend-module-data-table/testing';
import { DataTableService } from '@n8n/backend-module-data-table';
import {
	buildWorkflowReferencingCredential,
	buildWorkflowReferencingDataTables,
	buildWorkflowReferencingVariables,
	executeWorkflowNode,
} from '@/modules/n8n-packages/__tests__/utils/test-builders';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { TagService } from '@/services/tag.service';
import { saveCredential } from '@test-integration/db/credentials';
import { createTag } from '@test-integration/db/tags';
import { createMember, createOwner } from '@test-integration/db/users';
import { createFolder } from '@test-integration/db/folders';
import { createVariable } from '@test-integration/db/variables';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

import type { PromotionEnvironment } from '../database/entities/promotion-environment.entity';
import { PromotionEnvironmentProjectRepository } from '../database/repositories/promotion-environment-project.repository';
import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionsService } from '../promotions.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import { storedAgentConfig } from '@/modules/agents/__tests__/test-utils/stored-agent-config';
import { createFixtureGit } from './utils/git-remote-fixture';
import { insertTokenProvider, writeInstancePromotionPackage } from './utils/promotion-fixtures';

const instanceFolder = mkdtempSync(path.join(tmpdir(), 'promotion-preview-'));
const emptyRemoteSeed = path.join(instanceFolder, 'empty-remote.git');
Container.set(
	PromotionWorkingDirectoryService,
	new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder: instanceFolder })),
);
mockInstance(ActiveWorkflowManager);
// The Apply preview plans the import, which checks node and credential types.
mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
beforeAll(async () => {
	await testModules.loadModules(['agents']);
	await initNodeTypes();
});
const server = setupTestServer({
	reuseServer: true,
	endpointGroups: ['publicApi'],
	modules: ['promotions', 'n8n-packages', 'data-table'],
	enabledFeatures: ['feat:promotions', 'feat:projectRole:admin', 'feat:folders'],
});

let remoteRoot: string;
let remoteFolder: string;
let sourceFixture: ReturnType<typeof createSourceFixture> | undefined;

beforeAll(async () => {
	await createFixtureGit().raw(['init', '--bare', '--initial-branch=main', emptyRemoteSeed]);
});

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
	remoteRoot = await mkdtemp(path.join(tmpdir(), 'promotion-preview-remote-'));
	remoteFolder = path.join(remoteRoot, 'remote.git');
	await cp(emptyRemoteSeed, remoteFolder, { recursive: true });
	sourceFixture = undefined;
});

afterEach(async () => {
	await rm(remoteRoot, { recursive: true, force: true });
});

afterAll(async () => {
	await rm(instanceFolder, { recursive: true, force: true });
});

/** Both directions point at `main` of the same remote, so one instance can play source and destination. */
async function createInstanceEnvironments(directions: PromotionDirection[] = ['promote']) {
	const provider = await insertTokenProvider({ name: 'Preview' });
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
	await Container.get(PromotionsService).clone(environment.id, { id: 'clone-actor' } as User);
	return environment;
}

async function remoteHead(): Promise<string> {
	return (await createFixtureGit(remoteFolder).revparse(['main'])).trim();
}

const fixtureGitConfig = ['user.name=n8n test', 'user.email=n8n-test@example.com'];

async function createSourceFixture() {
	const dir = path.join(remoteRoot, 'source');
	await createFixtureGit().clone(remoteFolder, dir);
	return { dir, git: createFixtureGit(dir, { config: fixtureGitConfig }) };
}

/** Builds branch data for preview checks. Roundtrip tests still run Promote. */
async function exportPreviewBaseline(environment: PromotionEnvironment, owner: User) {
	const checkout =
		environment.direction === 'promote'
			? Container.get(PromotionWorkingDirectoryService).paths(environment.id).repositoryFolder
			: undefined;
	const source = checkout
		? { dir: checkout, git: createFixtureGit(checkout, { config: fixtureGitConfig }) }
		: await (sourceFixture ??= createSourceFixture());
	await writeInstancePromotionPackage(owner, path.join(source.dir, 'n8n'));
	await source.git.add('--all');
	await source.git.commit('Preview fixture');
	await source.git.push('origin', 'HEAD:refs/heads/main');
}

/** The source a preview reports for an environment created by `createInstanceEnvironments`. */
function sourceOf(environment: PromotionEnvironment) {
	return { environmentId: environment.id, branchName: 'main' };
}

/** The resources that the operation changes. Unchanged resources only give context. */
function changedResources({ resources }: { resources: PromotionResource[] }) {
	return resources.filter(({ change }) => change !== 'unchanged');
}

function changedWorkflows(preview: { resources: PromotionResource[] }) {
	return changedResources(preview).filter(({ type }) => type === 'workflow');
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
	await Container.get(PromotionsService).clone(projectPromote.id, owner);
	const agent = server.publicApiAgentWithCookie(owner);

	const linkedPreview = await agent
		.get(`/promotions/projects/${linked.id}/changes/promote`)
		.expect(200);
	expect(linkedPreview.body.source).toEqual({
		environmentId: projectPromote.id,
		branchName: 'production',
	});
	const otherPreview = await agent
		.get(`/promotions/projects/${other.id}/changes/promote`)
		.expect(200);
	expect(otherPreview.body.source).toEqual(sourceOf(instance.promote));
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
	const endpoint = `/promotions/projects/${project.id}/changes/promote`;
	const agent = server.publicApiAgentWithCookie(owner);
	const initial = await agent.get(endpoint).expect(200);
	// The branch has no commit yet, so there is no commit to pin.
	expect(initial.body.commitSha).toBeNull();
	expect(changedWorkflows(initial.body)).toHaveLength(4);
	expect(changedWorkflows(initial.body)).toContainEqual(
		expect.objectContaining({ id: modified.id, change: 'added' }),
	);
	await service.promote(environments.promote.id, owner, {
		commitMessage: 'Baseline',
		canExportVariableValues: true,
	});

	const workflows = Container.get(WorkflowRepository);
	// Publication is state in the metadata file, not content, so it never lists.
	await workflows.update(publishable.id, { activeVersionId: publishable.versionId });
	const synced = (await agent.get(endpoint).expect(200)).body;
	expect(synced).toMatchObject({
		commitSha: await remoteHead(),
		source: sourceOf(environments.promote),
	});
	expect(changedResources(synced)).toEqual([]);
	await workflows.update(modified.id, { name: 'Renamed', settings: { executionOrder: 'v1' } });
	await workflows.update(archived.id, { isArchived: true });
	await workflows.delete(removed.id);
	const created = await createWorkflow({ name: 'New', nodes: [], connections: {} }, project);
	await createWorkflow({ name: 'Not in preview', nodes: [], connections: {} }, otherProject);

	const response = await agent.get(endpoint).expect(200);
	expect(changedWorkflows(response.body)).toHaveLength(4);
	expect(changedWorkflows(response.body)).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: modified.id,
				name: 'Renamed',
				previousName: 'Modified',
				change: 'modified',
			}),
			expect.objectContaining({ id: archived.id, change: 'archived' }),
			expect.objectContaining({ id: removed.id, change: 'deleted' }),
			expect.objectContaining({ id: created.id, name: 'New', change: 'added' }),
		]),
	);

	await service.promote(environments.promote.id, owner, {
		commitMessage: 'Changes',
		canExportVariableValues: true,
	});
	await workflows.update(archived.id, { isArchived: false });
	expect(changedResources((await agent.get(endpoint).expect(200)).body)).toEqual([
		expect.objectContaining({ id: archived.id, change: 'modified' }),
	]);
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: modified.id, role: 'workflow:owner' },
		{ projectId: otherProject.id },
	);
	const movedOutPreview = (await agent.get(endpoint).expect(200)).body;
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
		await agent.get(`/promotions/projects/${otherProject.id}/changes/promote`).expect(200)
	).body;
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
	expect((await agent.get(endpoint).expect(200)).body.resources).toContainEqual(
		expect.objectContaining({
			key: `workflow:${modified.id}`,
			movedToProject: { id: personal.id },
		}),
	);
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: modified.id, role: 'workflow:owner' },
		{ projectId: otherProject.id },
	);
	// The moved workflow is listed once, next to the restored one.
	expect(changedWorkflows(movedOutPreview)).toHaveLength(2);
}, 30_000);

it('marks a workflow that moved into a project that has no files on the branch yet', async () => {
	const owner = await createOwner();
	const billing = await createTeamProject('Billing', owner);
	const workflow = await createWorkflow({ name: 'Invoices', nodes: [], connections: {} }, billing);
	const environments = await createInstanceEnvironments();
	await exportPreviewBaseline(environments.promote, owner);
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
		await server
			.publicApiAgentWithCookie(owner)
			.get(`/promotions/projects/${later.id}/changes/promote`)
			.expect(200)
	).body;

	expect(preview.resources).toContainEqual(
		expect.objectContaining({
			key: `workflow:${workflow.id}`,
			change: 'added',
			movedFromProject: { id: billing.id, name: billing.name },
		}),
	);
}, 30_000);

it('lists a renamed folder without changing the workflow inside it', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Moves', owner);
	const folder = await createFolder(project, { name: 'Original' });
	const workflow = await createWorkflowWithHistory(
		{ name: 'Move', nodes: [], connections: {}, parentFolder: folder },
		project,
	);
	const environments = await createInstanceEnvironments();
	await exportPreviewBaseline(environments.promote, owner);
	const endpoint = `/promotions/projects/${project.id}/changes/promote`;
	const agent = server.publicApiAgentWithCookie(owner);
	const workflows = Container.get(WorkflowRepository);
	const folders = Container.get(FolderRepository);

	const changed = async () => changedResources((await agent.get(endpoint).expect(200)).body);
	const renamedFolder = expect.objectContaining({
		key: `folder:${folder.id}`,
		previousName: 'Original',
		change: 'modified',
	});

	// The workflow file moves with its folder, but the workflow does not change.
	await folders.update(folder.id, { name: 'Renamed' });
	expect(await changed()).toEqual([renamedFolder]);

	// Publishing does not turn the move into a modification.
	await workflows.update(workflow.id, { activeVersionId: workflow.versionId });
	expect(await changed()).toEqual([renamedFolder]);

	await workflows.update(workflow.id, { activeVersionId: null, parentFolder: null });
	expect(await changed()).toEqual([
		renamedFolder,
		expect.objectContaining({
			key: `workflow:${workflow.id}`,
			parentKey: `project:${project.id}`,
			previousParentKey: `folder:${folder.id}`,
			change: 'modified',
		}),
	]);

	await workflows.update(workflow.id, { parentFolder: folder });
	await folders.update(folder.id, { name: folder.name });
	expect(await changed()).toEqual([]);
}, 30_000);

it('lists the project variable that a workflow reads, not the global variable that it shadows', async () => {
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
	await Container.get(VariablesService).updateCache();
	await buildWorkflowReferencingVariables({
		name: 'Variable',
		project,
		variableNames: ['API_URL'],
	});
	const environments = await createInstanceEnvironments();
	await exportPreviewBaseline(environments.promote, owner);
	const agent = server.publicApiAgentWithCookie(owner);
	const endpoint = `/promotions/projects/${project.id}/changes/promote`;
	const changed = async () => changedResources((await agent.get(endpoint).expect(200)).body);

	await variables.update(global.id, { value: 'changed global' });
	await Container.get(VariablesService).updateCache();
	expect(await changed()).toEqual([]);

	await variables.update(scoped.id, { value: 'changed project' });
	await Container.get(VariablesService).updateCache();
	expect(await changed()).toEqual([
		expect.objectContaining({
			key: `variable:project:${project.id}:API_URL`,
			change: 'modified',
		}),
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
	const agent = server.publicApiAgentWithCookie(owner);
	const endpoint = `/promotions/projects/${project.id}/changes/promote`;
	const applyEndpoint = `/promotions/projects/${project.id}/changes/apply`;

	const synced = (await agent.get(applyEndpoint).expect(200)).body;
	expect(synced).toMatchObject({ commitSha: baseline, source: sourceOf(environments.apply) });
	expect(changedResources(synced)).toEqual([]);

	await workflows.update(renamed.id, { name: 'Local name', settings: { executionOrder: 'v1' } });
	await workflows.update(archived.id, { isArchived: false });
	await workflows.delete(incoming.id);
	const outgoing = await createWorkflow({ name: 'Outgoing', nodes: [], connections: {} }, project);
	await Container.get(VariablesRepository).delete(variable.id);
	await Container.get(VariablesService).updateCache();

	const response = (await agent.get(applyEndpoint).expect(200)).body;
	expect(response.commitSha).toBe(baseline);
	expect(changedWorkflows(response)).toHaveLength(4);
	expect(changedWorkflows(response)).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: renamed.id,
				name: 'Branch name',
				previousName: 'Local name',
				change: 'modified',
			}),
			expect.objectContaining({ id: archived.id, name: 'Archived on branch', change: 'archived' }),
			expect.objectContaining({ id: incoming.id, name: 'Incoming', change: 'added' }),
			expect.objectContaining({ id: outgoing.id, name: 'Outgoing', change: 'deleted' }),
		]),
	);
	// Apply creates the variable that this instance lacks, and the workflow that uses it carries it.
	const variableKey = 'variable:global:SHARED_URL';
	expect(changedResources(response)).toContainEqual(
		expect.objectContaining({ key: variableKey, change: 'added' }),
	);
	expect(response.dependencies).toContainEqual({
		workflowKey: `workflow:${dependent.id}`,
		resourceKey: variableKey,
		included: true,
	});
	// The branch manifest covers every project, but only this project's workflows may show.
	expect(response.resources.map(({ key }: { key: string }) => key)).not.toContain(
		`workflow:${elsewhere.id}`,
	);
	// The Promote side keeps reading the instance as the desired state.
	expect(changedWorkflows((await agent.get(endpoint).expect(200)).body)).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ id: renamed.id, name: 'Local name', change: 'modified' }),
			expect.objectContaining({ id: incoming.id, change: 'deleted' }),
			expect.objectContaining({ id: outgoing.id, name: 'Outgoing', change: 'added' }),
		]),
	);

	await service.promote(environments.promote.id, owner, {
		commitMessage: 'Sync',
		canExportVariableValues: true,
	});
	const after = (await agent.get(applyEndpoint).expect(200)).body;
	expect(after).toMatchObject({
		commitSha: await remoteHead(),
		source: sourceOf(environments.apply),
	});
	expect(changedResources(after)).toEqual([]);
	expect(after.commitSha).not.toBe(baseline);
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
	const environments = await createInstanceEnvironments(['apply']);
	await exportPreviewBaseline(environments.apply, owner);
	const agent = server.publicApiAgentWithCookie(owner);
	const applyEndpoint = `/promotions/projects/${project.id}/changes/apply`;
	const variables = Container.get(VariablesRepository);

	// A binding creates the variable with a new ID and the destination's own value.
	await variables.delete(promoted.id);
	const bound = await createVariable('API_URL', 'https://destination.example.com');
	await Container.get(VariablesService).updateCache();
	const changed = async () => changedResources((await agent.get(applyEndpoint).expect(200)).body);
	expect(await changed()).toEqual([]);

	await variables.delete(bound.id);
	await Container.get(VariablesService).updateCache();
	const preview = (await agent.get(applyEndpoint).expect(200)).body;
	expect(changedResources(preview)).toEqual([
		expect.objectContaining({ key: 'variable:global:API_URL', change: 'added' }),
	]);
	expect(preview.dependencies).toContainEqual({
		workflowKey: `workflow:${dependent.id}`,
		resourceKey: 'variable:global:API_URL',
		included: true,
	});
}, 30_000);

it('answers for a destination that has only an apply environment', async () => {
	const owner = await createOwner();
	const project = await createTeamProject('Destination', owner);
	const workflow = await createWorkflow(
		{ name: 'Local only', nodes: [], connections: {} },
		project,
	);
	const environments = await createInstanceEnvironments(['apply']);
	const agent = server.publicApiAgentWithCookie(owner);
	const endpoint = `/promotions/projects/${project.id}/changes/promote`;
	const applyEndpoint = `/promotions/projects/${project.id}/changes/apply`;

	// The branch has no commit yet, so there is no package to read. Promote has no environment here.
	const exportSpy = vi.spyOn(Container.get(N8nPackagesService), 'exportPackageToWriter');
	const empty = await agent.get(applyEndpoint).expect(400);
	expect(empty.body.message).toContain('no exported package');
	// The branch is read before the export, so an empty branch costs no project export.
	expect(exportSpy).not.toHaveBeenCalled();
	exportSpy.mockRestore();
	await agent.get(endpoint).expect(404);

	await exportPreviewBaseline(environments.apply, owner);
	await Container.get(WorkflowRepository).delete(workflow.id);

	const response = (await agent.get(applyEndpoint).expect(200)).body;
	expect(response).toMatchObject({
		commitSha: await remoteHead(),
		source: sourceOf(environments.apply),
	});
	expect(changedResources(response)).toEqual([
		expect.objectContaining({ id: workflow.id, name: 'Local only', change: 'added' }),
	]);
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
	const agent = server.publicApiAgentWithCookie(owner);
	const endpoint = `/promotions/projects/${project.id}/changes/apply`;
	const changed = async () => changedResources((await agent.get(endpoint).expect(200)).body);
	expect(await changed()).toEqual([
		expect.objectContaining({ id: workflow.id, change: 'modified' }),
	]);

	expect((await service.apply(environments.apply.id, owner)).status).toBe('applied');

	expect(await changed()).toEqual([]);
	const stored = await workflows.findOneByOrFail({ id: workflow.id });
	expect(stored.nodes).toHaveLength(1);
	expect(stored.versionId).not.toBe('source-version');
}, 30_000);

it('lists every local workflow as deleted when a valid branch manifest has no entry for the project', async () => {
	const owner = await createOwner();
	const otherProject = await createTeamProject('Other', owner);
	await createWorkflow({ name: 'Elsewhere', nodes: [], connections: {} }, otherProject);
	const environments = await createInstanceEnvironments(['apply']);
	await exportPreviewBaseline(environments.apply, owner);
	// The project appears after the promotion, so the branch manifest does not know it.
	const project = await createTeamProject('Destination', owner);
	const workflow = await createWorkflow(
		{ name: 'Local only', nodes: [], connections: {} },
		project,
	);

	const response = await server
		.publicApiAgentWithCookie(owner)
		.get(`/promotions/projects/${project.id}/changes/apply`)
		.expect(200);
	expect(changedResources(response.body)).toEqual([
		expect.objectContaining({ id: workflow.id, name: 'Local only', change: 'deleted' }),
	]);
}, 30_000);

it('checks authentication, the scopes of each direction, and the promotions license before reading Git', async () => {
	const owner = await createOwner();
	const member = await createMember();
	const project = await createTeamProject('Private', owner);
	const endpoint = `/promotions/projects/${project.id}/changes/promote`;
	const applyEndpoint = `/promotions/projects/${project.id}/changes/apply`;
	await server.publicApiAgentWithoutApiKey().get(endpoint).expect(401);
	await server.publicApiAgentWithCookie(member).get(endpoint).expect(403);
	await server.publicApiAgentWithCookie(member).get(applyEndpoint).expect(403);
	// A project admin manages the project, but lacks the global promotion scopes.
	await linkUserToProject(member, project, 'project:admin');
	await server.publicApiAgentWithCookie(member).get(endpoint).expect(403);
	await server.publicApiAgentWithCookie(member).get(applyEndpoint).expect(403);
	await server
		.publicApiAgentWithCookie(owner)
		.get(`/promotions/projects/${project.id}/changes/sideways`)
		.expect(404);
	server.license.disable('feat:promotions');
	await server.publicApiAgentWithCookie(owner).get(endpoint).expect(403);
});

describe('resources in the preview', () => {
	it('lists a renamed folder and a new empty folder, which users can promote on their own', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Reports', owner);
		const reports = await createFolder(project, { name: 'Reports' });
		const weekly = await createFolder(project, { name: 'Weekly', parentFolder: reports });
		const workflow = await createWorkflow(
			{ name: 'Weekly report', nodes: [], connections: {}, parentFolder: weekly },
			project,
		);
		const environments = await createInstanceEnvironments();
		await exportPreviewBaseline(environments.promote, owner);
		await Container.get(FolderRepository).update(weekly.id, { name: 'Monthly' });
		const drafts = await createFolder(project, { name: 'Drafts', parentFolder: reports });

		const { body } = await server
			.publicApiAgentWithCookie(owner)
			.get(`/promotions/projects/${project.id}/changes/promote`)
			.expect(200);

		expect(body.resources).toEqual([
			expect.objectContaining({ key: `project:${project.id}`, change: 'unchanged' }),
			expect.objectContaining({
				key: `folder:${drafts.id}`,
				parentKey: `folder:${reports.id}`,
				change: 'added',
				selectable: true,
			}),
			expect.objectContaining({
				key: `folder:${weekly.id}`,
				name: 'Monthly',
				previousName: 'Weekly',
				parentKey: `folder:${reports.id}`,
				change: 'modified',
				selectable: true,
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

	it('shows on Apply the import conflicts that stop it, and each move between projects once', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Releases', owner);
		const elsewhere = await createTeamProject('Elsewhere', owner);
		const shared = await createWorkflow({ name: 'Shared', nodes: [], connections: {} }, project);
		const custom = await createWorkflow(
			{
				name: 'Uses a custom node',
				nodes: [
					{
						id: 'custom',
						name: 'Custom',
						type: 'n8n-nodes-custom.notInstalled',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			},
			project,
		);
		const environments = await createInstanceEnvironments(['apply']);
		await exportPreviewBaseline(environments.apply, owner);
		// This instance moves a workflow to another project, which Apply of the branch cannot undo.
		await Container.get(SharedWorkflowRepository).update(
			{ workflowId: shared.id },
			{ projectId: elsewhere.id },
		);

		const preview = (
			await server
				.publicApiAgentWithCookie(owner)
				.get(`/promotions/projects/${project.id}/changes/apply`)
				.expect(200)
		).body;

		const releases = { id: project.id, name: 'Releases' };
		expect(preview.check.conflicts).toEqual([
			{
				kind: 'workflow',
				code: 'missing-node-type',
				reason: 'n8n-nodes-custom.notInstalled@1',
				consumers: [
					{ project: releases, workflows: [{ id: custom.id, name: 'Uses a custom node' }] },
				],
			},
		]);
		expect(preview.check.movedWorkflows).toEqual([
			{
				id: shared.id,
				name: 'Shared',
				project: releases,
				projectExists: true,
				instanceProject: { id: elsewhere.id, name: 'Elsewhere' },
			},
		]);
	}, 30_000);

	it('stops Apply when this instance changed after the preview, then applies what the preview shows', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Billing', owner);
		const workflow = await createWorkflow({ name: 'Invoice', nodes: [], connections: {} }, project);
		const environments = await createInstanceEnvironments(['apply']);
		await exportPreviewBaseline(environments.apply, owner);
		const workflowRepository = Container.get(WorkflowRepository);
		await workflowRepository.update(workflow.id, { name: 'Invoice (local)' });

		const agent = server.publicApiAgentWithCookie(owner);
		const endpoint = `/promotions/projects/${project.id}/changes/apply`;
		const loadPreview = async () => (await agent.get(endpoint).expect(200)).body;
		const applyShown = async (preview: {
			source: { environmentId: string; branchName: string };
			commitSha: string;
			revision: string;
		}) =>
			await Container.get(PromotionsService).applyProjectSelection(project.id, owner, {
				workflowIds: [workflow.id],
				expectedSource: { ...preview.source, commitSha: preview.commitSha },
				expectedPreviewRevision: preview.revision,
			});

		const stale = await loadPreview();
		await workflowRepository.update(workflow.id, { name: 'Invoice (edited again)' });
		expect(await applyShown(stale)).toMatchObject({ status: 'preview-changed' });
		expect(await workflowRepository.findOneByOrFail({ id: workflow.id })).toMatchObject({
			name: 'Invoice (edited again)',
		});

		expect(await applyShown(await loadPreview())).toMatchObject({ status: 'applied' });
		expect(changedResources(await loadPreview())).toEqual([]);
	}, 60_000);

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
		await exportPreviewBaseline(environments.promote, owner);
		await tables.addColumn(table.id, project.id, { name: 'total', type: 'number' });
		const agent = server.publicApiAgentWithCookie(owner);

		const { body } = await agent
			.get(`/promotions/projects/${project.id}/changes/promote`)
			.expect(200);

		const tableKey = `dataTable:${table.id}`;
		expect(body.resources).toEqual(
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
		expect(body.resources.filter(({ key }: { key: string }) => key === tableKey)).toHaveLength(1);
		expect(body.dependencies).toEqual(
			expect.arrayContaining([
				{ workflowKey: `workflow:${importing.id}`, resourceKey: tableKey, included: true },
				{ workflowKey: `workflow:${shipping.id}`, resourceKey: tableKey, included: true },
			]),
		);

		const details = await agent
			.post(`/promotions/projects/${project.id}/changes/promote/details`)
			.send({ commitSha: body.commitSha, keys: [tableKey] })
			.expect(200);
		expect(details.body.details).toEqual([
			expect.objectContaining({
				key: tableKey,
				type: 'dataTable',
				dataTableChanges: [expect.objectContaining({ kind: 'add-column', column: 'total' })],
			}),
		]);
		// The preview shows the table schema only. Rows never travel with a promotion.
		expect(details.body.details[0].after).not.toHaveProperty('rows');
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
		await exportPreviewBaseline(environments.promote, owner);
		// The new error workflow no longer exists, so neither side holds it. The reference still shows.
		await Container.get(WorkflowRepository).update(escalate.id, {
			settings: { errorWorkflow: 'DeletedErrorFlow' },
		});

		const { body } = await server
			.publicApiAgentWithCookie(owner)
			.get(`/promotions/projects/${project.id}/changes/promote`)
			.expect(200);

		expect(body.resources).toEqual(
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
		expect(body.dependencies).toEqual(
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

	it('leaves out changes that Apply does not make and shows the credential name that Apply writes', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Billing', owner);
		const folder = await createFolder(project, { name: 'Invoices' });
		const invoices = await createWorkflow(
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
		const environments = await createInstanceEnvironments(['apply']);
		await exportPreviewBaseline(environments.apply, owner);
		// Apply gives the folder and the credential, which the project owns, the names on the branch.
		// No local workflow uses the credential, so the local export does not hold it.
		await Container.get(FolderRepository).update(folder.id, { name: 'Local invoices' });
		await Container.get(CredentialsRepository).update(credential.id, { name: 'Local billing API' });
		await Container.get(WorkflowRepository).delete(charge.id);

		const { body } = await server
			.publicApiAgentWithCookie(owner)
			.get(`/promotions/projects/${project.id}/changes/apply`)
			.expect(200);

		expect(body.resources).toEqual([
			expect.objectContaining({ key: `project:${project.id}`, change: 'unchanged' }),
			expect.objectContaining({
				key: `folder:${folder.id}`,
				name: 'Invoices',
				previousName: 'Local invoices',
				change: 'modified',
			}),
			expect.objectContaining({ key: `workflow:${charge.id}`, change: 'added' }),
			// Apply renames the folder only together with a selected workflow inside it.
			expect.objectContaining({ key: `workflow:${invoices.id}`, change: 'unchanged' }),
			expect.objectContaining({
				key: `credential:${credential.id}`,
				name: 'Billing API',
				previousName: 'Local billing API',
				change: 'modified',
			}),
		]);
	}, 30_000);

	it('lists the workflow of a credential that Apply updates when nothing else changes', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Billing', owner);
		const credential = await saveCredential(
			{ name: 'Billing API', type: 'httpHeaderAuth', data: {} },
			{ project, role: 'credential:owner' },
		);
		const charge = await buildWorkflowReferencingCredential({
			name: 'Charge customers',
			project,
			credential,
		});
		const environments = await createInstanceEnvironments(['apply']);
		await exportPreviewBaseline(environments.apply, owner);
		await Container.get(CredentialsRepository).update(credential.id, { name: 'Local billing API' });

		const { body } = await server
			.publicApiAgentWithCookie(owner)
			.get(`/promotions/projects/${project.id}/changes/apply`)
			.expect(200);

		expect(body.resources).toContainEqual(
			expect.objectContaining({
				key: `credential:${credential.id}`,
				name: 'Billing API',
				previousName: 'Local billing API',
				change: 'modified',
			}),
		);
		// Selecting the workflow sends the credential, so the preview lists it with its link.
		expect(body.resources).toContainEqual(
			expect.objectContaining({
				key: `workflow:${charge.id}`,
				change: 'unchanged',
				selectable: true,
			}),
		);
		expect(body.dependencies).toContainEqual({
			workflowKey: `workflow:${charge.id}`,
			resourceKey: `credential:${credential.id}`,
			included: true,
		});
	}, 30_000);

	it('lists a folder that Apply renames, with the workflow inside it', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Billing', owner);
		const folder = await createFolder(project, { name: 'Invoices' });
		const workflow = await createWorkflow(
			{ name: 'Send invoices', nodes: [], connections: {}, parentFolder: folder },
			project,
		);
		const environments = await createInstanceEnvironments(['apply']);
		await exportPreviewBaseline(environments.apply, owner);
		await Container.get(FolderRepository).update(folder.id, { name: 'Local invoices' });

		const { body } = await server
			.publicApiAgentWithCookie(owner)
			.get(`/promotions/projects/${project.id}/changes/apply`)
			.expect(200);

		expect(body.resources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: `folder:${folder.id}`,
					name: 'Invoices',
					previousName: 'Local invoices',
					change: 'modified',
				}),
				expect.objectContaining({ key: `workflow:${workflow.id}`, change: 'unchanged' }),
			]),
		);
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
			const environments = await createInstanceEnvironments(['apply']);
			await exportPreviewBaseline(environments.apply, owner);
			await changeLocalTag(tag.id);

			const agent = server.publicApiAgentWithCookie(owner);
			const endpoint = `/promotions/projects/${project.id}/changes/apply`;
			const summary = (await agent.get(endpoint).expect(200)).body;
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
			expect(body.details).toEqual([
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
		await exportPreviewBaseline(environments.promote, owner);
		const workflows = Container.get(WorkflowRepository);
		await workflows.update(workflow.id, { name: 'Invoice v2' });
		const draft = await createWorkflow({ name: 'Draft', nodes: [], connections: {} }, project);
		const agent = server.publicApiAgentWithCookie(owner);
		const endpoint = `/promotions/projects/${project.id}/changes/promote`;
		const key = `workflow:${workflow.id}`;
		const summary = (await agent.get(endpoint).expect(200)).body;
		const { revision } = summary.resources.find(
			(resource: { key: string }) => resource.key === key,
		);
		const loadDetail = async () =>
			(
				await agent
					.post(`${endpoint}/details`)
					.send({ commitSha: summary.commitSha, keys: [key] })
					.expect(200)
			).body.details[0];

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
		expect(body.details).toEqual([expect.objectContaining({ key })]);
		expect(body.missingKeys).toEqual([draftKey]);
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
		await exportPreviewBaseline(environments.promote, owner);
		await projects.update(project.id, { name: 'Finance EU' });
		const agent = server.publicApiAgentWithCookie(owner);
		const endpoint = `/promotions/projects/${project.id}/changes/promote`;
		const key = `project:${project.id}`;
		const summary = (await agent.get(endpoint).expect(200)).body;

		const { body } = await agent
			.post(`${endpoint}/details`)
			.send({ commitSha: summary.commitSha, keys: [key] })
			.expect(200);

		expect(body.details).toEqual([
			expect.objectContaining({
				key,
				before: expect.objectContaining({ name: 'Finance' }),
				after: expect.objectContaining({ name: 'Finance EU' }),
			}),
		]);
		expect(body.missingKeys).toEqual([]);
	}, 30_000);

	it('loads details before the first promotion when the repository holds only a README', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('New team', owner);
		const workflow = await createWorkflow({ name: 'Invoice', nodes: [], connections: {} }, project);
		const { dir, git } = await (sourceFixture ??= createSourceFixture());
		await writeFile(path.join(dir, 'README.md'), '# Workflows\n');
		await git.add('README.md').commit('Add README');
		await git.push(remoteFolder, 'HEAD:main');
		await createInstanceEnvironments();
		const agent = server.publicApiAgentWithCookie(owner);
		const endpoint = `/promotions/projects/${project.id}/changes/promote`;
		const summary = (await agent.get(endpoint).expect(200)).body;
		expect(summary.commitSha).toEqual(expect.any(String));

		const { body } = await agent
			.post(`${endpoint}/details`)
			.send({ commitSha: summary.commitSha, keys: [`workflow:${workflow.id}`] })
			.expect(200);

		expect(body.details).toEqual([
			expect.objectContaining({
				before: null,
				after: expect.objectContaining({ name: 'Invoice' }),
			}),
		]);
	}, 30_000);
});
