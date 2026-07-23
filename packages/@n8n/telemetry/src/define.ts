import type { z, ZodType } from 'zod/v4';

export type TelemetryEventDef = {
	readonly name: string;
	readonly description: string;
	readonly properties: ZodType;
};

export type InferTelemetryProps<T extends TelemetryEventDef> = z.infer<T['properties']>;

export type TelemetryEventRegistry = Record<string, Record<string, TelemetryEventDef>>;

export function defineTelemetryEvents<const T extends Record<string, TelemetryEventDef>>(
	events: T,
): T {
	return events;
}
