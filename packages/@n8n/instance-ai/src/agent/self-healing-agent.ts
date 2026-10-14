import {
	Agent,
	Memory,
	Tool,
	loadRuntimeSkillSourceFromDirectory,
	type BuiltMemory,
} from '@n8n/agents';
import { resolve } from 'node:path';

import { applyAgentThinking } from './apply-agent-thinking';
import { getSandboxWorkspaceSection, UNTRUSTED_CONTENT_DOCTRINE } from './shared-prompts';
import {
	SELF_HEALING_PROFILE_VERSION,
	selfHealingCandidateInputSchema,
	selfHealingOutputSchema,
	type SelfHealingCandidateVerifier,
} from '../self-healing';
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
	memory?: BuiltMemory;
	verifyCandidate: SelfHealingCandidateVerifier;
	abortSignal?: AbortSignal;
	thinkingEnabled?: boolean;
}

const SOURCE_GUIDANCE =
	'Read workflow source for context. Keep edits in the supplied self-healing candidate file. ' +
	'Use workspace_read_file and workspace_str_replace_file, then verify_candidate. ' +
	'Workflow reads return the original baseline for this investigation.';

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
		createResearchTool(context, { interactive: false }),
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

	const skillSource = loadRuntimeSkillSourceFromDirectory(
		resolve(__dirname, '..', '..', 'skills', 'internal'),
	);
	const skill = await skillSource.loadSkill('self-healing');
	if (!skill) throw new Error('Self-healing skill is unavailable');

	const systemPrompt = [
		'Investigate the supplied failed execution. Prepare one candidate workflow for review.',
		'Work without user interaction. Report blockers in the structured output.',
		UNTRUSTED_CONTENT_DOCTRINE,
		skill.instructions,
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
		.checkpoint('memory');

	if (workspace) agent.workspace(workspace);
	if (options.memory) agent.memory(new Memory().storage(options.memory));
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
			runtimeSkills: skillSource.registry,
		}),
	);

	abortSignal?.throwIfAborted();

	return agent;
}
