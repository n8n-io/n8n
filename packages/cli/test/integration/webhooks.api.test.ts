import { readFileSync } from 'fs';
import type { SuperAgentTest } from 'supertest';
import { agent as testAgent } from 'supertest';
import type { INodeType, INodeTypeDescription, IWebhookFunctions } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';

import { AbstractServer } from '@/AbstractServer';
import { ExternalHooks } from '@/ExternalHooks';
import { InternalHooks } from '@/InternalHooks';
import { getLogger } from '@/Logger';
import { NodeTypes } from '@/NodeTypes';
import { Push } from '@/push';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';

import { mockInstance, initActiveWorkflowRunner } from './shared/utils';
import * as testDb from './shared/testDb';

describe('Webhook API', () => {
	mockInstance(ExternalHooks);
	mockInstance(InternalHooks);
	mockInstance(Push);
	LoggerProxy.init(getLogger());

	let agent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('Content-Type support', () => {
		beforeAll(async () => {
			const node = new WebhookTestingNode();
			const user = await testDb.createUser();
			await testDb.createWorkflow(createWebhookWorkflow(node), user);

			const nodeTypes = mockInstance(NodeTypes);
			nodeTypes.getByName.mockReturnValue(node);
			nodeTypes.getByNameAndVersion.mockReturnValue(node);

			await initActiveWorkflowRunner();

			const server = new (class extends AbstractServer {})();
			await server.start();
			agent = testAgent(server.app);
		});

		afterAll(async () => {
			await testDb.truncate(['Workflow']);
		});

		test('should handle JSON', async () => {
			const response = await agent.post('/webhook/abcd').send({ test: true });
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				type: 'application/json',
				body: { test: true },
				params: {},
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
				type: 'application/xml',
				body: {
					outer: {
						$: {
							attr: 'test',
						},
						inner: 'value',
					},
				},
				params: {},
			});
		});

		test('should handle form-urlencoded', async () => {
			const response = await agent
				.post('/webhook/abcd')
				.set('content-type', 'application/x-www-form-urlencoded')
				.send('x=5&y=str&z=false');
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				type: 'application/x-www-form-urlencoded',
				body: { x: '5', y: 'str', z: 'false' },
				params: {},
			});
		});

		test('should handle plain text', async () => {
			const response = await agent
				.post('/webhook/abcd')
				.set('content-type', 'text/plain')
				.send('{"key": "value"}');
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				type: 'text/plain',
				body: '{"key": "value"}',
				params: {},
			});
		});

		test('should handle multipart/form-data', async () => {
			const response = await agent
				.post('/webhook/abcd')
				.field('field1', 'value1')
				.field('field2', 'value2')
				.field('field2', 'value3')
				.attach('file', Buffer.from('random-text'))
				.set('content-type', 'multipart/form-data');

			expect(response.statusCode).toEqual(200);
			expect(response.body.type).toEqual('multipart/form-data');
			const {
				data,
				files: {
					file: [file],
				},
			} = response.body.body;
			expect(data).toEqual({ field1: 'value1', field2: ['value2', 'value3'] });
			expect(file.mimetype).toEqual('application/octet-stream');
			expect(readFileSync(file.filepath, 'utf-8')).toEqual('random-text');
		});
	});

	describe('Params support', () => {
		beforeAll(async () => {
			const node = new WebhookTestingNode();
			const user = await testDb.createUser();
			await testDb.createWorkflow(createWebhookWorkflow(node, ':variable', 'PATCH'), user);

			const nodeTypes = mockInstance(NodeTypes);
			nodeTypes.getByName.mockReturnValue(node);
			nodeTypes.getByNameAndVersion.mockReturnValue(node);

			await initActiveWorkflowRunner();

			const server = new (class extends AbstractServer {})();
			await server.start();
			agent = testAgent(server.app);
		});

		afterAll(async () => {
			await testDb.truncate(['Workflow']);
		});

		test('should handle params', async () => {
			const response = await agent
				.patch('/webhook/5ccef736-be16-4d10-b7fb-feed7a61ff22/test')
				.send({ test: true });
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				type: 'application/json',
				body: { test: true },
				params: {
					variable: 'test',
				},
			});

			await agent.post('/webhook/abcd').send({ test: true }).expect(404);
		});
	});

	class WebhookTestingNode implements INodeType {
		description: INodeTypeDescription = {
			displayName: 'Webhook Testing Node',
			name: 'webhook-testing-node',
			group: ['trigger'],
			version: 1,
			description: '',
			defaults: {},
			inputs: [],
			outputs: ['main'],
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
			const req = this.getRequestObject();
			return {
				webhookResponse: {
					type: req.contentType,
					body: req.body,
					params: req.params,
				},
			};
		}
	}

	const createWebhookWorkflow = (
		node: WebhookTestingNode,
		path = 'abcd',
		httpMethod = 'POST',
	): Partial<WorkflowEntity> => ({
		active: true,
		nodes: [
			{
				name: 'Webhook',
				type: node.description.name,
				typeVersion: 1,
				parameters: { httpMethod, path },
				id: '74786112-fb73-4d80-bd9a-43982939b801',
				webhookId: '5ccef736-be16-4d10-b7fb-feed7a61ff22',
				position: [740, 420],
			},
		],
	});
});
