/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-console */
import convict from 'convict';
import dotenv from 'dotenv';
import { schema } from './schema';

dotenv.config();

const config = convict(schema);

config.getEnv = config.get;

// Overwrite default configuration with settings which got defined in
// optional configuration files
if (process.env.N8N_CONFIG_FILES !== undefined) {
	const configFiles = process.env.N8N_CONFIG_FILES.split(',');
	if (process.env.NODE_ENV !== 'test') {
		console.log(`\nLoading configuration overwrites from:\n - ${configFiles.join('\n - ')}\n`);
	}

	config.loadFile(configFiles);
}

config.validate({
	allowed: 'strict',
});

export = config;
