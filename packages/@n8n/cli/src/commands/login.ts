import { Command } from '@oclif/core';
import * as readline from 'node:readline';

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

		// Validate connection by hitting the users endpoint
		let baseUrl = url.replace(/\/+$/, '');
		if (!baseUrl.endsWith('/api/v1')) {
			baseUrl = `${baseUrl}/api/v1`;
		}

		this.log('Verifying connection...');

		try {
			const response = await fetch(`${baseUrl}/users`, {
				headers: new Headers({ 'X-N8N-API-KEY': apiKey, Accept: 'application/json' }),
			});

			if (response.status === 401) {
				this.error('Authentication failed. Check your API key.');
			}

			if (!response.ok) {
				this.error(
					`Connection failed (${response.status}). Check the URL and ensure the instance is running.`,
				);
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			this.error(`Could not connect to ${url}: ${msg}`);
		}

		writeConfig({ url, apiKey });
		this.log('Logged in successfully. Config saved to ~/.n8n-cli/config.json');
	}
}
