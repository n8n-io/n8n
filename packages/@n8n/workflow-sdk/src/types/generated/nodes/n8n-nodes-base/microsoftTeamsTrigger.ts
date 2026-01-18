/**
 * Microsoft Teams Trigger Node Types
 *
 * Triggers workflows in n8n based on events from Microsoft Teams, such as new messages or team updates, using specified configurations.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftteamstrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	event?:
		| 'newChannel'
		| 'newChannelMessage'
		| 'newChat'
		| 'newChatMessage'
		| 'newTeamMember'
		| Expression<string>;
	/**
	 * Whether to watch for the event in all the available teams
	 * @default false
	 */
	watchAllTeams?: boolean | Expression<boolean>;
	/**
	 * Select a team from the list, enter an ID or a URL
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Whether to watch for the event in all the available channels
	 * @default false
	 */
	watchAllChannels?: boolean | Expression<boolean>;
	/**
	 * Select a channel from the list, enter an ID or a URL
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * Whether to watch for the event in all the available chats
	 * @default false
	 */
	watchAllChats?: boolean | Expression<boolean>;
	/**
	 * Select a chat from the list, enter an ID or a URL
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

export type MicrosoftTeamsTriggerV1Node = {
	type: 'n8n-nodes-base.microsoftTeamsTrigger';
	version: 1;
	config: NodeConfig<MicrosoftTeamsTriggerV1Params>;
	credentials?: MicrosoftTeamsTriggerV1Credentials;
	isTrigger: true;
};

export type MicrosoftTeamsTriggerNode = MicrosoftTeamsTriggerV1Node;
