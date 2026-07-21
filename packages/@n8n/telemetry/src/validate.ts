import { z } from 'zod/v4';

import type { TelemetryEventDef } from './define';

export function getEventValidationError(
	event: TelemetryEventDef,
	properties: unknown,
): string | null {
	const issues: string[] = [];

	const result = event.properties.safeParse(properties);
	if (!result.success) {
		for (const issue of result.error.issues) {
			issues.push(`${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);
		}
	}

	if (
		event.properties instanceof z.ZodObject &&
		event.properties.def.catchall === undefined &&
		typeof properties === 'object' &&
		properties !== null
	) {
		const knownKeys = new Set(Object.keys(event.properties.shape));
		for (const key of Object.keys(properties)) {
			if (!knownKeys.has(key)) {
				issues.push(`${key}: unrecognized property`);
			}
		}
	}

	if (issues.length === 0) return null;
	return `Telemetry event "${event.name}" failed schema validation: ${issues.join('; ')}`;
}
