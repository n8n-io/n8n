// Manual mock — must be declared before any import that touches the mocked module.
vi.mock('@n8n/instance-ai', () => ({
	orchestratorAgentId: (runId: string) => `orchestrator-${runId}`,
	InstanceAiTerminalResponseGuard: class {
		constructor(private readonly options: { runId: string; rootAgentId: string }) {}

		evaluateTerminal(
			_events: unknown[],
			status: 'completed' | 'cancelled' | 'errored',
			options: {
				errorMessage?: string;
				errorCode?: 'quota_exhausted';
				suppressCompletedFallback?: boolean;
			} = {},
		) {
			if (status === 'completed' && options.suppressCompletedFallback) {
				return {
					status,
					visibilitySource: 'none',
					action: 'none',
					reason: 'completed-silent-suppressed',
				};
			}

			if (status === 'errored') {
				return {
					status,
					visibilitySource: 'none',
					action: 'emit',
					reason: 'errored-silent',
					event: {
						type: 'error',
						runId: this.options.runId,
						agentId: this.options.rootAgentId,
						responseId: `terminal-fallback:${this.options.runId}:${status}`,
						payload: {
							content:
								options.errorMessage ??
								'I hit an error before I could finish that response. Please try again.',
							...(options.errorCode ? { code: options.errorCode } : {}),
						},
					},
				};
			}

			return {
				status,
				visibilitySource: 'none',
				action: 'emit',
				reason: status === 'cancelled' ? 'cancelled-silent' : 'completed-silent',
				event: {
					type: 'text-delta',
					runId: this.options.runId,
					agentId: this.options.rootAgentId,
					responseId: `terminal-fallback:${this.options.runId}:${status}`,
					payload: { text: `fallback:${status}` },
				},
			};
		}

		evaluateWaiting(_events: unknown[], confirmationEvent?: { payload?: { message?: string } }) {
			if (confirmationEvent?.payload?.message) {
				return {
					status: 'waiting',
					visibilitySource: 'confirmation-ui',
					action: 'none',
					reason: 'confirmation-visible',
				};
			}

			return {
				status: 'waiting',
				visibilitySource: 'none',
				action: 'emit',
				reason: 'confirmation-invalid',
				event: {
					type: 'error',
					runId: this.options.runId,
					agentId: this.options.rootAgentId,
					responseId: `terminal-fallback:${this.options.runId}:waiting`,
					payload: {
						content:
							'I need your input to continue, but I could not display the prompt. Please try again.',
					},
				},
			};
		}
	},
}));

import type { Mock } from 'vitest';
import type { InstanceAiEvent } from '@n8n/api-types';

import {
	InstanceAiTerminalOutcomeService,
	type InstanceAiTerminalOutcomeServiceOptions,
} from '../instance-ai-terminal-outcome.service';

type Deps = {
	eventBus: {
		events: InstanceAiEvent[];
		getEventsForRun: Mock;
		getEventsForRuns: Mock;
		publish: Mock;
	};
	telemetry: { track: Mock };
	errorReporter: { report: Mock };
	logger: { warn: Mock; debug: Mock; error: Mock };
	runState: { getRunIdsForMessageGroup: Mock };
};

function createService(): {
	service: InstanceAiTerminalOutcomeService;
	deps: Deps;
} {
	const events: InstanceAiEvent[] = [];
	const deps: Deps = {
		eventBus: {
			events,
			getEventsForRun: vi.fn(() => events),
			getEventsForRuns: vi.fn(() => events),
			publish: vi.fn((_threadId: string, event: InstanceAiEvent) => {
				events.push(event);
			}),
		},
		telemetry: { track: vi.fn() },
		errorReporter: { report: vi.fn() },
		logger: { warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
		runState: {
			getRunIdsForMessageGroup: vi.fn(() => ['run-1']),
		},
	};

	const options = {
		eventBus: deps.eventBus,
		telemetry: deps.telemetry,
		errorReporter: deps.errorReporter,
		logger: deps.logger,
		runState: deps.runState,
	} as unknown as InstanceAiTerminalOutcomeServiceOptions;

	return { service: new InstanceAiTerminalOutcomeService(options), deps };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('InstanceAiTerminalOutcomeService — terminal response guard wiring', () => {
	it('publishes fallback output on a silent completed run', async () => {
		const { service, deps } = createService();

		await service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});

		expect(deps.eventBus.events.map((event) => event.type)).toEqual(['text-delta']);
	});

	it('reports a silent completed run so the stall is not lost', async () => {
		const { service, deps } = createService();

		await service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});

		expect(deps.errorReporter.report).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({
				component: 'instance-ai-terminal-guard',
				severity: 'warning',
				threadId: 'thread-a',
				runId: 'run-1',
			}),
		);
	});

	it('does not report a completed run when silence is expected', async () => {
		const { service, deps } = createService();

		await service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
			suppressCompletedFallback: true,
		});

		expect(deps.errorReporter.report).not.toHaveBeenCalled();
	});

	it('does not publish completed fallback output when silence is expected', async () => {
		const { service, deps } = createService();

		const decision = await service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
			suppressCompletedFallback: true,
		});

		expect(decision).toMatchObject({
			action: 'none',
			reason: 'completed-silent-suppressed',
		});
		expect(deps.eventBus.events).toEqual([]);
	});

	it('publishes fallback error on a silent failed run', async () => {
		const { service, deps } = createService();

		await service.evaluateTerminalResponse('thread-a', 'run-1', 'errored', {
			messageGroupId: 'group-1',
			errorMessage: 'Safe user-facing error',
		});

		expect(deps.eventBus.events.map((event) => event.type)).toEqual(['error']);
	});

	it('forwards a structured error code onto the emitted error event', async () => {
		const { service, deps } = createService();

		await service.evaluateTerminalResponse('thread-a', 'run-1', 'errored', {
			messageGroupId: 'group-1',
			errorMessage: "You've run out of AI credits.",
			errorCode: 'quota_exhausted',
		});

		const errorEvent = deps.eventBus.events.find((event) => event.type === 'error');
		expect(errorEvent?.payload).toMatchObject({ code: 'quota_exhausted' });
	});

	it('publishes the guard error for a malformed confirmation', async () => {
		const { service, deps } = createService();

		const decision = await service.evaluateWaitingResponse('thread-a', 'run-1', undefined, {
			messageGroupId: 'group-1',
		});

		expect(decision?.reason).toBe('confirmation-invalid');
		expect(deps.eventBus.events.at(-1)).toMatchObject({ type: 'error' });
	});

	it('reads events across the message group when a group id is provided', async () => {
		const { service, deps } = createService();

		await service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});

		expect(deps.runState.getRunIdsForMessageGroup).toHaveBeenCalledWith('group-1');
		expect(deps.eventBus.getEventsForRuns).toHaveBeenCalledWith('thread-a', ['run-1']);
	});

	it('falls back to the single run when the message group has no runs', async () => {
		const { service, deps } = createService();
		deps.runState.getRunIdsForMessageGroup.mockReturnValue([]);

		await service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});

		expect(deps.eventBus.getEventsForRun).toHaveBeenCalledWith('thread-a', 'run-1');
	});
});
