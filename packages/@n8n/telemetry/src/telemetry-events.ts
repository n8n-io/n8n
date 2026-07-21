import type { TelemetryEventRegistry } from './define';
import { PLATFORM_TELEMETRY } from './events/platform';

export const TELEMETRY_EVENT = {
	PLATFORM: PLATFORM_TELEMETRY,
} satisfies TelemetryEventRegistry;
