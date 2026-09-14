import type { z, ZodType } from 'zod/v4';

import { getEventValidationError } from './validate';

export type TelemetryEventInput = {
	readonly name: string;
	readonly description: string;
	readonly properties: ZodType;
};

export type TelemetryEventDef = TelemetryEventInput & {
	readonly getValidationError: (properties: unknown) => string | null;
};

export type InferTelemetryProps<T extends TelemetryEventInput> = z.infer<T['properties']>;

export type TelemetryEventRegistry = Record<string, Record<string, TelemetryEventDef>>;

export function defineTelemetryEvents<const T extends Record<string, TelemetryEventInput>>(
	events: T,
): { readonly [K in keyof T]: T[K] & TelemetryEventDef } {
	const result: Record<string, TelemetryEventDef> = {};
	for (const [key, event] of Object.entries(events)) {
		result[key] = {
			...event,
			getValidationError: (properties: unknown) => getEventValidationError(event, properties),
		};
	}
	return result as { readonly [K in keyof T]: T[K] & TelemetryEventDef };
}
