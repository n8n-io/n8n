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

function envNumber(envKey: string): number | undefined {
	const raw = envString(envKey);
	if (raw === undefined) return undefined;
	const n = Number(raw);
	return Number.isNaN(n) ? undefined : n;
}

/* eslint-disable @typescript-eslint/naming-convention -- kebab-case keys from yargs CLI parsing */
interface ParsedArgs {
	browser?: string;
	transport?: string;
	port?: number;
	_: string[];
}
/* eslint-enable @typescript-eslint/naming-convention */

export function parseServerOptions(argv = process.argv.slice(2)): ServerOptions {
	const args = yargsParser(argv, {
		// eslint-disable-next-line id-denylist
		string: ['browser', 'transport'],
		// eslint-disable-next-line id-denylist
		number: ['port'],
		alias: {
			b: 'browser',
			p: 'port',
			t: 'transport',
		},
	}) as ParsedArgs;

	// Build config from env vars (lower priority)
	const envConfig: Partial<Config> = {};

	const envBrowser = envString('DEFAULT_BROWSER');
	if (envBrowser) envConfig.defaultBrowser = envBrowser as Config['defaultBrowser'];

	// Build config from CLI flags (higher priority)
	const cliConfig: Partial<Config> = {};

	if (args.browser) cliConfig.defaultBrowser = args.browser as Config['defaultBrowser'];

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
