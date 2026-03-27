import { Command } from '@oclif/core';

import { listContexts } from '../../config';

export default class ContextList extends Command {
	static override description = 'List all saved contexts';

	static override examples = ['<%= config.bin %> context list'];

	async run(): Promise<void> {
		await this.parse(ContextList);
		const contexts = listContexts();

		if (contexts.length === 0) {
			this.log('No contexts configured. Run "n8n-cli login" to add one.');
			return;
		}

		const nameWidth = Math.max(4, ...contexts.map((c) => c.name.length)) + 2;
		const urlWidth = Math.max(3, ...contexts.map((c) => (c.config.url ?? '').length)) + 2;

		this.log(`  ${'NAME'.padEnd(nameWidth)}${'URL'.padEnd(urlWidth)}AUTH`);

		for (const ctx of contexts) {
			const marker = ctx.current ? '*' : ' ';
			const name = ctx.name.padEnd(nameWidth);
			const url = (ctx.config.url ?? '(not set)').padEnd(urlWidth);
			const auth = ctx.config.accessToken ? 'oauth' : ctx.config.apiKey ? 'api-key' : 'none';
			this.log(`${marker} ${name}${url}${auth}`);
		}
	}
}
