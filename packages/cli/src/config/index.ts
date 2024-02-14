import convict from 'convict';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { ApplicationError, setGlobalState } from 'n8n-workflow';
import { inTest, inE2ETests } from '@/constants';

if (inE2ETests) {
	// Skip loading config from env variables in end-to-end tests
	process.env.N8N_DIAGNOSTICS_ENABLED = 'false';
	process.env.N8N_PUBLIC_API_DISABLED = 'true';
	process.env.EXTERNAL_FRONTEND_HOOKS_URLS = '';
	process.env.N8N_PERSONALIZATION_ENABLED = 'false';
	process.env.N8N_AI_ENABLED = 'true';
} else if (inTest) {
	process.env.N8N_LOG_LEVEL = 'silent';
	process.env.N8N_PUBLIC_API_DISABLED = 'true';
	process.env.SKIP_STATISTICS_EVENTS = 'true';
} else {
	dotenv.config();
}

// Load schema after process.env has been overwritten
import { schema } from './schema';
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
						throw new ApplicationError('File not found', { extra: { fileName } });
					}
					throw error;
				}
				config.set(key, value);
			}
		}
	});
}

// Validate Configuration
config.validate({
	allowed: 'strict',
});
const userManagement = config.get('userManagement');
if (userManagement.jwtRefreshTimeoutHours >= userManagement.jwtSessionDurationHours) {
	console.warn(
		'N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS needs to smaller than N8N_USER_MANAGEMENT_JWT_DURATION_HOURS. Setting N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS to 0 for now.',
	);

	config.set('userManagement.jwtRefreshTimeoutHours', 0);
}

import colors from 'picocolors';
const executionProcess = config.getEnv('executions.process');
if (executionProcess) {
	console.error(
		colors.yellow('Please unset the deprecated env variable'),
		colors.bold(colors.yellow('EXECUTIONS_PROCESS')),
	);
}
if (executionProcess === 'own') {
	console.error(
		colors.bold(colors.red('Application failed to start because "Own" mode has been removed.')),
	);
	console.error(
		colors.red(
			'If you need the isolation and performance gains, please consider using queue mode instead.\n\n',
		),
	);
	process.exit(-1);
}

setGlobalState({
	defaultTimezone: config.getEnv('generic.timezone'),
});

// eslint-disable-next-line import/no-default-export
export default config;
