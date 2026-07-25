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
});
