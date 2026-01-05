import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { runCliEvaluation } from './cli/runner.js';
import { runLangsmithEvaluation } from './langsmith/runner.js';
import { runLocalPairwiseEvaluation, runPairwiseLangsmithEvaluation } from './pairwise/runner.js';
import { loadTestCasesFromCsv } from './utils/csv-prompt-loader.js';

// Re-export for external use if needed
export { runCliEvaluation } from './cli/runner.js';
export { runLangsmithEvaluation } from './langsmith/runner.js';
export {
	runLocalPairwiseEvaluation,
	runPairwiseLangsmithEvaluation,
} from './pairwise/runner.js';
export { runSingleTest } from './core/test-runner.js';
export { setupTestEnvironment, createAgent } from './core/environment.js';

/** All valid CLI flags */
const VALID_FLAGS = [
	'--test-case',
	'--prompts-csv',
	'--repetitions',
	'--notion-id',
	'--technique',
	'--judges',
	'--generations',
	'--concurrency',
	'--max-examples',
	'--verbose',
	'-v',
	'--name',
	'--output-dir',
	'--prompt',
	'--dos',
	'--donts',
	'--template-examples',
	'--multi-agent',
] as const;

/** Validate that all provided CLI flags are recognized */
function validateCliArgs(): void {
	const args = process.argv.slice(2); // Skip node and script path

	for (const arg of args) {
		// Skip values (non-flag arguments)
		if (!arg.startsWith('-')) continue;

		// Handle --flag=value format
		const flagName = arg.includes('=') ? arg.split('=')[0] : arg;

		if (!VALID_FLAGS.includes(flagName as (typeof VALID_FLAGS)[number])) {
			const validFlagsList = VALID_FLAGS.filter((f) => f.startsWith('--')).join('\n  ');
			throw new Error(`Unknown flag: ${flagName}\n\nValid flags:\n  ${validFlagsList}`);
		}
	}
}

/** Parse an integer flag with default value */
function getIntFlag(flag: string, defaultValue: number, max?: number): number {
	const arg = getFlagValue(flag);
	if (!arg) return defaultValue;
	const parsed = parseInt(arg, 10);
	if (Number.isNaN(parsed) || parsed < 1) return defaultValue;
	return max ? Math.min(parsed, max) : parsed;
}

/** Parse all CLI arguments */
function parseCliArgs() {
	validateCliArgs();
	return {
		testCaseId: process.argv.includes('--test-case')
			? process.argv[process.argv.indexOf('--test-case') + 1]
			: undefined,
		promptsCsvPath: getFlagValue('--prompts-csv') ?? process.env.PROMPTS_CSV_FILE,
		repetitions: getIntFlag('--repetitions', 1),
		notionId: getFlagValue('--notion-id'),
		technique: getFlagValue('--technique'),
		numJudges: getIntFlag('--judges', 3),
		numGenerations: getIntFlag('--generations', 1, 10),
		concurrency: getIntFlag('--concurrency', 5),
		// Use 0 as sentinel for "no limit", convert to undefined for cleaner API
		maxExamples: getIntFlag('--max-examples', 0) || undefined,
		verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
		experimentName: getFlagValue('--name'),
		outputDir: getFlagValue('--output-dir'),
		prompt: getFlagValue('--prompt'),
		dos: getFlagValue('--dos'),
		donts: getFlagValue('--donts'),
	};
}

/**
 * Main entry point for evaluation
 * Determines which evaluation mode to run based on environment variables
 */
async function main(): Promise<void> {
	const useLangsmith = process.env.USE_LANGSMITH_EVAL === 'true';
	const usePairwiseEval = process.env.USE_PAIRWISE_EVAL === 'true';
	const args = parseCliArgs();

	if (args.promptsCsvPath && (useLangsmith || usePairwiseEval)) {
		console.warn('CSV-driven evaluations are only supported in CLI mode. Ignoring --prompts-csv.');
	}

	// Parse feature flags from environment variables or CLI arguments
	const featureFlags = parseFeatureFlags();

	if (usePairwiseEval) {
		if (args.prompt) {
			// Local mode - run single evaluation without LangSmith
			await runLocalPairwiseEvaluation({
				prompt: args.prompt,
				criteria: { dos: args.dos ?? '', donts: args.donts ?? '' },
				numJudges: args.numJudges,
				numGenerations: args.numGenerations,
				verbose: args.verbose,
				outputDir: args.outputDir,
				featureFlags,
			});
		} else {
			// LangSmith mode
			await runPairwiseLangsmithEvaluation({
				repetitions: args.repetitions,
				notionId: args.notionId,
				technique: args.technique,
				numJudges: args.numJudges,
				numGenerations: args.numGenerations,
				verbose: args.verbose,
				experimentName: args.experimentName,
				concurrency: args.concurrency,
				maxExamples: args.maxExamples,
				featureFlags,
			});
		}
	} else if (useLangsmith) {
		await runLangsmithEvaluation(args.repetitions, featureFlags);
	} else {
		const csvTestCases = args.promptsCsvPath
			? loadTestCasesFromCsv(args.promptsCsvPath)
			: undefined;
		await runCliEvaluation({
			testCases: csvTestCases,
			testCaseFilter: args.testCaseId,
			repetitions: args.repetitions,
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
