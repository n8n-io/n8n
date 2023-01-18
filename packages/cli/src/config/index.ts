/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-console */
import convict from 'convict';
import dotenv from 'dotenv';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import { join } from 'path';
import { schema } from './schema';
import { inTest, inE2ETests } from '@/constants';

if (inE2ETests) {
	// Skip loading config from env variables in end-to-end tests
	process.env = {
		E2E_TESTS: 'true',
		N8N_USER_FOLDER: mkdtempSync(join(tmpdir(), 'n8n-e2e-')),
		N8N_DIAGNOSTICS_ENABLED: 'false',
		N8N_PUBLIC_API_DISABLED: 'true',
		EXTERNAL_FRONTEND_HOOKS_URLS: '',
		N8N_PERSONALIZATION_ENABLED: 'false',
	};
}
if (inTest) {
	process.env.N8N_PUBLIC_API_DISABLED = 'true';
} else {
	dotenv.config();
}

const config = convict(schema);

if (inE2ETests) {
	config.set('enterprise.features.sharing', true);
}

config.getEnv = config.get;

if (!inE2ETests) {
	// Overwrite default configuration with settings which got defined in
	// optional configuration files
	const { N8N_CONFIG_FILES } = process.env;
	if (N8N_CONFIG_FILES !== undefined) {
		const configFiles = N8N_CONFIG_FILES.split(',');
		if (!inTest) {
			console.log(`\nLoading configuration overwrites from:\n - ${configFiles.join('\n - ')}\n`);
		}

		config.loadFile(configFiles);
	}
}

config.validate({
	allowed: 'strict',
});

// eslint-disable-next-line import/no-default-export
export default config;
export type Config = typeof config;
