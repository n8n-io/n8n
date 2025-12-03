import { runCliEvaluation } from './cli/runner.js';
import {
	runLocalPairwiseEvaluation,
	runPairwiseLangsmithEvaluation,
} from './langsmith/pairwise-runner.js';
import { runLangsmithEvaluation } from './langsmith/runner.js';
import { loadTestCasesFromCsv } from './utils/csv-prompt-loader.js';

// Re-export for external use if needed
export { runCliEvaluation } from './cli/runner.js';
export { runLangsmithEvaluation } from './langsmith/runner.js';
export {
	runLocalPairwiseEvaluation,
	runPairwiseLangsmithEvaluation,
} from './langsmith/pairwise-runner.js';
export { runSingleTest } from './core/test-runner.js';
export { setupTestEnvironment, createAgent } from './core/environment.js';

/**
 * Main entry point for evaluation
 * Determines which evaluation mode to run based on environment variables
 */
async function main(): Promise<void> {
	const useLangsmith = process.env.USE_LANGSMITH_EVAL === 'true';
	const usePairwiseEval = process.env.USE_PAIRWISE_EVAL === 'true';

	// Parse command line arguments for single test case
	const testCaseId = process.argv.includes('--test-case')
		? process.argv[process.argv.indexOf('--test-case') + 1]
		: undefined;

	// Parse command line argument for CSV prompts file path
	const promptsCsvPath = getFlagValue('--prompts-csv') ?? process.env.PROMPTS_CSV_FILE;

	if (promptsCsvPath && (useLangsmith || usePairwiseEval)) {
		console.warn('CSV-driven evaluations are only supported in CLI mode. Ignoring --prompts-csv.');
	}

	// Parse command line arguments for a number of repetitions (applies to both modes)
	const repetitionsArg = process.argv.includes('--repetitions')
		? parseInt(process.argv[process.argv.indexOf('--repetitions') + 1], 10)
		: 1;
	const repetitions = Number.isNaN(repetitionsArg) ? 1 : repetitionsArg;

	// Parse --notion-id argument for pairwise evaluation filtering
	const notionId = getFlagValue('--notion-id');

	// Parse --judges argument for pairwise evaluation (default: 3)
	const numJudgesArg = getFlagValue('--judges');
	const numJudges = numJudgesArg ? parseInt(numJudgesArg, 10) : 3;

	// Parse --verbose flag for detailed logging
	const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

	// Parse --name argument for custom experiment name
	const experimentName = getFlagValue('--name');

	// Parse local pairwise evaluation flags
	const prompt = getFlagValue('--prompt');
	const dos = getFlagValue('--dos');
	const donts = getFlagValue('--donts');

	if (usePairwiseEval) {
		if (prompt) {
			// Local mode - run single evaluation without LangSmith
			await runLocalPairwiseEvaluation({
				prompt,
				criteria: { dos: dos ?? '', donts: donts ?? '' },
				numJudges,
				verbose,
			});
		} else {
			// LangSmith mode
			await runPairwiseLangsmithEvaluation({
				repetitions,
				notionId,
				numJudges,
				verbose,
				experimentName,
			});
		}
	} else if (useLangsmith) {
		await runLangsmithEvaluation(repetitions);
	} else {
		const csvTestCases = promptsCsvPath ? loadTestCasesFromCsv(promptsCsvPath) : undefined;
		await runCliEvaluation({ testCases: csvTestCases, testCaseFilter: testCaseId, repetitions });
	}
}

function getFlagValue(flag: string): string | undefined {
	const exactMatchIndex = process.argv.findIndex((arg) => arg === flag);
	if (exactMatchIndex !== -1) {
		const value = process.argv[exactMatchIndex + 1];
		if (!value || value.startsWith('--')) {
			throw new Error(`Flag ${flag} requires a value`);
		}
		return value;
	}

	const withValue = process.argv.find((arg) => arg.startsWith(`${flag}=`));
	if (withValue) {
		const value = withValue.slice(flag.length + 1);
		if (!value) {
			throw new Error(`Flag ${flag} requires a value`);
		}
		return value;
	}

	return undefined;
}

// Run if called directly
if (require.main === module) {
	main().catch(console.error);
}
