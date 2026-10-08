import { NONCE_PLACEHOLDER } from '@n8n/constants';
import { z } from 'zod';

/**
 * The [Level 3](https://web.dev/articles/strict-csp) policy n8n reports on by default.
 *
 * {@link NONCE_PLACEHOLDER} takes the response's nonce when n8n serves the header.
 */
export const DEFAULT_CONTENT_SECURITY_POLICY = `script-src ${NONCE_PLACEHOLDER} 'strict-dynamic' 'unsafe-eval'; object-src 'none'; base-uri 'none'`;

/** Value either policy variable accepts to mean n8n's own policy, as n8n changes it. */
const DEFAULT_POLICY_KEYWORD = 'default';

/** Value either policy variable accepts to mean "send no such header". */
const NO_POLICY_KEYWORD = '{}';

/**
 * `N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY` was a boolean from 1.100 until it took a
 * policy. These are the values `@n8n/config` accepted for it.
 */
const LEGACY_TRUE = ['true', '1'];
const LEGACY_FALSE = ['false', '0'];

/**
 * A policy read from the environment: the policy to send, or `undefined` to send no
 * header at all.
 */
export type ContentSecurityPolicySetting = string | undefined;

/**
 * As {@link ContentSecurityPolicySetting}, plus the boolean the report-only variable
 * held until it took a policy. The boolean is carried through rather than resolved
 * here, because honoring it also depends on `N8N_CONTENT_SECURITY_POLICY`.
 */
export type ContentSecurityPolicyReportOnlySetting =
	| ContentSecurityPolicySetting
	| { legacyBoolean: boolean };

export const isLegacyBooleanSetting = (
	setting: ContentSecurityPolicyReportOnlySetting,
): setting is { legacyBoolean: boolean } =>
	typeof setting === 'object' && setting !== null && 'legacyBoolean' in setting;

/**
 * Directive values that only mean what they look like when quoted: bare `self` is a
 * host named "self", so it silently blocks the scripts it was meant to allow. helmet.js
 * rejects these, and so do we now that we serve the header ourselves.
 */
const MUST_BE_QUOTED = new Set([
	'none',
	'self',
	'strict-dynamic',
	'report-sample',
	'inline-speculation-rules',
	'unsafe-inline',
	'unsafe-eval',
	'unsafe-hashes',
	'wasm-unsafe-eval',
]);

/** Prefixes that, like {@link MUST_BE_QUOTED}, are only valid inside quotes. */
const MUST_BE_QUOTED_PREFIXES = ['nonce-', 'sha256-', 'sha384-', 'sha512-'];

/** `scriptSrc` -> `script-src`, matching how helmet.js normalizes directive names. */
const toDirectiveName = (name: string) =>
	name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

const isDirectivesObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

type ParseResult =
	| { ok: true; policy: ContentSecurityPolicySetting }
	| { ok: false; message: string };

const invalid = (message: string): ParseResult => ({ ok: false, message });

/**
 * Characters `res.setHeader` refuses with `ERR_INVALID_CHAR` - anything outside tab,
 * printable ASCII and the latin1 high range. A policy carrying one would throw while
 * serving every HTML response, so it is rejected here instead: exactly the values Node
 * refuses, so a policy that works today keeps working.
 */
const HEADER_UNSAFE_CHARACTER = /[^\t\x20-\x7e\x80-\xff]/;

/**
 * Reject a policy an HTTP header cannot carry, naming the character by code point rather
 * than echoing it: the message reaches a log, where a newline of its own would let the
 * offending value forge log lines.
 */
const checkHeaderCharacters = (policy: string): ParseResult => {
	const offender = HEADER_UNSAFE_CHARACTER.exec(policy);
	if (offender === null) return { ok: true, policy };

	const codePoint = offender[0].codePointAt(0) ?? 0;
	const hex = codePoint.toString(16).padStart(4, '0');

	return invalid(
		`the policy contains U+${hex.toUpperCase()}, which an HTTP header cannot carry (offset ${offender.index})`,
	);
};

/** Reject a value that the browser cannot read as the author meant it. */
const checkDirectiveValue = (directive: string, value: string) => {
	if (MUST_BE_QUOTED.has(value) || MUST_BE_QUOTED_PREFIXES.some((p) => value.startsWith(p))) {
		return `\`${value}\` in \`${directive}\` has to be quoted, as \`'${value}'\``;
	}

	// `;` and `,` separate directives and policies, so a value holding one would splice
	// an unintended directive into the policy.
	if (/[;,]/.test(value)) return `\`${value}\` in \`${directive}\` cannot contain \`;\` or \`,\``;

	return undefined;
};

/**
 * Serialize a helmet.js directives object into a policy string, keeping helmet's reading
 * of two special values: `null` drops the directive, and an empty array leaves it
 * valueless, e.g. `{ "upgrade-insecure-requests": [] }`. Values helmet.js would have
 * thrown on are rejected rather than coerced, so a typo cannot ship a malformed policy.
 */
const serializeDirectives = (directives: Record<string, unknown>): ParseResult => {
	const serialized: string[] = [];
	const seen = new Set<string>();

	for (const [rawName, rawValue] of Object.entries(directives)) {
		if (rawValue === null) continue;

		const directive = toDirectiveName(rawName);
		if (!/^[a-zA-Z0-9-]+$/.test(directive)) {
			return invalid(`\`${rawName}\` is not a valid directive name`);
		}
		if (seen.has(directive)) return invalid(`\`${directive}\` is set more than once`);
		seen.add(directive);

		const rawValues =
			Array.isArray(rawValue) || rawValue === undefined ? (rawValue ?? []) : [rawValue];

		const values: string[] = [];
		for (const value of rawValues) {
			if (typeof value !== 'string') {
				return invalid(`\`${directive}\` has a value that is not a string`);
			}
			const problem = checkDirectiveValue(directive, value);
			if (problem) return invalid(problem);
			values.push(value);
		}

		const entry = [directive, ...values].join(' ').trim();
		if (entry.length > 0) serialized.push(entry);
	}

	return { ok: true, policy: serialized.length > 0 ? serialized.join('; ') : undefined };
};

/**
 * Check a policy string the way {@link serializeDirectives} checks a directives object,
 * and hand back the original string: the user wrote the header, so n8n sends it verbatim.
 */
const checkPolicyString = (policy: string): ParseResult => {
	const seen = new Set<string>();

	for (const segment of policy.split(';')) {
		const [directive, ...values] = segment.trim().split(/\s+/).filter(Boolean);
		if (directive === undefined) continue;

		if (!/^[a-zA-Z0-9-]+$/.test(directive)) {
			return invalid(`\`${directive}\` is not a valid directive name`);
		}
		if (seen.has(directive)) return invalid(`\`${directive}\` is set more than once`);
		seen.add(directive);

		for (const value of values) {
			const problem = checkDirectiveValue(directive, value);
			if (problem) return invalid(problem);
		}
	}

	return { ok: true, policy };
};

/** Parse the historical helmet.js directives object. */
const parseDirectivesJson = (value: string): ParseResult => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return invalid('the value is neither valid JSON directives nor a policy string');
	}

	if (!isDirectivesObject(parsed)) {
		return invalid('JSON directives have to be an object, e.g. `{"script-src":["\'self\'"]}`');
	}

	return serializeDirectives(parsed);
};

/**
 * Parse a policy from an env var, in either the historical helmet.js directives object
 * or a policy string.
 */
export const parseContentSecurityPolicy = (rawValue: string): ParseResult => {
	const value = rawValue.trim();

	if (value === '' || value === NO_POLICY_KEYWORD) return { ok: true, policy: undefined };
	if (value.toLowerCase() === DEFAULT_POLICY_KEYWORD) {
		return { ok: true, policy: DEFAULT_CONTENT_SECURITY_POLICY };
	}

	const result = value.startsWith('{') ? parseDirectivesJson(value) : checkPolicyString(value);

	// Both formats end up here, and the check runs on the whole policy rather than on each
	// value: `checkPolicyString` hands back the string the user wrote, where a newline
	// between two directives is swallowed as whitespace by the per-value checks.
	if (!result.ok || result.policy === undefined) return result;

	return checkHeaderCharacters(result.policy);
};

/**
 * Both policy variables parse the same way, so that `N8N_CONTENT_SECURITY_POLICY` and
 * `N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY` stay symmetric. An unusable value raises a
 * zod issue, which the `Env` decorator turns into a warning plus the declared default:
 * a typo must not quietly change the policy.
 */
const policy = (rawValue: string, ctx: z.RefinementCtx) => {
	const result = parseContentSecurityPolicy(rawValue);
	if (!result.ok) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
		return z.NEVER;
	}
	return result.policy;
};

export const contentSecurityPolicySchema = z.string().transform(policy);

export const contentSecurityPolicyReportOnlySchema = z
	.string()
	.transform((rawValue, ctx): ContentSecurityPolicyReportOnlySetting => {
		// The variable held a boolean from 1.100 until it took a policy. Read as a policy,
		// `true` would start enforcing a policy the instance deliberately kept report-only.
		const value = rawValue.trim().toLowerCase();
		if (LEGACY_TRUE.includes(value)) return { legacyBoolean: true };
		if (LEGACY_FALSE.includes(value)) return { legacyBoolean: false };

		return policy(rawValue, ctx);
	});
