const terminalOutcomeStorageMock = {
	getUndelivered: vi.fn(),
	markDelivered: vi.fn(),
	upsert: vi.fn(),
};

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
	TerminalOutcomeStorage: class {
		getUndelivered = terminalOutcomeStorageMock.getUndelivered;
		markDelivered = terminalOutcomeStorageMock.markDelivered;
		upsert = terminalOutcomeStorageMock.upsert;
	},
}));

import type { Mock } from 'vitest';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { ManagedBackgroundTask, TerminalOutcome } from '@n8n/instance-ai';

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
	runState: { getRunIdsForMessageGroup: Mock; cancelThread: Mock };
	suspendedThreads: { dropPendingConfirmationsForThread: Mock };
	tracing: { finalizeRunTracing: Mock; buildMessageTraceMetadata: Mock };
	publishRunFinish: Mock;
};

function makeTerminalOutcome(overrides: Partial<TerminalOutcome> = {}): TerminalOutcome {
	return {
		id: 'group-1:task-1:completed',
		threadId: 'thread-a',
		runId: 'run-1',
		messageGroupId: 'group-1',
		correlationId: 'message-1',
		taskId: 'task-1',
		agentId: 'agent-builder',
		status: 'completed',
		userFacingMessage: 'The background workflow-builder task finished.',
		createdAt: '2026-05-01T00:00:00.000Z',
		...overrides,
	};
}

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
			cancelThread: vi.fn(),
		},
		suspendedThreads: { dropPendingConfirmationsForThread: vi.fn(async () => {}) },
		tracing: {
			finalizeRunTracing: vi.fn(async () => {}),
			buildMessageTraceMetadata: vi.fn(() => ({ completion_source: 'orchestrator' })),
		},
		publishRunFinish: vi.fn(
			(_threadId: string, runId: string, status: 'completed' | 'cancelled' | 'errored') => {
				events.push({
					type: 'run-finish',
					runId,
					agentId: 'agent-001',
					payload: { status: status === 'errored' ? 'error' : status },
				} as InstanceAiEvent);
			},
		),
	};

	const options = {
		eventBus: deps.eventBus,
		agentMemory: {},
		telemetry: deps.telemetry,
		errorReporter: deps.errorReporter,
		logger: deps.logger,
		runState: deps.runState,
		suspendedThreads: deps.suspendedThreads,
		tracing: deps.tracing,
		publishRunFinish: deps.publishRunFinish,
	} as unknown as InstanceAiTerminalOutcomeServiceOptions;

	return { service: new InstanceAiTerminalOutcomeService(options), deps };
}

beforeEach(() => {
	vi.clearAllMocks();
	terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([]);
	terminalOutcomeStorageMock.markDelivered.mockResolvedValue(undefined);
	terminalOutcomeStorageMock.upsert.mockResolvedValue(undefined);
});

describe('InstanceAiTerminalOutcomeService — terminal outcome replay', () => {
	it('publishes recovered background outcomes and marks them delivered', async () => {
		const outcome = makeTerminalOutcome();
		terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([outcome]);
		const { service, deps } = createService();

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(deps.eventBus.publish).toHaveBeenCalledWith('thread-a', {
			type: 'text-block',
			runId: outcome.runId,
			agentId: 'orchestrator-run-1',
			responseId: `background-outcome:${outcome.id}`,
			payload: { text: outcome.userFacingMessage },
		});
		expect(terminalOutcomeStorageMock.markDelivered).toHaveBeenCalledWith(
			'thread-a',
			outcome.id,
			expect.any(String),
		);
		expect(deps.telemetry.track).toHaveBeenCalledWith(
			'instance_ai_terminal_response_decision',
			expect.objectContaining({ source: 'terminal_outcome_replay', action: 'replay_event' }),
		);
	});

	it('deduplicates replay by response id only', async () => {
		const outcome = makeTerminalOutcome({ id: 'group-1:task-2:completed' });
		terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([outcome]);
		const { service, deps } = createService();
		// Same text under a different response id must not suppress the replay.
		deps.eventBus.events.push({
			type: 'text-block',
			runId: outcome.runId,
			agentId: 'orchestrator-run-1',
			responseId: 'background-outcome:different-id',
			payload: { text: outcome.userFacingMessage },
		} as InstanceAiEvent);

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(deps.eventBus.publish).toHaveBeenCalledTimes(1);
		expect(deps.eventBus.publish).toHaveBeenCalledWith(
			'thread-a',
			expect.objectContaining({ responseId: `background-outcome:${outcome.id}` }),
		);

		// A second replay finds the exact response id already emitted and skips it.
		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(deps.eventBus.publish).toHaveBeenCalledTimes(1);
		expect(deps.telemetry.track).toHaveBeenCalledWith(
			'instance_ai_terminal_response_decision',
			expect.objectContaining({ source: 'terminal_outcome_replay', action: 'already-emitted' }),
		);
	});

	it('leaves the outcome undelivered when publishing the line fails', async () => {
		const outcome = makeTerminalOutcome();
		terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([outcome]);
		const { service, deps } = createService();
		deps.eventBus.publish.mockImplementation(() => {
			throw new Error('bus unavailable');
		});

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(terminalOutcomeStorageMock.markDelivered).not.toHaveBeenCalled();
		expect(deps.logger.warn).toHaveBeenCalledWith(
			'Failed to replay Instance AI terminal outcome',
			expect.objectContaining({ threadId: 'thread-a', runId: outcome.runId }),
		);
	});

	it('leaves the outcome undelivered when the drain drops the published line', async () => {
		const outcome = makeTerminalOutcome();
		terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([outcome]);
		const { service, deps } = createService();
		// The publish enqueues without throwing, but the line never reaches the
		// log — the shape of a dropped drain batch.
		deps.eventBus.publish.mockImplementation(() => {});

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(terminalOutcomeStorageMock.markDelivered).not.toHaveBeenCalled();
		expect(deps.telemetry.track).not.toHaveBeenCalledWith(
			'instance_ai_terminal_response_decision',
			expect.anything(),
		);
	});

	it('checks persisted outcomes on repeated replay calls', async () => {
		const { service } = createService();

		await service.replayUndeliveredTerminalOutcomes('thread-a');
		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(terminalOutcomeStorageMock.getUndelivered).toHaveBeenCalledTimes(2);
	});
});

describe('InstanceAiTerminalOutcomeService — background outcome recording', () => {
	function makeTask(overrides: Partial<ManagedBackgroundTask> = {}): ManagedBackgroundTask {
		return {
			taskId: 'task-1',
			threadId: 'thread-a',
			runId: 'run-1',
			role: 'workflow-builder',
			agentId: 'agent-builder',
			status: 'completed',
			result: 'done',
			startedAt: 0,
			lastActivityAt: 0,
			abortController: new AbortController(),
			corrections: [],
			messageGroupId: 'group-1',
			...overrides,
		} as ManagedBackgroundTask;
	}

	it('persists, publishes, and marks the outcome delivered on success', async () => {
		const { service, deps } = createService();

		await service.recordBackgroundTerminalOutcome(makeTask());

		expect(terminalOutcomeStorageMock.upsert).toHaveBeenCalledTimes(1);
		expect(deps.eventBus.publish).toHaveBeenCalledWith(
			'thread-a',
			expect.objectContaining({
				type: 'text-block',
				payload: { text: 'The background workflow-builder task finished.' },
			}),
		);
		expect(terminalOutcomeStorageMock.markDelivered).toHaveBeenCalledTimes(1);
	});

	it('keeps the outcome pending and replays it later when persistence fails', async () => {
		terminalOutcomeStorageMock.upsert.mockRejectedValueOnce(new Error('db down'));
		const { service, deps } = createService();

		await service.recordBackgroundTerminalOutcome(makeTask());

		expect(deps.telemetry.track).toHaveBeenCalledWith(
			'instance_ai_terminal_outcome_persistence_failure',
			expect.objectContaining({ phase: 'metadata' }),
		);
		expect(terminalOutcomeStorageMock.markDelivered).not.toHaveBeenCalled();

		// The pending outcome is recovered on the next replay.
		await service.replayUndeliveredTerminalOutcomes('thread-a');
		expect(terminalOutcomeStorageMock.markDelivered).not.toHaveBeenCalled();
	});

	it('does not mark the outcome delivered when the drain drops the line', async () => {
		const { service, deps } = createService();
		deps.eventBus.publish.mockImplementation(() => {});

		await service.recordBackgroundTerminalOutcome(makeTask());

		expect(terminalOutcomeStorageMock.upsert).toHaveBeenCalledTimes(1);
		expect(terminalOutcomeStorageMock.markDelivered).not.toHaveBeenCalled();
		expect(deps.telemetry.track).toHaveBeenCalledWith(
			'instance_ai_terminal_outcome_persistence_failure',
			expect.objectContaining({ phase: 'event' }),
		);
		expect(deps.telemetry.track).not.toHaveBeenCalledWith(
			'instance_ai_terminal_response_decision',
			expect.anything(),
		);
	});
});

describe('InstanceAiTerminalOutcomeService — durable-log outcome lines', () => {
	it('publishes the outcome line as a persisted text-block, not a trailing delta', async () => {
		// A trailing delta would race the coalescer's idle flush on an immediate
		// page reload; a text-block is persisted before it is emitted live.
		const { deps } = createService();
		const service = new InstanceAiTerminalOutcomeService({
			eventBus: deps.eventBus,
			agentMemory: {},
			telemetry: deps.telemetry,
			logger: deps.logger,
			runState: deps.runState,
			suspendedThreads: deps.suspendedThreads,
			tracing: deps.tracing,
			publishRunFinish: deps.publishRunFinish,
		} as never);

		await service.recordBackgroundTerminalOutcome({
			taskId: 'task-dl',
			threadId: 'thread-dl',
			runId: 'run-dl',
			role: 'workflow-builder',
			agentId: 'agent-builder',
			status: 'cancelled',
			result: undefined,
			startedAt: 0,
			lastActivityAt: 0,
			abortController: new AbortController(),
			corrections: [],
		} as never);

		const line = deps.eventBus.events.find(
			(event) => event.type === 'text-block' || event.type === 'text-delta',
		);
		expect(line?.type).toBe('text-block');
	});
});

describe('InstanceAiTerminalOutcomeService — terminal response guard wiring', () => {
	it('publishes fallback output before run-finish on a silent completed run', async () => {
		const { service, deps } = createService();

		await service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});
		deps.publishRunFinish('thread-a', 'run-1', 'completed');

		expect(deps.eventBus.events.map((event) => event.type)).toEqual(['text-delta', 'run-finish']);
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

	it('publishes fallback error before run-finish on a silent failed run', async () => {
		const { service, deps } = createService();

		await service.evaluateTerminalResponse('thread-a', 'run-1', 'errored', {
			messageGroupId: 'group-1',
			errorMessage: 'Safe user-facing error',
		});
		deps.publishRunFinish('thread-a', 'run-1', 'errored');

		expect(deps.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
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

	it('clears malformed confirmation suspension and finishes the run after the guard error', async () => {
		const { service, deps } = createService();
		const abortController = new AbortController();

		const decision = await service.evaluateWaitingResponse('thread-a', 'run-1', undefined, {
			messageGroupId: 'group-1',
		});
		expect(decision?.reason).toBe('confirmation-invalid');

		const finalization = await service.finishInvalidConfirmationRun({
			threadId: 'thread-a',
			runId: 'run-1',
			abortController,
		});

		expect(finalization.status).toBe('error');
		expect(finalization.reason).toBe('invalid_confirmation_payload');
		expect(deps.runState.cancelThread).toHaveBeenCalledWith('thread-a');
		expect(deps.suspendedThreads.dropPendingConfirmationsForThread).toHaveBeenCalledWith(
			'thread-a',
		);
		expect(abortController.signal.aborted).toBe(true);
		expect(deps.eventBus.events.at(-1)).toMatchObject({
			type: 'run-finish',
			payload: { status: 'error' },
		});
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
