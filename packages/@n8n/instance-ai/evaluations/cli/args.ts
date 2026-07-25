// ---------------------------------------------------------------------------
// CLI argument parser for the instance-ai workflow evaluator
//
// Uses manual parsing (no external CLI lib) to keep dependencies minimal.
// Validates and normalizes arguments into a typed CliArgs interface.
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { DEFAULT_MCP_BUILD_TIMEOUT_MS } from './mcp-builder';
import { BASELINE_EXPERIMENT_PREFIX } from '../comparison/fetch-baseline';

/** Default LangSmith dataset — the shared Instance AI cohort. */
export const DEFAULT_DATASET = 'instance-ai-workflow-evals';

/** Default Anthropic model for `claude -p` MCP builds when ANTHROPIC_MODEL is unset. */
export const DEFAULT_MCP_BUILD_MODEL = 'claude-opus-4-8';

/** Resolve the MCP build model from the environment. `claude` natively reads
 *  ANTHROPIC_MODEL, so operators/CI set that env var (matching how the AI
 *  Assistant itself is configured) instead of a CLI flag. We still pin a
 *  default when it's unset so builds never float with claude-code's bundled
 *  default, and the resolved value is passed explicitly to `claude --model`
 *  and recorded as `build_model` experiment metadata. */
function resolveBuildModel(env: NodeJS.ProcessEnv = process.env): string {
	// Blank counts as unset: CI passes ANTHROPIC_MODEL through from an optional
	// workflow input, so an empty value must still pin the default.
	const fromEnv = env.ANTHROPIC_MODEL?.trim() ?? '';
	return fromEnv === '' ? DEFAULT_MCP_BUILD_MODEL : fromEnv;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CliArgs {
	/** TimeoutMs is defined per iteration, not as the total timeout for all iterations */
	timeoutMs: number;
	/** One or more n8n base URLs. Multi-lane runs use a work-stealing allocator
	 *  that dispatches each build to a lane that isn't already running its
	 *  prompt, capped per-lane at MAX_CONCURRENT_BUILDS=4. Pass comma-separated
	 *  to `--base-url`. */
	baseUrls: string[];
	email?: string;
	password?: string;
	verbose: boolean;
	/** Filter workflow test cases by filename substring(s). Accepts a comma-separated
	 *  list with OR semantics, e.g. "contact-form,deduplication". */
	filter?: string;
	/** Exclude workflow test cases whose filename matches any of the substring(s).
	 *  Same comma-separated shape as --filter; applied after --filter. */
	exclude?: string;
	/** Path to a JSON manifest mapping test-case file slugs to one or more
	 *  pre-built workflow IDs. When set, the harness skips the orchestrator
	 *  build for matched test cases and verifies the existing workflow instead.
	 *  See evaluations/harness/prebuilt-workflows.ts for the schema. */
	prebuiltWorkflows?: string;
	/** Keep built workflows after evaluation instead of deleting them */
	keepWorkflows: boolean;
	/** Delete successfully used workflows from --prebuilt-workflows after evaluation */
	deletePrebuiltWorkflows: boolean;
	/** Directory to write eval-results.json (defaults to cwd) */
	outputDir?: string;
	/** LangSmith dataset name (synced from JSON test cases before each run) */
	dataset: string;
	/** True when `--source langtracer` auto-forked the dataset name off the suite
	 *  (no explicit --dataset) — cohort isolation, surfaced loudly by the driver. */
	datasetAutoForked: boolean;
	/** Max concurrent target() calls in LangSmith evaluate(). Build concurrency is
	 *  enforced separately by the LaneAllocator (cap=4 per lane). */
	concurrency: number;
	/** LangSmith experiment name prefix (auto-generated if not set) */
	experimentName?: string;
	/** Number of iterations to run each test case (default: 1). Each iteration
	 *  gets a fresh build so pass@k / pass^k capture real builder variance. */
	iterations: number;
	/** AI root nodes (Agent, Chain) to keep pinned — opt-out from the default-on
	 *  wire-server interception path. Useful for A/B comparison or when a
	 *  specific root needs to stay on the pinned baseline. CSV of node names. */
	pinAiRoots?: string[];
	/** Filter test cases by the `datasets` field (e.g. `pr`, `full`). When set,
	 *  only test cases whose `datasets` array contains this value will run, and
	 *  LangSmith examples are queried via the matching split. Defaults to
	 *  unset → run everything matched by `--filter` / `--exclude`. */
	tier?: string;
	/** Experiment-name prefix the regression comparison uses to find the
	 *  baseline. Defaults to the Instance AI baseline (`instance-ai-baseline-`).
	 *  Override for an isolated cohort (e.g. `mcp-baseline-`) so the run compares
	 *  against its own baselines instead of the Instance AI one. Pair with a
	 *  dedicated `--dataset` to keep MCP runs fully separate. */
	baselinePrefix: string;
	/** Test-case source: `disk` (default) reads data/workflows/, `langtracer` pulls a
	 *  suite over MCP (needs LANGTRACER_URL + LANGTRACER_API_KEY). */
	source: 'disk' | 'langtracer';
	/** lang-tracer suite slug (or numeric id) to export when `--source langtracer`. */
	suite?: string;
	/** Fused MCP build mode: instead of the Instance AI orchestrator, build each
	 *  workflow by driving the lane's own MCP server with `claude -p`, then verify
	 *  it on that same lane. Works across multiple `--base-url` lanes (each lane
	 *  builds + verifies its own slice). Mutually exclusive with
	 *  `--prebuilt-workflows`. See cli/mcp-builder.ts. */
	buildViaMcp: boolean;
	/** MCP server name used in the per-lane staged `claude` config + tool allowlist
	 *  (`--build-via-mcp` only). Arbitrary — the eval CLI stages the config itself. */
	mcpServerName: string;
	/** Anthropic model id passed to `claude -p` for the MCP build (`--build-via-mcp`).
	 *  Sourced from the ANTHROPIC_MODEL env var (the variable `claude` reads
	 *  natively), pinned to DEFAULT_MCP_BUILD_MODEL when unset. Distinct from the
	 *  verifier model (N8N_INSTANCE_AI_MODEL). */
	buildModel: string;
	/** Working directory for the `claude` build subprocess (`--build-via-mcp`); loads
	 *  that project's Claude config/skills. Defaults to the subprocess default. */
	buildCwd?: string;
	/** Retries per workflow when `claude` returns no WORKFLOW_ID (`--build-via-mcp`). */
	buildMaxAttempts: number;
	/** MCP_TIMEOUT (ms) passed to the `claude` build subprocess (`--build-via-mcp`);
	 *  bounds a single MCP tool call. */
	buildMcpTimeoutMs: number;
	/** Wall-clock cap (ms) for the whole `claude` build subprocess per attempt
	 *  (`--build-via-mcp`). On expiry the process is killed so a hung build can't
	 *  hold its lane. 0 disables. Distinct from `buildMcpTimeoutMs` (per MCP call). */
	buildTimeoutMs: number;
}

// ---------------------------------------------------------------------------
// Zod schema for validation
// ---------------------------------------------------------------------------

const cliArgsSchema = z.object({
	// Keep in sync with DEFAULT_TIMEOUT_MS in harness/runner.ts (and its
	// rationale for why this default must stay conservative).
	timeoutMs: z.number().int().positive().default(900_000),
	baseUrls: z.array(z.string().url()).min(1).default(['http://localhost:5678']),
	email: z.string().optional(),
	password: z.string().optional(),
	verbose: z.boolean().default(false),
	filter: z.string().optional(),
	exclude: z.string().optional(),
	prebuiltWorkflows: z.string().optional(),
	keepWorkflows: z.boolean().default(false),
	deletePrebuiltWorkflows: z.boolean().default(false),
	outputDir: z.string().optional(),
	dataset: z.string().default(DEFAULT_DATASET),
	concurrency: z.number().int().positive().default(16),
	experimentName: z.string().optional(),
	iterations: z.number().int().positive().default(1),
	pinAiRoots: z.array(z.string().min(1)).optional(),
	tier: z.string().min(1).optional(),
	// Normalize to a trailing hyphen. The baseline lookup matches by prefix and
	// LangSmith always appends `-<suffix>` to the experiment name, so the hyphen
	// anchors the match to that separator — without it `mcp-baseline` would also
	// match unrelated names like `mcp-baseline2-...`. Mirrors BASELINE_EXPERIMENT_PREFIX.
	baselinePrefix: z
		.string()
		.min(1)
		.transform((s) => (s.endsWith('-') ? s : `${s}-`))
		.default(BASELINE_EXPERIMENT_PREFIX),
	source: z.enum(['disk', 'langtracer']).default('disk'),
	suite: z.string().min(1).optional(),
	buildViaMcp: z.boolean().default(false),
	mcpServerName: z.string().min(1).default('n8n-local'),
	buildModel: z.string().min(1).default('claude-opus-4-8'),
	buildCwd: z.string().min(1).optional(),
	buildMaxAttempts: z.number().int().positive().default(3),
	buildMcpTimeoutMs: z.number().int().positive().default(120_000),
	buildTimeoutMs: z.number().int().nonnegative().default(DEFAULT_MCP_BUILD_TIMEOUT_MS),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseCliArgs(argv: string[]): CliArgs {
	const raw = parseRawArgs(argv);
	const validated = cliArgsSchema.parse(raw);
	// --build-via-mcp checks first: they give clearer guidance than the generic
	// --delete-prebuilt-workflows check below when both are combined.
	if (validated.buildViaMcp && validated.prebuiltWorkflows) {
		throw new Error(
			'--build-via-mcp is incompatible with --prebuilt-workflows. --build-via-mcp builds fresh workflows via the MCP server on each lane; --prebuilt-workflows verifies existing ones.',
		);
	}
	if (validated.buildViaMcp && validated.deletePrebuiltWorkflows) {
		throw new Error(
			'--delete-prebuilt-workflows applies to --prebuilt-workflows. --build-via-mcp already cleans up the workflows it builds unless --keep-workflows is set.',
		);
	}
	// MCP builds are LangSmith-only: the keyless direct loop parallelizes
	// iterations without the lane allocator, so its 4-per-lane build cap applies
	// PER ITERATION — concurrent `claude` sessions would scale with
	// lanes × iterations × 4 and flood the shared Anthropic budget. Fail fast
	// instead of teaching the direct loop (tech debt slated for removal) MCP builds.
	if (validated.buildViaMcp && !process.env.LANGSMITH_API_KEY) {
		throw new Error(
			'--build-via-mcp requires LangSmith experiment tracking — set LANGSMITH_API_KEY. The no-LangSmith direct loop does not support MCP builds.',
		);
	}
	// Build knobs without --build-via-mcp would parse fine and then be silently
	// ignored — the run would look like it honored them. Fail loudly instead.
	if (!validated.buildViaMcp && raw.buildOnlyFlags.length > 0) {
		throw new Error(
			`${[...new Set(raw.buildOnlyFlags)].join(', ')} only take${raw.buildOnlyFlags.length === 1 ? 's' : ''} effect with --build-via-mcp — pass it, or drop the flag(s).`,
		);
	}
	if (validated.deletePrebuiltWorkflows && !validated.prebuiltWorkflows) {
		throw new Error('--delete-prebuilt-workflows requires --prebuilt-workflows');
	}
	if (validated.deletePrebuiltWorkflows && validated.keepWorkflows) {
		throw new Error('--delete-prebuilt-workflows cannot be used with --keep-workflows');
	}
	if (validated.source === 'langtracer' && !validated.suite) {
		throw new Error('--source langtracer requires --suite <slug>');
	}

	// In langtracer mode, default the dataset + baseline to a suite-scoped, eval-tagged
	// name so runs don't pollute the shared cohort and re-runs upsert one stable dataset.
	let dataset = validated.dataset;
	let datasetAutoForked = false;
	let baselinePrefix = validated.baselinePrefix;
	if (validated.source === 'langtracer' && validated.suite) {
		const suiteSlug = validated.suite
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
		if (!raw.datasetProvided) {
			dataset = `instance-ai-langtracer-${suiteSlug}`;
			datasetAutoForked = true;
		}
		if (!raw.baselineProvided) baselinePrefix = `instance-ai-langtracer-${suiteSlug}-baseline-`;
	}

	return {
		timeoutMs: validated.timeoutMs,
		baseUrls: validated.baseUrls,
		email: validated.email,
		password: validated.password,
		verbose: validated.verbose,
		filter: validated.filter,
		exclude: validated.exclude,
		prebuiltWorkflows: validated.prebuiltWorkflows,
		keepWorkflows: validated.keepWorkflows,
		deletePrebuiltWorkflows: validated.deletePrebuiltWorkflows,
		outputDir: validated.outputDir,
		dataset,
		datasetAutoForked,
		concurrency: validated.concurrency,
		experimentName: validated.experimentName,
		iterations: validated.iterations,
		pinAiRoots: validated.pinAiRoots,
		tier: validated.tier,
		baselinePrefix,
		source: validated.source,
		suite: validated.suite,
		buildViaMcp: validated.buildViaMcp,
		mcpServerName: validated.mcpServerName,
		buildModel: validated.buildModel,
		buildCwd: validated.buildCwd,
		buildMaxAttempts: validated.buildMaxAttempts,
		buildMcpTimeoutMs: validated.buildMcpTimeoutMs,
		buildTimeoutMs: validated.buildTimeoutMs,
	};
}

/**
 * A dedicated `--dataset` and a dedicated `--baseline-prefix` are the two halves
 * of LangSmith cohort isolation (e.g. for MCP runs). Overriding exactly one of
 * them still writes to / compares against shared Instance AI data, which is
 * almost always a mistake. Returns a warning for that mismatched case, or
 * `undefined` when the pairing is consistent (both shared, or both isolated).
 *
 * Leaving BOTH at their defaults is a normal Instance AI run — including
 * `--tier pr`/`mcp` against the shared dataset, whose example upserts are
 * idempotent — so it is intentionally not flagged.
 */
export function partialIsolationWarning(
	dataset: string,
	baselinePrefix: string,
): string | undefined {
	const datasetIsolated = dataset !== DEFAULT_DATASET;
	const baselineIsolated = baselinePrefix !== BASELINE_EXPERIMENT_PREFIX;
	if (datasetIsolated === baselineIsolated) return undefined;
	return (
		`Partial LangSmith isolation: --dataset="${dataset}" with --baseline-prefix="${baselinePrefix}". ` +
		'Override BOTH for an isolated cohort (e.g. MCP), or leave BOTH at their defaults for an ' +
		'Instance AI run — overriding only one still touches shared Instance AI data.'
	);
}

// ---------------------------------------------------------------------------
// Raw argument parsing
// ---------------------------------------------------------------------------

interface RawArgs {
	timeoutMs: number;
	baseUrls: string[];
	email?: string;
	password?: string;
	verbose: boolean;
	filter?: string;
	exclude?: string;
	prebuiltWorkflows?: string;
	keepWorkflows: boolean;
	deletePrebuiltWorkflows: boolean;
	outputDir?: string;
	dataset: string;
	concurrency: number;
	experimentName?: string;
	iterations: number;
	pinAiRoots?: string[];
	tier?: string;
	baselinePrefix: string;
	source: string;
	suite?: string;
	buildViaMcp: boolean;
	mcpServerName: string;
	buildModel: string;
	buildCwd?: string;
	buildMaxAttempts: number;
	buildMcpTimeoutMs: number;
	buildTimeoutMs: number;
	/** Whether --dataset / --baseline-prefix were explicitly passed (langtracer mode
	 *  derives suite-scoped defaults otherwise). */
	datasetProvided: boolean;
	baselineProvided: boolean;
	/** Build-only flags the caller passed. Only meaningful with --build-via-mcp;
	 *  parseCliArgs rejects them otherwise so they can't be silently ignored. */
	buildOnlyFlags: string[];
}

function parseRawArgs(argv: string[]): RawArgs {
	const result: RawArgs = {
		timeoutMs: 900_000,
		baseUrls: ['http://localhost:5678'],
		verbose: false,
		keepWorkflows: false,
		deletePrebuiltWorkflows: false,
		outputDir: undefined,
		dataset: DEFAULT_DATASET,
		concurrency: 16,
		experimentName: undefined,
		iterations: 1,
		pinAiRoots: undefined,
		baselinePrefix: BASELINE_EXPERIMENT_PREFIX,
		source: 'disk',
		buildViaMcp: false,
		mcpServerName: 'n8n-local',
		buildModel: resolveBuildModel(),
		buildMaxAttempts: 3,
		buildMcpTimeoutMs: 120_000,
		buildTimeoutMs: DEFAULT_MCP_BUILD_TIMEOUT_MS,
		datasetProvided: false,
		baselineProvided: false,
		buildOnlyFlags: [],
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		switch (arg) {
			case '--timeout-ms':
				result.timeoutMs = parseIntArg(argv, i, '--timeout-ms');
				i++;
				break;

			case '--base-url': {
				const raw = nextArg(argv, i, '--base-url');
				result.baseUrls = raw
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
				i++;
				break;
			}

			case '--email':
				result.email = nextArg(argv, i, '--email');
				i++;
				break;

			case '--password':
				result.password = nextArg(argv, i, '--password');
				i++;
				break;

			case '--verbose':
				result.verbose = true;
				break;

			case '--filter':
				result.filter = nextArg(argv, i, '--filter');
				i++;
				break;

			case '--exclude':
				result.exclude = nextArg(argv, i, '--exclude');
				i++;
				break;

			case '--prebuilt-workflows':
				result.prebuiltWorkflows = nextArg(argv, i, '--prebuilt-workflows');
				i++;
				break;

			case '--keep-workflows':
				result.keepWorkflows = true;
				break;

			case '--delete-prebuilt-workflows':
				result.deletePrebuiltWorkflows = true;
				break;

			case '--output-dir':
				result.outputDir = nextArg(argv, i, '--output-dir');
				i++;
				break;

			case '--iterations':
				result.iterations = parseIntArg(argv, i, '--iterations');
				i++;
				break;

			case '--dataset':
				result.dataset = nextArg(argv, i, '--dataset');
				result.datasetProvided = true;
				i++;
				break;

			case '--concurrency':
				result.concurrency = parseIntArg(argv, i, '--concurrency');
				i++;
				break;

			case '--experiment-name':
				result.experimentName = nextArg(argv, i, '--experiment-name');
				i++;
				break;

			case '--pin-ai-roots': {
				const raw = nextArg(argv, i, '--pin-ai-roots');
				result.pinAiRoots = raw
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
				i++;
				break;
			}

			case '--tier':
				result.tier = nextArg(argv, i, '--tier');
				i++;
				break;

			case '--baseline-prefix':
				result.baselinePrefix = nextArg(argv, i, '--baseline-prefix');
				result.baselineProvided = true;
				i++;
				break;

			case '--source':
				result.source = nextArg(argv, i, '--source');
				i++;
				break;

			case '--suite':
				result.suite = nextArg(argv, i, '--suite');
				i++;
				break;

			case '--build-via-mcp':
				result.buildViaMcp = true;
				break;

			case '--mcp-server':
				result.mcpServerName = nextArg(argv, i, '--mcp-server');
				result.buildOnlyFlags.push(arg);
				i++;
				break;

			case '--build-cwd':
				result.buildCwd = nextArg(argv, i, '--build-cwd');
				result.buildOnlyFlags.push(arg);
				i++;
				break;

			case '--build-max-attempts':
				result.buildMaxAttempts = parseIntArg(argv, i, '--build-max-attempts');
				result.buildOnlyFlags.push(arg);
				i++;
				break;

			case '--build-mcp-timeout-ms':
				result.buildMcpTimeoutMs = parseIntArg(argv, i, '--build-mcp-timeout-ms');
				result.buildOnlyFlags.push(arg);
				i++;
				break;

			case '--build-timeout-ms':
				result.buildTimeoutMs = parseIntArg(argv, i, '--build-timeout-ms');
				result.buildOnlyFlags.push(arg);
				i++;
				break;

			default:
				// Fail loudly on unknown flags. Strip any =value payload before
				// echoing and drop positional values entirely — raw CLI input
				// may contain secrets (e.g. --password=... or an accidentally
				// pasted token) that would otherwise leak into terminal/CI logs.
				if (arg.startsWith('--')) {
					const flagName = arg.split('=', 1)[0];
					throw new Error(`Unknown flag: ${flagName}`);
				}
				throw new Error('Unexpected positional argument');
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextArg(argv: string[], currentIndex: number, flagName: string): string {
	const value = argv[currentIndex + 1];
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`Missing value for ${flagName}`);
	}
	return value;
}

function parseIntArg(argv: string[], currentIndex: number, flagName: string): number {
	const raw = nextArg(argv, currentIndex, flagName);
	const parsed = parseInt(raw, 10);
	if (Number.isNaN(parsed)) {
		// Don't echo raw — a bad shell expansion could leak a secret here.
		throw new Error(`Invalid integer for ${flagName}`);
	}
	return parsed;
}
