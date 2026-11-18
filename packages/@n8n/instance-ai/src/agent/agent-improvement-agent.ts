import { Agent, Memory, Tool, type FetchFn } from '@n8n/agents';

import { applyAgentThinking } from './apply-agent-thinking';
import { getSandboxWorkspaceSection, UNTRUSTED_CONTENT_DOCTRINE } from './shared-prompts';
import {
	AGENT_IMPROVEMENT_PROFILE_VERSION,
	agentImprovementCheckReportInputSchema,
	agentImprovementListSessionsInputSchema,
	agentImprovementNoInputSchema,
	agentImprovementOutputSchema,
	agentImprovementReadSessionInputSchema,
	agentImprovementTestProposalInputSchema,
	type AgentImprovementHostTools,
} from '../agent-improvement';
import { AGENT_IMPROVEMENT_PROMPT } from '../agent-improvement/agent-improvement.prompt';
import { createToolRegistryFromTools, toolRegistryValues } from '../tool-registry';
import {
	buildAgentTraceInputs,
	mergeTraceRunInputs,
	modelIdTraceMetadata,
	setTraceModelId,
	setTracePromptVersion,
} from '../tracing/langsmith-tracing';
import type { InstanceAiContext, ModelConfig } from '../types';
import { withModalSession } from '../utils/modal-session';
import { createLazyRuntimeWorkspace } from '../workspace/lazy-runtime-workspace';

export interface CreateAgentImprovementAgentOptions {
	modelId: ModelConfig;
	/** The factory reads `threadId`, `tracing` and `workspace` only. */
	context: InstanceAiContext;
	tools: AgentImprovementHostTools;
	abortSignal?: AbortSignal;
	thinkingEnabled?: boolean;
	modelFetch?: FetchFn;
	/** Send the `x-n8n-function-id` header on model calls (`N8N_INSTANCE_AI_MODEL_REQUEST_LABELS`). */
	requestLabels?: boolean;
}

const HOST_TOOL_KEYS = [
	'getAgentDefinition',
	'listEvalCases',
	'listProductionSessions',
	'readProductionSession',
	'testProposal',
] as const satisfies ReadonlyArray<keyof AgentImprovementHostTools>;

// Each result holds agent configuration, eval cases, session text or judge reasoning.
// `untrustedOutput` makes the runtime wrap the copy that the model reads.
function createAgentImprovementTools(host: AgentImprovementHostTools, abortSignal?: AbortSignal) {
	const signalFor = (ctx: { abortSignal?: AbortSignal }) => {
		const signal = abortSignal ?? ctx.abortSignal;
		signal?.throwIfAborted();
		return signal;
	};

	return createToolRegistryFromTools([
		new Tool('get_agent_definition')
			.description(
				'Read the published agent: the goals of this investigation, the instructions, the tools and the skills. ' +
					'Each tool and skill states if you can edit it.',
			)
			.input(agentImprovementNoInputSchema)
			.untrustedOutput()
			.handler(async (_input, ctx) => await host.getAgentDefinition(signalFor(ctx)))
			.build(),
		new Tool('list_eval_cases')
			.description(
				'List the cases of the eval suite of the agent. Each case has a caseId, an input, a rule and expected tools.',
			)
			.input(agentImprovementNoInputSchema)
			.untrustedOutput()
			.handler(async (_input, ctx) => await host.listEvalCases(signalFor(ctx)))
			.build(),
		new Tool('list_production_sessions')
			.description(
				'List production sessions of the agent that have activity in the window, newest activity first. ' +
					'One session is one conversation and can hold several turns. ' +
					'Each entry is a summary of the turns in the window: the number of turns, the first user message, ' +
					'the tools called, a failure, cost and duration. `total` is the number of sessions in the window.',
			)
			.input(agentImprovementListSessionsInputSchema)
			.untrustedOutput()
			.handler(async (input, ctx) => await host.listProductionSessions(input, signalFor(ctx)))
			.build(),
		new Tool('read_production_session')
			.description(
				'Read one production session. The result is the whole conversation: each turn in order, with the ' +
					'user messages, the tool calls and the answers, also the turns from before the window. ' +
					'A user correction is usually the turn after a failure.',
			)
			.input(agentImprovementReadSessionInputSchema)
			.untrustedOutput()
			.handler(async (input, ctx) => await host.readProductionSession(input, signalFor(ctx)))
			.build(),
		new Tool('test_proposal')
			.description(
				'Run eval cases on the published agent and, when edits are given, on the published agent with the edits. ' +
					'Both versions get the same cases, the same checks and the same simulated tool data. ' +
					'With `ok: true`, the result gives the verdict and the tools called for each case and each version, ' +
					'and this call becomes the proposal. With `ok: false`, nothing ran: correct the input and call again.',
			)
			.input(agentImprovementTestProposalInputSchema)
			.untrustedOutput()
			.handler(async (input, ctx) => await host.testProposal(input, signalFor(ctx)))
			.build(),
		// The input schema is the check. An input that fails goes back to the model.
		new Tool('check_report')
			.description(
				'Check the Markdown report before you answer. The call fails when the report is too long. ' +
					'Shorten the report and call again.',
			)
			.input(agentImprovementCheckReportInputSchema)
			.untrustedOutput()
			.handler(async (_input, ctx) => {
				signalFor(ctx);
				return await Promise.resolve({ ok: true });
			})
			.build(),
	]);
}

export async function createAgentImprovementAgent(
	options: CreateAgentImprovementAgentOptions,
): Promise<Agent> {
	const { context, abortSignal } = options;
	const host: Partial<AgentImprovementHostTools> | undefined = options.tools;

	if (HOST_TOOL_KEYS.some((key) => typeof host?.[key] !== 'function')) {
		throw new Error('Agent improvement requires host tools');
	}

	abortSignal?.throwIfAborted();

	const workspace = context.workspace
		? createLazyRuntimeWorkspace({
				ensureWorkspace: async () => context.workspace,
				sandboxInstructions: getSandboxWorkspaceSection(context.workspace.filesystem?.basePath),
				filesystemInstructions: '',
			})
		: undefined;
	const modelId = context.threadId
		? withModalSession(options.modelId, context.threadId)
		: options.modelId;
	const tools = createAgentImprovementTools(options.tools, abortSignal);

	const tracing = context.tracing;
	const tracedTools =
		tracing?.wrapTools(tools, {
			agentRole: 'agent-improvement',
			tags: [AGENT_IMPROVEMENT_PROFILE_VERSION],
		}) ?? tools;

	const systemPrompt = [
		'Investigate the supplied agent. Prepare a tested improvement for review.',
		'Work without user interaction. Report blockers in the structured output.',
		UNTRUSTED_CONTENT_DOCTRINE,
		AGENT_IMPROVEMENT_PROMPT,
	].join('\n\n');

	setTracePromptVersion(tracing, AGENT_IMPROVEMENT_PROFILE_VERSION);
	setTraceModelId(tracing, modelId);

	const agent = new Agent('n8n-agent-improvement-agent')
		.model(modelId)
		.instructions(systemPrompt, {
			providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
		})
		.tool(toolRegistryValues(tracedTools))
		.structuredOutput(agentImprovementOutputSchema)
		.checkpoint('memory')
		.memory(new Memory().storage('memory'));

	if (workspace) agent.workspace(workspace);
	if (options.modelFetch) agent.modelFetch(options.modelFetch);
	if (options.thinkingEnabled !== false) applyAgentThinking(agent, modelId);

	const functionId = 'instance-ai.agent-improvement';
	if (options.requestLabels) agent.functionId(functionId);
	const telemetry = tracing?.getTelemetry?.({
		agentRole: 'agent-improvement',
		functionId,
		executionMode: 'background',
		metadata: modelIdTraceMetadata(modelId),
	});
	if (telemetry) agent.telemetry(telemetry);

	mergeTraceRunInputs(
		tracing?.actorRun,
		buildAgentTraceInputs({
			systemPrompt,
			tools: tracedTools,
			modelId,
			toolSearchEnabled: false,
		}),
	);

	abortSignal?.throwIfAborted();

	return agent;
}
