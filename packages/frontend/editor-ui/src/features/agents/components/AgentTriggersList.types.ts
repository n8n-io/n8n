import type { IconName } from '@n8n/design-system';

/** One connected channel, as the triggers list shows it. */
export interface AgentTriggerChannelItem {
	type: string;
	label: string;
	icon: IconName;
	credentialName?: string;
	invalidReasons: string[];
	invalidIcon?: IconName;
	warningReasons: string[];
	connected: boolean;
}
