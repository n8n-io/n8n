// ---------------------------------------------------------------------------
// In-process discovery runner.
//
// Drives the orchestrator with a scenario's userMessage + instanceState,
// captures InstanceAi events into the CapturedEvent[] shape that
// extractOutcomeFromEvents consumes, then runs the discovery check. No
// Docker, no n8n server — the orchestrator runs in-process against
// stubbed services.
//
// What's tested: the orchestrator's first dispatch decision. Tools are NOT
// stubbed — when the orchestrator loads a runtime skill or reaches for a
// Computer Use browser tool, the tool-call event fires before any downstream
// failure, so the discovery check still sees the dispatch intent. The wall-clock
// timeout bounds the trial, not the run: at the budget the trial stops and fails,
// and the abandoned stream is left to unwind on its own. Scenarios or --max-steps
// can additionally opt into an iteration cap.
// ---------------------------------------------------------------------------

import type { InstanceAiEvent, TaskList } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import {
	buildConfirmationPolicy,
	resolveConfirmation,
	unmatchedConfirmations,
	type ApprovalResponder,
} from './confirmation-policy';
import { credentialAutoSetupResponder } from './credential-approval';
import { evaluateDiscoveryTrial } from './expected-tools-invoked';
import { resolveStreamStatus } from './stream-status';
import { createStubLocalMcpServer } from './stub-local-mcp';
import {
	createMcpConnectResponder,
	createStubMcpRegistry,
	createStubMcpToolRegistry,
	StubMcpClientManager,
	stubMcpServerConfigs,
	type StubMcpRegistry,
} from './stub-mcp-registry';
import type { DiscoveryCheckResult, DiscoveryStreamStatus, DiscoveryTestCase } from './types';
import { createInstanceAgent } from '../../src/agent/instance-agent';
import type { InstanceAiEventBus } from '../../src/event-bus';
import type { Logger } from '../../src/logger';
import {
	executeResumableStream,
	normalizeStreamSource,
} from '../../src/runtime/resumable-stream-executor';
import { loadInstanceAiRuntimeSkillSource } from '../../src/skills/runtime-skills';
import { createAllTools } from '../../src/tools';
import type {
	InstanceAiContext,
	InstanceAiToolRegistry,
	LocalGatewayStatus,
	ModelConfig,
	OrchestrationContext,
	TaskStorage,
} from '../../src/types';
import { asResumable, type SuspensionInfo } from '../../src/utils/stream-helpers';
import { createInMemoryEventBus, wrapEventBusWithObserver } from '../harness/in-memory-event-bus';
import { createStubServices, defaultNodesJsonPath } from '../harness/stub-services';
import { createStubWorkspace, stubWorkspaceRoot } from '../harness/stub-workspace';
import { extractOutcomeFromEvents } from '../outcome/event-parser';
import type { CapturedEvent, EventOutcome } from '../types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DiscoveryRunOptions {
	scenario: DiscoveryTestCase;
	modelId: ModelConfig;
	/** Defaults to `defaultNodesJsonPath()`. */
	nodesJsonPath?: string;
	/** Hard cap on agent steps. Unset leaves the SDK's own 30-iteration ceiling in place. */
	maxSteps?: number;
	/** Per-trial timeout in ms. */
	timeoutMs?: number;
}

export interface DiscoveryRunResult {
	scenario: DiscoveryTestCase;
	check: DiscoveryCheckResult;
	events: CapturedEvent[];
	outcome: EventOutcome;
	durationMs: number;
	/** Final agent status — useful for diagnosing why noop / unexpected loops happened. */
	streamStatus: DiscoveryStreamStatus;
	/** Populated when the run errored before reaching the check. */
	runError?: string;
}

export async function runDiscoveryScenario(
	options: DiscoveryRunOptions,
): Promise<DiscoveryRunResult> {
	const started = Date.now();
	// Unset by default: the orchestrator legitimately explores past any small fixed cap
	// (data-table-workflow needs >8 iterations). Unset still lands on the SDK's own
	// 30-iteration ceiling, which reports `step-exhausted`.
	const maxSteps = options.scenario?.maxSteps ?? options.maxSteps;
	const timeoutMs = options.scenario?.timeoutMs ?? options.timeoutMs ?? 60_000;
	const nodesJsonPath = options.nodesJsonPath ?? defaultNodesJsonPath();

	const events: CapturedEvent[] = [];

	let streamStatus: DiscoveryRunResult['streamStatus'] = 'completed';
	let runError: string | undefined;

	const confirmationPolicy = buildConfirmationPolicy(options.scenario);
	const suspensions = new Map<string, SuspensionInfo>();

	const abortController = new AbortController();
	let mcpManager: StubMcpClientManager | undefined;
	let timeoutHandle: NodeJS.Timeout | undefined;
	const budgetExpired = new Promise<'timed-out'>((resolve) => {
		timeoutHandle = setTimeout(() => {
			abortController.abort();
			resolve('timed-out');
		}, timeoutMs);
	});

	try {
		const services = await createStubServices({ nodesJsonPath });
		const mcpState = options.scenario.instanceState?.mcp;
		const mcpRegistry = mcpState ? createStubMcpRegistry(mcpState) : undefined;
		const context: InstanceAiContext = {
			...applyInstanceState(services.context, options.scenario, mcpRegistry),
			workspace: createStubWorkspace(),
			workspaceRoot: stubWorkspaceRoot,
		};

		mcpManager = new StubMcpClientManager(createStubMcpToolRegistry(mcpState ?? {}));
		const threadId = 'discovery-thread-' + nanoid(6);
		const runId = 'discovery-run-' + nanoid(6);

		const approvalResponders: ApprovalResponder[] = [
			credentialAutoSetupResponder,
			...(mcpRegistry ? [createMcpConnectResponder(mcpRegistry)] : []),
		];

		const eventBus = wrapEventBusWithObserver(createInMemoryEventBus(), (event) => {
			events.push(toCapturedEvent(event));
		});

		// `OrchestrationContext` is required for the orchestrator to receive tools like
		// `create-tasks`, `eval-setup-with-agent`, and runtime skills. We provide stubs
		// for the heavy fields: discovery scenarios measure first-step tool-call
		// decisions, not background execution.
		const orchestrationContext = createStubOrchestrationContext({
			context,
			modelId: options.modelId,
			eventBus,
			threadId,
			runId,
			abortSignal: abortController.signal,
		});

		const { agent } = await createInstanceAgent({
			modelId: options.modelId,
			context,
			orchestrationContext,
			mcpServers: stubMcpServerConfigs(mcpState ?? {}),
			mcpManager,
			// No memory: discovery measures stateless first-step tool dispatch.
			memoryConfig: {},
			thinkingEnabled: false,
		});

		const streamSource = normalizeStreamSource(
			await agent.stream(options.scenario.userMessage, {
				maxIterations: maxSteps,
				abortSignal: abortController.signal,
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' as const } },
				},
			}),
		);

		const run = executeResumableStream({
			agent: asResumable(agent),
			stream: streamSource,
			context: {
				threadId,
				runId,
				agentId: 'n8n-instance-agent',
				eventBus,
				signal: abortController.signal,
				logger: silentLogger(),
			},
			control: {
				mode: 'auto',
				onSuspension: (suspension) => suspensions.set(suspension.requestId, suspension),
				waitForConfirmation: async (requestId: string): Promise<Record<string, unknown>> =>
					await Promise.resolve(
						resolveConfirmation(suspensions.get(requestId), confirmationPolicy, approvalResponders),
					),
			},
		});
		void run.catch(() => {});
		const result = await Promise.race([run, budgetExpired]);

		streamStatus = resolveStreamStatus(result, abortController.signal.aborted);
	} catch (error) {
		runError = error instanceof Error ? error.message : String(error);
		streamStatus = abortController.signal.aborted ? 'timed-out' : 'errored';
	} finally {
		clearTimeout(timeoutHandle);
		await mcpManager?.disconnect();
	}

	const observedEvents = [...events];
	const outcome = extractOutcomeFromEvents(observedEvents);
	const check = evaluateDiscoveryTrial(options.scenario, outcome, {
		streamStatus,
		timeoutMs,
		...(runError ? { runError } : {}),
		unmatchedConfirmations: unmatchedConfirmations(confirmationPolicy, suspensions.values()),
	});

	return {
		scenario: options.scenario,
		check,
		// An abandoned stream can still publish, so hand back what the verdict saw.
		events: [...events],
		outcome,
		durationMs: Date.now() - started,
		streamStatus,
		...(runError ? { runError } : {}),
	};
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function applyInstanceState(
	base: InstanceAiContext,
	scenario: DiscoveryTestCase,
	mcpRegistry: StubMcpRegistry | undefined,
): InstanceAiContext {
	const state = scenario.instanceState;
	if (!state) return base;

	const localGateway: LocalGatewayStatus | undefined = state.localGateway;
	const isConnected = localGateway?.status === 'connected';
	const capabilities = isConnected ? localGateway.capabilities : [];

	const localMcpServer = isConnected
		? createStubLocalMcpServer({
				capabilities: capabilities.filter(
					(c): c is 'browser' | 'filesystem' | 'shell' =>
						c === 'browser' || c === 'filesystem' || c === 'shell',
				),
			})
		: base.localMcpServer;

	return {
		...base,
		...(localGateway ? { localGatewayStatus: localGateway } : {}),
		...(localMcpServer ? { localMcpServer } : {}),
		...(mcpRegistry ? { mcpService: mcpRegistry.service } : {}),
	};
}

function silentLogger(): Logger {
	return { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
}

interface StubOrchestrationContextOptions {
	context: InstanceAiContext;
	modelId: ModelConfig;
	eventBus: InstanceAiEventBus;
	threadId: string;
	runId: string;
	abortSignal: AbortSignal;
}

function createStubOrchestrationContext(
	opts: StubOrchestrationContextOptions,
): OrchestrationContext {
	// Domain tools are passed to background agents such as eval-setup.
	// Discovery scenarios measure the orchestrator's first-step dispatch decision;
	// background execution is out of scope. We still populate domainTools faithfully
	// so any background agent that does spawn has a coherent toolset (avoids hitting
	// "no tools" errors that would confuse the diagnostic comment).
	const domainTools: InstanceAiToolRegistry = createAllTools(opts.context);

	const taskStorage: TaskStorage = {
		// eslint-disable-next-line @typescript-eslint/require-await
		get: async (): Promise<TaskList | null> => null,

		save: async (): Promise<void> => {},
	};

	return {
		threadId: opts.threadId,
		runId: opts.runId,
		userId: opts.context.userId,
		orchestratorAgentId: 'n8n-instance-agent',
		modelId: opts.modelId,
		eventBus: opts.eventBus,
		logger: silentLogger(),
		domainTools,
		runtimeSkills: loadInstanceAiRuntimeSkillSource(),
		abortSignal: opts.abortSignal,
		taskStorage,
		// Discovery evals assert first-dispatch intent only. Production starts a
		// detached background task here; the harness accepts the spawn so the tool
		// can publish its `agent-spawned` event without executing the background agent.
		spawnBackgroundTask: ({ taskId, agentId }) => ({ status: 'started', taskId, agentId }),
		// Surface the localMcpServer so Computer Use browser tools are available to the
		// orchestrator.
		...(opts.context.localMcpServer ? { localMcpServer: opts.context.localMcpServer } : {}),
		// Registers the `workspace_*` file tools for build-workflow
		...(opts.context.workspace ? { workspace: opts.context.workspace } : {}),
		...(opts.context.workspaceRoot ? { workspaceRoot: opts.context.workspaceRoot } : {}),
		// Used for the orchestrator's untrusted-content doctrine and other domain references.
		// Provide the same context the orchestrator sees.
		domainContext: opts.context,
	};
}

function toCapturedEvent(event: InstanceAiEvent): CapturedEvent {
	return {
		timestamp: Date.now(),
		type: event.type,
		// `extractOutcomeFromEvents` reads `data.payload.toolName` etc. — our
		// InstanceAiEvent already has that shape, so we pass it through directly.
		data: event as unknown as Record<string, unknown>,
	};
}
