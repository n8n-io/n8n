// ---------------------------------------------------------------------------
// CLI argument parser for the instance-ai evaluator
//
// Uses manual parsing (no external CLI lib) to keep dependencies minimal.
// Validates and normalizes arguments into a typed CliArgs interface.
// ---------------------------------------------------------------------------

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CliArgs {
	mode: 'local' | 'langsmith';
	dataset?: string;
	prompt?: string;
	tags?: string[];
	complexity?: string;
	triggerType?: string;
	maxExamples?: number;
	concurrency: number;
	timeoutMs: number;
	skipExecution: boolean;
	langsmith: boolean;
	experimentName?: string;
	baseUrl: string;
	email?: string;
	password?: string;
	verbose: boolean;
	command?: 'report' | 'upload-datasets' | 'workflows';
}

// ---------------------------------------------------------------------------
// Zod schema for validation
// ---------------------------------------------------------------------------

const cliArgsSchema = z.object({
	mode: z.enum(['local', 'langsmith']),
	dataset: z.string().optional(),
	prompt: z.string().optional(),
	tags: z.array(z.string()).optional(),
	complexity: z.string().optional(),
	triggerType: z.string().optional(),
	maxExamples: z.number().int().positive().optional(),
	concurrency: z.number().int().positive().default(3),
	timeoutMs: z.number().int().positive().default(600_000),
	skipExecution: z.boolean().default(false),
	langsmith: z.boolean().default(false),
	experimentName: z.string().optional(),
	baseUrl: z.string().url().default('http://localhost:5678'),
	email: z.string().optional(),
	password: z.string().optional(),
	verbose: z.boolean().default(false),
	command: z.enum(['report', 'upload-datasets', 'workflows']).optional(),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseCliArgs(argv: string[]): CliArgs {
	const raw = parseRawArgs(argv);
	const validated = cliArgsSchema.parse(raw);

	return {
		mode: validated.mode,
		dataset: validated.dataset,
		prompt: validated.prompt,
		tags: validated.tags,
		complexity: validated.complexity,
		triggerType: validated.triggerType,
		maxExamples: validated.maxExamples,
		concurrency: validated.concurrency,
		timeoutMs: validated.timeoutMs,
		skipExecution: validated.skipExecution,
		langsmith: validated.langsmith,
		experimentName: validated.experimentName,
		baseUrl: validated.baseUrl,
		email: validated.email,
		password: validated.password,
		verbose: validated.verbose,
		command: validated.command,
	};
}

// ---------------------------------------------------------------------------
// Raw argument parsing
// ---------------------------------------------------------------------------

interface RawArgs {
	mode: 'local' | 'langsmith';
	dataset?: string;
	prompt?: string;
	tags?: string[];
	complexity?: string;
	triggerType?: string;
	maxExamples?: number;
	concurrency: number;
	timeoutMs: number;
	skipExecution: boolean;
	langsmith: boolean;
	experimentName?: string;
	baseUrl: string;
	email?: string;
	password?: string;
	verbose: boolean;
	command?: 'report' | 'upload-datasets' | 'workflows';
}

function parseRawArgs(argv: string[]): RawArgs {
	const result: RawArgs = {
		mode: 'local',
		concurrency: 3,
		timeoutMs: 600_000,
		skipExecution: false,
		langsmith: false,
		baseUrl: 'http://localhost:5678',
		verbose: false,
	};

	// Check for sub-commands as the first non-flag argument
	const firstArg = argv[0];
	if (firstArg === 'report') {
		result.command = 'report';
		return result;
	}
	if (firstArg === 'upload-datasets') {
		result.command = 'upload-datasets';
		// Continue parsing remaining args for upload-datasets
	}
	if (firstArg === 'workflows') {
		result.command = 'workflows';
		// Continue parsing remaining args for workflows
	}

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		switch (arg) {
			case '--dataset':
				result.dataset = nextArg(argv, i, '--dataset');
				i++;
				break;

			case '--prompt':
				result.prompt = nextArg(argv, i, '--prompt');
				i++;
				break;

			case '--tags':
				result.tags = nextArg(argv, i, '--tags')
					.split(',')
					.map((t) => t.trim())
					.filter((t) => t.length > 0);
				i++;
				break;

			case '--complexity':
				result.complexity = nextArg(argv, i, '--complexity');
				i++;
				break;

			case '--trigger-type':
				result.triggerType = nextArg(argv, i, '--trigger-type');
				i++;
				break;

			case '--max-examples':
				result.maxExamples = parseIntArg(argv, i, '--max-examples');
				i++;
				break;

			case '--concurrency':
				result.concurrency = parseIntArg(argv, i, '--concurrency');
				i++;
				break;

			case '--timeout-ms':
				result.timeoutMs = parseIntArg(argv, i, '--timeout-ms');
				i++;
				break;

			case '--skip-execution':
				result.skipExecution = true;
				break;

			case '--langsmith':
				result.langsmith = true;
				result.mode = 'langsmith';
				break;

			case '--name':
				result.experimentName = nextArg(argv, i, '--name');
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

			default:
				// Ignore unknown flags and sub-command tokens already handled
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
