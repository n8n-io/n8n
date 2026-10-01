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
//
// Routing mode (`stopOnRoute`) aborts the run at the orchestrator's first
// committing call (evaluations/routing/route-rules.ts). Routing scenarios have
// no tool expectations, so no check runs; the routing grader reads the events.
//
// A routing scenario can carry a `seed` and an `attach`. The stub instance then
// serves the seeded workflows, Agents, data tables, and failed prior runs; the
// seeded messages become thread history; and the attached resource reaches the
// orchestrator in the same `<thread-context>` block production sends. A case
// that seeds Agents also gets a read-only `agent-context` tool over them.
// ---------------------------------------------------------------------------

import type { RuntimeSkillSource } from '@n8n/agents';
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
import { createStubAgentContextReader } from './stub-agent-context';
import { createStubLocalMcpServer } from './stub-local-mcp';
import {
	createMcpConnectResponder,
	createStubMcpRegistry,
	createStubMcpToolRegistry,
	StubMcpClientManager,
	stubMcpServerConfigs,
	type StubMcpRegistry,
} from './stub-mcp-registry';
import {
	buildRoutingTurnMessage,
	createSeededMemory,
	STUB_PROJECT_ID,
	toResourceAttachment,
} from './routing-context';
import { ORCHESTRATOR_AGENT_ID, type RouteStop } from './routing-trial';
import type {
	DiscoveryCheckResult,
	DiscoveryScenario,
	DiscoveryStreamStatus,
	RoutingSeed,
} from './types';
import { createInstanceAgent } from '../../src/agent/instance-agent';
import type { InstanceAiEventBus } from '../../src/event-bus';
import type { Logger } from '../../src/logger';
import {
	executeResumableStream,
	normalizeStreamSource,
	type ExecuteResumableStreamResult,
} from '../../src/runtime/resumable-stream-executor';
import { loadInstanceAiRuntimeSkillSource } from '../../src/skills/runtime-skills';
import { ASK_USER_TOOL_ID } from '../../src/tools/tool-ids';
import type { RunTokenUsage } from '../../src/stream/usage-accumulator';
import type {
	BuilderTurnStream,
	InstanceAiContext,
	InstanceAiBuilderDelegate,
	ComputerUseState,
	ModelConfig,
	OrchestrationContext,
	TaskStorage,
} from '../../src/types';
import { isAgentFeatureEnabled } from '../../src/utils/agent-feature-enabled';
import { asResumable, type SuspensionInfo } from '../../src/utils/stream-helpers';
import { createInMemoryEventBus, wrapEventBusWithObserver } from '../harness/in-memory-event-bus';
import { createStubServices, defaultNodesJsonPath } from '../harness/stub-services';
import { createStubWorkspace, stubWorkspaceRoot } from '../harness/stub-workspace';
import { extractOutcomeFromEvents } from '../outcome/event-parser';
import { isCommittingCall } from '../routing/route-rules';
import type { CapturedEvent, EventOutcome } from '../types';

/** How long a run stopped on its route may take to wind down and report usage. */
const STOP_SETTLE_MS = 10_000;

/** How long a stop at `ask-user` waits for the card to suspend before it aborts anyway. */
const STOP_SUSPENSION_WAIT_MS = 5_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DiscoveryRunOptions {
	scenario: DiscoveryScenario;
	modelId: ModelConfig;
	/** Defaults to `defaultNodesJsonPath()`. */
	nodesJsonPath?: string;
	/** Hard cap on agent steps. Unset leaves the SDK's own 30-iteration ceiling in place. */
	maxSteps?: number;
	/** Per-trial timeout in ms. */
	timeoutMs?: number;
	/** Abort the run at the orchestrator's first committing call. */
	stopOnRoute?: boolean;
	/** After a timeout, wait up to this long for the stream to wind down so its token
	 *  usage is reported. Unset abandons a timed-out stream at once. */
	settleGraceMs?: number;
	/** Orchestrator skill catalog. Defaults to the bundled skills (see `--skill-file`). */
	runtimeSkills?: RuntimeSkillSource;
}

export interface DiscoveryRunResult {
	scenario: DiscoveryScenario;
	/** Absent when the scenario declares no tool expectations (routing cases). */
	check?: DiscoveryCheckResult;
	events: CapturedEvent[];
	/** The same events with their schema types. */
	instanceEvents: InstanceAiEvent[];
	outcome: EventOutcome;
	durationMs: number;
	/** The in-process thread the trial ran on. */
	threadId: string;
	/** Final agent status — useful for diagnosing why noop / unexpected loops happened. */
	streamStatus: DiscoveryStreamStatus;
	/** The committing call that ended the run under `stopOnRoute`. */
	stop?: RouteStop;
	/** Orchestrator token usage, when the stream settled and reported it. */
	usage?: RunTokenUsage;
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
	const instanceEvents: InstanceAiEvent[] = [];
	// Held in an object: the event observer sets it, and a plain `let` would stay
	// narrowed to `undefined` for the reads below.
	const route: { stop?: RouteStop; abortOnSuspensionOf?: string } = {};

	let streamStatus: DiscoveryRunResult['streamStatus'] = 'completed';
	let runError: string | undefined;
	let usage: RunTokenUsage | undefined;

	const confirmationPolicy = buildConfirmationPolicy(options.scenario);
	const suspensions = new Map<string, SuspensionInfo>();

	const abortController = new AbortController();
	const threadId = 'discovery-thread-' + nanoid(6);
	let mcpManager: StubMcpClientManager | undefined;
	let timeoutHandle: NodeJS.Timeout | undefined;
	const budgetExpired = new Promise<'timed-out'>((resolve) => {
		timeoutHandle = setTimeout(() => {
			abortController.abort();
			resolve('timed-out');
		}, timeoutMs);
	});
	let stopSettleHandle: NodeJS.Timeout | undefined;
	let stopSuspensionHandle: NodeJS.Timeout | undefined;
	let abortForStop: () => void = () => {};
	// Bounds the wind-down after a route stop, in case the aborted stream hangs.
	const stopSettleExpired = new Promise<'timed-out'>((resolve) => {
		abortForStop = () => {
			if (abortController.signal.aborted) return;
			abortController.abort();
			stopSettleHandle = setTimeout(() => resolve('timed-out'), STOP_SETTLE_MS);
		};
	});

	try {
		const seed = options.scenario.seed;
		const services = await createStubServices({ nodesJsonPath, ...(seed ? { seed } : {}) });
		const mcpState = options.scenario.instanceState?.mcp;
		const mcpRegistry = mcpState ? createStubMcpRegistry(mcpState) : undefined;
		const agentsEnabled = isAgentFeatureEnabled();
		const context: InstanceAiContext = {
			...applyInstanceState(services.context, options.scenario, mcpRegistry),
			...(agentsEnabled ? { builderDelegate: createStubBuilderDelegate(seed) } : {}),
			// Only a case that seeds Agents gets `agent-context`, so every other case keeps its tool set.
			...(agentsEnabled && seed?.agents.length
				? { agentContextService: createStubAgentContextReader(seed.agents) }
				: {}),
			workspace: createStubWorkspace(),
			workspaceRoot: stubWorkspaceRoot,
		};

		mcpManager = new StubMcpClientManager(createStubMcpToolRegistry(mcpState ?? {}));
		const runId = 'discovery-run-' + nanoid(6);
		// Only a seed with messages gets memory, so an unseeded run keeps its stateless path.
		const memory = seed?.messages.length
			? await createSeededMemory(threadId, context.userId, seed.messages)
			: undefined;
		const turnMessage = buildRoutingTurnMessage(
			options.scenario.userMessage,
			options.scenario.attach ? toResourceAttachment(options.scenario.attach, seed) : undefined,
		);

		const approvalResponders: ApprovalResponder[] = [
			credentialAutoSetupResponder,
			...(mcpRegistry ? [createMcpConnectResponder(mcpRegistry)] : []),
		];

		const eventBus = wrapEventBusWithObserver(createInMemoryEventBus(), (event) => {
			instanceEvents.push(event);
			events.push(toCapturedEvent(event));
			if (
				options.stopOnRoute &&
				!route.stop &&
				event.type === 'tool-call' &&
				event.agentId === ORCHESTRATOR_AGENT_ID &&
				isCommittingCall(event.payload.toolName, event.payload.args)
			) {
				route.stop = {
					eventIndex: instanceEvents.length,
					toolName: event.payload.toolName,
					args: event.payload.args,
				};
				if (event.payload.toolName === ASK_USER_TOOL_ID) {
					// Abort once the card suspends: the suspension's finish chunk carries the
					// turn's token usage, and an earlier abort drops it.
					route.abortOnSuspensionOf = event.payload.toolCallId;
					stopSuspensionHandle = setTimeout(abortForStop, STOP_SUSPENSION_WAIT_MS);
				} else {
					// Abort outside the publisher's call stack.
					queueMicrotask(abortForStop);
				}
			}
		});

		// `OrchestrationContext` is required for the orchestrator to receive tools like
		// `create-tasks` and runtime skills. Discovery scenarios measure first-step
		// tool-call decisions, not background execution.
		const orchestrationContext = createStubOrchestrationContext({
			context,
			modelId: options.modelId,
			eventBus,
			threadId,
			runId,
			abortSignal: abortController.signal,
			...(options.runtimeSkills ? { runtimeSkills: options.runtimeSkills } : {}),
		});

		const { agent } = await createInstanceAgent({
			modelId: options.modelId,
			context,
			orchestrationContext,
			mcpServers: stubMcpServerConfigs(mcpState ?? {}),
			mcpManager,
			// No memory unless the case seeds prior messages: discovery measures
			// first-step tool dispatch.
			memoryConfig: {},
			...(memory ? { memory } : {}),
			thinkingEnabled: false,
		});

		const streamSource = normalizeStreamSource(
			await agent.stream(turnMessage, {
				maxIterations: maxSteps,
				abortSignal: abortController.signal,
				...(memory ? { persistence: { threadId, resourceId: context.userId } } : {}),
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
				agentId: ORCHESTRATOR_AGENT_ID,
				eventBus,
				signal: abortController.signal,
				logger: silentLogger(),
			},
			control: {
				mode: 'auto',
				onSuspension: (suspension) => {
					suspensions.set(suspension.requestId, suspension);
					if (suspension.toolCallId === route.abortOnSuspensionOf) queueMicrotask(abortForStop);
				},
				waitForConfirmation: async (requestId: string): Promise<Record<string, unknown>> =>
					await Promise.resolve(
						resolveConfirmation(suspensions.get(requestId), confirmationPolicy, approvalResponders),
					),
			},
		});
		void run.catch(() => {});
		const result = await Promise.race([run, budgetExpired, stopSettleExpired]);

		const settled =
			result === 'timed-out' && options.settleGraceMs
				? await settleWithin(run, options.settleGraceMs)
				: result;
		if (settled !== 'timed-out') usage = settled.usage;

		streamStatus = resolveStreamStatus(
			result,
			abortController.signal.aborted,
			route.stop !== undefined,
		);
	} catch (error) {
		// A stopped run can reject as it unwinds; that is the stop, not a failure.
		if (!route.stop) runError = error instanceof Error ? error.message : String(error);
		streamStatus = route.stop
			? 'stopped-on-route'
			: abortController.signal.aborted
				? 'timed-out'
				: 'errored';
	} finally {
		clearTimeout(timeoutHandle);
		clearTimeout(stopSettleHandle);
		clearTimeout(stopSuspensionHandle);
		await mcpManager?.disconnect();
	}

	const observedEvents = [...events];
	const outcome = extractOutcomeFromEvents(observedEvents);
	const expectedToolInvocations = options.scenario.expectedToolInvocations;
	const check = expectedToolInvocations
		? evaluateDiscoveryTrial({ ...options.scenario, expectedToolInvocations }, outcome, {
				streamStatus,
				timeoutMs,
				...(runError ? { runError } : {}),
				unmatchedConfirmations: unmatchedConfirmations(confirmationPolicy, suspensions.values()),
			})
		: undefined;

	return {
		scenario: options.scenario,
		...(check ? { check } : {}),
		// An abandoned stream can still publish, so hand back what the verdict saw.
		events: observedEvents,
		instanceEvents: instanceEvents.slice(0, observedEvents.length),
		outcome,
		durationMs: Date.now() - started,
		threadId,
		streamStatus,
		...(route.stop ? { stop: route.stop } : {}),
		...(usage ? { usage } : {}),
		...(runError ? { runError } : {}),
	};
}

async function settleWithin(
	run: Promise<ExecuteResumableStreamResult>,
	graceMs: number,
): Promise<ExecuteResumableStreamResult | 'timed-out'> {
	let handle: NodeJS.Timeout | undefined;
	const expired = new Promise<'timed-out'>((resolve) => {
		handle = setTimeout(() => resolve('timed-out'), graceMs);
	});
	try {
		return await Promise.race([run.catch((): 'timed-out' => 'timed-out'), expired]);
	} finally {
		clearTimeout(handle);
	}
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function applyInstanceState(
	base: InstanceAiContext,
	scenario: DiscoveryScenario,
	mcpRegistry: StubMcpRegistry | undefined,
): InstanceAiContext {
	const state = scenario.instanceState;
	if (!state) return base;

	const computerUse: ComputerUseState | undefined = state.computerUse;
	// Both channels can serve tools, so the stub server gets the union.
	const liveToolCategories = computerUse
		? Object.values(computerUse).flatMap((channel) =>
				channel.status === 'connected' ? channel.toolCategories : [],
			)
		: [];

	const localMcpServer =
		liveToolCategories.length > 0
			? createStubLocalMcpServer({
					capabilities: liveToolCategories.filter(
						(c): c is 'browser' | 'filesystem' | 'shell' =>
							c === 'browser' || c === 'filesystem' || c === 'shell',
					),
				})
			: base.localMcpServer;

	return {
		...base,
		...(computerUse ? { computerUseState: computerUse } : {}),
		...(localMcpServer ? { localMcpServer } : {}),
		...(mcpRegistry ? { mcpService: mcpRegistry.service } : {}),
		...(state.folderExploration !== undefined
			? { folderExplorationEnabled: state.folderExploration }
			: {}),
	};
}

function silentLogger(): Logger {
	return { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
}

function completedBuilderTurn(): BuilderTurnStream {
	return {
		fullStream: (async function* () {
			await Promise.resolve();
			yield {
				type: 'tool-call',
				toolCallId: 'discovery-write',
				toolName: 'write_config',
				input: {},
			};
			yield { type: 'tool-result', toolCallId: 'discovery-write', output: { ok: true } };
		})(),
		text: Promise.resolve('Agent configured for discovery evaluation.'),
	};
}

/** The builder's reads return the seeded Agents; a new Agent is "created" at once. */
function createStubBuilderDelegate(seed?: RoutingSeed): InstanceAiBuilderDelegate {
	const seededAgents = new Map((seed?.agents ?? []).map((agent) => [agent.id, agent]));
	return {
		createAgent: async (name) =>
			await Promise.resolve({
				agentId: 'discovery-agent',
				projectId: STUB_PROJECT_ID,
				name,
			}),
		streamBuild: async () => await Promise.resolve(completedBuilderTurn()),
		resumeBuild: async () => await Promise.resolve(completedBuilderTurn()),
		findOpenSuspensions: async () => await Promise.resolve([]),
		cancelOpenSuspension: async () => await Promise.resolve(),
		resolveAgentName: async (agentId) =>
			await Promise.resolve(seededAgents.get(agentId)?.config.name),
		readAgentArtifact: async (agentId) => {
			const agent = seededAgents.get(agentId);
			return await Promise.resolve(
				agent ? { config: agent.config, skills: agent.skills ?? {}, configHash: null } : null,
			);
		},
	};
}

interface StubOrchestrationContextOptions {
	context: InstanceAiContext;
	modelId: ModelConfig;
	eventBus: InstanceAiEventBus;
	threadId: string;
	runId: string;
	abortSignal: AbortSignal;
	runtimeSkills?: RuntimeSkillSource;
}

function createStubOrchestrationContext(
	opts: StubOrchestrationContextOptions,
): OrchestrationContext {
	const taskStorage: TaskStorage = {
		// eslint-disable-next-line @typescript-eslint/require-await
		get: async (): Promise<TaskList | null> => null,

		save: async (): Promise<void> => {},
	};

	return {
		threadId: opts.threadId,
		runId: opts.runId,
		userId: opts.context.userId,
		orchestratorAgentId: ORCHESTRATOR_AGENT_ID,
		modelId: opts.modelId,
		eventBus: opts.eventBus,
		logger: silentLogger(),
		runtimeSkills: opts.runtimeSkills ?? loadInstanceAiRuntimeSkillSource(),
		abortSignal: opts.abortSignal,
		taskStorage,
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
		data: event,
	};
}
