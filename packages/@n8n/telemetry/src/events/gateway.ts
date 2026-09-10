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
				.enum(['dismiss', 'never_show_again', 'review_and_switch'])
				.describe(
					'dismiss may show again in a later session; never_show_again opts out for good; review_and_switch opens the switch modal with every offered node pre-selected',
				),
			offered_count: z
				.number()
				.int()
				.optional()
				.describe(
					'Number of nodes offered when method is review_and_switch. Joins to opportunity_count on the shown event and to selected_count on the switch-applied event, to measure offered → opened → applied.',
				),
		}),
	},
	SWITCH_APPLIED: {
		name: 'Gateway credits switch applied',
		description:
			'The user confirmed the switch-to-Gateway-credits modal, opened from the opportunity nudge. Fires once per confirm, whether or not every selected node switched.',
		properties: z.object({
			workflow_id: z.string(),
			selected_count: z
				.number()
				.int()
				.describe('Number of nodes the user selected in the switch modal'),
			applied_count: z
				.number()
				.int()
				.describe('Number of selected nodes successfully switched to a Gateway credits credential'),
			failed_count: z
				.number()
				.int()
				.describe('Number of selected nodes that could not be switched'),
		}),
	},
});
