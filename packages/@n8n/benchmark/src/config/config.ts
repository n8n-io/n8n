import convict from 'convict';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = {
	testScenariosPath: {
		doc: 'The path to the scenarios',
		format: String,
		default: 'scenarios',
	},
	n8n: {
		baseUrl: {
			doc: 'The base URL for the n8n instance',
			format: String,
			default: 'http://localhost:5678',
			env: 'N8N_BASE_URL',
		},
		user: {
			email: {
				doc: 'The email address of the n8n user',
				format: String,
				default: 'benchmark-user@n8n.io',
				env: 'N8N_USER_EMAIL',
			},
			password: {
				doc: 'The password of the n8n user',
				format: String,
				default: 'VerySecret!123',
				env: 'N8N_USER_PASSWORD',
			},
		},
	},
	k6ExecutablePath: {
		doc: 'The path to the k6 binary',
		format: String,
		default: 'k6',
		env: 'K6_PATH',
	},
};

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig() {
	const config = convict(configSchema);

	config.validate({ allowed: 'strict' });

	return config;
}
