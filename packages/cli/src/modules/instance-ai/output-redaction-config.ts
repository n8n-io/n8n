import {
	SUPPORTED_PII_CATEGORIES,
	type PiiDetectionType,
	type RedactionOptions,
} from '@n8n/agents';
import type { InstanceAiConfig } from '@n8n/config';

/**
 * Resolve the Instance AI output-redaction policy from env config.
 * Returns `false` when disabled so the redactor passes events through untouched.
 */
export function resolveOutputRedaction(config: InstanceAiConfig): RedactionOptions | false {
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
