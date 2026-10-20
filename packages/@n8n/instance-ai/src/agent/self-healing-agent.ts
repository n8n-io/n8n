import { Agent, Memory, Tool } from '@n8n/agents';

import { applyAgentThinking } from './apply-agent-thinking';
import { getSandboxWorkspaceSection, UNTRUSTED_CONTENT_DOCTRINE } from './shared-prompts';
import {
	SELF_HEALING_PROFILE_VERSION,
	selfHealingCandidateInputSchema,
	selfHealingOutputSchema,
	type SelfHealingCandidateVerifier,
} from '../self-healing';
import { SELF_HEALING_PROMPT } from '../self-healing/self-healing.prompt';
import { createToolRegistryFromTools, toolRegistryValues } from '../tool-registry';
import { createDataTablesTool } from '../tools/data-tables.tool';
import { createExecutionsTool } from '../tools/executions.tool';
import { createN8nDocsTool } from '../tools/n8n-docs.tool';
import { createNodesTool } from '../tools/nodes.tool';
import { createResearchTool } from '../tools/research.tool';
import { createWorkflowsTool } from '../tools/workflows.tool';
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

export interface CreateSelfHealingAgentOptions {
	modelId: ModelConfig;
	context: InstanceAiContext;
	verifyCandidate: SelfHealingCandidateVerifier;
	abortSignal?: AbortSignal;
	thinkingEnabled?: boolean;
}

const SOURCE_GUIDANCE =
	'Read workflow source for context. Keep edits in the supplied self-healing candidate file. ' +
	'Use workspace_read_file and workspace_str_replace_file, then verify_candidate. ' +
	'Reads of the target workflow return its captured baseline. ' +
	'You can read other accessible workflows for context, including sub-workflows.';

function createSelfHealingTools(
	context: InstanceAiContext,
	verifyCandidate: SelfHealingCandidateVerifier,
	abortSignal?: AbortSignal,
) {
	return createToolRegistryFromTools([
		createWorkflowsTool(context, {
			allowedActions: ['get', 'get-as-code'],
			descriptionPrefix: 'Read workflows',
			sourceGuidance: SOURCE_GUIDANCE,
		}),
		createExecutionsTool(context, {
			allowedActions: ['list', 'get', 'debug', 'get-node-output', 'get-resolved-node-parameters'],
			description: 'Read execution status, diagnostics, node output, and resolved parameters.',
		}),
		createDataTablesTool(context, {
			allowedActions: ['list', 'schema', 'query'],
			description: 'Read data tables and their schemas. Use targeted queries with a small limit.',
		}),
		createNodesTool(context, {
			allowedActions: ['list', 'search', 'describe', 'type-definition', 'suggested'],
			description: 'Read node metadata. Use type-definition before changing node parameters.',
		}),
		createN8nDocsTool(context),
		createResearchTool(context),
		new Tool('verify_candidate')
			.description('Verify the candidate against the captured workflow baseline.')
			.input(selfHealingCandidateInputSchema)
			.handler(async (input, ctx) => {
				const signal = abortSignal ?? ctx.abortSignal;
				signal?.throwIfAborted();

				return await verifyCandidate(input, signal);
			})
			.build(),
	]);
}

export async function createSelfHealingAgent(
	options: CreateSelfHealingAgentOptions,
): Promise<Agent> {
	const { context, verifyCandidate, abortSignal } = options;

	if (typeof verifyCandidate !== 'function') {
		throw new Error('Self-healing requires a candidate verifier');
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
	const domainContext = { ...context, modelId, workspace };
	const tools = createSelfHealingTools(domainContext, verifyCandidate, abortSignal);

	const tracing = context.tracing;
	const tracedTools =
		tracing?.wrapTools(tools, {
			agentRole: 'self-healing',
			tags: [SELF_HEALING_PROFILE_VERSION],
		}) ?? tools;

	const systemPrompt = [
		'Investigate the supplied failed execution. Prepare one candidate workflow for review.',
		'Work without user interaction. Report blockers in the structured output.',
		UNTRUSTED_CONTENT_DOCTRINE,
		SELF_HEALING_PROMPT,
	].join('\n\n');

	setTracePromptVersion(tracing, SELF_HEALING_PROFILE_VERSION);
	setTraceModelId(tracing, modelId);

	const agent = new Agent('n8n-self-healing-agent')
		.model(modelId)
		.instructions(systemPrompt, {
			providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
		})
		.tool(toolRegistryValues(tracedTools))
		.structuredOutput(selfHealingOutputSchema)
		.checkpoint('memory')
		.memory(new Memory().storage('memory'));

	if (workspace) agent.workspace(workspace);
	if (options.thinkingEnabled !== false) applyAgentThinking(agent, modelId);

	const telemetry = tracing?.getTelemetry?.({
		agentRole: 'self-healing',
		functionId: 'instance-ai.self-healing',
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
