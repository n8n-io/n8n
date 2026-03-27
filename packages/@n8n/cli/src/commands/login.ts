import { Command, Flags } from '@oclif/core';
import { exec } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import * as http from 'node:http';
import * as os from 'node:os';
import * as readline from 'node:readline';

import { N8nClient, ApiError } from '../client';
import {
	readMultiConfig,
	writeMultiConfig,
	contextNameFromUrl,
	uniqueContextName,
	getCurrentContext,
} from '../config';
import type { ContextConfig } from '../config';

const DEFAULT_URL = 'http://localhost:5678';

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

	const openSockets = new Set<import('node:net').Socket>();

	const server = http.createServer((req, res) => {
		const url = new URL(req.url ?? '/', 'http://127.0.0.1');
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

	server.on('connection', (socket) => {
		openSockets.add(socket);
		socket.on('close', () => openSockets.delete(socket));
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
		waitForCallback: async () => await callbackPromise,
		close: () => {
			for (const socket of openSockets) socket.destroy();
			server.close();
		},
	};
}

export default class Login extends Command {
	static override description =
		'Connect to an n8n instance via OAuth login (or API key with --api-key)';

	static override examples = [
		'<%= config.bin %> login',
		'<%= config.bin %> login --url https://my-n8n.example.com',
		'<%= config.bin %> login --name production',
		'<%= config.bin %> login --api-key <key>',
		'<%= config.bin %> login --url https://my-n8n.example.com --api-key <key> --name prod',
	];

	static override flags = {
		url: Flags.string({
			char: 'u',
			description: 'n8n instance URL',
		}),
		apiKey: Flags.string({
			char: 'k',
			description: 'Use API key authentication instead of OAuth',
			aliases: ['api-key'],
		}),
		name: Flags.string({
			char: 'n',
			description: 'Context name for this connection (default: derived from URL)',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Login);
		const isTTY = Boolean(process.stdin.isTTY);

		// Resolve URL: flag > interactive prompt > default
		const url = flags.url ?? (isTTY ? await this.promptUrl() : this.getDefaultUrl());

		// Resolve context name: flag > interactive prompt > auto-generated from URL
		const contextName =
			flags.name ?? (isTTY ? await this.promptContextName(url) : this.resolveContextName(url));

		// API key auth only via explicit flag, otherwise OAuth
		if (flags.apiKey) {
			await this.loginWithApiKey(url, flags.apiKey, contextName);
		} else {
			await this.loginWithOAuth(url, contextName);
		}
	}

	private getDefaultUrl(): string {
		return getCurrentContext()?.config.url ?? DEFAULT_URL;
	}

	private async promptUrl(): Promise<string> {
		const defaultUrl = this.getDefaultUrl();
		const answer = await prompt(`n8n instance URL (${defaultUrl}): `);
		return answer || defaultUrl;
	}

	private resolveContextName(url: string): string {
		const baseName = contextNameFromUrl(url);
		const multi = readMultiConfig();
		return uniqueContextName(baseName, Object.keys(multi.contexts));
	}

	private async promptContextName(url: string): Promise<string> {
		const defaultName = this.resolveContextName(url);
		const answer = await prompt(`Context name (${defaultName}): `);
		return answer || defaultName;
	}

	private async revokeExistingTokens(contextName: string): Promise<void> {
		const multi = readMultiConfig();
		const existing = multi.contexts[contextName];
		if (existing?.url && existing.refreshToken) {
			try {
				const client = new N8nClient({ baseUrl: existing.url });
				await client.revokeToken(existing.refreshToken, 'refresh_token');
			} catch {
				// Best-effort
			}
		}
	}

	private saveContext(name: string, config: ContextConfig): void {
		const multi = readMultiConfig();
		multi.contexts[name] = config;
		multi.currentContext = name;
		writeMultiConfig(multi);
	}

	private async loginWithApiKey(
		url: string,
		apiKeyFlag?: string,
		contextName: string = 'default',
	): Promise<void> {
		const current = getCurrentContext();
		const keyHint = apiKeyFlag
			? ''
			: current?.config.apiKey
				? ` (${current.config.apiKey.slice(0, 12)}...${current.config.apiKey.slice(-4)})`
				: '';

		const apiKey = apiKeyFlag ?? ((await prompt(`API key${keyHint}: `)) || current?.config.apiKey);

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

		await this.revokeExistingTokens(contextName);
		this.saveContext(contextName, { url, apiKey });
		this.log(`Logged in successfully as context "${contextName}".`);
	}

	private async loginWithOAuth(url: string, contextName: string = 'default'): Promise<void> {
		// Generate PKCE
		const { codeVerifier, codeChallenge } = generatePkce();

		// Generate random state for CSRF protection
		const state = randomBytes(16).toString('hex');

		// Start local callback server on OS-assigned port
		const callbackServer = await startCallbackServer();

		const redirectUri = `http://127.0.0.1:${callbackServer.port}/callback`;

		// Build a friendly device name: strip .local/.lan suffixes from hostname
		const rawHostname = os.hostname();
		const deviceName = rawHostname.replace(/\.(local|lan|localdomain|home)$/i, '');

		const osNames: Record<string, string> = {
			darwin: 'macOS',
			win32: 'Windows',
			linux: 'Linux',
			freebsd: 'FreeBSD',
		};
		const osName = osNames[os.platform()] ?? os.platform();

		// Don't specify scopes — the server resolves available scopes
		// based on the authenticated user's role via getApiKeyScopesForRole()
		const authUrl =
			`${url}/oauth/authorize?` +
			'client_id=n8n-cli' +
			'&response_type=code' +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			`&code_challenge=${encodeURIComponent(codeChallenge)}` +
			'&code_challenge_method=S256' +
			`&state=${encodeURIComponent(state)}` +
			`&device_name=${encodeURIComponent(deviceName)}` +
			`&os=${encodeURIComponent(osName)}`;

		this.log('Opening browser for authorization...');
		this.log(`If the browser doesn't open, visit:\n${authUrl}\n`);
		openBrowser(authUrl);

		try {
			const authResponse = await callbackServer.waitForCallback();

			// Verify state matches
			if (authResponse.state !== state) {
				this.error('State mismatch — possible CSRF attack. Login aborted.');
			}

			this.log('Authorization received. Exchanging code for tokens...');

			// Exchange code for tokens
			const client = new N8nClient({ baseUrl: url });
			const tokens = await client.exchangeCodeForTokens(
				authResponse.code,
				codeVerifier,
				redirectUri,
			);

			await this.revokeExistingTokens(contextName);
			this.saveContext(contextName, {
				url,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				tokenExpiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
			});

			this.log(`Logged in successfully via OAuth as context "${contextName}".`);
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
