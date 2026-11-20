import type { CapturedRequest } from './network';

/** Stands for a secret in a path. It is what logs, errors, the model and the gym see. */
export const REDACTED_SECRET = 'guard-redacted';

/**
 * A few APIs put a secret in the URL path, such as `/bot<token>/<method>`. A vendor profile gives a
 * pattern for that path. Group 1 is the text before the secret. Group 2 is the secret. The pattern
 * starts with `^`.
 */
export type PathSecretPattern = RegExp;

/** Replaces the secret of a path with `REDACTED_SECRET`. Returns the secret, so the caller can keep it. */
export function redactPathSecret(
	url: URL,
	pattern: PathSecretPattern | undefined,
): { url: URL; secret?: string } {
	const match = pattern?.exec(url.pathname);
	if (!match || match[2] === REDACTED_SECRET) return { url };
	const redacted = new URL(url.href);
	redacted.pathname = `${match[1]}${REDACTED_SECRET}${url.pathname.slice(match[0].length)}`;
	return { url: redacted, secret: match[2] };
}

/**
 * Puts a secret in place of `REDACTED_SECRET`, just before a request is sent. A path that has no
 * placeholder stays as it is. Without a secret the placeholder stays, so the request fails.
 */
export function fillPathSecret(
	req: CapturedRequest,
	pattern: PathSecretPattern | undefined,
	secret: string | undefined,
): CapturedRequest {
	const match = pattern?.exec(req.url.pathname);
	if (!match || match[2] !== REDACTED_SECRET || secret === undefined) return req;
	const url = new URL(req.url.href);
	url.pathname = `${match[1]}${secret}${req.url.pathname.slice(match[0].length)}`;
	return { ...req, url };
}
