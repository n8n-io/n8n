import { z } from 'zod/v4';

import type { TelemetryEventRegistry } from './define';

export function collectDuplicateNames(registry: TelemetryEventRegistry): string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const domain of Object.values(registry)) {
		for (const entry of Object.values(domain)) {
			if (seen.has(entry.name)) {
				duplicates.add(entry.name);
			}
			seen.add(entry.name);
		}
	}
	return [...duplicates];
}

export function validateEntrySchemas(registry: TelemetryEventRegistry): string[] {
	const errors: string[] = [];
	for (const [domainKey, domain] of Object.entries(registry)) {
		for (const [entryKey, entry] of Object.entries(domain)) {
			const id = `${domainKey}.${entryKey} ("${entry.name}")`;
			if (!entry.description.trim()) {
				errors.push(`${id}: description must not be empty`);
			}
			if (!(entry.properties instanceof z.ZodObject)) {
				errors.push(`${id}: properties must be a zod object schema`);
				continue;
			}
			try {
				z.toJSONSchema(entry.properties);
			} catch (error) {
				const reason = error instanceof Error ? error.message : String(error);
				errors.push(`${id}: properties are not JSON-Schema-representable: ${reason}`);
			}
		}
	}
	return errors;
}
