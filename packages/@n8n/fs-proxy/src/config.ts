/* eslint-disable id-denylist */
import * as path from 'node:path';
import yargsParser from 'yargs-parser';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Environment variable helpers
// ---------------------------------------------------------------------------

const ENV_PREFIX = 'N8N_GATEWAY_';

function envString(name: string): string | undefined {
	return process.env[`${ENV_PREFIX}${name}`];
}

function envBoolean(name: string): boolean | undefined {
	const raw = envString(name);
	if (raw === undefined) return undefined;
	return raw === 'true' || raw === '1';
}

function envNumber(name: string): number | undefined {
	const raw = envString(name);
	if (raw === undefined) return undefined;
	const n = Number(raw);
	return Number.isNaN(n) ? undefined : n;
}

function parseViewport(raw: string): { width: number; height: number } | undefined {
	const match = /^(\d+)x(\d+)$/i.exec(raw);
	if (!match) return undefined;
	return { width: Number(match[1]), height: Number(match[2]) };
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const logLevelSchema = z.enum(['silent', 'error', 'warn', 'info', 'debug']);
export type LogLevel = z.infer<typeof logLevelSchema>;

const filesystemConfigSchema = z.object({
	dir: z.string().default('.'),
});

const shellConfigSchema = z.object({
	timeout: z.number().int().positive().default(30_000),
});

const screenshotConfigSchema = z.object({});

const mouseKeyboardConfigSchema = z.object({});

const computerConfigSchema = z.object({
	shell: z.union([z.literal(false), shellConfigSchema]).default({}),
	screenshot: z.union([z.literal(false), screenshotConfigSchema]).default({}),
	mouseKeyboard: z.union([z.literal(false), mouseKeyboardConfigSchema]).default({}),
});

const viewportSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
});

const browserConfigSchema = z.object({
	headless: z.boolean().default(false),
	defaultBrowser: z.string().default('chromium'),
	viewport: viewportSchema.default({ width: 1280, height: 720 }),
	sessionTtlMs: z.number().positive().default(1_800_000),
	maxConcurrentSessions: z.number().positive().default(5),
});

export const gatewayConfigSchema = z.object({
	logLevel: logLevelSchema.default('info'),
	port: z.number().int().positive().default(7655),
	filesystem: z.union([z.literal(false), filesystemConfigSchema]).default({}),
	computer: computerConfigSchema.default({}),
	browser: z.union([z.literal(false), browserConfigSchema]).default({}),
});

export type GatewayConfig = z.input<typeof gatewayConfigSchema>;
export type ResolvedGatewayConfig = z.output<typeof gatewayConfigSchema>;

// ---------------------------------------------------------------------------
// Config builder — merges env vars and CLI flags into a partial config
// ---------------------------------------------------------------------------

function buildEnvConfig(): Partial<GatewayConfig> {
	const config: Record<string, unknown> = {};

	// Global
	const logLevel = envString('LOG_LEVEL') ?? process.env.LOG_LEVEL;
	if (logLevel) config.logLevel = logLevel;

	// Filesystem
	const fsEnabled = envBoolean('FILESYSTEM_ENABLED');
	const fsDir = envString('FILESYSTEM_DIR');
	if (fsEnabled === false) {
		config.filesystem = false;
	} else if (fsDir) {
		config.filesystem = { dir: fsDir };
	}

	// Computer — shell
	const shellEnabled = envBoolean('COMPUTER_SHELL_ENABLED');
	const shellTimeout = envNumber('COMPUTER_SHELL_TIMEOUT');
	const computer: Record<string, unknown> = {};
	if (shellEnabled === false) {
		computer.shell = false;
	} else if (shellTimeout !== undefined) {
		computer.shell = { timeout: shellTimeout };
	}

	// Computer — screenshot
	const screenshotEnabled = envBoolean('COMPUTER_SCREENSHOT_ENABLED');
	if (screenshotEnabled === false) {
		computer.screenshot = false;
	}

	// Computer — mouse/keyboard
	const mouseKeyboardEnabled = envBoolean('COMPUTER_MOUSE_KEYBOARD_ENABLED');
	if (mouseKeyboardEnabled === false) {
		computer.mouseKeyboard = false;
	}

	if (Object.keys(computer).length > 0) {
		config.computer = computer;
	}

	// Browser
	const browserEnabled = envBoolean('BROWSER_ENABLED');
	if (browserEnabled === false) {
		config.browser = false;
	} else {
		const browser: Record<string, unknown> = {};
		const headless = envBoolean('BROWSER_HEADLESS');
		if (headless !== undefined) browser.headless = headless;
		const defaultBrowser = envString('BROWSER_DEFAULT');
		if (defaultBrowser) browser.defaultBrowser = defaultBrowser;
		const viewport = envString('BROWSER_VIEWPORT');
		if (viewport) browser.viewport = parseViewport(viewport);
		const sessionTtlMs = envNumber('BROWSER_SESSION_TTL_MS');
		if (sessionTtlMs !== undefined) browser.sessionTtlMs = sessionTtlMs;
		const maxSessions = envNumber('BROWSER_MAX_SESSIONS');
		if (maxSessions !== undefined) browser.maxConcurrentSessions = maxSessions;
		if (Object.keys(browser).length > 0) {
			config.browser = browser;
		}
	}

	return config as Partial<GatewayConfig>;
}

function buildCliConfig(args: yargsParser.Arguments): Partial<GatewayConfig> {
	const config: Record<string, unknown> = {};

	// Global
	if (args['log-level']) config.logLevel = args['log-level'];
	if (args.port !== undefined) config.port = args.port;

	// Filesystem
	if (args['no-filesystem'] === true) {
		config.filesystem = false;
	} else {
		const dir = args['filesystem-dir'] as string;
		if (dir) config.filesystem = { dir };
	}

	// Computer — shell
	const computer: Record<string, unknown> = {};
	if (args['no-computer-shell'] === true) {
		computer.shell = false;
	} else {
		const timeout = args['computer-shell-timeout'] as number;
		if (timeout !== undefined) computer.shell = { timeout };
	}

	// Computer — screenshot
	if (args['no-computer-screenshot'] === true) {
		computer.screenshot = false;
	}

	// Computer — mouse/keyboard
	if (args['no-computer-mouse-keyboard'] === true) {
		computer.mouseKeyboard = false;
	}

	if (Object.keys(computer).length > 0) {
		config.computer = computer;
	}

	// Browser
	if (args['no-browser'] === true) {
		config.browser = false;
	} else {
		const browser: Record<string, unknown> = {};
		if (args['browser-headless'] !== undefined) browser.headless = args['browser-headless'];
		if (args['no-browser-headless'] === true) browser.headless = false;
		if (args['browser-default']) browser.defaultBrowser = args['browser-default'];
		if (args['browser-viewport'])
			browser.viewport = parseViewport(args['browser-viewport'] as string);
		if (args['browser-session-ttl-ms'] !== undefined)
			browser.sessionTtlMs = args['browser-session-ttl-ms'];
		if (args['browser-max-sessions'] !== undefined)
			browser.maxConcurrentSessions = args['browser-max-sessions'];
		if (Object.keys(browser).length > 0) {
			config.browser = browser;
		}
	}

	return config as Partial<GatewayConfig>;
}

// ---------------------------------------------------------------------------
// Deep merge — merges CLI config over env config (CLI wins)
// ---------------------------------------------------------------------------

function deepMerge(
	base: Record<string, unknown>,
	override: Record<string, unknown>,
): Record<string, unknown> {
	const result = { ...base };
	for (const key of Object.keys(override)) {
		const baseVal = base[key];
		const overrideVal = override[key];
		if (
			typeof baseVal === 'object' &&
			baseVal !== null &&
			typeof overrideVal === 'object' &&
			overrideVal !== null &&
			!Array.isArray(baseVal) &&
			!Array.isArray(overrideVal)
		) {
			result[key] = deepMerge(
				baseVal as Record<string, unknown>,
				overrideVal as Record<string, unknown>,
			);
		} else {
			result[key] = overrideVal;
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParsedArgs {
	/** Subcommand: 'serve' or undefined (direct mode) */
	command?: 'serve';
	/** n8n instance URL (direct mode) */
	url?: string;
	/** Gateway API key (direct mode) */
	apiKey?: string;
	/** Resolved gateway config */
	config: ResolvedGatewayConfig;
}

export function parseConfig(argv = process.argv.slice(2)): ParsedArgs {
	const isServe = argv[0] === 'serve';
	const rawArgs = isServe ? argv.slice(1) : argv;

	const args = yargsParser(rawArgs, {
		string: ['log-level', 'filesystem-dir', 'browser-default', 'browser-viewport'],
		boolean: [
			'no-filesystem',
			'no-computer-shell',
			'no-computer-screenshot',
			'no-computer-mouse-keyboard',
			'no-browser',
			'browser-headless',
			'no-browser-headless',
			'help',
		],
		number: ['port', 'computer-shell-timeout', 'browser-session-ttl-ms', 'browser-max-sessions'],
		alias: { h: 'help', p: 'port' },
	});

	// Three-tier merge: Zod defaults ← env ← CLI
	const envConfig = buildEnvConfig();
	const cliConfig = buildCliConfig(args);
	const merged = deepMerge(
		envConfig as Record<string, unknown>,
		cliConfig as Record<string, unknown>,
	);

	// Handle backwards-compatible positional args
	let url: string | undefined;
	let apiKey: string | undefined;

	if (isServe) {
		// serve [directory]
		const positional = args._;
		if (positional.length > 0 && typeof positional[0] === 'string') {
			const dir = String(positional[0]);
			if (!merged.filesystem || typeof merged.filesystem !== 'object') {
				merged.filesystem = { dir };
			} else if (!(merged.filesystem as Record<string, unknown>).dir) {
				(merged.filesystem as Record<string, unknown>).dir = dir;
			}
		}
	} else {
		// Direct mode: <url> <token> [directory]
		const positional = args._;
		if (positional.length >= 2) {
			url = String(positional[0]);
			apiKey = String(positional[1]);
			if (positional.length >= 3) {
				const dir = String(positional[2]);
				if (!merged.filesystem || typeof merged.filesystem !== 'object') {
					merged.filesystem = { dir };
				} else if (!(merged.filesystem as Record<string, unknown>).dir) {
					(merged.filesystem as Record<string, unknown>).dir = dir;
				}
			}
		} else if (!args.help) {
			// Flag-based: --url, --api-key are still separate from config
			url = args.url as string | undefined;
			apiKey = args['api-key'] as string | undefined;
			if (args.dir) {
				if (!merged.filesystem || typeof merged.filesystem !== 'object') {
					merged.filesystem = { dir: args.dir as string };
				}
			}
		}
	}

	// Resolve dir to absolute path
	if (merged.filesystem && typeof merged.filesystem === 'object') {
		const fs = merged.filesystem as Record<string, unknown>;
		if (typeof fs.dir === 'string') {
			fs.dir = path.resolve(fs.dir);
		}
	}

	const config = gatewayConfigSchema.parse(merged);

	// Resolve url
	if (url) url = url.replace(/\/$/, '');

	return {
		command: isServe ? 'serve' : undefined,
		url,
		apiKey,
		config,
	};
}
