import { Command } from '@oclif/core';

import { deleteConfig, readConfig } from '../config';

export default class Logout extends Command {
	static override description = 'Disconnect from the current n8n instance (removes saved config)';

	static override examples = ['<%= config.bin %> logout'];

	async run(): Promise<void> {
		await this.parse(Logout);

		const existing = readConfig();
		if (!existing.url && !existing.apiKey) {
			this.log('No active session found.');
			return;
		}

		deleteConfig();
		this.log('Logged out successfully. Config removed.');
	}
}
