import { ModuleRegistry } from '@n8n/backend-common';
import { WorkflowPublishedDataService } from '@n8n/backend-services';
import { createActiveWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import {
	type User,
	type WorkflowEntity,
	WorkflowHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { createDispatchReporter, type ClaimedTask } from '@n8n/scheduler';
import {
	type INode,
	type INodeType,
	type INodeTypeDescription,
	type IWorkflowBase,
	type IWorkflowExecuteAdditionalData,
	NodeConnectionTypes,
	Workflow,
} from 'n8n-workflow';
import { agent as testAgent } from 'supertest';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { NodeTypes } from '@/node-types';
import { ScheduleTriggerTaskHandler } from '@/scheduling/schedule-trigger-node/schedule-trigger-task-handler';
import { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import { WebhookServer } from '@/webhooks/webhook-server';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';
import type { SuperAgentTest } from '../shared/types';
import { initActiveWorkflowManager } from '../shared/utils';

/**
 * A published workflow on engine v1 with an engine-only draft on v2: production
 * must run the published engine on every trigger type. The engine is decided by
 * `settings.engineType` on the run data, so each test checks the run data that
 * the production path hands to the run.
 */

const WEBHOOK_PATH = 'published-engine';

class TestTriggerNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger',
		name: 'test-published-engine-trigger',
		group: ['trigger'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [{ name: 'default', isFullPath: true, httpMethod: 'GET', path: WEBHOOK_PATH }],
		properties: [],
	};

	async webhook() {
		return { webhookResponse: 'ok' };
	}
}

describe('production runs on the engine of the published version', () => {
	const nodeType = new TestTriggerNode();
	const nodeTypes = mockInstance(NodeTypes);
	nodeTypes.getByName.mockReturnValue(nodeType);
	nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

	let owner: User;
	let webhookAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.init();
		owner = await createOwner();

		const server = new WebhookServer();
		await server.start();
		webhookAgent = testAgent(server.app);
	});

	afterEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'WebhookEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const enableEngineV2Module = () =>
		vi
			.spyOn(Container.get(ModuleRegistry), 'isActive')
			.mockImplementation((name) => name === 'engine-v2');

	/** Published v1 version, and a newer draft version on v2 (an engine-only save). */
	const createPublishedV1WithV2Draft = async () => {
		const trigger: INode = {
			id: uuid(),
			name: 'Trigger',
			type: nodeType.description.name,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			webhookId: uuid(),
		};
		const workflow = await createActiveWorkflow(
			{ nodes: [trigger], connections: {}, settings: { engineType: 'v2' } },
			owner,
		);
		await Container.get(WorkflowHistoryRepository).update(
			{ versionId: workflow.versionId },
			{ settings: { engineType: 'v1' } },
		);
		const draft = await createWorkflowHistoryItem(workflow.id, {
			nodes: workflow.nodes,
			connections: workflow.connections,
			settings: { engineType: 'v2' },
		});
		await Container.get(WorkflowRepository).update(workflow.id, { versionId: draft.versionId });

		return { workflow, trigger };
	};

	/** Captures the run data that a trigger hands to the run, without running it. */
	const captureRunWorkflow = () =>
		vi.spyOn(Container.get(WorkflowExecutionService), 'runWorkflow').mockResolvedValue('exec-1');

	const engineOfRun = (runWorkflow: ReturnType<typeof captureRunWorkflow>) => {
		const workflowData = runWorkflow.mock.calls[0][0] as IWorkflowBase;
		return workflowData.settings?.engineType;
	};

	const additionalData = () => ({}) as IWorkflowExecuteAdditionalData;

	const toWorkflow = (workflow: WorkflowEntity) =>
		new Workflow({
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: true,
			nodeTypes,
			settings: workflow.settings,
		});

	test('a production webhook runs on the published engine', async () => {
		enableEngineV2Module();
		const handlesWorkflow = vi.spyOn(Container.get(EngineV2Dispatcher), 'handlesWorkflow');
		await createPublishedV1WithV2Draft();
		const activeWorkflowManager = await initActiveWorkflowManager();

		try {
			const response = await webhookAgent.get(`/webhook/${WEBHOOK_PATH}`);

			expect(response.statusCode).toBe(200);
			expect(handlesWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ settings: expect.objectContaining({ engineType: 'v1' }) }),
				'webhook',
			);
			expect(handlesWorkflow).toHaveLastReturnedWith(false);
		} finally {
			await activeWorkflowManager.removeAll();
		}
	});

	test('an active trigger runs on the published engine', async () => {
		enableEngineV2Module();
		const runWorkflow = captureRunWorkflow();
		const { workflow, trigger } = await createPublishedV1WithV2Draft();
		const factory = Container.get(TriggerExecutionContextFactory);

		// The resolver that the active workflow manager passes for a published workflow.
		const getTriggerFunctions = factory.getExecuteTriggerFunctions(
			workflow,
			additionalData(),
			'trigger',
			'activate',
			async () => await factory.loadPublishedWorkflowData(workflow.id),
			vi.fn(),
			mock(),
		);
		// The returned function closes over these; its signature still requires them.
		getTriggerFunctions(
			toWorkflow(workflow),
			trigger,
			additionalData(),
			'trigger',
			'activate',
		).emit([[{ json: {} }]]);

		await vi.waitFor(() => expect(runWorkflow).toHaveBeenCalled());
		expect(engineOfRun(runWorkflow)).toBe('v1');
	});

	test('a poll runs on the published engine', async () => {
		enableEngineV2Module();
		const runWorkflow = captureRunWorkflow();
		const { workflow, trigger } = await createPublishedV1WithV2Draft();

		const { pollFunctions } = await Container.get(
			TriggerExecutionContextFactory,
		).createPollExecutionContext(workflow, trigger);
		pollFunctions.__emit([[{ json: {} }]]);

		await vi.waitFor(() => expect(runWorkflow).toHaveBeenCalled());
		expect(engineOfRun(runWorkflow)).toBe('v1');
	});

	describe('schedule', () => {
		const runScheduledOccurrence = async () => {
			const runWorkflow = captureRunWorkflow();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData());
			const { workflow, trigger } = await createPublishedV1WithV2Draft();
			// Schedules read the published data from the cache that a publish fills.
			await Container.get(WorkflowPublishedDataService).refreshCache(workflow.id);

			const scheduledFor = new Date();
			const task: ClaimedTask = {
				id: uuid(),
				jobId: 1,
				taskType: 'workflow:schedule-trigger',
				payload: { workflowId: workflow.id, nodeId: trigger.id },
				scheduledFor,
				runAt: scheduledFor,
				status: 'running',
				attempts: 0,
				maxAttempts: 1,
				timeoutSeconds: 300,
				leaseEpoch: 1,
			};
			await Container.get(ScheduleTriggerTaskHandler).execute(
				task,
				createDispatchReporter(vi.fn()),
			);

			return engineOfRun(runWorkflow);
		};

		test('a scheduled occurrence runs on the published engine', async () => {
			enableEngineV2Module();

			expect(await runScheduledOccurrence()).toBe('v1');
		});

		test('a scheduled occurrence runs on the draft engine without the engine-v2 module, as before', async () => {
			expect(await runScheduledOccurrence()).toBe('v2');
		});
	});
});
