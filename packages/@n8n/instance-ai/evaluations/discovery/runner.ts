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
// stubbed — when the orchestrator calls browser-credential-setup, that
// tool's execute() may error (no real browser MCP, no real services for
// sub-agent spawning) and that's fine: the tool-call event fires before
// execution, so the discovery check still sees what the orchestrator
// reached for. maxSteps caps the loop so an erroring tool can't drive
// API spend.
// ---------------------------------------------------------------------------

import type { ToolsInput } from '@mastra/core/agent';
import { InMemoryStore, type MastraCompositeStore } from '@mastra/core/storage';
import type { InstanceAiEvent, TaskList } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import { runExpectedToolsInvokedCheck } from './expected-tools-invoked';
import { createStubLocalMcpServer } from './stub-local-mcp';
import type { DiscoveryCheckResult, DiscoveryTestCase } from './types';
import { createInstanceAgent } from '../../src/agent/instance-agent';
import type { InstanceAiEventBus } from '../../src/event-bus';
import type { Logger } from '../../src/logger';
import { McpClientManager } from '../../src/mcp/mcp-client-manager';
import { executeResumableStream } from '../../src/runtime/resumable-stream-executor';
import { createAllTools } from '../../src/tools';
import type {
	InstanceAiContext,
	LocalGatewayStatus,
	ModelConfig,
	OrchestrationContext,
	TaskStorage,
} from '../../src/types';
import { asResumable } from '../../src/utils/stream-helpers';
import { createInMemoryEventBus, wrapEventBusWithObserver } from '../harness/in-process-builder';
import { createStubServices, defaultNodesJsonPath } from '../harness/stub-services';
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
	/** Hard cap on agent steps. Discovery scenarios are single-turn — 5 is plenty. */
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
	streamStatus: 'completed' | 'errored' | 'cancelled' | 'suspended';
	/** Populated when the run errored before reaching the check. */
	runError?: string;
}

export async function runDiscoveryScenario(
	options: DiscoveryRunOptions,
): Promise<DiscoveryRunResult> {
	const started = Date.now();
	const maxSteps = options.maxSteps ?? 5;
	const timeoutMs = options.timeoutMs ?? 60_000;
	const nodesJsonPath = options.nodesJsonPath ?? defaultNodesJsonPath();

	const events: CapturedEvent[] = [];

	let streamStatus: DiscoveryRunResult['streamStatus'] = 'completed';
	let runError: string | undefined;

	const abortController = new AbortController();
	const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);

	try {
		const services = await createStubServices({ nodesJsonPath });
		const context = applyInstanceState(services.context, options.scenario);

		const mcpManager = new McpClientManager();
		const storage = new InMemoryStore({ id: 'discovery-' + nanoid(6) });
		const threadId = 'discovery-thread-' + nanoid(6);
		const runId = 'discovery-run-' + nanoid(6);

		// Track outstanding confirmation requests so the auto-approve can simulate the
		// production "user clicks Auto-setup with browser" path for credential setup
		// suspensions. Without this, `credentials(action="setup")` returns the
		// "user picked existing credentials" branch and the orchestrator never sees
		// `needsBrowserSetup=true` — which is what wires it to `browser-credential-setup`
		// per the system prompt.
		const pendingConfirmations = new Map<string, { credentialType?: string }>();

		const eventBus = wrapEventBusWithObserver(createInMemoryEventBus(), (event) => {
			events.push(toCapturedEvent(event));
			recordConfirmationRequest(event, pendingConfirmations);
		});

		// `OrchestrationContext` is required for the orchestrator to receive tools like
		// `browser-credential-setup`, `delegate`, `plan`. Without it, the orchestrator's
		// only browser-adjacent tools come from the local MCP server directly, which is
		// a different (and less production-faithful) dispatch path. We provide stubs for
		// the heavy fields — sub-agent execution paths will fail if reached, but the
		// orchestrator's first-step tool-call decisions are what we measure, and those
		// fire before any sub-agent execution.
		const orchestrationContext = createStubOrchestrationContext({
			context,
			modelId: options.modelId,
			storage,
			eventBus,
			threadId,
			runId,
			abortSignal: abortController.signal,
		});

		const agent = await createInstanceAgent({
			modelId: options.modelId,
			context,
			orchestrationContext,
			mcpManager,
			memoryConfig: { storage },
			// Eager tool loading — discovery measures dispatch given the full toolset,
			// not whether the orchestrator can find a tool through search.
			disableDeferredTools: true,
		});

		const streamSource = await agent.stream(options.scenario.userMessage, {
			maxSteps,
			abortSignal: abortController.signal,
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' as const } },
			},
		});

		const result = await executeResumableStream({
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
				// Auto-approve every confirmation/HITL suspension so the run drives to
				// completion. For credentials(action="setup") suspensions, pretend the user
				// chose "Auto-setup with browser" — that's what unlocks the production
				// `needsBrowserSetup=true` → `browser-credential-setup` dispatch path.
				// eslint-disable-next-line @typescript-eslint/require-await
				waitForConfirmation: async (requestId: string): Promise<Record<string, unknown>> => {
					const pending = pendingConfirmations.get(requestId);
					if (pending?.credentialType) {
						return { approved: true, autoSetup: { credentialType: pending.credentialType } };
					}
					return { approved: true };
				},
			},
		});

		if (abortController.signal.aborted || result.status === 'cancelled') {
			streamStatus = 'cancelled';
		} else if (result.status === 'errored') {
			streamStatus = 'errored';
		} else if (result.status === 'suspended') {
			streamStatus = 'suspended';
		}

		await mcpManager.disconnect();
	} catch (error) {
		runError = error instanceof Error ? error.message : String(error);
		streamStatus = 'errored';
	} finally {
		clearTimeout(timeoutHandle);
	}

	const outcome = extractOutcomeFromEvents(events);
	const check = runExpectedToolsInvokedCheck(options.scenario, outcome);

	return {
		scenario: options.scenario,
		check,
		events,
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
	};
}

function silentLogger(): Logger {
	return { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
}

interface StubOrchestrationContextOptions {
	context: InstanceAiContext;
	modelId: ModelConfig;
	storage: MastraCompositeStore;
	eventBus: InstanceAiEventBus;
	threadId: string;
	runId: string;
	abortSignal: AbortSignal;
}

function createStubOrchestrationContext(
	opts: StubOrchestrationContextOptions,
): OrchestrationContext {
	// Domain tools are passed to spawned sub-agents (delegate, browser-credential-setup).
	// Discovery scenarios measure the orchestrator's first-step dispatch decision; sub-agent
	// execution is out of scope. We still populate domainTools faithfully so any sub-agent
	// that does spawn has a coherent toolset (avoids hitting "no tools" errors that would
	// confuse the diagnostic comment).
	const domainTools: ToolsInput = createAllTools(opts.context);

	const taskStorage: TaskStorage = {
		// eslint-disable-next-line @typescript-eslint/require-await
		get: async (): Promise<TaskList | null> => null,
		// eslint-disable-next-line @typescript-eslint/require-await
		save: async (): Promise<void> => {},
	};

	return {
		threadId: opts.threadId,
		runId: opts.runId,
		userId: opts.context.userId,
		orchestratorAgentId: 'n8n-instance-agent',
		modelId: opts.modelId,
		storage: opts.storage,
		subAgentMaxSteps: 10,
		eventBus: opts.eventBus,
		logger: silentLogger(),
		domainTools,
		abortSignal: opts.abortSignal,
		taskStorage,
		// Surface the localMcpServer to orchestration tools so `browser-credential-setup`
		// is loaded (its presence is gated on `localMcpServer` having browser tools, see
		// src/tools/index.ts:82-86).
		...(opts.context.localMcpServer ? { localMcpServer: opts.context.localMcpServer } : {}),
		// Used for the orchestrator's untrusted-content doctrine and other domain references
		// inside sub-agent tools. Provide the same context the orchestrator sees.
		domainContext: opts.context,
	};
}

/**
 * Capture credentialType from `confirmation-request` events whose payload includes
 * a credentialRequests array. The first request's credentialType is what the
 * `autoSetup` resume payload needs — the production credentials tool only
 * exposes one credential at a time when needsBrowserSetup is involved.
 */
function recordConfirmationRequest(
	event: InstanceAiEvent,
	pending: Map<string, { credentialType?: string }>,
): void {
	if (event.type !== 'confirmation-request') return;
	const payload = event.payload as
		| {
				requestId?: string;
				credentialRequests?: Array<{ credentialType?: string }>;
		  }
		| undefined;
	const requestId = payload?.requestId;
	if (typeof requestId !== 'string' || requestId.length === 0) return;
	const credentialType = payload?.credentialRequests?.[0]?.credentialType;
	pending.set(requestId, credentialType ? { credentialType } : {});
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
