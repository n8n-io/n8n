// ---------------------------------------------------------------------------
// Arguments of the discovery CLI (cli.ts). Kept apart from the CLI so tests
// can parse arguments without starting a run. Invalid arguments throw.
// ---------------------------------------------------------------------------

import { resolve } from 'node:path';

export interface SkillOverride {
	skillId: string;
	/** Absolute path of the replacement SKILL.md. */
	path: string;
}

/** Parses one `--skill-file` value: `<skillId>=<path>`. */
export function parseSkillOverride(raw: string): SkillOverride {
	const separator = raw.indexOf('=');
	const skillId = separator === -1 ? '' : raw.slice(0, separator).trim();
	const path = separator === -1 ? '' : raw.slice(separator + 1).trim();
	if (!skillId || !path) {
		throw new Error(`--skill-file expects <skillId>=<path>, got "${raw}"`);
	}
	return { skillId, path: resolve(path) };
}

export interface CliArgs {
	help: boolean;
	filter?: string;
	verbose: boolean;
	trials: number;
	passThreshold: number;
	timeoutMs: number;
	/** Optional iteration cap; unset uses the SDK default. */
	maxSteps?: number;
	modelId: string;
	/** Trials of one case that run at once. */
	concurrency: number;
	/** Cases that run at once. */
	scenarioConcurrency: number;
	nodesJsonPath?: string;
	failOnZeroPass: boolean;
	/** Routing mode: load routing cases (or LangTracer export bodies) from this directory. */
	casesDir?: string;
	stopOnRoute: boolean;
	jsonOut?: string;
	/** Routing mode: grade inline and write `eval-results.json` and friends here. */
	outputDir?: string;
	/** Routing mode with `--output-dir`: where the judge caches its verdicts. */
	judgeCacheDir?: string;
	variant: string;
	validateOnly: boolean;
	/** Routing mode: where the cases come from. Unset means the discovery scenarios. */
	source?: 'local' | 'langtracer';
	suite?: string;
	/** Routing mode: drop cases whose id contains any comma-separated token. */
	exclude?: string;
	/** Routing mode: drop cases whose id starts with any comma-separated prefix. */
	excludePrefix?: string;
	/** Routing mode with `--validate-only`: compare the loaded cases with this directory. */
	compareDir?: string;
	/** Routing mode: write the loaded cases here, one `<id>.json` each, for the grader. */
	saveCasesDir?: string;
	/** Replacement SKILL.md files for the orchestrator's runtime skills. */
	skillFiles: SkillOverride[];
}

export const DEFAULT_MODEL =
	process.env.N8N_INSTANCE_AI_EVAL_MODEL ?? 'anthropic/claude-sonnet-4-6';

export const USAGE = `Usage: pnpm eval:discovery [options]

Discovery mode (default): runs evaluations/data/discovery/ and reports pass rates.
Routing mode: runs routing cases and records (or grades) the route of each trial.

Common options:
  --filter <text>              Cases whose id contains the text (comma-separated tokens).
                               A single token that is exactly an id or file name
                               selects only that case.
  --trials, --iterations <n>   Trials per case (default 3).
  --timeout, --timeout-ms <ms> Per-trial timeout (default 60000).
  --model <provider/model>     Orchestrator model (default ${DEFAULT_MODEL}).
  --concurrency <n>            Trials of one case that run at once (default 3).
  --scenario-concurrency <n>   Cases that run at once (default 1).
  --max-steps <n>              Iteration cap for the orchestrator.
  --nodes-json <file>          Node catalog for the stub services.
  --skill-file <id>=<path>     Use this SKILL.md for runtime skill <id> (repeatable).
  --json-out <file>            Write the routing results JSON (both modes).
  --verbose, -v                Print every trial's calls.

Discovery mode only:
  --pass-threshold <0..1>      Scenario pass threshold (default 0.67).
  --fail-on-zero-pass          Exit non-zero only for scenarios with no passing trial.

Routing mode (needs --cases-dir, or --source langtracer --suite):
  --cases-dir <dir>            Routing case files (route-*.json) or LangTracer
                               suite-export bodies (any *.json with a "routing" tag).
  --source langtracer          Pull the cases from LangTracer instead.
  --suite <slug|id>            The LangTracer suite for --source langtracer.
  --stop-on-route              End each trial at its first committing call.
  --output-dir <dir>           Grade inline and write eval-results.json (LangTracer
                               dispatcher contract), routing-results.json, and
                               routing-summary.md.
  --judge-cache-dir <dir>      Judge verdict cache for --output-dir.
  --variant <label>            Label written into the results (default baseline).
  --exclude <text>             Drop cases whose id contains the text.
  --exclude-prefix <prefix>    Drop cases whose id starts with the prefix.
  --validate-only              Validate the cases and exit.
  --compare-dir <dir>          With --validate-only: compare with the cases in <dir>.
  --save-cases-dir <dir>       Write the loaded cases as <id>.json files.
`;

/** Flags that only routing mode reads. */
const ROUTING_ONLY_FLAGS: Array<[keyof CliArgs, string]> = [
	['stopOnRoute', '--stop-on-route'],
	['outputDir', '--output-dir'],
	['judgeCacheDir', '--judge-cache-dir'],
	['validateOnly', '--validate-only'],
	['exclude', '--exclude'],
	['excludePrefix', '--exclude-prefix'],
	['compareDir', '--compare-dir'],
	['saveCasesDir', '--save-cases-dir'],
	['suite', '--suite'],
];

function positiveInt(raw: string | undefined, flag: string): number {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
		throw new Error(`Invalid value for ${flag}: ${String(raw)} (expected a positive integer)`);
	}
	return n;
}

function numberInRange(raw: string | undefined, flag: string, lo: number, hi: number): number {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < lo || n > hi) {
		throw new Error(
			`Invalid value for ${flag}: ${String(raw)} (expected number in [${lo}, ${hi}])`,
		);
	}
	return n;
}

function value(raw: string | undefined, flag: string): string {
	if (!raw || raw.startsWith('--')) throw new Error(`Missing value for ${flag}`);
	return raw;
}

export function isRoutingMode(args: CliArgs): boolean {
	return args.casesDir !== undefined || args.source !== undefined;
}

function validate(args: CliArgs): void {
	if (args.source === 'langtracer') {
		if (!args.suite) throw new Error('--source langtracer needs --suite <slug|id>.');
		if (args.casesDir) throw new Error('Use either --cases-dir or --source langtracer, not both.');
	}
	if (args.source === 'local' && !args.casesDir) {
		throw new Error('--source local needs --cases-dir <dir>.');
	}
	if (!isRoutingMode(args)) {
		const given = ROUTING_ONLY_FLAGS.filter(([key]) => {
			const setting = args[key];
			return setting !== undefined && setting !== false;
		}).map(([, flag]) => flag);
		if (given.length > 0) {
			const verb = given.length === 1 ? 'works' : 'work';
			throw new Error(
				`${given.join(', ')} ${verb} only in routing mode: pass --cases-dir <dir>, or --source langtracer --suite <slug|id>.`,
			);
		}
	}
	if (args.compareDir && !args.validateOnly) {
		throw new Error('--compare-dir works only with --validate-only.');
	}
	if (args.judgeCacheDir && !args.outputDir) {
		throw new Error('--judge-cache-dir works only with --output-dir.');
	}
}

export function parseCliArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		help: false,
		verbose: false,
		trials: 3,
		passThreshold: 2 / 3,
		timeoutMs: 60_000,
		modelId: DEFAULT_MODEL,
		concurrency: 3,
		scenarioConcurrency: 1,
		failOnZeroPass: false,
		stopOnRoute: false,
		variant: 'baseline',
		validateOnly: false,
		skillFiles: [],
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--help':
			case '-h':
				args.help = true;
				return args;
			case '--verbose':
			case '-v':
				args.verbose = true;
				break;
			case '--filter':
				args.filter = value(argv[++i], arg);
				break;
			case '--trials':
			case '--iterations':
				args.trials = positiveInt(argv[++i], arg);
				break;
			case '--pass-threshold':
				args.passThreshold = numberInRange(argv[++i], arg, 0, 1);
				break;
			case '--timeout':
			case '--timeout-ms':
				args.timeoutMs = positiveInt(argv[++i], arg);
				break;
			case '--max-steps':
				args.maxSteps = positiveInt(argv[++i], arg);
				break;
			case '--model':
				args.modelId = value(argv[++i], arg);
				break;
			case '--concurrency':
				args.concurrency = positiveInt(argv[++i], arg);
				break;
			case '--scenario-concurrency':
				args.scenarioConcurrency = positiveInt(argv[++i], arg);
				break;
			case '--nodes-json':
				args.nodesJsonPath = value(argv[++i], arg);
				break;
			case '--fail-on-zero-pass':
				args.failOnZeroPass = true;
				break;
			case '--cases-dir':
				args.casesDir = value(argv[++i], arg);
				break;
			case '--stop-on-route':
				args.stopOnRoute = true;
				break;
			case '--json-out':
				args.jsonOut = value(argv[++i], arg);
				break;
			case '--output-dir':
				args.outputDir = value(argv[++i], arg);
				break;
			case '--judge-cache-dir':
				args.judgeCacheDir = value(argv[++i], arg);
				break;
			case '--variant':
				args.variant = value(argv[++i], arg);
				break;
			case '--validate-only':
				args.validateOnly = true;
				break;
			case '--source': {
				const source = value(argv[++i], arg);
				if (source !== 'local' && source !== 'langtracer') {
					throw new Error(`Invalid value for --source: ${source} (expected local or langtracer)`);
				}
				args.source = source;
				break;
			}
			case '--suite':
				args.suite = value(argv[++i], arg);
				break;
			case '--exclude':
				args.exclude = value(argv[++i], arg);
				break;
			case '--exclude-prefix':
				args.excludePrefix = value(argv[++i], arg);
				break;
			case '--compare-dir':
				args.compareDir = value(argv[++i], arg);
				break;
			case '--save-cases-dir':
				args.saveCasesDir = value(argv[++i], arg);
				break;
			case '--skill-file':
				args.skillFiles.push(parseSkillOverride(value(argv[++i], arg)));
				break;
			default:
				// A misspelled flag would otherwise run with a default silently.
				throw new Error(`Unknown argument: ${arg}. Run with --help for the options.`);
		}
	}

	validate(args);
	return args;
}
