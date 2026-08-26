import type { Request } from 'express';

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
