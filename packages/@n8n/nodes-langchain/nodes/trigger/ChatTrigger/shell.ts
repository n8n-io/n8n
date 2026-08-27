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

/**
 * For the post-signin redirect, from the forwarding headers so it survives a proxy. Only
 * ever points back at this page, so a spoofed Host breaks one visitor's return trip at
 * worst — it can't redirect to another origin.
 */
export function buildAbsoluteChatUrl(req: Request): string {
	const headerValue = (name: string) => {
		const raw = req.headers[name];
		return typeof raw === 'string' ? raw.trim() : undefined;
	};
	const protocol = headerValue('x-forwarded-proto') ?? req.protocol ?? 'http';
	const host = headerValue('x-forwarded-host') ?? req.headers.host ?? '';
	return `${protocol}://${host}${req.originalUrl}`;
}

export function readAuthCookie(req: Request): string | null {
	const match = (req.headers.cookie ?? '').match(/(?:^|;\s*)n8n-auth=([^;]+)/);
	return match ? match[1].trim() : null;
}

// Carries the AS access token across the single same-site redirect from the AS
// callback to the clean inner-frame URL, so `code`/`state` never reach the
// author-shaped chat widget. The token is otherwise already embedded in the
// frame's HTML (sent back as `x-auth-token` on every message), so this cookie
// is not a new exposure.
const CHAT_OAUTH_COOKIE_NAME = 'n8n-chat-oauth';

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

export function setChatOAuthToken(
	res: Response,
	req: Request,
	resourceUrl: string,
	token: string,
): void {
	res.cookie(CHAT_OAUTH_COOKIE_NAME, token, {
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

export function readChatOAuthToken(req: Request): string | null {
	const match = (req.headers.cookie ?? '').match(/(?:^|;\s*)n8n-chat-oauth=([^;]+)/);
	return match ? decodeCookieValue(match[1]) : null;
}

export function clearChatOAuthToken(res: Response, req: Request, resourceUrl: string): void {
	res.clearCookie(CHAT_OAUTH_COOKIE_NAME, chatOAuthCookieOptions(req, resourceUrl));
}
