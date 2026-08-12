/**
 * Entry-point redaction for captured log lines.
 *
 * `packages/cli/src/modules/redaction` was considered first and does not fit:
 * it redacts structured *execution data* against per-workflow policies and
 * node-declared sensitive fields, operating on `IRunExecutionData`. There is no
 * free-text scrubber to reuse there, so this is a small, deliberately scoped
 * one.
 *
 * Limitations, stated plainly because pretending otherwise is worse than the
 * gap itself:
 * - Pattern-based. A bare high-entropy string with no surrounding key, header
 *   or scheme is not detected.
 * - Only `message` and `meta` are scanned. Labels (`scope`, `executionId`, …)
 *   are structural and never carry secrets.
 * - It is a defence in depth, not an authorization boundary. The console stays
 *   admin/owner only regardless.
 */

import { isObjectLiteral } from '@n8n/backend-common';

const REDACTED = '[redacted]';

/** Keys whose value is replaced wholesale, whatever its shape. */
const SECRET_KEY =
	/^(?:authorization|proxy-authorization|www-authenticate|cookie|set-cookie|x-api-key|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|bearer[_-]?token|token|client[_-]?secret|secret|private[_-]?key|signing[_-]?key|encryption[_-]?key|password|passwd|pwd|passphrase|credential|credentials|session[_-]?id|sessionid)$/i;

/**
 * `key: value` / `key=value` where the key looks secret-ish. Covers JSON
 * fragments, header dumps and query strings in one pass. An unquoted value may
 * carry an auth scheme (`Authorization: Bearer abc`) so the scheme is consumed
 * with it — otherwise the token would survive one word to the right.
 */
const SECRET_ASSIGNMENT =
	/(\b(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|token|client[_-]?secret|secret|private[_-]?key|password|passwd|pwd|passphrase|credential|session[_-]?id)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|(?:(?:bearer|basic|digest)\s+)?[^\s,;&)}\]]+)/gi;

/** A scheme-prefixed token that reached the log without a key next to it. */
const AUTH_SCHEME_TOKEN = /\b(bearer|basic|digest)\s+[A-Za-z0-9\-._~+/]{8,}={0,2}/gi;

/** `scheme://user:password@host` — the password half is the interesting part. */
const URL_USERINFO = /\b([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+)(?::[^\s/@]*)?@/gi;

const MAX_META_DEPTH = 4;

/** Guards against a pathological object turning one log line into a walk of thousands. */
const MAX_META_NODES = 500;

export type RedactableRecord = {
	message: string;
	meta?: Record<string, unknown>;
};

/** Scrub secret-shaped substrings out of free text. */
export function redactText(text: string): string {
	if (text === '') return text;

	return text
		.replace(SECRET_ASSIGNMENT, (_match, keyAndSeparator: string) => keyAndSeparator + REDACTED)
		.replace(AUTH_SCHEME_TOKEN, (_match, scheme: string) => `${scheme} ${REDACTED}`)
		.replace(
			URL_USERINFO,
			(_match, scheme: string, user: string) => `${scheme}${user}:${REDACTED}@`,
		);
}

/**
 * Redact a record in place of its inputs, returning the original object
 * untouched when nothing matched — the common case, and the buffer admits every
 * line whether or not anyone is watching.
 */
export function redactRecord<T extends RedactableRecord>(record: T): T {
	const message = redactText(record.message);
	const meta = record.meta === undefined ? undefined : redactMeta(record.meta);

	if (message === record.message && meta === record.meta) return record;

	return meta === undefined ? { ...record, message } : { ...record, message, meta };
}

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
	const budget = { nodes: MAX_META_NODES };
	const redacted = redactObject(meta, 0, budget);
	return redacted === meta ? meta : redacted;
}

function redactObject(
	source: Record<string, unknown>,
	depth: number,
	budget: { nodes: number },
): Record<string, unknown> {
	let changed = false;
	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(source)) {
		if (budget.nodes-- <= 0) {
			result[key] = value;
			continue;
		}

		const next = SECRET_KEY.test(key) ? REDACTED : redactValue(value, depth + 1, budget);
		if (next !== value) changed = true;
		result[key] = next;
	}

	return changed ? result : source;
}

function redactValue(value: unknown, depth: number, budget: { nodes: number }): unknown {
	if (typeof value === 'string') return redactText(value);
	if (depth >= MAX_META_DEPTH) return value;

	if (Array.isArray(value)) {
		let changed = false;
		const items: unknown[] = value.map((item: unknown) => {
			if (budget.nodes-- <= 0) return item;
			const next = redactValue(item, depth + 1, budget);
			if (next !== item) changed = true;
			return next;
		});
		return changed ? items : value;
	}

	// Only plain object literals are walked. Anything exotic (Buffer, Date, a
	// class instance) is left alone rather than reshaped by a spread.
	if (!isObjectLiteral(value)) return value;

	return redactObject(value, depth, budget);
}
