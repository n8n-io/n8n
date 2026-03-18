import yargsParser from 'yargs-parser';

import type { Config } from './types';

const ENV_PREFIX = 'N8N_MCP_BROWSER_';

export interface ServerOptions {
	config: Partial<Config>;
	transport: 'stdio' | 'http';
	port: number;
}

function envString(envKey: string): string | undefined {
	return process.env[`${ENV_PREFIX}${envKey}`];
}

function envBoolean(envKey: string): boolean | undefined {
	const raw = envString(envKey);
	if (raw === undefined) return undefined;
	return raw === 'true' || raw === '1';
}

function envNumber(envKey: string): number | undefined {
	const raw = envString(envKey);
	if (raw === undefined) return undefined;
	const n = Number(raw);
	return Number.isNaN(n) ? undefined : n;
}

function parseViewport(raw: string): { width: number; height: number } | undefined {
	const match = /^(\d+)x(\d+)$/i.exec(raw);
	if (!match) return undefined;
	return { width: Number(match[1]), height: Number(match[2]) };
}

/* eslint-disable @typescript-eslint/naming-convention -- kebab-case keys from yargs CLI parsing */
interface ParsedArgs {
	browser?: string;
	mode?: string;
	headless?: boolean;
	viewport?: string;
	'session-ttl-ms'?: number;
	'max-sessions'?: number;
	'profiles-dir'?: string;
	transport?: string;
	port?: number;
	_: string[];
}
/* eslint-enable @typescript-eslint/naming-convention */

export function parseServerOptions(argv = process.argv.slice(2)): ServerOptions {
	const args = yargsParser(argv, {
		// eslint-disable-next-line id-denylist
		string: ['browser', 'mode', 'viewport', 'profiles-dir', 'transport'],
		// eslint-disable-next-line id-denylist
		boolean: ['headless'],
		// eslint-disable-next-line id-denylist
		number: ['session-ttl-ms', 'max-sessions', 'port'],
		alias: {
			b: 'browser',
			m: 'mode',
			p: 'port',
			t: 'transport',
		},
	}) as ParsedArgs;

	// Build config from env vars (lower priority)
	const envConfig: Partial<Config> = {};

	const envBrowser = envString('DEFAULT_BROWSER');
	if (envBrowser) envConfig.defaultBrowser = envBrowser as Config['defaultBrowser'];

	const envMode = envString('DEFAULT_MODE');
	if (envMode) envConfig.defaultMode = envMode as Config['defaultMode'];

	const envHeadless = envBoolean('HEADLESS');
	if (envHeadless !== undefined) envConfig.headless = envHeadless;

	const envViewport = envString('VIEWPORT');
	if (envViewport) envConfig.viewport = parseViewport(envViewport);

	const envTtl = envNumber('SESSION_TTL_MS');
	if (envTtl !== undefined) envConfig.sessionTtlMs = envTtl;

	const envMaxSessions = envNumber('MAX_SESSIONS');
	if (envMaxSessions !== undefined) envConfig.maxConcurrentSessions = envMaxSessions;

	const envProfilesDir = envString('PROFILES_DIR');
	if (envProfilesDir) envConfig.profilesDir = envProfilesDir;

	// Build config from CLI flags (higher priority)
	const cliConfig: Partial<Config> = {};

	if (args.browser) cliConfig.defaultBrowser = args.browser as Config['defaultBrowser'];
	if (args.mode) cliConfig.defaultMode = args.mode as Config['defaultMode'];
	if (args.headless !== undefined) cliConfig.headless = args.headless;
	if (args.viewport) cliConfig.viewport = parseViewport(args.viewport);
	if (args['session-ttl-ms'] !== undefined) cliConfig.sessionTtlMs = args['session-ttl-ms'];
	if (args['max-sessions'] !== undefined) cliConfig.maxConcurrentSessions = args['max-sessions'];
	if (args['profiles-dir']) cliConfig.profilesDir = args['profiles-dir'];

	// Merge: env ← cli (CLI wins)
	const config: Partial<Config> = { ...envConfig, ...cliConfig };

	// Transport options (same env ← cli precedence)
	const envTransport = envString('TRANSPORT') as 'stdio' | 'http' | undefined;
	const cliTransport = args.transport as 'stdio' | 'http' | undefined;
	const transport = cliTransport ?? envTransport ?? 'http';

	const envPort = envNumber('PORT');
	const cliPort = args.port;
	const port = cliPort ?? envPort ?? 3100;

	return { config, transport, port };
}
