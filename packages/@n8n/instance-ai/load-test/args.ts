// ---------------------------------------------------------------------------
// CLI argument parser for the Instance AI load test
//
// Manual parsing (no CLI lib) to keep dependencies at zero, mirroring
// evaluations/cli/args.ts — including its rule that raw argument values are
// never echoed in errors, since CLI input can carry secrets.
// ---------------------------------------------------------------------------

import { z } from 'zod';

/** Hard ceiling on virtual users; above this the driver itself is the bottleneck. */
export const MAX_USERS = 50;

export const DEFAULT_BASE_URL = 'http://localhost:5678';
export const DEFAULT_USER_EMAIL_PREFIX = 'loadtest-u';
export const DEFAULT_USER_EMAIL_DOMAIN = 'n8n.local';
export const DEFAULT_USER_PASSWORD = 'LoadTest123';
export const DEFAULT_OUTPUT_DIR = './.data/load-test';

const ArgsSchema = z
	.object({
		baseUrl: z.string().url(),
		/** Concurrency levels to run, in order. A single entry is the common case. */
		userCounts: z.array(z.number().int().min(1).max(MAX_USERS)).min(1),
		caseNames: z.array(z.string().min(1)).optional(),
		rampMs: z.number().int().min(0),
		sampleIntervalMs: z.number().int().min(250),
		/** Per-conversation budget, handed to chat-loop as MultiTurnConfig.timeoutMs. */
		timeoutMs: z.number().int().min(1_000),
		maxTurns: z.number().int().min(1).max(20),
		maxWallClockMs: z.number().int().min(1_000),
		maxCostUsd: z.number().min(0),
		quietWindowMs: z.number().int().min(1_000),
		stableThresholdMB: z.number().min(0),
		stableMaxWaitMs: z.number().int().min(1_000),
		dryRun: z.boolean(),
		noMetrics: z.boolean(),
		heapSnapshots: z.boolean(),
		outputDir: z.string().min(1),
		ownerEmail: z.string().optional(),
		ownerPassword: z.string().optional(),
		userPassword: z.string().min(1),
		usersFile: z.string().optional(),
		resetUsers: z.boolean(),
		deleteUsers: z.boolean(),
		keepWorkflows: z.boolean(),
		verbose: z.boolean(),
		yes: z.boolean(),
	})
	.strict();

export type LoadTestArgs = z.infer<typeof ArgsSchema>;

interface RawArgs {
	baseUrl?: string;
	users?: string;
	sweep?: string;
	cases?: string;
	ramp?: string;
	sampleInterval?: string;
	timeoutMs?: number;
	maxTurns?: number;
	maxWallClock?: string;
	maxCostUsd?: number;
	quietWindow?: string;
	stableThresholdMB?: number;
	stableMaxWait?: string;
	dryRun: boolean;
	noMetrics: boolean;
	heapSnapshots: boolean;
	output?: string;
	email?: string;
	password?: string;
	userPassword?: string;
	usersFile?: string;
	resetUsers: boolean;
	deleteUsers: boolean;
	keepWorkflows: boolean;
	verbose: boolean;
	yes: boolean;
}

export function parseArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): LoadTestArgs {
	const raw = parseRawArgs(argv);

	if (raw.users !== undefined && raw.sweep !== undefined) {
		throw new Error('Use either --users or --sweep, not both');
	}

	const userCounts = raw.sweep !== undefined ? parseIntList(raw.sweep, '--sweep') : undefined;

	const candidate = {
		baseUrl: raw.baseUrl ?? env.N8N_LOADTEST_BASE_URL ?? DEFAULT_BASE_URL,
		userCounts: userCounts ?? [raw.users === undefined ? 5 : parseCount(raw.users, '--users')],
		caseNames: raw.cases === undefined ? undefined : splitList(raw.cases),
		rampMs: raw.ramp === undefined ? 5_000 : parseDuration(raw.ramp, '--ramp'),
		sampleIntervalMs:
			raw.sampleInterval === undefined
				? 2_000
				: parseDuration(raw.sampleInterval, '--sample-interval'),
		timeoutMs: raw.timeoutMs ?? 600_000,
		maxTurns: raw.maxTurns ?? 4,
		maxWallClockMs:
			raw.maxWallClock === undefined
				? 20 * 60_000
				: parseDuration(raw.maxWallClock, '--max-wall-clock'),
		maxCostUsd: raw.maxCostUsd ?? 5,
		quietWindowMs:
			raw.quietWindow === undefined ? 60_000 : parseDuration(raw.quietWindow, '--quiet-window'),
		stableThresholdMB: raw.stableThresholdMB ?? 2,
		stableMaxWaitMs:
			raw.stableMaxWait === undefined
				? 60_000
				: parseDuration(raw.stableMaxWait, '--stable-max-wait'),
		dryRun: raw.dryRun,
		noMetrics: raw.noMetrics,
		heapSnapshots: raw.heapSnapshots,
		outputDir: raw.output ?? DEFAULT_OUTPUT_DIR,
		// Owner creds fall back to the same env vars the eval CLI uses, so a
		// machine already set up for evals needs no extra configuration.
		ownerEmail: raw.email ?? env.N8N_EVAL_EMAIL,
		ownerPassword: raw.password ?? env.N8N_EVAL_PASSWORD,
		userPassword: raw.userPassword ?? env.N8N_LOADTEST_PASSWORD ?? DEFAULT_USER_PASSWORD,
		usersFile: raw.usersFile,
		resetUsers: raw.resetUsers,
		deleteUsers: raw.deleteUsers,
		keepWorkflows: raw.keepWorkflows,
		verbose: raw.verbose,
		yes: raw.yes,
	};

	const parsed = ArgsSchema.safeParse(candidate);
	if (!parsed.success) {
		// Report paths and messages only — never the offending values.
		const issues = parsed.error.issues
			.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
			.join('; ');
		throw new Error(`Invalid arguments — ${issues}`);
	}

	if (parsed.data.deleteUsers && parsed.data.usersFile !== undefined) {
		throw new Error('--delete-users refuses to run with --users-file (those users are not ours)');
	}

	return parsed.data;
}

function parseRawArgs(argv: string[]): RawArgs {
	const result: RawArgs = {
		dryRun: false,
		noMetrics: false,
		heapSnapshots: false,
		resetUsers: false,
		deleteUsers: false,
		keepWorkflows: false,
		verbose: false,
		yes: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--base-url':
				result.baseUrl = nextArg(argv, i, arg);
				i++;
				break;
			case '--users':
				result.users = nextArg(argv, i, arg);
				i++;
				break;
			case '--sweep':
				result.sweep = nextArg(argv, i, arg);
				i++;
				break;
			case '--cases':
				result.cases = nextArg(argv, i, arg);
				i++;
				break;
			case '--ramp':
				result.ramp = nextArg(argv, i, arg);
				i++;
				break;
			case '--sample-interval':
				result.sampleInterval = nextArg(argv, i, arg);
				i++;
				break;
			case '--timeout-ms':
				result.timeoutMs = parseIntArg(argv, i, arg);
				i++;
				break;
			case '--max-turns':
				result.maxTurns = parseIntArg(argv, i, arg);
				i++;
				break;
			case '--max-wall-clock':
				result.maxWallClock = nextArg(argv, i, arg);
				i++;
				break;
			case '--max-cost-usd':
				result.maxCostUsd = parseFloatArg(argv, i, arg);
				i++;
				break;
			case '--quiet-window':
				result.quietWindow = nextArg(argv, i, arg);
				i++;
				break;
			case '--stable-threshold-mb':
				result.stableThresholdMB = parseFloatArg(argv, i, arg);
				i++;
				break;
			case '--stable-max-wait':
				result.stableMaxWait = nextArg(argv, i, arg);
				i++;
				break;
			case '--output':
				result.output = nextArg(argv, i, arg);
				i++;
				break;
			case '--email':
				result.email = nextArg(argv, i, arg);
				i++;
				break;
			case '--password':
				result.password = nextArg(argv, i, arg);
				i++;
				break;
			case '--user-password':
				result.userPassword = nextArg(argv, i, arg);
				i++;
				break;
			case '--users-file':
				result.usersFile = nextArg(argv, i, arg);
				i++;
				break;
			case '--dry-run':
				result.dryRun = true;
				break;
			case '--no-metrics':
				result.noMetrics = true;
				break;
			case '--heap-snapshots':
				result.heapSnapshots = true;
				break;
			case '--reset-users':
				result.resetUsers = true;
				break;
			case '--delete-users':
				result.deleteUsers = true;
				break;
			case '--keep-workflows':
				result.keepWorkflows = true;
				break;
			case '--verbose':
			case '-v':
				result.verbose = true;
				break;
			case '--yes':
			case '-y':
				result.yes = true;
				break;
			default:
				// Strip any =value payload before echoing and drop positional
				// values entirely — raw CLI input may contain secrets.
				if (arg.startsWith('--')) {
					throw new Error(`Unknown flag: ${arg.split('=', 1)[0]}`);
				}
				throw new Error('Unexpected positional argument');
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

function nextArg(argv: string[], currentIndex: number, flagName: string): string {
	const value = argv[currentIndex + 1];
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`Missing value for ${flagName}`);
	}
	return value;
}

function parseIntArg(argv: string[], currentIndex: number, flagName: string): number {
	const parsed = parseInt(nextArg(argv, currentIndex, flagName), 10);
	if (Number.isNaN(parsed)) throw new Error(`Invalid integer for ${flagName}`);
	return parsed;
}

function parseFloatArg(argv: string[], currentIndex: number, flagName: string): number {
	const parsed = Number(nextArg(argv, currentIndex, flagName));
	if (Number.isNaN(parsed)) throw new Error(`Invalid number for ${flagName}`);
	return parsed;
}

function parseCount(raw: string, flagName: string): number {
	const parsed = parseInt(raw, 10);
	if (Number.isNaN(parsed)) throw new Error(`Invalid integer for ${flagName}`);
	return parsed;
}

function splitList(raw: string): string[] {
	return raw
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

function parseIntList(raw: string, flagName: string): number[] {
	const entries = splitList(raw);
	if (entries.length === 0) throw new Error(`${flagName} needs at least one value`);
	return entries.map((entry) => parseCount(entry, flagName));
}

/**
 * Accept `5s` / `2m` / `500ms` / bare milliseconds. Durations read far better
 * than millisecond counts for the flags an operator actually tunes.
 */
export function parseDuration(raw: string, flagName: string): number {
	const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/.exec(raw.trim());
	if (!match) throw new Error(`Invalid duration for ${flagName} (expected e.g. 5s, 2m, 500ms)`);

	const value = Number(match[1]);
	switch (match[2]) {
		case 'h':
			return Math.round(value * 3_600_000);
		case 'm':
			return Math.round(value * 60_000);
		case 's':
			return Math.round(value * 1_000);
		default:
			return Math.round(value);
	}
}

export const USAGE = `
Instance AI load test — measures backend memory per concurrent user.

Usage:
  pnpm --filter=@n8n/instance-ai loadtest:instance-ai -- [options]

Load shape:
  --users <n>              Virtual users, 1-${MAX_USERS} (default 5)
  --sweep <n,n,n>          Run several concurrency levels and fit memory/user
  --cases <a,b>            Restrict to named build cases (default: all)
  --ramp <dur>             Stagger first messages over this window (default 5s)
  --max-turns <n>          Conversation turns per user (default 4)

Target:
  --base-url <url>         n8n base URL (default ${DEFAULT_BASE_URL})
  --email/--password       Owner credentials (default: N8N_EVAL_EMAIL/PASSWORD)
  --user-password <pw>     Password for provisioned users
  --users-file <path>      Use pre-created users instead of inviting

Guardrails:
  --max-cost-usd <n>       Abort above this LLM spend (default 5)
  --max-wall-clock <dur>   Abort the whole run after this (default 20m)
  --timeout-ms <n>         Per-conversation timeout (default 600000)
  --dry-run                Provision + connect + sample, send no messages (free)

Measurement:
  --sample-interval <dur>  /metrics scrape interval (default 2s)
  --quiet-window <dur>     min-of-window length when GC is unavailable (default 60s)
  --heap-snapshots         Capture server heap snapshots at phase boundaries
  --no-metrics             Proceed without /metrics (records phase timestamps only)

Cleanup:
  --keep-workflows         Leave agent-created workflows in place
  --reset-users            Provision fresh user identities
  --delete-users           Delete provisioned users afterwards

Other:
  --output <dir>           Report directory (default ${DEFAULT_OUTPUT_DIR})
  --verbose, -v            Verbose logging
  --yes, -y                Skip the cost confirmation prompt
`;
