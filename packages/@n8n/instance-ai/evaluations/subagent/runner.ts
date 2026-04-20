// ---------------------------------------------------------------------------
// HTTP-driven sub-agent runner
//
// Delegates execution to the n8n server's /rest/instance-ai/eval/run-sub-agent
// endpoint, then fetches the resulting workflows via REST and scores them
// with the existing binary-check suite.
// ---------------------------------------------------------------------------

import type {
	CapturedWorkflow,
	Feedback,
	SubAgentResult,
	SubAgentRunnerConfig,
	SubAgentTestCase,
} from './types';
import { runBinaryChecks } from '../binaryChecks/index';
import type { BinaryCheckContext } from '../binaryChecks/types';
import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';

export interface RunSubAgentDeps {
	client: N8nClient;
	/** Delete workflows after the run (default true). Disable with --keep-workflows. */
	deleteAfterRun: boolean;
}

export async function runSubAgent(
	testCase: SubAgentTestCase,
	config: SubAgentRunnerConfig,
	deps: RunSubAgentDeps,
): Promise<SubAgentResult> {
	const startMs = Date.now();
	const role = testCase.subagent ?? 'builder';
	const modelId = testCase.modelId ?? config.modelId;

	try {
		const response = await deps.client.runSubAgentEval({
			role,
			prompt: testCase.prompt,
			modelId,
			...(testCase.maxSteps !== undefined ? { maxSteps: testCase.maxSteps } : {}),
			...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
		});

		// Fetch each captured workflow to prove it round-trips through the real importer.
		const capturedWorkflows: CapturedWorkflow[] = [];
		const workflowResponses: WorkflowResponse[] = [];
		for (const id of response.capturedWorkflowIds) {
			try {
				const wf = await deps.client.getWorkflow(id);
				workflowResponses.push(wf);
				capturedWorkflows.push({
					json: {
						name: wf.name,
						nodes: wf.nodes,
						connections: wf.connections,
					} as CapturedWorkflow['json'],
					success: true,
				});
			} catch (fetchError) {
				const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
				capturedWorkflows.push({
					json: { name: `fetch-failed-${id}` } as CapturedWorkflow['json'],
					success: false,
					errors: [`Failed to fetch workflow ${id}: ${message}`],
				});
			}
		}

		const feedback = await evaluateCapturedWorkflows({
			workflows: workflowResponses,
			prompt: testCase.prompt,
			modelId,
			agentTextResponse: response.text,
		});

		// Surface server-side run error as its own feedback entry
		if (response.error) {
			feedback.unshift({
				evaluator: 'subagent-runner',
				metric: 'run_error',
				score: 0,
				kind: 'score',
				comment: response.error,
			});
		}

		// Cleanup (best-effort — never fails the run)
		if (deps.deleteAfterRun) {
			for (const id of response.capturedWorkflowIds) {
				try {
					await deps.client.deleteWorkflow(id);
				} catch {
					// Intentionally swallow — cleanup failure is not a test failure.
				}
			}
		}

		const result: SubAgentResult = {
			testCase,
			text: response.text,
			capturedWorkflows,
			feedback,
			durationMs: Date.now() - startMs,
		};
		if (response.error) result.error = response.error;
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
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
// Internal: score each captured workflow
// ---------------------------------------------------------------------------

async function evaluateCapturedWorkflows(args: {
	workflows: WorkflowResponse[];
	prompt: string;
	modelId: string;
	agentTextResponse: string;
}): Promise<Feedback[]> {
	const feedback: Feedback[] = [];

	feedback.push({
		evaluator: 'subagent-runner',
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
	};
	const binaryFeedback = await runBinaryChecks(last, ctx);
	feedback.push(...binaryFeedback);

	return feedback;
}
