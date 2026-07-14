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
import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';
import type { ManagedBackgroundTask, TerminalOutcome } from '@n8n/instance-ai';

import {
	InstanceAiTerminalOutcomeService,
	type InstanceAiTerminalOutcomeServiceOptions,
} from '../instance-ai-terminal-outcome.service';

type SnapshotRow = {
	tree: InstanceAiAgentNode;
	runId: string;
	messageGroupId?: string;
	runIds?: string[];
	langsmithRunId?: string;
	langsmithTraceId?: string;
};

type Deps = {
	eventBus: {
		events: InstanceAiEvent[];
		getEventsForRun: Mock;
		getEventsForRuns: Mock;
		publish: Mock;
	};
	dbSnapshotStorage: {
		getLatest: Mock;
		save: Mock;
		updateLast: Mock;
	};
	telemetry: { track: Mock };
	logger: { warn: Mock; debug: Mock; error: Mock };
	runState: { getRunIdsForMessageGroup: Mock; cancelThread: Mock };
	suspendedThreads: { dropPendingConfirmationsForThread: Mock };
	tracing: { finalizeRunTracing: Mock; buildMessageTraceMetadata: Mock };
	publishRunFinish: Mock;
	saveAgentTreeSnapshot: Mock;
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

function makeAgentTree(): InstanceAiAgentNode {
	return {
		agentId: 'agent-001',
		role: 'orchestrator',
		status: 'completed',
		textContent: 'Initial response',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [{ type: 'text', content: 'Initial response' }],
	};
}

function createService(snapshotTree?: InstanceAiAgentNode): {
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
		dbSnapshotStorage: {
			getLatest: vi.fn(
				async (): Promise<SnapshotRow | undefined> =>
					snapshotTree
						? { tree: snapshotTree, runId: 'run-1', messageGroupId: 'group-1', runIds: ['run-1'] }
						: undefined,
			),
			save: vi.fn(async () => {}),
			updateLast: vi.fn(async () => {}),
		},
		telemetry: { track: vi.fn() },
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
		saveAgentTreeSnapshot: vi.fn(async () => {}),
	};

	const options = {
		eventBus: deps.eventBus,
		dbSnapshotStorage: deps.dbSnapshotStorage,
		agentMemory: {},
		telemetry: deps.telemetry,
		logger: deps.logger,
		runState: deps.runState,
		suspendedThreads: deps.suspendedThreads,
		tracing: deps.tracing,
		publishRunFinish: deps.publishRunFinish,
		saveAgentTreeSnapshot: deps.saveAgentTreeSnapshot,
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
	it('replays undelivered background outcomes into the persisted agent tree', async () => {
		const outcome = makeTerminalOutcome();
		terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([outcome]);
		const { service, deps } = createService(makeAgentTree());

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(deps.dbSnapshotStorage.updateLast).toHaveBeenCalledTimes(1);
		const updatedTree = deps.dbSnapshotStorage.updateLast.mock.calls[0][1] as InstanceAiAgentNode;
		expect(updatedTree.textContent).toContain(outcome.userFacingMessage);
		expect(updatedTree.timeline).toContainEqual({
			type: 'text',
			content: outcome.userFacingMessage,
			responseId: `background-outcome:${outcome.id}`,
		});
		expect(terminalOutcomeStorageMock.markDelivered).toHaveBeenCalledWith(
			'thread-a',
			outcome.id,
			expect.any(String),
		);
		expect(deps.eventBus.publish).not.toHaveBeenCalled();
	});

	it('publishes recovered background outcomes when replaying for SSE delivery', async () => {
		const outcome = makeTerminalOutcome();
		terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([outcome]);
		const { service, deps } = createService(makeAgentTree());

		await service.replayUndeliveredTerminalOutcomes('thread-a', { delivery: 'event' });

		expect(deps.dbSnapshotStorage.updateLast).toHaveBeenCalledTimes(1);
		expect(deps.eventBus.publish).toHaveBeenCalledWith('thread-a', {
			type: 'text-delta',
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
	});

	it('deduplicates replay by response id only', async () => {
		const outcome = makeTerminalOutcome({ id: 'group-1:task-2:completed' });
		const tree = makeAgentTree();
		tree.textContent = `${tree.textContent}\n\n${outcome.userFacingMessage}`;
		tree.timeline.push({
			type: 'text',
			content: outcome.userFacingMessage,
			responseId: 'background-outcome:different-id',
		});
		terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([outcome]);
		const { service, deps } = createService(tree);

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		const updatedTree = deps.dbSnapshotStorage.updateLast.mock.calls[0][1] as InstanceAiAgentNode;
		expect(
			updatedTree.timeline.filter(
				(entry) => entry.type === 'text' && entry.content === outcome.userFacingMessage,
			),
		).toHaveLength(2);
		expect(updatedTree.timeline).toContainEqual({
			type: 'text',
			content: outcome.userFacingMessage,
			responseId: `background-outcome:${outcome.id}`,
		});
	});

	it('creates a snapshot when replay has no prior agent tree', async () => {
		const outcome = makeTerminalOutcome({ status: 'failed' });
		terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([outcome]);
		const { service, deps } = createService();

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(deps.dbSnapshotStorage.save).toHaveBeenCalledTimes(1);
		const savedTree = deps.dbSnapshotStorage.save.mock.calls[0][1] as InstanceAiAgentNode;
		expect(savedTree.status).toBe('error');
		expect(savedTree.textContent).toBe(outcome.userFacingMessage);
		expect(terminalOutcomeStorageMock.markDelivered).toHaveBeenCalledWith(
			'thread-a',
			outcome.id,
			expect.any(String),
		);
	});

	it('publishes the deterministic line when snapshot replay fails', async () => {
		const outcome = makeTerminalOutcome();
		terminalOutcomeStorageMock.getUndelivered.mockResolvedValue([outcome]);
		const { service, deps } = createService(makeAgentTree());
		deps.dbSnapshotStorage.updateLast.mockRejectedValue(new Error('storage unavailable'));

		await service.replayUndeliveredTerminalOutcomes('thread-a', { delivery: 'event' });

		expect(deps.eventBus.publish).toHaveBeenCalledWith('thread-a', {
			type: 'text-delta',
			runId: outcome.runId,
			agentId: 'orchestrator-run-1',
			responseId: `background-outcome:${outcome.id}`,
			payload: { text: outcome.userFacingMessage },
		});
		expect(terminalOutcomeStorageMock.markDelivered).not.toHaveBeenCalled();
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
		const { service, deps } = createService(makeAgentTree());

		await service.recordBackgroundTerminalOutcome(makeTask());

		expect(terminalOutcomeStorageMock.upsert).toHaveBeenCalledTimes(1);
		expect(deps.eventBus.publish).toHaveBeenCalledWith(
			'thread-a',
			expect.objectContaining({
				type: 'text-delta',
				payload: { text: 'The background workflow-builder task finished.' },
			}),
		);
		expect(deps.dbSnapshotStorage.updateLast).toHaveBeenCalledTimes(1);
		expect(terminalOutcomeStorageMock.markDelivered).toHaveBeenCalledTimes(1);
	});

	it('keeps the outcome pending and replays it later when persistence fails', async () => {
		terminalOutcomeStorageMock.upsert.mockRejectedValueOnce(new Error('db down'));
		const { service, deps } = createService(makeAgentTree());

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
});

describe('InstanceAiTerminalOutcomeService — terminal response guard wiring', () => {
	it('publishes fallback output before run-finish on a silent completed run', () => {
		const { service, deps } = createService();

		service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});
		deps.publishRunFinish('thread-a', 'run-1', 'completed');

		expect(deps.eventBus.events.map((event) => event.type)).toEqual(['text-delta', 'run-finish']);
	});

	it('does not publish completed fallback output when silence is expected', () => {
		const { service, deps } = createService();

		const decision = service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
			suppressCompletedFallback: true,
		});

		expect(decision).toMatchObject({
			action: 'none',
			reason: 'completed-silent-suppressed',
		});
		expect(deps.eventBus.events).toEqual([]);
	});

	it('publishes fallback error before run-finish on a silent failed run', () => {
		const { service, deps } = createService();

		service.evaluateTerminalResponse('thread-a', 'run-1', 'errored', {
			messageGroupId: 'group-1',
			errorMessage: 'Safe user-facing error',
		});
		deps.publishRunFinish('thread-a', 'run-1', 'errored');

		expect(deps.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
	});

	it('forwards a structured error code onto the emitted error event', () => {
		const { service, deps } = createService();

		service.evaluateTerminalResponse('thread-a', 'run-1', 'errored', {
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

		const decision = service.evaluateWaitingResponse('thread-a', 'run-1', undefined, {
			messageGroupId: 'group-1',
		});
		expect(decision?.reason).toBe('confirmation-invalid');

		const finalization = await service.finishInvalidConfirmationRun({
			threadId: 'thread-a',
			runId: 'run-1',
			abortController,
			snapshotStorage: {} as never,
		});

		expect(finalization.status).toBe('error');
		expect(finalization.reason).toBe('invalid_confirmation_payload');
		expect(deps.runState.cancelThread).toHaveBeenCalledWith('thread-a');
		expect(deps.suspendedThreads.dropPendingConfirmationsForThread).toHaveBeenCalledWith(
			'thread-a',
		);
		expect(abortController.signal.aborted).toBe(true);
		expect(deps.saveAgentTreeSnapshot).toHaveBeenCalledWith('thread-a', 'run-1', {});
		expect(deps.eventBus.events.at(-1)).toMatchObject({
			type: 'run-finish',
			payload: { status: 'error' },
		});
	});

	it('reads events across the message group when a group id is provided', () => {
		const { service, deps } = createService();

		service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});

		expect(deps.runState.getRunIdsForMessageGroup).toHaveBeenCalledWith('group-1');
		expect(deps.eventBus.getEventsForRuns).toHaveBeenCalledWith('thread-a', ['run-1']);
	});

	it('falls back to the single run when the message group has no runs', () => {
		const { service, deps } = createService();
		deps.runState.getRunIdsForMessageGroup.mockReturnValue([]);

		service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});

		expect(deps.eventBus.getEventsForRun).toHaveBeenCalledWith('thread-a', 'run-1');
	});
});
