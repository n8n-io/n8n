import type { InstanceAiEvent } from '@n8n/api-types';

jest.mock('@n8n/instance-ai', () =>
	jest.requireActual('../../../../../@n8n/instance-ai/src/runtime/liveness-policy'),
);

import {
	createInstanceAiLivenessPolicyConfig,
	InstanceAiLivenessPolicy,
	type InstanceAiLivenessTimeoutReason,
} from '@n8n/instance-ai';

import { INSTANCE_AI_RUN_TIMEOUT_REASON, InstanceAiLivenessService } from '../liveness';

type TestSuspendedRun = {
	runId: string;
	threadId: string;
	abortController: AbortController;
};

function createLivenessService() {
	const policyConfig = createInstanceAiLivenessPolicyConfig();
	const policy = new InstanceAiLivenessPolicy(policyConfig);
	const runState = {
		sweepTimedOut: jest.fn((_policy: InstanceAiLivenessPolicy, _now?: number) => ({
			activeThreadIds: [] as string[],
			suspendedThreadIds: [] as string[],
			confirmationRequestIds: [] as string[],
		})),
		cancelActiveRun: jest.fn(
			(_threadId: string): { runId: string; abortController: AbortController } | undefined =>
				undefined,
		),
		cancelSuspendedRun: jest.fn((_threadId: string): TestSuspendedRun | undefined => undefined),
		getActiveRunId: jest.fn((_threadId: string): string | undefined => undefined),
		getPendingConfirmation: jest.fn(
			(_requestId: string): { threadId: string } | undefined => undefined,
		),
		rejectPendingConfirmation: jest.fn((_requestId: string) => true),
	};
	const backgroundTasks = {
		timeoutTimedOutTasks: jest.fn(
			async (_policy: InstanceAiLivenessPolicy, _now?: number) =>
				[] as Array<{
					threadId: string;
					taskId: string;
					role: string;
					timeoutReason?: InstanceAiLivenessTimeoutReason;
				}>,
		),
	};
	const eventBus = {
		getEventsForRun: jest.fn((_threadId: string, _runId: string) => [] as InstanceAiEvent[]),
		publish: jest.fn((_threadId: string, _event: InstanceAiEvent) => {}),
	};
	const finalizeCancelledSuspendedRun = jest.fn(
		(_suspended: TestSuspendedRun, _reason: string) => {},
	);
	const logger = {
		debug: jest.fn(),
		warn: jest.fn(),
	};

	const service = new InstanceAiLivenessService<TestSuspendedRun>({
		policy,
		backgroundTaskIdleTimeoutMs: policyConfig.backgroundTaskIdleTimeoutMs,
		runState,
		backgroundTasks,
		eventBus,
		finalizeCancelledSuspendedRun,
		logger,
	});

	return {
		service,
		policy,
		runState,
		backgroundTasks,
		eventBus,
		finalizeCancelledSuspendedRun,
		logger,
	};
}

describe('InstanceAiLivenessService', () => {
	it('cancels timed-out run surfaces without cascading into background tasks', async () => {
		const { service, policy, runState, backgroundTasks, eventBus, finalizeCancelledSuspendedRun } =
			createLivenessService();
		const activeAbortController = new AbortController();
		const suspendedAbortController = new AbortController();
		const suspended = {
			runId: 'run-suspended',
			threadId: 'thread-suspended',
			abortController: suspendedAbortController,
		};

		runState.sweepTimedOut.mockReturnValue({
			activeThreadIds: ['thread-active'],
			suspendedThreadIds: ['thread-suspended'],
			confirmationRequestIds: ['request-1'],
		});
		runState.cancelActiveRun.mockReturnValue({
			runId: 'run-active',
			abortController: activeAbortController,
		});
		runState.cancelSuspendedRun.mockReturnValue(suspended);
		runState.getPendingConfirmation.mockReturnValue({ threadId: 'thread-confirmation' });
		runState.getActiveRunId.mockReturnValue('run-confirmation');
		backgroundTasks.timeoutTimedOutTasks.mockResolvedValue([
			{
				threadId: 'thread-bg',
				taskId: 'task-1',
				role: 'workflow-builder',
				timeoutReason: 'idle_timeout',
			},
		]);

		await service.sweepTimedOutWork(123_456);

		expect(runState.sweepTimedOut).toHaveBeenCalledWith(policy, 123_456);
		expect(runState.cancelActiveRun).toHaveBeenCalledWith('thread-active');
		expect(runState.cancelSuspendedRun).toHaveBeenCalledWith('thread-suspended');
		expect(activeAbortController.signal.aborted).toBe(true);
		expect(suspendedAbortController.signal.aborted).toBe(true);
		expect(finalizeCancelledSuspendedRun).toHaveBeenCalledWith(
			suspended,
			INSTANCE_AI_RUN_TIMEOUT_REASON,
		);
		expect(runState.rejectPendingConfirmation).toHaveBeenCalledWith('request-1');
		expect(backgroundTasks.timeoutTimedOutTasks).toHaveBeenCalledWith(policy, 123_456);
		expect(eventBus.publish).toHaveBeenCalledWith(
			'thread-active',
			expect.objectContaining({ responseId: 'run-timeout:run-active' }),
		);
		expect(eventBus.publish).toHaveBeenCalledWith(
			'thread-confirmation',
			expect.objectContaining({ responseId: 'run-timeout:run-confirmation' }),
		);
		expect(service.consumeRunTimedOut('run-active')).toBe(true);
		expect(service.hasTimedOutActiveRunThread('thread-active')).toBe(true);
	});

	it('lets suspended-run finalization own the timeout notice', () => {
		const { service, runState, eventBus, finalizeCancelledSuspendedRun } = createLivenessService();
		const abortController = new AbortController();
		const suspended = {
			runId: 'run-suspended',
			threadId: 'thread-suspended',
			abortController,
		};
		runState.cancelSuspendedRun.mockReturnValue(suspended);

		service.cancelTimedOutSuspendedRun('thread-suspended');

		expect(eventBus.publish).not.toHaveBeenCalled();
		expect(finalizeCancelledSuspendedRun).toHaveBeenCalledWith(
			suspended,
			INSTANCE_AI_RUN_TIMEOUT_REASON,
		);
		expect(abortController.signal.aborted).toBe(true);
	});

	it('deduplicates timeout notices per run', () => {
		const { service, eventBus } = createLivenessService();
		eventBus.getEventsForRun.mockReturnValue([
			{
				type: 'text-delta',
				runId: 'run-1',
				agentId: 'agent-001',
				responseId: 'run-timeout:run-1',
				payload: { text: 'Already published' },
			},
		]);

		service.publishRunTimeoutNotice('thread-1', 'run-1');

		expect(eventBus.publish).not.toHaveBeenCalled();
	});

	it('keeps sweeping run state when background task timeout handling fails', async () => {
		const { service, backgroundTasks, logger } = createLivenessService();
		backgroundTasks.timeoutTimedOutTasks.mockRejectedValue(new Error('failed'));

		await service.sweepTimedOutWork();

		expect(logger.warn).toHaveBeenCalledWith('Failed to sweep timed-out background tasks', {
			error: 'failed',
		});
	});
});
