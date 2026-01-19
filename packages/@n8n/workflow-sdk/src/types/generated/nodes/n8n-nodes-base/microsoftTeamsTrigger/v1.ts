/**
 * Microsoft Teams Trigger Node - Version 1
 * Triggers workflows in n8n based on events from Microsoft Teams, such as new messages or team updates, using specified configurations.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface MicrosoftTeamsTriggerV1Params {
/**
 * Select the event to trigger the workflow
 * @default newChannelMessage
 */
		event?: 'newChannel' | 'newChannelMessage' | 'newChat' | 'newChatMessage' | 'newTeamMember' | Expression<string>;
/**
 * Whether to watch for the event in all the available teams
 * @displayOptions.show { event: ["newChannel", "newChannelMessage", "newTeamMember"] }
 * @default false
 */
		watchAllTeams?: boolean | Expression<boolean>;
/**
 * Select a team from the list, enter an ID or a URL
 * @displayOptions.show { event: ["newChannel", "newChannelMessage", "newTeamMember"], watchAllTeams: [false] }
 * @default {"mode":"list","value":""}
 */
		teamId: ResourceLocatorValue;
/**
 * Whether to watch for the event in all the available channels
 * @displayOptions.show { event: ["newChannelMessage"], watchAllTeams: [false] }
 * @default false
 */
		watchAllChannels?: boolean | Expression<boolean>;
/**
 * Select a channel from the list, enter an ID or a URL
 * @displayOptions.show { event: ["newChannelMessage"], watchAllTeams: [false], watchAllChannels: [false] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Whether to watch for the event in all the available chats
 * @displayOptions.show { event: ["newChatMessage"] }
 * @default false
 */
		watchAllChats?: boolean | Expression<boolean>;
/**
 * Select a chat from the list, enter an ID or a URL
 * @displayOptions.show { event: ["newChatMessage"], watchAllChats: [false] }
 * @default {"mode":"list","value":""}
 */
		chatId: ResourceLocatorValue;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftTeamsTriggerV1Credentials {
	microsoftTeamsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftTeamsTriggerV1NodeBase {
	type: 'n8n-nodes-base.microsoftTeamsTrigger';
	version: 1;
	credentials?: MicrosoftTeamsTriggerV1Credentials;
	isTrigger: true;
}

export type MicrosoftTeamsTriggerV1ParamsNode = MicrosoftTeamsTriggerV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsTriggerV1Params>;
};

export type MicrosoftTeamsTriggerV1Node = MicrosoftTeamsTriggerV1ParamsNode;