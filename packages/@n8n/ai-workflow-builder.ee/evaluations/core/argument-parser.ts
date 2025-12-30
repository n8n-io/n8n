import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent.js';
import { DEFAULTS } from '../constants.js';

/**
 * All valid CLI flags for evaluation commands.
 */
const VALID_FLAGS = [
	// Common flags
	'--verbose',
	'-v',
	'--repetitions',
	'--concurrency',
	'--name',
	'--output-dir',

	// Test case selection
	'--test-case',
	'--prompts-csv',
	'--max-examples',

	// Pairwise-specific
	'--notion-id',
	'--technique',
	'--judges',
	'--generations',
	'--prompt',
	'--dos',
	'--donts',

	// Feature flags
	'--template-examples',
	'--multi-agent',
] as const;

/**
 * Evaluation mode determined by environment variables.
 */
export type EvaluationMode =
	| 'llm-judge-langsmith'
	| 'llm-judge-local'
	| 'pairwise-langsmith'
	| 'pairwise-local';

/**
 * Parsed CLI arguments for all evaluation types.
 */
export interface EvaluationArgs {
	// Common
	verbose: boolean;
	repetitions: number;
	concurrency: number;
	experimentName?: string;
	outputDir?: string;
	featureFlags?: BuilderFeatureFlags;

	// Test case selection
	testCase?: string;
	promptsCsv?: string;
	maxExamples?: number;

	// Pairwise-specific
	notionId?: string;
	technique?: string;
	numJudges: number;
	numGenerations: number;
	prompt?: string;
	dos?: string;
	donts?: string;

	// Computed
	mode: EvaluationMode;
}

/**
 * Validate that all provided CLI flags are recognized.
 * @throws Error if an unknown flag is found
 */
function validateCliArgs(argv: string[]): void {
	for (const arg of argv) {
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

/**
 * Get the value of a flag from argv.
 * Supports both --flag value and --flag=value formats.
 */
function getFlagValue(argv: string[], flag: string): string | undefined {
	const exactMatchIndex = argv.findIndex((arg) => arg === flag);
	if (exactMatchIndex !== -1) {
		const value = argv[exactMatchIndex + 1];
		if (!value || value.startsWith('--')) {
			throw new Error(`Flag ${flag} requires a value`);
		}
		return value;
	}

	const withValue = argv.find((arg) => arg.startsWith(`${flag}=`));
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
 * Parse an integer flag with default value and optional maximum.
 */
function getIntFlag(argv: string[], flag: string, defaultValue: number, max?: number): number {
	const arg = getFlagValue(argv, flag);
	if (!arg) return defaultValue;
	const parsed = parseInt(arg, 10);
	if (Number.isNaN(parsed) || parsed < 1) return defaultValue;
	return max ? Math.min(parsed, max) : parsed;
}

/**
 * Check if a boolean flag is present.
 */
function hasFlag(argv: string[], ...flags: string[]): boolean {
	return flags.some((flag) => argv.includes(flag));
}

/**
 * Parse feature flags from environment variables and CLI arguments.
 */
function parseFeatureFlags(argv: string[]): BuilderFeatureFlags | undefined {
	const templateExamplesFromEnv = process.env.EVAL_FEATURE_TEMPLATE_EXAMPLES === 'true';
	const multiAgentFromEnv = process.env.EVAL_FEATURE_MULTI_AGENT === 'true';

	const templateExamplesFromCli = hasFlag(argv, '--template-examples');
	const multiAgentFromCli = hasFlag(argv, '--multi-agent');

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

/**
 * Determine the evaluation mode based on environment variables and args.
 */
function determineEvaluationMode(args: {
	useLangsmith: boolean;
	usePairwiseEval: boolean;
	prompt?: string;
}): EvaluationMode {
	const { useLangsmith, usePairwiseEval, prompt } = args;

	if (usePairwiseEval) {
		// Pairwise mode - local if prompt provided, otherwise LangSmith
		return prompt ? 'pairwise-local' : 'pairwise-langsmith';
	}

	if (useLangsmith) {
		return 'llm-judge-langsmith';
	}

	return 'llm-judge-local';
}

/**
 * Parse all CLI arguments into a unified structure.
 * @param argv - Command line arguments (default: process.argv.slice(2))
 */
export function parseEvaluationArgs(argv: string[] = process.argv.slice(2)): EvaluationArgs {
	validateCliArgs(argv);

	const useLangsmith = process.env.USE_LANGSMITH_EVAL === 'true';
	const usePairwiseEval = process.env.USE_PAIRWISE_EVAL === 'true';

	// Parse common args
	const verbose = hasFlag(argv, '--verbose', '-v');
	const repetitions = getIntFlag(argv, '--repetitions', DEFAULTS.REPETITIONS);
	const concurrency = getIntFlag(argv, '--concurrency', DEFAULTS.CONCURRENCY);
	const experimentName = getFlagValue(argv, '--name');
	const outputDir = getFlagValue(argv, '--output-dir');

	// Parse test case selection
	const testCase = getFlagValue(argv, '--test-case');
	const promptsCsv = getFlagValue(argv, '--prompts-csv') ?? process.env.PROMPTS_CSV_FILE;
	const maxExamplesRaw = getIntFlag(argv, '--max-examples', 0);
	const maxExamples = maxExamplesRaw || undefined; // Convert 0 to undefined

	// Parse pairwise-specific args
	const notionId = getFlagValue(argv, '--notion-id');
	const technique = getFlagValue(argv, '--technique');
	const numJudges = getIntFlag(argv, '--judges', DEFAULTS.NUM_JUDGES);
	const numGenerations = getIntFlag(argv, '--generations', DEFAULTS.NUM_GENERATIONS, 10);
	const prompt = getFlagValue(argv, '--prompt');
	const dos = getFlagValue(argv, '--dos');
	const donts = getFlagValue(argv, '--donts');

	// Parse feature flags
	const featureFlags = parseFeatureFlags(argv);

	// Determine mode
	const mode = determineEvaluationMode({ useLangsmith, usePairwiseEval, prompt });

	// Warn about incompatible combinations
	if (promptsCsv && (useLangsmith || usePairwiseEval)) {
		console.warn('CSV-driven evaluations are only supported in CLI mode. Ignoring --prompts-csv.');
	}

	return {
		verbose,
		repetitions,
		concurrency,
		experimentName,
		outputDir,
		testCase,
		promptsCsv: mode === 'llm-judge-local' ? promptsCsv : undefined,
		maxExamples,
		notionId,
		technique,
		numJudges,
		numGenerations,
		prompt,
		dos,
		donts,
		featureFlags,
		mode,
	};
}

/**
 * Get the default experiment name for a mode.
 */
export function getDefaultExperimentName(mode: EvaluationMode): string {
	switch (mode) {
		case 'pairwise-langsmith':
		case 'pairwise-local':
			return DEFAULTS.EXPERIMENT_NAME;
		case 'llm-judge-langsmith':
		case 'llm-judge-local':
			return DEFAULTS.LLM_JUDGE_EXPERIMENT_NAME;
	}
}

/**
 * Get the default dataset name for a mode.
 */
export function getDefaultDatasetName(mode: EvaluationMode): string {
	switch (mode) {
		case 'pairwise-langsmith':
		case 'pairwise-local':
			return DEFAULTS.DATASET_NAME;
		case 'llm-judge-langsmith':
		case 'llm-judge-local':
			return process.env.LANGSMITH_DATASET_NAME ?? 'workflow-builder-canvas-prompts';
	}
}
