// ---------------------------------------------------------------------------
// LangSmith evaluation harness for instance-ai checklist eval.
//
// Follows the "target does ALL work" pattern from the ai-workflow-builder eval:
// - Target function: sends prompt to instance-ai, captures events, runs checklist
// - Evaluator: extracts pre-computed feedback from target output
// ---------------------------------------------------------------------------

import { evaluate, type EvaluationResult } from 'langsmith/evaluation';
import { Client } from 'langsmith/client';
import type { Run, Example } from 'langsmith/schemas';

import { N8nClient } from './n8n-client';
import { extractChecklist } from './checklist';
import { runSingleExample, type RunnerConfig } from './runner';
import type { PromptConfig } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface LangsmithConfig {
	datasetName: string;
	experimentName: string;
	n8nBaseUrl: string;
	concurrency: number;
	timeoutMs: number;
	verbose: boolean;
	maxExamples?: number;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runLangsmithEval(config: LangsmithConfig): Promise<void> {
	const client = new Client();

	// Authenticate with n8n
	console.log(`Authenticating with n8n at ${config.n8nBaseUrl}...`);
	const n8nClient = new N8nClient(config.n8nBaseUrl);
	await n8nClient.login();
	console.log('Authenticated successfully.');

	const runnerConfig: RunnerConfig = {
		n8nClient,
		timeoutMs: config.timeoutMs,
		verbose: config.verbose,
		autoApprove: true,
	};

	// Pre-load examples if we need to limit count
	let data: string | Example[];
	if (config.maxExamples && config.maxExamples > 0) {
		const dataset = await client.readDataset({ datasetName: config.datasetName });
		const examples: Example[] = [];
		for await (const example of client.listExamples({ datasetId: dataset.id })) {
			examples.push(example);
			if (examples.length >= config.maxExamples) break;
		}
		data = examples;
		console.log(`Loaded ${String(examples.length)} examples from dataset "${config.datasetName}"`);
	} else {
		data = config.datasetName;
		console.log(`Using dataset "${config.datasetName}"`);
	}

	// Target function: does generation + evaluation
	const target = async (inputs: Record<string, unknown>): Promise<Record<string, unknown>> => {
		const prompt = typeof inputs.prompt === 'string' ? inputs.prompt : '';
		const complexity = typeof inputs.complexity === 'string' ? inputs.complexity : 'medium';
		const tags = Array.isArray(inputs.tags) ? (inputs.tags as string[]) : [];

		const promptConfig: PromptConfig = {
			text: prompt,
			complexity: complexity as PromptConfig['complexity'],
			source: 'synthetic',
			tags,
		};

		if (config.verbose) {
			console.log(`\n  Running: "${prompt.slice(0, 80)}..."`);
		}

		const checklist = await extractChecklist(prompt);
		const result = await runSingleExample(runnerConfig, promptConfig, checklist);

		if (config.verbose) {
			const status = result.success ? 'PASS' : 'FAIL';
			console.log(
				`  Result: ${status}, Score: ${(result.checklistScore * 100).toFixed(0)}%, Tools: ${String(result.metrics.totalToolCalls)}, Time: ${(result.metrics.totalTimeMs / 1000).toFixed(1)}s`,
			);
		}

		return {
			success: result.success,
			checklistScore: result.checklistScore,
			totalToolCalls: result.metrics.totalToolCalls,
			subAgentsSpawned: result.metrics.subAgentsSpawned,
			totalTimeMs: result.metrics.totalTimeMs,
			timeToFirstTextMs: result.metrics.timeToFirstTextMs,
			checklistResults: result.checklistResults,
			workflowsCreated: result.outcome.workflowsCreated.length,
			executionsRun: result.outcome.executionsRun.length,
			error: result.error ?? null,
		};
	};

	// Evaluator: extracts pre-computed metrics from target output
	const feedbackExtractor = (run: Run) => {
		const outputs = (run.outputs ?? {}) as Record<string, unknown>;
		return [
			{
				key: 'checklist_score',
				score: typeof outputs.checklistScore === 'number' ? outputs.checklistScore : 0,
			},
			{
				key: 'success',
				score: outputs.success === true ? 1 : 0,
			},
			{
				key: 'tool_calls',
				score: typeof outputs.totalToolCalls === 'number' ? outputs.totalToolCalls : 0,
			},
			{
				key: 'sub_agents',
				score: typeof outputs.subAgentsSpawned === 'number' ? outputs.subAgentsSpawned : 0,
			},
			{
				key: 'time_seconds',
				score: typeof outputs.totalTimeMs === 'number' ? Math.round(outputs.totalTimeMs / 1000) : 0,
			},
			{
				key: 'time_to_first_text_seconds',
				score:
					typeof outputs.timeToFirstTextMs === 'number'
						? Math.round(outputs.timeToFirstTextMs / 1000)
						: 0,
			},
			{
				key: 'workflows_created',
				score: typeof outputs.workflowsCreated === 'number' ? outputs.workflowsCreated : 0,
			},
		];
	};

	// Reference comparison evaluator: compares against golden snapshot (if available)
	const referenceComparator = (run: Run, example?: Example): EvaluationResult[] => {
		if (!example) return [];
		const outputs = (run.outputs ?? {}) as Record<string, unknown>;
		const reference = example.outputs as Record<string, unknown> | undefined;
		if (!reference || Object.keys(reference).length === 0) return [];

		const results: EvaluationResult[] = [];

		// Did the agent produce the same number of workflows?
		const currentWfs = typeof outputs.workflowsCreated === 'number' ? outputs.workflowsCreated : 0;
		const refWfs = Array.isArray(reference.workflowsCreated)
			? reference.workflowsCreated.length
			: 0;
		results.push({
			key: 'ref_workflows_match',
			score: currentWfs === refWfs ? 1 : 0,
		});

		// Checklist score delta vs reference baseline (positive = improvement)
		const currentScore = typeof outputs.checklistScore === 'number' ? outputs.checklistScore : 0;
		const refScore = typeof reference.checklistScore === 'number' ? reference.checklistScore : 0;
		results.push({
			key: 'ref_checklist_delta',
			score: currentScore - refScore,
		});

		// Tool call efficiency ratio (reference / current — higher = more efficient)
		const currentTools = typeof outputs.totalToolCalls === 'number' ? outputs.totalToolCalls : 0;
		const refTools = typeof reference.totalToolCalls === 'number' ? reference.totalToolCalls : 0;
		results.push({
			key: 'ref_tool_efficiency',
			score: refTools > 0 ? refTools / Math.max(currentTools, 1) : 1,
		});

		return results;
	};

	// Run evaluation
	console.log(`\nStarting LangSmith evaluation...`);
	console.log(`  Experiment: ${config.experimentName}`);
	console.log(`  Concurrency: ${String(config.concurrency)}`);
	console.log('');

	const experimentResults = await evaluate(target, {
		data,
		evaluators: [feedbackExtractor, referenceComparator],
		experimentPrefix: config.experimentName,
		maxConcurrency: config.concurrency,
		client,
		metadata: {
			n8nBaseUrl: config.n8nBaseUrl,
			source: 'local',
			timeoutMs: config.timeoutMs,
		},
	});

	// Print summary
	console.log('\n=== LangSmith Evaluation Complete ===');
	console.log(`Experiment: ${config.experimentName}`);

	const results = experimentResults.results ?? [];
	console.log(`Examples evaluated: ${String(results.length)}`);
}
