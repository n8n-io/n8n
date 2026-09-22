import '@/zod-alias-support';

import { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection, SettingsRepository } from '@n8n/db';
import { SystemTaskMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { NextFunction, Request, Response } from 'express';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AuthService } from '@/auth/auth.service';
import { ControllerRegistry } from '@/controller.registry';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import { EnqueuedExecutionRecoveryService } from '@/executions/enqueued-execution-recovery.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { PrometheusMetricsService } from '@/metrics/prometheus/prometheus.service';
import { PrometheusSystemTaskMetricsService } from '@/metrics/prometheus/system-task-metrics.service';
import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import { PostHogClient } from '@/posthog';
import { Push } from '@/push';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { DurableScheduler } from '@/scheduling/durable-scheduler';
import { DummySystemTask } from '@/scheduling/system-tasks/__tests__/dummy.task';
import { mainSystemTasks } from '@/scheduling/system-tasks/main-system-tasks';
import { SystemTaskJobRegistrar } from '@/scheduling/system-tasks/system-task-job-registrar';
import { SystemTaskRunner } from '@/scheduling/system-tasks/system-task-runner';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';
import { ApiKeyAuthStrategy } from '@/services/api-key-auth.strategy';
import { ExecutionsPruningService } from '@/services/pruning/executions-pruning.service';
import { WorkflowHistoryCompactionService } from '@/services/pruning/workflow-history-compaction.service';
import { SessionCookieAuthStrategy } from '@/services/session-cookie-auth.strategy';
import { WorkflowStatisticsRollupService } from '@/services/workflow-statistics-rollup.service';
import { TestWebhooks } from '@/webhooks/test-webhooks';

import { Start } from '../start';

vi.mock('@/scheduling/system-tasks/main-system-tasks');
vi.mock('@/public-api', () => ({
	loadPublicApiVersions: async () => ({
		apiRouters: [(_req: Request, _res: Response, next: NextFunction) => next()],
		apiLatestVersion: 1,
	}),
}));
vi.mock('@/mfa/helpers', () => ({
	handleMfaDisable: async () => {},
	isMfaFeatureEnabled: () => false,
}));

/**
 * Boots the real `Start` command with the real system task collector, so the
 * order between the collector subscribing and the runner owning the registry is
 * covered. Every other service is mocked.
 */
describe('Start system task metrics', () => {
	const now = new Date('2026-01-01T00:00:00.000Z');
	const interval = 60 * 1000;

	let runner: SystemTaskRunner;
	let activeWorkflowManager: ActiveWorkflowManager;
	let dummy: DummySystemTask;

	/** Re-registered for every test, because each one starts from a reset container. */
	function mockServices() {
		mockInstance(Logger, mockLogger());
		mockInstance(DbConnection);
		mockInstance(ErrorReporter);
		mockInstance(LoadNodesAndCredentials);
		mockInstance(PostHogClient);
		mockInstance(Push, { isBidirectional: false });
		mockInstance(MessageEventBus);
		mockInstance(AuthService, { createAuthMiddleware: () => async (_req, _res, next) => next() });
		mockInstance(ApiKeyAuthStrategy);
		mockInstance(SessionCookieAuthStrategy);
		mockInstance(ControllerRegistry);
		mockInstance(PubSubRegistry);
		mockInstance(LogStreamingEventRelay);
		mockInstance(WorkflowIndexService);
		mockInstance(TestWebhooks);
		mockInstance(ExecutionsPruningService);
		mockInstance(WorkflowHistoryCompactionService);
		mockInstance(WorkflowStatisticsRollupService);
		mockInstance(EnqueuedExecutionRecoveryService);
		mockInstance(DurableScheduler);
		mockInstance(SystemTaskJobRegistrar);
		mockInstance(SystemTaskScheduledJobOwner);
		mockInstance(SettingsRepository, { findBy: async () => [] });
		activeWorkflowManager = mockInstance(ActiveWorkflowManager);

		// Keep the real system task collector. Other collectors are outside this test.
		mockInstance(PrometheusMetricsService, {
			init: () => Container.get(PrometheusSystemTaskMetricsService).init(),
		});
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
		Container.reset();
		promClient.register.clear();
		mockServices();

		const config = Container.get(GlobalConfig);
		config.endpoints.disableUi = true;
		config.endpoints.disableProductionWebhooksOnMainProcess = true;
		config.endpoints.metrics.enable = true;
		config.endpoints.metrics.includeSystemTaskMetrics = true;
		config.endpoints.metrics.prefix = 'n8n_';
		config.executions.mode = 'regular';
		config.workflows.useWorkflowPublicationService = false;
		config.credentials.overwrite.endpoint = '';

		Container.get(InstanceSettings).markAsLeader();
		Container.set(SystemTaskMetadata, new SystemTaskMetadata());
		dummy = new DummySystemTask();
		Container.set(DummySystemTask, dummy);
		vi.mocked(mainSystemTasks).mockResolvedValue([DummySystemTask]);
		runner = Container.get(SystemTaskRunner);
	});

	afterEach(async () => {
		await runner.shutdown();
		Container.get(EventService).removeAllListeners();
		promClient.register.clear();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	async function runStart() {
		const start = new Start();
		// oclif assigns these over its own lifecycle, which this test skips.
		Reflect.set(start, 'activeWorkflowManager', activeWorkflowManager);
		Reflect.set(start, 'flags', {});
		await start.run();
	}

	async function seriesOf(name: string) {
		const metric = promClient.register.getSingleMetric(`n8n_system_task_${name}`);
		return (await metric?.get())?.values ?? [];
	}

	const inMemoryDummy = { task: 'dummy', mode: 'in_memory' };

	it('seeds the in-memory series although a takeover preceded the collector', async () => {
		const events = Container.get(EventService);
		expect(events.listenerCount('system-task-timers-started')).toBe(0);

		// A multi-main leader check can win leadership at this point, before the
		// boot reaches the collector. Regular mode never takes that path, so the
		// takeover is applied directly.
		runner.startTimers();

		await runStart();

		for (const [name, value] of [
			['info', 1],
			['scheduled', 1],
			['runs_in_flight', 0],
		] as const) {
			expect(await seriesOf(name)).toContainEqual({ labels: inMemoryDummy, value });
		}

		await vi.advanceTimersByTimeAsync(interval);

		expect(dummy.runCount).toBe(1);
		expect(await seriesOf('last_success_timestamp_seconds')).toContainEqual({
			labels: inMemoryDummy,
			value: now.getTime() / 1000 + 60,
		});
	});

	it('exports no in-memory series on a follower', async () => {
		Container.get(InstanceSettings).markAsFollower();

		await runStart();

		expect(await seriesOf('info')).toEqual([]);

		await vi.advanceTimersByTimeAsync(interval);

		expect(dummy.runCount).toBe(0);
	});
});
