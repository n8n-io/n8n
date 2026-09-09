import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const GATEWAY_TELEMETRY = defineTelemetryEvents({
	OPPORTUNITY_NUDGE_SHOWN: {
		name: 'Gateway credits opportunity nudge shown',
		description:
			'A sticky toast told the user that nodes in the workflow they just ran manually could switch to Gateway credits instead of their own credential. Fires at most once per editor session, and only when the user has not opted out.',
		properties: z.object({
			workflow_id: z.string(),
			opportunity_count: z
				.number()
				.int()
				.describe('Number of nodes in the run that could switch to Gateway credits'),
		}),
	},
	OPPORTUNITY_NUDGE_ACTIONED: {
		name: 'Gateway credits opportunity nudge actioned',
		description: 'The user acted on the Gateway credits opportunity nudge toast.',
		properties: z.object({
			workflow_id: z.string(),
			method: z
				.enum(['dismiss', 'never_show_again'])
				.describe('dismiss may show again in a later session; never_show_again opts out for good'),
		}),
	},
});
