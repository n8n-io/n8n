import {
	createWorkflowHistory,
	createWorkflowWithHistory,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { CredentialsFinderService, NodeTypesProxy, RoleService } from '@n8n/backend-services';
import { WorkflowsConfig } from '@n8n/config';
import {
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { ActiveWorkflowTriggers, ExternalSecretsProxy, InstanceSettings } from 'n8n-core';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { createPublishWorkflowTool } from '@/modules/mcp/tools/publish-workflow.tool';
import { createWorkflowDetailsTool } from '@/modules/mcp/tools/get-workflow-details.tool';
import { Push } from '@/push';
import { ProjectService } from '@/services/project.service.ee';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
import { initNodeTypes } from '../shared/utils';

// Skip trigger retry delays. Keep the publication polling delay.
vi.mock('@n8n/utils/sleep', async (importOriginal) => {
	const { sleep } = await importOriginal<typeof import('@n8n/utils/sleep')>();
	return {
		sleep: vi.fn(async (ms: number, signal?: AbortSignal) => {
			if (ms < 1_000) await sleep(ms, signal);
		}),
	};
});

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
		publicationNotifier.requestDrain.mockReset();
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

	async function detailsFor(
		user: User,
		workflowId: string,
		detailLevel: 'full' | 'execution' = 'full',
	) {
		const tool = createWorkflowDetailsTool(
			user,
			'https://example.test',
			Container.get(WorkflowFinderService),
			mock<CredentialsService>(),
			mock<CredentialsFinderService>(),
			Container.get(NodeTypesProxy),
			{ webhook: 'webhook', webhookTest: 'webhook-test' },
			telemetry,
			Container.get(RoleService),
			Container.get(ProjectService),
			undefined,
			statusService,
		);
		return await tool.handler({ workflowId, detailLevel });
	}

	async function queuePublication(nodes: INode[]) {
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
			statusService,
		);
		const response = Promise.resolve(
			tool.handler({ workflowId: workflow.id }, {} as Parameters<typeof tool.handler>[1]),
		);
		let responseSettled = false;
		void response.then(() => {
			responseSettled = true;
		});

		// Start activation only after the publication transaction commits. Do not start a poll loop.
		await Promise.race([publicationQueued.promise, response]);
		const record = await outboxRepository.claimNextPendingRecord();
		if (!record) {
			throw new Error(
				`Publication was not queued: ${JSON.stringify((await response).structuredContent)}`,
			);
		}
		expect(record).toMatchObject({
			workflowId: workflow.id,
			publishedVersionId: workflow.versionId,
			status: 'in_progress',
		});
		const pendingDetails = await detailsFor(owner, workflow.id);
		expect(pendingDetails.structuredContent).toMatchObject({
			workflow: {
				active: false,
				publicationStatus: { status: 'in_progress', pendingVersionId: workflow.versionId },
			},
		});
		expect(responseSettled).toBe(false);
		return { response, workflow, owner, record: record! };
	}

	async function publishAndActivate(nodes: INode[]) {
		const { response, workflow, owner, record } = await queuePublication(nodes);
		await consumer.processRecord(record, new AbortController().signal);

		return { result: await response, workflow, owner, recordId: record.id };
	}

	test.each([30, 60])(
		'reports a %i-minute schedule activation in legacy publication mode',
		async (minutes) => {
			const workflowsConfig = Container.get(WorkflowsConfig);
			workflowsConfig.useWorkflowPublicationService = false;
			try {
				const owner = await createOwner();
				const workflow = await createWorkflowWithHistory(
					{
						nodes: [scheduleNode('schedule', minutes)],
						connections: {},
						settings: { availableInMCP: true },
					},
					owner,
				);
				const tool = createPublishWorkflowTool(
					owner,
					Container.get(WorkflowFinderService),
					Container.get(WorkflowService),
					telemetry,
					collaborationService,
				);

				const result = await tool.handler({ workflowId: workflow.id });

				expect(result.structuredContent).toMatchObject({
					success: minutes === 30,
					activeVersionId: minutes === 30 ? workflow.versionId : null,
					...(minutes === 60 ? { error: expect.stringContaining('Invalid interval') } : {}),
				});
			} finally {
				workflowsConfig.useWorkflowPublicationService = true;
			}
		},
	);

	test('reports a workflow as inactive after unpublication', async () => {
		const { workflow, owner } = await publishAndActivate([scheduleNode('valid', 30)]);

		await Container.get(WorkflowService).deactivateWorkflow(owner, workflow.id, {
			source: 'n8n-mcp',
		});
		const record = await outboxRepository.claimNextPendingRecord();
		expect(record).not.toBeNull();
		await consumer.processRecord(record!, new AbortController().signal);

		expect((await detailsFor(owner, workflow.id)).structuredContent).toMatchObject({
			workflow: {
				active: false,
				publicationStatus: { status: 'not_published', liveVersionId: null },
			},
		});
	});

	test('reports when unpublication replaces a pending publish of the same version', async () => {
		const { response, workflow, owner, record } = await queuePublication([
			scheduleNode('valid', 30),
		]);

		await Container.get(WorkflowService).deactivateWorkflow(owner, workflow.id, {
			source: 'n8n-mcp',
		});
		await consumer.processRecord(record, new AbortController().signal);
		const unpublishRecord = await outboxRepository.claimNextPendingRecord();
		expect(unpublishRecord).toMatchObject({ publishedVersionId: workflow.versionId });
		await consumer.processRecord(unpublishRecord!, new AbortController().signal);

		expect((await response).structuredContent).toMatchObject({
			success: false,
			activeVersionId: null,
			error: expect.stringContaining('Another publication replaced this request'),
		});
		expect((await detailsFor(owner, workflow.id)).structuredContent).toMatchObject({
			workflow: {
				active: false,
				publicationStatus: { status: 'not_published', liveVersionId: null },
			},
		});
	});

	test('returns success for a valid 30-minute schedule', async () => {
		const trigger = scheduleNode('valid', 30);
		const { result, workflow, owner, recordId } = await publishAndActivate([trigger]);

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
			publicationStatus: { status: 'published', versionId: workflow.versionId },
		});
		expect((await detailsFor(owner, workflow.id)).structuredContent).toMatchObject({
			workflow: { active: true, publicationStatus: { status: 'published' } },
		});
	});

	test('keeps a newer successful publication after completed outbox cleanup', async () => {
		const { workflow, owner, recordId } = await publishAndActivate([scheduleNode('invalid', 60)]);
		const versionId = uuid();
		await createWorkflowHistory(
			{ ...workflow, versionId, nodes: [scheduleNode('valid', 30)] },
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
			statusService,
		);
		const response = Promise.resolve(tool.handler({ workflowId: workflow.id, versionId }));
		await Promise.race([publicationQueued.promise, response]);
		const record = await outboxRepository.claimNextPendingRecord();
		expect(record).toMatchObject({ publishedVersionId: versionId });
		await consumer.processRecord(record!, new AbortController().signal);
		expect((await response).structuredContent).toMatchObject({ success: true });

		const completedAt = new Date(Date.now() - 2 * 60 * 60 * 1_000);
		await outboxRepository.update(recordId, {
			updatedAt: new Date(completedAt.getTime() - 60 * 60 * 1_000),
		});
		await outboxRepository.update(record!.id, { updatedAt: completedAt });
		await Container.get(WorkflowPublicationTriggerStatusRepository).update(
			{ workflowId: workflow.id },
			{ updatedAt: completedAt },
		);
		expect(await outboxRepository.deleteTerminalOlderThan(3_600, 7 * 86_400, 10)).toBe(1);
		expect(await outboxRepository.findLatestByWorkflowId(workflow.id)).toMatchObject({
			status: 'failed',
			publishedVersionId: workflow.versionId,
		});

		expect((await detailsFor(owner, workflow.id)).structuredContent).toMatchObject({
			workflow: {
				active: true,
				publicationStatus: {
					status: 'published',
					versionId,
					liveVersionId: versionId,
					errorMessage: null,
				},
			},
		});
		await expect(statusService.waitForPublication(workflow.id, versionId)).resolves.toMatchObject({
			status: 'published',
			versionId,
		});
	});

	test('returns a pending status that workflow details can poll', async () => {
		const { response, workflow, owner, record } = await queuePublication([
			scheduleNode('invalid', 60),
		]);

		const result = await response;
		expect(result.structuredContent).toMatchObject({
			success: false,
			activeVersionId: null,
			publicationStatus: {
				status: 'in_progress',
				versionId: workflow.versionId,
				pendingVersionId: workflow.versionId,
			},
		});
		expect((await detailsFor(owner, workflow.id)).structuredContent).toMatchObject({
			workflow: { active: false, publicationStatus: { status: 'in_progress' } },
		});

		await consumer.processRecord(record, new AbortController().signal);
		expect((await detailsFor(owner, workflow.id)).structuredContent).toMatchObject({
			workflow: {
				active: false,
				publicationStatus: {
					status: 'failed',
					versionId: workflow.versionId,
					errorMessage: expect.stringContaining('Invalid interval'),
				},
			},
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
			const { result, workflow, owner, recordId } = await publishAndActivate(nodes);

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
				publicationStatus: { status, versionId: workflow.versionId },
			});
			for (const detailLevel of ['full', 'execution'] as const) {
				expect((await detailsFor(owner, workflow.id, detailLevel)).structuredContent).toMatchObject(
					{
						workflow: {
							active: includeValidTrigger,
							publicationStatus: {
								status,
								versionId: workflow.versionId,
								liveVersionId: includeValidTrigger ? workflow.versionId : null,
								errorMessage: expect.stringContaining('Invalid interval'),
							},
						},
					},
				);
			}

			await outboxRepository.update(recordId, {
				updatedAt: new Date(Date.now() - 60_000),
			});
			expect(await outboxRepository.deleteTerminalOlderThan(1, 1, 10)).toBe(1);
			expect(await outboxRepository.findLatestByWorkflowId(workflow.id)).toBeNull();
			expect((await detailsFor(owner, workflow.id)).structuredContent).toMatchObject({
				workflow: {
					active: includeValidTrigger,
					publicationStatus: {
						status,
						versionId: workflow.versionId,
						errorMessage: expect.stringContaining('Invalid interval'),
					},
				},
			});
		},
	);
});
