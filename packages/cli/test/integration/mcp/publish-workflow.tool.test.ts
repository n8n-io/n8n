import { createWorkflowWithHistory, mockInstance, testDb } from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { ActiveWorkflowTriggers, ExternalSecretsProxy, InstanceSettings } from 'n8n-core';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { INode } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { createPublishWorkflowTool } from '@/modules/mcp/tools/publish-workflow.tool';
import { Push } from '@/push';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
import { initNodeTypes } from '../shared/utils';

// Skip retry delays. Keep the real trigger activation and publication status writes.
vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn() }));

mockInstance(ActiveExecutions);
mockInstance(Push);
mockInstance(ExternalSecretsProxy);
mockInstance(ExecutionService);
mockInstance(ExternalHooks);
const telemetry = mockInstance(Telemetry);
const collaborationService = mockInstance(CollaborationService, {
	ensureWorkflowEditable: vi.fn().mockResolvedValue(undefined),
	broadcastWorkflowUpdate: vi.fn().mockResolvedValue(undefined),
});
const publicationNotifier = mockInstance(WorkflowPublicationNotifier);

const scheduleNode = (id: string, minutesInterval: number): INode => ({
	id,
	name: `Schedule ${id}`,
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1.3,
	position: [0, 0],
	parameters: { rule: { interval: [{ field: 'minutes', minutesInterval }] } },
});

describe('publish_workflow trigger activation', () => {
	let consumer: WorkflowPublicationOutboxConsumer;
	let outboxRepository: WorkflowPublicationOutboxRepository;
	let statusService: WorkflowPublicationStatusService;
	let originalUseWorkflowPublicationService: boolean;

	beforeAll(async () => {
		await testDb.init();
		await initNodeTypes({
			'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
		});

		const workflowsConfig = Container.get(WorkflowsConfig);
		originalUseWorkflowPublicationService = workflowsConfig.useWorkflowPublicationService;
		workflowsConfig.useWorkflowPublicationService = true;
		Container.get(InstanceSettings).markAsLeader();

		consumer = Container.get(WorkflowPublicationOutboxConsumer);
		outboxRepository = Container.get(WorkflowPublicationOutboxRepository);
		statusService = Container.get(WorkflowPublicationStatusService);
	});

	afterEach(async () => {
		await Container.get(ActiveWorkflowManager).removeAll();
		await testDb.truncate([
			'WorkflowPublishedVersion',
			'WorkflowPublicationOutbox',
			'WorkflowPublicationTriggerStatus',
			'WorkflowPublicationRetryState',
			'WorkflowPublishHistory',
			'WorkflowEntity',
			'WorkflowHistory',
			'Project',
			'User',
		]);
	});

	afterAll(async () => {
		Container.get(WorkflowsConfig).useWorkflowPublicationService =
			originalUseWorkflowPublicationService;
		await testDb.terminate();
	});

	async function publishAndActivate(nodes: INode[]) {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory(
			{ nodes, connections: {}, settings: { availableInMCP: true } },
			owner,
		);
		const publicationQueued = createDeferredPromise();
		publicationNotifier.requestDrain.mockImplementationOnce(() => publicationQueued.resolve());

		const tool = createPublishWorkflowTool(
			owner,
			Container.get(WorkflowFinderService),
			Container.get(WorkflowService),
			telemetry,
			collaborationService,
		);
		const response = tool.handler(
			{ workflowId: workflow.id },
			{} as Parameters<typeof tool.handler>[1],
		);

		// Start activation only after the publication transaction commits. Do not start a poll loop.
		await Promise.race([publicationQueued.promise, response]);
		const record = await outboxRepository.claimNextPendingRecord();
		expect(record).toMatchObject({
			workflowId: workflow.id,
			publishedVersionId: workflow.versionId,
			status: 'in_progress',
		});
		await consumer.processRecord(record!, new AbortController().signal);

		return { result: await response, workflow, recordId: record!.id };
	}

	test('returns success for a valid 30-minute schedule', async () => {
		const trigger = scheduleNode('valid', 30);
		const { result, workflow, recordId } = await publishAndActivate([trigger]);

		expect(await outboxRepository.findOneBy({ id: recordId })).toMatchObject({
			status: 'completed',
		});
		expect(await statusService.getStatus(workflow.id)).toMatchObject({
			status: 'published',
			liveVersionId: workflow.versionId,
			pendingVersionId: null,
			triggers: [{ nodeId: trigger.id, status: 'activated', errorMessage: null }],
		});
		expect(Container.get(ActiveWorkflowTriggers).get(workflow.id)?.has(trigger.id)).toBe(true);
		expect(result.structuredContent).toMatchObject({
			success: true,
			workflowId: workflow.id,
			activeVersionId: workflow.versionId,
		});
	});

	// CONTEXT-488: a committed publication request does not confirm that its triggers run.
	test.each([
		{ status: 'failed', outboxStatus: 'failed', includeValidTrigger: false },
		{ status: 'partial', outboxStatus: 'partial_success', includeValidTrigger: true },
	])(
		'reports the trigger error after a $status activation',
		async ({ status, outboxStatus, includeValidTrigger }) => {
			const invalidTrigger = scheduleNode('invalid', 60);
			const validTrigger = scheduleNode('valid', 30);
			const nodes = includeValidTrigger ? [invalidTrigger, validTrigger] : [invalidTrigger];
			const { result, workflow, recordId } = await publishAndActivate(nodes);

			expect(await outboxRepository.findOneBy({ id: recordId })).toMatchObject({
				status: outboxStatus,
				errorMessage: expect.stringContaining('Invalid interval'),
			});
			expect(await statusService.getStatus(workflow.id)).toMatchObject({
				status,
				liveVersionId: includeValidTrigger ? workflow.versionId : null,
				pendingVersionId: null,
				triggers: expect.arrayContaining([
					{
						nodeId: invalidTrigger.id,
						status: 'failed',
						errorMessage: expect.stringContaining('Invalid interval'),
					},
				]),
			});
			const registeredTriggers = Container.get(ActiveWorkflowTriggers).get(workflow.id);
			expect(registeredTriggers?.has(invalidTrigger.id) ?? false).toBe(false);
			expect(registeredTriggers?.has(validTrigger.id) ?? false).toBe(includeValidTrigger);

			expect(result.structuredContent).toMatchObject({
				success: false,
				workflowId: workflow.id,
				error: expect.stringContaining('Invalid interval'),
			});
		},
	);
});
