import { z } from 'zod';

import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent.js';
import { DEFAULTS } from '../constants';

export type EvaluationSuite = 'llm-judge' | 'pairwise' | 'programmatic' | 'similarity';
export type EvaluationBackend = 'local' | 'langsmith';

export interface EvaluationArgs {
	suite: EvaluationSuite;
	backend: EvaluationBackend;

	verbose: boolean;
	repetitions: number;
	concurrency: number;
	experimentName?: string;
	outputDir?: string;
	datasetName?: string;
	maxExamples?: number;

	testCase?: string;
	promptsCsv?: string;

	prompt?: string;
	dos?: string;
	donts?: string;

	numJudges: number;
	numGenerations: number;

	featureFlags?: BuilderFeatureFlags;
}

type CliValueKind = 'boolean' | 'string';

const FLAG_TO_KEY = {
	'--suite': { key: 'suite', kind: 'string' },
	'--mode': { key: 'suite', kind: 'string' }, // alias
	'--backend': { key: 'backend', kind: 'string' },
	'--langsmith': { key: 'langsmith', kind: 'boolean' }, // alias for --backend langsmith

	'--verbose': { key: 'verbose', kind: 'boolean' },
	'-v': { key: 'verbose', kind: 'boolean' },
	'--repetitions': { key: 'repetitions', kind: 'string' },
	'--concurrency': { key: 'concurrency', kind: 'string' },
	'--name': { key: 'experimentName', kind: 'string' },
	'--output-dir': { key: 'outputDir', kind: 'string' },
	'--dataset': { key: 'datasetName', kind: 'string' },
	'--max-examples': { key: 'maxExamples', kind: 'string' },

	'--test-case': { key: 'testCase', kind: 'string' },
	'--prompts-csv': { key: 'promptsCsv', kind: 'string' },

	'--prompt': { key: 'prompt', kind: 'string' },
	'--dos': { key: 'dos', kind: 'string' },
	'--donts': { key: 'donts', kind: 'string' },

	'--judges': { key: 'numJudges', kind: 'string' },
	'--generations': { key: 'numGenerations', kind: 'string' },

	'--template-examples': { key: 'templateExamples', kind: 'boolean' },
	'--multi-agent': { key: 'multiAgent', kind: 'boolean' },
} as const satisfies Record<string, { key: string; kind: CliValueKind }>;

type CliKey = (typeof FLAG_TO_KEY)[keyof typeof FLAG_TO_KEY]['key'];

const cliSchema = z
	.object({
		suite: z.enum(['llm-judge', 'pairwise', 'programmatic', 'similarity']).default('llm-judge'),
		backend: z.enum(['local', 'langsmith']).default('local'),

		verbose: z.boolean().default(false),
		repetitions: z.coerce.number().int().positive().default(DEFAULTS.REPETITIONS),
		concurrency: z.coerce.number().int().positive().default(DEFAULTS.CONCURRENCY),
		experimentName: z.string().min(1).optional(),
		outputDir: z.string().min(1).optional(),
		datasetName: z.string().min(1).optional(),
		maxExamples: z.coerce.number().int().positive().optional(),

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

function formatValidFlags(): string {
	return Object.keys(FLAG_TO_KEY)
		.filter((f) => f.startsWith('--'))
		.sort()
		.join('\n  ');
}

function ensureValue(argv: string[], i: number, flag: string): string {
	const value = argv[i + 1];
	if (value === undefined) throw new Error(`Flag ${flag} requires a value`);
	return value;
}

function parseCli(argv: string[]): { values: Record<CliKey, unknown>; seenKeys: Set<CliKey> } {
	const values: Record<string, unknown> = {};
	const seenKeys = new Set<CliKey>();

	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (!token.startsWith('-')) continue;

		const [flag, inlineValue] = token.startsWith('--') ? token.split(/=(.*)/s) : [token, undefined];
		const def = FLAG_TO_KEY[flag as keyof typeof FLAG_TO_KEY];

		if (!def) {
			throw new Error(`Unknown flag: ${flag}\n\nValid flags:\n  ${formatValidFlags()}`);
		}

		const key = def.key;
		seenKeys.add(key);

		if (def.kind === 'boolean') {
			values[key] = true;
			continue;
		}

		const value = inlineValue ?? ensureValue(argv, i, flag);
		if (inlineValue === undefined) i++;
		values[key] = value;
	}

	return { values: values as Record<CliKey, unknown>, seenKeys };
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

export function parseEvaluationArgs(argv: string[] = process.argv.slice(2)): EvaluationArgs {
	const { values, seenKeys } = parseCli(argv);

	if (values.langsmith === true) {
		const backendWasExplicit = seenKeys.has('backend');
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

	return {
		suite: parsed.suite,
		backend: parsed.backend,
		verbose: parsed.verbose,
		repetitions: parsed.repetitions,
		concurrency: parsed.concurrency,
		experimentName: parsed.experimentName,
		outputDir: parsed.outputDir,
		datasetName: parsed.datasetName,
		maxExamples: parsed.maxExamples,
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
