import type { Request, Response } from 'express';

/** Opt-in: with the flag off the hosted chat page renders as a single document, as before. */
export function isChatOAuth2Enabled(): boolean {
	return process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2 === 'true';
}

/** Query flag that asks the `setup` GET for the inner render instead of the shell. */
export const CHAT_SHELL_INNER_PARAM = 'n8nShellInner';

/**
 * Applied both as the iframe's attribute and as the inner response's CSP. No
 * `allow-same-origin`, so the frame has no origin: no cookies, no `localStorage`, no
 * `BroadcastChannel` on the real origin. `allow-popups` is for `target="_blank"` links
 * in bot replies; without `allow-popups-to-escape-sandbox` those popups inherit this
 * sandbox, so it costs no isolation. Matches the form shell's effective set.
 */
export const CHAT_FRAME_SANDBOX = 'allow-scripts allow-forms allow-modals allow-popups';

/**
 * Honour the inner-render flag only for iframe navigations. Requires `Sec-Fetch-Dest:
 * iframe` explicitly — a request with the header absent (any non-browser client, or a
 * proxy that strips it) still lands on the trusted shell rather than being treated as
 * one.
 */
export function isShellInnerRequest(req: Request): boolean {
	if (req.query[CHAT_SHELL_INNER_PARAM] !== '1') return false;
	return req.headers['sec-fetch-dest'] === 'iframe';
}

/** Relative, so the frame's POST resolves to the same webhook behind any host or prefix. */
export function buildInnerFrameSrc(req: Request): string {
	const [path, query] = req.originalUrl.split('?');
	const params = new URLSearchParams(query);
	params.set(CHAT_SHELL_INNER_PARAM, '1');
	return `${path}?${params.toString()}`;
}

/** Query flag that asks the `setup` GET for the token-refresh leg instead of a page. */
export const CHAT_REFRESH_PARAM = 'n8nChatRefresh';

/**
 * Custom header the shell's refresh `fetch` sets. A cross-origin page cannot set it
 * without a CORS preflight this endpoint never answers, so requiring it is what stops
 * another site from driving the leg with the visitor's cookies.
 */
export const CHAT_REFRESH_HEADER = 'x-n8n-chat-refresh';

/** Relative, so the shell's refresh `fetch` stays same-origin behind any host or prefix. */
export function buildChatRefreshUrl(req: Request): string {
	const [path, query] = req.originalUrl.split('?');
	const params = new URLSearchParams(query);
	params.set(CHAT_REFRESH_PARAM, '1');
	return `${path}?${params.toString()}`;
}

// Carries the AS access token across the single same-site redirect from the AS
// callback to the clean inner-frame URL, so `code`/`state` never reach the
// author-shaped chat widget. The token is otherwise already embedded in the
// frame's HTML (sent back as `x-auth-token` on every message), so this cookie
// is not a new exposure. The expiry rides along because the shell has to know
// when to refresh and the frame's HTML carries the token alone.
const CHAT_OAUTH_COOKIE_NAME = 'n8n-chat-oauth';

/**
 * Holds the grant's refresh token for the life of the hosted page. `httpOnly` is the
 * whole point: neither document may read it, so it never enters any HTML and never
 * enters any script scope. Only the refresh leg, server-side, ever sees it.
 *
 * Names must stay in step with `CHAT_OAUTH_REFRESH_COOKIE_NAME` in
 * `packages/cli/src/constants.ts`, which strips both from every other webhook.
 */
const CHAT_OAUTH_REFRESH_COOKIE_NAME = 'n8n-chat-oauth-refresh';

/** Matches `REFRESH_TOKEN_EXPIRY_MS` in the AS: the cookie must not outlive the grant. */
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Derive `secure` from the request scheme (honouring x-forwarded-proto) rather
 * than config, so the cookie is actually sent back over http in dev while
 * staying Secure over https.
 */
function isSecureRequest(req: Request): boolean {
	const forwardedProto = req.headers['x-forwarded-proto'];
	// A proxy chain sends this as a comma-separated list (closest proxy first), and
	// Node normalises a repeated header into an array — handle both, and take only
	// the first hop so a later "http" in the chain can't mask an https client leg.
	const firstValue = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
	const proto = firstValue?.split(',')[0]?.trim() || req.protocol;
	return proto === 'https';
}

function chatOAuthCookieOptions(req: Request, resourceUrl: string) {
	return {
		httpOnly: true,
		sameSite: 'lax' as const, // must be Lax: sent on our own top-level redirect → GET
		secure: isSecureRequest(req),
		path: new URL(resourceUrl).pathname,
	};
}

/** What the one-hop cookie carries: the access token and its absolute expiry in ms. */
export type ChatOAuthCookiePayload = { token: string; expiresAt: number };

// Short keys because a cookie value is capped at ~4KB and the token already
// takes most of it.
type SerializedPayload = { t: string; e: number };

export function setChatOAuthToken(
	res: Response,
	req: Request,
	resourceUrl: string,
	payload: ChatOAuthCookiePayload,
): void {
	const value: SerializedPayload = { t: payload.token, e: payload.expiresAt };
	res.cookie(CHAT_OAUTH_COOKIE_NAME, JSON.stringify(value), {
		...chatOAuthCookieOptions(req, resourceUrl),
		maxAge: 60_000, // one redirect hop; short by design
	});
}

/**
 * Decode a cookie value, or `null` when it isn't valid percent-encoding. A
 * value we can't read is treated as no cookie at all rather than throwing out
 * of the request.
 */
function decodeCookieValue(value: string): string | null {
	try {
		return decodeURIComponent(value.trim());
	} catch {
		return null;
	}
}

/**
 * Read one cookie by exact name. Split rather than matched, so `n8n-chat-oauth` can't
 * pick up `n8n-chat-oauth-refresh`, whose name begins with it.
 */
function readRawCookie(req: Request, name: string): string | null {
	for (const pair of (req.headers.cookie ?? '').split(';')) {
		const separator = pair.indexOf('=');
		if (separator === -1) continue;
		if (pair.slice(0, separator).trim() !== name) continue;
		return decodeCookieValue(pair.slice(separator + 1));
	}
	return null;
}

function isSerializedPayload(value: unknown): value is SerializedPayload {
	if (typeof value !== 'object' || value === null) return false;
	const { t, e } = value as Partial<SerializedPayload>;
	return typeof t === 'string' && t !== '' && typeof e === 'number' && Number.isFinite(e);
}

export function readChatOAuthToken(req: Request): ChatOAuthCookiePayload | null {
	const raw = readRawCookie(req, CHAT_OAUTH_COOKIE_NAME);
	if (!raw) return null;
	// Anything that isn't the payload shape — a cookie from another writer, a truncated
	// value — is treated as absent, so the caller restarts the flow instead of
	// scheduling off a number it invented.
	try {
		const parsed: unknown = JSON.parse(raw);
		return isSerializedPayload(parsed) ? { token: parsed.t, expiresAt: parsed.e } : null;
	} catch {
		return null;
	}
}

export function clearChatOAuthToken(res: Response, req: Request, resourceUrl: string): void {
	res.clearCookie(CHAT_OAUTH_COOKIE_NAME, chatOAuthCookieOptions(req, resourceUrl));
}

export function setChatRefreshToken(
	res: Response,
	req: Request,
	resourceUrl: string,
	refreshToken: string,
): void {
	res.cookie(CHAT_OAUTH_REFRESH_COOKIE_NAME, refreshToken, {
		...chatOAuthCookieOptions(req, resourceUrl),
		maxAge: REFRESH_COOKIE_MAX_AGE_MS,
	});
}

export function readChatRefreshToken(req: Request): string | null {
	return readRawCookie(req, CHAT_OAUTH_REFRESH_COOKIE_NAME);
}

export function clearChatRefreshToken(res: Response, req: Request, resourceUrl: string): void {
	res.clearCookie(CHAT_OAUTH_REFRESH_COOKIE_NAME, chatOAuthCookieOptions(req, resourceUrl));
}

/**
 * Whether this GET is the shell asking for a fresh access token rather than for a page.
 *
 * A GET is required because a POST to this path reaches the `default` webhook — the
 * chat message endpoint — not `setup`. That makes the request forgeable by shape alone,
 * so the custom header carries the CSRF guard: it needs a preflight no other origin can
 * get past. `Sec-Fetch-Site` is a second check where the browser sends it, and is
 * ignored when absent so a stripping proxy doesn't break the leg.
 */
export function isChatRefreshRequest(req: Request): boolean {
	if (req.query[CHAT_REFRESH_PARAM] !== '1') return false;
	if (req.headers[CHAT_REFRESH_HEADER] !== '1') return false;
	const site = req.headers['sec-fetch-site'];
	if (typeof site === 'string' && site !== 'same-origin') return false;
	return true;
}
