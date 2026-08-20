import type { Logger } from '@n8n/backend-common';
import { DEFAULT_CONTENT_SECURITY_POLICY } from '@n8n/config';

/**
 * Token that users can place in a policy where they want n8n to substitute the
 * per-request nonce, e.g. `N8N_CONTENT_SECURITY_POLICY="script-src <nonce>"`.
 */
export const NONCE_PLACEHOLDER = '<nonce>';

/** Value either policy variable accepts to mean n8n's own policy, as n8n changes it. */
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
 * Serialize a helmet.js directives object into a policy string, keeping helmet's reading
 * of two special values: `null` drops the directive, and an empty array leaves it
 * valueless, e.g. `{ "upgrade-insecure-requests": [] }`.
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
 * Parse a policy from an env var, in either the historical helmet.js directives object
 * or a policy string. Returns `undefined` when nothing usable is configured, so the
 * caller can fall back to {@link DEFAULT_CONTENT_SECURITY_POLICY}.
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
 * Decide which CSP headers to send from the two env vars. Only the report-only var
 * holds a policy by default, so a new instance reports violations but cannot break
 * on them.
 */
export const resolveContentSecurityPolicies = (
	rawPolicy: string,
	rawReportOnly: string,
	logger: Pick<Logger, 'warn'>,
): ContentSecurityPolicies => {
	/**
	 * An empty value or `{}` switches the header off. A value that is set but unusable
	 * falls back instead, so a typo cannot quietly turn a policy off.
	 */
	const resolve = (rawValue: string, envVarName: string, fallback?: string) => {
		const value = rawValue?.trim() ?? '';
		if (value === '' || value === NO_POLICY_KEYWORD) return undefined;
		if (value.toLowerCase() === DEFAULT_POLICY_KEYWORD) return DEFAULT_CONTENT_SECURITY_POLICY;
		return parseContentSecurityPolicy(value, envVarName, logger) ?? fallback;
	};

	// The variable held a boolean from 1.100 until it took a policy, so honor a boolean
	// one last time with a warning. Read as a policy, `true` would start enforcing a
	// policy that the instance deliberately kept report-only.
	const reportOnlyValue = rawReportOnly?.trim() ?? '';
	const legacyBoolean = LEGACY_TRUE.includes(reportOnlyValue.toLowerCase())
		? true
		: LEGACY_FALSE.includes(reportOnlyValue.toLowerCase())
			? false
			: undefined;

	if (legacyBoolean !== undefined) {
		logger.warn(
			`N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY=${reportOnlyValue} is deprecated: the variable now holds the policy to report on, in the same formats as N8N_CONTENT_SECURITY_POLICY. Honoring the old meaning for now - set it to a policy, or to \`{}\` to report on nothing.`,
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

export const renderContentSecurityPolicy = (policy: string, nonce: string) =>
	policy.replaceAll(NONCE_PLACEHOLDER, `'nonce-${nonce}'`);
