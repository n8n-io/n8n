/**
 * PROTOTYPE: client for a local demo gateway that proxies the Browserbase sessions API.
 * Enabled only when N8N_INSTANCE_AI_BROWSERBASE_GATEWAY_URL and _KEY are set. The gateway
 * holds the Browserbase API key and adds the project id and session defaults.
 */

export interface BrowserbaseSession {
	id: string;
	/** CDP WebSocket URL. Carries a per-session signing key, so never log it. */
	connectUrl: string;
	/** Browserbase region the session runs in, e.g. `us-west-2`. */
	region?: string;
	/** PROTOTYPE: the browser window size the gateway set, for the Live View frame's shape. */
	viewport?: { width: number; height: number };
}

export interface BrowserbaseLivePage {
	id: string;
	title: string;
	url: string;
	debuggerFullscreenUrl: string;
}

export interface CreateSessionOptions {
	/** Browserbase context to start from. With `persist`, the session writes back to it on release. */
	context?: { id: string; persist: boolean };
	/** A saved login only works in the region it was saved in. */
	region?: string;
}

export class BrowserbaseGatewayClient {
	constructor(
		private readonly baseUrl: string,
		private readonly apiKey: string,
	) {}

	static fromEnv(): BrowserbaseGatewayClient | undefined {
		const baseUrl = process.env.N8N_INSTANCE_AI_BROWSERBASE_GATEWAY_URL;
		const apiKey = process.env.N8N_INSTANCE_AI_BROWSERBASE_GATEWAY_KEY;
		if (!baseUrl || !apiKey) return undefined;
		return new BrowserbaseGatewayClient(baseUrl.replace(/\/$/, ''), apiKey);
	}

	async createSession(
		userId: string,
		options: CreateSessionOptions = {},
	): Promise<BrowserbaseSession> {
		return await this.request<BrowserbaseSession>(userId, 'POST', '/v1/sessions', {
			...(options.region ? { region: options.region } : {}),
			...(options.context ? { browserSettings: { context: options.context } } : {}),
		});
	}

	async getSessionStatus(userId: string, sessionId: string): Promise<string> {
		const session = await this.request<{ status: string }>(
			userId,
			'GET',
			`/v1/sessions/${encodeURIComponent(sessionId)}`,
		);
		return session.status;
	}

	async getLivePages(
		userId: string,
		sessionId: string,
	): Promise<{ debuggerFullscreenUrl: string; pages: BrowserbaseLivePage[] }> {
		return await this.request(userId, 'GET', `/v1/sessions/${encodeURIComponent(sessionId)}/debug`);
	}

	async releaseSession(userId: string, sessionId: string): Promise<void> {
		await this.request(userId, 'POST', `/v1/sessions/${encodeURIComponent(sessionId)}`, {
			status: 'REQUEST_RELEASE',
		});
	}

	/** PROTOTYPE (saved logins): a new, empty Browserbase context. */
	async createContext(userId: string): Promise<{ id: string }> {
		return await this.request<{ id: string }>(userId, 'POST', '/v1/contexts', {});
	}

	async deleteContext(userId: string, contextId: string): Promise<void> {
		await this.request(userId, 'DELETE', `/v1/contexts/${encodeURIComponent(contextId)}`);
	}

	/**
	 * PROTOTYPE: whether the gateway answers at all. Any HTTP response counts, an auth error
	 * included; only a network failure or timeout means it is down.
	 * TBD: the real gateway should expose a health route.
	 */
	async isReachable(timeoutMs = 3000): Promise<boolean> {
		try {
			await fetch(`${this.baseUrl}/`, { signal: AbortSignal.timeout(timeoutMs) });
			return true;
		} catch {
			return false;
		}
	}

	private async request<T>(
		userId: string,
		method: string,
		path: string,
		body?: unknown,
	): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers: {
				authorization: `Bearer ${this.apiKey}`,
				...(body === undefined ? {} : { 'content-type': 'application/json' }),
				'x-n8n-user-id': userId,
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		if (!response.ok) {
			const text = await response.text().catch(() => '');
			throw new Error(
				`Browserbase gateway ${method} ${path} failed with ${response.status} ${text}`,
			);
		}
		// DELETE answers 204 with no body.
		const text = await response.text();
		return (text ? JSON.parse(text) : undefined) as T;
	}
}
