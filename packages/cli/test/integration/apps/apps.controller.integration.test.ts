/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ModuleRegistry } from '@n8n/backend-common';
import { createWorkflow, getPersonalProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import { AppsConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { AppRepository } from '@/modules/apps/app.repository';
import { PageRepository } from '@/modules/apps/page.repository';
import { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';
import { createDataTable } from '@test-integration/db/data-tables';
import { createExecution } from '@test-integration/db/executions';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let ownerProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps', 'data-table'],
});

let appRepository: AppRepository;
let pageRepository: PageRepository;
const instanceAiService = mockInstance(InstanceAiService);

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	pageRepository = Container.get(PageRepository);

	owner = await createOwner();
	member = await createMember();

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	ownerProject = await getPersonalProject(owner);
});

beforeEach(async () => {
	await testDb.truncate(['App', 'Page', 'ExecutionEntity']);
});

describe('POST /projects/:projectId/apps', () => {
	test('creates an app for a project member', async () => {
		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps`)
			.send({ name: 'My App', namespace: 'my-app' })
			.expect(200);

		expect(response.body.data).toMatchObject({ name: 'My App', namespace: 'my-app' });
	});

	test('rejects a non-member with 403', async () => {
		await authMemberAgent
			.post(`/projects/${ownerProject.id}/apps`)
			.send({ name: 'My App', namespace: 'my-app' })
			.expect(403);
	});

	test('rejects creating an app past maxAppsPerProject with a friendly message', async () => {
		const appsConfig = Container.get(AppsConfig);
		const original = appsConfig.maxAppsPerProject;
		appsConfig.maxAppsPerProject = 1;

		try {
			await authOwnerAgent
				.post(`/projects/${ownerProject.id}/apps`)
				.send({ name: 'First', namespace: 'first' })
				.expect(200);

			const response = await authOwnerAgent
				.post(`/projects/${ownerProject.id}/apps`)
				.send({ name: 'Second', namespace: 'second' })
				.expect(400);

			expect(response.body.message).toContain('App limit exceeded');
			expect(await appRepository.countByProjectId(ownerProject.id)).toBe(1);
		} finally {
			appsConfig.maxAppsPerProject = original;
		}
	});

	test('rejects a duplicate namespace in the same project with 409', async () => {
		await appRepository.createApp(ownerProject.id, 'First', 'dup');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps`)
			.send({ name: 'Second', namespace: 'dup' })
			.expect(409);
	});

	test('rejects a namespace another project already uses with 409', async () => {
		const memberProject = await getPersonalProject(member);
		await appRepository.createApp(memberProject.id, 'First', 'dup');

		// A namespace is the whole public URL of an App (`/apps/dup`), which carries
		// no project, so it has to be unique instance-wide.
		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps`)
			.send({ name: 'Second', namespace: 'dup' })
			.expect(409);
	});
});

describe('GET /projects/:projectId/apps', () => {
	test('lists apps for a project member, 403 for a non-member', async () => {
		await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		const response = await authOwnerAgent.get(`/projects/${ownerProject.id}/apps`).expect(200);
		expect(response.body.data).toHaveLength(1);

		await authMemberAgent.get(`/projects/${ownerProject.id}/apps`).expect(403);
	});
});

describe('GET /projects/:projectId/apps/data-workflows', () => {
	// Regression test: this route must be registered before GET /:appId, or
	// Express matches 'data-workflows' as an appId and 404s looking for that app.
	test('lists data workflows without being shadowed by GET /:appId', async () => {
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/data-workflows`)
			.expect(200);

		expect(response.body.data).toEqual([]);
	});
});

const passthroughWorkflow = async (project: Project = ownerProject) =>
	await createWorkflow(
		{
			name: 'Echo',
			nodes: [
				{
					id: 'trigger',
					name: 'When Executed by Another Workflow',
					type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
					typeVersion: 1.1,
					position: [0, 0],
					parameters: { inputSource: 'passthrough' },
				},
			],
		},
		project,
	);

describe('GET /projects/:projectId/apps/:appId/bindings', () => {
	test('describes a bound workflow with its trigger fields and a not-published warning', async () => {
		const workflow = await createWorkflow(
			{
				name: 'Echo',
				nodes: [
					{
						id: 'trigger',
						name: 'When Executed by Another Workflow',
						type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
						typeVersion: 1.1,
						position: [0, 0],
						parameters: {
							inputSource: 'workflowInputs',
							workflowInputs: { values: [{ name: 'message', type: 'string' }] },
						},
					},
				],
			},
			ownerProject,
		);
		const created = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');
		const app = await appRepository.updateBindings(created, [
			{ key: 'submit', kind: 'workflow', workflowId: workflow.id },
		]);

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.expect(200);

		expect(response.body.data.bindings).toEqual([
			{
				key: 'submit',
				kind: 'workflow',
				workflowId: workflow.id,
				name: 'Echo',
				published: false,
				input: {
					type: 'object',
					properties: { message: { type: ['string', 'null'], description: 'message' } },
					additionalProperties: false,
				},
				output: { type: 'array', items: { type: 'object', additionalProperties: true } },
				outputSource: { kind: 'unknown' },
			},
		]);
		expect(response.body.data.warnings).toHaveLength(2);
		expect(response.body.data.warnings[0]).toContain('not published');
		expect(response.body.data.warnings[1]).toContain("Binding 'submit': output is untyped");
	});

	test('types the output from the latest successful execution', async () => {
		const workflow = await createWorkflow(
			{
				name: 'Echo',
				nodes: [
					{
						id: 'trigger',
						name: 'When Executed by Another Workflow',
						type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
						typeVersion: 1.1,
						position: [0, 0],
						parameters: { inputSource: 'passthrough' },
					},
				],
			},
			ownerProject,
		);
		const runData = (items: Array<Record<string, unknown>>) => ({
			resultData: {
				lastNodeExecuted: 'Reply',
				runData: { Reply: [{ data: { main: [items.map((json) => ({ json }))] } }] },
			},
		});
		await createExecution(
			{ status: 'success', data: stringify(runData([{ reply: 'old', legacy: true }])) },
			workflow,
		);
		await createExecution({ status: 'error', data: stringify(runData([{ failed: 1 }])) }, workflow);
		const latest = await createExecution(
			{
				status: 'success',
				stoppedAt: new Date('2026-09-09T10:00:01.000Z'),
				data: stringify(
					runData([
						{ reply: 'a', count: 1 },
						{ reply: 'b', count: null },
					]),
				),
			},
			workflow,
		);
		const created = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');
		const app = await appRepository.updateBindings(created, [
			{ key: 'submit', kind: 'workflow', workflowId: workflow.id },
		]);

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.expect(200);

		expect(response.body.data.bindings[0]).toMatchObject({
			input: { type: 'object', additionalProperties: true },
			output: {
				type: 'array',
				items: {
					type: 'object',
					properties: { reply: { type: 'string' }, count: { type: ['number', 'null'] } },
					required: ['reply', 'count'],
				},
			},
			outputSource: {
				kind: 'execution',
				executionId: latest.id,
				at: '2026-09-09T10:00:01.000Z',
			},
		});
		expect(response.body.data.warnings).not.toContainEqual(expect.stringContaining('untyped'));
	});

	test('rejects a non-member with 403', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');

		await authMemberAgent.get(`/projects/${ownerProject.id}/apps/${app.id}/bindings`).expect(403);
	});
});

describe('POST /projects/:projectId/apps/:appId/bindings', () => {
	test('adds a workflow binding and lists it afterwards', async () => {
		const workflow = await passthroughWorkflow();
		const app = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.send({ key: 'submit', kind: 'workflow', workflowId: workflow.id })
			.expect(201);

		expect(response.body.data.bindings).toEqual([
			expect.objectContaining({ key: 'submit', kind: 'workflow', workflowId: workflow.id }),
		]);
		expect(response.body.data.warnings[0]).toContain('not published');

		const listed = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.expect(200);
		expect(listed.body.data.bindings.map((b: { key: string }) => b.key)).toEqual(['submit']);
	});

	test('adds a data table binding with its permissions', async () => {
		const table = await createDataTable(ownerProject, {
			name: 'Tasks',
			columns: [{ name: 'title', type: 'string' }],
		});
		const app = await appRepository.createApp(ownerProject.id, 'Board', 'board');

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.send({ key: 'tasks', kind: 'dataTable', dataTableId: table.id, permissions: ['read'] })
			.expect(201);

		expect(response.body.data.bindings).toEqual([
			expect.objectContaining({
				key: 'tasks',
				kind: 'dataTable',
				dataTableId: table.id,
				name: 'Tasks',
				permissions: ['read'],
				columns: [{ name: 'title', type: 'string' }],
			}),
		]);
		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual([
			{ key: 'tasks', kind: 'dataTable', dataTableId: table.id, permissions: ['read'] },
		]);
	});

	test('answers 400 for a key that is not a valid binding key', async () => {
		const workflow = await passthroughWorkflow();
		const app = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.send({ key: 'Not Valid', kind: 'workflow', workflowId: workflow.id })
			.expect(400);

		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual([]);
	});

	test('answers 400 for a key the app already uses', async () => {
		const workflow = await passthroughWorkflow();
		const created = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');
		const app = await appRepository.updateBindings(created, [
			{ key: 'submit', kind: 'workflow', workflowId: workflow.id },
		]);

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.send({ key: 'submit', kind: 'workflow', workflowId: workflow.id })
			.expect(400);

		expect(response.body.message).toContain('unique');
		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toHaveLength(1);
	});

	test('answers 400 for a workflow owned by another project', async () => {
		const memberProject = await getPersonalProject(member);
		const workflow = await passthroughWorkflow(memberProject);
		const app = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.send({ key: 'submit', kind: 'workflow', workflowId: workflow.id })
			.expect(400);

		expect(response.body.message).toContain('belongs to another project');
		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual([]);
	});

	test('answers 400 for a workflow without a supported trigger', async () => {
		const workflow = await createWorkflow(
			{
				name: 'Manual',
				nodes: [
					{
						id: 'trigger',
						name: 'When clicking Execute workflow',
						type: MANUAL_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
			},
			ownerProject,
		);
		const app = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.send({ key: 'submit', kind: 'workflow', workflowId: workflow.id })
			.expect(400);

		expect(response.body.message).toContain('trigger');
		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual([]);
	});

	test('rejects a non-member with 403', async () => {
		const workflow = await passthroughWorkflow();
		const app = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.send({ key: 'submit', kind: 'workflow', workflowId: workflow.id })
			.expect(403);
	});
});

describe('PATCH /projects/:projectId/apps/:appId/bindings/:key', () => {
	const appWithTable = async () => {
		const table = await createDataTable(ownerProject, {
			columns: [{ name: 'title', type: 'string' }],
		});
		const workflow = await passthroughWorkflow();
		const created = await appRepository.createApp(ownerProject.id, 'Board', 'board');
		const app = await appRepository.updateBindings(created, [
			{ key: 'submit', kind: 'workflow', workflowId: workflow.id },
			{ key: 'tasks', kind: 'dataTable', dataTableId: table.id, permissions: ['read'] },
		]);
		return { app, table };
	};

	test('changes the permissions of a data table binding and back', async () => {
		const { app, table } = await appWithTable();
		const url = `/projects/${ownerProject.id}/apps/${app.id}/bindings/tasks`;

		const widened = await authOwnerAgent
			.patch(url)
			.send({ permissions: ['read', 'write'] })
			.expect(200);

		expect(widened.body.data.bindings).toEqual([
			expect.objectContaining({ key: 'submit', kind: 'workflow' }),
			expect.objectContaining({ key: 'tasks', permissions: ['read', 'write'] }),
		]);
		expect(widened.body.data.warnings[0]).toContain('not published');
		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings[1]).toEqual({
			key: 'tasks',
			kind: 'dataTable',
			dataTableId: table.id,
			permissions: ['read', 'write'],
		});

		const narrowed = await authOwnerAgent
			.patch(url)
			.send({ permissions: ['read'] })
			.expect(200);

		expect(narrowed.body.data.bindings[1]).toEqual(
			expect.objectContaining({ key: 'tasks', permissions: ['read'] }),
		);
		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings[1]).toEqual(
			expect.objectContaining({ permissions: ['read'] }),
		);
	});

	test('answers 404 for a key the app has not bound', async () => {
		const { app } = await appWithTable();

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/bindings/nope`)
			.send({ permissions: ['read'] })
			.expect(404);

		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual(app.bindings);
	});

	test('answers 400 for a workflow binding, which has no permissions', async () => {
		const { app } = await appWithTable();

		const response = await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/bindings/submit`)
			.send({ permissions: ['read'] })
			.expect(400);

		expect(response.body.message).toContain('no permissions');
		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual(app.bindings);
	});

	test('answers 400 for a permission value the binding kind does not know', async () => {
		const { app } = await appWithTable();
		const url = `/projects/${ownerProject.id}/apps/${app.id}/bindings/tasks`;

		await authOwnerAgent
			.patch(url)
			.send({ permissions: ['admin'] })
			.expect(400);
		await authOwnerAgent.patch(url).send({ permissions: [] }).expect(400);

		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual(app.bindings);
	});

	test('rejects a non-member with 403', async () => {
		const { app } = await appWithTable();

		await authMemberAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/bindings/tasks`)
			.send({ permissions: ['read', 'write'] })
			.expect(403);

		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual(app.bindings);
	});
});

describe('DELETE /projects/:projectId/apps/:appId/bindings/:key', () => {
	test('removes the binding by key and describes the remaining ones', async () => {
		const workflow = await passthroughWorkflow();
		const created = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');
		const app = await appRepository.updateBindings(created, [
			{ key: 'submit', kind: 'workflow', workflowId: workflow.id },
			{ key: 'notify', kind: 'workflow', workflowId: workflow.id },
		]);

		const response = await authOwnerAgent
			.delete(`/projects/${ownerProject.id}/apps/${app.id}/bindings/submit`)
			.expect(200);

		expect(response.body.data.bindings.map((b: { key: string }) => b.key)).toEqual(['notify']);
		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual([
			{ key: 'notify', kind: 'workflow', workflowId: workflow.id },
		]);
	});

	test('answers 404 for a key the app has not bound and keeps the others', async () => {
		const workflow = await passthroughWorkflow();
		const created = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');
		const app = await appRepository.updateBindings(created, [
			{ key: 'submit', kind: 'workflow', workflowId: workflow.id },
		]);

		await authOwnerAgent
			.delete(`/projects/${ownerProject.id}/apps/${app.id}/bindings/nope`)
			.expect(404);

		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toHaveLength(1);
	});

	test('rejects a non-member with 403', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');

		await authMemberAgent
			.delete(`/projects/${ownerProject.id}/apps/${app.id}/bindings/submit`)
			.expect(403);
	});
});

describe('App pages', () => {
	test('creates a page and a nested child page under it', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		const rootResponse = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'home' })
			.expect(200);

		const childResponse = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'nested', parentPageId: rootResponse.body.data.id })
			.expect(200);

		expect(childResponse.body.data.parentPageId).toBe(rootResponse.body.data.id);

		const listResponse = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.expect(200);
		expect(listResponse.body.data).toHaveLength(2);
	});

	test('accepts an empty route, meaning this page is the index page for its level', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: '' })
			.expect(200);

		expect(response.body.data.route).toBe('');
	});

	test('accepts a dynamic param segment, e.g. :id', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: ':id' })
			.expect(200);

		expect(response.body.data.route).toBe(':id');
	});

	test('rejects creating a sub-page under an index page', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const indexPage = await pageRepository.createPage(app.id, null, '');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'child', parentPageId: indexPage.id })
			.expect(400);
	});

	test('rejects creating an index page under another page', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const parent = await pageRepository.createPage(app.id, null, 'parent');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: '', parentPageId: parent.id })
			.expect(400);
	});

	test('rejects turning a sub-page into an index page', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const parent = await pageRepository.createPage(app.id, null, 'parent');
		const child = await pageRepository.createPage(app.id, parent.id, 'child');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${child.id}`)
			.send({ route: '' })
			.expect(400);
	});

	test('rejects turning a page with children into an index page', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const parent = await pageRepository.createPage(app.id, null, 'parent');
		await pageRepository.createPage(app.id, parent.id, 'child');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${parent.id}`)
			.send({ route: '' })
			.expect(400);
	});

	test('rejects creating a page whose route collides with a sibling, at any level', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'foo' })
			.expect(200);

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'foo' })
			.expect(409);
	});

	test('rejects creating a second index page at the same level', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, '');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: '' })
			.expect(409);
	});

	test('allows the same route at different levels (different parents)', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const parentA = await pageRepository.createPage(app.id, null, 'a');
		const parentB = await pageRepository.createPage(app.id, null, 'b');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'same', parentPageId: parentA.id })
			.expect(200);

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'same', parentPageId: parentB.id })
			.expect(200);
	});

	test('rejects renaming a page to collide with a sibling', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, 'foo');
		const other = await pageRepository.createPage(app.id, null, 'bar');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${other.id}`)
			.send({ route: 'foo' })
			.expect(409);
	});

	test('allows saving a page with its own current route unchanged', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, 'foo');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}`)
			.send({ route: 'foo' })
			.expect(200);
	});

	test('deleting an app deletes its pages', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, 'home');

		await authOwnerAgent.delete(`/projects/${ownerProject.id}/apps/${app.id}`).expect(200);

		const remaining = await pageRepository.findManyByAppId(app.id);
		expect(remaining).toHaveLength(0);
		expect(instanceAiService.destroyAppSandbox).not.toHaveBeenCalled();
	});

	test("deleting an app destroys the app's sandbox when instance-ai is active", async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const isActive = vi
			.spyOn(Container.get(ModuleRegistry), 'isActive')
			.mockImplementation((name) => name === 'instance-ai');

		try {
			await authOwnerAgent.delete(`/projects/${ownerProject.id}/apps/${app.id}`).expect(200);
		} finally {
			isActive.mockRestore();
		}

		expect(instanceAiService.destroyAppSandbox).toHaveBeenCalledWith(app.id);
	});

	test("rejects updating a page through a different app's URL", async () => {
		const appA = await appRepository.createApp(ownerProject.id, 'App A', 'app-a');
		const appB = await appRepository.createApp(ownerProject.id, 'App B', 'app-b');
		const page = await pageRepository.createPage(appA.id, null, 'foo');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${appB.id}/pages/${page.id}`)
			.send({ route: 'moved' })
			.expect(404);
	});

	test("rejects deleting a page through a different app's URL, leaving it untouched", async () => {
		const appA = await appRepository.createApp(ownerProject.id, 'App A', 'app-a');
		const appB = await appRepository.createApp(ownerProject.id, 'App B', 'app-b');
		const page = await pageRepository.createPage(appA.id, null, 'foo');

		await authOwnerAgent
			.delete(`/projects/${ownerProject.id}/apps/${appB.id}/pages/${page.id}`)
			.expect(404);

		const remaining = await pageRepository.findManyByAppId(appA.id);
		expect(remaining).toHaveLength(1);
	});

	test('rejects creating a page whose parentPageId belongs to a different app', async () => {
		const appA = await appRepository.createApp(ownerProject.id, 'App A', 'app-a');
		const appB = await appRepository.createApp(ownerProject.id, 'App B', 'app-b');
		const pageInA = await pageRepository.createPage(appA.id, null, 'foo');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${appB.id}/pages`)
			.send({ route: 'child', parentPageId: pageInA.id })
			.expect(404);
	});

	test("sets and clears a page's dataWorkflowId", async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, 'home');
		const workflow = await createWorkflow({}, ownerProject);

		const setResponse = await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}`)
			.send({ dataWorkflowId: workflow.id })
			.expect(200);
		expect(setResponse.body.data.dataWorkflowId).toBe(workflow.id);

		const clearResponse = await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}`)
			.send({ dataWorkflowId: null })
			.expect(200);
		expect(clearResponse.body.data.dataWorkflowId).toBeNull();
	});

	test("rejects a dataWorkflowId the caller can't read", async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, 'home');
		// Owned by no one, so no SharedWorkflow row grants the owner access to it.
		const workflow = await createWorkflow();

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}`)
			.send({ dataWorkflowId: workflow.id })
			.expect(404);
	});
});

describe('/:appId of another project', () => {
	const appOfMember = async () => {
		const memberProject = await getPersonalProject(member);
		const workflow = await passthroughWorkflow(memberProject);
		const created = await appRepository.createApp(memberProject.id, 'Theirs', 'theirs');
		return await appRepository.updateBindings(created, [
			{ key: 'submit', kind: 'workflow', workflowId: workflow.id },
		]);
	};

	test('answers the same 404 as an unknown id for GET /:appId', async () => {
		const app = await appOfMember();

		const mismatch = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}`)
			.expect(404);
		const unknown = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/missing-id`)
			.expect(404);

		expect(unknown.body.message).toBe("Could not find the app: 'missing-id'");
		expect(mismatch.body).toEqual({
			...unknown.body,
			message: `Could not find the app: '${app.id}'`,
		});
	});

	test('answers 404 for GET /:appId/bindings', async () => {
		const app = await appOfMember();

		await authOwnerAgent.get(`/projects/${ownerProject.id}/apps/${app.id}/bindings`).expect(404);
	});

	test('answers 404 for POST /:appId/bindings and leaves the bindings unchanged', async () => {
		const app = await appOfMember();
		const workflow = await passthroughWorkflow();

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/bindings`)
			.send({ key: 'notify', kind: 'workflow', workflowId: workflow.id })
			.expect(404);

		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual(app.bindings);
	});

	test('answers 404 for PATCH /:appId/bindings/:key and leaves the bindings unchanged', async () => {
		const app = await appOfMember();

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/bindings/submit`)
			.send({ permissions: ['read'] })
			.expect(404);

		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual(app.bindings);
	});

	test('answers 404 for DELETE /:appId/bindings/:key and leaves the bindings unchanged', async () => {
		const app = await appOfMember();

		await authOwnerAgent
			.delete(`/projects/${ownerProject.id}/apps/${app.id}/bindings/submit`)
			.expect(404);

		expect((await appRepository.findOneByOrFail({ id: app.id })).bindings).toEqual(app.bindings);
	});

	test('answers 404 for POST /:appId/pages and creates no page', async () => {
		const app = await appOfMember();

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'home' })
			.expect(404);

		expect(await pageRepository.findBy({ appId: app.id })).toEqual([]);
	});

	test('still resolves an app of the request project', async () => {
		await appOfMember();
		const app = await appRepository.createApp(ownerProject.id, 'Mine', 'mine');

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}`)
			.expect(200);

		expect(response.body.data).toMatchObject({ id: app.id, projectId: ownerProject.id });
	});
});
