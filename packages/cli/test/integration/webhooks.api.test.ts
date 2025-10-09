import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { readFileSync } from 'fs';
import { mock } from 'jest-mock-extended';
import {
	type INode,
	type IWorkflowBase,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
} from 'n8n-workflow';
import { agent as testAgent } from 'supertest';

import { NodeTypes } from '@/node-types';
import { WebhookServer } from '@/webhooks/webhook-server';

import { createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import { initActiveWorkflowManager } from './shared/utils';

jest.unmock('node:fs');

class WebhookTestingNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webhook Testing Node',
		name: 'webhook-testing-node',
		group: ['trigger'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'default',
				isFullPath: true,
				httpMethod: '={{$parameter["httpMethod"]}}',
				path: '={{$parameter["path"]}}',
			},
		],
		properties: [
			{
				name: 'httpMethod',
				type: 'string',
				displayName: 'Method',
				default: 'GET',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: 'xyz',
			},
		],
	};

	async webhook(this: IWebhookFunctions) {
		const { contentType, body, params, query } = this.getRequestObject();
		const webhookResponse: Record<string, any> = { contentType, body };
		if (Object.keys(params).length) webhookResponse.params = params;
		if (Object.keys(query).length) webhookResponse.query = query;
		return { webhookResponse };
	}
}

describe('Webhook API', () => {
	const nodeInstance = new WebhookTestingNode();
	const node = mock<INode>({
		name: 'Webhook',
		type: nodeInstance.description.name,
		webhookId: '5ccef736-be16-4d10-b7fb-feed7a61ff22',
	});
	const workflowData = { active: true, nodes: [node] } as IWorkflowBase;

	const nodeTypes = mockInstance(NodeTypes);
	nodeTypes.getByName.mockReturnValue(nodeInstance);
	nodeTypes.getByNameAndVersion.mockReturnValue(nodeInstance);

	let user: User;
	let agent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.init();
		user = await createUser();

		const server = new WebhookServer();
		await server.start();
		agent = testAgent(server.app);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity']);
		await createWorkflow(workflowData, user);
		await initActiveWorkflowManager();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('Content-Type support', () => {
		beforeAll(async () => {
			node.parameters = { httpMethod: 'POST', path: 'abcd' };
		});

		test('should handle JSON', async () => {
			const response = await agent.post('/webhook/abcd').send({ test: true });
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				contentType: 'application/json',
				body: { test: true },
			});
		});

		test('should handle XML', async () => {
			const response = await agent
				.post('/webhook/abcd')
				.set('content-type', 'application/xml')
				.send(
					'<?xml version="1.0" encoding="UTF-8"?><Outer attr="test"><Inner>value</Inner></Outer>',
				);
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				contentType: 'application/xml',
				body: {
					outer: {
						$: {
							attr: 'test',
						},
						inner: 'value',
					},
				},
			});
		});

		test('should handle form-urlencoded', async () => {
			const response = await agent
				.post('/webhook/abcd')
				.set('content-type', 'application/x-www-form-urlencoded')
				.send('x=5&y=str&z=false');
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				contentType: 'application/x-www-form-urlencoded',
				body: { x: '5', y: 'str', z: 'false' },
			});
		});

		test('should handle plain text', async () => {
			const response = await agent
				.post('/webhook/abcd')
				.set('content-type', 'text/plain')
				.send('{"key": "value"}');
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				contentType: 'text/plain',
				body: '{"key": "value"}',
			});
		});

		test('should handle multipart/form-data', async () => {
			const response = await agent
				.post('/webhook/abcd')
				.field('field1', 'value1')
				.field('field2', 'value2')
				.field('field2', 'value3')
				.attach('file1', Buffer.from('random-text'))
				.attach('file2', Buffer.from('random-text'))
				.attach('file2', Buffer.from('random-text'))
				.set('content-type', 'multipart/form-data');

			expect(response.statusCode).toEqual(200);
			expect(response.body.contentType).toEqual('multipart/form-data');
			const { data, files } = response.body.body;
			expect(data).toEqual({ field1: 'value1', field2: ['value2', 'value3'] });

			expect(files.file1).not.toBeInstanceOf(Array);
			expect(files.file1.mimetype).toEqual('application/octet-stream');
			expect(readFileSync(files.file1.filepath, 'utf-8')).toEqual('random-text');
			expect(files.file2).toBeInstanceOf(Array);
			expect(files.file2.length).toEqual(2);
		});
	});

	describe('Route-parameters support', () => {
		beforeAll(async () => {
			node.parameters = { httpMethod: 'PATCH', path: ':variable' };
		});

		test('should handle params', async () => {
			const response = await agent
				.patch('/webhook/5ccef736-be16-4d10-b7fb-feed7a61ff22/test')
				.send({ test: true });
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				contentType: 'application/json',
				body: { test: true },
				params: {
					variable: 'test',
				},
			});

			await agent.post('/webhook/abcd').send({ test: true }).expect(404);
		});
	});

	describe('Query-parameters support', () => {
		beforeAll(async () => {
			node.parameters = { httpMethod: 'GET', path: 'testing' };
		});

		test('should use the extended query parser', async () => {
			const response = await agent.get('/webhook/testing?filter[field]=value');
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				query: {
					filter: {
						field: 'value',
					},
				},
			});
		});
	});
});
