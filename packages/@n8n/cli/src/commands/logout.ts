import { Command } from '@oclif/core';

import { N8nClient } from '../client';
import { deleteConfig, readConfig } from '../config';

export default class Logout extends Command {
	static override description = 'Disconnect from the current n8n instance (removes saved config)';

	static override examples = ['<%= config.bin %> logout'];

	async run(): Promise<void> {
		await this.parse(Logout);

		const existing = readConfig();
		if (!existing.url && !existing.apiKey && !existing.accessToken) {
			this.log('No active session found.');
			return;
		}

		// Revoke OAuth tokens server-side (best-effort)
		if (existing.url && existing.refreshToken) {
			try {
				const client = new N8nClient({ baseUrl: existing.url });
				await client.revokeToken(existing.refreshToken, 'refresh_token');
			} catch {
				// Best-effort — don't fail logout if revocation fails
			}
		}

		deleteConfig();
		this.log('Logged out successfully. Config removed.');
	}
}
