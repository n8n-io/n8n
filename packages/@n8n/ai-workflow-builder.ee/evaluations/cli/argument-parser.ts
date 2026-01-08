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

type CliValueKind = 'boolean' | 'string';

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

type CliKey = keyof z.infer<typeof cliSchema>;

type FlagDef = { key: CliKey; kind: CliValueKind };

const FLAG_TO_KEY: Record<string, FlagDef> = {
	'--suite': { key: 'suite', kind: 'string' },
	'--mode': { key: 'suite', kind: 'string' }, // alias
	'--backend': { key: 'backend', kind: 'string' },
	'--langsmith': { key: 'langsmith', kind: 'boolean' }, // alias for --backend langsmith

	'--verbose': { key: 'verbose', kind: 'boolean' },
	'-v': { key: 'verbose', kind: 'boolean' },
	'--repetitions': { key: 'repetitions', kind: 'string' },
	'--concurrency': { key: 'concurrency', kind: 'string' },
	'--timeout-ms': { key: 'timeoutMs', kind: 'string' },
	'--name': { key: 'experimentName', kind: 'string' },
	'--output-dir': { key: 'outputDir', kind: 'string' },
	'--dataset': { key: 'datasetName', kind: 'string' },
	'--max-examples': { key: 'maxExamples', kind: 'string' },

	'--filter': { key: 'filter', kind: 'string' },
	'--notion-id': { key: 'notionId', kind: 'string' },
	'--technique': { key: 'technique', kind: 'string' },

	'--test-case': { key: 'testCase', kind: 'string' },
	'--prompts-csv': { key: 'promptsCsv', kind: 'string' },

	'--prompt': { key: 'prompt', kind: 'string' },
	'--dos': { key: 'dos', kind: 'string' },
	'--donts': { key: 'donts', kind: 'string' },

	'--judges': { key: 'numJudges', kind: 'string' },
	'--generations': { key: 'numGenerations', kind: 'string' },

	'--template-examples': { key: 'templateExamples', kind: 'boolean' },
	'--multi-agent': { key: 'multiAgent', kind: 'boolean' },
};

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

function splitFlagToken(token: string): { flag: string; inlineValue?: string } {
	if (!token.startsWith('--')) return { flag: token };
	const equalsIndex = token.indexOf('=');
	if (equalsIndex === -1) return { flag: token };
	return { flag: token.slice(0, equalsIndex), inlineValue: token.slice(equalsIndex + 1) };
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((v): v is string => typeof v === 'string');
}

function parseCli(argv: string[]): {
	values: Partial<Record<CliKey, unknown>>;
	seenKeys: Set<CliKey>;
} {
	const values: Partial<Record<CliKey, unknown>> = {};
	const seenKeys = new Set<CliKey>();

	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (!token.startsWith('-')) continue;

		const { flag, inlineValue } = splitFlagToken(token);
		const def = FLAG_TO_KEY[flag];

		if (!def) {
			throw new Error(`Unknown flag: ${flag}\n\nValid flags:\n  ${formatValidFlags()}`);
		}

		seenKeys.add(def.key);

		if (def.kind === 'boolean') {
			values[def.key] = true;
			continue;
		}

		const value = inlineValue ?? ensureValue(argv, i, flag);
		if (inlineValue === undefined) i++;

		if (def.key === 'filter') {
			const existing = values.filter;
			values.filter = isStringArray(existing) ? [...existing, value] : [value];
			continue;
		}

		values[def.key] = value;
	}

	return { values, seenKeys };
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
