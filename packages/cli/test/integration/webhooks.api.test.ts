import {
	testDb,
	mockInstance,
	createActiveWorkflow,
	deleteWorkflowAndWebhooks,
} from '@n8n/backend-test-utils';
import { type IWorkflowDb, type User, type WorkflowEntity } from '@n8n/db';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import {
	type INode,
	type MultiPartFormData,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
} from 'n8n-workflow';
import { agent as testAgent } from 'supertest';

import { createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import { initActiveWorkflowManager } from './shared/utils';

import { NodeTypes } from '@/node-types';
import { WebhookServer } from '@/webhooks/webhook-server';

vi.unmock('node:fs');

const uploadedFilePaths: string[] = [];
const uploadedFileContents: string[] = [];
let multipartBehavior:
	| 'respond'
	| 'returnEarly'
	| 'throw'
	| 'removeFirst'
	| 'stream'
	| 'streamAfterClose' = 'respond';

const expectUploadedFilesRemoved = async () => {
	await vi.waitFor(() => {
		expect(uploadedFilePaths.every((filePath) => !existsSync(filePath))).toBe(true);
	});
};

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
		if (contentType === 'multipart/form-data') {
			const files = Object.values((body as MultiPartFormData.Request['body']).files).flat();
			uploadedFilePaths.push(...files.map((file) => file.filepath));
			uploadedFileContents.push(...files.map((file) => readFileSync(file.filepath, 'utf-8')));

			if (multipartBehavior === 'returnEarly') return {};
			if (multipartBehavior === 'throw') throw new Error('Test webhook processing failed');
			if (multipartBehavior === 'streamAfterClose') {
				const response = this.getResponseObject();
				const responseClosed = new Promise<void>((resolve) => response.once('close', resolve));
				response.destroy();
				await responseClosed;
			}
			if (multipartBehavior === 'stream' || multipartBehavior === 'streamAfterClose') {
				const [filePath] = uploadedFilePaths;
				return {
					webhookResponse: Readable.from(
						(async function* () {
							yield await readFile(filePath);
						})(),
					),
				};
			}
			if (multipartBehavior === 'removeFirst') {
				const [firstFilePath] = uploadedFilePaths;
				if (firstFilePath) await rm(firstFilePath, { force: true });
			}
		}
		if (Object.keys(params).length) webhookResponse.params = params;
		if (Object.keys(query).length) webhookResponse.query = query;
		return { webhookResponse };
	}
}

describe('Webhook API', () => {
	const nodeInstance = new WebhookTestingNode();
	const node: INode = {
		id: 'webhook-node-1',
		name: 'Webhook',
		type: nodeInstance.description.name,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		webhookId: '5ccef736-be16-4d10-b7fb-feed7a61ff22',
	};
	const workflowData = { active: true, nodes: [node] } as Partial<IWorkflowDb>;

	const nodeTypes = mockInstance(NodeTypes);
	nodeTypes.getByName.mockReturnValue(nodeInstance);
	nodeTypes.getByNameAndVersion.mockReturnValue(nodeInstance);

	let user: User;
	let agent: SuperAgentTest;
	let workflow: WorkflowEntity | undefined;
	let activeWorkflowManager: Awaited<ReturnType<typeof initActiveWorkflowManager>> | undefined;

	beforeAll(async () => {
		await testDb.init();
		user = await createUser();

		const server = new WebhookServer();
		await server.start();
		agent = testAgent(server.app);
	});

	beforeEach(async () => {
		uploadedFilePaths.length = 0;
		uploadedFileContents.length = 0;
		multipartBehavior = 'respond';
		await testDb.truncate(['WorkflowEntity']);
		workflow = await createActiveWorkflow(workflowData, user);
		activeWorkflowManager = await initActiveWorkflowManager();
	});

	afterEach(async () => {
		// The manager is re-inited per test, so without this each run leaves its
		// registrations live for the rest of the worker.
		await activeWorkflowManager?.removeAll();
		if (workflow) {
			await deleteWorkflowAndWebhooks(workflow.id);
		}
		workflow = undefined;
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
			expect(uploadedFileContents).toEqual(['random-text', 'random-text', 'random-text']);
			expect(files.file2).toBeInstanceOf(Array);
			expect(files.file2.length).toEqual(2);
			expect(uploadedFilePaths).toHaveLength(3);
			await expectUploadedFilesRemoved();
		});

		test('should remove temporary files when the node declines execution', async () => {
			multipartBehavior = 'returnEarly';

			const response = await agent.post('/webhook/abcd').attach('file', Buffer.from('random-text'));

			expect(response.statusCode).toEqual(200);
			expect(uploadedFilePaths).toHaveLength(1);
			await expectUploadedFilesRemoved();
		});

		test('should remove temporary files when node processing fails', async () => {
			multipartBehavior = 'throw';

			const response = await agent.post('/webhook/abcd').attach('file', Buffer.from('random-text'));

			expect(response.statusCode).toEqual(500);
			expect(uploadedFilePaths).toHaveLength(1);
			await expectUploadedFilesRemoved();
		});

		test('should remove every temporary file when one was already removed', async () => {
			multipartBehavior = 'removeFirst';

			const response = await agent
				.post('/webhook/abcd')
				.attach('file', Buffer.from('random-text'))
				.attach('file', Buffer.from('more-random-text'));

			expect(response.statusCode).toEqual(200);
			expect(uploadedFilePaths).toHaveLength(2);
			await expectUploadedFilesRemoved();
		});

		test('should keep temporary files until a streamed response finishes', async () => {
			multipartBehavior = 'stream';

			const response = await agent.post('/webhook/abcd').attach('file', Buffer.from('random-text'));

			expect(response.statusCode).toEqual(200);
			expect(response.text).toEqual('random-text');
			expect(uploadedFilePaths).toHaveLength(1);
			await expectUploadedFilesRemoved();
		});

		test('should remove temporary files when the response closes before a stream is returned', async () => {
			multipartBehavior = 'streamAfterClose';

			const request = agent.post('/webhook/abcd').attach('file', Buffer.from('random-text'));

			await expect(request).rejects.toThrow();
			expect(uploadedFilePaths).toHaveLength(1);
			await expectUploadedFilesRemoved();
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
