import { logger } from '@n8n/computer-use/logger';
import { EventEmitter } from 'node:events';

import type { OAuthCallback } from './oauth-callback';
import {
	buildAuthorizeUrl,
	discover,
	exchangeCode,
	OAuthError,
	refreshTokens,
	type AuthServerMetadata,
	type OAuthTokens,
} from './oauth-client';
import { OAUTH_CONFIG } from './oauth-config';
import { createCodeVerifier, createState, deriveCodeChallenge } from './pkce';
import type { TokenStore } from './token-store';
import type { AuthStatus } from '../../shared/types';

/** Refresh proactively this long before the access token's reported expiry. */
const EXPIRY_SKEW_MS = 60_000;

interface PendingAuthorization {
	state: string;
	codeVerifier: string;
	instanceUrl: string;
	metadata: AuthServerMetadata;
}

interface OAuthFlowEvents {
	authStatusChanged: [status: AuthStatus];
}

export interface OAuthFlowDeps {
	store: TokenStore;
	/** Opens a URL in the user's default browser (e.g. shell.openExternal). */
	openExternal: (url: string) => Promise<void>;
	/** Injected so time is explicit (and overridable); defaults to Date.now. */
	now?: () => number;
}

/**
 * Drives the OAuth2 authorization-code + PKCE flow for a public native client.
 * Side effects (browser, persistence, clock) are injected; the rest is a small
 * state machine that emits `authStatusChanged` as the user signs in/out.
 */
export class OAuthFlow extends EventEmitter<OAuthFlowEvents> {
	private readonly store: TokenStore;
	private readonly openExternal: (url: string) => Promise<void>;
	private readonly now: () => number;
	private pending: PendingAuthorization | null = null;
	private status: AuthStatus;

	constructor(deps: OAuthFlowDeps) {
		super();
		this.store = deps.store;
		this.openExternal = deps.openExternal;
		this.now = deps.now ?? (() => Date.now());

		const session = this.store.getSession();
		this.status = session
			? { state: 'signedIn', instanceUrl: session.instanceUrl, error: null }
			: { state: 'signedOut', instanceUrl: null, error: null };
	}

	getStatus(): AuthStatus {
		return this.status;
	}

	/** Begin sign-in: discover the AS, then open the system browser to the authorize URL. */
	async signIn(rawInstanceUrl: string): Promise<void> {
		const instanceUrl = normalizeBaseUrl(rawInstanceUrl);
		this.setStatus({ state: 'authorizing', instanceUrl, error: null });

		try {
			const metadata = await discover(instanceUrl);
			const codeVerifier = createCodeVerifier();
			const state = createState();
			this.pending = { state, codeVerifier, instanceUrl, metadata };

			await this.openExternal(
				buildAuthorizeUrl(metadata, {
					codeChallenge: deriveCodeChallenge(codeVerifier),
					state,
					scopes: [...OAUTH_CONFIG.scopes],
				}),
			);
		} catch (error) {
			// Record the failed state for listeners, and rethrow so the `oauth:signIn`
			// caller learns startup failed instead of seeing a misleading success.
			this.failAuthorization(error);
			throw error;
		}
	}

	/** Handle the redirect deep link: verify `state`, exchange the code, persist tokens. */
	async handleCallback(oauthCallback: OAuthCallback): Promise<void> {
		const pending = this.pending;
		if (!pending) {
			logger.warn('Received OAuth callback with no pending authorization');
			return;
		}
		if (oauthCallback.state !== pending.state) {
			this.failAuthorization(new OAuthError('state_mismatch', 'Callback state did not match'));
			return;
		}
		this.pending = null;

		if (oauthCallback.error || !oauthCallback.code) {
			this.failAuthorization(
				new OAuthError(oauthCallback.error ?? 'invalid_callback', oauthCallback.errorDescription),
			);
			return;
		}

		try {
			const tokens = await exchangeCode(pending.metadata, {
				code: oauthCallback.code,
				codeVerifier: pending.codeVerifier,
			});
			this.persist(pending.instanceUrl, tokens);
			this.setStatus({ state: 'signedIn', instanceUrl: pending.instanceUrl, error: null });
		} catch (error) {
			this.failAuthorization(error);
		}
	}

	/**
	 * Return a usable access token, refreshing when expired (or when `force`d). Returns `null`
	 * when there is no session or the refresh grant fails — the caller routes back to sign-in.
	 */
	async getValidAccessToken({ force = false }: { force?: boolean } = {}): Promise<string | null> {
		const session = this.store.getSession();
		if (!session) return null;

		const stillFresh =
			session.expiresAt === undefined || session.expiresAt - this.now() > EXPIRY_SKEW_MS;
		if (!force && stillFresh) return session.accessToken;
		if (!session.refreshToken) return stillFresh ? session.accessToken : null;

		try {
			const metadata = await discover(session.instanceUrl);
			const tokens = await refreshTokens(metadata, session.refreshToken);
			this.persist(session.instanceUrl, tokens, session.refreshToken);
			return tokens.access_token;
		} catch (error) {
			if (error instanceof OAuthError && error.code === 'invalid_grant') {
				this.store.clearSession();
				this.setStatus({ state: 'signedOut', instanceUrl: null, error: null });
			}
			return null;
		}
	}

	signOut(): void {
		// Drop any in-flight authorization too, so a late callback can't re-authenticate after logout.
		this.pending = null;
		this.store.clearSession();
		this.setStatus({ state: 'signedOut', instanceUrl: null, error: null });
	}

	private persist(instanceUrl: string, tokens: OAuthTokens, previousRefreshToken?: string): void {
		this.store.setSession({
			instanceUrl,
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token ?? previousRefreshToken,
			expiresAt: tokens.expires_in ? this.now() + tokens.expires_in * 1000 : undefined,
		});
	}

	private failAuthorization(error: unknown): void {
		this.pending = null;
		const message = error instanceof Error ? error.message : String(error);
		logger.error('OAuth authorization failed', { error: message });
		this.setStatus({ state: 'error', instanceUrl: this.status.instanceUrl, error: message });
	}

	private setStatus(status: AuthStatus): void {
		this.status = status;
		this.emit('authStatusChanged', status);
	}
}

/** Trim whitespace and trailing slashes so the base URL composes cleanly. */
function normalizeBaseUrl(rawUrl: string): string {
	return rawUrl.trim().replace(/\/+$/, '');
}
