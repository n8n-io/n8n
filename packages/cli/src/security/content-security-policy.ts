import type { Logger } from '@n8n/backend-common';

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
 * The policy n8n serves when the instance has not configured one. Nonce-based
 * with `'strict-dynamic'`, so scripts n8n itself ships are allowed to run and
 * to load further scripts, while injected markup is not.
 *
 * `'unsafe-eval'` is still required by the editor. `base-uri` can be `'none'`
 * because n8n never serves a `<base>` element. `worker-src` is spelled out
 * because a nonce cannot be given to a worker script, and without it workers
 * fall back to `script-src` and are refused.
 *
 * @see https://web.dev/articles/strict-csp
 */
export const DEFAULT_CONTENT_SECURITY_POLICY = `script-src ${NONCE_PLACEHOLDER} 'strict-dynamic' 'unsafe-eval'; worker-src 'self'; object-src 'none'; base-uri 'none'`;

export type ContentSecurityPolicies = {
	/** Policy for the `Content-Security-Policy` header, or `undefined` to not send it. */
	enforced?: string;
	/** Policy for the `Content-Security-Policy-Report-Only` header, or `undefined` to not send it. */
	reportOnly?: string;
};

/** Values `@n8n/config` accepts for a boolean env var, kept in sync with its decorator. */
const TRUTHY = ['true', '1'];
const FALSY = ['false', '0'];

const parseBoolean = (value: string): boolean | undefined => {
	const normalized = value.toLowerCase();
	if (TRUTHY.includes(normalized)) return true;
	if (FALSY.includes(normalized)) return false;
	return undefined;
};

/** `scriptSrc` -> `script-src`, matching how helmet.js normalizes directive names. */
const toDirectiveName = (name: string) =>
	name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

const isDirectivesObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Serialize a helmet.js style directives object into a policy string. */
const serializeDirectives = (directives: Record<string, unknown>) =>
	Object.entries(directives)
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
 * Work out which CSP headers to send from the two env vars.
 *
 * `N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY` keeps its historical meaning when
 * set to a boolean (send the policy as report-only instead of enforcing it) and
 * additionally accepts a policy of its own, so an instance can trial a candidate
 * policy in report-only mode while enforcing a different one.
 *
 * When neither var is set, the default policy is sent report-only: it reports
 * violations without being able to break a running instance.
 */
export const resolveContentSecurityPolicies = (
	rawPolicy: string,
	rawReportOnly: string,
	logger: Pick<Logger, 'warn'>,
): ContentSecurityPolicies => {
	const configured = parseContentSecurityPolicy(rawPolicy, 'N8N_CONTENT_SECURITY_POLICY', logger);
	const reportOnly = rawReportOnly?.trim() ?? '';

	if (reportOnly === '') {
		return configured ? { enforced: configured } : { reportOnly: DEFAULT_CONTENT_SECURITY_POLICY };
	}

	const asBoolean = parseBoolean(reportOnly);

	if (asBoolean === true) {
		return { reportOnly: configured ?? DEFAULT_CONTENT_SECURITY_POLICY };
	}

	if (asBoolean === false) {
		return { enforced: configured ?? DEFAULT_CONTENT_SECURITY_POLICY };
	}

	return {
		enforced: configured,
		reportOnly:
			parseContentSecurityPolicy(reportOnly, 'N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY', logger) ??
			DEFAULT_CONTENT_SECURITY_POLICY,
	};
};

/** Substitute the per-request nonce into a policy. */
export const renderContentSecurityPolicy = (policy: string, nonce: string) =>
	policy.replaceAll(NONCE_PLACEHOLDER, `'nonce-${nonce}'`);
