import { Args, Command } from '@oclif/core';

import { readConfig, writeConfig } from '../../config';

export default class ConfigSetApiKey extends Command {
	static override description = 'Set the API key for authentication';

	static override examples = ['<%= config.bin %> config set-api-key n8n_api_xxx'];

	static override args = {
		key: Args.string({ description: 'n8n API key', required: true }),
	};

	async run(): Promise<void> {
		const { args } = await this.parse(ConfigSetApiKey);
		const config = readConfig();
		config.apiKey = args.key;
		writeConfig(config);
		this.log('API key saved.');
	}
}
