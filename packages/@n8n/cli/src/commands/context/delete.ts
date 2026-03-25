import { Args, Command } from '@oclif/core';

import { N8nClient } from '../../client';
import { deleteContext, listContexts } from '../../config';

export default class ContextDelete extends Command {
	static override description = 'Remove a saved context';

	static override examples = ['<%= config.bin %> context delete staging'];

	static override args = {
		name: Args.string({ description: 'Context name to delete', required: true }),
	};

	async run(): Promise<void> {
		const { args } = await this.parse(ContextDelete);

		const contexts = listContexts();
		if (!contexts.some((c) => c.name === args.name)) {
			this.error(`Context "${args.name}" does not exist.`);
		}

		const config = deleteContext(args.name);

		// Best-effort revoke OAuth tokens
		if (config?.url && config.refreshToken) {
			try {
				const client = new N8nClient({ baseUrl: config.url });
				await client.revokeToken(config.refreshToken, 'refresh_token');
			} catch {
				// Best-effort
			}
		}

		this.log(`Context "${args.name}" deleted.`);
	}
}
