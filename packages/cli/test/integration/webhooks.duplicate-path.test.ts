import { testDb, mockInstance, createActiveWorkflow } from '@n8n/backend-test-utils';
import type { IWorkflowDb, User } from '@n8n/db';
import { WebhookEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource as Connection } from '@n8n/typeorm';
import {
	type INode,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
} from 'n8n-workflow';
import type { Repository } from '@n8n/typeorm';
import { agent as testAgent } from 'supertest';

import { NodeTypes } from '@/node-types';
import { WebhookServer } from '@/webhooks/webhook-server';

import { createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import { initActiveWorkflowManager } from './shared/utils';

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
		const workflowId = this.getWorkflow().id;
		return { workflowResponse: { success: true, workflowId } };
	}
}

/**
 * Regression test for GHC-7036
 * Bug: When multiple workflows have webhook nodes with the same custom path pattern
 * but different webhookIds, only the last activated workflow retains its registration.
 *
 * Root cause: webhook_entity table's primary key is (webhookPath, method),
 * which doesn't include webhookId, causing silent overwrites.
 */
describe('Webhook API - Duplicate Path Pattern (GHC-7036)', () => {
	const nodeInstance = new WebhookTestingNode();
	const nodeTypes = mockInstance(NodeTypes);
	nodeTypes.getByName.mockReturnValue(nodeInstance);
	nodeTypes.getByNameAndVersion.mockReturnValue(nodeInstance);

	let user: User;
	let agent: SuperAgentTest;
	let webhookRepository: Repository<WebhookEntity>;

	beforeAll(async () => {
		await testDb.init();
		user = await createUser();
		const connection = Container.get(Connection);
		webhookRepository = connection.getRepository(WebhookEntity);

		const server = new WebhookServer();
		await server.start();
		agent = testAgent(server.app);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'WebhookEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('should allow multiple workflows with same path pattern but different webhookIds', async () => {
		// Workflow A with webhook using custom path /:workspaceid
		const webhookIdA = 'aaaa-1111-2222-3333-feed7a61ff22';
		const nodeA: INode = {
			id: 'webhook-node-a',
			name: 'Webhook A',
			type: nodeInstance.description.name,
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				httpMethod: 'POST',
				path: ':workspaceid',
			},
			webhookId: webhookIdA,
		};
		const workflowA = await createActiveWorkflow(
			{ active: true, nodes: [nodeA], name: 'Workflow A' } as Partial<IWorkflowDb>,
			user,
		);

		// Workflow B with webhook using the SAME custom path /:workspaceid but different webhookId
		const webhookIdB = 'bbbb-4444-5555-6666-feed7a61ff22';
		const nodeB: INode = {
			id: 'webhook-node-b',
			name: 'Webhook B',
			type: nodeInstance.description.name,
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				httpMethod: 'POST',
				path: ':workspaceid',
			},
			webhookId: webhookIdB,
		};
		const workflowB = await createActiveWorkflow(
			{ active: true, nodes: [nodeB], name: 'Workflow B' } as Partial<IWorkflowDb>,
			user,
		);

		// Activate both workflows
		await initActiveWorkflowManager();

		// Verify both webhooks are registered in the database
		const allWebhooks = await webhookRepository.find();
		expect(allWebhooks).toHaveLength(2);

		const webhookA = allWebhooks.find((w) => w.webhookId === webhookIdA);
		const webhookB = allWebhooks.find((w) => w.webhookId === webhookIdB);

		expect(webhookA).toBeDefined();
		expect(webhookA?.workflowId).toBe(workflowA.id);
		expect(webhookA?.webhookPath).toBe(':workspaceid');
		expect(webhookA?.method).toBe('POST');

		expect(webhookB).toBeDefined();
		expect(webhookB?.workflowId).toBe(workflowB.id);
		expect(webhookB?.webhookPath).toBe(':workspaceid');
		expect(webhookB?.method).toBe('POST');

		// Test Workflow A's webhook endpoint
		const responseA = await agent.post(`/webhook/${webhookIdA}/workspace-123`).send({ test: 'a' });
		expect(responseA.statusCode).toBe(200);
		expect(responseA.body.workflowId).toBe(workflowA.id);

		// Test Workflow B's webhook endpoint
		const responseB = await agent.post(`/webhook/${webhookIdB}/workspace-456`).send({ test: 'b' });
		expect(responseB.statusCode).toBe(200);
		expect(responseB.body.workflowId).toBe(workflowB.id);

		// Both should work independently with different workspace IDs
		const responseA2 = await agent
			.post(`/webhook/${webhookIdA}/different-workspace`)
			.send({ test: 'a2' });
		expect(responseA2.statusCode).toBe(200);
		expect(responseA2.body.workflowId).toBe(workflowA.id);
	});

	test('should not silently overwrite webhook registration when activating second workflow', async () => {
		// Create and activate Workflow A
		const webhookIdA = 'cccc-1111-2222-3333-feed7a61ff22';
		const nodeA: INode = {
			id: 'webhook-node-a',
			name: 'Webhook A',
			type: nodeInstance.description.name,
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				httpMethod: 'POST',
				path: ':userid',
			},
			webhookId: webhookIdA,
		};
		await createActiveWorkflow(
			{ active: true, nodes: [nodeA], name: 'Workflow A' } as Partial<IWorkflowDb>,
			user,
		);

		await initActiveWorkflowManager();

		// Verify first webhook is registered
		let webhooks = await webhookRepository.find();
		expect(webhooks).toHaveLength(1);
		expect(webhooks[0].webhookId).toBe(webhookIdA);

		// Create and activate Workflow B with same path pattern
		const webhookIdB = 'dddd-4444-5555-6666-feed7a61ff22';
		const nodeB: INode = {
			id: 'webhook-node-b',
			name: 'Webhook B',
			type: nodeInstance.description.name,
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				httpMethod: 'POST',
				path: ':userid',
			},
			webhookId: webhookIdB,
		};
		await createActiveWorkflow(
			{ active: true, nodes: [nodeB], name: 'Workflow B' } as Partial<IWorkflowDb>,
			user,
		);

		// Re-initialize to activate the second workflow
		await initActiveWorkflowManager();

		// Both webhooks should still be registered (not overwritten)
		webhooks = await webhookRepository.find();
		expect(webhooks).toHaveLength(2);

		const webhookIds = webhooks.map((w) => w.webhookId).sort();
		expect(webhookIds).toEqual([webhookIdA, webhookIdB].sort());
	});
});
