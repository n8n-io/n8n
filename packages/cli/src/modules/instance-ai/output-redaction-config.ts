import {
	SUPPORTED_PII_CATEGORIES,
	type PiiDetectionType,
	type RedactionOptions,
} from '@n8n/agents';
import type { InstanceAiConfig } from '@n8n/config';

/**
 * Resolve the Instance AI output-redaction policy from env config.
 * Returns `false` when disabled so the redactor passes events through untouched.
 *
 * Durable-log flag: raw-at-rest storage policy (team decision, 2026-07-06) —
 * the stream-side redactor moves off the publish path so the log captures raw
 * values, consistent with workflow execution data. Redaction applies at egress
 * boundaries instead; the stricter LangSmith telemetry redactor
 * (trace-payloads.ts) is a separate layer and is unchanged.
 */
export function resolveOutputRedaction(config: InstanceAiConfig): RedactionOptions | false {
	if (config.durableLog) return false;
	if (!config.outputRedactionEnabled) return false;

	const detect = config.outputRedactionPii
		.split(',')
		.map((value) => value.trim())
		.filter((value): value is PiiDetectionType =>
			(SUPPORTED_PII_CATEGORIES as readonly string[]).includes(value),
		);

	const placeholder = config.outputRedactionPlaceholder;
	return {
		secrets: config.outputRedactionSecrets,
		detect,
		// Fall back to the engine default when configured blank.
		...(placeholder ? { placeholder } : {}),
	};
}
