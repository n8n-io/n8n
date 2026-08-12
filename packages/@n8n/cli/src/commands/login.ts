import { Command } from '@oclif/core';
import * as readline from 'node:readline';

import { N8nClient, ApiError } from '../client';
import { readConfig, writeConfig } from '../config';

async function prompt(question: string): Promise<string> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
	return await new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

export default class Login extends Command {
	static override description = 'Connect to an n8n instance (saves URL and API key)';

	static override examples = ['<%= config.bin %> login'];

	async run(): Promise<void> {
		await this.parse(Login);

		const existing = readConfig();
		const urlDefault = existing.url ? ` (${existing.url})` : '';
		const keyHint = existing.apiKey
			? ` (${existing.apiKey.slice(0, 12)}...${existing.apiKey.slice(-4)})`
			: '';

		const url = (await prompt(`n8n instance URL${urlDefault}: `)) || existing.url;
		const apiKey = (await prompt(`API key${keyHint}: `)) || existing.apiKey;

		if (!url) {
			this.error('URL is required.');
		}

		if (!apiKey) {
			this.error('API key is required.');
		}

		this.log('Verifying connection...');

		try {
			const client = new N8nClient({ baseUrl: url, apiKey });
			await client.listUsers();
		} catch (error) {
			if (error instanceof ApiError) {
				this.error(error.hint ? `${error.message}\nHint: ${error.hint}` : error.message);
			}
			const msg = error instanceof Error ? error.message : String(error);
			this.error(`Could not connect to ${url}: ${msg}`);
		}

		writeConfig({ url, apiKey });
		this.log('Logged in successfully. Config saved to ~/.n8n-cli/config.json');
	}
}
