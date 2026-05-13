// ---------------------------------------------------------------------------
// CLI argument parser for the instance-ai workflow evaluator
//
// Uses manual parsing (no external CLI lib) to keep dependencies minimal.
// Validates and normalizes arguments into a typed CliArgs interface.
// ---------------------------------------------------------------------------

import { z } from 'zod';

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
	/** Directory to write eval-results.json (defaults to cwd) */
	outputDir?: string;
	/** LangSmith dataset name (synced from JSON test cases before each run) */
	dataset: string;
	/** Max concurrent target() calls in LangSmith evaluate(). Build concurrency is
	 *  enforced separately by the LaneAllocator (cap=4 per lane). */
	concurrency: number;
	/** LangSmith experiment name prefix (auto-generated if not set) */
	experimentName?: string;
	/** Number of iterations to run each test case (default: 1). Each iteration
	 *  gets a fresh build so pass@k / pass^k capture real builder variance. */
	iterations: number;
}

// ---------------------------------------------------------------------------
// Zod schema for validation
// ---------------------------------------------------------------------------

const cliArgsSchema = z.object({
	timeoutMs: z.number().int().positive().default(900_000),
	baseUrls: z.array(z.string().url()).min(1).default(['http://localhost:5678']),
	email: z.string().optional(),
	password: z.string().optional(),
	verbose: z.boolean().default(false),
	filter: z.string().optional(),
	exclude: z.string().optional(),
	prebuiltWorkflows: z.string().optional(),
	keepWorkflows: z.boolean().default(false),
	outputDir: z.string().optional(),
	dataset: z.string().default('instance-ai-workflow-evals'),
	concurrency: z.number().int().positive().default(16),
	experimentName: z.string().optional(),
	iterations: z.number().int().positive().default(1),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseCliArgs(argv: string[]): CliArgs {
	const raw = parseRawArgs(argv);
	const validated = cliArgsSchema.parse(raw);

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
		outputDir: validated.outputDir,
		dataset: validated.dataset,
		concurrency: validated.concurrency,
		experimentName: validated.experimentName,
		iterations: validated.iterations,
	};
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
	outputDir?: string;
	dataset: string;
	concurrency: number;
	experimentName?: string;
	iterations: number;
}

function parseRawArgs(argv: string[]): RawArgs {
	const result: RawArgs = {
		timeoutMs: 900_000,
		baseUrls: ['http://localhost:5678'],
		verbose: false,
		keepWorkflows: false,
		outputDir: undefined,
		dataset: 'instance-ai-workflow-evals',
		concurrency: 16,
		experimentName: undefined,
		iterations: 1,
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
