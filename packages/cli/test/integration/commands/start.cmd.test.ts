// Registers the zod `.alias()` extension start.ts's flags schema needs; must
// come before anything that imports the Start command.
import '@/zod-alias-support';

import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationOutboxRepository, WorkflowPublishedVersionRepository } from '@n8n/db';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	ActiveWorkflowTriggers,
	ErrorReporter,
	ExternalSecretsProxy,
	InstanceSettings,
} from 'n8n-core';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { INode } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { Start } from '@/commands/start';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { Push } from '@/push';
import { PubSubEventBus } from '@/scaling/pubsub/pubsub.eventbus';
import { DurableScheduler } from '@/scheduling/durable-scheduler';
import { Server } from '@/server';
import { OwnershipService } from '@/services/ownership.service';
import { ExecutionsPruningService } from '@/services/pruning/executions-pruning.service';
import { WorkflowHistoryCompactionService } from '@/services/pruning/workflow-history-compaction.service';
import { WorkflowStatisticsRollupService } from '@/services/workflow-statistics-rollup.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils/';

// The publication modules register their @OnPubSubEvent handlers only when
// `Start.run()` lazy-imports them, so this file must not import anything from
// `@/workflows/publication/*` statically — the precondition assert in the test
// keeps that honest. Everything mocked here is either the HTTP boundary or a
// timer-driven service irrelevant to the publication pubsub wiring under test.
mockInstance(Server);
mockInstance(ActiveExecutions);
mockInstance(Push);
mockInstance(ExternalSecretsProxy);
mockInstance(WorkflowService);
mockInstance(OwnershipService);
mockInstance(ExternalHooks);
mockInstance(ExecutionsPruningService);
mockInstance(WorkflowHistoryCompactionService);
mockInstance(WorkflowStatisticsRollupService);
mockInstance(N8NCheckpointStorage);
mockInstance(DurableScheduler);
mockInstance(ExecutionService).findAllEnqueuedExecutions.mockResolvedValue([]);

beforeAll(async () => {
	await testDb.init();
	await utils.initNodeTypes({
		'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
	});

	Container.get(InstanceSettings).markAsLeader();

	const workflowsConfig = Container.get(WorkflowsConfig);
	workflowsConfig.useWorkflowPublicationService = true;
	// Rule out the poll/reconcile/cleanup fallbacks so only the pubsub wake-up
	// can drain the outbox within the test's timeout.
	workflowsConfig.publicationOutboxPollIntervalMs = 3_600_000;
	workflowsConfig.publicationReconcileIntervalSeconds = 3_600;
	workflowsConfig.publicationOutboxCleanupIntervalSeconds = 3_600;
});

afterAll(async () => {
	const { WorkflowPublicationOutboxConsumer } = await import(
		'@/workflows/publication/workflow-publication-outbox-consumer.js'
	);
	const { WorkflowPublicationOutboxCleanupService } = await import(
		'@/workflows/publication/workflow-publication-outbox-cleanup.service.js'
	);
	const { WorkflowPublicationReconciler } = await import(
		'@/workflows/publication/workflow-publication-reconciler.service.js'
	);
	Container.get(WorkflowPublicationOutboxConsumer).stopPolling();
	Container.get(WorkflowPublicationOutboxCleanupService).stopCleanup();
	Container.get(WorkflowPublicationReconciler).stopReconciler();
	await Container.get(ActiveWorkflowManager).removeAll();
	await testDb.terminate();
});

describe('Start.run() with workflow publication service', () => {
	test('wires the workflow-publish-wake-up pubsub handler after loading the publication modules', async () => {
		const pubSubMetadata = Container.get(PubSubMetadata);
		const hasWakeUpHandler = () =>
			pubSubMetadata.getHandlers().some((h) => h.eventName === 'workflow-publish-wake-up');

		// The consumer must not be loaded before run(), otherwise this test can no
		// longer detect a PubSubRegistry.init() call mis-ordered before the lazy
		// publication imports.
		expect(hasWakeUpHandler()).toBe(false);

		const start = new Start();
		// @ts-expect-error Protected property, only used by run()'s consumer-init error path
		start.errorReporter = Container.get(ErrorReporter);
		// @ts-expect-error Read-only property, normally set by the command runner
		start.flags = {};
		await start.run();

		// Metadata proves the modules loaded; the listener proves run() re-ran
		// PubSubRegistry.init() after loading them (an init() before the lazy
		// imports — or none at all — leaves the event without a listener).
		expect(hasWakeUpHandler()).toBe(true);
		expect(Container.get(PubSubEventBus).listenerCount('workflow-publish-wake-up')).toBe(1);

		// An active, published workflow whose trigger is not yet registered in
		// memory — the state a wake-up drain must reconcile.
		const owner = await createOwner();
		const trigger: INode = {
			id: 'trigger',
			name: 'Schedule',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
			workflow.id,
			workflow.versionId,
		);

		const outboxRepository = Container.get(WorkflowPublicationOutboxRepository);
		await outboxRepository.enqueue(workflow.id, workflow.versionId);

		// What a follower's publish triggers on this (leader) instance via Redis.
		// Re-emitted per retry: a wake-up that lands while a previous drain is
		// still settling coalesces onto it, mirroring real pubsub delivery.
		await vi.waitFor(
			async () => {
				Container.get(PubSubEventBus).emit('workflow-publish-wake-up');
				const record = await outboxRepository.findOneBy({ workflowId: workflow.id });
				expect(record?.status).toBe('completed');
			},
			{ timeout: 15_000 },
		);

		expect(Container.get(ActiveWorkflowTriggers).get(workflow.id)?.has(trigger.id)).toBe(true);
	}, 30_000);
});
