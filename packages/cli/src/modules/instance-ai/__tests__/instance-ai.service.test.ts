import type { z as zType } from 'zod';

// Manual mocks — must be declared before any imports that touch the mocked modules.
jest.mock('@n8n/instance-ai', () => {
	const { z } = jest.requireActual<{ z: typeof zType }>('zod');
	return {
		McpClientManager: class {
			getRegularTools = jest.fn().mockResolvedValue({});
			getBrowserTools = jest.fn().mockResolvedValue({});
			disconnect = jest.fn();
		},
		createDomainAccessTracker: jest.fn(),
		BuilderSandboxFactory: class {},
		SnapshotManager: class {},
		createSandbox: jest.fn(),
		createWorkspace: jest.fn(),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: jest.fn(),
		handleVerificationVerdict: jest.fn(),
		buildAgentTreeFromEvents: jest.fn(
			(events: Array<{ type: string; payload?: { text?: string } }>) => ({
				agentId: 'agent-001',
				role: 'orchestrator',
				status: 'completed',
				textContent: events
					.map((event) => (event.type === 'text-delta' ? (event.payload?.text ?? '') : ''))
					.join(''),
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
			}),
		),
		createInstanceAgent: jest.fn(),
		createAllTools: jest.fn(),
		createMemory: jest.fn(),
		mapMastraChunkToEvent: jest.fn(),
		InstanceAiTerminalResponseGuard: class {
			constructor(private readonly options: { runId: string; rootAgentId: string }) {}

			evaluateTerminal(
				_events: unknown[],
				status: 'completed' | 'cancelled' | 'errored',
				options: { errorMessage?: string } = {},
			) {
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
		resumeAgentRun: jest.fn(),
		TerminalOutcomeStorage: class {
			constructor(_memory: unknown) {}
		},
	};
});
jest.mock('@mastra/core/agent', () => ({}));
jest.mock('@mastra/core/storage', () => ({
	MemoryStorage: class {},
	MastraCompositeStore: class {},
	WorkflowsStorage: class {},
}));
jest.mock('@mastra/memory', () => ({
	Memory: class {},
}));
jest.mock('@mastra/core/workflows', () => ({}));

import type { User } from '@n8n/db';
import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';
import { resumeAgentRun, type TerminalResponseDecision } from '@n8n/instance-ai';

import { InstanceAiService } from '../instance-ai.service';
import { InstanceAiRunExecutionService } from '../run-execution/instance-ai-run-execution.service';
import type { MessageTraceFinalization } from '../tracing/instance-ai-trace.service';

const fakeUser = { id: 'user-1' } as User;

type StartRunServiceInternals = {
	startRun: InstanceAiService['startRun'];
	liveness: {
		clearThreadState: jest.MockedFunction<(threadId: string) => void>;
	};
	runState: {
		startRun: jest.MockedFunction<
			(options: { threadId: string; user: User; researchMode?: boolean }) => {
				runId: string;
				abortController: AbortController;
				messageGroupId?: string;
			}
		>;
		setTimeZone: jest.MockedFunction<(threadId: string, timeZone: string) => void>;
	};
	threadPushRef: Map<string, string>;
	executeRun: jest.Mock;
};

function createStartRunService(): StartRunServiceInternals {
	const service = Object.create(InstanceAiService.prototype) as unknown as StartRunServiceInternals;
	service.liveness = {
		clearThreadState: jest.fn((_threadId: string) => {}),
	};
	service.runState = {
		startRun: jest.fn((_options) => ({
			runId: 'run-1',
			abortController: new AbortController(),
			messageGroupId: 'group-1',
		})),
		setTimeZone: jest.fn(),
	};
	service.threadPushRef = new Map();
	service.executeRun = jest.fn();
	return service;
}

type TerminalGuardOrderServiceInternals = {
	evaluateTerminalResponse: (
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		options?: { messageGroupId?: string; errorMessage?: string },
	) => TerminalResponseDecision | undefined;
	evaluateWaitingResponse: (
		threadId: string,
		runId: string,
		confirmationEvent: Extract<InstanceAiEvent, { type: 'confirmation-request' }> | undefined,
		options?: { messageGroupId?: string },
	) => TerminalResponseDecision | undefined;
	finishInvalidConfirmationRun: (args: {
		threadId: string;
		runId: string;
		abortController: AbortController;
		snapshotStorage: unknown;
	}) => Promise<MessageTraceFinalization>;
	publishRunFinish: (
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
		archivedWorkflowIds?: string[],
	) => void;
	runState: {
		getRunIdsForMessageGroup: jest.Mock;
		cancelThread: jest.Mock;
		clearActiveRun: jest.Mock;
		hasSuspendedRun: jest.Mock;
	};
	eventBus: {
		events: InstanceAiEvent[];
		getEventsForRun: jest.Mock;
		getEventsForRuns: jest.Mock;
		publish: jest.Mock;
	};
	telemetry: { track: jest.Mock };
	logger: { warn: jest.Mock; error: jest.Mock };
	traceService: {
		getMessageGroupId: jest.Mock;
	};
	threadPushRef: Map<string, string>;
	finalizeRunTracing: jest.Mock;
	saveAgentTreeSnapshot: jest.Mock;
	reapAiTemporaryFromRun: jest.Mock;
	maybeFinalizeRunTraceRoot: jest.Mock;
	schedulePlannedTasks: jest.Mock;
	drainPendingCheckpointReentries: jest.Mock;
	processResumedStream: (
		agent: unknown,
		resumeData: unknown,
		opts: {
			runId: string;
			mastraRunId: string;
			threadId: string;
			user: User;
			toolCallId: string;
			signal: AbortSignal;
			abortController: AbortController;
			snapshotStorage: unknown;
		},
	) => Promise<void>;
	runExecutionService: InstanceAiRunExecutionService;
};

type SnapshotServiceInternals = {
	saveAgentTreeSnapshot: (
		threadId: string,
		runId: string,
		snapshotStorage: {
			getLatest: jest.Mock;
			save: jest.Mock;
			updateLast: jest.Mock;
		},
		isUpdate?: boolean,
		overrideMessageGroupId?: string,
	) => Promise<void>;
	runState: {
		getMessageGroupId: jest.Mock;
		getRunIdsForMessageGroup: jest.Mock;
	};
	eventBus: {
		getEventsForRun: jest.Mock;
		getEventsForRuns: jest.Mock;
	};
	traceService: {
		getTraceContext: jest.Mock;
	};
	logger: { warn: jest.Mock };
};

function createTerminalGuardOrderService(): TerminalGuardOrderServiceInternals {
	const events: InstanceAiEvent[] = [];
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as TerminalGuardOrderServiceInternals;
	service.runState = {
		getRunIdsForMessageGroup: jest.fn(() => ['run-1']),
		cancelThread: jest.fn(),
		clearActiveRun: jest.fn(),
		hasSuspendedRun: jest.fn(() => true),
	};
	service.eventBus = {
		events,
		getEventsForRun: jest.fn(() => events),
		getEventsForRuns: jest.fn(() => events),
		publish: jest.fn((_threadId: string, event: InstanceAiEvent) => {
			events.push(event);
		}),
	};
	service.telemetry = { track: jest.fn() };
	service.logger = { warn: jest.fn(), error: jest.fn() };
	service.traceService = { getMessageGroupId: jest.fn(() => 'group-1') };
	service.threadPushRef = new Map();
	service.finalizeRunTracing = jest.fn(async () => {});
	service.saveAgentTreeSnapshot = jest.fn(async () => {});
	service.reapAiTemporaryFromRun = jest.fn(async () => []);
	service.maybeFinalizeRunTraceRoot = jest.fn(async () => {});
	service.schedulePlannedTasks = jest.fn(async () => {});
	service.drainPendingCheckpointReentries = jest.fn(async () => {});
	service.runExecutionService = new InstanceAiRunExecutionService({
		instanceAiConfig: {} as never,
		defaultTimeZone: 'UTC',
		oauth2CallbackUrl: 'https://n8n.test/rest/oauth2-credential/callback',
		webhookBaseUrl: 'https://n8n.test/webhook',
		formBaseUrl: 'https://n8n.test/form',
		adapterService: {} as never,
		eventBus: service.eventBus as never,
		settingsService: {} as never,
		compositeStore: {} as never,
		compactionService: {} as never,
		aiService: {} as never,
		dbSnapshotStorage: {} as never,
		dbIterationLogStorage: {} as never,
		sourceControlPreferencesService: {} as never,
		telemetry: service.telemetry,
		logger: service.logger as never,
		mcpClientManager: {} as never,
		runState: service.runState as never,
		backgroundTasks: {} as never,
		gatewayRegistry: {} as never,
		domainAccessTrackersByThread: new Map(),
		threadPushRef: service.threadPushRef,
		liveness: {} as never,
		sandboxService: {} as never,
		traceService: service.traceService as never,
		createMemoryConfig: () => ({}) as never,
		ensureThreadExists: async () => {},
		resolveProxyModel: async () => ({}) as never,
		resolveAgentModelConfig: async () => ({}) as never,
		getOrCreateWorkspace: async () => undefined,
		createBuilderFactory: async () => undefined,
		cancelBackgroundTask: () => {},
		spawnBackgroundTask: () => ({ status: 'limit-reached' }),
		sendCorrectionToTask: () => 'task-not-found',
		getCheckpointAllowedWorkflowIds: async () => new Set(),
		evaluateTerminalResponse: (threadId, runId, status, options) =>
			service.evaluateTerminalResponse(threadId, runId, status, options),
		evaluateWaitingResponse: (threadId, runId, confirmationEvent, options) =>
			service.evaluateWaitingResponse(threadId, runId, confirmationEvent, options),
		finishInvalidConfirmationRun: async (args) => await service.finishInvalidConfirmationRun(args),
		configureTraceReplayMode: async () => {},
		storeTraceContext: () => {},
		finalizeRunTracing: async (...args) => {
			await service.finalizeRunTracing(...args);
		},
		maybeFinalizeRunTraceRoot: async (...args) => {
			await service.maybeFinalizeRunTraceRoot(...args);
		},
		reapAiTemporaryFromRun: async (...args) => await service.reapAiTemporaryFromRun(...args),
		finalizeRun: async () => {},
		publishRunFinish: (threadId, runId, status, reason, archivedWorkflowIds) =>
			service.publishRunFinish(threadId, runId, status, reason, archivedWorkflowIds),
		saveAgentTreeSnapshot: async (...args) => {
			await service.saveAgentTreeSnapshot(...args);
		},
		countCreditsIfFirst: async () => {},
		cleanupMastraSnapshots: async () => {},
		schedulePlannedTasks: async (...args) => {
			await service.schedulePlannedTasks(...args);
		},
		drainPendingCheckpointReentries: async (...args) => {
			await service.drainPendingCheckpointReentries(...args);
		},
		finalizeCheckpointFollowUp: async () => {},
	});
	return service;
}

function createSnapshotService(): SnapshotServiceInternals {
	const service = Object.create(InstanceAiService.prototype) as unknown as SnapshotServiceInternals;
	service.runState = {
		getMessageGroupId: jest.fn(() => undefined),
		getRunIdsForMessageGroup: jest.fn(() => []),
	};
	service.eventBus = {
		getEventsForRun: jest.fn(() => []),
		getEventsForRuns: jest.fn(() => []),
	};
	service.traceService = { getTraceContext: jest.fn(() => undefined) };
	service.logger = { warn: jest.fn() };
	return service;
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

type RevalidationServiceInternals = {
	revalidateActiveUser: (userId: string) => Promise<User | null>;
	userRepository: { findOne: jest.Mock };
	logger: { debug: jest.Mock; warn: jest.Mock; error: jest.Mock };
};

function createRevalidationService(): RevalidationServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as RevalidationServiceInternals;
	service.userRepository = { findOne: jest.fn() };
	service.logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
	return service;
}

function userWithScopes(scopes: string[], overrides: Partial<User> = {}): User {
	return {
		id: 'user-1',
		disabled: false,
		role: { scopes: scopes.map((slug) => ({ slug })) },
		...overrides,
	} as unknown as User;
}

describe('InstanceAiService — startRun', () => {
	it('clears the active-timeout guard when the user starts a new run', () => {
		const service = createStartRunService();

		service.startRun(fakeUser, 'thread-a', 'try again');

		expect(service.liveness.clearThreadState).toHaveBeenCalledWith('thread-a');
		expect(service.executeRun).toHaveBeenCalled();
	});
});

describe('InstanceAiService — revalidateActiveUser', () => {
	it('returns the user when active and scoped for AI Assistant', async () => {
		const service = createRevalidationService();
		const fresh = userWithScopes(['instanceAi:message']);
		service.userRepository.findOne.mockResolvedValue(fresh);

		const result = await service.revalidateActiveUser('user-1');

		expect(result).toBe(fresh);
		expect(service.userRepository.findOne).toHaveBeenCalledWith({
			where: { id: 'user-1' },
			relations: ['role'],
		});
	});

	it('returns null when the user no longer exists', async () => {
		const service = createRevalidationService();
		service.userRepository.findOne.mockResolvedValue(null);

		const result = await service.revalidateActiveUser('user-gone');

		expect(result).toBeNull();
	});

	it('returns null when the user has been disabled', async () => {
		const service = createRevalidationService();
		service.userRepository.findOne.mockResolvedValue(
			userWithScopes(['instanceAi:message'], { disabled: true }),
		);

		const result = await service.revalidateActiveUser('user-1');

		expect(result).toBeNull();
	});

	it('returns null when the user lost the instanceAi:message scope', async () => {
		const service = createRevalidationService();
		service.userRepository.findOne.mockResolvedValue(userWithScopes(['workflow:read']));

		const result = await service.revalidateActiveUser('user-1');

		expect(result).toBeNull();
	});

	it('returns null and logs when the lookup throws', async () => {
		const service = createRevalidationService();
		service.userRepository.findOne.mockRejectedValue(new Error('db down'));

		const result = await service.revalidateActiveUser('user-1');

		expect(result).toBeNull();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Failed to revalidate user',
			expect.objectContaining({ userId: 'user-1' }),
		);
	});
});

type ResolveConfirmationServiceInternals = {
	resolveConfirmation: (
		requestingUserId: string,
		requestId: string,
		request: { kind: 'approval'; approved: boolean; userInput?: string },
	) => Promise<boolean>;
	revalidateActiveUser: jest.Mock<Promise<User | null>, [string]>;
	cancelRun: jest.Mock<void, [string]>;
	runState: {
		resolvePendingConfirmation: jest.Mock;
		findSuspendedByRequestId: jest.Mock;
		rejectPendingConfirmation: jest.Mock;
	};
	logger: { debug: jest.Mock; warn: jest.Mock; error: jest.Mock };
};

function createResolveConfirmationService(): ResolveConfirmationServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as ResolveConfirmationServiceInternals;
	service.revalidateActiveUser = jest.fn();
	service.cancelRun = jest.fn();
	service.runState = {
		resolvePendingConfirmation: jest.fn(),
		findSuspendedByRequestId: jest.fn(),
		rejectPendingConfirmation: jest.fn(),
	};
	service.logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
	return service;
}

describe('InstanceAiService — resolveConfirmation', () => {
	const approval = { kind: 'approval' as const, approved: true };

	it('rejects sub-agent confirmations when the user is no longer authorized', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue(null);
		service.runState.findSuspendedByRequestId.mockReturnValue(undefined);

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(false);
		expect(service.runState.rejectPendingConfirmation).toHaveBeenCalledWith('req-1');
		expect(service.runState.resolvePendingConfirmation).not.toHaveBeenCalled();
		expect(service.cancelRun).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Rejecting confirmation: user no longer authorized for AI Assistant',
			expect.objectContaining({ userId: 'user-1', requestId: 'req-1' }),
		);
	});

	it('cancels the suspended run owned by the requesting user when revalidation fails', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue(null);
		service.runState.findSuspendedByRequestId.mockReturnValue({
			threadId: 'thread-1',
			user: { id: 'user-1' },
		});

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(false);
		expect(service.runState.rejectPendingConfirmation).toHaveBeenCalledWith('req-1');
		expect(service.cancelRun).toHaveBeenCalledWith('thread-1');
	});

	it('does not cancel a suspended run owned by a different user when revalidation fails', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue(null);
		service.runState.findSuspendedByRequestId.mockReturnValue({
			threadId: 'thread-1',
			user: { id: 'someone-else' },
		});

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(false);
		expect(service.cancelRun).not.toHaveBeenCalled();
	});

	it('resolves the pending sub-agent confirmation when the user is still authorized', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(true);

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(true);
		expect(service.runState.resolvePendingConfirmation).toHaveBeenCalledWith(
			'user-1',
			'req-1',
			expect.objectContaining({ approved: true }),
		);
		expect(service.runState.rejectPendingConfirmation).not.toHaveBeenCalled();
		expect(service.cancelRun).not.toHaveBeenCalled();
	});
});

describe('InstanceAiService — agent tree snapshots', () => {
	it('falls back to persisted run ids when an old background group mapping was pruned', async () => {
		const service = createSnapshotService();
		const terminalEvent: InstanceAiEvent = {
			type: 'text-delta',
			runId: 'run-background',
			agentId: 'agent-001',
			payload: { text: 'background finished' },
		};
		const snapshotStorage = {
			getLatest: jest.fn(async () => ({
				tree: makeAgentTree(),
				runId: 'run-original',
				messageGroupId: 'group-old',
				runIds: ['run-original', 'run-background'],
			})),
			save: jest.fn(async () => {}),
			updateLast: jest.fn(async () => {}),
		};
		service.eventBus.getEventsForRuns.mockReturnValue([terminalEvent]);

		await service.saveAgentTreeSnapshot(
			'thread-a',
			'run-background',
			snapshotStorage,
			true,
			'group-old',
		);

		expect(service.runState.getRunIdsForMessageGroup).toHaveBeenCalledWith('group-old');
		expect(snapshotStorage.getLatest).toHaveBeenCalledWith('thread-a', {
			messageGroupId: 'group-old',
			runId: 'run-background',
		});
		expect(service.eventBus.getEventsForRuns).toHaveBeenCalledWith('thread-a', [
			'run-original',
			'run-background',
		]);
		expect(snapshotStorage.updateLast).toHaveBeenCalledWith(
			'thread-a',
			expect.objectContaining({ textContent: 'background finished' }),
			'run-background',
			expect.objectContaining({
				messageGroupId: 'group-old',
				runIds: ['run-original', 'run-background'],
			}),
		);
		expect(snapshotStorage.save).not.toHaveBeenCalled();
	});

	it('skips update snapshots when no events are available for a pruned group', async () => {
		const service = createSnapshotService();
		const snapshotStorage = {
			getLatest: jest.fn(async () => ({
				tree: makeAgentTree(),
				runId: 'run-original',
				messageGroupId: 'group-old',
				runIds: ['run-background'],
			})),
			save: jest.fn(async () => {}),
			updateLast: jest.fn(async () => {}),
		};

		await service.saveAgentTreeSnapshot(
			'thread-a',
			'run-background',
			snapshotStorage,
			true,
			'group-old',
		);

		expect(snapshotStorage.updateLast).not.toHaveBeenCalled();
		expect(snapshotStorage.save).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Skipped updating empty Instance AI agent tree snapshot',
			expect.objectContaining({
				threadId: 'thread-a',
				runId: 'run-background',
				messageGroupId: 'group-old',
			}),
		);
	});
});

describe('InstanceAiService — terminal response guard wiring', () => {
	it('publishes fallback output before run-finish on a silent completed run', () => {
		const service = createTerminalGuardOrderService();

		service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});
		service.publishRunFinish('thread-a', 'run-1', 'completed');

		expect(service.eventBus.events.map((event) => event.type)).toEqual([
			'text-delta',
			'run-finish',
		]);
	});

	it('publishes fallback error before run-finish on a silent failed run', () => {
		const service = createTerminalGuardOrderService();

		service.evaluateTerminalResponse('thread-a', 'run-1', 'errored', {
			messageGroupId: 'group-1',
			errorMessage: 'Safe user-facing error',
		});
		service.publishRunFinish('thread-a', 'run-1', 'errored');

		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
	});

	it('clears malformed confirmation suspension and finishes the run after the guard error', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();

		const decision = service.evaluateWaitingResponse('thread-a', 'run-1', undefined, {
			messageGroupId: 'group-1',
		});
		if (decision?.reason === 'confirmation-invalid') {
			await service.finishInvalidConfirmationRun({
				threadId: 'thread-a',
				runId: 'run-1',
				abortController,
				snapshotStorage: {},
			});
		}

		expect(decision?.reason).toBe('confirmation-invalid');
		expect(service.runState.cancelThread).toHaveBeenCalledWith('thread-a');
		expect(abortController.signal.aborted).toBe(true);
		expect(service.saveAgentTreeSnapshot).toHaveBeenCalledWith('thread-a', 'run-1', {});
		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
		expect(service.eventBus.events.at(-1)).toMatchObject({
			type: 'run-finish',
			payload: { status: 'error' },
		});
	});

	it('persists the resumed-run fallback error before cleanup', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		jest.mocked(resumeAgentRun).mockRejectedValueOnce(new Error('provider failed'));

		await service.processResumedStream(
			{},
			{},
			{
				runId: 'run-1',
				mastraRunId: 'mastra-1',
				threadId: 'thread-a',
				user: fakeUser,
				toolCallId: 'tool-call-1',
				signal: abortController.signal,
				abortController,
				snapshotStorage: {},
			},
		);

		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
		expect(service.saveAgentTreeSnapshot).toHaveBeenCalledWith(
			'thread-a',
			'run-1',
			{},
			undefined,
			undefined,
		);
	});
});

describe('InstanceAiService — OAuth callback URL', () => {
	// Regression: the OAuth callback URL handed to the browser-credential-setup
	// sub-agent must come from urlService.getInstanceBaseUrl() (which honors
	// WEBHOOK_URL on cloud), not from globalConfig.editorBaseUrl with a
	// localhost fallback. With the old fallback the agent pasted
	// http://localhost:5678/... into the user's Slack app on a cloud instance.
	it('builds oauth2CallbackUrl from urlService.getInstanceBaseUrl()', () => {
		const source = InstanceAiService.toString();

		expect(source).toMatch(
			/this\.oauth2CallbackUrl\s*=[^;]*this\.urlService\.getInstanceBaseUrl\(\)[^;]*oauth2-credential\/callback/,
		);
	});

	it('does not fall back to localhost when editorBaseUrl is empty', () => {
		const source = InstanceAiService.toString();

		expect(source).not.toMatch(/globalConfig\.editorBaseUrl\s*\|\|/);
	});
});
