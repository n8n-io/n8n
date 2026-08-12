import { Service } from '@n8n/di';
import { nanoid } from 'nanoid';

/** How long a setup link stays usable before the agent has to mint a new one. */
const SETUP_TOKEN_TTL_MS = 15 * 60 * 1000;

interface SetupToken {
	sessionKey: string;
	expiresAt: number;
}

/**
 * Issues the opaque tokens that stand in for a browser session on the public
 * setup page. The token is the capability: whoever holds it may bind a browser
 * to that session, so the page needs no n8n login and a Slack user without an
 * n8n account can still connect.
 *
 * In-memory and process-local, mirroring the session registry it points at — a
 * restart drops both together.
 */
@Service()
export class AgentBrowserSetupTokenService {
	private readonly bySessionKey = new Map<string, string>();

	private readonly byToken = new Map<string, SetupToken>();

	/**
	 * Return the session's current token, minting one only when it has none or
	 * the old one has expired.
	 *
	 * Stability matters: the agent may reach for the browser several times
	 * before the user finishes connecting, and a fresh token each time would
	 * leave them clicking a link that no longer resolves.
	 */
	issue(sessionKey: string): string {
		this.prune();

		const existing = this.bySessionKey.get(sessionKey);
		if (existing) return existing;

		const token = `bus_${nanoid(32)}`;
		this.bySessionKey.set(sessionKey, token);
		this.byToken.set(token, { sessionKey, expiresAt: Date.now() + SETUP_TOKEN_TTL_MS });
		return token;
	}

	resolve(token: string): string | null {
		const entry = this.byToken.get(token);
		if (!entry) return null;

		if (entry.expiresAt <= Date.now()) {
			this.revoke(token);
			return null;
		}

		return entry.sessionKey;
	}

	private revoke(token: string): void {
		const entry = this.byToken.get(token);
		if (!entry) return;

		this.byToken.delete(token);
		if (this.bySessionKey.get(entry.sessionKey) === token) {
			this.bySessionKey.delete(entry.sessionKey);
		}
	}

	private prune(): void {
		const now = Date.now();
		for (const [token, entry] of this.byToken) {
			if (entry.expiresAt <= now) this.revoke(token);
		}
	}
}
