import type { IconName } from '@n8n/design-system';

/** One connected channel, as the triggers list shows it. */
export interface AgentTriggerChannelItem {
	type: string;
	label: string;
	icon: IconName;
	credentialName?: string;
	/** How users reach the agent, such as "Mention @AgentBot in Acme". */
	mentionLabel?: string;
	invalidReasons: string[];
	invalidIcon?: IconName;
	warningReasons: string[];
	connected: boolean;
}
