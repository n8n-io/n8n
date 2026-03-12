import Ajv from 'ajv';

import type { WebhookTriggerConfig } from '../sdk/types';

const ajv = new Ajv({ allErrors: true, coerceTypes: true });

export interface ValidationResult {
	valid: boolean;
	errors?: Array<{ path: string; message: string }>;
}

/**
 * Validates incoming webhook/trigger data against the trigger's JSON Schema.
 */
export function validateWebhookRequest(
	triggerConfig: WebhookTriggerConfig,
	triggerData: { body: unknown; headers: unknown; query: unknown },
): ValidationResult {
	const schema = triggerConfig.config.schema;

	if (!schema) return { valid: true };

	const errors: Array<{ path: string; message: string }> = [];

	for (const [part, partSchema] of Object.entries(schema)) {
		if (!partSchema) continue;
		const data = triggerData[part as keyof typeof triggerData];
		const validate = ajv.compile(partSchema as Record<string, unknown>);
		if (!validate(data)) {
			for (const err of validate.errors ?? []) {
				errors.push({
					path: `/${part}${err.instancePath}`,
					message: err.message ?? 'validation failed',
				});
			}
		}
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
