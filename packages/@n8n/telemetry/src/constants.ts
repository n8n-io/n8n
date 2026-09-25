import type { TelemetryEventDef } from './define';
import { TELEMETRY_EVENT } from './telemetry-events';

export const POSTHOG_EVENTS_BLACKLIST: readonly TelemetryEventDef[] = [
	TELEMETRY_EVENT.PLATFORM.USER_IS_PART_OF_EXPERIMENT,
];
