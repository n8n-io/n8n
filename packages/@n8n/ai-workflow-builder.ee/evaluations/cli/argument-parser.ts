/* eslint-disable @typescript-eslint/naming-convention */
import { z } from 'zod';

import { AVAILABLE_MODELS, DEFAULT_MODEL, type ModelId } from '@/llm-config';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import type { LangsmithExampleFilters } from '../harness/harness-types';
import { DEFAULTS } from '../support/constants';
import type { StageModels } from '../support/environment.js';

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

	featureFlags?: BuilderFeatureFlags;

	/** URL to POST evaluation results to when complete */
	webhookUrl?: string;
	/** Secret for HMAC-SHA256 signature of webhook payload */
	webhookSecret?: string;

	// Model configuration
	/** Default model for all stages */
	model: ModelId;
	/** Model for LLM judge evaluation */
	judgeModel?: ModelId;
	/** Model for supervisor stage */
	supervisorModel?: ModelId;
	/** Model for responder stage */
	responderModel?: ModelId;
	/** Model for discovery stage */
	discoveryModel?: ModelId;
	/** Model for builder stage */
	builderModel?: ModelId;
	/** Model for configurator stage */
	configuratorModel?: ModelId;
	/** Model for parameter updater (within configurator) */
	parameterUpdaterModel?: ModelId;
}

type CliValueKind = 'boolean' | 'string';
type FlagGroup =
	| 'input'
	| 'eval'
	| 'pairwise'
	| 'langsmith'
	| 'output'
	| 'feature'
	| 'model'
	| 'advanced';

// Model ID validation schema
const modelIdSchema = z.enum(AVAILABLE_MODELS as [ModelId, ...ModelId[]]);

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

		langsmith: z.boolean().optional(),
		templateExamples: z.boolean().default(false),
		webhookUrl: z.string().url().optional(),
		webhookSecret: z.string().min(16).optional(),

		// Model configuration
		model: modelIdSchema.default(DEFAULT_MODEL),
		judgeModel: modelIdSchema.optional(),
		supervisorModel: modelIdSchema.optional(),
		responderModel: modelIdSchema.optional(),
		discoveryModel: modelIdSchema.optional(),
		builderModel: modelIdSchema.optional(),
		configuratorModel: modelIdSchema.optional(),
		parameterUpdaterModel: modelIdSchema.optional(),
	})
	.strict();

type CliKey = keyof z.infer<typeof cliSchema>;

type FlagDef = { key: CliKey; kind: CliValueKind; desc: string; group: FlagGroup };

const FLAG_DEFS: Record<string, FlagDef> = {
	// Input sources
	'--prompt': { key: 'prompt', kind: 'string', group: 'input', desc: 'Single prompt to evaluate' },
	'--prompts-csv': {
		key: 'promptsCsv',
		kind: 'string',
		group: 'input',
		desc: 'CSV file with prompts',
	},
	'--test-case': {
		key: 'testCase',
		kind: 'string',
		group: 'input',
		desc: 'Run specific default test case by ID',
	},
	'--dataset': {
		key: 'datasetName',
		kind: 'string',
		group: 'input',
		desc: 'LangSmith dataset name',
	},

	// Evaluation options
	'--suite': {
		key: 'suite',
		kind: 'string',
		group: 'eval',
		desc: 'Evaluation suite (llm-judge|pairwise|programmatic|similarity)',
	},
	'--backend': { key: 'backend', kind: 'string', group: 'eval', desc: 'Backend (local|langsmith)' },
	'--max-examples': {
		key: 'maxExamples',
		kind: 'string',
		group: 'eval',
		desc: 'Limit number of examples',
	},
	'--repetitions': {
		key: 'repetitions',
		kind: 'string',
		group: 'eval',
		desc: 'Repeat each example N times',
	},
	'--concurrency': {
		key: 'concurrency',
		kind: 'string',
		group: 'eval',
		desc: 'Max parallel evaluations',
	},
	'--timeout-ms': {
		key: 'timeoutMs',
		kind: 'string',
		group: 'eval',
		desc: 'Timeout per evaluation (ms)',
	},

	// Pairwise options
	'--dos': {
		key: 'dos',
		kind: 'string',
		group: 'pairwise',
		desc: 'Requirements the workflow must satisfy',
	},
	'--donts': {
		key: 'donts',
		kind: 'string',
		group: 'pairwise',
		desc: 'Things the workflow must avoid',
	},

	// LangSmith options
	'--langsmith': {
		key: 'langsmith',
		kind: 'boolean',
		group: 'langsmith',
		desc: 'Shorthand for --backend langsmith',
	},
	'--name': { key: 'experimentName', kind: 'string', group: 'langsmith', desc: 'Experiment name' },
	'--filter': {
		key: 'filter',
		kind: 'string',
		group: 'langsmith',
		desc: 'Filter examples (key:value, repeatable)',
	},
	'--notion-id': {
		key: 'notionId',
		kind: 'string',
		group: 'langsmith',
		desc: 'Filter by Notion ID',
	},
	'--technique': {
		key: 'technique',
		kind: 'string',
		group: 'langsmith',
		desc: 'Filter by technique',
	},

	// Output
	'--output-dir': {
		key: 'outputDir',
		kind: 'string',
		group: 'output',
		desc: 'Directory for artifacts',
	},
	'--verbose': { key: 'verbose', kind: 'boolean', group: 'output', desc: 'Verbose logging' },
	'--webhook-url': {
		key: 'webhookUrl',
		kind: 'string',
		group: 'output',
		desc: 'URL to POST results to when complete',
	},
	'--webhook-secret': {
		key: 'webhookSecret',
		kind: 'string',
		group: 'output',
		desc: 'Secret for HMAC-SHA256 signature (min 16 chars)',
	},

	// Feature flags
	'--template-examples': {
		key: 'templateExamples',
		kind: 'boolean',
		group: 'feature',
		desc: 'Enable template examples phase',
	},

	// Model configuration
	'--model': {
		key: 'model',
		kind: 'string',
		group: 'model',
		desc: `Default model for all stages (default: ${DEFAULT_MODEL})`,
	},
	'--judge-model': {
		key: 'judgeModel',
		kind: 'string',
		group: 'model',
		desc: 'Model for LLM judge evaluation',
	},
	'--supervisor-model': {
		key: 'supervisorModel',
		kind: 'string',
		group: 'model',
		desc: 'Model for supervisor stage',
	},
	'--responder-model': {
		key: 'responderModel',
		kind: 'string',
		group: 'model',
		desc: 'Model for responder stage',
	},
	'--discovery-model': {
		key: 'discoveryModel',
		kind: 'string',
		group: 'model',
		desc: 'Model for discovery stage',
	},
	'--builder-model': {
		key: 'builderModel',
		kind: 'string',
		group: 'model',
		desc: 'Model for builder stage',
	},
	'--configurator-model': {
		key: 'configuratorModel',
		kind: 'string',
		group: 'model',
		desc: 'Model for configurator stage',
	},
	'--parameter-updater-model': {
		key: 'parameterUpdaterModel',
		kind: 'string',
		group: 'model',
		desc: 'Model for parameter updater',
	},

	// Advanced
	'--judges': { key: 'numJudges', kind: 'string', group: 'advanced', desc: 'Number of LLM judges' },
};

// Aliases (not shown in help)
const FLAG_ALIASES: Record<string, string> = {
	'--mode': '--suite',
	'-v': '--verbose',
};

// Combined lookup for parsing
const FLAG_TO_KEY: Record<string, FlagDef> = {
	...FLAG_DEFS,
	...Object.fromEntries(
		Object.entries(FLAG_ALIASES).map(([alias, target]) => [alias, FLAG_DEFS[target]]),
	),
};

function formatValidFlags(): string {
	return Object.keys(FLAG_TO_KEY)
		.filter((f) => f.startsWith('--'))
		.sort()
		.join('\n  ');
}

const GROUP_TITLES: Record<FlagGroup, string> = {
	input: 'Input Sources',
	eval: 'Evaluation Options',
	pairwise: 'Pairwise Options',
	langsmith: 'LangSmith Options',
	output: 'Output',
	feature: 'Feature Flags',
	model: 'Model Configuration',
	advanced: 'Advanced',
};

function formatHelp(): string {
	const lines: string[] = [
		'Usage: pnpm eval [options]',
		'',
		'Evaluation harness for AI Workflow Builder.',
		'',
	];

	const groups: FlagGroup[] = [
		'input',
		'eval',
		'pairwise',
		'langsmith',
		'output',
		'feature',
		'model',
		'advanced',
	];

	for (const group of groups) {
		const flags = Object.entries(FLAG_DEFS).filter(([, def]) => def.group === group);
		if (flags.length === 0) continue;

		lines.push(`${GROUP_TITLES[group]}:`);
		for (const [flag, def] of flags) {
			const valueHint = def.kind === 'string' ? ' <value>' : '';
			const padded = `  ${flag}${valueHint}`.padEnd(28);
			lines.push(`${padded}${def.desc}`);
		}
		lines.push('');
	}

	lines.push('Examples:');
	lines.push('  pnpm eval --verbose');
	lines.push('  pnpm eval --prompt "Create a Slack notification workflow"');
	lines.push('  pnpm eval --prompts-csv my-prompts.csv --max-examples 5');
	lines.push('  pnpm eval:langsmith --dataset "workflow-builder-canvas-prompts" --name "test-run"');

	return lines.join('\n');
}

export function printHelp(): void {
	console.log(formatHelp());
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

function parseFeatureFlags(args: {
	templateExamples: boolean;
}): BuilderFeatureFlags | undefined {
	const templateExamplesFromEnv = process.env.EVAL_FEATURE_TEMPLATE_EXAMPLES === 'true';
	const templateExamples = templateExamplesFromEnv || args.templateExamples;

	if (!templateExamples) return undefined;

	return {
		templateExamples: templateExamples || undefined,
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
	// Check for help flag before parsing
	if (argv.includes('--help') || argv.includes('-h')) {
		printHelp();
		process.exit(0);
	}

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
		featureFlags,
		webhookUrl: parsed.webhookUrl,
		webhookSecret: parsed.webhookSecret,
		// Model configuration
		model: parsed.model,
		judgeModel: parsed.judgeModel,
		supervisorModel: parsed.supervisorModel,
		responderModel: parsed.responderModel,
		discoveryModel: parsed.discoveryModel,
		builderModel: parsed.builderModel,
		configuratorModel: parsed.configuratorModel,
		parameterUpdaterModel: parsed.parameterUpdaterModel,
	};
}

/**
 * Converts EvaluationArgs to StageModels for use with environment setup.
 */
export function argsToStageModels(args: EvaluationArgs): StageModels {
	return {
		default: args.model,
		supervisor: args.supervisorModel,
		responder: args.responderModel,
		discovery: args.discoveryModel,
		builder: args.builderModel,
		configurator: args.configuratorModel,
		parameterUpdater: args.parameterUpdaterModel,
		judge: args.judgeModel,
	};
}

export function getDefaultExperimentName(suite: EvaluationSuite): string {
	return suite === 'pairwise' ? DEFAULTS.EXPERIMENT_NAME : DEFAULTS.LLM_JUDGE_EXPERIMENT_NAME;
}

export function getDefaultDatasetName(suite: EvaluationSuite): string {
	if (suite === 'pairwise') return DEFAULTS.DATASET_NAME;
	return process.env.LANGSMITH_DATASET_NAME ?? 'workflow-builder-canvas-prompts';
}
