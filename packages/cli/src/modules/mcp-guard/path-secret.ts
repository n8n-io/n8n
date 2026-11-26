import type { CapturedRequest } from './network';

/** Stands for a secret in a path. It is what logs, errors, the model and the gym see. */
export const REDACTED_SECRET = 'guard-redacted';

/**
 * A few APIs put a secret in the URL path, such as `/bot<token>/<method>`. A vendor profile gives a
 * pattern for that path. Group 1 is the text before the secret. Group 2 is the secret. The pattern
 * starts with `^`.
 */
export type PathSecretPattern = RegExp;

/** Matches from the start, also for a pattern with the flag `g` or `y`, which keeps `lastIndex` between calls. */
function execFresh(pattern: PathSecretPattern | undefined, path: string): RegExpExecArray | null {
	if (!pattern) return null;
	pattern.lastIndex = 0;
	return pattern.exec(path);
}

/** Replaces the secret of a path with `REDACTED_SECRET`. Returns the secret, so the caller can keep it. */
export function redactPathSecret(
	url: URL,
	pattern: PathSecretPattern | undefined,
): { url: URL; secret?: string } {
	const match = execFresh(pattern, url.pathname);
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
	const match = execFresh(pattern, req.url.pathname);
	if (!match || match[2] !== REDACTED_SECRET || secret === undefined) return req;
	const url = new URL(req.url.href);
	url.pathname = `${match[1]}${secret}${req.url.pathname.slice(match[0].length)}`;
	return { ...req, url };
}

/**
 * Some APIs take a secret in the query, such as `access_token=...` (Facebook Graph). A vendor profile
 * names the parameters. They are removed before anything else sees the request, and `fillQuerySecrets`
 * puts them back for a real read.
 */
export function redactQuerySecrets(
	url: URL,
	names: readonly string[] | undefined,
): { url: URL; secrets: Record<string, string> } {
	const secrets: Record<string, string> = {};
	if (!names || names.length === 0 || !names.some((name) => url.searchParams.has(name))) {
		return { url, secrets };
	}
	const redacted = new URL(url.href);
	for (const name of names) {
		const value = redacted.searchParams.get(name);
		if (value === null) continue;
		secrets[name] = value;
		redacted.searchParams.delete(name);
	}
	return { url: redacted, secrets };
}

/** Puts the removed query secrets back, just before a request goes to the real service. */
export function fillQuerySecrets(
	req: CapturedRequest,
	secrets: Readonly<Record<string, string>> | undefined,
): CapturedRequest {
	const entries = Object.entries(secrets ?? {});
	if (entries.length === 0) return req;
	const url = new URL(req.url.href);
	for (const [name, value] of entries) url.searchParams.set(name, value);
	return { ...req, url };
}
