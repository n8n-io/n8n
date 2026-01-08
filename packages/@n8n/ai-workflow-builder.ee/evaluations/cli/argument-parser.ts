import yargs from 'yargs/yargs';
import { z } from 'zod';

import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent.js';
import type { LangsmithExampleFilters } from '../harness/harness-types';
import { DEFAULTS } from '../support/constants';

export type EvaluationSuite = 'llm-judge' | 'pairwise' | 'programmatic' | 'similarity';
export type EvaluationBackend = 'local' | 'langsmith';

export interface EvaluationArgs {
	suite: EvaluationSuite;
	backend: EvaluationBackend;

	verbose: boolean;
	repetitions: number;
	concurrency: number;
	timeoutMs: number;
	experimentName?: string;
	outputDir?: string;
	datasetName?: string;
	maxExamples?: number;
	filters?: LangsmithExampleFilters;

	testCase?: string;
	promptsCsv?: string;

	prompt?: string;
	dos?: string;
	donts?: string;

	numJudges: number;
	numGenerations: number;

	featureFlags?: BuilderFeatureFlags;
}

const cliSchema = z
	.object({
		suite: z.enum(['llm-judge', 'pairwise', 'programmatic', 'similarity']).default('llm-judge'),
		backend: z.enum(['local', 'langsmith']).default('local'),

		verbose: z.boolean().default(false),
		repetitions: z.coerce.number().int().positive().default(DEFAULTS.REPETITIONS),
		concurrency: z.coerce.number().int().positive().default(DEFAULTS.CONCURRENCY),
		timeoutMs: z.coerce.number().int().positive().default(DEFAULTS.TIMEOUT_MS),
		experimentName: z.string().min(1).optional(),
		outputDir: z.string().min(1).optional(),
		datasetName: z.string().min(1).optional(),
		maxExamples: z.coerce.number().int().positive().optional(),
		filter: z.array(z.string().min(1)).default([]),
		notionId: z.string().min(1).optional(),
		technique: z.string().min(1).optional(),

		testCase: z.string().min(1).optional(),
		promptsCsv: z.string().min(1).optional(),

		prompt: z.string().min(1).optional(),
		dos: z.string().min(1).optional(),
		donts: z.string().min(1).optional(),

		numJudges: z.coerce.number().int().positive().default(DEFAULTS.NUM_JUDGES),
		numGenerations: z.coerce.number().int().positive().max(10).default(DEFAULTS.NUM_GENERATIONS),

		langsmith: z.boolean().optional(),
		templateExamples: z.boolean().default(false),
		multiAgent: z.boolean().default(false),
	})
	.strict();

type CliArgs = z.infer<typeof cliSchema>;

function isYargsError(value: unknown): value is Error {
	return value instanceof Error;
}

function isHelpFlag(argv: string[]): boolean {
	return argv.includes('--help') || argv.includes('-h');
}

function wasFlagProvided(argv: string[], flag: `--${string}`): boolean {
	return argv.some((t) => t === flag || t.startsWith(`${flag}=`));
}

function createCliParser(argv: string[]) {
	const parser = yargs(argv)
		.scriptName('eval')
		.usage('Usage: $0 [options]')
		.help('help')
		.alias('help', 'h')
		.strictOptions()
		.parserConfiguration({
			// Remove alias duplicates (e.g. mode -> suite, timeout-ms -> timeoutMs)
			'strip-aliased': true,
			'strip-dashed': true,
		})
		.fail((msg, error) => {
			if (isYargsError(error)) throw error;
			// Keep a stable prefix to make tests and user-facing errors predictable.
			throw new Error(msg.startsWith('Unknown argument') ? `Unknown flag. ${msg}` : msg);
		})
		.exitProcess(false);

	parser.wrap(Math.min(120, parser.terminalWidth()));

	parser.option('suite', {
		alias: 'mode',
		choices: ['llm-judge', 'pairwise', 'programmatic', 'similarity'] as const,
		describe: 'Evaluation suite to run',
		type: 'string',
	});

	parser.option('backend', {
		choices: ['local', 'langsmith'] as const,
		describe: 'Execution backend',
		type: 'string',
	});

	parser.option('langsmith', {
		describe: 'Alias for `--backend langsmith`',
		type: 'boolean',
	});

	parser.option('verbose', { alias: 'v', describe: 'Enable verbose logging', type: 'boolean' });
	parser.option('repetitions', { describe: 'LangSmith: repetitions per example', type: 'string' });
	parser.option('concurrency', { describe: 'Max concurrent LLM calls', type: 'string' });
	parser.option('timeoutMs', {
		alias: 'timeout-ms',
		describe: 'Per-operation timeout in milliseconds',
		type: 'string',
	});

	parser.option('experimentName', {
		alias: 'name',
		describe: 'LangSmith experiment name prefix',
		type: 'string',
	});
	parser.option('outputDir', {
		alias: 'output-dir',
		describe: 'Local: write artifacts',
		type: 'string',
	});
	parser.option('datasetName', {
		alias: 'dataset',
		describe: 'LangSmith dataset name',
		type: 'string',
	});
	parser.option('maxExamples', {
		alias: 'max-examples',
		describe: 'Limit number of examples',
		type: 'string',
	});

	parser.option('filter', {
		describe: 'LangSmith dataset filter (repeatable)',
		type: 'string',
		array: true,
	});
	parser.option('notionId', {
		alias: 'notion-id',
		describe: 'LangSmith filter: notion id',
		type: 'string',
	});
	parser.option('technique', { describe: 'LangSmith filter: technique', type: 'string' });

	parser.option('testCase', {
		alias: 'test-case',
		describe: 'Local: run a predefined test case id',
		type: 'string',
	});
	parser.option('promptsCsv', {
		alias: 'prompts-csv',
		describe: 'Local: load prompts from CSV',
		type: 'string',
	});
	parser.option('prompt', { describe: 'Local: single prompt', type: 'string' });
	parser.option('dos', { describe: 'Pairwise: required behaviors', type: 'string' });
	parser.option('donts', { describe: 'Pairwise: forbidden behaviors', type: 'string' });

	parser.option('numJudges', {
		alias: 'judges',
		describe: 'Pairwise: number of judges',
		type: 'string',
	});
	parser.option('numGenerations', {
		alias: 'generations',
		describe: 'Pairwise: number of generations',
		type: 'string',
	});

	parser.option('templateExamples', {
		alias: 'template-examples',
		describe: 'Enable template examples feature flag',
		type: 'boolean',
	});
	parser.option('multiAgent', {
		alias: 'multi-agent',
		describe: 'Enable multi-agent feature flag',
		type: 'boolean',
	});

	return parser;
}

function parseFeatureFlags(args: { templateExamples: boolean; multiAgent: boolean }):
	| BuilderFeatureFlags
	| undefined {
	const templateExamplesFromEnv = process.env.EVAL_FEATURE_TEMPLATE_EXAMPLES === 'true';
	const multiAgentFromEnv = process.env.EVAL_FEATURE_MULTI_AGENT === 'true';

	const templateExamples = templateExamplesFromEnv || args.templateExamples;
	const multiAgent = multiAgentFromEnv || args.multiAgent;

	if (!templateExamples && !multiAgent) return undefined;

	return {
		templateExamples: templateExamples || undefined,
		multiAgent: multiAgent || undefined,
	};
}

function parseFilters(args: {
	filter: string[];
	notionId?: string;
	technique?: string;
}): LangsmithExampleFilters | undefined {
	const filters: LangsmithExampleFilters = {};

	for (const raw of args.filter) {
		const match = raw.match(/^(\w+):(.+)$/);
		if (!match) {
			throw new Error('Invalid `--filter` format. Expected: --filter "key:value"');
		}

		const [, key, valueRaw] = match;
		const value = valueRaw.trim();
		if (value.length === 0) {
			throw new Error(`Invalid \`--filter\` value for "${key}": value cannot be empty`);
		}
		switch (key) {
			case 'do':
				filters.doSearch = value;
				break;
			case 'dont':
				filters.dontSearch = value;
				break;
			case 'technique':
				filters.technique = value;
				break;
			case 'id':
				filters.notionId = value;
				break;
			default:
				throw new Error(`Unknown filter key "${key}". Expected one of: do, dont, technique, id`);
		}
	}

	if (args.notionId && !filters.notionId) filters.notionId = args.notionId;
	if (args.technique && !filters.technique) filters.technique = args.technique;

	const hasAny = Object.values(filters).some((v) => typeof v === 'string' && v.length > 0);
	return hasAny ? filters : undefined;
}

export function parseEvaluationArgs(argv: string[] = process.argv.slice(2)): EvaluationArgs {
	const calledWithProcessArgv = arguments.length === 0;
	const parser = createCliParser(argv);

	if (calledWithProcessArgv && isHelpFlag(argv)) {
		parser.showHelp();
		process.exit(0);
	}

	const raw = parser.parseSync();
	const values = Object.fromEntries(
		Object.entries(raw).filter(([key, value]) => key in cliSchema.shape && value !== undefined),
	) as Partial<CliArgs>;

	if (values.langsmith === true) {
		const backendWasExplicit = wasFlagProvided(argv, '--backend');
		if (backendWasExplicit && values.backend !== 'langsmith') {
			throw new Error('Cannot combine `--langsmith` with `--backend local`');
		}
		values.backend = 'langsmith';
	}

	const parsed = cliSchema.parse(values);

	const featureFlags = parseFeatureFlags({
		templateExamples: parsed.templateExamples,
		multiAgent: parsed.multiAgent,
	});

	const filters = parseFilters({
		filter: parsed.filter,
		notionId: parsed.notionId,
		technique: parsed.technique,
	});

	if (parsed.suite !== 'pairwise' && (filters?.doSearch || filters?.dontSearch)) {
		throw new Error(
			'`--filter do:` and `--filter dont:` are only supported for `--suite pairwise`',
		);
	}

	return {
		suite: parsed.suite,
		backend: parsed.backend,
		verbose: parsed.verbose,
		repetitions: parsed.repetitions,
		concurrency: parsed.concurrency,
		timeoutMs: parsed.timeoutMs,
		experimentName: parsed.experimentName,
		outputDir: parsed.outputDir,
		datasetName: parsed.datasetName,
		maxExamples: parsed.maxExamples,
		filters,
		testCase: parsed.testCase,
		promptsCsv: parsed.promptsCsv,
		prompt: parsed.prompt,
		dos: parsed.dos,
		donts: parsed.donts,
		numJudges: parsed.numJudges,
		numGenerations: parsed.numGenerations,
		featureFlags,
	};
}

export function getDefaultExperimentName(suite: EvaluationSuite): string {
	return suite === 'pairwise' ? DEFAULTS.EXPERIMENT_NAME : DEFAULTS.LLM_JUDGE_EXPERIMENT_NAME;
}

export function getDefaultDatasetName(suite: EvaluationSuite): string {
	if (suite === 'pairwise') return DEFAULTS.DATASET_NAME;
	return process.env.LANGSMITH_DATASET_NAME ?? 'workflow-builder-canvas-prompts';
}
