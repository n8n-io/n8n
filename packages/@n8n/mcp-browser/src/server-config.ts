import { randomUUID } from 'node:crypto';
import yargsParser from 'yargs-parser';

import type { Config } from './types';

const ENV_PREFIX = 'N8N_MCP_BROWSER_';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3100;

export interface ServerOptions {
	config: Partial<Config>;
	transport: 'stdio' | 'http';
	host: string;
	port: number;
	authToken: string;
	authTokenGenerated: boolean;
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
	host?: string;
	'auth-token'?: string;
	_: string[];
}
/* eslint-enable @typescript-eslint/naming-convention */

export function parseServerOptions(argv = process.argv.slice(2)): ServerOptions {
	const args = yargsParser(argv, {
		// eslint-disable-next-line id-denylist
		string: ['browser', 'transport', 'host', 'auth-token'],
		// eslint-disable-next-line id-denylist
		number: ['port'],
		alias: {
			b: 'browser',
			p: 'port',
			t: 'transport',
		},
	}) as ParsedArgs;

	const envConfig: Partial<Config> = {};

	const envBrowser = envString('DEFAULT_BROWSER');
	if (envBrowser) envConfig.defaultBrowser = envBrowser as Config['defaultBrowser'];

	const cliConfig: Partial<Config> = {};

	if (args.browser) cliConfig.defaultBrowser = args.browser as Config['defaultBrowser'];

	const config: Partial<Config> = { ...envConfig, ...cliConfig };

	const envTransport = envString('TRANSPORT') as 'stdio' | 'http' | undefined;
	const cliTransport = args.transport as 'stdio' | 'http' | undefined;
	const transport = cliTransport ?? envTransport ?? 'http';

	const envPort = envNumber('PORT');
	const cliPort = args.port;
	const port = cliPort ?? envPort ?? DEFAULT_PORT;

	const envHost = envString('HOST');
	const cliHost = args.host;
	const host = cliHost ?? envHost ?? DEFAULT_HOST;

	const envAuthToken = envString('AUTH_TOKEN');
	const cliAuthToken = args['auth-token'];
	const providedAuthToken = cliAuthToken ?? envAuthToken;
	const authToken = providedAuthToken ?? randomUUID();
	const authTokenGenerated = providedAuthToken === undefined;

	return { config, transport, host, port, authToken, authTokenGenerated };
}
