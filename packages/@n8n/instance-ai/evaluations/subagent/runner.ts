// ---------------------------------------------------------------------------
// Isolated sub-agent runner
//
// Instantiates a builder sub-agent with a real LLM and stubbed services,
// runs it to completion, and evaluates the resulting workflow with binary checks.
// ---------------------------------------------------------------------------

import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { createStubContext } from './stub-context';
import { typeCheckSDKCode } from './typecheck';
import type {
	CapturedWorkflow,
	Feedback,
	SubAgentResult,
	SubAgentRunnerConfig,
	SubAgentTestCase,
} from './types';
import { createSubAgent } from '../../src/agent/sub-agent-factory';
import { createAllTools } from '../../src/tools/index';
import { BUILDER_AGENT_PROMPT } from '../../src/tools/orchestration/build-workflow-agent.prompt';
import { runBinaryChecks } from '../binaryChecks/index';
import type { BinaryCheckContext } from '../binaryChecks/types';
import type { WorkflowResponse } from '../clients/n8n-client';

// ---------------------------------------------------------------------------
// Default builder tool set (tool-mode, no sandbox)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-agent type definitions
// ---------------------------------------------------------------------------

interface SubAgentTypeConfig {
	/** System prompt key to load from build-workflow-agent.prompt */
	promptKey: 'BUILDER_AGENT_PROMPT';
	/** Default tools when test case doesn't specify */
	defaultTools: string[];
}

/**
 * Appended to the system prompt in eval mode. Overrides the sandbox filesystem
 * flow (write_file → tsc → submit-workflow) with a direct build-workflow call.
 * This preserves all decision-making (node selection, configuration, SDK patterns)
 * while skipping the sandbox infrastructure that doesn't exist in eval.
 */
const EVAL_MODE_SUFFIX = `

## EVAL MODE OVERRIDE

You are running in an evaluation environment WITHOUT a sandbox filesystem.
Do NOT use write_file, read_file, edit_file, or execute_command.
Do NOT use submit-workflow.

Instead, call the \`build-workflow\` tool directly with the \`code\` parameter containing your full TypeScript workflow code. The code parameter accepts the same SDK code you would write to a file.

Example:
\`\`\`
build-workflow({ code: "import { workflow, node, trigger } from '@n8n/workflow-sdk';\\n..." })
\`\`\`

All other tools (search-nodes, get-node-type-definition, list-data-tables, create-data-table, etc.) work normally.
`;

const SUBAGENT_TYPES: Record<string, SubAgentTypeConfig> = {
	builder: {
		promptKey: 'BUILDER_AGENT_PROMPT',
		defaultTools: [
			'build-workflow',
			'search-nodes',
			'get-suggested-nodes',
			'get-node-type-definition',
			'list-workflows',
			'get-workflow-as-code',
			'ask-user',
		],
	},
};

// ---------------------------------------------------------------------------
// TypeScript type-check wrapper for build-workflow
// ---------------------------------------------------------------------------

/**
 * Wraps the build-workflow tool to run TypeScript type checking on the agent's
 * code before delegating to the real tool. Mirrors the production sandbox flow
 * where the agent runs `tsc` and gets type errors back for self-correction.
 */
const evalBuildWorkflowSchema = z.object({
	code: z.string().describe('Full TypeScript workflow code using @n8n/workflow-sdk.'),
	workflowId: z.string().optional().describe('Existing workflow ID to update (omit to create new)'),
	projectId: z.string().optional().describe('Project ID. Defaults to personal project.'),
	name: z.string().optional().describe('Workflow name (required for new workflows)'),
});

function wrapWithTypeCheck(original: ToolsInput[string]): ToolsInput[string] {
	return createTool({
		id: 'build-workflow',
		description:
			'Build a workflow from TypeScript SDK code. Pass full code via the `code` parameter.',
		inputSchema: evalBuildWorkflowSchema,
		execute: async (input: {
			code: string;
			workflowId?: string;
			projectId?: string;
			name?: string;
		}) => {
			const code = input.code;
			if (typeof code === 'string' && code.length > 0) {
				const typeErrors = typeCheckSDKCode(code);
				if (typeErrors.length > 0) {
					return {
						success: false,
						errors: [`TypeScript type errors:\n${typeErrors.join('\n')}`],
					};
				}
			}
			return await (original as { execute: (input: unknown) => Promise<unknown> }).execute(input);
		},
	});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a single sub-agent test case in isolation.
 *
 * Creates a builder sub-agent with the real LLM and stubbed n8n services,
 * streams it to completion, then evaluates captured workflows with binary checks.
 */
export async function runSubAgent(
	testCase: SubAgentTestCase,
	config: SubAgentRunnerConfig,
): Promise<SubAgentResult> {
	const startMs = Date.now();
	const maxSteps = testCase.maxSteps ?? config.maxSteps ?? 20;
	const timeoutMs = config.timeoutMs ?? 120_000;
	const subagentType = testCase.subagent ?? 'builder';

	const typeConfig = SUBAGENT_TYPES[subagentType];
	if (!typeConfig) {
		const available = Object.keys(SUBAGENT_TYPES).join(', ');
		return {
			testCase,
			text: '',
			capturedWorkflows: [],
			feedback: [
				{
					evaluator: 'subagent-runner',
					metric: 'run_error',
					score: 0,
					kind: 'score',
					comment: `Unknown sub-agent type "${subagentType}". Available: ${available}`,
				},
			],
			durationMs: Date.now() - startMs,
			error: `Unknown sub-agent type "${subagentType}"`,
		};
	}

	// Filter out tools that cause HITL suspension or loops in eval mode,
	// and sandbox-only tools replaced by the eval mode override
	const EXCLUDED_TOOLS = new Set([
		'ask-user',
		'submit-workflow',
		'write_file',
		'read_file',
		'edit_file',
		'execute_command',
	]);
	const requestedTools = (testCase.tools ?? typeConfig.defaultTools).filter(
		(t) => !EXCLUDED_TOOLS.has(t),
	);
	// Ensure build-workflow is always available (the eval mode override directs the agent to use it)
	const toolNames = requestedTools.includes('build-workflow')
		? requestedTools
		: ['build-workflow', ...requestedTools];
	const verbose = config.verbose ?? false;

	try {
		// 1. Build stubbed context and domain tools
		const { context, capture } = createStubContext();
		const allTools = createAllTools(context);
		const allToolsRecord = allTools as Record<string, ToolsInput[string]>;

		const tools: ToolsInput = {};
		const missingTools: string[] = [];
		for (const name of toolNames) {
			if (name in allToolsRecord) {
				tools[name] = allToolsRecord[name];
			} else {
				missingTools.push(name);
			}
		}

		if (verbose && missingTools.length > 0) {
			console.warn(`  [${testCase.id}] Tools not found (skipped): ${missingTools.join(', ')}`);
		}
		if (verbose) {
			console.log(
				`  [${testCase.id}] Loaded ${String(Object.keys(tools).length)}/${String(toolNames.length)} tools`,
			);
		}

		// Wrap build-workflow with TypeScript type checking (mirrors production tsc step)
		if (tools['build-workflow']) {
			const original = tools['build-workflow'];
			tools['build-workflow'] = wrapWithTypeCheck(original);
		}

		// 2. Create the sub-agent (same factory the orchestrator uses)
		const promptMap: Record<string, string> = { BUILDER_AGENT_PROMPT };
		let instructions = promptMap[typeConfig.promptKey];

		// Append eval-mode override so the agent uses build-workflow directly
		// instead of the sandbox filesystem flow (write_file → tsc → submit-workflow)
		instructions += EVAL_MODE_SUFFIX;

		const modelId = testCase.modelId ?? config.modelId;

		const agent = createSubAgent({
			agentId: `eval-${subagentType}-${testCase.id}`,
			role: subagentType,
			instructions,
			tools,
			modelId,
		});

		// 3. Run with timeout
		const abortController = new AbortController();
		const timeoutId = setTimeout(() => {
			abortController.abort(new Error(`Sub-agent timed out after ${String(timeoutMs)}ms`));
		}, timeoutMs);

		let text: string;
		try {
			// Use generate() instead of stream() so we get full result with tool calls
			const result = await agent.generate(testCase.prompt, {
				maxSteps,
				abortSignal: abortController.signal,
			});

			text = result.text ?? '';

			if (verbose) {
				// Log tool calls from the result
				const toolCalls = result.toolCalls ?? [];
				const toolResults = result.toolResults ?? [];
				// Mastra wraps tool calls as { type, runId, from, payload: { toolName, args } }
				console.log(
					`  [${testCase.id}] Tool calls: ${String(toolCalls.length)}, Tool results: ${String(toolResults.length)}`,
				);
				for (const tc of toolCalls) {
					const payload = (tc as unknown as { payload?: { toolName?: string } }).payload;
					console.log(`  [${testCase.id}]   call: ${payload?.toolName ?? '?'}`);
				}
				for (const tr of toolResults) {
					const payload = (tr as unknown as { payload?: { toolName?: string; result?: unknown } })
						.payload;
					const res = payload?.result as Record<string, unknown> | undefined;
					const status = res?.success === false ? 'FAILED' : 'ok';
					const rawError = res?.error;
					const errorMsg = Array.isArray(res?.errors)
						? (res.errors as string[]).join('; ')
						: typeof rawError === 'string'
							? rawError
							: '';
					const detail = res?.success === false ? `: ${errorMsg.slice(0, 200)}` : '';
					console.log(
						`  [${testCase.id}]   result: ${payload?.toolName ?? '?'} ${status}${detail}`,
					);
				}

				// Log if agent stopped early
				const resultRecord = result as unknown as Record<string, unknown>;
				const finishOrStop = resultRecord.finishReason ?? resultRecord.stopReason;
				const stopReason = typeof finishOrStop === 'string' ? finishOrStop : '?';
				console.log(
					`  [${testCase.id}] maxSteps=${String(maxSteps)}, steps used=${String(toolCalls.length)}, stopReason=${stopReason}`,
				);
			}
		} finally {
			clearTimeout(timeoutId);
		}

		if (verbose) {
			console.log(
				`  [${testCase.id}] Agent finished. Workflows captured: ${String(capture.workflows.length)}. Text length: ${String(text.length)}`,
			);
			if (capture.workflows.length === 0 && text.length > 0) {
				console.log(`  [${testCase.id}] Agent text: ${text.slice(0, 500)}`);
			}
		}

		// 4. Evaluate captured workflows
		const feedback = await evaluateCapturedWorkflows(
			capture.workflows,
			testCase.prompt,
			modelId,
			text,
		);

		return {
			testCase,
			text,
			capturedWorkflows: capture.workflows,
			feedback,
			durationMs: Date.now() - startMs,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		if (verbose) {
			console.error(`  [${testCase.id}] Run failed: ${message}`);
		}
		return {
			testCase,
			text: '',
			capturedWorkflows: [],
			feedback: [
				{
					evaluator: 'subagent-runner',
					metric: 'run_error',
					score: 0,
					kind: 'score',
					comment: message,
				},
			],
			durationMs: Date.now() - startMs,
			error: message,
		};
	}
}

// ---------------------------------------------------------------------------
// Internal: evaluate captured workflows
// ---------------------------------------------------------------------------

async function evaluateCapturedWorkflows(
	captured: CapturedWorkflow[],
	prompt: string,
	modelId: string,
	agentTextResponse: string,
): Promise<Feedback[]> {
	const feedback: Feedback[] = [];

	// Did the agent produce any workflow?
	feedback.push({
		evaluator: 'subagent-runner',
		metric: 'workflow_produced',
		score: captured.length > 0 ? 1 : 0,
		kind: 'score',
		comment:
			captured.length > 0
				? `${String(captured.length)} workflow(s) produced`
				: 'Agent did not produce any workflow',
	});

	if (captured.length === 0) return feedback;

	// Run binary checks on the last captured workflow (final version)
	const last = captured[captured.length - 1];
	const workflowResponse = toWorkflowResponse(last);
	const ctx: BinaryCheckContext = {
		prompt,
		modelId,
		...(agentTextResponse ? { agentTextResponse } : {}),
	};
	const binaryFeedback = await runBinaryChecks(workflowResponse, ctx);
	feedback.push(...binaryFeedback);

	return feedback;
}

/**
 * Convert a CapturedWorkflow (WorkflowJSON from SDK) to a WorkflowResponse
 * (the shape our binary checks expect).
 */
function toWorkflowResponse(captured: CapturedWorkflow): WorkflowResponse {
	const json = captured.json;
	return {
		id: 'eval-wf',
		name: json.name ?? 'Unnamed',
		active: false,
		nodes: (json.nodes ?? []).map((n) => ({
			name: n.name ?? '',
			type: n.type,
			typeVersion: n.typeVersion,
			parameters: n.parameters as Record<string, unknown> | undefined,
			disabled: (n as { disabled?: boolean }).disabled,
			credentials: n.credentials as Record<string, unknown> | undefined,
		})),
		connections: (json.connections ?? {}) as Record<string, unknown>,
	};
}
