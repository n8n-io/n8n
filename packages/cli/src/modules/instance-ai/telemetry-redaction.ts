import {
	DEFAULT_PLACEHOLDER,
	redactText,
	SUPPORTED_PII_CATEGORIES,
	type RedactionOptions,
} from '@n8n/agents';
import type { GenericValue, ITelemetryTrackProperties } from 'n8n-workflow';

/**
 * Egress policy for free-text values leaving the instance as product telemetry
 * (RudderStack/PostHog). Mirrors the LangSmith exporter's policy
 * (`DEFAULT_TELEMETRY_REDACTION_OPTIONS` in the instance-ai package) and is
 * deliberately stricter than the user-facing output policy: secrets plus every
 * PII category.
 *
 * `preserveUrlStructure` keeps traced URLs readable; their value-bearing parts
 * are still redacted and secrets are matched first.
 */
const TELEMETRY_REDACTION_OPTIONS: RedactionOptions = {
	secrets: true,
	detect: SUPPORTED_PII_CATEGORIES,
	preserveUrlStructure: true,
};

/**
 * Length cap for a single free-text telemetry property. `Telemetry.track`
 * silently drops any event whose serialized payload exceeds 32 KB, so an
 * uncapped assistant message loses the whole event; this keeps it well under.
 */
const MAX_TELEMETRY_TEXT_LENGTH = 8_000;

/**
 * Identifier-shaped keys (`thread_id`, `workflow_id`, `source_hash`, …). Their
 * values are internally generated, carry no user content, and are the join keys
 * every dashboard groups by — scrubbing them is all downside.
 */
const IDENTIFIER_KEY_PATTERN = /(?:^|_)(?:id|ids|hash)$/;

/**
 * Keys whose *value is itself* the credential. A pattern scan only catches
 * secrets with a recognizable shape, so a plain `password: 'hunter2'` would
 * sail through — these are replaced wholesale instead. Anchored at the end of
 * the key so properties that merely describe a credential (`credential_type`,
 * `credential_kind` on `Node credential assigned`) keep their analytics value.
 *
 * Deliberately excludes a bare `credential(s)` key: in this codebase such a
 * property is a dimension (a list of credential *types*), and wiping it would
 * be a silent analytics regression. A credential object nested under it is
 * still walked key by key.
 */
const SECRET_KEY_PATTERN =
	/(?:^|_)(?:password|passwd|pwd|secret|token|api_?key|apikey|access_?token|refresh_?token|id_?token|session_?token|auth_?token|authorization|cookie|private_?key)$/i;

/**
 * `clientSecret` → `client_secret`, `private-key` → `private_key`, so
 * camelCase and kebab-case keys both hit the same (snake_case) pattern.
 */
function toSnakeCase(key: string): string {
	return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/-/g, '_');
}

/**
 * Telemetry payloads are flat in practice. Rather than let an unexpectedly deep
 * value through unscrubbed (INS-685), replace it with a marker.
 */
const MAX_PROPERTY_DEPTH = 5;
const OVER_DEPTH_MARKER = '[REDACTED_DEPTH]';

/** Scrub secrets/PII from a free-text telemetry value and cap its length. */
export function redactTelemetryText(value: string): string {
	const redacted = redactText(value, TELEMETRY_REDACTION_OPTIONS).text;

	return redacted.length > MAX_TELEMETRY_TEXT_LENGTH
		? `${redacted.slice(0, MAX_TELEMETRY_TEXT_LENGTH)}...`
		: redacted;
}

function isNonNullObject(value: GenericValue): value is object {
	return value !== null && typeof value === 'object';
}

function redactPropertyValue(key: string, value: GenericValue, depth: number): GenericValue {
	// Runs before the identifier exemption: a secret-shaped key wins over any
	// key-based pass-through. Numbers/booleans are left alone — they can't carry
	// a secret, and flags like `has_token` are worth keeping.
	if (
		SECRET_KEY_PATTERN.test(toSnakeCase(key)) &&
		(typeof value === 'string' || isNonNullObject(value))
	) {
		return DEFAULT_PLACEHOLDER;
	}

	if (typeof value === 'string') {
		return IDENTIFIER_KEY_PATTERN.test(key) ? value : redactTelemetryText(value);
	}

	if (Array.isArray(value)) {
		if (depth >= MAX_PROPERTY_DEPTH) return OVER_DEPTH_MARKER;
		return value.map((entry: GenericValue) => redactPropertyValue(key, entry, depth + 1));
	}

	if (isNonNullObject(value)) {
		if (depth >= MAX_PROPERTY_DEPTH) return OVER_DEPTH_MARKER;
		const redacted: Record<string, GenericValue> = {};
		for (const [nestedKey, nestedValue] of Object.entries(value)) {
			redacted[nestedKey] = redactPropertyValue(nestedKey, nestedValue as GenericValue, depth + 1);
		}
		return redacted;
	}

	return value;
}

/**
 * Scrub every free-text value in a telemetry payload. Used at boundaries where
 * the property bag is open-ended — notably the `trackTelemetry` channel handed
 * to tools, whose payloads (search queries, remediation reasons, node error
 * strings) are model- or user-derived and can't be audited call site by call
 * site. Identifier keys and non-string values pass through untouched.
 */
export function redactTelemetryProperties(
	properties: ITelemetryTrackProperties,
): ITelemetryTrackProperties {
	const redacted: ITelemetryTrackProperties = {};
	for (const [key, value] of Object.entries(properties)) {
		redacted[key] = redactPropertyValue(key, value, 0);
	}
	return redacted;
}
