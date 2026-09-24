import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { DOMAIN_TOOL_IDS } from '../tool-ids';

/**
 * The agent's explicit exit from the onboarding flow. The host reacts to the tool call
 * itself and restores the normal chat chrome, so the handler has nothing to do.
 */
export function createLeaveOnboardingTool() {
	return (
		new Tool(DOMAIN_TOOL_IDS.LEAVE_ONBOARDING)
			.description(
				'End the onboarding flow. Call it when the user wants to stop the onboarding, explore n8n ' +
					'on their own, or asks for something unrelated to picking a first automation. Then help ' +
					'them with what they asked. Not needed before a build: a build ends the onboarding by itself.',
			)
			.input(z.object({}))
			.output(z.object({ left: z.boolean() }))
			// ponytail: the frontend persists the exit (thread metadata `onboardingLeft`) when it sees
			// this call. Persist it here once the backend must know without a connected client.
			.handler(async () => ({ left: true }))
			.build()
	);
}
