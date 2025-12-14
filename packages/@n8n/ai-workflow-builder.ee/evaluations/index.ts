import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import type { AgentModelConfig, ModelType } from './core/environment.js';
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
export { setupTestEnvironment, createAgent, type AgentModelConfig } from './core/environment.js';

/** Parse an integer flag with default value */
function getIntFlag(flag: string, defaultValue: number, max?: number): number {
	const arg = getFlagValue(flag);
	if (!arg) return defaultValue;
	const parsed = parseInt(arg, 10);
	if (Number.isNaN(parsed) || parsed < 1) return defaultValue;
	return max ? Math.min(parsed, max) : parsed;
}

/**
 * Parse model type from CLI arguments or environment variable
 * Supports: haiku, sonnet, opus
 * Defaults to 'sonnet' if not specified
 */
function parseModelType(): ModelType {
	const modelArg = getFlagValue('--model') ?? process.env.EVAL_MODEL;
	if (!modelArg) {
		return 'sonnet'; // Default
	}

	const normalized = modelArg.toLowerCase().trim();
	if (normalized === 'haiku' || normalized === 'sonnet' || normalized === 'opus') {
		return normalized as ModelType;
	}

	throw new Error(`Invalid model type: ${modelArg}. Must be one of: haiku, sonnet, opus`);
}

/**
 * Parse judge model type from CLI arguments or environment variable
 * Supports: haiku, sonnet, opus
 * Defaults to 'sonnet' if not specified (keeps judge fixed to sonnet by default)
 */
function parseJudgeModelType(): ModelType {
	const judgeModelArg = getFlagValue('--judge-model') ?? process.env.EVAL_JUDGE_MODEL;
	if (!judgeModelArg) {
		return 'sonnet'; // Default to sonnet for judge
	}

	const normalized = judgeModelArg.toLowerCase().trim();
	if (normalized === 'haiku' || normalized === 'sonnet' || normalized === 'opus') {
		return normalized as ModelType;
	}

	throw new Error(
		`Invalid judge model type: ${judgeModelArg}. Must be one of: haiku, sonnet, opus`,
	);
}

/**
 * Parse per-agent model configuration from CLI arguments or environment variables
 * Supports: haiku, sonnet, opus for each agent
 * Returns undefined if no per-agent config is provided (backward compatibility)
 * @param _modelType - The default model type (used as fallback in setupTestEnvironment, not in this function)
 */
function parseAgentModelConfig(_modelType: ModelType): AgentModelConfig | undefined {
	const parseAgentModel = (flag: string, envVar: string): ModelType | undefined => {
		const value = getFlagValue(flag) ?? process.env[envVar];
		if (!value) return undefined;

		const normalized = value.toLowerCase().trim();
		if (normalized === 'haiku' || normalized === 'sonnet' || normalized === 'opus') {
			return normalized as ModelType;
		}

		throw new Error(`Invalid agent model type: ${value}. Must be one of: haiku, sonnet, opus`);
	};

	const supervisor = parseAgentModel('--agent-model-supervisor', 'EVAL_AGENT_MODEL_SUPERVISOR');
	const responder = parseAgentModel('--agent-model-responder', 'EVAL_AGENT_MODEL_RESPONDER');
	const discovery = parseAgentModel('--agent-model-discovery', 'EVAL_AGENT_MODEL_DISCOVERY');
	const builder = parseAgentModel('--agent-model-builder', 'EVAL_AGENT_MODEL_BUILDER');
	const configurator = parseAgentModel(
		'--agent-model-configurator',
		'EVAL_AGENT_MODEL_CONFIGURATOR',
	);

	// Only return config if at least one agent model is specified
	if (supervisor || responder || discovery || builder || configurator) {
		return {
			supervisor,
			responder,
			discovery,
			builder,
			configurator,
			// default field omitted - setupTestEnvironment() will use modelType as fallback
		};
	}

	return undefined;
}

/** Parse all CLI arguments */
function parseCliArgs() {
	const modelType = parseModelType();
	return {
		testCaseId: process.argv.includes('--test-case')
			? process.argv[process.argv.indexOf('--test-case') + 1]
			: undefined,
		promptsCsvPath: getFlagValue('--prompts-csv') ?? process.env.PROMPTS_CSV_FILE,
		repetitions: getIntFlag('--repetitions', 1),
		notionId: getFlagValue('--notion-id'),
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
		modelType,
		judgeModelType: parseJudgeModelType(),
		agentModelConfig: parseAgentModelConfig(modelType),
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
				modelType: args.modelType,
				judgeModelType: args.judgeModelType,
				agentModelConfig: args.agentModelConfig,
			});
		} else {
			// LangSmith mode
			await runPairwiseLangsmithEvaluation({
				repetitions: args.repetitions,
				notionId: args.notionId,
				numJudges: args.numJudges,
				numGenerations: args.numGenerations,
				verbose: args.verbose,
				experimentName: args.experimentName,
				concurrency: args.concurrency,
				maxExamples: args.maxExamples,
				featureFlags,
				modelType: args.modelType,
				judgeModelType: args.judgeModelType,
				agentModelConfig: args.agentModelConfig,
			});
		}
	} else if (useLangsmith) {
		await runLangsmithEvaluation(args.repetitions, featureFlags, args.modelType);
	} else {
		const csvTestCases = args.promptsCsvPath
			? loadTestCasesFromCsv(args.promptsCsvPath)
			: undefined;
		await runCliEvaluation({
			testCases: csvTestCases,
			testCaseFilter: args.testCaseId,
			repetitions: args.repetitions,
			featureFlags,
			modelType: args.modelType,
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
