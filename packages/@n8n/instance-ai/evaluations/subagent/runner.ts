// ---------------------------------------------------------------------------
// Workflow-build eval runner
//
// Routes prompts through the normal Instance AI orchestrator build path and
// scores the resulting workflow with binary checks.
// ---------------------------------------------------------------------------

import type {
	CapturedWorkflow,
	Feedback,
	WorkflowBuildEvalResult,
	WorkflowBuildEvalConfig,
	WorkflowBuildEvalCase,
} from './types';
import { runBinaryChecks } from '../binaryChecks/index';
import type { BinaryCheckContext } from '../binaryChecks/types';
import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import { createLogger, type EvalLogger } from '../harness/logger';
import { buildWorkflow, cleanupBuild, type BuildResult } from '../harness/runner';
import { agentTextOf } from '../utils/conversation-text';

/**
 * Client-side model used by binary checks (they call Anthropic directly with
 * ANTHROPIC_API_KEY). Independent of the server-side agent model, which the
 * server resolves from its own settings when the CLI doesn't pass `--model`.
 */
const BINARY_CHECK_DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514';

export interface RunWorkflowBuildEvalDeps {
	client: N8nClient;
	/** Delete workflows after the run (default true). Disable with --keep-workflows. */
	deleteAfterRun: boolean;
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
}

export async function runWorkflowBuildEval(
	testCase: WorkflowBuildEvalCase,
	config: WorkflowBuildEvalConfig,
	deps: RunWorkflowBuildEvalDeps,
): Promise<WorkflowBuildEvalResult> {
	const startMs = Date.now();
	const modelId = testCase.modelId ?? config.modelId;
	const logger = createRunnerLogger(config.verbose ?? false);
	let build: BuildResult | undefined;

	try {
		build = await buildWorkflow({
			client: deps.client,
			conversation: [{ role: 'user', text: testCase.prompt }],
			timeoutMs: config.timeoutMs,
			preRunWorkflowIds: deps.preRunWorkflowIds,
			claimedWorkflowIds: deps.claimedWorkflowIds,
			logger,
			skipWorkflowChecks: true,
		});

		const capturedWorkflows = build.workflowJsons.map(toCapturedWorkflow);
		const agentTextResponse = extractAgentText(build);

		const feedback = await evaluateCapturedWorkflows({
			workflows: build.workflowJsons,
			prompt: testCase.prompt,
			modelId: modelId ?? BINARY_CHECK_DEFAULT_MODEL,
			agentTextResponse,
			...(testCase.annotations ? { annotations: testCase.annotations } : {}),
		});

		// Surface the orchestrator build error both as feedback (so LangSmith scores
		// it) and as `result.error` (so the CLI printer shows it inline). Same
		// string, two consumers — intentional.
		if (build.error) {
			feedback.unshift({
				evaluator: 'workflow-build-runner',
				metric: 'run_error',
				score: 0,
				kind: 'score',
				comment: build.error,
			});
		}

		const result: WorkflowBuildEvalResult = {
			testCase,
			text: agentTextResponse,
			capturedWorkflows,
			feedback,
			durationMs: Date.now() - startMs,
		};
		if (build.error) result.error = build.error;
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			testCase,
			text: '',
			capturedWorkflows: [],
			feedback: [
				{
					evaluator: 'workflow-build-runner',
					metric: 'run_error',
					score: 0,
					kind: 'score',
					comment: message,
				},
			],
			durationMs: Date.now() - startMs,
			error: message,
		};
	} finally {
		if (deps.deleteAfterRun && build) {
			try {
				await cleanupBuild(deps.client, build, logger);
			} catch {
				// cleanupBuild is best-effort; keep the eval result focused on build/scoring.
			}
		}
	}
}

function toCapturedWorkflow(workflow: WorkflowResponse): CapturedWorkflow {
	return {
		json: {
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
		} as CapturedWorkflow['json'],
		success: true,
	};
}

function extractAgentText(build: BuildResult): string {
	return (
		build.transcript
			?.map((turn) => agentTextOf(turn))
			.filter((text) => text.length > 0)
			.join('\n\n') ?? ''
	);
}

function createRunnerLogger(verbose: boolean): EvalLogger {
	if (verbose) return createLogger(true);

	return {
		info: () => {},
		verbose: () => {},
		success: () => {},
		warn: () => {},
		error: () => {},
		isVerbose: false,
	};
}

// ---------------------------------------------------------------------------
// Internal: score each captured workflow
// ---------------------------------------------------------------------------

async function evaluateCapturedWorkflows(args: {
	workflows: WorkflowResponse[];
	prompt: string;
	modelId: string;
	agentTextResponse: string;
	annotations?: Record<string, unknown>;
}): Promise<Feedback[]> {
	const feedback: Feedback[] = [];

	feedback.push({
		evaluator: 'workflow-build-runner',
		metric: 'workflow_produced',
		score: args.workflows.length > 0 ? 1 : 0,
		kind: 'score',
		comment:
			args.workflows.length > 0
				? `${String(args.workflows.length)} workflow(s) produced and round-tripped`
				: 'Agent did not produce any workflow',
	});

	if (args.workflows.length === 0) return feedback;

	const last = args.workflows[args.workflows.length - 1];
	const ctx: BinaryCheckContext = {
		prompt: args.prompt,
		modelId: args.modelId,
		...(args.agentTextResponse ? { agentTextResponse: args.agentTextResponse } : {}),
		...(args.annotations ? { annotations: args.annotations } : {}),
	};
	const { feedback: binaryFeedback } = await runBinaryChecks(last, ctx);
	feedback.push(...binaryFeedback);

	return feedback;
}
