import type { TelemetryEventRegistry } from './define';
import { AGENTS_TELEMETRY } from './events/agents';
import { INSTANCE_AI_TELEMETRY } from './events/instance-ai';
import { PLATFORM_TELEMETRY } from './events/platform';

export const TELEMETRY_EVENT = {
	PLATFORM: PLATFORM_TELEMETRY,
	AGENTS: AGENTS_TELEMETRY,
	INSTANCE_AI: INSTANCE_AI_TELEMETRY,
} satisfies TelemetryEventRegistry;
