import { redactText, SUPPORTED_PII_CATEGORIES, type RedactionOptions } from '@n8n/agents';

/**
 * Egress policy for free-text values leaving the instance as product telemetry
 * (RudderStack/PostHog). Mirrors the LangSmith exporter's policy
 * (`DEFAULT_TELEMETRY_REDACTION_OPTIONS` in the instance-ai package) and is
 * deliberately stricter than the user-facing output policy: secrets plus every
 * PII category.
 *
 * Intentionally independent of `N8N_INSTANCE_AI_OUTPUT_REDACTION_*` and the
 * durable-log flag — those decide what the *user* sees on their own instance
 * (and today turn the stream-side redactor off entirely), which says nothing
 * about what may be shipped to a third party.
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

/** Scrub secrets/PII from a free-text telemetry value and cap its length. */
export function redactTelemetryText(value: string): string {
	const redacted = redactText(value, TELEMETRY_REDACTION_OPTIONS).text;

	return redacted.length > MAX_TELEMETRY_TEXT_LENGTH
		? `${redacted.slice(0, MAX_TELEMETRY_TEXT_LENGTH)}...`
		: redacted;
}
