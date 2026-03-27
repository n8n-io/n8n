import { Command } from '@oclif/core';

import { getCurrentContext } from '../../config';

export default class ContextShow extends Command {
	static override description = 'Show details of the current context';

	static override examples = ['<%= config.bin %> context show'];

	async run(): Promise<void> {
		await this.parse(ContextShow);
		const ctx = getCurrentContext();

		if (!ctx) {
			this.log('No active context. Run "n8n-cli login" to add one.');
			return;
		}

		const auth = ctx.config.accessToken ? 'oauth' : ctx.config.apiKey ? 'api-key' : 'none';

		this.log(`Context:  ${ctx.name}`);
		this.log(`URL:      ${ctx.config.url ?? '(not set)'}`);
		this.log(`Auth:     ${auth}`);
		if (ctx.config.apiKey) {
			this.log(`API Key:  ****${ctx.config.apiKey.slice(-4)}`);
		}
		if (ctx.config.tokenExpiresAt) {
			const expires = new Date(ctx.config.tokenExpiresAt * 1000).toISOString();
			this.log(`Expires:  ${expires}`);
		}
	}
}
