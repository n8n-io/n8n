import {
	createWorkflowWithHistory,
	getPersonalProject,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import type { IWorkflowDb, Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, NodeConnectionTypes } from 'n8n-workflow';
import { gzipSync } from 'node:zlib';
import { Header } from 'tar';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { AppVersionService } from '@/modules/apps/app-version.service';
import { AppRepository } from '@/modules/apps/app.repository';
import { AppRuntimeService } from '@/modules/apps/runtime/app-runtime.service';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';
import { loadNodesFromDist } from '@test-integration/utils/node-types-data';

let owner: User;
let ownerProject: Project;
/** The served page calls the runtime API without a session and without the `/rest` prefix. */
let visitor: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps'],
});
// Like the dev-only global cors middleware: runs before the controller and sets the
// credentials header that the public runtime API must never send.
testServer.app.use((_req, res, next) => {
	res.header('Access-Control-Allow-Credentials', 'true');
	next();
});

let appRepository: AppRepository;

const tgz = (files: Record<string, string>) => {
	const blocks = Object.entries(files).map(([path, text]) => {
		const content = Buffer.from(text);
		const header = new Header({ path, type: 'File', size: content.length, mtime: new Date(0) });
		header.encode();
		const data = Buffer.alloc(Math.ceil(content.length / 512) * 512);
		content.copy(data);
		return Buffer.concat([header.block!, data]);
	});
	return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
};

/** "When Executed by Another Workflow" (message, count) → Set node that echoes both. */
const echoWorkflow = () => ({
	nodes: [
		{
			id: 'trigger',
			name: 'When Executed by Another Workflow',
			type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
			typeVersion: 1.1,
			position: [0, 0] as [number, number],
			parameters: {
				inputSource: 'workflowInputs',
				workflowInputs: {
					values: [
						{ name: 'message', type: 'string' },
						{ name: 'count', type: 'number' },
					],
				},
			},
		},
		{
			id: 'set',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [200, 0] as [number, number],
			parameters: {
				mode: 'manual',
				assignments: {
					assignments: [
						{
							id: 'reply',
							name: 'reply',
							type: 'string',
							value: '=got {{ $json.message }} x{{ $json.count }}',
						},
					],
				},
				includeOtherFields: false,
				options: {},
			},
		},
	],
	connections: {
		'When Executed by Another Workflow': {
			main: [[{ node: 'Set', type: NodeConnectionTypes.Main, index: 0 }]],
		},
	},
});

/** Same trigger → "Respond to Webhook" (current version) with a fixed JSON body. */
const respondWorkflow = () => ({
	nodes: [
		echoWorkflow().nodes[0],
		{
			id: 'respond',
			name: 'Respond to Webhook',
			type: 'n8n-nodes-base.respondToWebhook',
			typeVersion: 1.5,
			position: [200, 0] as [number, number],
			parameters: {
				respondWith: 'json',
				responseBody: '{ "reply": "from respond node" }',
				options: {},
			},
		},
	],
	connections: {
		'When Executed by Another Workflow': {
			main: [[{ node: 'Respond to Webhook', type: NodeConnectionTypes.Main, index: 0 }]],
		},
	},
});

const createPublishedWorkflow = async (data: ReturnType<typeof echoWorkflow>, name: string) => {
	const workflow = await createWorkflowWithHistory(
		{ name, ...data } as unknown as Partial<IWorkflowDb>,
		owner,
	);
	await setActiveVersion(workflow.id, workflow.versionId);
	return workflow;
};

const createEchoWorkflow = async ({ published }: { published: boolean }) => {
	if (published) return await createPublishedWorkflow(echoWorkflow(), 'Echo');
	return await createWorkflowWithHistory(
		{ name: 'Echo', ...echoWorkflow() } as unknown as Partial<IWorkflowDb>,
		owner,
	);
};

const createBoundApp = async (workflowId: string, key = 'submit') => {
	const app = await appRepository.createApp(ownerProject.id, 'Runner', 'runner');
	return await appRepository.updateBindings(app, [{ key, kind: 'workflow', workflowId }]);
};

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;

	// Real nodes: the happy path runs the workflow end to end.
	await utils.initNodeTypes(
		loadNodesFromDist([
			'n8n-nodes-base.executeWorkflowTrigger',
			'n8n-nodes-base.set',
			'n8n-nodes-base.respondToWebhook',
		]),
	);
	await utils.initBinaryDataService();
});

beforeEach(async () => {
	await testDb.truncate([
		'App',
		'ExecutionEntity',
		'SharedWorkflow',
		'WorkflowEntity',
		'WorkflowHistory',
	]);
});

describe('POST /apps/:namespace/api/workflows/:key', () => {
	test('runs the published workflow with the body as input and answers with its output', async () => {
		const workflow = await createEchoWorkflow({ published: true });
		await createBoundApp(workflow.id);

		const response = await visitor
			.post('/apps/runner/api/workflows/submit')
			.set('Origin', 'null')
			.send({ message: 'hi', count: 3 })
			.expect(200);

		expect(response.body).toMatchObject({
			status: 'success',
			output: [{ reply: 'got hi x3' }],
			principal: null,
		});
		expect(typeof response.body.executionId).toBe('string');
		expect(response.headers['access-control-allow-origin']).toBe('*');
		expect(response.headers['access-control-allow-credentials']).toBeUndefined();
	});

	test('fails a workflow that ends in Respond to Webhook, which needs a Webhook-type parent', async () => {
		const workflow = await createPublishedWorkflow(respondWorkflow(), 'Respond');
		await createBoundApp(workflow.id);

		const response = await visitor
			.post('/apps/runner/api/workflows/submit')
			.send({ message: 'hi', count: 3 })
			.expect(200);

		expect(response.body).toMatchObject({
			status: 'error',
			output: [],
			error: 'The workflow failed.',
		});
		const execution = await Container.get(ExecutionPersistence).findSingleExecution(
			response.body.executionId,
			{ includeData: true, unflattenData: true },
		);
		expect(execution?.data.resultData.error?.message).toBe('No Webhook node found in the workflow');
	});

	test('answers 404 binding_not_found for a key the app has not bound', async () => {
		const workflow = await createEchoWorkflow({ published: true });
		await createBoundApp(workflow.id);

		const response = await visitor.post('/apps/runner/api/workflows/nope').send({}).expect(404);

		expect(response.body).toMatchObject({ code: 'binding_not_found' });
	});

	test('answers 404 app_not_found for a namespace no app owns', async () => {
		const response = await visitor.post('/apps/nobody/api/workflows/submit').send({}).expect(404);

		expect(response.body).toMatchObject({ code: 'app_not_found' });
	});

	test('answers 409 workflow_not_published until the bound workflow is published', async () => {
		const workflow = await createEchoWorkflow({ published: false });
		await createBoundApp(workflow.id);

		const response = await visitor
			.post('/apps/runner/api/workflows/submit')
			.send({ message: 'hi', count: 3 })
			.expect(409);

		expect(response.body).toMatchObject({ code: 'workflow_not_published' });
	});

	test('answers 400 invalid_input with the issues when a field has the wrong type', async () => {
		const workflow = await createEchoWorkflow({ published: true });
		await createBoundApp(workflow.id);

		const response = await visitor
			.post('/apps/runner/api/workflows/submit')
			.send({ message: 'hi', count: 'many' })
			.expect(400);

		expect(response.body).toMatchObject({ code: 'invalid_input' });
		expect(response.body.issues).toEqual([{ path: ['count'], code: 'invalid_type' }]);
	});

	test('answers 413 payload_too_large for a body over 1 MiB', async () => {
		const workflow = await createEchoWorkflow({ published: true });
		await createBoundApp(workflow.id);

		const response = await visitor
			.post('/apps/runner/api/workflows/submit')
			.set('Content-Type', 'application/json')
			.send(JSON.stringify({ message: 'x'.repeat(1024 * 1024) }))
			.expect(413);

		expect(response.body).toMatchObject({ code: 'payload_too_large' });
	});

	test('resolves a multipart request like any other instead of failing on the size check', async () => {
		const workflow = await createEchoWorkflow({ published: true });
		await createBoundApp(workflow.id);

		const response = await visitor
			.post('/apps/runner/api/workflows/nope')
			.field('message', 'hi')
			.expect(404);

		expect(response.body).toMatchObject({ code: 'binding_not_found' });
	});

	test('answers 500 execution_failed with CORS headers when the run cannot start', async () => {
		vi.spyOn(Container.get(AppRuntimeService), 'runWorkflow').mockRejectedValueOnce(
			new Error('db down'),
		);

		const response = await visitor.post('/apps/runner/api/workflows/submit').send({}).expect(500);

		expect(response.body).toEqual({
			code: 'execution_failed',
			message: 'The workflow could not be run.',
		});
		expect(response.headers['access-control-allow-origin']).toBe('*');
	});
});

describe('OPTIONS /apps/:namespace/api/*', () => {
	test('answers the preflight of the opaque-origin page with a wildcard origin', async () => {
		const response = await visitor
			.options('/apps/runner/api/workflows/submit')
			.set('Origin', 'null')
			.set('Access-Control-Request-Method', 'POST')
			.expect(204);

		expect(response.headers['access-control-allow-origin']).toBe('*');
		expect(response.headers['access-control-allow-methods']).toBe('POST, OPTIONS');
		expect(response.headers['access-control-allow-headers']).toBe('Content-Type, Authorization');
		expect(response.headers['access-control-allow-credentials']).toBeUndefined();
	});
});

describe('GET /apps/:namespace/api/*', () => {
	test('answers 404 JSON instead of the app index.html', async () => {
		const workflow = await createEchoWorkflow({ published: true });
		const app = await createBoundApp(workflow.id);
		// A served version makes the SPA fallback live: without the guard this would be index.html.
		await Container.get(AppVersionService).create(
			app.id,
			app.projectId,
			tgz({ './src/main.ts': 'export {};' }),
			tgz({ './index.html': '<!doctype html>app' }),
		);
		await visitor.get('/apps/runner/anything').expect(200);

		const response = await visitor.get('/apps/runner/api/anything').expect(404);

		expect(response.headers['content-type']).toContain('application/json');
		expect(response.body).toEqual({ code: 'not_found', message: 'Not found' });
	});
});
