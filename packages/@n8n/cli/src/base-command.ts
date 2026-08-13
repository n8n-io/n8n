import { Command, Flags } from '@oclif/core';
import * as fs from 'node:fs';

import { N8nClient, ApiError } from './client';
import { resolveConnection } from './config';
import { formatOutput, applyJqFilter, type OutputFormat, type OutputOptions } from './output';

/** Exit codes following the RFC spec. */
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_AUTH = 2;

export abstract class BaseCommand extends Command {
	static override baseFlags = {
		url: Flags.string({
			char: 'u',
			description: 'n8n instance URL (or N8N_URL env var)',
			env: 'N8N_URL',
		}),
		apiKey: Flags.string({
			char: 'k',
			description: 'API key (or N8N_API_KEY env var)',
			env: 'N8N_API_KEY',
			aliases: ['api-key'],
		}),
		format: Flags.string({
			char: 'f',
			description: 'Output format. Defaults to json when stdout is piped.',
			options: ['table', 'json', 'id-only'],
		}),
		json: Flags.boolean({
			description: 'Output as JSON (shorthand for --format=json)',
			default: false,
		}),
		quiet: Flags.boolean({
			char: 'q',
			description: 'Suppress non-essential output',
			default: false,
		}),
		noHeader: Flags.boolean({
			description: 'Hide table headers (only affects table format)',
			default: false,
			aliases: ['no-header'],
		}),
		jq: Flags.string({
			description:
				"Apply a jq-style filter to JSON output (e.g. '.[0].id', '.[].name'). Implies --json.",
		}),
		debug: Flags.boolean({
			description: 'Print HTTP request/response details to stderr',
			default: false,
		}),
	};

	/** Resolve the effective output format from flags + TTY detection. */
	private resolveFormat(flags: { format?: string; json?: boolean; jq?: string }): OutputFormat {
		if (flags.jq) return 'json';
		if (flags.json) return 'json';
		if (flags.format) return flags.format as OutputFormat;
		// Auto-detect: use JSON when stdout is not a TTY (piped output)
		if (!process.stdout.isTTY) return 'json';
		return 'table';
	}

	/** Check if we're in JSON output mode. */
	private isJsonMode(flags: { format?: string; json?: boolean; jq?: string }): boolean {
		return this.resolveFormat(flags) === 'json';
	}

	protected getClient(flags: { url?: string; apiKey?: string; debug?: boolean }): N8nClient {
		const { url, apiKey } = resolveConnection(flags);

		if (!url) {
			this.error(
				"No n8n URL configured.\nHint: Run 'n8n-cli config set-url <url>' or set N8N_URL.",
				{ exit: EXIT_ERROR },
			);
		}

		if (!apiKey) {
			this.error(
				"No API key configured.\nHint: Run 'n8n-cli config set-api-key <key>' or set N8N_API_KEY.",
				{ exit: EXIT_AUTH },
			);
		}

		const debug = flags.debug
			? (msg: string) => process.stderr.write(`[debug] ${msg}\n`)
			: undefined;

		return new N8nClient({ baseUrl: url, apiKey, debug });
	}

	protected output(
		data: unknown,
		flags: {
			format?: string;
			json?: boolean;
			quiet?: boolean;
			noHeader?: boolean;
			jq?: string;
		},
		options: Partial<OutputOptions> = {},
	): void {
		if (flags.quiet) return;

		// Apply jq filter if specified
		if (flags.jq) {
			const filtered = applyJqFilter(data, flags.jq);
			this.log(JSON.stringify(filtered, null, 2));
			return;
		}

		const format = this.resolveFormat(flags);
		const text = formatOutput(data, { format, noHeader: flags.noHeader, ...options });
		this.log(text);
	}

	/** Wrap execution with consistent error handling. */
	protected async execute(fn: () => Promise<void>): Promise<void> {
		try {
			await fn();
		} catch (error) {
			if (error instanceof ApiError) {
				const exitCode = error.statusCode === 401 ? EXIT_AUTH : EXIT_ERROR;
				const message = error.hint
					? `Error: ${error.message} (${error.statusCode})\nHint: ${error.hint}`
					: `Error: ${error.message}`;
				this.error(message, { exit: exitCode });
			}
			throw error;
		}
	}

	/**
	 * Signal success. In JSON mode, outputs structured data instead of a human message.
	 * Pass `data` to provide machine-readable fields (e.g. { id, deleted: true }).
	 */
	protected succeed(
		message: string,
		flags: { quiet?: boolean; format?: string; json?: boolean; jq?: string },
		data?: Record<string, unknown>,
	): void {
		if (flags.quiet) return;
		if (this.isJsonMode(flags)) {
			this.log(JSON.stringify(data ?? { ok: true }));
		} else {
			this.log(message);
		}
		this.exit(EXIT_SUCCESS);
	}

	/** Read input from --file or --stdin. Errors if neither is provided. */
	protected readInput(flags: { file?: string; stdin?: boolean }): string {
		if (flags.stdin) {
			return fs.readFileSync(0, 'utf-8');
		}
		if (flags.file) {
			return fs.readFileSync(flags.file, 'utf-8');
		}
		this.error('Provide --file or --stdin');
	}
}
