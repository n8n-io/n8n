import { createServer, type Server } from 'node:http';

import {
	CALLBACK_HOST_CANDIDATES,
	CALLBACK_PATH,
	CALLBACK_PORT,
} from './openai-codex-oauth.constants';

export interface CallbackListener {
	/** Resolves with the authorization code, or rejects on mismatch/timeout. */
	readonly result: Promise<string>;
	close(): void;
}

const PAGE = (title: string, body: string) =>
	`<!doctype html><meta charset="utf-8"><title>${title}</title><h1>${title}</h1><p>${body}</p>`;

/**
 * Binds the fixed loopback callback the Codex OAuth client is registered
 * against, and resolves once with a state-validated authorization code.
 *
 * Both IPv4 and IPv6 loopback are bound: the redirect URI uses the `localhost`
 * hostname, which resolves to `::1` first on some systems, so a single-family
 * listener can miss the callback entirely.
 *
 * Returns `null` when the port cannot be bound — n8n running in a container, or
 * a Codex CLI already holding 1455. Callers fall back to the manual paste flow.
 */
export async function startCallbackListener(
	state: string,
	timeoutMs: number,
): Promise<CallbackListener | null> {
	const servers: Server[] = [];
	let settle: ((value: string) => void) | undefined;
	let fail: ((error: Error) => void) | undefined;
	let settled = false;

	const result = new Promise<string>((resolve, reject) => {
		settle = resolve;
		fail = reject;
	});

	const closeAll = () => {
		for (const server of servers) server.close();
		servers.length = 0;
	};

	const finish = (error: Error | null, code?: string) => {
		if (settled) return;
		settled = true;
		clearTimeout(timer);
		closeAll();
		if (error) fail?.(error);
		else settle?.(code as string);
	};

	const timer = setTimeout(
		() => finish(new Error('The Codex sign-in window timed out.')),
		timeoutMs,
	);
	// A pending sign-in must never hold the event loop open on shutdown.
	timer.unref?.();

	const bound = await Promise.all(
		CALLBACK_HOST_CANDIDATES.map(
			async (host) =>
				await new Promise<boolean>((resolve) => {
					const server = createServer((request, response) => {
						const url = new URL(request.url ?? '/', `http://localhost:${CALLBACK_PORT}`);
						const deny = (status: number, message: string) => {
							response.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
							response.end(PAGE('Sign-in failed', message));
						};

						if (url.pathname !== CALLBACK_PATH) return deny(404, 'Unknown callback route.');

						// A mismatched state is a CSRF signal, never something to accept.
						if (url.searchParams.get('state') !== state) {
							deny(400, 'The sign-in state did not match. Start again from n8n.');
							return finish(new Error('Codex OAuth state mismatch.'));
						}

						const code = url.searchParams.get('code');
						if (!code) {
							deny(400, 'No authorization code was returned.');
							return finish(new Error('Codex OAuth callback carried no code.'));
						}

						response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
						response.end(PAGE('Connected', 'You can close this tab and return to n8n.'));
						return finish(null, code);
					});

					servers.push(server);
					server.once('error', () => resolve(false));
					server.listen(CALLBACK_PORT, host, () => resolve(true));
				}),
		),
	);

	if (!bound.some(Boolean)) {
		clearTimeout(timer);
		closeAll();
		// Nothing will ever settle this promise; make sure it is not left unhandled.
		result.catch(() => {});
		finish(new Error('Could not bind the Codex callback port.'));
		return null;
	}

	return {
		result,
		close: () => finish(new Error('The Codex sign-in was cancelled.')),
	};
}
