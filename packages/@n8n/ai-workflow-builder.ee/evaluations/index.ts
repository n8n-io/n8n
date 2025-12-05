import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { runCliEvaluation } from './cli/runner.js';
import { runPairwiseLangsmithEvaluation } from './langsmith/pairwise-runner.js';
import { runLangsmithEvaluation } from './langsmith/runner.js';
import { loadTestCasesFromCsv } from './utils/csv-prompt-loader.js';

// Re-export for external use if needed
export { runCliEvaluation } from './cli/runner.js';
export { runLangsmithEvaluation } from './langsmith/runner.js';
export { runPairwiseLangsmithEvaluation } from './langsmith/pairwise-runner.js';
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

	// Parse feature flags from environment variables or CLI arguments
	const featureFlags = parseFeatureFlags();

	if (usePairwiseEval) {
		await runPairwiseLangsmithEvaluation(repetitions, featureFlags);
	} else if (useLangsmith) {
		await runLangsmithEvaluation(repetitions, featureFlags);
	} else {
		const csvTestCases = promptsCsvPath ? loadTestCasesFromCsv(promptsCsvPath) : undefined;
		await runCliEvaluation({
			testCases: csvTestCases,
			testCaseFilter: testCaseId,
			repetitions,
			featureFlags,
		});
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

/**
 * Parse feature flags from environment variables or CLI arguments.
 * Environment variables:
 *   - EVAL_FEATURE_TEMPLATE_EXAMPLES=true - Enable template examples feature
 *   - EVAL_FEATURE_MULTI_AGENT=true - Enable multi-agent feature
 * CLI arguments:
 *   - --template-examples - Enable template examples feature
 *   - --multi-agent - Enable multi-agent feature
 */
function parseFeatureFlags(): BuilderFeatureFlags | undefined {
	const templateExamplesFromEnv = process.env.EVAL_FEATURE_TEMPLATE_EXAMPLES === 'true';
	const multiAgentFromEnv = process.env.EVAL_FEATURE_MULTI_AGENT === 'true';

	const templateExamplesFromCli = process.argv.includes('--template-examples');
	const multiAgentFromCli = process.argv.includes('--multi-agent');

	const templateExamples = templateExamplesFromEnv || templateExamplesFromCli;
	const multiAgent = multiAgentFromEnv || multiAgentFromCli;

	// Only return feature flags object if at least one flag is set
	if (templateExamples || multiAgent) {
		return {
			templateExamples: templateExamples || undefined,
			multiAgent: multiAgent || undefined,
		};
	}

	return undefined;
}

// Run if called directly
if (require.main === module) {
	main().catch(console.error);
}
