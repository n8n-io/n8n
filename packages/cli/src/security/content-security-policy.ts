import type { Logger } from '@n8n/backend-common';
import { DEFAULT_CONTENT_SECURITY_POLICY } from '@n8n/config';

/**
 * Token that users can place in a policy where they want n8n to substitute the
 * per-request nonce, e.g. `N8N_CONTENT_SECURITY_POLICY="script-src <nonce>"`.
 */
export const NONCE_PLACEHOLDER = '<nonce>';

/**
 * Placeholder baked into the built HTML at build time (see the `csp-nonce` Vite
 * plugin), replaced with the per-request nonce when the page is served.
 */
export const HTML_NONCE_PLACEHOLDER = '{{CSP_NONCE}}';

/**
 * Value either policy variable accepts to mean n8n's own policy, so an instance can
 * enforce it without transcribing it - and keep following it as n8n changes it.
 */
export const DEFAULT_POLICY_KEYWORD = 'default';

/** Value either policy variable accepts to mean "send no such header". */
export const NO_POLICY_KEYWORD = '{}';

export type ContentSecurityPolicies = {
	/** Policy for the `Content-Security-Policy` header, or `undefined` to not send it. */
	enforced?: string;
	/** Policy for the `Content-Security-Policy-Report-Only` header, or `undefined` to not send it. */
	reportOnly?: string;
};

/**
 * `N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY` was a boolean from 1.100 until it took a
 * policy. These are the values `@n8n/config` accepted for it.
 */
const LEGACY_TRUE = ['true', '1'];
const LEGACY_FALSE = ['false', '0'];

/** `scriptSrc` -> `script-src`, matching how helmet.js normalizes directive names. */
const toDirectiveName = (name: string) =>
	name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

const isDirectivesObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Serialize a helmet.js style directives object into a policy string, keeping helmet's own
 * reading of the two special values: `null` drops the directive, and an empty array leaves
 * it valueless, e.g. `{ "upgrade-insecure-requests": [] }`.
 */
const serializeDirectives = (directives: Record<string, unknown>) =>
	Object.entries(directives)
		.filter(([, value]) => value !== null)
		.map(([directive, value]) => {
			const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
			return [toDirectiveName(directive), ...values.map(String)].join(' ').trim();
		})
		.filter((directive) => directive.length > 0)
		.join('; ');

/**
 * Parse a policy configured through an env var. Both formats are supported:
 * a helmet.js directives object (the historical format, unchanged) and a plain
 * policy string like the header itself.
 *
 * Returns `undefined` when nothing usable is configured, so the caller can fall
 * back to {@link DEFAULT_CONTENT_SECURITY_POLICY}.
 */
export const parseContentSecurityPolicy = (
	rawValue: string,
	envVarName: string,
	logger: Pick<Logger, 'warn'>,
): string | undefined => {
	const value = rawValue?.trim();
	if (!value) return undefined;

	if (!value.startsWith('{')) return value;

	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		parsed = undefined;
	}

	if (!isDirectivesObject(parsed)) {
		logger.warn(
			`Ignoring ${envVarName}: the value is neither valid JSON directives nor a policy string. Falling back to the default Content-Security-Policy.`,
		);
		return undefined;
	}

	const policy = serializeDirectives(parsed);

	return policy.length > 0 ? policy : undefined;
};

/**
 * Work out which CSP headers to send from the two env vars. Both hold a policy,
 * in either accepted format; `{}` or an empty value means "send no such header".
 *
 * Only the report-only var has a policy by default, so out of the box n8n
 * reports violations without being able to break a running instance.
 */
export const resolveContentSecurityPolicies = (
	rawPolicy: string,
	rawReportOnly: string,
	logger: Pick<Logger, 'warn'>,
): ContentSecurityPolicies => {
	// It used to be a boolean. A bare `true` is not a policy, so say so rather than
	// serving a header made of nonsense.
	/**
	 * An empty value or `{}` means the header is switched off, and is left alone.
	 * A value that is set but unusable falls back, so a typo cannot quietly turn a
	 * policy off - `fallback` is what is safe for that particular header.
	 */
	const resolve = (rawValue: string, envVarName: string, fallback?: string) => {
		const value = rawValue?.trim() ?? '';
		if (value === '' || value === NO_POLICY_KEYWORD) return undefined;
		if (value.toLowerCase() === DEFAULT_POLICY_KEYWORD) return DEFAULT_CONTENT_SECURITY_POLICY;
		return parseContentSecurityPolicy(value, envVarName, logger) ?? fallback;
	};

	// The variable was a boolean before it held a policy, and instances have been setting
	// it that way since 1.100. A boolean is honoured one last time, with a warning, rather
	// than read as a policy: `true` especially must not start enforcing a policy that the
	// instance deliberately kept report-only.
	const reportOnlyValue = rawReportOnly?.trim() ?? '';
	const legacyBoolean = LEGACY_TRUE.includes(reportOnlyValue.toLowerCase())
		? true
		: LEGACY_FALSE.includes(reportOnlyValue.toLowerCase())
			? false
			: undefined;

	if (legacyBoolean !== undefined) {
		logger.warn(
			`N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY=${reportOnlyValue} is deprecated: the variable now holds the policy to report on, in the same formats as N8N_CONTENT_SECURITY_POLICY. Honouring the old meaning for now - set it to a policy, or to \`{}\` to report on nothing.`,
		);
		const configured = resolve(rawPolicy, 'N8N_CONTENT_SECURITY_POLICY');

		return legacyBoolean
			? { reportOnly: configured ?? DEFAULT_CONTENT_SECURITY_POLICY }
			: { enforced: configured, reportOnly: DEFAULT_CONTENT_SECURITY_POLICY };
	}

	return {
		// Nothing to fall back to: a policy that cannot be read must not be enforced.
		enforced: resolve(rawPolicy, 'N8N_CONTENT_SECURITY_POLICY'),
		reportOnly: resolve(
			rawReportOnly,
			'N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY',
			DEFAULT_CONTENT_SECURITY_POLICY,
		),
	};
};

/** Substitute the per-request nonce into a policy. */
export const renderContentSecurityPolicy = (policy: string, nonce: string) =>
	policy.replaceAll(NONCE_PLACEHOLDER, `'nonce-${nonce}'`);
