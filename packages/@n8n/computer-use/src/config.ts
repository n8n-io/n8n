/* eslint-disable id-denylist */
import * as os from 'node:os';
import * as path from 'node:path';
import yargsParser from 'yargs-parser';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Permission options — keys derive the ToolGroup union type
// Defaults match the Recommended template from the spec.
// ---------------------------------------------------------------------------

export const TOOL_GROUP_DEFINITIONS = {
	filesystemRead: {
		envVar: 'PERMISSION_FILESYSTEM_READ',
		cliFlag: 'permission-filesystem-read',
		default: 'allow',
		description: 'Filesystem read access mode: deny | ask | allow',
	},
	filesystemWrite: {
		envVar: 'PERMISSION_FILESYSTEM_WRITE',
		cliFlag: 'permission-filesystem-write',
		default: 'ask',
		description: 'Filesystem write access mode: deny | ask | allow',
	},
	shell: {
		envVar: 'PERMISSION_SHELL',
		cliFlag: 'permission-shell',
		default: 'deny',
		description: 'Shell execution mode: deny | ask | allow',
	},
	computer: {
		envVar: 'PERMISSION_COMPUTER',
		cliFlag: 'permission-computer',
		default: 'deny',
		description: 'Computer control (screenshot, mouse/keyboard) mode: deny | ask | allow',
	},
	browser: {
		envVar: 'PERMISSION_BROWSER',
		cliFlag: 'permission-browser',
		default: 'ask',
		description: 'Browser automation mode: deny | ask | allow',
	},
} as const;

export type ToolGroup = keyof typeof TOOL_GROUP_DEFINITIONS;

export const PERMISSION_MODES = ['deny', 'ask', 'allow'] as const;
export const permissionModeSchema = z.enum(PERMISSION_MODES);
export type PermissionMode = z.infer<typeof permissionModeSchema>;

// ---------------------------------------------------------------------------
// Unified config type — the single type passed to daemon, client, settings
// ---------------------------------------------------------------------------

export interface GatewayConfig {
	logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
	allowedOrigins: string[];
	filesystem: { dir: string };
	computer: { shell: { timeout: number } };
	browser: {
		defaultBrowser: string;
	};
	/** Startup permission overrides (ENV/CLI). Merged with persistent settings in SettingsStore. */
	permissions: Partial<Record<ToolGroup, PermissionMode>>;
	/** Where resource access confirmation prompts are displayed. */
	permissionConfirmation: 'client' | 'instance';
}

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

// ---------------------------------------------------------------------------
// Zod schemas (internal — used only in parseConfig)
// ---------------------------------------------------------------------------

export const logLevelSchema = z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info');
export type LogLevel = z.infer<typeof logLevelSchema>;

const structuralConfigSchema = z.object({
	logLevel: logLevelSchema,
	allowedOrigins: z.array(z.string()).default(['https://*.app.n8n.cloud']),
	filesystem: z.object({ dir: z.string().default('.') }).default({}),
	computer: z
		.object({
			shell: z.object({ timeout: z.number().int().positive().default(30_000) }).default({}),
		})
		.default({}),
	browser: z
		.object({
			defaultBrowser: z.string().default('chrome'),
		})
		.default({}),
	permissionConfirmation: z.enum(['client', 'instance']).default('instance'),
});

// ---------------------------------------------------------------------------
// Read permission overrides from ENV and CLI
// ---------------------------------------------------------------------------

function readPermissionOverridesFromEnv(): Partial<Record<ToolGroup, PermissionMode>> {
	const overrides: Partial<Record<ToolGroup, PermissionMode>> = {};
	for (const [group, option] of Object.entries(TOOL_GROUP_DEFINITIONS) as Array<
		[ToolGroup, (typeof TOOL_GROUP_DEFINITIONS)[ToolGroup]]
	>) {
		const raw = envString(option.envVar);
		if (raw !== undefined) {
			const result = permissionModeSchema.safeParse(raw);
			if (result.success) overrides[group] = result.data;
		}
	}
	return overrides;
}

function readPermissionOverridesFromCli(
	args: yargsParser.Arguments,
): Partial<Record<ToolGroup, PermissionMode>> {
	const overrides: Partial<Record<ToolGroup, PermissionMode>> = {};
	for (const [group, option] of Object.entries(TOOL_GROUP_DEFINITIONS) as Array<
		[ToolGroup, (typeof TOOL_GROUP_DEFINITIONS)[ToolGroup]]
	>) {
		const cliKey = option.cliFlag.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
		const raw = args[cliKey] as string | undefined;
		if (raw !== undefined) {
			const result = permissionModeSchema.safeParse(raw);
			if (result.success) overrides[group] = result.data;
		}
	}
	return overrides;
}

// ---------------------------------------------------------------------------
// Config builder — merges env vars and CLI flags into a partial structural config
// ---------------------------------------------------------------------------

type PartialStructural = z.input<typeof structuralConfigSchema>;

function buildEnvConfig(): PartialStructural {
	const config: Record<string, unknown> = {};

	const logLevel = envString('LOG_LEVEL') ?? process.env.LOG_LEVEL;
	if (logLevel) config.logLevel = logLevel;

	const fsDir = envString('FILESYSTEM_DIR');
	if (fsDir) config.filesystem = { dir: fsDir };

	const shellTimeout = envNumber('COMPUTER_SHELL_TIMEOUT');
	if (shellTimeout !== undefined) config.computer = { shell: { timeout: shellTimeout } };

	const defaultBrowser = envString('BROWSER_DEFAULT');
	if (defaultBrowser) config.browser = { defaultBrowser };

	const permissionConfirmation = envString('PERMISSION_CONFIRMATION');
	if (permissionConfirmation) config.permissionConfirmation = permissionConfirmation;

	return config as PartialStructural;
}

function buildCliConfig(args: yargsParser.Arguments): PartialStructural {
	const config: Record<string, unknown> = {};

	if (args['log-level']) config.logLevel = args['log-level'];
	if (args['allowed-origins']) {
		const raw = args['allowed-origins'] as string | string[];
		const rawArr = Array.isArray(raw) ? raw.map(String) : [String(raw)];
		config.allowedOrigins = rawArr.flatMap((s) =>
			s
				.split(',')
				.map((p) => p.trim())
				.filter(Boolean),
		);
	}

	const dir = args.dir as string;
	if (dir) config.filesystem = { dir };

	const timeout = args['computer-shell-timeout'] as number;
	if (timeout !== undefined) config.computer = { shell: { timeout } };

	if (args['browser-default'])
		config.browser = { defaultBrowser: args['browser-default'] as string };

	if (args['permission-confirmation'])
		config.permissionConfirmation = args['permission-confirmation'];

	return config as PartialStructural;
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
// Settings file path
// ---------------------------------------------------------------------------

export function getSettingsFilePath(): string {
	return path.join(os.homedir(), '.n8n-gateway', 'settings.json');
}

let _settingsDir: string | undefined;

/** Return the directory containing the gateway settings file (cached). */
export function getSettingsDir(): string {
	_settingsDir ??= path.dirname(getSettingsFilePath());
	return _settingsDir;
}

/**
 * Check if an absolute path falls within the gateway settings directory.
 * Used to prevent computer-use tools from modifying their own configuration.
 */
export function isProtectedSettingsPath(absolutePath: string): boolean {
	const dir = path.resolve(getSettingsDir());
	const target = path.resolve(absolutePath);
	return target === dir || target.startsWith(dir + path.sep);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParsedArgs {
	/** n8n instance URL */
	url?: string;
	/** Gateway API key (direct mode) */
	apiKey?: string;
	/** Complete resolved config, ready to pass to startDaemon / GatewayClient */
	config: GatewayConfig;
	/**
	 * When true, all permission prompts are auto-granted as "allow once".
	 * CLI-only — handle in cli.ts by passing confirmResourceAccess: () => 'allowOnce'.
	 */
	autoConfirm: boolean;
	/**
	 * When true, skip all interactive prompts (startup config + resource access).
	 * Resource access falls back to denyOnce, or allowOnce when autoConfirm is also set.
	 */
	nonInteractive: boolean;
}

export function parseConfig(argv = process.argv.slice(2)): ParsedArgs {
	const permissionFlags = Object.values(TOOL_GROUP_DEFINITIONS).map((o) => o.cliFlag);

	const args = yargsParser(argv, {
		string: [
			'log-level',
			'dir',
			'browser-default',
			'allowed-origins',
			'permission-confirmation',
			...permissionFlags,
		],
		boolean: ['auto-confirm', 'non-interactive', 'help'],
		number: ['computer-shell-timeout'],
		alias: { h: 'help', d: 'dir' },
	});

	// Three-tier merge: Zod defaults ← env ← CLI
	const envConfig = buildEnvConfig();
	const cliConfig = buildCliConfig(args);
	const merged = deepMerge(
		envConfig as Record<string, unknown>,
		cliConfig as Record<string, unknown>,
	);

	// Handle positional args: [url?, token?, dir?]
	let url: string | undefined;
	let apiKey: string | undefined;

	const positional = args._;
	if (positional.length >= 1) {
		url = String(positional[0]);
		if (positional.length >= 2) {
			apiKey = String(positional[1]);
		}
		if (positional.length >= 3) {
			const dir = String(positional[2]);
			if (!merged.filesystem || typeof merged.filesystem !== 'object') {
				merged.filesystem = { dir };
			} else if (!(merged.filesystem as Record<string, unknown>).dir) {
				(merged.filesystem as Record<string, unknown>).dir = dir;
			}
		}
	} else if (!args.help) {
		url = args.url as string | undefined;
		apiKey = args['api-key'] as string | undefined;
		if (args.dir) {
			if (!merged.filesystem || typeof merged.filesystem !== 'object') {
				merged.filesystem = { dir: args.dir as string };
			}
		}
	}

	// Resolve dir to absolute path (pre-parse, for explicitly provided values)
	if (merged.filesystem && typeof merged.filesystem === 'object') {
		const fs = merged.filesystem as Record<string, unknown>;
		if (typeof fs.dir === 'string') {
			fs.dir = path.resolve(fs.dir);
		}
	}

	const structural = structuralConfigSchema.parse(merged);

	// Resolve dir to absolute path (post-parse, for Zod defaults like '.')
	structural.filesystem.dir = path.resolve(structural.filesystem.dir);

	if (url) url = url.replace(/\/$/, '');

	// Collect permission overrides from ENV and CLI (not persisted to settings file)
	const envPermissions = readPermissionOverridesFromEnv();
	const cliPermissions = readPermissionOverridesFromCli(args);
	const permissions: Partial<Record<ToolGroup, PermissionMode>> = {
		...envPermissions,
		...cliPermissions, // CLI wins over ENV
	};

	const autoConfirm =
		(args['auto-confirm'] as boolean | undefined) ?? envBoolean('AUTO_CONFIRM') ?? false;

	const nonInteractive =
		(args['non-interactive'] as boolean | undefined) ?? envBoolean('NON_INTERACTIVE') ?? false;

	const config: GatewayConfig = { ...structural, permissions };

	return {
		url,
		apiKey,
		config,
		autoConfirm,
		nonInteractive,
	};
}

// ---------------------------------------------------------------------------
// Origin matching — supports wildcard patterns like https://*.app.n8n.cloud
// ---------------------------------------------------------------------------

function matchesOriginPattern(pattern: string, origin: string): boolean {
	if (!pattern.includes('*')) {
		try {
			return new URL(pattern).origin === new URL(origin).origin;
		} catch {
			return false;
		}
	}

	let originUrl: URL;
	try {
		originUrl = new URL(origin);
	} catch {
		return false;
	}

	// Parse pattern manually — URL constructor rejects wildcards in hostnames
	const schemeMatch = /^([a-z][a-z0-9+\-.]*):\/\/(.+)$/.exec(pattern);
	if (!schemeMatch) return false;
	const [, patternScheme, patternAuthority] = schemeMatch;

	if (originUrl.protocol !== `${patternScheme}:`) return false;

	// Split authority into hostname and optional port
	const colonIdx = patternAuthority.lastIndexOf(':');
	const hasPort = colonIdx > patternAuthority.lastIndexOf('*');
	const patternHostname = hasPort ? patternAuthority.slice(0, colonIdx) : patternAuthority;
	const patternPort = hasPort ? patternAuthority.slice(colonIdx + 1) : '';

	if (patternPort && originUrl.port !== patternPort) return false;
	if (!patternPort && originUrl.port !== '') return false;

	// Match hostname — * expands to any depth of subdomains
	const escapedParts = patternHostname
		.split('*')
		.map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&'));
	return new RegExp(`^${escapedParts.join('.+')}$`).test(originUrl.hostname);
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
	return allowedOrigins.some((pattern) => matchesOriginPattern(pattern, origin));
}
