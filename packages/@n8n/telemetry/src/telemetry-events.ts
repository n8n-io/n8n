import type { TelemetryEventRegistry } from './define';
import { AGENTS_TELEMETRY } from './events/agents';
import { CREDENTIALS_TELEMETRY } from './events/credentials';
import { INSTANCE_TELEMETRY } from './events/instance';
import { INSTANCE_AI_TELEMETRY } from './events/instance-ai';
import { PLATFORM_TELEMETRY } from './events/platform';
import { PROJECT_FILES_TELEMETRY } from './events/project-files';

export const TELEMETRY_EVENT = {
	PLATFORM: PLATFORM_TELEMETRY,
	AGENTS: AGENTS_TELEMETRY,
	CREDENTIALS: CREDENTIALS_TELEMETRY,
	INSTANCE: INSTANCE_TELEMETRY,
	INSTANCE_AI: INSTANCE_AI_TELEMETRY,
	PROJECT_FILES: PROJECT_FILES_TELEMETRY,
} satisfies TelemetryEventRegistry;
