import { logger } from '@n8n/computer-use/logger';
import { EventEmitter } from 'node:events';

import { acquireTokens, LocalAuthError, login, setupOwner } from './local-auth';
import {
	buildLocalInstanceEnv,
	generateOwnerPassword,
	loadAnthropicApiKey,
	LOCAL_INSTANCE_URL,
	LOCAL_OWNER_EMAIL,
	OLLAMA_BASE_URL,
	resolveOllamaModel,
} from './local-instance-config';
import type { LocalInstanceProcess } from './local-instance-process';
import type { LocalInstanceStore } from './local-instance-store';
import type { LocalInstanceStatus } from '../../shared/types';
import type { OAuthFlow } from '../oauth/oauth-flow';

interface LocalInstanceManagerEvents {
	statusChanged: [status: LocalInstanceStatus];
}

export interface LocalInstanceManagerDeps {
	instanceProcess: LocalInstanceProcess;
	store: LocalInstanceStore;
	oauthFlow: OAuthFlow;
	/** Electron `app.getPath('userData')`, injected so this stays testable without Electron. */
	userDataDir: string;
}

/**
 * Orchestrates the embedded local instance: spawn, headless owner setup/login,
 * token acquisition, and lifecycle. The end state is a normal signed-in OAuth
 * session (via `OAuthFlow.adoptSession`), so everything downstream of auth is
 * shared with the remote-instance flow.
 */
export class LocalInstanceManager extends EventEmitter<LocalInstanceManagerEvents> {
	private readonly instanceProcess: LocalInstanceProcess;
	private readonly store: LocalInstanceStore;
	private readonly oauthFlow: OAuthFlow;
	private readonly userDataDir: string;
	private status: LocalInstanceStatus = { state: 'stopped', error: null };

	constructor(deps: LocalInstanceManagerDeps) {
		super();
		this.instanceProcess = deps.instanceProcess;
		this.store = deps.store;
		this.oauthFlow = deps.oauthFlow;
		this.userDataDir = deps.userDataDir;

		this.instanceProcess.on('exited', (code) => {
			// Intentional stops flip the state first; only a crash lands here while `running`.
			if (this.status.state === 'running') {
				this.setStatus({ state: 'error', error: `n8n exited unexpectedly (code ${String(code)})` });
			}
		});
	}

	getStatus(): LocalInstanceStatus {
		return this.status;
	}

	isEnabled(): boolean {
		return this.store.isEnabled();
	}

	/** User-initiated: start the instance, sign in headlessly, and persist the choice. */
	async signIn(): Promise<void> {
		await this.startAndSignIn();
		this.store.setEnabled(true);
	}

	/** App-start path: bring the instance back up when local mode is the persisted choice. */
	async ensureRunningAndSignedIn(): Promise<void> {
		if (!this.store.isEnabled()) return;
		try {
			await this.startAndSignIn();
		} catch (error) {
			// Status already carries the error; app startup must not fail with it.
			logger.error('Local instance startup failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** Leave local mode: stop the instance and stop auto-starting it (credentials are kept). */
	async disable(): Promise<void> {
		this.store.setEnabled(false);
		await this.stop();
	}

	async stop(): Promise<void> {
		this.setStatus({ state: 'stopped', error: null });
		await this.instanceProcess.stop();
	}

	private async startAndSignIn(): Promise<void> {
		this.setStatus({ state: 'starting', error: null });
		try {
			const anthropicApiKey = loadAnthropicApiKey();
			if (!anthropicApiKey) await this.assertOllamaReady();

			await this.instanceProcess.start(
				buildLocalInstanceEnv({ userDataDir: this.userDataDir, anthropicApiKey }),
			);

			// A persisted local session keeps working once the instance is back up
			// (token refresh runs against it); only a missing session needs the full flow.
			const authStatus = this.oauthFlow.getStatus();
			if (authStatus.state !== 'signedIn' || authStatus.instanceUrl !== LOCAL_INSTANCE_URL) {
				const authCookie = await this.authenticate();
				const tokens = await acquireTokens(LOCAL_INSTANCE_URL, authCookie);
				this.oauthFlow.adoptSession(LOCAL_INSTANCE_URL, tokens);
			}

			// Debug aid for the local prototype: lets a developer log into the
			// instance's web UI (http://127.0.0.1:5680) to inspect it directly.
			const credentials = this.store.getCredentials();
			if (credentials) {
				logger.debug('Local instance owner credentials', { ...credentials });
			}

			this.setStatus({ state: 'running', error: null });
		} catch (error) {
			this.setStatus({
				state: 'error',
				error: error instanceof Error ? error.message : String(error),
			});
			await this.instanceProcess.stop().catch(() => {});
			throw error;
		}
	}

	/** A fresh auth cookie for opening the instance's web UI pre-authenticated. */
	async getUiAuthCookie(): Promise<string> {
		if (!this.instanceProcess.isRunning()) {
			throw new Error('Local instance is not running');
		}
		return await this.authenticate();
	}

	/** Owner login with stored credentials, or first-run owner setup. Returns the auth cookie. */
	private async authenticate(): Promise<string> {
		const stored = this.store.getCredentials();
		if (!stored) return await this.setUpNewOwner();

		try {
			return await login(LOCAL_INSTANCE_URL, stored);
		} catch (error) {
			const dbMayBeFresh = error instanceof LocalAuthError && error.code === 'invalid_credentials';
			if (!dbMayBeFresh) throw error;
			// A recreated instance DB accepts owner setup again; if it doesn't, the
			// password really was changed in the DB and the original error stands.
			try {
				return await this.setUpNewOwner();
			} catch {
				throw error;
			}
		}
	}

	private async setUpNewOwner(): Promise<string> {
		const credentials = { email: LOCAL_OWNER_EMAIL, password: generateOwnerPassword() };
		const cookie = await setupOwner(LOCAL_INSTANCE_URL, credentials);
		this.store.setCredentials(credentials);
		return cookie;
	}

	/** Without an Anthropic key the instance runs on local ollama — verify it can. */
	private async assertOllamaReady(): Promise<void> {
		const model = resolveOllamaModel();
		let models: Array<{ name?: string }>;
		try {
			const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
				signal: AbortSignal.timeout(3_000),
			});
			if (!response.ok) throw new Error(`status ${response.status}`);
			models = ((await response.json()) as { models?: Array<{ name?: string }> }).models ?? [];
		} catch {
			throw new Error(
				`Ollama is not reachable at ${OLLAMA_BASE_URL} — start it, or set ANTHROPIC_API_KEY`,
			);
		}

		const installed = models.some(({ name }) => name === model || name?.startsWith(`${model}:`));
		if (!installed) {
			throw new Error(`Ollama model "${model}" is not installed — run: ollama pull ${model}`);
		}
	}

	private setStatus(status: LocalInstanceStatus): void {
		this.status = status;
		this.emit('statusChanged', status);
	}
}
