import { UnexpectedError } from 'n8n-workflow';

interface CachedToken {
	accessToken: string;
	tokenType: string;
	/** Absolute timestamp (ms) after which we should proactively refresh. */
	refreshAfter: number;
}

/**
 * Decode the payload of a JWT without verifying the signature.
 * Returns the `exp` claim (seconds since epoch) or undefined.
 */
function getJwtExpiry(jwt: string): number | undefined {
	const parts = jwt.split('.');
	if (parts.length !== 3) return undefined;
	try {
		const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as {
			exp?: number;
		};
		return typeof payload.exp === 'number' ? payload.exp : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Caches a proxy auth token and transparently refreshes it before expiry.
 *
 * The AI assistant service issues short-lived JWTs (default 10 min).
 * During a single orchestration run the same token is reused across the
 * orchestrator, all sub-agents, and potential HITL resume flows.  Without
 * proactive refresh the token can expire mid-run, causing 401 errors.
 *
 * The TTL is derived from the JWT `exp` claim so the client automatically
 * adapts when the server changes its token lifetime.
 *
 * One instance is created per `createExecutionEnvironment()` call and
 * shared by the Anthropic model, Brave Search proxy, and LangSmith
 * tracing proxy.
 */
export class ProxyTokenManager {
	private cached: CachedToken | null = null;

	private refreshPromise: Promise<CachedToken> | null = null;

	constructor(
		private readonly fetchToken: () => Promise<{
			accessToken: string;
			tokenType: string;
		}>,
		private readonly refreshThreshold: number = 0.8,
	) {}

	async getAuthHeaders(): Promise<Record<string, string>> {
		const token = await this.getValidToken();
		return { Authorization: `${token.tokenType} ${token.accessToken}` };
	}

	private async getValidToken(): Promise<CachedToken> {
		if (this.cached && !this.isExpiringSoon()) return this.cached;
		return await this.refresh();
	}

	private isExpiringSoon(): boolean {
		if (!this.cached) return true;
		return Date.now() >= this.cached.refreshAfter;
	}

	private async refresh(): Promise<CachedToken> {
		if (this.refreshPromise) return await this.refreshPromise;
		this.refreshPromise = this.doRefresh();
		try {
			return await this.refreshPromise;
		} finally {
			this.refreshPromise = null;
		}
	}

	private async doRefresh(): Promise<CachedToken> {
		const result = await this.fetchToken();
		const now = Date.now();
		const exp = getJwtExpiry(result.accessToken);
		if (!exp) throw new UnexpectedError('Proxy token JWT is missing the exp claim');
		const ttl = exp * 1000 - now;
		this.cached = {
			...result,
			refreshAfter: now + ttl * this.refreshThreshold,
		};
		return this.cached;
	}
}
