import type { TelemetryEventRegistry } from './define';
import { AGENTS_TELEMETRY } from './events/agents';
import { INSTANCE_TELEMETRY } from './events/instance';
import { MCP_TELEMETRY } from './events/mcp';
import { PLATFORM_TELEMETRY } from './events/platform';

export const TELEMETRY_EVENT = {
	PLATFORM: PLATFORM_TELEMETRY,
	AGENTS: AGENTS_TELEMETRY,
	INSTANCE: INSTANCE_TELEMETRY,
	MCP: MCP_TELEMETRY,
} satisfies TelemetryEventRegistry;
