import { Command } from '@oclif/core';

import { readConfig } from '../../config';

export default class ConfigShow extends Command {
	static override description = 'Show current CLI configuration';

	static override examples = ['<%= config.bin %> config show'];

	async run(): Promise<void> {
		await this.parse(ConfigShow);
		const config = readConfig();
		const url = config.url ?? '(not set)';
		const apiKey = config.apiKey ? '****' + config.apiKey.slice(-4) : '(not set)';
		this.log(`URL:      ${url}`);
		this.log(`API Key:  ${apiKey}`);
	}
}
