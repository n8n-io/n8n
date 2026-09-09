import { SUPPORTED_PII_CATEGORIES } from '@n8n/utils/redaction/pii-patterns';
import { DEFAULT_PLACEHOLDER, redactText } from '@n8n/utils/redaction/redact-text';
import type { RedactionOptions } from '@n8n/utils/redaction/redact-text';

/**
 * Egress policy for free-text values leaving the instance as product telemetry
 * (RudderStack/PostHog). Deliberately stricter than the user-facing output
 * policy: secrets plus every PII category.
 *
 * Shared by the backend and the editor UI. Frontend events reach RudderStack
 * *and* PostHog straight from the browser, so redaction has to happen at the
 * call site — there is no server hop that sees both.
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
 * Length cap for a single free-text telemetry property. RudderStack silently
 * drops any event whose serialized payload exceeds 32 KB, so an uncapped
 * assistant message or workflow JSON loses the whole event; this keeps it well
 * under.
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
 * value through unscrubbed, replace it with a marker.
 */
const MAX_PROPERTY_DEPTH = 5;
const OVER_DEPTH_MARKER = '[REDACTED_DEPTH]';

/** JSON-ish value accepted in a telemetry property bag. */
type TelemetryValue = string | number | boolean | object | null | undefined;

export interface TelemetryTextOptions {
	/**
	 * Override the default {@link MAX_TELEMETRY_TEXT_LENGTH} cap. Pass
	 * `Infinity` for values that are already size-gated by the caller and would
	 * lose meaning truncated — a serialized workflow or execution payload.
	 */
	maxLength?: number;
}

/** Scrub secrets/PII from a free-text telemetry value and cap its length. */
export function redactTelemetryText(value: string, opts: TelemetryTextOptions = {}): string {
	const maxLength = opts.maxLength ?? MAX_TELEMETRY_TEXT_LENGTH;
	const redacted = redactText(value, TELEMETRY_REDACTION_OPTIONS).text;

	return redacted.length > maxLength ? `${redacted.slice(0, maxLength)}...` : redacted;
}

function isNonNullObject(value: TelemetryValue): value is object {
	return value !== null && typeof value === 'object';
}

function redactPropertyValue(key: string, value: TelemetryValue, depth: number): TelemetryValue {
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
		return value.map((entry: TelemetryValue) => redactPropertyValue(key, entry, depth + 1));
	}

	if (isNonNullObject(value)) {
		if (depth >= MAX_PROPERTY_DEPTH) return OVER_DEPTH_MARKER;
		const redacted: Record<string, TelemetryValue> = {};
		for (const [nestedKey, nestedValue] of Object.entries(value)) {
			redacted[nestedKey] = redactPropertyValue(
				nestedKey,
				nestedValue as TelemetryValue,
				depth + 1,
			);
		}
		return redacted;
	}

	return value;
}

/**
 * Scrub every free-text value in a telemetry payload. Used at boundaries where
 * the property bag is open-ended — a `trackTelemetry` channel handed to tools,
 * or a frontend event whose payload carries user prose — and the values can't
 * be audited call site by call site. Identifier keys and non-string values pass
 * through untouched.
 */
export function redactTelemetryProperties<T extends Record<string, TelemetryValue>>(
	properties: T,
): Record<string, TelemetryValue> {
	const redacted: Record<string, TelemetryValue> = {};
	for (const [key, value] of Object.entries(properties)) {
		redacted[key] = redactPropertyValue(key, value, 0);
	}
	return redacted;
}
