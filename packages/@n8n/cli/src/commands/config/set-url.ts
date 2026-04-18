import { Args, Command } from '@oclif/core';

import { readConfig, writeConfig } from '../../config';

export default class ConfigSetUrl extends Command {
	static override description = 'Set the n8n instance URL';

	static override examples = [
		'<%= config.bin %> config set-url https://my-n8n.app.n8n.cloud',
		'<%= config.bin %> config set-url http://localhost:5678',
	];

	static override args = {
		url: Args.string({ description: 'n8n instance URL', required: true }),
	};

	async run(): Promise<void> {
		const { args } = await this.parse(ConfigSetUrl);
		const config = readConfig();
		config.url = args.url;
		writeConfig(config);
		this.log(`URL set to ${args.url}`);
	}
}
