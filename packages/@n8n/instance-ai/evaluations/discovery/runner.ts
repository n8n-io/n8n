// ---------------------------------------------------------------------------
// In-process discovery runner.
//
// Drives the orchestrator with a scenario's userMessage + instanceState,
// captures InstanceAi events into the CapturedEvent[] shape that
// extractOutcomeFromEvents consumes, then runs the discovery check. No
// Docker, no n8n server — the orchestrator runs in-process against
// stubbed services.
//
// What's tested: the orchestrator's first dispatch decision. Most tools are
// NOT stubbed — when the orchestrator loads a skill or reaches for a
// Browser Use tool, the tool-call event fires before any downstream
// failure, so the discovery check still sees the dispatch intent. The Agent
// Builder tools are the exception: they have the production names, descriptions,
// input schemas, and reference skills, but they report success without doing
// work, and `agent_builder_select_agent` runs against a stub builder delegate.
// Only the routing to them is graded, not the Agent build itself. The wall-clock
// timeout bounds the trial, not the run: at the budget the trial stops and fails,
// and the abandoned stream is left to unwind on its own. Scenarios or --max-steps
// can additionally opt into an iteration cap.
//
// Routing mode (`stopBeforeTool`) checks each orchestrator tool call before it
// runs, and ends the run when the check says so (see ../routing/grade.ts).
// `answerQuestions` lets the user proxy answer a question card.
// Routing cases have no tool expectations, so they call `runOrchestratorTurn`
// and skip the check. A routing case can seed the stub instance and the thread
// (see ./seeded-turn.ts).
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Tool, type BuiltTool, type GuardrailsOptions, type RuntimeSkill } from '@n8n/agents';
import { AGENT_BUILDER_TOOL_NAMES, type InstanceAiEvent, type TaskList } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import {
	buildConfirmationPolicy,
	resolveConfirmation,
	unmatchedConfirmations,
	type ApprovalResponder,
} from './confirmation-policy';
import { credentialAutoSetupResponder } from './credential-approval';
import { evaluateDiscoveryTrial } from './expected-tools-invoked';
import { resolveStreamStatus } from './stream-status';
import { buildTurnMessage, createSeededThread, type SeededThread } from './seeded-turn';
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
	ORCHESTRATOR_AGENT_ID,
	type DiscoveryCheckResult,
	type DiscoveryScenario,
	type DiscoveryStreamStatus,
	type DiscoveryTestCase,
	type PendingToolCall,
} from './types';
import { createInstanceAgent } from '../../src/agent/instance-agent';
import type { InstanceAiEventBus } from '../../src/event-bus';
import type { Logger } from '../../src/logger';
import {
	executeResumableStream,
	normalizeStreamSource,
} from '../../src/runtime/resumable-stream-executor';
import { loadInstanceAiSkills } from '../../src/skills/skills';
import { AGENT_BUILDER_ORCHESTRATOR_TOOL_NAMES } from '../../src/tools/tool-ids';
import type {
	InstanceAiContext,
	InstanceAiBuilderDelegate,
	BrowserUseState,
	ModelConfig,
	OrchestrationContext,
	TaskStorage,
} from '../../src/types';
import { buildKnowledgeBaseWorkspaceBundle } from '../../src/knowledge-base/materialize-knowledge-base';
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
	const turn = await runOrchestratorTurn({ ...options, stopBeforeTool: stopAtAgentBuild });
	const outcome = extractOutcomeFromEvents(turn.events);
	const check = evaluateDiscoveryTrial(options.scenario, outcome, {
		streamStatus: turn.streamStatus,
		timeoutMs: turn.timeoutMs,
		...(turn.runError ? { runError: turn.runError } : {}),
		unmatchedConfirmations: turn.unmatchedConfirmations,
	});

	return {
		scenario: options.scenario,
		check,
		events: turn.events,
		outcome,
		durationMs: turn.durationMs,
		streamStatus: turn.streamStatus,
		...(turn.runError ? { runError: turn.runError } : {}),
	};
}

export interface OrchestratorTurnOptions extends Omit<DiscoveryRunOptions, 'scenario'> {
	scenario: DiscoveryScenario;
	/**
	 * Runs before each orchestrator tool call, and the call waits for it.
	 * `true` ends the run there, before the call runs.
	 */
	stopBeforeTool?: (call: PendingToolCall, events: readonly InstanceAiEvent[]) => Promise<boolean>;
	/** Returns the resume data for a question card (`inputType: questions`). Unset uses the confirmation policy. */
	answerQuestions?: (
		suspension: SuspensionInfo,
		events: CapturedEvent[],
	) => Promise<Record<string, unknown>>;
	/** The thread of the earlier turns of the same conversation. Unset starts a new thread. */
	thread?: SeededThread;
}

export interface OrchestratorTurnResult {
	events: CapturedEvent[];
	/** The same events with their schema types. */
	instanceEvents: InstanceAiEvent[];
	durationMs: number;
	streamStatus: DiscoveryStreamStatus;
	runError?: string;
	timeoutMs: number;
	unmatchedConfirmations: string[];
}

/** Runs one orchestrator turn and returns what it published, with no check. */
export async function runOrchestratorTurn(
	options: OrchestratorTurnOptions,
): Promise<OrchestratorTurnResult> {
	const started = Date.now();
	// Unset by default: the orchestrator legitimately explores past any small fixed cap
	// (data-table-workflow needs >8 iterations). Unset still lands on the SDK's own
	// 30-iteration ceiling, which reports `step-exhausted`.
	const maxSteps = options.scenario?.maxSteps ?? options.maxSteps;
	const timeoutMs = options.scenario?.timeoutMs ?? options.timeoutMs ?? 60_000;
	const nodesJsonPath = options.nodesJsonPath ?? defaultNodesJsonPath();
	const { stopBeforeTool, answerQuestions } = options;

	const events: CapturedEvent[] = [];
	const instanceEvents: InstanceAiEvent[] = [];

	let streamStatus: DiscoveryStreamStatus = 'completed';
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
	let stopRun = () => {};
	const routeStopped = new Promise<'stopped-on-route'>((resolve) => {
		stopRun = () => {
			// Resolve first, so the race ends before the abort rejects the run.
			resolve('stopped-on-route');
			abortController.abort();
		};
	});

	try {
		const services = await createStubServices({
			nodesJsonPath,
			seed: options.scenario.seed,
			credentials: options.scenario.credentials,
		});
		// The build skill sends the agent to the knowledge base, which prod writes into the sandbox.
		const knowledgeBase = await buildKnowledgeBaseWorkspaceBundle({
			root: stubWorkspaceRoot,
			logger: silentLogger(),
		});
		const mcpState = options.scenario.instanceState?.mcp;
		const mcpRegistry = mcpState ? createStubMcpRegistry(mcpState) : undefined;
		const context: InstanceAiContext = {
			...applyInstanceState(services.context, options.scenario, mcpRegistry),
			// The Agents module is a default module, so the eval runs with a builder.
			builderDelegate: createStubBuilderDelegate(),
			workspace: createStubWorkspace(knowledgeBase.files),
			workspaceRoot: stubWorkspaceRoot,
		};

		mcpManager = new StubMcpClientManager(createStubMcpToolRegistry(mcpState ?? {}));
		const seedMessages = options.scenario.seed?.messages ?? [];
		const thread =
			options.thread ??
			(seedMessages.length > 0 ? await createSeededThread(seedMessages) : undefined);
		const threadId = thread?.id ?? 'discovery-thread-' + nanoid(6);
		const runId = 'discovery-run-' + nanoid(6);

		const approvalResponders: ApprovalResponder[] = [
			credentialAutoSetupResponder,
			...(mcpRegistry ? [createMcpConnectResponder(mcpRegistry)] : []),
		];

		const eventBus = wrapEventBusWithObserver(createInMemoryEventBus(), (event) => {
			events.push(toCapturedEvent(event));
			instanceEvents.push(event);
		});

		// `OrchestrationContext` is required for the orchestrator to receive tools like
		// `workflow_builder_create_tasks` and skills. Discovery scenarios measure first-step
		// tool-call decisions, not background execution.
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
			// Memory only for a thread with history: discovery measures first-step tool dispatch.
			memoryConfig: {},
			...(thread ? { memory: thread.memory } : {}),
			thinkingEnabled: false,
		});

		const guardrails: GuardrailsOptions | undefined = stopBeforeTool && {
			hooks: [
				{
					beforeTool: async ({ toolCallId, toolName, input }) => {
						const call = { toolCallId, toolName, args: isRecord(input) ? input : {} };
						if (!(await stopBeforeTool(call, instanceEvents))) return undefined;
						stopRun();
						return { action: 'stop' as const, code: 'route-picked' };
					},
				},
			],
		};
		const streamSource = normalizeStreamSource(
			await agent.stream(buildTurnMessage(options.scenario), {
				maxIterations: maxSteps,
				...(thread ? { persistence: { threadId, resourceId: context.userId } } : {}),
				abortSignal: abortController.signal,
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' as const } },
				},
				...(guardrails ? { guardrails } : {}),
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
				onSuspension: (suspension) => suspensions.set(suspension.requestId, suspension),
				// A resumed stream runs without the stream options, so the route check goes along.
				buildResumeOptions: ({ agentRunId, suspension }) => ({
					runId: agentRunId,
					toolCallId: suspension.toolCallId,
					...(guardrails ? { guardrails } : {}),
				}),
				waitForConfirmation: async (requestId: string): Promise<Record<string, unknown>> => {
					const suspension = suspensions.get(requestId);
					if (answerQuestions && suspension?.suspendPayload.inputType === 'questions') {
						return await answerQuestions(suspension, events);
					}
					return resolveConfirmation(suspension, confirmationPolicy, approvalResponders);
				},
			},
		});
		void run.catch(() => {});
		const result = await Promise.race([run, budgetExpired, routeStopped]);

		streamStatus =
			result === 'stopped-on-route'
				? result
				: resolveStreamStatus(result, abortController.signal.aborted);
	} catch (error) {
		runError = error instanceof Error ? error.message : String(error);
		streamStatus = abortController.signal.aborted ? 'timed-out' : 'errored';
	} finally {
		clearTimeout(timeoutHandle);
		await mcpManager?.disconnect();
	}

	// An abandoned stream can still publish, so copy what the run saw at its end.
	return {
		events: [...events],
		instanceEvents: [...instanceEvents],
		durationMs: Date.now() - started,
		streamStatus,
		...(runError ? { runError } : {}),
		timeoutMs,
		unmatchedConfirmations: unmatchedConfirmations(confirmationPolicy, suspensions.values()),
	};
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

	const browserUse: BrowserUseState | undefined = state.browserUse;

	const localMcpServer =
		browserUse?.status === 'connected' ? createStubLocalMcpServer() : base.localMcpServer;

	return {
		...base,
		...(browserUse ? { browserUseState: browserUse } : {}),
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

const STUB_BUILDER_TOOL_NAMES: readonly string[] = AGENT_BUILDER_ORCHESTRATOR_TOOL_NAMES.filter(
	(name) => name !== AGENT_BUILDER_TOOL_NAMES.SELECT_AGENT,
);

/**
 * Ends the trial at the first builder call after `agent_builder_select_agent`. The route is
 * settled by then, and the stubs report success, so the model otherwise builds until the budget.
 */
async function stopAtAgentBuild(
	call: PendingToolCall,
	events: readonly InstanceAiEvent[],
): Promise<boolean> {
	const agentSelected = events.some(
		(event) =>
			event.type === 'tool-call' &&
			event.payload.toolName === AGENT_BUILDER_TOOL_NAMES.SELECT_AGENT,
	);
	return await Promise.resolve(agentSelected && STUB_BUILDER_TOOL_NAMES.includes(call.toolName));
}

/**
 * A copy of the builder tools and reference skills that the agents module in packages/cli
 * supplies, which this package cannot import. Nothing updates the copy automatically.
 */
const agentBuilderFileSchema = z.object({
	tools: z.array(
		z.object({
			name: z.string(),
			description: z.string(),
			inputSchema: z.custom<NonNullable<BuiltTool['inputSchema']>>(isRecord),
		}),
	),
	skills: z.array(
		z.custom<RuntimeSkill>(
			(skill) =>
				isRecord(skill) && typeof skill.id === 'string' && typeof skill.instructions === 'string',
		),
	),
});

type AgentBuilderFile = z.infer<typeof agentBuilderFileSchema>;

/** Builder tools with the production names, descriptions, and input schemas that report success. */
function createStubBuilderTools(tools: AgentBuilderFile['tools']): BuiltTool[] {
	return STUB_BUILDER_TOOL_NAMES.map((name) => {
		const tool = tools.find((candidate) => candidate.name === name);
		if (!tool) throw new Error(`agent-builder.json has no "${name}" tool`);
		return new Tool(name)
			.description(tool.description)
			.input(tool.inputSchema)
			.handler(async () => await Promise.resolve({ ok: true }))
			.build();
	});
}

function createStubBuilderDelegate(): InstanceAiBuilderDelegate {
	const agentBuilder = agentBuilderFileSchema.parse(
		JSON.parse(readFileSync(path.join(__dirname, 'agent-builder.json'), 'utf8')),
	);
	return {
		createAgent: async (name) =>
			await Promise.resolve({
				agentId: 'discovery-agent',
				projectId: 'discovery-project',
				name,
			}),
		getBuilderTools: () => createStubBuilderTools(agentBuilder.tools),
		getRuntimeSkills: () => agentBuilder.skills,
		getBuilderSessionContext: async () => await Promise.resolve('## Session context'),
		resolveAgentName: async () => await Promise.resolve(undefined),
	};
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
		skills: loadInstanceAiSkills(),
		abortSignal: opts.abortSignal,
		taskStorage,
		// Surface the localMcpServer so Browser Use tools are available to the
		// orchestrator.
		...(opts.context.localMcpServer ? { localMcpServer: opts.context.localMcpServer } : {}),
		// Registers the `workspace_*` file tools for workflow_builder_build_workflow
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
