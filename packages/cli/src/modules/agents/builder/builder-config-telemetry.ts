import type { TelemetryEventDef } from '@n8n/telemetry';
import type { GenericValue } from 'n8n-workflow';

export type BuilderTrackFn = (
	entry: TelemetryEventDef,
	properties: Record<string, GenericValue>,
) => void;
