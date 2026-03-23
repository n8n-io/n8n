import { Command, Flags } from '@oclif/core';
import { createHash, randomBytes } from 'node:crypto';
import { exec } from 'node:child_process';
import * as http from 'node:http';
import * as readline from 'node:readline';

import { N8nClient, ApiError } from '../client';
import { readConfig, writeConfig } from '../config';

function generatePkce(): { codeVerifier: string; codeChallenge: string } {
	// 32 bytes = 43 chars in base64url (RFC 7636 recommends 43-128)
	const codeVerifier = randomBytes(32).toString('base64url');
	const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
	return { codeVerifier, codeChallenge };
}

function openBrowser(url: string): void {
	const platform = process.platform;
	const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';

	exec(`${cmd} "${url}"`, (error) => {
		if (error) {
			// Silently fail — we print the URL for manual opening
		}
	});
}

async function prompt(question: string): Promise<string> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
	return await new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

async function startCallbackServer(): Promise<{
	port: number;
	waitForCallback: () => Promise<{ code: string; state: string }>;
	close: () => void;
}> {
	let resolveCallback: (value: { code: string; state: string }) => void;
	let rejectCallback: (reason: Error) => void;
	const callbackPromise = new Promise<{ code: string; state: string }>((resolve, reject) => {
		resolveCallback = resolve;
		rejectCallback = reject;
	});

	const server = http.createServer((req, res) => {
		const url = new URL(req.url ?? '/', `http://127.0.0.1`);
		if (url.pathname !== '/callback') {
			res.writeHead(404);
			res.end();
			return;
		}

		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		const error = url.searchParams.get('error');
		const errorDescription = url.searchParams.get('error_description');

		if (error) {
			res.writeHead(200, { 'Content-Type': 'text/html' });
			res.end(
				`<html><body><h1>Authorization Failed</h1><p>${errorDescription ?? error}</p><p>You can close this window.</p></body></html>`,
			);
			rejectCallback(new Error(errorDescription ?? error));
			return;
		}

		if (!code || !state) {
			res.writeHead(400, { 'Content-Type': 'text/html' });
			res.end('<html><body><h1>Error</h1><p>Missing code or state parameter.</p></body></html>');
			rejectCallback(new Error('Missing code or state in callback'));
			return;
		}

		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(
			'<html><body><h1>Login Successful</h1><p>You can close this window and return to the terminal.</p></body></html>',
		);
		resolveCallback({ code, state });
	});

	// Wait for server to start listening before reading the assigned port
	const port = await new Promise<number>((resolve, reject) => {
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			const assignedPort = typeof address === 'object' && address ? address.port : 0;
			resolve(assignedPort);
		});
		server.on('error', reject);
	});

	return {
		port,
		waitForCallback: () => callbackPromise,
		close: () => server.close(),
	};
}

export default class Login extends Command {
	static override description =
		'Connect to an n8n instance via OAuth login (or API key with --api-key)';

	static override examples = ['<%= config.bin %> login', '<%= config.bin %> login --api-key <key>'];

	static override flags = {
		apiKey: Flags.string({
			char: 'k',
			description: 'Use API key authentication instead of OAuth',
			aliases: ['api-key'],
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Login);

		if (flags.apiKey) {
			await this.loginWithApiKey(flags.apiKey);
			return;
		}

		await this.loginWithOAuth();
	}

	private async loginWithApiKey(apiKeyFlag?: string): Promise<void> {
		const existing = readConfig();
		const urlDefault = existing.url ? ` (${existing.url})` : '';
		const keyHint = apiKeyFlag
			? ''
			: existing.apiKey
				? ` (${existing.apiKey.slice(0, 12)}...${existing.apiKey.slice(-4)})`
				: '';

		const url = (await prompt(`n8n instance URL${urlDefault}: `)) || existing.url;
		const apiKey = apiKeyFlag ?? ((await prompt(`API key${keyHint}: `)) || existing.apiKey);

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

	private async loginWithOAuth(): Promise<void> {
		const existing = readConfig();
		const urlDefault = existing.url ? ` (${existing.url})` : '';

		const url = (await prompt(`n8n instance URL${urlDefault}: `)) || existing.url;

		if (!url) {
			this.error('URL is required.');
		}

		// Generate PKCE
		const { codeVerifier, codeChallenge } = generatePkce();

		// Generate random state for CSRF protection
		const state = randomBytes(16).toString('hex');

		// Start local callback server on OS-assigned port
		const callbackServer = await startCallbackServer();

		const redirectUri = `http://127.0.0.1:${callbackServer.port}/callback`;

		// Don't specify scopes — the server resolves available scopes
		// based on the authenticated user's role via getApiKeyScopesForRole()
		const authUrl =
			`${url}/oauth/authorize?` +
			`client_id=n8n-cli` +
			`&response_type=code` +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			`&code_challenge=${encodeURIComponent(codeChallenge)}` +
			`&code_challenge_method=S256` +
			`&state=${encodeURIComponent(state)}`;

		this.log('Opening browser for authorization...');
		this.log(`If the browser doesn't open, visit:\n${authUrl}\n`);
		openBrowser(authUrl);

		try {
			const callback = await callbackServer.waitForCallback();

			// Verify state matches
			if (callback.state !== state) {
				this.error('State mismatch — possible CSRF attack. Login aborted.');
			}

			this.log('Authorization received. Exchanging code for tokens...');

			// Exchange code for tokens
			const client = new N8nClient({ baseUrl: url });
			const tokens = await client.exchangeCodeForTokens(callback.code, codeVerifier, redirectUri);

			// Save to config
			writeConfig({
				url,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				tokenExpiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
			});

			this.log('Logged in successfully via OAuth. Config saved to ~/.n8n-cli/config.json');
		} catch (error) {
			if (error instanceof ApiError) {
				this.error(error.hint ? `${error.message}\nHint: ${error.hint}` : error.message);
			}
			const msg = error instanceof Error ? error.message : String(error);
			this.error(`OAuth login failed: ${msg}`);
		} finally {
			callbackServer.close();
		}
	}
}
