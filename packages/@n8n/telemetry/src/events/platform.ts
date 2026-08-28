import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const PLATFORM_TELEMETRY = defineTelemetryEvents({
	USER_IS_PART_OF_EXPERIMENT: {
		name: 'User is part of experiment',
		description:
			'User was assigned a variant of a running experiment, reported when feature flags resolve in the editor.',
		properties: z.object({
			name: z.string().describe('Experiment feature-flag key'),
			variant: z.union([z.string(), z.boolean()]).describe('Variant assigned to the user'),
		}),
	},
	TASK_RUNNER_DISCONNECTED: {
		name: 'Task runner disconnected',
		description:
			'The broker tore down a task runner connection because the runner was unhealthy: it failed a heartbeat check, or was reported unresponsive after it stopped acknowledging or offering tasks. Normal shutdowns are not reported.',
		properties: z.object({
			reason: z
				.enum(['failed-heartbeat-check', 'runner-unresponsive'])
				.describe('Which detection reported the runner as unhealthy'),
			mode: z.enum(['internal', 'external']).describe('Task runners deployment mode'),
		}),
	},
});
