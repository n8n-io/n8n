/**
 * Webhook runs of an `engineType=v2` workflow (CAT-2920).
 *
 * The webhook node still runs control-plane-side; only the start call changes.
 * These tests drive a real webhook request through a real Webhook node and
 * assert what reaches the data plane.
 */

import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { UUID_V7_PATTERN } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { agent as testAgent } from 'supertest';

import { CacheService } from '@/services/cache/cache.service';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { Telemetry } from '@/telemetry';
import { WebhookServer } from '@/webhooks/webhook-server';

import { getAllExecutions } from './shared/db/executions';
import { createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import { initNodeTypes, setupTestServer } from './shared/utils';

mockInstance(Telemetry);

const testServer = setupTestServer({ endpointGroups: ['workflows'] });

const TRIGGER_NAME = 'Webhook';

const startExecution = vi.fn();
const getExecution = vi.fn();

let builder: User;
let webhookAgent: SuperAgentTest;
let webhookTestEndpoint: string;

const webhookNode = (webhookId: string): INode => ({
	id: randomUUID(),
	name: TRIGGER_NAME,
	type: WEBHOOK_NODE_TYPE,
	typeVersion: 2,
	position: [0, 0],
	webhookId,
	parameters: { httpMethod: 'POST', path: webhookId, options: {} },
});

const createV2Workflow = async (trigger: INode) =>
	await createWorkflow(
		{ active: false, nodes: [trigger], connections: {}, settings: { engineType: 'v2' } },
		builder,
	);

/** The editor registering the test webhook for this workflow's trigger. */
const startListening = async (workflowId: string) =>
	await testServer
		.authAgentFor(builder)
		.post(`/workflows/${workflowId}/run`)
		.send({ triggerToStartFrom: { name: TRIGGER_NAME } });

beforeAll(async () => {
	await initNodeTypes();

	webhookTestEndpoint = Container.get(GlobalConfig).endpoints.webhookTest;

	await Container.get(CacheService).init();
	Container.get(EngineDataPlaneProxyService).registerProvider({ startExecution, getExecution });

	// `/webhook-test/*` is mounted only when a server opts into test webhooks.
	class EditorFacingWebhookServer extends WebhookServer {
		constructor() {
			super();
			this.testWebhooksEnabled = true;
		}
	}

	const server = new EditorFacingWebhookServer();
	await server.start();
	webhookAgent = testAgent(server.app) as unknown as SuperAgentTest;
});

beforeEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'SharedWorkflow', 'WorkflowEntity']);
	await Container.get(CacheService).reset();
	vi.clearAllMocks();

	// Deliberately not the id the control plane minted, so a response echoing the
	// data plane back would fail the assertion below.
	startExecution.mockResolvedValue({ executionId: 'a3c1e0f2-0000-4000-8000-000000000001' });

	builder = await createOwner();
});

describe('webhook runs on engine 2.0', () => {
	test('hands the webhook payload to the data plane and persists no execution', async () => {
		const webhookId = randomUUID();
		const workflow = await createV2Workflow(webhookNode(webhookId));

		const listening = await startListening(workflow.id);
		expect(listening.body.data).toEqual({ waitingForWebhook: true });

		const response = await webhookAgent
			.post(`/${webhookTestEndpoint}/${webhookId}`)
			.send({ order: 42 });

		expect(response.statusCode).toBe(200);

		expect(startExecution).toHaveBeenCalledTimes(1);
		const request = startExecution.mock.calls[0][0];
		expect(request.executionId).toMatch(UUID_V7_PATTERN);
		expect(request.workflowId).toBe(workflow.id);
		// A test webhook is still a manual run.
		expect(request.mode).toBe('manual');
		// The webhook node's own output, not a placeholder.
		expect(request.triggerOutputs[0][0].json).toMatchObject({ body: { order: 42 } });
		// The graph is rooted at the webhook node, which becomes the trigger step.
		expect(request.graph.nodes).toEqual([
			expect.objectContaining({ name: TRIGGER_NAME, type: 'trigger' }),
		]);

		// The data plane is the only store for a v2 run.
		const executions = await getAllExecutions();
		expect(executions.filter((e) => e.workflowId === workflow.id)).toHaveLength(0);
	});

	test('answers 400 with the reason when the response mode is unsupported', async () => {
		const webhookId = randomUUID();
		const trigger = webhookNode(webhookId);
		trigger.parameters.responseMode = 'lastNode';
		const workflow = await createV2Workflow(trigger);

		await startListening(workflow.id);

		const response = await webhookAgent
			.post(`/${webhookTestEndpoint}/${webhookId}`)
			.send({ order: 42 });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain("does not support the 'lastNode' response mode yet");
		expect(startExecution).not.toHaveBeenCalled();
	});
});
