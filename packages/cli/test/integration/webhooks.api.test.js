'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const fs_1 = require('fs');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const supertest_1 = require('supertest');
const node_types_1 = require('@/node-types');
const webhook_server_1 = require('@/webhooks/webhook-server');
const users_1 = require('./shared/db/users');
const utils_1 = require('./shared/utils');
jest.unmock('node:fs');
class WebhookTestingNode {
	constructor() {
		this.description = {
			displayName: 'Webhook Testing Node',
			name: 'webhook-testing-node',
			group: ['trigger'],
			version: 1,
			description: '',
			defaults: {},
			inputs: [],
			outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
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
	}
	async webhook() {
		const { contentType, body, params, query } = this.getRequestObject();
		const webhookResponse = { contentType, body };
		if (Object.keys(params).length) webhookResponse.params = params;
		if (Object.keys(query).length) webhookResponse.query = query;
		return { webhookResponse };
	}
}
describe('Webhook API', () => {
	const nodeInstance = new WebhookTestingNode();
	const node = (0, jest_mock_extended_1.mock)({
		name: 'Webhook',
		type: nodeInstance.description.name,
		webhookId: '5ccef736-be16-4d10-b7fb-feed7a61ff22',
	});
	const workflowData = { active: true, nodes: [node] };
	const nodeTypes = (0, backend_test_utils_1.mockInstance)(node_types_1.NodeTypes);
	nodeTypes.getByName.mockReturnValue(nodeInstance);
	nodeTypes.getByNameAndVersion.mockReturnValue(nodeInstance);
	let user;
	let agent;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		user = await (0, users_1.createUser)();
		const server = new webhook_server_1.WebhookServer();
		await server.start();
		agent = (0, supertest_1.agent)(server.app);
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['WorkflowEntity']);
		await (0, backend_test_utils_1.createWorkflow)(workflowData, user);
		await (0, utils_1.initActiveWorkflowManager)();
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
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
			expect((0, fs_1.readFileSync)(files.file1.filepath, 'utf-8')).toEqual('random-text');
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
//# sourceMappingURL=webhooks.api.test.js.map
