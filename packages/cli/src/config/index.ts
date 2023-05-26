import convict from 'convict';
import dotenv from 'dotenv';
import { tmpdir } from 'os';
import { mkdirSync, mkdtempSync, readFileSync } from 'fs';
import { join } from 'path';
import { schema } from './schema';
import { inTest, inE2ETests } from '@/constants';

if (inE2ETests) {
	const testsDir = join(tmpdir(), 'n8n-e2e/');
	mkdirSync(testsDir, { recursive: true });
	// Skip loading config from env variables in end-to-end tests
	process.env = {
		E2E_TESTS: 'true',
		N8N_USER_FOLDER: mkdtempSync(testsDir),
		EXECUTIONS_PROCESS: 'main',
		N8N_DIAGNOSTICS_ENABLED: 'false',
		N8N_PUBLIC_API_DISABLED: 'true',
		EXTERNAL_FRONTEND_HOOKS_URLS: '',
		N8N_PERSONALIZATION_ENABLED: 'false',
		NODE_FUNCTION_ALLOW_EXTERNAL: 'node-fetch',
	};
} else if (inTest) {
	const testsDir = join(tmpdir(), 'n8n-tests/');
	mkdirSync(testsDir, { recursive: true });
	process.env.N8N_LOG_LEVEL = 'silent';
	process.env.N8N_ENCRYPTION_KEY = 'test-encryption-key';
	process.env.N8N_PUBLIC_API_DISABLED = 'true';
	process.env.N8N_USER_FOLDER = mkdtempSync(testsDir);
} else {
	dotenv.config();
}

const config = convict(schema, { args: [] });

// eslint-disable-next-line @typescript-eslint/unbound-method
config.getEnv = config.get;

// Load overwrites when not in tests
if (!inE2ETests && !inTest) {
	// Overwrite default configuration with settings which got defined in
	// optional configuration files
	const { N8N_CONFIG_FILES } = process.env;
	if (N8N_CONFIG_FILES !== undefined) {
		const configFiles = N8N_CONFIG_FILES.split(',');
		console.debug('Loading config overwrites', configFiles);
		config.loadFile(configFiles);
	}

	// Overwrite config from files defined in "_FILE" environment variables
	Object.entries(process.env).forEach(([envName, fileName]) => {
		if (envName.endsWith('_FILE') && fileName) {
			const configEnvName = envName.replace(/_FILE$/, '');
			// @ts-ignore
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const key = config._env[configEnvName]?.[0] as string;
			if (key) {
				let value: string;
				try {
					value = readFileSync(fileName, 'utf8');
				} catch (error) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					if (error.code === 'ENOENT') {
						throw new Error(`The file "${fileName}" could not be found.`);
					}
					throw error;
				}
				config.set(key, value);
			}
		}
	});
}

config.validate({
	allowed: 'strict',
});

// eslint-disable-next-line import/no-default-export
export default config;
export type Config = typeof config;
