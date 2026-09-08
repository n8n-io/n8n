import type { LocalGatewayChannel } from '@n8n/instance-ai';

/**
 * The Computer Use entry points this user can actually reach in the chat input's
 * + menu.
 *
 * This mirrors the client's own gate in `useInstanceAiInputMenuItems.ts`: each
 * entry is rendered only when its rollout covers the user AND the admin allows
 * that channel. The backend has to agree with the client, because the system
 * prompt tells the agent to send the user to these entries by name — and an
 * entry the client hides is a control the user cannot find (INS-1293).
 *
 * Note the two channels are gated independently, so "no local computer" does not
 * imply "no browser". Returning [] means Computer Use is unreachable for this
 * user and must not be mentioned at all.
 */
export function resolveConnectableComputerUseChannels({
	localGatewayDisabledGlobally,
	browserUseEnabledGlobally,
	computerUseExperimentEnabled,
	browserUseExperimentEnabled,
}: {
	/** Admin kill-switch for the local gateway (`N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED`). */
	localGatewayDisabledGlobally: boolean;
	/** Admin switch for browser-use, on by default. */
	browserUseEnabledGlobally: boolean;
	/** PostHog `091_instance_ai_computer_use` covers this user. */
	computerUseExperimentEnabled: boolean;
	/** PostHog `090_instance_ai_browser_use` covers this user. */
	browserUseExperimentEnabled: boolean;
}): LocalGatewayChannel[] {
	const channels: LocalGatewayChannel[] = [];

	if (computerUseExperimentEnabled && !localGatewayDisabledGlobally) {
		channels.push('localComputer');
	}
	if (browserUseExperimentEnabled && browserUseEnabledGlobally) {
		channels.push('browser');
	}

	return channels;
}
