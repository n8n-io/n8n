import { Command, Flags } from '@oclif/core';

import { N8nClient } from '../client';
import { deleteContext, deleteAllContexts, getCurrentContext, listContexts } from '../config';
import type { ContextConfig } from '../config';

export default class Logout extends Command {
	static override description = 'Disconnect from n8n instance(s) (removes saved context)';

	static override examples = [
		'<%= config.bin %> logout',
		'<%= config.bin %> logout --name staging',
		'<%= config.bin %> logout --all',
	];

	static override flags = {
		name: Flags.string({
			char: 'n',
			description: 'Log out a specific named context',
		}),
		all: Flags.boolean({
			description: 'Log out all contexts',
			default: false,
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Logout);

		if (flags.all) {
			await this.logoutAll();
			return;
		}

		const contextName = flags.name ?? getCurrentContext()?.name;

		if (!contextName) {
			this.log('No active session found.');
			return;
		}

		const contexts = listContexts();
		if (!contexts.some((c) => c.name === contextName)) {
			this.error(`Context "${contextName}" does not exist.`);
		}

		const config = deleteContext(contextName);
		if (config) {
			await this.revokeTokens(config);
		}

		this.log(`Logged out of context "${contextName}".`);

		const remaining = getCurrentContext();
		if (remaining) {
			this.log(`Active context is now "${remaining.name}".`);
		}
	}

	private async logoutAll(): Promise<void> {
		const configs = deleteAllContexts();

		if (configs.length === 0) {
			this.log('No active sessions found.');
			return;
		}

		for (const config of configs) {
			await this.revokeTokens(config);
		}
		this.log(`Logged out of ${configs.length} context(s).`);
	}

	private async revokeTokens(config: ContextConfig): Promise<void> {
		if (config.url && config.refreshToken) {
			try {
				const client = new N8nClient({ baseUrl: config.url });
				await client.revokeToken(config.refreshToken, 'refresh_token');
			} catch {
				// Best-effort
			}
		}
	}
}
