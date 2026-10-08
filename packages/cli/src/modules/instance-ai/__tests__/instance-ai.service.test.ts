// Manual mocks — must be declared before any imports that touch the mocked modules.
vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	createScopedWorkspace: vi.fn((workspace: unknown) => workspace),
}));

vi.mock('@n8n/agents/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/sandbox')>()),
	getPromptWorkspaceRoot: vi.fn(() => '/home/daytona/workspace'),
	getWorkspaceRoot: vi.fn(async () => '/home/daytona/workspace'),
}));

vi.mock('@n8n/instance-ai', async () => {
	const { z } = await vi.importActual<typeof import('zod')>('zod');
	const profiles = await vi.importActual<typeof import('@n8n/instance-ai')>('@n8n/instance-ai');
	return {
		resolvePromptProfile: profiles.resolvePromptProfile,
		assertInstanceAiPromptVersion: profiles.assertInstanceAiPromptVersion,
		CONCISE_PROMPT_VERSION: profiles.CONCISE_PROMPT_VERSION,
		describePromptProfile: profiles.describePromptProfile,
		setTracePromptVersion: vi.fn(),
		setTraceModelId: vi.fn(),
		modelIdTraceMetadata: (modelId: unknown) =>
			typeof modelId === 'string' && modelId.length > 0 ? { model_id: modelId } : {},
		modelConfigId: (config: unknown) =>
			typeof config === 'string' && config.length > 0 ? config : undefined,
		// Wiring-only stub: the real mapping has its own unit tests
		// (instance-ai/src/tracing/__tests__/thread-provenance.test.ts). What the
		// service tests pin is that its OUTPUT reaches the trace — spreading an
		// undefined mock here is a no-op, so a missing entry would look like a
		// passing test with silently empty metadata.
		threadProvenanceMetadata: vi.fn(() => ({ thread_source: 'evals' })),
		orchestratorAgentId: (runId: string) => `orchestrator-${runId}`,
		deriveInstanceContextReach: profiles.deriveInstanceContextReach,
		WorkSummaryAccumulator: profiles.WorkSummaryAccumulator,
		mergeInstanceContextReach: profiles.mergeInstanceContextReach,
		suspendedInstanceContextSchema: profiles.suspendedInstanceContextSchema,
		patchThread: vi.fn(async () => {}),
		isSetupPanelEnabled: (context: { setupItemsEmitter?: unknown }) =>
			context.setupItemsEmitter !== undefined,
		createSetupItemsEmitter: vi.fn(() => ({
			emit: vi.fn(),
			announce: vi.fn(),
			merge: vi.fn(),
			workflowIds: vi.fn(),
			lastWorkflowId: vi.fn(),
		})),
		isQuotaExhaustedError: (error: unknown) =>
			typeof error === 'object' &&
			error !== null &&
			'errorCode' in error &&
			error.errorCode === 'quota_exhausted',
		McpClientManager: class {
			getRegularTools = vi.fn().mockResolvedValue({ tools: new Map(), connectionFailures: [] });
			disconnect = vi.fn();
		},
		createDomainAccessTracker: vi.fn(),
		emitAgentSnapshotTraceEvent: vi.fn(async () => await Promise.resolve('emitted')),
		createSandbox: vi.fn(),
		createWorkspace: vi.fn(),
		createLazyRuntimeWorkspace: vi.fn(
			(args: { id?: string; ensureWorkspace: () => Promise<unknown> }) => ({
				id: args.id ?? 'lazy-runtime-workspace',
				ensureWorkspace: args.ensureWorkspace,
			}),
		),
		createLazyWorkspaceRuntimeSkillSource: vi.fn(({ source }) => source),
		setupSandboxWorkspace: vi.fn(),
		traceSandboxOperation: vi.fn(
			async <T>(_operation: string, _options: unknown, fn: () => Promise<T>) => await fn(),
		),
		withSandboxLifecycleTrace: vi.fn(
			async <T>(_threadId: string, _operation: string, _inputs: unknown, fn: () => Promise<T>) =>
				await fn(),
		),
		loadInstanceAiPromptSkills: vi.fn(() => ({
			disabledTools: [],
			source: {
				registry: {
					skillsHash: 'runtime-skills-hash',
					skills: [{ id: 'data-table-manager' }],
				},
				loadSkill: vi.fn(),
			},
		})),
		disabledInstanceAiSkillIds: vi.fn(() => []),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: vi.fn(),
		handleVerificationVerdict: vi.fn(),
		buildAgentTreeFromEvents: vi.fn(
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
		createInstanceAgent: vi.fn(),
		tokenUsageToBuilderUsageItems: (
			model: string,
			usage: {
				completionTokens?: number;
				inputTokenDetails?: { noCache?: number; cacheRead?: number; cacheWrite?: number };
			},
		) => {
			const uncachedInput = usage.inputTokenDetails?.noCache ?? 0;
			const cacheRead = usage.inputTokenDetails?.cacheRead ?? 0;
			const cacheWrite = usage.inputTokenDetails?.cacheWrite ?? 0;
			const output = usage.completionTokens ?? 0;
			if (uncachedInput + cacheRead + cacheWrite + output === 0) return [];
			return [{ type: 'llmTokens', model, uncachedInput, cacheRead, cacheWrite, output }];
		},
		createOrchestratorRunControl: vi.fn(function () {
			return {
				state: undefined,
				getStopSignal: vi.fn(() => undefined),
				shouldEmitTerminalOutcome: vi.fn(() => true),
			};
		}),
		createOrchestratorRunControlForState: vi.fn(function () {
			return {
				state: undefined,
				getStopSignal: vi.fn(() => undefined),
				shouldEmitTerminalOutcome: vi.fn(() => true),
			};
		}),
		WorkflowTaskCoordinator: class {},
		WorkflowLoopStorage: class {},
		ThreadTaskStorage: class {},
		PlannedTaskStorage: class {},
		PlannedTaskCoordinator: class {},
		InstanceAiTerminalResponseGuard: class {
			constructor(private readonly options: { runId: string; rootAgentId: string }) {}

			evaluateTerminal(
				_events: unknown[],
				status: 'completed' | 'cancelled' | 'errored',
				options: { errorMessage?: string; suppressCompletedFallback?: boolean } = {},
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

				if (status === 'completed' && options.suppressCompletedFallback) {
					return {
						status,
						visibilitySource: 'none',
						action: 'none',
						reason: 'completed-silent-suppressed',
					};
				}

				// A stopped run needs no assistant placeholder — the UI shows the
				// stopped state itself.
				if (status === 'cancelled') {
					return {
						status,
						visibilitySource: 'none',
						action: 'none',
						reason: 'cancelled-silent',
					};
				}

				return {
					status,
					visibilitySource: 'none',
					action: 'emit',
					reason: 'completed-silent',
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
		getDateTimeSection: vi.fn(() => '2026-09-08T10:00:00Z'),
		createInstanceAiTraceContext: vi.fn(async () => ({ rootRun: { otelTraceId: undefined } })),
		shutdownProductTelemetryProviders: vi.fn(async () => {}),
		TerminalOutcomeStorage: class {
			constructor(_memory: unknown) {}
		},
	};
});

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

import type { AgentDbMessage, MemoryTaskUsageReport, ScopedMemoryTaskEvent } from '@n8n/agents';
import type { AiPreferencesAppliedPayload } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	createLazyRuntimeWorkspace,
	createLazyWorkspaceRuntimeSkillSource,
	createSetupItemsEmitter,
	createSandbox,
	createWorkspace,
	loadInstanceAiPromptSkills,
	setupSandboxWorkspace,
	shutdownProductTelemetryProviders,
	emitAgentSnapshotTraceEvent,
	type BuilderUsageItem,
	type InstanceAiTraceContext,
	type TraceStatus,
	type WorkflowVerificationObligation,
} from '@n8n/instance-ai';
import type { ErrorReporter } from 'n8n-core';
import type { Mock, MockedFunction } from 'vitest';

import { InstanceAiBuilderDelegateAdapterService } from '@/modules/agents/instance-ai-builder-delegate.adapter';
import { ForbiddenError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';
import {
	AI_PREFERENCES_CLEARED_BLOCK,
	renderAiPreferencesBlock,
} from '@/services/ai-preference.service';

import { EvalThreadCredentialAllowlistService } from '../eval/thread-credential-allowlist.service';
import { InstanceAiService } from '../instance-ai.service';
import { buildThreadArtifactsBlock, buildThreadContextBlock } from '../internal-messages';
import { InstanceAiSandboxService } from '../sandbox';

// The service reads Agents module services through getters. Tests build the
// service with `Object.create` and assign doubles, so turn the getters into
// settable slots. Both memory getters return the same Assistant memory.
for (const [key, slot] of [
	['agentMemory', 'memoryDouble'],
	['assistantMemory', 'memoryDouble'],
	['systemAgents', 'systemAgentsDouble'],
] as const) {
	Object.defineProperty(InstanceAiService.prototype, key, {
		configurable: true,
		get(this: Record<string, unknown>) {
			return this[slot];
		},
		set(this: Record<string, unknown>, value: unknown) {
			this[slot] = value;
		},
	});
}

type PruneServiceInternals = {
	pruneExpiredData: (now?: number, signal?: AbortSignal) => Promise<void>;
	pruneExpiredThreads: MockedFunction<(signal?: AbortSignal) => Promise<void>>;
	instanceAiConfig: { snapshotRetention: number };
	logger: { info: Mock; debug: Mock; warn: Mock };
};

function createPruneService(): PruneServiceInternals {
	const service = Object.create(InstanceAiService.prototype) as unknown as PruneServiceInternals;
	service.pruneExpiredThreads = vi.fn(async () => undefined);
	service.instanceAiConfig = { snapshotRetention: 24 * 60 * 60 * 1000 };
	service.logger = { info: vi.fn(), debug: vi.fn(), warn: vi.fn() };
	return service;
}

type MemoryTaskObserverServiceInternals = {
	memoryTaskObserverFor: (
		threadId: string,
		tracing: InstanceAiTraceContext | undefined,
	) => (event: ScopedMemoryTaskEvent) => void;
	memoryTaskRegistry: { handleEvent: Mock; getTasks: Mock };
	logger: { info: Mock };
};

function createMemoryTaskObserverService(): MemoryTaskObserverServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as MemoryTaskObserverServiceInternals;
	service.memoryTaskRegistry = { handleEvent: vi.fn(), getTasks: vi.fn(() => []) };
	service.logger = { info: vi.fn() };
	return service;
}

function queuedMemoryTaskEvent(): ScopedMemoryTaskEvent {
	return {
		type: 'queued',
		task: {
			id: 'task-1',
			taskKind: 'observer',
			observationScopeId: 'thread-1',
			status: 'queued',
			queuedAt: new Date(),
		},
	};
}

const fakeUser = { id: 'user-1' } as User;

function createInstanceAiErrorReporterMock() {
	return {
		report: vi.fn(),
		beginRun: vi.fn(() => Symbol('error-reporter-execution')),
		endRun: vi.fn(),
		endAllRuns: vi.fn(),
		withBoundary: vi.fn(
			async (_component: string, _context: unknown, fn: () => Promise<unknown>) => await fn(),
		),
	};
}

type ShutdownServiceInternals = {
	shutdown: () => Promise<void>;
	tracing: {
		finalizeRemainingMessageTraceRoots: MockedFunction<
			(threadId: string, options: unknown) => Promise<void>
		>;
		getTrackedThreadIds: MockedFunction<() => string[]>;
		clear: MockedFunction<() => void>;
	};
	gatewayService: { disconnectAll: MockedFunction<() => void> };
	sandboxService: { stopSandboxExpiryTimers: MockedFunction<() => void> };
	browserSessionService: { shutdown: MockedFunction<() => Promise<void>> };
	domainAccessTrackersByThread: Map<string, unknown>;
	_mcpClientManager?: { disconnect: MockedFunction<() => Promise<void>> };
	logger: { debug: Mock; warn: Mock };
	instanceAiErrorReporter: ReturnType<typeof createInstanceAiErrorReporterMock>;
};

type RunFinishServiceInternals = {
	eventBus: { publish: Mock };
	telemetry: { track: Mock };
	pendingBrowserCredentialSetups: Map<
		string,
		{
			userId: string;
			attempts: Array<{
				credentialType: string;
				setupMethod: 'setup_card' | 'conversation';
				attemptId?: string;
				startedAt: number;
				created: boolean;
				errorCode?: string;
			}>;
		}
	>;
	emitBrowserCredentialSetupOutcomes: (
		threadId: string,
		runId: string,
		runStatus: 'completed' | 'cancelled' | 'errored',
	) => void;
	publishRunFinish: (
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
	) => void;
};

function createRunFinishService(): RunFinishServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as RunFinishServiceInternals;
	service.eventBus = { publish: vi.fn() };
	service.telemetry = { track: vi.fn() };
	service.pendingBrowserCredentialSetups = new Map();
	return service;
}

describe('InstanceAiService — MCP connections availability', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		{ moduleActive: true, accessEnabled: true, expected: true },
		{ moduleActive: false, accessEnabled: true, expected: false },
		{ moduleActive: true, accessEnabled: false, expected: false },
	])(
		'returns $expected when moduleActive=$moduleActive and accessEnabled=$accessEnabled',
		({ moduleActive, accessEnabled, expected }) => {
			const service = Object.create(InstanceAiService.prototype) as unknown as {
				areMcpConnectionsAvailable: () => boolean;
				settingsService: { isMcpAccessEnabled: Mock };
			};
			service.settingsService = { isMcpAccessEnabled: vi.fn(() => accessEnabled) };
			vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
				if (token === ModuleRegistry) return { isActive: () => moduleActive };
				throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
			});

			expect(service.areMcpConnectionsAvailable()).toBe(expected);
		},
	);
});

describe('InstanceAiService — runtime workspace setup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(createSandbox as Mock).mockReset();
		(createWorkspace as Mock).mockReset();
		(setupSandboxWorkspace as Mock).mockReset();
		(createLazyRuntimeWorkspace as Mock).mockImplementation(
			(args: { id?: string; ensureWorkspace: () => Promise<unknown> }) => ({
				id: args.id ?? 'lazy-runtime-workspace',
				ensureWorkspace: args.ensureWorkspace,
			}),
		);
		(createLazyWorkspaceRuntimeSkillSource as Mock).mockImplementation(({ source }) => source);
		(loadInstanceAiPromptSkills as Mock).mockImplementation(() => ({
			disabledTools: [],
			source: {
				registry: {
					skillsHash: 'runtime-skills-hash',
					skills: [{ id: 'data-table-manager' }],
				},
				loadSkill: vi.fn(),
			},
		}));
	});

	type ContextGates = { instanceContextEnabled: boolean; nodeUsageEnabled: boolean };
	const environmentGates = [
		...['off', 'seeded', 'read failure'].flatMap((snapshotMode) =>
			[true, false].map((instanceContextEnabled) => ({
				snapshotMode,
				instanceContextEnabled,
				boundGates: undefined as ContextGates | undefined,
				resumeAgentBuild: false,
			})),
		),
		...[true, false].map((enabled) => ({
			snapshotMode: 'off',
			instanceContextEnabled: !enabled,
			boundGates: { instanceContextEnabled: enabled, nodeUsageEnabled: !enabled },
			resumeAgentBuild: enabled,
		})),
	];
	it.each(environmentGates)('starts with gates %j', async (gates) => {
		const { snapshotMode, instanceContextEnabled, boundGates, resumeAgentBuild } = gates;
		const service = Object.create(InstanceAiService.prototype) as unknown as {
			createExecutionEnvironment: (
				user: User,
				threadId: string,
				runId: string,
				abortSignal: AbortSignal,
				messageGroupId?: string,
				pushRef?: string,
				proxyRunConfig?: undefined,
				instanceContextGates?: ContextGates,
				experimentGates?: undefined,
				resumeAgentBuild?: boolean,
			) => Promise<{
				instanceContextEnabled: boolean;
				nodeUsageEnabled: boolean;
				orchestrationContext: {
					setupPanelEnabled?: boolean;
					workspace?: unknown;
					runtimeSkills?: {
						registry: { skillsHash: string; skills: Array<{ id: string }> };
						loadSkill: (skillId: string) => Promise<unknown>;
					};
					claimSubAgentUsage?: (
						dedupeId: string,
						usage: BuilderUsageItem[],
						status: TraceStatus,
					) => Promise<void>;
				};
			}>;
			settingsService: {
				getAdminSettings: Mock;
				getSandboxStatus: Mock;
				isLocalGatewayDisabledForUser: Mock;
				getPermissions: Mock;
			};
			gatewayService: { findGateway: Mock; applyToolPolicy: Mock };
			aiService: { isProxyEnabled: Mock };
			adapterService: {
				createContext: Mock;
				getNodeDefinitionDirs: Mock;
				resolveExperimentGates: Mock;
			};
			instanceWriteAccess: { isReadOnly: Mock };
			modelService: { resolveAgentModelConfig: Mock; resolveProxyModel: Mock };
			ensureThreadExists: Mock;
			systemAgents: unknown;
			agentMemory: unknown;
			dbIterationLogStorage: unknown;
			instanceAiConfig: Record<string, never>;
			aiConfig: Record<string, never>;
			defaultTimeZone: string;
			eventBus: { readSetupItems: Mock };
			logger: { warn: Mock };
			telemetry: { track: Mock };
			oauth2CallbackUrl: string;
			webhookBaseUrl: string;
			formBaseUrl: string;
			setupPanelByThread: Map<string, boolean>;
			schedulePlannedTasks: Mock;
			sandboxService: InstanceAiSandboxService;
			browserSessionService: { findMcpServer: Mock };
			domainAccessTrackersByThread: Map<string, unknown>;
			threadGrantRepo: { findKeys: Mock };
			evalCredentialAllowlists: EvalThreadCredentialAllowlistService;
			instanceAiErrorReporter: ReturnType<typeof createInstanceAiErrorReporterMock>;
			creditService: { claimRunUsage: Mock; ensureQuotaLockApplied: Mock };
			aiUsageService: { isParameterValueSharingAllowed: Mock };
			areMcpConnectionsAvailable: Mock;
		};
		service.areMcpConnectionsAvailable = vi.fn(() => true);
		service.settingsService = {
			getAdminSettings: vi.fn(() => ({ localGatewayDisabled: false, sandboxEnabled: true })),
			getSandboxStatus: vi.fn(() => ({
				enabled: true,
				provider: 'n8n-sandbox',
				workflowBuilderAvailable: true,
				unavailableReason: null,
			})),
			isLocalGatewayDisabledForUser: vi.fn(async () => false),
			getPermissions: vi.fn(() => ({})),
		};
		service.gatewayService = { findGateway: vi.fn(() => undefined), applyToolPolicy: vi.fn() };
		service.aiService = { isProxyEnabled: vi.fn(() => false) };
		service.adapterService = {
			createContext: vi.fn(() => ({})),
			getNodeDefinitionDirs: vi.fn(() => []),
			resolveExperimentGates: vi.fn().mockResolvedValue({
				setupPanelEnabled: snapshotMode !== 'off',
				setupPanelVariant: snapshotMode === 'off' ? 'control' : 'variant',
				configEvalsEnabled: true,
				conversationHistoryEnabled: false,
				progressiveBuildingEnabled: false,
				nodeUsageEnabled: !instanceContextEnabled,
				nodeContextEnabled: false,
				folderExplorationEnabled: false,
				aiPreferencesEnabled: false,
				instanceContextEnabled,
			}),
		};
		service.instanceWriteAccess = { isReadOnly: vi.fn(() => false) };
		service.modelService = {
			resolveAgentModelConfig: vi.fn(async () => 'model-1'),
			resolveProxyModel: vi.fn(async () => 'model-1'),
		};
		service.ensureThreadExists = vi.fn(async () => {});
		service.systemAgents = { findThread: vi.fn(async () => ({ projectId: 'project-1' })) };
		service.agentMemory = {
			getThread: vi.fn(async () => undefined),
		};
		service.dbIterationLogStorage = {};
		service.instanceAiConfig = {};
		service.aiConfig = {};
		service.defaultTimeZone = 'UTC';
		const initialSnapshots = [{ workflowId: 'wf-old', items: [] }];
		service.eventBus = { readSetupItems: vi.fn().mockResolvedValue(initialSnapshots) };
		if (snapshotMode === 'read failure') {
			service.eventBus.readSetupItems.mockRejectedValue(new Error('storage unavailable'));
		}
		service.logger = { warn: vi.fn() };
		service.telemetry = { track: vi.fn() };
		service.oauth2CallbackUrl = 'http://localhost/rest/oauth2-credential/callback';
		service.webhookBaseUrl = 'http://localhost/webhook';
		service.formBaseUrl = 'http://localhost/form';
		service.setupPanelByThread = new Map();
		service.schedulePlannedTasks = vi.fn();
		service.domainAccessTrackersByThread = new Map();
		service.browserSessionService = { findMcpServer: vi.fn(() => undefined) };
		service.threadGrantRepo = { findKeys: vi.fn(async () => new Set<string>()) };
		service.sandboxService = new InstanceAiSandboxService({
			config: { sandboxEnabled: true, sandboxProvider: 'daytona' } as InstanceAiConfig,
			logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
			errorReporter: { error: vi.fn() } as unknown as ErrorReporter,
			settingsService: {
				resolveDaytonaConfig: vi.fn(async () => ({ apiKey: 'test-daytona-key' })),
				resolveN8nSandboxConfig: vi.fn(async () => ({})),
			},
			aiService: { isProxyEnabled: vi.fn(() => false), getClient: vi.fn() },
		});
		service.evalCredentialAllowlists = new EvalThreadCredentialAllowlistService();
		service.instanceAiErrorReporter = createInstanceAiErrorReporterMock();
		service.aiUsageService = { isParameterValueSharingAllowed: vi.fn(async () => true) };
		service.creditService = {
			claimRunUsage: vi.fn(),
			ensureQuotaLockApplied: vi.fn(async () => {}),
		};
		const sandbox = { id: 'sandbox-1' };
		const workspace = {
			init: vi.fn(async () => {}),
			destroy: vi.fn(async () => {}),
		};
		(createSandbox as Mock).mockResolvedValue(sandbox);
		(createWorkspace as Mock).mockReturnValue(workspace);
		(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

		const environment = await service.createExecutionEnvironment(
			fakeUser,
			'thread-1',
			'run-1',
			new AbortController().signal,
			undefined,
			undefined,
			undefined,
			boundGates,
			undefined,
			resumeAgentBuild,
		);
		const expectedGates = boundGates ?? {
			instanceContextEnabled,
			nodeUsageEnabled: !instanceContextEnabled,
		};
		expect(environment).toMatchObject(expectedGates);
		expect(service.adapterService.createContext).toHaveBeenCalledWith(
			fakeUser,
			expect.objectContaining({
				...expectedGates,
				configEvalsEnabled: true,
				setupPanelVariant: snapshotMode === 'off' ? 'control' : 'variant',
				resumeAgentBuild,
			}),
		);
		expect(service.settingsService.getPermissions).toHaveBeenCalled();
		expect(environment.orchestrationContext.setupPanelEnabled).toBe(snapshotMode !== 'off');
		expect(service.setupPanelByThread.get('thread-1')).toBe(snapshotMode !== 'off');
		expect(service.adapterService.createContext).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ mcpConnectionsAvailable: true }),
		);
		if (snapshotMode === 'off') {
			expect(service.eventBus.readSetupItems).not.toHaveBeenCalled();
			expect(createSetupItemsEmitter).not.toHaveBeenCalled();
		} else {
			expect(createSetupItemsEmitter).toHaveBeenCalledWith(
				expect.objectContaining({
					initialSnapshots: snapshotMode === 'seeded' ? initialSnapshots : [],
				}),
			);
		}

		expect(createLazyRuntimeWorkspace).toHaveBeenCalledTimes(2);
		expect(createLazyRuntimeWorkspace).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ id: 'instance-ai-runtime-skill-workspace' }),
		);
		expect(createLazyWorkspaceRuntimeSkillSource).toHaveBeenCalledTimes(1);
		expect(loadInstanceAiPromptSkills).toHaveBeenCalledTimes(1);
		expect(environment.orchestrationContext.runtimeSkills?.registry.skills).toEqual([
			{ id: 'data-table-manager' },
		]);

		// The credit-metering hook is wired to the instance-AI thread/user in
		// scope here, not whatever thread the sub-agent stream itself is keyed to.
		const usageItem: BuilderUsageItem = {
			type: 'llmTokens',
			model: 'anthropic/claude-sonnet',
			uncachedInput: 80,
			cacheRead: 20,
			cacheWrite: 0,
			output: 20,
		};
		await environment.orchestrationContext.claimSubAgentUsage?.(
			'dedupe-1',
			[usageItem],
			'completed',
		);
		expect(service.creditService.claimRunUsage).toHaveBeenCalledWith(
			fakeUser,
			'thread-1',
			'dedupe-1',
			[usageItem],
			'completed',
		);

		// An unexpected claim rejection must not reject the awaited hook, and is
		// reported centrally, then logged, instead of breaking the builder flow.
		const claimError = new Error('claim failed');
		service.creditService.claimRunUsage.mockRejectedValueOnce(claimError);
		await expect(
			environment.orchestrationContext.claimSubAgentUsage?.('dedupe-2', [usageItem], 'completed'),
		).resolves.toBeUndefined();
		expect(service.instanceAiErrorReporter.report).toHaveBeenCalledWith(claimError, {
			component: 'instance-ai-agent-builder-usage',
			threadId: 'thread-1',
			runId: 'run-1',
			userId: fakeUser.id,
			projectId: 'project-1',
		});
		expect(service.logger.warn).toHaveBeenCalledWith('Failed to claim agent-builder usage', {
			threadId: 'thread-1',
			runId: 'run-1',
			dedupeId: 'dedupe-2',
			error: 'claim failed',
		});
		expect(service.instanceAiErrorReporter.report.mock.invocationCallOrder[0]).toBeLessThan(
			service.logger.warn.mock.invocationCallOrder.at(-1)!,
		);

		expect(createSandbox).not.toHaveBeenCalled();
		const skillWorkspace = (createLazyWorkspaceRuntimeSkillSource as Mock).mock.calls[0]?.[0]
			.workspace as { ensureWorkspace: () => Promise<unknown> };
		const lazyWorkspace = environment.orchestrationContext.workspace as {
			ensureWorkspace: () => Promise<unknown>;
		};

		await skillWorkspace.ensureWorkspace();

		expect(createSandbox).toHaveBeenCalledTimes(1);
		expect(createWorkspace).toHaveBeenCalledTimes(1);
		expect(workspace.init).toHaveBeenCalledTimes(1);
		expect(setupSandboxWorkspace).not.toHaveBeenCalled();

		await lazyWorkspace.ensureWorkspace();

		expect(createSandbox).toHaveBeenCalledTimes(1);
		expect(createSandbox).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'instance-ai-thread-thread-1',
				name: 'instance-ai-thread-thread-1',
				labels: expect.objectContaining({
					'n8n-builder': 'instance-ai-thread-thread-1',
					thread_id: 'thread-1',
				}),
			}),
			expect.objectContaining({ useSnapshotFallback: true }),
		);
		expect(createWorkspace).toHaveBeenCalledTimes(1);
		expect(createWorkspace).toHaveBeenCalledWith(sandbox);
		expect(workspace.init).toHaveBeenCalledTimes(1);
		expect(setupSandboxWorkspace).toHaveBeenCalledTimes(1);

		(createLazyRuntimeWorkspace as Mock).mockClear();
		(createLazyWorkspaceRuntimeSkillSource as Mock).mockClear();
		(createSandbox as Mock).mockClear();
		(setupSandboxWorkspace as Mock).mockClear();
		(loadInstanceAiPromptSkills as Mock).mockClear();
		service.settingsService.getSandboxStatus.mockReturnValue({
			enabled: true,
			provider: 'n8n-sandbox',
			workflowBuilderAvailable: false,
			unavailableReason: 'N8N_SANDBOX_SERVICE_URL is required.',
		});

		const unavailableEnvironment = await service.createExecutionEnvironment(
			fakeUser,
			'thread-2',
			'run-2',
			new AbortController().signal,
		);

		expect(unavailableEnvironment.orchestrationContext.workspace).toBeUndefined();
		// Without a sandbox the runtime skill catalog is used as-is (no
		// workspace-materialized wrapper).
		expect(unavailableEnvironment.orchestrationContext.runtimeSkills?.registry.skills).toEqual([
			{ id: 'data-table-manager' },
		]);
		expect(createLazyRuntimeWorkspace).not.toHaveBeenCalled();
		expect(createLazyWorkspaceRuntimeSkillSource).not.toHaveBeenCalled();
		expect(createSandbox).not.toHaveBeenCalled();
		expect(setupSandboxWorkspace).not.toHaveBeenCalled();
	});

	// [progressive flag, stored mode, pinned version, concise flag, expected profile]
	it.each([
		[false, undefined, undefined, false, 'default@1'],
		[true, undefined, undefined, false, 'progressive@1'],
		[true, 'default', undefined, false, 'default@1'],
		[false, 'progressive', undefined, false, 'progressive@1'],
		[true, 'progressive', 'default@1', false, 'default@1'],
		[false, 'default', 'progressive@1', false, 'progressive@1'],
		[true, 'progressive', 'retired@1', false, 'default@1'],
		// The concise flag applies only in default mode, and any pin beats it.
		[false, undefined, undefined, true, 'concise@1'],
		[false, 'default', undefined, true, 'concise@1'],
		[true, undefined, undefined, true, 'progressive@1'],
		[false, 'progressive', undefined, true, 'progressive@1'],
		[false, undefined, 'default@1', true, 'default@1'],
	] as const)('selects profile (%s, %s, %s, %s) as %s', async (...row) => {
		const [enabled, override, version, concise, profile] = row;
		const expected = profile === 'progressive@1' ? 'progressive' : 'default';
		const service = Object.create(InstanceAiService.prototype) as unknown as {
			createExecutionEnvironment: (
				user: User,
				threadId: string,
				runId: string,
				abortSignal: AbortSignal,
				messageGroupId?: string,
				pushRef?: string,
				proxyRunConfig?: undefined,
				instanceContextGates?: undefined,
				experimentGates?: undefined,
				resumeAgentBuild?: boolean,
				turnOptions?: { buildMode?: 'default' | 'progressive'; promptVersion?: string },
			) => Promise<{
				buildMode: string;
				orchestrationContext: {
					outputRedaction?: unknown;
					workspace?: unknown;
					runtimeSkills?: {
						registry: { skillsHash: string; skills: Array<{ id: string }> };
						loadSkill: (skillId: string) => Promise<unknown>;
					};
					claimSubAgentUsage?: (
						dedupeId: string,
						usage: BuilderUsageItem[],
						status: TraceStatus,
					) => Promise<void>;
				};
			}>;
			settingsService: {
				getAdminSettings: Mock;
				getSandboxStatus: Mock;
				isLocalGatewayDisabledForUser: Mock;
				getPermissions: Mock;
			};
			gatewayService: { findGateway: Mock; applyToolPolicy: Mock };
			aiService: { isProxyEnabled: Mock };
			adapterService: {
				createContext: Mock;
				getNodeDefinitionDirs: Mock;
				resolveExperimentGates: Mock;
			};
			instanceWriteAccess: { isReadOnly: Mock };
			modelService: { resolveAgentModelConfig: Mock; resolveProxyModel: Mock };
			ensureThreadExists: Mock;
			systemAgents: unknown;
			agentMemory: unknown;
			dbIterationLogStorage: unknown;
			dbSnapshotStorage: unknown;
			instanceAiConfig: Record<string, never>;
			aiConfig: Record<string, never>;
			defaultTimeZone: string;
			eventBus: unknown;
			logger: { warn: Mock };
			telemetry: { track: Mock };
			oauth2CallbackUrl: string;
			webhookBaseUrl: string;
			formBaseUrl: string;
			setupPanelByThread: Map<string, boolean>;
			schedulePlannedTasks: Mock;
			sandboxService: InstanceAiSandboxService;
			browserSessionService: { findMcpServer: Mock };
			domainAccessTrackersByThread: Map<string, unknown>;
			threadGrantRepo: { findKeys: Mock };
			evalCredentialAllowlists: EvalThreadCredentialAllowlistService;
			instanceAiErrorReporter: ReturnType<typeof createInstanceAiErrorReporterMock>;
			creditService: { claimRunUsage: Mock; ensureQuotaLockApplied: Mock };
			aiUsageService: { isParameterValueSharingAllowed: Mock };
			areMcpConnectionsAvailable: Mock;
		};
		service.areMcpConnectionsAvailable = vi.fn(() => false);
		service.settingsService = {
			getAdminSettings: vi.fn(() => ({ localGatewayDisabled: false, sandboxEnabled: true })),
			getSandboxStatus: vi.fn(() => ({
				enabled: true,
				provider: 'n8n-sandbox',
				workflowBuilderAvailable: true,
				unavailableReason: null,
			})),
			isLocalGatewayDisabledForUser: vi.fn(async () => false),
			getPermissions: vi.fn(() => ({})),
		};
		service.gatewayService = { findGateway: vi.fn(() => undefined), applyToolPolicy: vi.fn() };
		service.aiService = { isProxyEnabled: vi.fn(() => false) };
		service.adapterService = {
			createContext: vi.fn(() => ({})),
			getNodeDefinitionDirs: vi.fn(() => []),
			resolveExperimentGates: vi.fn().mockResolvedValue({
				configEvalsEnabled: true,
				conversationHistoryEnabled: false,
				progressiveBuildingEnabled: enabled,
				conciseStyleEnabled: concise,
				nodeUsageEnabled: false,
				nodeContextEnabled: false,
				folderExplorationEnabled: true,
				aiPreferencesEnabled: false,
			}),
		};
		service.instanceWriteAccess = { isReadOnly: vi.fn(() => false) };
		service.modelService = {
			resolveAgentModelConfig: vi.fn(async () => 'model-1'),
			resolveProxyModel: vi.fn(async () => 'model-1'),
		};
		service.ensureThreadExists = vi.fn(async () => {});
		service.systemAgents = { findThread: vi.fn(async () => ({ projectId: 'project-1' })) };
		service.agentMemory = {
			getThread: vi.fn(async () => undefined),
		};
		service.dbIterationLogStorage = {};
		service.dbSnapshotStorage = {};
		service.instanceAiConfig = {};
		service.aiConfig = {};
		service.defaultTimeZone = 'UTC';
		service.eventBus = {};
		service.logger = { warn: vi.fn() };
		service.telemetry = { track: vi.fn() };
		service.oauth2CallbackUrl = 'http://localhost/rest/oauth2-credential/callback';
		service.webhookBaseUrl = 'http://localhost/webhook';
		service.formBaseUrl = 'http://localhost/form';
		service.setupPanelByThread = new Map();
		service.schedulePlannedTasks = vi.fn();
		service.domainAccessTrackersByThread = new Map();
		service.browserSessionService = { findMcpServer: vi.fn(() => undefined) };
		service.threadGrantRepo = { findKeys: vi.fn(async () => new Set<string>()) };
		service.sandboxService = new InstanceAiSandboxService({
			config: { sandboxEnabled: true, sandboxProvider: 'daytona' } as InstanceAiConfig,
			logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
			errorReporter: { error: vi.fn() } as unknown as ErrorReporter,
			settingsService: {
				resolveDaytonaConfig: vi.fn(async () => ({ apiKey: 'test-daytona-key' })),
				resolveN8nSandboxConfig: vi.fn(async () => ({})),
			},
			aiService: { isProxyEnabled: vi.fn(() => false), getClient: vi.fn() },
		});
		service.evalCredentialAllowlists = new EvalThreadCredentialAllowlistService();
		service.instanceAiErrorReporter = createInstanceAiErrorReporterMock();
		// Vary the sharing setting across rows. It does not depend on the build mode.
		const allowSendingParameterValues = !enabled;
		service.aiUsageService = {
			isParameterValueSharingAllowed: vi.fn(async () => allowSendingParameterValues),
		};
		service.creditService = {
			claimRunUsage: vi.fn(),
			ensureQuotaLockApplied: vi.fn(async () => {}),
		};
		(createSandbox as Mock).mockResolvedValue({ id: 'sandbox-1' });
		(createWorkspace as Mock).mockReturnValue({
			init: vi.fn(async () => {}),
			destroy: vi.fn(async () => {}),
		});
		(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

		const environment = await service.createExecutionEnvironment(
			fakeUser,
			'thread-1',
			'run-1',
			new AbortController().signal,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			false,
			{ buildMode: override, promptVersion: version },
		);

		expect(service.adapterService.resolveExperimentGates).toHaveBeenCalledTimes(1);
		expect(environment.buildMode).toBe(expected);
		expect(loadInstanceAiPromptSkills).toHaveBeenCalledWith(
			expect.objectContaining({ mode: expected, version: profile }),
		);
		expect(environment.orchestrationContext).toMatchObject({
			promptConfiguration: { version: profile },
		});
		expect(service.adapterService.createContext).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ folderExplorationEnabled: true }),
		);
		expect(service.adapterService.createContext).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ allowSendingParameterValues }),
		);
	});
});

describe('InstanceAiService — shutdown', () => {
	it('does not destroy thread-scoped sandboxes on service shutdown', async () => {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as ShutdownServiceInternals;
		service.tracing = {
			finalizeRemainingMessageTraceRoots: vi.fn(async (_threadId: string, _options: unknown) => {}),
			getTrackedThreadIds: vi.fn(() => []),
			clear: vi.fn(),
		};
		service.gatewayService = { disconnectAll: vi.fn() };
		service.sandboxService = { stopSandboxExpiryTimers: vi.fn() };
		service.browserSessionService = { shutdown: vi.fn(async () => {}) };
		service.domainAccessTrackersByThread = new Map();
		service._mcpClientManager = { disconnect: vi.fn(async () => {}) };
		service.logger = { debug: vi.fn(), warn: vi.fn() };
		service.instanceAiErrorReporter = createInstanceAiErrorReporterMock();

		await service.shutdown();

		// Shutdown only stops the idle-eviction timers; thread-scoped sandboxes
		// are left intact (via the delegated sandboxService) so a restarted
		// process can reconnect to them.
		expect(service.sandboxService.stopSandboxExpiryTimers).toHaveBeenCalledTimes(1);

		// Every trace's LangSmith provider is drained on final process shutdown,
		// after the trace bookkeeping is released.
		expect(shutdownProductTelemetryProviders).toHaveBeenCalledTimes(1);
		expect(service.tracing.clear.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(shutdownProductTelemetryProviders).mock.invocationCallOrder[0],
		);
	});
});

describe('InstanceAiService — memory task observer', () => {
	it('forwards memory task events to the trace context lease hook before existing registry/log handling', () => {
		const service = createMemoryTaskObserverService();
		const onMemoryTaskEvent = vi.fn();
		const tracing = { onMemoryTaskEvent } as unknown as InstanceAiTraceContext;
		const observer = service.memoryTaskObserverFor('thread-1', tracing);
		const event = queuedMemoryTaskEvent();

		observer(event);

		expect(onMemoryTaskEvent).toHaveBeenCalledWith(event);
		expect(service.memoryTaskRegistry.handleEvent).toHaveBeenCalledWith('thread-1', event);
		expect(service.logger.info).toHaveBeenCalledWith(
			'Observational memory task queued',
			expect.objectContaining({ threadId: 'thread-1', taskId: 'task-1' }),
		);
		expect(onMemoryTaskEvent.mock.invocationCallOrder[0]).toBeLessThan(
			service.memoryTaskRegistry.handleEvent.mock.invocationCallOrder[0],
		);
	});

	it('still runs registry/log handling when the trace context has no lease hook', () => {
		const service = createMemoryTaskObserverService();
		const observer = service.memoryTaskObserverFor('thread-1', undefined);
		const event = queuedMemoryTaskEvent();

		expect(() => observer(event)).not.toThrow();
		expect(service.memoryTaskRegistry.handleEvent).toHaveBeenCalledWith('thread-1', event);
	});
});

describe('InstanceAiService — expired data pruning', () => {
	// Checkpoints are Agents checkpoints: the Agents pruning task owns them.
	it('sweeps expired threads', async () => {
		const service = createPruneService();

		await service.pruneExpiredData(new Date('2026-05-13T12:00:00.000Z').getTime());

		expect(service.pruneExpiredThreads).toHaveBeenCalledTimes(1);
	});

	it('passes the signal to the thread sweep', async () => {
		const service = createPruneService();
		const { signal } = new AbortController();

		await service.pruneExpiredData(new Date('2026-05-13T12:00:00.000Z').getTime(), signal);

		expect(service.pruneExpiredThreads).toHaveBeenCalledWith(signal);
	});

	it('skips the thread sweep when the signal is already aborted', async () => {
		const service = createPruneService();
		const controller = new AbortController();
		controller.abort();

		await service.pruneExpiredData(
			new Date('2026-05-13T12:00:00.000Z').getTime(),
			controller.signal,
		);

		expect(service.pruneExpiredThreads).not.toHaveBeenCalled();
		expect(service.logger.debug).toHaveBeenCalledWith(
			'Stopped the Instance AI prune pass early because the run was aborted',
		);
	});

	it('logs an early stop when the signal aborts during the thread sweep', async () => {
		const service = createPruneService();
		const controller = new AbortController();
		service.pruneExpiredThreads.mockImplementation(async () => controller.abort());

		await service.pruneExpiredData(
			new Date('2026-05-13T12:00:00.000Z').getTime(),
			controller.signal,
		);

		expect(service.pruneExpiredThreads).toHaveBeenCalledTimes(1);
		expect(service.logger.debug).toHaveBeenCalledWith(
			'Stopped the Instance AI prune pass early because the run was aborted',
		);
	});
});

type ExpiredThreadPruneServiceInternals = {
	pruneExpiredThreads: (signal?: AbortSignal) => Promise<void>;
	clearThreadState: MockedFunction<(threadId: string) => Promise<void>>;
	memoryService: {
		cleanupExpiredThreads: MockedFunction<
			(
				onThreadDeleted?: (threadId: string) => Promise<void>,
				signal?: AbortSignal,
			) => Promise<number>
		>;
	};
	logger: { warn: Mock };
};

function createExpiredThreadPruneService(): ExpiredThreadPruneServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as ExpiredThreadPruneServiceInternals;
	service.clearThreadState = vi.fn(async (_threadId: string) => undefined);
	service.memoryService = {
		cleanupExpiredThreads: vi.fn(async (_onThreadDeleted) => 0),
	};
	service.logger = { warn: vi.fn() };
	return service;
}

describe('InstanceAiService — expired thread pruning', () => {
	it('delegates to the memory service and clears state for deleted threads', async () => {
		const service = createExpiredThreadPruneService();
		service.memoryService.cleanupExpiredThreads.mockImplementation(async (onThreadDeleted) => {
			await onThreadDeleted?.('thread-1');
			return 1;
		});

		await service.pruneExpiredThreads();

		expect(service.memoryService.cleanupExpiredThreads).toHaveBeenCalledTimes(1);
		expect(service.clearThreadState).toHaveBeenCalledWith('thread-1');
	});

	it('passes the signal to the memory service', async () => {
		const service = createExpiredThreadPruneService();
		const { signal } = new AbortController();

		await service.pruneExpiredThreads(signal);

		expect(service.memoryService.cleanupExpiredThreads).toHaveBeenCalledWith(
			expect.any(Function),
			signal,
		);
	});

	it('swallows errors so the recurring prune is not disrupted', async () => {
		const service = createExpiredThreadPruneService();
		service.memoryService.cleanupExpiredThreads.mockRejectedValueOnce(new Error('db down'));

		await expect(service.pruneExpiredThreads()).resolves.toBeUndefined();
		expect(service.logger.warn).toHaveBeenCalled();
	});
});

type RevalidationServiceInternals = {
	revalidateActiveUser: (userId: string) => Promise<User | null>;
	userRepository: { findOne: Mock };
	logger: { debug: Mock; warn: Mock; error: Mock };
};

function createRevalidationService(): RevalidationServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as RevalidationServiceInternals;
	service.userRepository = { findOne: vi.fn() };
	service.logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
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

describe('InstanceAiService — revalidateActiveUser', () => {
	it('returns the user when active and scoped for n8n Assistant', async () => {
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

type PlannedTaskSchedulerServiceInternals = {
	doSchedulePlannedTasks: (user: User, threadId: string) => Promise<void>;
	revalidateActiveUser: Mock<(...args: [string]) => Promise<User | null>>;
	cancelAwaitingApprovalPlan: Mock;
	createPlannedTaskState: Mock;
	syncPlannedTasksToUi: Mock;
	workflowObligations: {
		findPendingPlannedWorkflowVerification: Mock;
		revalidatePlannedWorkflowVerification: Mock;
	};
	startInternalFollowUpRun: Mock;
	buildPlannedTaskFollowUpMessage: Mock;
	buildWorkflowVerificationFollowUpMessage: Mock;
	createPlannedTaskDispatchContext: Mock;
	dispatchPlannedTask: Mock;
	logger: { warn: Mock };
};

function createPlannedTaskSchedulerService(): {
	service: PlannedTaskSchedulerServiceInternals;
	plannedTaskService: {
		getGraph: Mock;
		tick: Mock;
		revertToActive: Mock;
		revertCheckpointToPlanned: Mock;
		revertBuildWorkflowToPlanned: Mock;
		markRunning: Mock;
		markFailed: Mock;
	};
	graph: { planRunId: string; messageGroupId: string; tasks: Array<{ id: string }> };
} {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as PlannedTaskSchedulerServiceInternals;
	const graph = { planRunId: 'plan-run-1', messageGroupId: 'group-1', tasks: [] };
	const plannedTaskService = {
		getGraph: vi.fn(async () => graph),
		tick: vi.fn(async () => ({ type: 'none' })),
		revertToActive: vi.fn(async () => {}),
		revertCheckpointToPlanned: vi.fn(async () => {}),
		revertBuildWorkflowToPlanned: vi.fn(async () => {}),
		markRunning: vi.fn(async () => {}),
		markFailed: vi.fn(async () => graph),
	};

	service.revalidateActiveUser = vi.fn();
	service.cancelAwaitingApprovalPlan = vi.fn(async () => {});
	service.createPlannedTaskState = vi.fn(async () => ({ plannedTaskService }));
	service.syncPlannedTasksToUi = vi.fn(async () => {});
	service.workflowObligations = {
		findPendingPlannedWorkflowVerification: vi.fn(async () => undefined),
		revalidatePlannedWorkflowVerification: vi.fn(async (_threadId, verification) => verification),
	};
	service.startInternalFollowUpRun = vi.fn(async () => 'follow-up-run');
	service.buildPlannedTaskFollowUpMessage = vi.fn(() => 'follow-up message');
	service.buildWorkflowVerificationFollowUpMessage = vi.fn(() => 'workflow verification message');
	service.createPlannedTaskDispatchContext = vi.fn(async () => ({
		plannedTaskService,
		threadId: 'thread-a',
	}));
	service.dispatchPlannedTask = vi.fn(async (task, context, _graph?) => {
		if (task.kind === 'build-workflow' || task.kind === 'checkpoint') {
			service.logger.warn('dispatchPlannedTask called for a runtime planned-task kind', {
				threadId: context.threadId,
				taskId: task.id,
				kind: task.kind,
			});
			return;
		}

		await context.plannedTaskService?.markFailed(context.threadId, task.id, {
			error: `Planned task kind "${task.kind}" is no longer supported`,
		});

		const nextGraph = await context.plannedTaskService?.getGraph(context.threadId);
		if (nextGraph) {
			await service.syncPlannedTasksToUi(context.threadId, nextGraph);
		}
	});
	service.logger = { warn: vi.fn() };

	return { service, plannedTaskService, graph };
}

describe('InstanceAiService — planned task user revalidation', () => {
	it('cancels planned-task scheduling when the user is no longer authorized', async () => {
		const { service } = createPlannedTaskSchedulerService();
		service.revalidateActiveUser.mockResolvedValue(null);

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.cancelAwaitingApprovalPlan).toHaveBeenCalledWith('thread-a');
		expect(service.createPlannedTaskState).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Cancelling run: user no longer authorized for n8n Assistant',
			expect.objectContaining({ userId: 'user-1', threadId: 'thread-a' }),
		);
	});

	it('uses the revalidated user for planned-task follow-up runs', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		plannedTaskService.tick.mockResolvedValue({
			type: 'replan',
			graph,
			failedTask: undefined,
		});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'follow-up message',
			'group-1',
			true,
			undefined,
			undefined,
			undefined,
		);
	});

	it('marks unsupported planned dispatch tasks as failed and continues scheduling', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		const legacyTask = {
			id: 'legacy-1',
			title: 'Legacy task',
			kind: 'delegate',
			spec: 'Do the research',
			deps: [],
			status: 'planned',
		};
		graph.tasks = [legacyTask];
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		plannedTaskService.tick
			.mockResolvedValueOnce({
				type: 'dispatch',
				graph,
				tasks: [legacyTask],
			})
			.mockResolvedValueOnce({ type: 'none', graph });

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.createPlannedTaskDispatchContext).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			graph,
		);
		expect(plannedTaskService.markFailed).toHaveBeenCalledWith(
			'thread-a',
			'legacy-1',
			expect.objectContaining({
				error: expect.stringContaining('no longer supported'),
			}),
		);
		expect(plannedTaskService.tick).toHaveBeenCalledTimes(2);
		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
	});

	it('routes planned synthesis through workflow verification while an obligation is unsettled', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		const workflowTask = {
			id: 'build-wf',
			title: 'Build workflow',
			kind: 'build-workflow',
			status: 'succeeded',
			outcome: { workItemId: 'wi-1', workflowId: 'wf-1' },
		};
		const graphWithTask = { ...graph, tasks: [workflowTask] };
		const pendingVerification = {
			obligation: {
				workItemId: 'wi-1',
				threadId: 'thread-a',
				workflowId: 'wf-1',
				source: 'planned',
				policy: 'required',
				status: 'ready_to_verify',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
			outcome: undefined,
			task: workflowTask,
		};
		plannedTaskService.getGraph.mockResolvedValue(graphWithTask);
		service.workflowObligations.findPendingPlannedWorkflowVerification.mockResolvedValue(
			pendingVerification,
		);
		plannedTaskService.tick.mockResolvedValue({
			type: 'orchestrate-workflow-verification',
			graph: graphWithTask,
			verification: pendingVerification,
		});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(plannedTaskService.tick).toHaveBeenCalledWith('thread-a', {
			availableSlots: expect.any(Number),
			pendingWorkflowVerification: pendingVerification,
		});
		expect(plannedTaskService.revertToActive).not.toHaveBeenCalled();
		expect(service.buildWorkflowVerificationFollowUpMessage).toHaveBeenCalled();
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'workflow verification message',
			'group-1',
			false,
			undefined,
			'workflow_verification',
			undefined,
		);
		expect(service.buildPlannedTaskFollowUpMessage).not.toHaveBeenCalledWith(
			'synthesize',
			expect.anything(),
		);
	});

	it('skips a stale planned workflow verification and continues scheduling', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		const workflowTask = {
			id: 'build-wf',
			title: 'Build workflow',
			kind: 'build-workflow',
			status: 'succeeded',
			outcome: { workItemId: 'wi-1', workflowId: 'wf-1' },
		};
		const graphWithTask = { ...graph, tasks: [workflowTask] };
		const pendingVerification = {
			obligation: {
				workItemId: 'wi-1',
				threadId: 'thread-a',
				workflowId: 'wf-1',
				source: 'planned',
				policy: 'required',
				status: 'ready_to_verify',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
			outcome: undefined,
			task: workflowTask,
		};
		plannedTaskService.getGraph.mockResolvedValue(graphWithTask);
		service.workflowObligations.findPendingPlannedWorkflowVerification
			.mockResolvedValueOnce(pendingVerification)
			.mockResolvedValueOnce(undefined);
		service.workflowObligations.revalidatePlannedWorkflowVerification.mockResolvedValueOnce(
			undefined,
		);
		plannedTaskService.tick
			.mockResolvedValueOnce({
				type: 'orchestrate-workflow-verification',
				graph: graphWithTask,
				verification: pendingVerification,
			})
			.mockResolvedValueOnce({
				type: 'synthesize',
				graph: { ...graphWithTask, status: 'completed' },
			});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.workflowObligations.revalidatePlannedWorkflowVerification).toHaveBeenCalledWith(
			'thread-a',
			pendingVerification,
		);
		expect(plannedTaskService.tick).toHaveBeenCalledTimes(2);
		expect(service.buildWorkflowVerificationFollowUpMessage).not.toHaveBeenCalled();
		expect(service.buildPlannedTaskFollowUpMessage).toHaveBeenCalledWith(
			'synthesize',
			expect.objectContaining({ status: 'completed' }),
		);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'follow-up message',
			'group-1',
			false,
			undefined,
			'synthesize',
			undefined,
		);
	});

	it('runs planned workflow builds as orchestrator follow-up turns', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		const buildTask = {
			id: 'wf-1',
			title: 'Build workflow',
			kind: 'build-workflow',
			spec: 'Build the workflow',
			deps: [],
			workflowId: 'existing-wf',
		};
		graph.tasks = [buildTask];
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		plannedTaskService.tick.mockResolvedValue({
			type: 'orchestrate-build-workflow',
			graph,
			tasks: [buildTask],
		});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(plannedTaskService.markRunning).toHaveBeenCalledWith('thread-a', 'wf-1', {
			agentId: 'orchestrator-plan-run-1',
		});
		expect(service.buildPlannedTaskFollowUpMessage).toHaveBeenCalledWith('build-workflow', graph, {
			buildTask,
		});
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'follow-up message',
			'group-1',
			false,
			undefined,
			undefined,
			expect.objectContaining({
				isPlannedBuildFollowUp: true,
				buildTaskId: 'wf-1',
				workItemId: 'plan-run-1:default',
			}),
		);
	});

	it('passes planned supporting-workflow build metadata to follow-up turns', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		const buildTask = {
			id: 'processor',
			title: 'Build processor sub-workflow',
			kind: 'build-workflow',
			spec: 'Build the reusable processor.',
			deps: [],
			isSupportingWorkflow: true,
		};
		graph.tasks = [buildTask];
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		plannedTaskService.tick.mockResolvedValue({
			type: 'orchestrate-build-workflow',
			graph,
			tasks: [buildTask],
		});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'follow-up message',
			'group-1',
			false,
			undefined,
			undefined,
			expect.objectContaining({
				isPlannedBuildFollowUp: true,
				buildTaskId: 'processor',
				workItemId: expect.stringMatching(/^wi_/),
				isSupportingWorkflowTask: true,
			}),
		);
	});
});

describe('InstanceAiService — emitBrowserCredentialSetupOutcomes', () => {
	const CREDENTIAL_SETUP_EVENT = 'Instance AI Browser Use credential setup completed';

	function seedAttempts(
		service: RunFinishServiceInternals,
		attempts: Array<{
			credentialType: string;
			setupMethod: 'setup_card' | 'conversation';
			attemptId?: string;
			startedAt: number;
			created: boolean;
			errorCode?: string;
		}>,
	) {
		service.pendingBrowserCredentialSetups.set('run-1', { userId: 'user-1', attempts });
	}

	it('emits nothing when the run has no pending setups', () => {
		const service = createRunFinishService();

		service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', 'completed');

		expect(service.telemetry.track).not.toHaveBeenCalled();
	});

	it('emits one event per attempt and consumes the record', () => {
		const service = createRunFinishService();
		seedAttempts(service, [
			{
				credentialType: 'slackApi',
				setupMethod: 'setup_card',
				attemptId: 'attempt-1',
				startedAt: 1000,
				created: true,
			},
			{
				credentialType: 'notionApi',
				setupMethod: 'conversation',
				startedAt: 2000,
				created: false,
				errorCode: 'unresolved_field',
			},
		]);

		service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', 'completed');

		expect(service.telemetry.track).toHaveBeenCalledTimes(2);
		expect(service.telemetry.track).toHaveBeenCalledWith(CREDENTIAL_SETUP_EVENT, {
			user_id: 'user-1',
			credential_type: 'slackApi',
			status: 'success',
			is_valid: null,
			is_new: true,
			setup_method: 'setup_card',
			thread_id: 'thread-a',
			run_id: 'run-1',
			credential_setup_attempt_id: 'attempt-1',
			duration_ms: expect.any(Number),
		});
		expect(service.telemetry.track).toHaveBeenCalledWith(CREDENTIAL_SETUP_EVENT, {
			user_id: 'user-1',
			credential_type: 'notionApi',
			status: 'failure',
			failure_stage: 'generation',
			error_code: 'unresolved_field',
			is_valid: null,
			is_new: true,
			setup_method: 'conversation',
			thread_id: 'thread-a',
			run_id: 'run-1',
			duration_ms: expect.any(Number),
		});
		expect(service.pendingBrowserCredentialSetups.size).toBe(0);

		service.telemetry.track.mockClear();
		service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', 'completed');
		expect(service.telemetry.track).not.toHaveBeenCalled();
	});

	it.each([
		['completed', 'not_attempted'],
		['cancelled', 'run_cancelled'],
		['errored', 'run_errored'],
	] as const)('maps a %s run without flow error to error code %s', (runStatus, errorCode) => {
		const service = createRunFinishService();
		seedAttempts(service, [
			{ credentialType: 'slackApi', setupMethod: 'setup_card', startedAt: 1000, created: false },
		]);

		service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', runStatus);

		expect(service.telemetry.track).toHaveBeenCalledWith(
			CREDENTIAL_SETUP_EVENT,
			expect.objectContaining({
				status: 'failure',
				failure_stage: 'unknown',
				error_code: errorCode,
			}),
		);
	});

	it('prefers the flow error code over the run termination code', () => {
		const service = createRunFinishService();
		seedAttempts(service, [
			{
				credentialType: 'slackApi',
				setupMethod: 'setup_card',
				startedAt: 1000,
				created: false,
				errorCode: 'missing_captured_fields',
			},
		]);

		service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', 'cancelled');

		expect(service.telemetry.track).toHaveBeenCalledWith(
			CREDENTIAL_SETUP_EVENT,
			expect.objectContaining({
				failure_stage: 'generation',
				error_code: 'missing_captured_fields',
			}),
		);
	});

	it('is invoked by publishRunFinish with the run status', () => {
		const service = createRunFinishService();
		seedAttempts(service, [
			{ credentialType: 'slackApi', setupMethod: 'setup_card', startedAt: 1000, created: false },
		]);

		service.publishRunFinish('thread-a', 'run-1', 'cancelled', 'user_cancelled');

		expect(service.telemetry.track).toHaveBeenCalledWith(
			CREDENTIAL_SETUP_EVENT,
			expect.objectContaining({
				credential_type: 'slackApi',
				status: 'failure',
				error_code: 'run_cancelled',
			}),
		);
		expect(service.pendingBrowserCredentialSetups.size).toBe(0);
	});
});

describe('InstanceAiService — stopped-plan cleanup', () => {
	type CancelService = {
		cancelAwaitingApprovalPlan: (threadId: string) => Promise<void>;
		createPlannedTaskState: Mock;
		logger: { warn: Mock };
	};

	function createCancelService(status: string) {
		const service = Object.create(InstanceAiService.prototype) as unknown as CancelService;
		const plannedTaskService = {
			getGraph: vi.fn(async () => ({ planRunId: 'plan-run-1', status, tasks: [] })),
			clear: vi.fn(async () => {}),
		};
		const taskStorage = { save: vi.fn(async () => {}) };
		Object.assign(service, {
			createPlannedTaskState: vi.fn(async () => ({ plannedTaskService, taskStorage })),
			logger: { warn: vi.fn() },
		});
		return { service, plannedTaskService, taskStorage };
	}

	it('clears a plan that still waits for approval and empties the checklist', async () => {
		const { service, plannedTaskService, taskStorage } = createCancelService('awaiting_approval');

		await service.cancelAwaitingApprovalPlan('thread-a');

		expect(plannedTaskService.clear).toHaveBeenCalledWith('thread-a');
		expect(taskStorage.save).toHaveBeenCalledWith('thread-a', { tasks: [] });
	});

	it('leaves an approved plan alone', async () => {
		const { service, plannedTaskService } = createCancelService('active');

		await service.cancelAwaitingApprovalPlan('thread-a');

		expect(plannedTaskService.clear).not.toHaveBeenCalled();
	});
});

describe('InstanceAiService — agent preview handoff scopes', () => {
	type AgentPreviewPermissionService = {
		assertAgentPreviewHandoffScopes: (user: User, projectId: string) => Promise<void>;
	};

	function createAgentPreviewPermissionService(): AgentPreviewPermissionService {
		return Object.create(InstanceAiService.prototype) as AgentPreviewPermissionService;
	}

	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset();
	});

	it('requires both agent read and update scopes for preview handoffs', async () => {
		const service = createAgentPreviewPermissionService();
		vi.mocked(userHasScopes).mockResolvedValue(true);

		await expect(
			service.assertAgentPreviewHandoffScopes(fakeUser, 'project-1'),
		).resolves.toBeUndefined();

		expect(userHasScopes).toHaveBeenCalledWith(fakeUser, ['agent:read', 'agent:update'], false, {
			projectId: 'project-1',
		});
	});

	it('rejects preview handoffs when either required agent scope is missing', async () => {
		const service = createAgentPreviewPermissionService();
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await expect(service.assertAgentPreviewHandoffScopes(fakeUser, 'project-1')).rejects.toThrow(
			'You do not have permission to load or edit agent previews in this project.',
		);
	});
});

describe('InstanceAiService — OAuth callback URL', () => {
	// Regression: the OAuth callback URL exposed to browser-assisted credential
	// setup must come from urlService.getInstanceBaseUrl() (which honors WEBHOOK_URL
	// on cloud), not from globalConfig.editorBaseUrl with a localhost fallback.
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

describe('InstanceAiService — editor handoff context resources', () => {
	it('builds the context block from combined workflow and agent attachments', () => {
		const source = InstanceAiService.toString();

		// Imported helpers compile to `(0,__vite_ssr_import_N__.fn)(args)`. Both
		// arguments must reach the block, or the editor hand-off drops out of it.
		expect(source).toMatch(
			/resolveThreadArtifactsTurn\(\s*threadId\s*,\s*threadArtifacts\s*,\s*contextAttachments\s*,/,
		);
		expect(source).toMatch(/buildThreadArtifactsBlock\)?\s*\(\s*context\s*,\s*attachments\s*\)/);
		expect(source).toMatch(/buildThreadContextBlock\)?/);
		expect(source).not.toContain('buildContextResourcesBlock');
		expect(source).not.toContain('EDITOR_CONTEXT_OPEN_TAG');
	});

	it('traces the attached resources, which the raw message no longer shows', () => {
		const source = InstanceAiService.toString();

		// Assignment-form tolerant: the wiring is what matters, not whether the
		// field is spread into the literal or set on it afterwards.
		expect(source).toMatch(/resourceAttachments\s*[:=]\s*contextAttachments\.map/);
	});
});

describe('InstanceAiService — agent snapshots for attached agents', () => {
	type SnapshotService = {
		logger: { debug: Mock };
		snapshotAttachedAgents: (
			attachments: Array<Record<string, unknown>>,
			orchestrationContext: Record<string, unknown>,
			tracing: unknown,
		) => Promise<void>;
	};

	const emitSnapshot = emitAgentSnapshotTraceEvent as unknown as Mock;
	const TRACING = { actorRun: { id: 'actor-1' } };
	const ARTIFACT = { config: { name: 'Support Triage' }, skills: {}, configHash: 'hash-1' };

	function createService(): SnapshotService {
		const service = Object.create(InstanceAiService.prototype) as unknown as SnapshotService;
		service.logger = { debug: vi.fn() };
		return service;
	}

	function makeContext(readAgentArtifact?: Mock) {
		return {
			domainContext: readAgentArtifact ? { builderDelegate: { readAgentArtifact } } : {},
		};
	}

	beforeEach(() => emitSnapshot.mockClear());

	it('snapshots an attached agent as it stood when the turn opened', async () => {
		const service = createService();
		const readAgentArtifact = vi.fn(async () => await Promise.resolve(ARTIFACT));

		await service.snapshotAttachedAgents(
			[{ type: 'agent', id: 'agent-1', projectId: 'proj-1' }],
			makeContext(readAgentArtifact),
			TRACING,
		);

		expect(readAgentArtifact).toHaveBeenCalledWith('agent-1');
		expect(emitSnapshot).toHaveBeenCalledTimes(1);
		expect(emitSnapshot.mock.calls[0][1]).toMatchObject({
			agentId: 'agent-1',
			projectId: 'proj-1',
			reason: 'attached',
			artifact: ARTIFACT,
		});
	});

	it('ignores a workflow attachment — the workflow side has its own event', async () => {
		const service = createService();
		const readAgentArtifact = vi.fn();

		await service.snapshotAttachedAgents(
			[{ type: 'workflow', id: 'wf-1' }],
			makeContext(readAgentArtifact),
			TRACING,
		);

		expect(readAgentArtifact).not.toHaveBeenCalled();
		expect(emitSnapshot).not.toHaveBeenCalled();
	});

	it('does nothing when the agents module is off, rather than failing the turn', async () => {
		const service = createService();

		await expect(
			service.snapshotAttachedAgents(
				[{ type: 'agent', id: 'agent-1', projectId: 'proj-1' }],
				makeContext(undefined),
				TRACING,
			),
		).resolves.toBeUndefined();
		expect(emitSnapshot).not.toHaveBeenCalled();
	});

	it('does nothing without a trace to attach the event to', async () => {
		const service = createService();
		const readAgentArtifact = vi.fn();

		await service.snapshotAttachedAgents(
			[{ type: 'agent', id: 'agent-1', projectId: 'proj-1' }],
			makeContext(readAgentArtifact),
			undefined,
		);

		expect(readAgentArtifact).not.toHaveBeenCalled();
		expect(emitSnapshot).not.toHaveBeenCalled();
	});

	it('skips an agent it cannot read and keeps going', async () => {
		const service = createService();
		const readAgentArtifact = vi.fn(async (agentId: string) =>
			agentId === 'agent-broken'
				? await Promise.reject(new Error('gone'))
				: await Promise.resolve(ARTIFACT),
		);

		await service.snapshotAttachedAgents(
			[
				{ type: 'agent', id: 'agent-broken', projectId: 'proj-1' },
				{ type: 'agent', id: 'agent-ok', projectId: 'proj-1' },
			],
			makeContext(readAgentArtifact),
			TRACING,
		);

		expect(emitSnapshot).toHaveBeenCalledTimes(1);
		expect(emitSnapshot.mock.calls[0][1]).toMatchObject({ agentId: 'agent-ok' });
	});
});

describe('InstanceAiService — deterministic workflow setup follow-up', () => {
	type SetupFollowUpService = {
		listWorkflowLoopRecords: Mock;
		claimWorkItemSetupRouting: Mock;
		markWorkItemSetupRouted: Mock;
		releaseWorkItemSetupRoutingClaim: Mock;
		buildWorkflowSetupFollowUpMessage: Mock;
		workflowObligations: { isPlannedRecord: Mock; obligationFromRecord: Mock };
		getLiveRun: Mock;
		startInternalFollowUpRun: Mock;
		trackWorkflowVerificationObligation: Mock;
		logger: { warn: Mock };
		markWorkflowSetupHandled: (
			threadId: string,
			workflowId: string,
			runId?: string,
			options?: { requirePersisted?: boolean },
		) => Promise<boolean>;
		maybeStartWorkflowSetupFollowUp: (user: User, threadId: string) => Promise<boolean>;
	};

	const verifiedNeedsSetupOutcome = {
		workItemId: 'wi-1',
		taskId: 't-1',
		runId: 'run-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Submitted.',
		verificationReadiness: { status: 'already_verified' },
		setupRequirement: { status: 'required', reason: 'mocked-credentials', guidance: 'Add creds.' },
		verification: { attempted: true, success: true, executionId: 'exec-1', status: 'success' },
	};

	type SetupFollowUpRecord = {
		state: {
			workItemId: string;
			threadId: string;
			runId?: string;
			workflowId?: string;
			plannedTaskId?: string;
			setupRoutedAt?: string;
			setupRoutingClaimId?: string;
			setupRoutingClaimedAt?: string;
			setupRoutingClaimExpiresAt?: string;
		};
		attempts: [];
		lastBuildOutcome: typeof verifiedNeedsSetupOutcome;
	};

	function makeRecord(
		overrides: {
			state?: Partial<SetupFollowUpRecord['state']>;
			outcome?: Partial<typeof verifiedNeedsSetupOutcome>;
		} = {},
	): SetupFollowUpRecord {
		return {
			state: {
				workItemId: 'wi-1',
				threadId: 'thread-a',
				runId: 'run-1',
				workflowId: 'wf-1',
				setupRoutedAt: undefined as string | undefined,
				...overrides.state,
			},
			attempts: [],
			lastBuildOutcome: { ...verifiedNeedsSetupOutcome, ...overrides.outcome },
		};
	}

	// The obligation a record maps to — mirrors what the projector would derive
	// for these fixtures (verified build whose setup verdict comes from the outcome).
	function obligationFor(record: ReturnType<typeof makeRecord>): WorkflowVerificationObligation {
		return {
			workItemId: record.state.workItemId,
			threadId: 'thread-a',
			runId: record.lastBuildOutcome.runId,
			workflowId: record.lastBuildOutcome.workflowId,
			source: 'direct',
			policy: 'required',
			status: 'verified',
			setupRequirement: record.lastBuildOutcome.setupRequirement,
			updatedAt: '2026-01-01T00:00:00.000Z',
		} as WorkflowVerificationObligation;
	}

	// Backs the stubbed storage with an in-memory store so the persisted
	// `setupRoutedAt` marker (loop-safety) behaves like the real storage.
	function createSetupFollowUpService(
		records: Record<string, ReturnType<typeof makeRecord>>,
	): SetupFollowUpService {
		const service = Object.create(InstanceAiService.prototype) as unknown as SetupFollowUpService;
		service.listWorkflowLoopRecords = vi.fn(async () => Object.values(records));
		service.claimWorkItemSetupRouting = vi.fn(
			async (_threadId: string, record: ReturnType<typeof makeRecord>) => {
				const storedRecord = records[record.state.workItemId];
				if (
					!storedRecord ||
					storedRecord.state.setupRoutedAt ||
					storedRecord.state.plannedTaskId ||
					storedRecord.state.setupRoutingClaimId
				) {
					return null;
				}

				storedRecord.state.setupRoutingClaimId = 'setup-claim-1';
				storedRecord.state.setupRoutingClaimedAt = '2026-01-01T00:00:00.000Z';
				storedRecord.state.setupRoutingClaimExpiresAt = '2026-01-01T00:15:00.000Z';
				return {
					claimId: 'setup-claim-1',
					claimedAt: '2026-01-01T00:00:00.000Z',
					expiresAt: '2026-01-01T00:15:00.000Z',
				};
			},
		);
		service.markWorkItemSetupRouted = vi.fn(
			async (_threadId: string, workItemId: string, claimId: string) => {
				const storedRecord = records[workItemId];
				if (!storedRecord || storedRecord.state.setupRoutingClaimId !== claimId) return false;

				storedRecord.state.setupRoutedAt = '2026-01-01T00:00:00.000Z';
				delete storedRecord.state.setupRoutingClaimId;
				delete storedRecord.state.setupRoutingClaimedAt;
				delete storedRecord.state.setupRoutingClaimExpiresAt;
				return true;
			},
		);
		service.releaseWorkItemSetupRoutingClaim = vi.fn(
			async (_threadId: string, workItemId: string, claimId: string) => {
				const storedRecord = records[workItemId];
				if (!storedRecord || storedRecord.state.setupRoutingClaimId !== claimId) return;

				delete storedRecord.state.setupRoutingClaimId;
				delete storedRecord.state.setupRoutingClaimedAt;
				delete storedRecord.state.setupRoutingClaimExpiresAt;
			},
		);
		service.buildWorkflowSetupFollowUpMessage = vi.fn(
			() => '<workflow-setup-required>\n{}\n</workflow-setup-required>',
		);
		service.workflowObligations = {
			isPlannedRecord: vi.fn(
				(record: ReturnType<typeof makeRecord>) => record.state.plannedTaskId !== undefined,
			),
			obligationFromRecord: vi.fn((_threadId: string, record: ReturnType<typeof makeRecord>) =>
				obligationFor(record),
			),
		};
		service.getLiveRun = vi.fn(async () => ({
			status: 'running',
			messageGroupId: 'group-1',
			runIds: [],
		}));
		service.startInternalFollowUpRun = vi.fn(async () => 'setup-run');
		service.trackWorkflowVerificationObligation = vi.fn();
		service.logger = { warn: vi.fn() };
		return service;
	}

	it('routes a verified build that still needs setup and marks it once', async () => {
		const service = createSetupFollowUpService({ 'wi-1': makeRecord() });

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(true);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			expect.stringContaining('<workflow-setup-required>'),
			'group-1',
			false,
			undefined,
			'workflow_setup',
		);
		expect(service.markWorkItemSetupRouted).toHaveBeenCalledTimes(1);
	});

	it('routes a non-verifiable build that still needs setup', async () => {
		const records = { 'wi-1': makeRecord() };
		const service = createSetupFollowUpService(records);
		service.workflowObligations.obligationFromRecord.mockReturnValueOnce({
			...obligationFor(records['wi-1']),
			status: 'not_verifiable',
		});

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(true);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			expect.stringContaining('<workflow-setup-required>'),
			'group-1',
			false,
			undefined,
			'workflow_setup',
		);
	});

	it('does not route the same build twice (loop-safe)', async () => {
		const service = createSetupFollowUpService({ 'wi-1': makeRecord() });

		await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');
		const secondPass = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(secondPass).toBe(false);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
	});

	it('does not route when setup is not required', async () => {
		const service = createSetupFollowUpService({
			'wi-1': makeRecord({
				outcome: {
					setupRequirement: { status: 'not_required', reason: 'none', guidance: 'No setup.' },
				},
			}),
		});

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(false);
		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
	});

	it('does not route planned work items (handled by the plan flow)', async () => {
		const service = createSetupFollowUpService({
			'wi-1': makeRecord({ state: { plannedTaskId: 'planned-1' } }),
		});

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(false);
		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
	});

	it('releases the setup routing claim when the follow-up run cannot start', async () => {
		const records = { 'wi-1': makeRecord() };
		const service = createSetupFollowUpService(records);
		service.startInternalFollowUpRun.mockResolvedValueOnce('');

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(false);
		expect(service.releaseWorkItemSetupRoutingClaim).toHaveBeenCalledWith(
			'thread-a',
			'wi-1',
			'setup-claim-1',
		);
		expect(records['wi-1'].state.setupRoutingClaimId).toBeUndefined();
	});

	it('marks setup handled after the original setup card completes', async () => {
		const records = { 'wi-1': makeRecord() };
		const service = createSetupFollowUpService(records);

		const marked = await service.markWorkflowSetupHandled('thread-a', 'wf-1', 'run-1');
		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(marked).toBe(true);
		expect(records['wi-1'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(started).toBe(false);
		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-1', workItemId: 'wi-1' }),
			'setup_completed_by_tool',
		);
	});

	it.each(['rejected', 'not saved'])(
		'releases a %s routing marker so the handoff can retry',
		async (failure) => {
			const records = { 'wi-1': makeRecord() };
			const service = createSetupFollowUpService(records);
			if (failure === 'rejected') {
				service.markWorkItemSetupRouted.mockRejectedValueOnce(new Error('storage unavailable'));
			} else {
				service.markWorkItemSetupRouted.mockResolvedValueOnce(false);
			}

			await expect(
				service.markWorkflowSetupHandled('thread-a', 'wf-1', 'run-1', { requirePersisted: true }),
			).rejects.toThrow();
			expect(records['wi-1'].state.setupRoutingClaimId).toBeUndefined();
			await expect(service.markWorkflowSetupHandled('thread-a', 'wf-1', 'run-1')).resolves.toBe(
				true,
			);
			await expect(service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a')).resolves.toBe(
				false,
			);
			expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
		},
	);

	it('keeps the legacy card result when its routing marker is not saved', async () => {
		const records = { 'wi-1': makeRecord() };
		const service = createSetupFollowUpService(records);
		service.markWorkItemSetupRouted.mockResolvedValueOnce(false);

		await expect(service.markWorkflowSetupHandled('thread-a', 'wf-1', 'run-1')).resolves.toBe(
			false,
		);
		expect(records['wi-1'].state.setupRoutingClaimId).toBeUndefined();
	});

	it('keeps setup for other workflows routable after one workflow setup completes', async () => {
		const records = {
			'wi-1': makeRecord(),
			'wi-2': makeRecord({
				state: { workItemId: 'wi-2', workflowId: 'wf-2' },
				outcome: { workItemId: 'wi-2', workflowId: 'wf-2' },
			}),
		};
		const service = createSetupFollowUpService(records);

		const marked = await service.markWorkflowSetupHandled('thread-a', 'wf-1', 'run-1');
		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(marked).toBe(true);
		expect(records['wi-1'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(records['wi-2'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(started).toBe(true);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-1', workItemId: 'wi-1' }),
			'setup_completed_by_tool',
		);
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-2', workItemId: 'wi-2' }),
			'setup_follow_up_started',
		);
	});

	it('keeps later setup for the same workflow routable after one setup completes', async () => {
		const records = {
			'wi-old': makeRecord({
				state: { workItemId: 'wi-old', runId: 'run-old' },
				outcome: { workItemId: 'wi-old', runId: 'run-old' },
			}),
			'wi-latest': makeRecord({
				state: { workItemId: 'wi-latest', runId: 'run-latest' },
				outcome: { workItemId: 'wi-latest', runId: 'run-latest' },
			}),
		};
		const service = createSetupFollowUpService(records);

		const marked = await service.markWorkflowSetupHandled('thread-a', 'wf-1', 'run-old');
		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(marked).toBe(true);
		expect(records['wi-old'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(records['wi-latest'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(started).toBe(true);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-1', workItemId: 'wi-old' }),
			'setup_completed_by_tool',
		);
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-1', workItemId: 'wi-latest' }),
			'setup_follow_up_started',
		);
	});
});

describe('InstanceAiService — clearThreadState agent-builder cleanup', () => {
	type Internals = {
		setupPanelByThread: Map<string, boolean>;
		planRequestsByThread: Map<string, number>;
		schedulerLocks: Map<string, unknown>;
		failedInternalFollowUpStreaks: Map<string, number>;
		domainAccessTrackersByThread: Map<string, unknown>;
		evalCredentialAllowlists: EvalThreadCredentialAllowlistService;
		tracing: {
			finalizeRunTracing: Mock;
			finalizeBackgroundTaskTracing: Mock;
			finalizeRemainingMessageTraceRoots: Mock;
			deleteTraceContextsForThread: Mock;
			getTrackedThreadIds: Mock;
			clear: Mock;
		};
		memoryTaskRegistry: { clearThread: Mock };
		sandboxService: { destroySandbox: Mock };
		temporaryWorkflowService: { reapForThreadCleanup: Mock };
		logger: { warn: Mock };
		clearThreadState: (threadId: string) => Promise<void>;
	};

	function buildService(): Internals {
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;

		service.setupPanelByThread = new Map();
		service.planRequestsByThread = new Map();
		service.schedulerLocks = new Map();
		service.failedInternalFollowUpStreaks = new Map();
		service.domainAccessTrackersByThread = new Map();
		service.evalCredentialAllowlists = new EvalThreadCredentialAllowlistService();
		service.tracing = {
			finalizeRunTracing: vi.fn(async () => {}),
			finalizeBackgroundTaskTracing: vi.fn(async () => {}),
			finalizeRemainingMessageTraceRoots: vi.fn(async () => {}),
			deleteTraceContextsForThread: vi.fn(),
			getTrackedThreadIds: vi.fn(() => []),
			clear: vi.fn(),
		};
		service.memoryTaskRegistry = { clearThread: vi.fn() };
		service.sandboxService = { destroySandbox: vi.fn(async () => {}) };
		service.temporaryWorkflowService = { reapForThreadCleanup: vi.fn(async () => {}) };
		service.logger = { warn: vi.fn() };

		return service;
	}

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('clearThreadState deletes agent-builder sessions when the agents module is active', async () => {
		const service = buildService();
		const deleteBuilderSessions = vi.fn().mockResolvedValue(undefined);
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === ModuleRegistry) return { isActive: () => true };
			if (token === InstanceAiBuilderDelegateAdapterService) {
				return { deleteBuilderSessions };
			}
			throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
		});

		await service.clearThreadState('thread-a');

		expect(deleteBuilderSessions).toHaveBeenCalledWith('thread-a');
	});

	it('clearThreadState swallows agent-builder cleanup failures', async () => {
		const service = buildService();
		const deleteBuilderSessions = vi.fn().mockRejectedValue(new Error('cleanup failed'));
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === ModuleRegistry) return { isActive: () => true };
			if (token === InstanceAiBuilderDelegateAdapterService) {
				return { deleteBuilderSessions };
			}
			throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
		});

		await expect(service.clearThreadState('thread-a')).resolves.toBeUndefined();

		expect(service.logger.warn).toHaveBeenCalledWith(
			'Failed to clean up agent-builder sessions for thread',
			expect.objectContaining({ threadId: 'thread-a' }),
		);
	});
});

describe('createAgentMemoryOptions', () => {
	type MemoryOptionsInternals = {
		createAgentMemoryOptions: (
			user: User,
			threadId: string,
			runId: string,
			observerThresholdTokens?: number,
		) => {
			observationalMemory: {
				observerThresholdTokens: number;
				onTaskUsage: (report: MemoryTaskUsageReport) => Promise<void>;
			};
		};
		instanceAiConfig: Pick<
			InstanceAiConfig,
			'observerMessageTokens' | 'reflectorObservationTokens'
		>;
		creditService: { claimRunUsage: Mock; ensureQuotaLockApplied: Mock };
		logger: { warn: Mock };
	};

	function buildService(): MemoryOptionsInternals {
		const service = Object.create(InstanceAiService.prototype) as unknown as MemoryOptionsInternals;
		service.instanceAiConfig = { observerMessageTokens: 8_000, reflectorObservationTokens: 12_000 };
		service.creditService = {
			claimRunUsage: vi.fn(async () => {}),
			ensureQuotaLockApplied: vi.fn(async () => {}),
		};
		service.logger = { warn: vi.fn() };
		return service;
	}

	it('uses the instance observer threshold when the thread has no override', () => {
		const service = buildService();
		const { observerThresholdTokens } = service.createAgentMemoryOptions(
			{ id: 'user-1' } as User,
			'thread-1',
			'run-1',
		).observationalMemory;
		expect(observerThresholdTokens).toBe(8_000);
	});

	it('uses the per-thread override when an eval set one', () => {
		const service = buildService();
		const { observerThresholdTokens } = service.createAgentMemoryOptions(
			{ id: 'user-1' } as User,
			'thread-1',
			'run-1',
			1_000,
		).observationalMemory;
		expect(observerThresholdTokens).toBe(1_000);
	});

	it('claims converted usage under the orchestrator dedupe key, and skips claiming when usage is zero', async () => {
		const service = buildService();
		const user = { id: 'user-1' } as User;
		const { onTaskUsage } = service.createAgentMemoryOptions(
			user,
			'thread-1',
			'run-1',
		).observationalMemory;

		await onTaskUsage({
			task: 'observer',
			model: 'anthropic/claude-sonnet-4-5',
			usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			reportId: 'report-1',
		});

		expect(service.creditService.claimRunUsage).toHaveBeenCalledWith(
			user,
			'thread-1',
			'run-1:memory:observer:report-1',
			[
				{
					type: 'llmTokens',
					model: 'anthropic/claude-sonnet-4-5',
					uncachedInput: 0,
					cacheRead: 0,
					cacheWrite: 0,
					output: 20,
				},
			],
			'completed',
		);

		await onTaskUsage({
			task: 'reflector',
			model: 'anthropic/claude-sonnet-4-5',
			usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
			reportId: 'report-2',
		});

		expect(service.creditService.claimRunUsage).toHaveBeenCalledTimes(1);
	});
});

type FollowUpStreakServiceInternals = {
	failedInternalFollowUpStreaks: Map<string, number>;
	updateInternalFollowUpFailureStreak: (
		threadId: string,
		status: 'completed' | 'cancelled' | 'error' | 'suspended' | undefined,
		isInternalFollowUp: boolean,
	) => void;
	startInternalFollowUpRun: (user: User, threadId: string, message: string) => Promise<string>;
	readTurnDefaults: Mock;
	enqueueAssistantTurn: Mock;
	defaultTimeZone: string;
	logger: { warn: Mock; debug: Mock; error: Mock };
};

function createFollowUpStreakService(): FollowUpStreakServiceInternals {
	// Bypass the constructor — we only exercise the follow-up circuit breaker
	// and the run-start path it gates.
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as FollowUpStreakServiceInternals;

	service.failedInternalFollowUpStreaks = new Map();
	service.readTurnDefaults = vi.fn(async () => ({}));
	service.enqueueAssistantTurn = vi.fn(async () => ({ runId: 'follow-up-run', steered: false }));
	service.defaultTimeZone = 'UTC';
	service.logger = { warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

	return service;
}

describe('InstanceAiService — internal follow-up failure streak', () => {
	describe('updateInternalFollowUpFailureStreak', () => {
		it('counts consecutive errored internal follow-up runs per thread', () => {
			const service = createFollowUpStreakService();

			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);

			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBe(2);
			expect(service.failedInternalFollowUpStreaks.get('thread-b')).toBeUndefined();
		});

		it('does not count errored runs that were not internal follow-ups', () => {
			const service = createFollowUpStreakService();

			service.updateInternalFollowUpFailureStreak('thread-a', 'error', false);

			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBeUndefined();
		});

		it('resets the streak when a run completes or suspends', () => {
			const service = createFollowUpStreakService();

			service.failedInternalFollowUpStreaks.set('thread-a', 3);
			service.updateInternalFollowUpFailureStreak('thread-a', 'completed', false);
			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBeUndefined();

			service.failedInternalFollowUpStreaks.set('thread-a', 3);
			service.updateInternalFollowUpFailureStreak('thread-a', 'suspended', true);
			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBeUndefined();
		});

		it('keeps the streak unchanged on cancelled runs and missing terminal status', () => {
			const service = createFollowUpStreakService();
			service.failedInternalFollowUpStreaks.set('thread-a', 2);

			service.updateInternalFollowUpFailureStreak('thread-a', 'cancelled', true);
			service.updateInternalFollowUpFailureStreak('thread-a', undefined, true);

			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBe(2);
		});
	});

	describe('startInternalFollowUpRun circuit breaker', () => {
		it('queues the follow-up while the streak is below the cap', async () => {
			const service = createFollowUpStreakService();
			service.failedInternalFollowUpStreaks.set('thread-a', 2);

			const runId = await service.startInternalFollowUpRun(fakeUser, 'thread-a', 'verify');

			expect(runId).toBe('follow-up-run');
			expect(service.enqueueAssistantTurn).toHaveBeenCalledWith(
				fakeUser,
				'thread-a',
				'verify',
				expect.objectContaining({
					runId: expect.stringMatching(/^run_/),
					timeZone: 'UTC',
					resumeReason: 'background_task_completed',
				}),
			);
		});

		it('skips the follow-up once the streak reaches the cap', async () => {
			const service = createFollowUpStreakService();
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);

			const runId = await service.startInternalFollowUpRun(fakeUser, 'thread-a', 'verify');

			expect(runId).toBe('');
			expect(service.enqueueAssistantTurn).not.toHaveBeenCalled();
			expect(service.logger.warn).toHaveBeenCalledWith(
				'Skipping internal follow-up: consecutive follow-up runs keep failing',
				expect.objectContaining({ threadId: 'thread-a', failedStreak: 3 }),
			);
		});

		it('allows follow-ups again after a healthy run resets the streak', async () => {
			const service = createFollowUpStreakService();
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'completed', false);

			const runId = await service.startInternalFollowUpRun(fakeUser, 'thread-a', 'verify');

			expect(runId).toBe('follow-up-run');
			expect(service.enqueueAssistantTurn).toHaveBeenCalled();
		});
	});
});

describe('InstanceAiService — resolveThreadArtifactsTurn', () => {
	type Context = {
		artifacts: Array<{ type: 'workflow'; id: string; name?: string }>;
		activeId?: string;
	};
	type Internals = {
		resolveThreadArtifactsTurn: (
			threadId: string,
			context: Context | undefined,
			attachments: Array<{ type: 'workflow'; id: string; name: string }>,
			loadHistory: () => Promise<unknown[]>,
		) => Promise<string>;
		getReplayedMessages: (threadId: string) => Promise<unknown[]>;
		agentMemory: {
			getMessages: Mock;
			getCursor: Mock;
			getActiveObservationLog: Mock;
			getMessagesForObservationScope: Mock;
		};
		logger: { warn: Mock };
	};

	function createService(): Internals {
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;
		service.agentMemory = {
			getMessages: vi.fn().mockResolvedValue([]),
			getCursor: vi.fn().mockResolvedValue(null),
			getActiveObservationLog: vi.fn().mockResolvedValue([]),
			getMessagesForObservationScope: vi.fn().mockResolvedValue([]),
		};
		service.logger = { warn: vi.fn() };
		return service;
	}

	const digest = { type: 'workflow' as const, id: 'wf-1', name: 'Digest' };
	const report = { type: 'workflow' as const, id: 'wf-2', name: 'Report' };
	const storedUserTurn = (block: string) => ({
		role: 'user',
		content: [buildThreadContextBlock(['Ambient context.', block]), 'Change it'].join('\n\n'),
	});

	async function resolve(
		service: Internals,
		context: Context | undefined,
		attachments: Array<{ type: 'workflow'; id: string; name: string }> = [],
	) {
		return await service.resolveThreadArtifactsTurn(
			'thread-1',
			context,
			attachments,
			async () => await service.getReplayedMessages('thread-1'),
		);
	}

	it('sends nothing when the client sent no tabs', async () => {
		expect(await resolve(createService(), undefined)).toBe('');
	});

	it('sends the tabs when the history has no tabs block', async () => {
		const block = await resolve(createService(), { artifacts: [digest], activeId: 'wf-1' });

		expect(block).toContain('<thread-artifacts>');
		expect(block).toContain('(id: `wf-1`) [current]');
	});

	it('does not send the tabs again when they have not changed, also after a reorder', async () => {
		const service = createService();
		const earlier = buildThreadArtifactsBlock({ artifacts: [digest, report], activeId: 'wf-1' });
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(earlier)]);

		expect(await resolve(service, { artifacts: [digest, report], activeId: 'wf-1' })).toBe('');
		expect(await resolve(service, { artifacts: [report, digest], activeId: 'wf-1' })).toBe('');
	});

	it('sends the tabs when a tab closed or the active tab changed', async () => {
		const service = createService();
		const earlier = buildThreadArtifactsBlock({ artifacts: [digest, report], activeId: 'wf-1' });
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(earlier)]);

		expect(await resolve(service, { artifacts: [digest], activeId: 'wf-1' })).toContain(
			'Workflow "Digest"',
		);
		expect(await resolve(service, { artifacts: [digest, report], activeId: 'wf-2' })).toContain(
			'(id: `wf-2`) [current]',
		);
	});

	it('says no tabs are open once, then not again while nothing changes', async () => {
		const service = createService();
		const noTabs = await resolve(service, { artifacts: [] });
		expect(noTabs).toContain('The user has no tabs open in this conversation’s preview.');

		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(noTabs)]);
		expect(await resolve(service, { artifacts: [] })).toBe('');
	});

	it('says no tabs are open after a block that listed tabs or only an editor hand-off', async () => {
		const service = createService();
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(buildThreadArtifactsBlock({ artifacts: [digest] })),
		]);
		expect(await resolve(service, { artifacts: [] })).toContain('no tabs open');

		const handoffOnly = buildThreadArtifactsBlock({ artifacts: [] }, [
			{ type: 'workflow' as const, id: 'wf-9', name: 'Handed off' },
		]);
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(handoffOnly)]);
		expect(await resolve(service, { artifacts: [] })).toContain('no tabs open');
	});

	it('says no tabs are open again when the same block was compacted out of the replay window', async () => {
		const service = createService();
		// The full history has the same block, so only a replay-window read sends it again.
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(buildThreadArtifactsBlock({ artifacts: [] })),
		]);
		service.agentMemory.getCursor.mockResolvedValue({
			lastObservedAt: new Date('2026-09-01T00:00:00.000Z'),
			lastObservedMessageId: 'message-1',
		});
		service.agentMemory.getActiveObservationLog.mockResolvedValue([{ id: 'observation-1' }]);
		service.agentMemory.getMessagesForObservationScope.mockResolvedValue([]);

		expect(await resolve(service, { artifacts: [] })).toContain('no tabs open');
	});

	it('always sends a block that carries an editor hand-off', async () => {
		const service = createService();
		const attachments = [{ type: 'workflow' as const, id: 'wf-1', name: 'Digest' }];
		const earlier = buildThreadArtifactsBlock({ artifacts: [digest] }, attachments);
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(earlier)]);

		expect(await resolve(service, { artifacts: [digest] }, attachments)).toBe(earlier);
	});

	it('sends the tabs again when the earlier block was compacted out of the replay window', async () => {
		const service = createService();
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(buildThreadArtifactsBlock({ artifacts: [digest] })),
		]);
		service.agentMemory.getCursor.mockResolvedValue({
			lastObservedAt: new Date('2026-09-01T00:00:00.000Z'),
			lastObservedMessageId: 'message-1',
		});
		service.agentMemory.getActiveObservationLog.mockResolvedValue([{ id: 'observation-1' }]);
		service.agentMemory.getMessagesForObservationScope.mockResolvedValue([]);

		expect(await resolve(service, { artifacts: [digest] })).toContain('Workflow "Digest"');
	});

	it('sends the tabs when the history cannot be read', async () => {
		const service = createService();
		service.agentMemory.getMessages.mockRejectedValue(new Error('database is locked'));

		expect(await resolve(service, { artifacts: [] })).toContain('no tabs open');
		expect(service.logger.warn).toHaveBeenCalled();
	});
});

describe('InstanceAiService — resolveAiPreferencesTurn', () => {
	type StoredMessage = { role: string; content: string };
	type Internals = {
		resolveAiPreferencesTurn: (
			userId: string,
			project: { id: string; name: string; type: 'team' } | undefined,
			threadId: string,
		) => Promise<{ block: string | undefined; payload: AiPreferencesAppliedPayload }>;
		aiPreferenceService: { getApplicable: Mock };
		agentMemory: {
			getMessages: Mock;
			getCursor: Mock;
			getActiveObservationLog: Mock;
			getMessagesForObservationScope: Mock;
		};
		logger: { warn: Mock };
	};

	function createService(): Internals {
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;
		service.aiPreferenceService = { getApplicable: vi.fn() };
		service.agentMemory = {
			getMessages: vi.fn().mockResolvedValue([]),
			getCursor: vi.fn().mockResolvedValue(null),
			getActiveObservationLog: vi.fn().mockResolvedValue([]),
			getMessagesForObservationScope: vi.fn().mockResolvedValue([]),
		};
		service.logger = { warn: vi.fn() };
		return service;
	}

	const applicable = {
		instance: [],
		user: [{ id: 'pref-1', content: 'Keep replies short.' }],
		projects: [
			{
				id: 'project-1',
				name: 'Marketing',
				items: [{ id: 'pref-2', content: 'Prefer HubSpot nodes.' }],
			},
		],
	};
	const none = { instance: [], user: [], projects: [] };
	const boundProject = { id: 'project-1', name: 'Marketing', type: 'team' as const };

	/** A persisted user turn whose leading thread-context carries `block`, as the service stores it. */
	const storedUserTurn = (
		block: string | undefined,
		text = 'Build me a digest',
	): StoredMessage => ({
		role: 'user',
		content: [buildThreadContextBlock(['Ambient context.', block]), text].join('\n\n'),
	});

	const storedSave = (ok = true, toolName = 'save_user_preference'): AgentDbMessage => ({
		id: 'save-message',
		createdAt: new Date('2026-09-01T00:00:00.000Z'),
		role: 'assistant',
		content: [
			{
				type: 'tool-call',
				toolCallId: 'save-call',
				toolName,
				input: { content: 'Use minimal node names.', scope: 'user' },
				state: 'resolved',
				output: ok
					? {
							ok: true,
							preference: { id: 'removed-pref', content: 'Use minimal node names.', scope: 'user' },
						}
					: { ok: false, reason: 'failed' },
			},
		],
	});

	it('clears a chat save removed before any preference block carried it', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(none);
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(undefined, 'Always use minimal node names.'),
			storedSave(),
		]);

		const turn = await service.resolveAiPreferencesTurn('user-1', undefined, 'thread-1');

		expect(turn.block).toBe(AI_PREFERENCES_CLEARED_BLOCK);
		expect(turn.payload).toEqual({
			preferences: [],
			renderedLength: AI_PREFERENCES_CLEARED_BLOCK.length,
			injectedThisTurn: true,
		});
	});

	it.each([
		['other preferences remain', applicable],
		['no preferences remain', none],
	])(
		'refreshes after a removed save when %s, then reuses the refreshed block',
		async (_, preferences) => {
			const service = createService();
			service.aiPreferenceService.getApplicable.mockResolvedValue(preferences);
			const block = renderAiPreferencesBlock(preferences) ?? AI_PREFERENCES_CLEARED_BLOCK;
			const history = [storedUserTurn(block), storedSave()];
			service.agentMemory.getMessages.mockResolvedValue(history);

			const turn = await service.resolveAiPreferencesTurn('user-1', boundProject, 'thread-1');

			expect(turn.block).toBe(block);
			expect(turn.payload.injectedThisTurn).toBe(true);
			expect(turn.payload.preferences.map(({ id }) => id)).not.toContain('removed-pref');

			service.agentMemory.getMessages.mockResolvedValue([...history, storedUserTurn(turn.block)]);
			const nextTurn = await service.resolveAiPreferencesTurn('user-1', boundProject, 'thread-1');

			expect(nextTurn.block).toBeUndefined();
			expect(nextTurn.payload).toMatchObject({ injectedThisTurn: false });
		},
	);

	it.each([
		['failed save', false, 'save_user_preference'],
		['unrelated tool', true, 'get_workflow'],
	] as const)('does not refresh for a %s', async (_, ok, toolName) => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(none);
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(undefined),
			storedSave(ok, toolName),
		]);

		const turn = await service.resolveAiPreferencesTurn('user-1', undefined, 'thread-1');

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toEqual({ preferences: [], renderedLength: 0, injectedThisTurn: false });
	});

	it('injects the block and reports it when the conversation never carried one', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);

		const turn = await service.resolveAiPreferencesTurn('user-1', boundProject, 'thread-1');

		expect(service.aiPreferenceService.getApplicable).toHaveBeenCalledWith('user-1', [
			boundProject,
		]);
		expect(turn.block).toContain('<ai-preferences>');
		expect(turn.block).toContain('Preferences for project "Marketing":');
		expect(turn.block).toContain('- Keep replies short.');
		expect(turn.payload).toEqual({
			preferences: [
				{ id: 'pref-1', scope: 'user' },
				{ id: 'pref-2', scope: 'project', projectId: 'project-1', projectName: 'Marketing' },
			],
			renderedLength: turn.block?.length,
			injectedThisTurn: true,
		});
	});

	it('re-uses the previous copy when the rendered text is unchanged', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		const block = renderAiPreferencesBlock(applicable);
		if (!block) throw new Error('expected a block');
		// A later user turn without a block must not stop the scan.
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(block),
			{ role: 'assistant', content: 'Done.' },
			storedUserTurn(undefined, 'Thanks'),
		]);

		const turn = await service.resolveAiPreferencesTurn('user-1', boundProject, 'thread-1');

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toEqual({
			preferences: [
				{ id: 'pref-1', scope: 'user' },
				{ id: 'pref-2', scope: 'project', projectId: 'project-1', projectName: 'Marketing' },
			],
			renderedLength: block.length,
			injectedThisTurn: false,
		});
	});

	it('re-sends the block when the rendered text differs from the previous copy', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		const olderBlock = renderAiPreferencesBlock({
			...none,
			user: [{ id: 'pref-1', content: 'Write long replies.' }],
		});
		if (!olderBlock) throw new Error('expected a block');
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(olderBlock)]);

		const turn = await service.resolveAiPreferencesTurn('user-1', boundProject, 'thread-1');

		expect(turn.block).toContain('- Keep replies short.');
		expect(turn.payload).toMatchObject({ injectedThisTurn: true });
	});

	it('publishes an empty payload when the read fails, without touching the history', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockRejectedValue(new Error('db down'));

		const turn = await service.resolveAiPreferencesTurn('user-1', undefined, 'thread-1');

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toEqual({ preferences: [], renderedLength: 0, injectedThisTurn: false });
		expect(service.agentMemory.getMessages).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Instance AI failed to read the AI preferences for this turn',
			{ userId: 'user-1', error: 'db down' },
		);
	});

	it('sends the cleared block once when every preference is gone but the thread carries one', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(none);
		const block = renderAiPreferencesBlock(applicable);
		if (!block) throw new Error('expected a block');
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(block)]);

		const turn = await service.resolveAiPreferencesTurn('user-1', undefined, 'thread-1');

		expect(turn.block).toBe(AI_PREFERENCES_CLEARED_BLOCK);
		expect(turn.payload).toEqual({
			preferences: [],
			renderedLength: AI_PREFERENCES_CLEARED_BLOCK.length,
			injectedThisTurn: true,
		});

		// The cleared block obeys the same change rule: a thread that stays empty carries it once.
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(block),
			storedUserTurn(AI_PREFERENCES_CLEARED_BLOCK),
		]);
		const nextTurn = await service.resolveAiPreferencesTurn('user-1', undefined, 'thread-1');

		expect(nextTurn.block).toBeUndefined();
		expect(nextTurn.payload).toMatchObject({ preferences: [], injectedThisTurn: false });
	});

	it('sends nothing and reports an empty payload when there are no preferences and never were', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(none);

		const turn = await service.resolveAiPreferencesTurn('user-1', undefined, 'thread-1');

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toEqual({ preferences: [], renderedLength: 0, injectedThisTurn: false });
	});

	it('injects when the history read fails, because re-sending is the safe direction', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		service.agentMemory.getMessages.mockRejectedValue(new Error('history down'));

		const turn = await service.resolveAiPreferencesTurn('user-1', boundProject, 'thread-1');

		expect(turn.block).toContain('<ai-preferences>');
		expect(turn.payload).toMatchObject({ injectedThisTurn: true });
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Instance AI failed to read the last AI preferences block of this thread',
			{ threadId: 'thread-1', error: 'history down' },
		);
	});

	it('re-injects when the observation cursor has compacted the turn that carried the block', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		const block = renderAiPreferencesBlock(applicable);
		if (!block) throw new Error('expected a block');
		// The full table still holds the block, but the model only replays the post-cursor
		// tail, where the block does not appear — so it must count as absent.
		const cursor = {
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'msg-9',
			lastObservedAt: new Date('2026-09-01T00:00:00.000Z'),
		};
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(block)]);
		service.agentMemory.getCursor.mockResolvedValue(cursor);
		service.agentMemory.getActiveObservationLog.mockResolvedValue([{ id: 'obs-1' }]);
		service.agentMemory.getMessagesForObservationScope.mockResolvedValue([
			storedUserTurn(undefined, 'Thanks'),
		]);

		const turn = await service.resolveAiPreferencesTurn('user-1', boundProject, 'thread-1');

		expect(turn.block).toContain('<ai-preferences>');
		expect(turn.payload).toMatchObject({ injectedThisTurn: true });
		expect(service.agentMemory.getMessages).not.toHaveBeenCalled();
		expect(service.agentMemory.getMessagesForObservationScope).toHaveBeenCalledWith('thread-1', {
			since: {
				sinceCreatedAt: cursor.lastObservedAt,
				sinceMessageId: cursor.lastObservedMessageId,
			},
		});
	});

	it('reads the full history when a cursor exists without an active observation, like the runtime', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		const block = renderAiPreferencesBlock(applicable);
		if (!block) throw new Error('expected a block');
		service.agentMemory.getCursor.mockResolvedValue({
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'msg-9',
			lastObservedAt: new Date('2026-09-01T00:00:00.000Z'),
		});
		service.agentMemory.getActiveObservationLog.mockResolvedValue([]);
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(block)]);

		const turn = await service.resolveAiPreferencesTurn('user-1', boundProject, 'thread-1');

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toMatchObject({ injectedThisTurn: false });
		expect(service.agentMemory.getMessagesForObservationScope).not.toHaveBeenCalled();
	});
});

describe('getThreadMemory', () => {
	type MemoryInternals = {
		getThreadMemory: InstanceAiService['getThreadMemory'];
		systemAgents: { findThread: Mock };
		agentMemory: { getObservationLog: Mock; getCursor: Mock };
	};

	function buildService(): MemoryInternals {
		const service = Object.create(InstanceAiService.prototype) as unknown as MemoryInternals;
		service.systemAgents = {
			findThread: vi.fn().mockResolvedValue({ id: 'thread-1', ownerId: 'user-1' }),
		};
		service.agentMemory = {
			getObservationLog: vi.fn().mockResolvedValue([]),
			getCursor: vi.fn().mockResolvedValue(null),
		};
		return service;
	}

	it("refuses another user's thread before it reads anything", async () => {
		// The controller checks ownership too; this keeps the service safe for any other caller.
		const service = buildService();
		await expect(service.getThreadMemory('user-2', 'thread-1')).rejects.toThrow(ForbiddenError);
		expect(service.agentMemory.getObservationLog).not.toHaveBeenCalled();
		expect(service.agentMemory.getCursor).not.toHaveBeenCalled();
	});

	it('refuses a thread that does not exist', async () => {
		const service = buildService();
		service.systemAgents.findThread.mockResolvedValue(null);
		await expect(service.getThreadMemory('user-1', 'thread-1')).rejects.toThrow(ForbiddenError);
	});

	it('returns the live rows and the cursor as an ISO timestamp', async () => {
		const service = buildService();
		service.agentMemory.getObservationLog.mockResolvedValue([
			{
				id: 'obs-1',
				marker: 'critical',
				text: 'Posting via HTTP Request',
				tokenCount: 7,
				status: 'active',
				observationScopeId: 'thread-1',
			},
		]);
		service.agentMemory.getCursor.mockResolvedValue({
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'm137',
			lastObservedAt: new Date('2020-01-01T00:00:00.000Z'),
		});

		const memory = await service.getThreadMemory('user-1', 'thread-1');

		// Only the three fields the eval grades on; ids and status stay server-side.
		expect(memory).toEqual({
			observations: [{ marker: 'critical', text: 'Posting via HTTP Request', tokenCount: 7 }],
			cursor: { lastObservedMessageId: 'm137', lastObservedAt: '2020-01-01T00:00:00.000Z' },
		});
		expect(service.agentMemory.getObservationLog).toHaveBeenCalledWith({
			observationScopeId: 'thread-1',
			status: 'active',
		});
		expect(service.agentMemory.getCursor).toHaveBeenCalledWith('thread-1');
	});

	it('returns a null cursor and no rows when the observer never ran', async () => {
		const service = buildService();
		expect(await service.getThreadMemory('user-1', 'thread-1')).toEqual({
			observations: [],
			cursor: null,
		});
	});
});

describe('InstanceAiService — personal integrations in a shared thread', () => {
	type EnvironmentService = {
		createExecutionEnvironment: (
			user: User,
			threadId: string,
			runId: string,
			abortSignal: AbortSignal,
		) => Promise<unknown>;
	} & Record<string, unknown>;

	const gateway = {
		isConnected: true,
		getAvailableTools: () => [],
		getStatus: () => ({ toolCategories: [] }),
	};
	const browser = { getAvailableTools: () => [], setDomainGate: vi.fn() };

	/** A service that reaches the end of the environment setup, with a connected computer and browser. */
	function makeService(accessScope: 'user' | 'project', browserUseEnabled: boolean) {
		const service = Object.create(InstanceAiService.prototype) as EnvironmentService;
		const context: Record<string, unknown> = {};
		const forContext = vi.fn(() => ({ search: vi.fn() }));
		const findMcpServer = vi.fn(() => browser);
		const createContext = vi.fn(() => context);
		const areMcpConnectionsAvailable = vi.fn(() => true);
		Object.assign(service, {
			areMcpConnectionsAvailable,
			settingsService: {
				getAdminSettings: vi.fn(() => ({ localGatewayDisabled: false, browserUseEnabled })),
				getSandboxStatus: vi.fn(() => ({
					enabled: true,
					provider: 'n8n-sandbox',
					workflowBuilderAvailable: true,
					unavailableReason: null,
				})),
				isLocalGatewayDisabledForUser: vi.fn(async () => false),
				getPermissions: vi.fn(() => ({})),
			},
			gatewayService: { findGateway: vi.fn(() => gateway), applyToolPolicy: vi.fn() },
			aiService: { isProxyEnabled: vi.fn(() => false) },
			adapterService: {
				createContext,
				getNodeDefinitionDirs: vi.fn(() => []),
				resolveExperimentGates: vi.fn().mockResolvedValue({
					configEvalsEnabled: false,
					conversationHistoryEnabled: true,
					progressiveBuildingEnabled: false,
					conciseStyleEnabled: false,
					nodeUsageEnabled: false,
					nodeContextEnabled: false,
					folderExplorationEnabled: false,
					aiPreferencesEnabled: false,
					setupPanelEnabled: false,
				}),
			},
			conversationHistoryService: { forContext },
			instanceWriteAccess: { isReadOnly: vi.fn(() => false) },
			modelService: { resolveAgentModelConfig: vi.fn(async () => 'model-1') },
			systemAgents: {
				findThread: vi.fn(async () => ({ projectId: 'project-1', accessScope, ownerId: 'user-1' })),
			},
			agentMemory: { getThread: vi.fn(async () => undefined) },
			dbIterationLogStorage: {},
			dbSnapshotStorage: {},
			instanceAiConfig: {},
			aiConfig: {},
			defaultTimeZone: 'UTC',
			eventBus: {},
			logger: { warn: vi.fn() },
			telemetry: { track: vi.fn() },
			oauth2CallbackUrl: 'http://localhost/rest/oauth2-credential/callback',
			webhookBaseUrl: 'http://localhost/webhook',
			formBaseUrl: 'http://localhost/form',
			setupPanelByThread: new Map(),
			schedulePlannedTasks: vi.fn(),
			domainAccessTrackersByThread: new Map(),
			browserSessionService: { findMcpServer },
			threadGrantRepo: { findKeys: vi.fn(async () => new Set<string>()) },
			sandboxService: new InstanceAiSandboxService({
				config: { sandboxEnabled: true, sandboxProvider: 'daytona' } as InstanceAiConfig,
				logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
				errorReporter: { error: vi.fn() } as unknown as ErrorReporter,
				settingsService: {
					resolveDaytonaConfig: vi.fn(async () => ({ apiKey: 'test-daytona-key' })),
					resolveN8nSandboxConfig: vi.fn(async () => ({})),
				},
				aiService: { isProxyEnabled: vi.fn(() => false), getClient: vi.fn() },
			}),
			evalCredentialAllowlists: new EvalThreadCredentialAllowlistService(),
			instanceAiErrorReporter: createInstanceAiErrorReporterMock(),
			aiUsageService: { isParameterValueSharingAllowed: vi.fn(async () => true) },
			creditService: { claimRunUsage: vi.fn(), ensureQuotaLockApplied: vi.fn(async () => {}) },
		});
		return {
			service,
			context,
			forContext,
			findMcpServer,
			createContext,
			areMcpConnectionsAvailable,
		};
	}

	const start = async (service: EnvironmentService) =>
		await service.createExecutionEnvironment(
			fakeUser,
			'thread-1',
			'run-1',
			new AbortController().signal,
		);

	it('gives a private thread the computer, the browser, the MCP connections and the past chats of its owner', async () => {
		const withGateway = makeService('user', false);
		const environment = await start(withGateway.service);
		expect(withGateway.context.localMcpServer).toBe(gateway);
		expect(withGateway.forContext).toHaveBeenCalledWith('user-1', 'project-1', 'thread-1');
		expect(withGateway.createContext).toHaveBeenCalledWith(
			fakeUser,
			expect.objectContaining({ mcpConnectionsAvailable: true }),
		);
		expect(environment).toMatchObject({ sharedThread: false });

		const withBrowser = makeService('user', true);
		withBrowser.service.gatewayService = { findGateway: vi.fn(), applyToolPolicy: vi.fn() };
		await start(withBrowser.service);
		expect(withBrowser.context.localMcpServer).toBe(browser);
	});

	it('runs a shared thread without the computer, the browser, the MCP connections or the past chats of its owner', async () => {
		const { service, context, forContext, findMcpServer, createContext } = makeService(
			'project',
			true,
		);

		const environment = await start(service);

		expect(context.localMcpServer).toBeUndefined();
		expect(findMcpServer).not.toHaveBeenCalled();
		expect(forContext).not.toHaveBeenCalled();
		expect(createContext).toHaveBeenCalledWith(
			fakeUser,
			expect.objectContaining({
				projectId: 'project-1',
				conversationHistory: undefined,
				mcpConnectionsAvailable: false,
			}),
		);
		expect(environment).toMatchObject({ sharedThread: true });
	});

	it('treats a project thread without an owner as not shared', async () => {
		const { service, createContext } = makeService('project', false);
		Object.assign(service, {
			systemAgents: {
				findThread: vi.fn(async () => ({
					projectId: 'project-1',
					accessScope: 'project',
					ownerId: null,
				})),
			},
		});

		await expect(start(service)).resolves.toMatchObject({ sharedThread: false });
		expect(createContext).toHaveBeenCalledWith(
			fakeUser,
			expect.objectContaining({ mcpConnectionsAvailable: true }),
		);
	});
});

describe('InstanceAiService — MCP servers of a run', () => {
	type McpService = {
		buildMcpServers: (
			user: User,
			threadId: string,
			runId: string,
			tracing: undefined,
			options: { messageGroupId?: string; personalConnections: boolean },
		) => Promise<{ name: string }[]>;
	} & Record<string, unknown>;

	function makeService() {
		const service = Object.create(InstanceAiService.prototype) as McpService;
		const getRegistryMcpServers = vi.fn(async () => [{ name: 'personal-notion' }]);
		Object.assign(service, {
			instanceAiConfig: { mcpServers: '' },
			parseMcpServers: vi.fn(() => [{ name: 'instance-docs' }]),
			settingsService: { isMcpAccessEnabled: vi.fn(() => true) },
			mcpRegistryService: { getRegistryMcpServers },
			instanceAiErrorReporter: {
				withBoundary: vi.fn(
					async (_name: string, _context: unknown, run: () => Promise<unknown>) => await run(),
				),
			},
		});
		return { service, getRegistryMcpServers };
	}

	it("adds the user's own MCP connections to the instance servers", async () => {
		const { service, getRegistryMcpServers } = makeService();

		const servers = await service.buildMcpServers(fakeUser, 'thread-1', 'run-1', undefined, {
			personalConnections: true,
		});

		expect(servers).toEqual([{ name: 'instance-docs' }, { name: 'personal-notion' }]);
		expect(getRegistryMcpServers).toHaveBeenCalledWith(fakeUser);
	});

	it("leaves out the user's own MCP connections when the chat is shared", async () => {
		const { service, getRegistryMcpServers } = makeService();

		const servers = await service.buildMcpServers(fakeUser, 'thread-1', 'run-1', undefined, {
			personalConnections: false,
		});

		expect(servers).toEqual([{ name: 'instance-docs' }]);
		expect(getRegistryMcpServers).not.toHaveBeenCalled();
	});
});
