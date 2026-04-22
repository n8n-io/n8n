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
	timeoutMs: number;
	baseUrl: string;
	email?: string;
	password?: string;
	verbose: boolean;
	/** Filter workflow test cases by filename substring (e.g. "contact-form") */
	filter?: string;
	/** Keep built workflows after evaluation instead of deleting them */
	keepWorkflows: boolean;
	/** Directory to write eval-results.json (defaults to cwd) */
	outputDir?: string;
}

// ---------------------------------------------------------------------------
// Zod schema for validation
// ---------------------------------------------------------------------------

const cliArgsSchema = z.object({
	timeoutMs: z.number().int().positive().default(600_000),
	baseUrl: z.string().url().default('http://localhost:5678'),
	email: z.string().optional(),
	password: z.string().optional(),
	verbose: z.boolean().default(false),
	filter: z.string().optional(),
	keepWorkflows: z.boolean().default(false),
	outputDir: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseCliArgs(argv: string[]): CliArgs {
	const raw = parseRawArgs(argv);
	const validated = cliArgsSchema.parse(raw);

	return {
		timeoutMs: validated.timeoutMs,
		baseUrl: validated.baseUrl,
		email: validated.email,
		password: validated.password,
		verbose: validated.verbose,
		filter: validated.filter,
		keepWorkflows: validated.keepWorkflows,
		outputDir: validated.outputDir,
	};
}

// ---------------------------------------------------------------------------
// Raw argument parsing
// ---------------------------------------------------------------------------

interface RawArgs {
	timeoutMs: number;
	baseUrl: string;
	email?: string;
	password?: string;
	verbose: boolean;
	filter?: string;
	keepWorkflows: boolean;
	outputDir?: string;
}

function parseRawArgs(argv: string[]): RawArgs {
	const result: RawArgs = {
		timeoutMs: 600_000,
		baseUrl: 'http://localhost:5678',
		verbose: false,
		keepWorkflows: false,
		outputDir: undefined,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		switch (arg) {
			case '--timeout-ms':
				result.timeoutMs = parseIntArg(argv, i, '--timeout-ms');
				i++;
				break;

			case '--base-url':
				result.baseUrl = nextArg(argv, i, '--base-url');
				i++;
				break;

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

			case '--keep-workflows':
				result.keepWorkflows = true;
				break;

			case '--output-dir':
				result.outputDir = nextArg(argv, i, '--output-dir');
				i++;
				break;

			default:
				// Ignore unknown flags
				break;
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
		throw new Error(`Invalid integer for ${flagName}: ${raw}`);
	}
	return parsed;
}
