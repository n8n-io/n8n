import { runCliEvaluation } from './cli/runner.js';
import { parseEvaluationArgs } from './core/argument-parser.js';
import { runLLMJudgeLangsmith } from './runners/llm-judge-runner.js';
import { runPairwiseLangsmith, runPairwiseLocal } from './runners/pairwise-runner.js';
import { loadTestCasesFromCsv } from './utils/csv-prompt-loader.js';

// Re-export for external use
export { runCliEvaluation } from './cli/runner.js';
export { runLLMJudgeLangsmith, LLMJudgeRunner } from './runners/llm-judge-runner.js';
export {
	runPairwiseLangsmith,
	runPairwiseLocal,
	PairwiseRunner,
} from './runners/pairwise-runner.js';
export { runSingleTest } from './core/test-runner.js';
export { setupTestEnvironment, createAgent } from './core/environment.js';
export {
	parseEvaluationArgs,
	type EvaluationArgs,
	type EvaluationMode,
} from './core/argument-parser.js';
export { createProgressReporter, OrderedProgressReporter } from './core/progress-reporter.js';
export { EvaluationRunnerBase } from './core/runner-base.js';

/**
 * Main entry point for evaluation.
 * Uses unified argument parser and new runner architecture.
 */
async function main(): Promise<void> {
	const args = parseEvaluationArgs();

	switch (args.mode) {
		case 'pairwise-local':
			// Local pairwise - run single evaluation with custom criteria
			await runPairwiseLocal({
				args,
				testCases: args.prompt ? [{ prompt: args.prompt }] : undefined,
			});
			break;

		case 'pairwise-langsmith':
			// LangSmith pairwise evaluation
			await runPairwiseLangsmith({ args });
			break;

		case 'llm-judge-langsmith':
			// LangSmith LLM-as-judge evaluation (the key fix)
			await runLLMJudgeLangsmith({ args });
			break;

		case 'llm-judge-local':
		default:
			// Local CLI evaluation (original behavior)
			const csvTestCases = args.promptsCsv ? loadTestCasesFromCsv(args.promptsCsv) : undefined;
			await runCliEvaluation({
				testCases: csvTestCases,
				testCaseFilter: args.testCase,
				repetitions: args.repetitions,
				featureFlags: args.featureFlags,
				verbose: args.verbose,
			});
			break;
	}
}

// Run if called directly
if (require.main === module) {
	main().catch(console.error);
}
