import { Command } from '@oclif/core';

import { getCurrentContext } from '../../config';

export default class ConfigShow extends Command {
	static override description = 'Show current CLI configuration';

	static override examples = ['<%= config.bin %> config show'];

	async run(): Promise<void> {
		await this.parse(ConfigShow);
		const ctx = getCurrentContext();

		if (!ctx) {
			this.log('No active context configured.');
			return;
		}

		const url = ctx.config.url ?? '(not set)';
		const apiKey = ctx.config.apiKey ? '****' + ctx.config.apiKey.slice(-4) : '(not set)';
		this.log(`Context:  ${ctx.name}`);
		this.log(`URL:      ${url}`);
		this.log(`API Key:  ${apiKey}`);
	}
}
