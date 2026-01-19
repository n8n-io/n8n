/**
 * Slack Trigger Node - Version 1
 * Handle Slack events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface SlackTriggerV1Config {
	authentication?: unknown;
	trigger?: Array<'any_event' | 'app_mention' | 'file_public' | 'file_share' | 'message' | 'channel_created' | 'team_join' | 'reaction_added'>;
/**
 * Whether to watch for the event in the whole workspace, rather than a specific channel
 * @displayOptions.show { trigger: ["any_event", "message", "reaction_added", "file_share", "app_mention"] }
 * @default false
 */
		watchWorkspace?: boolean | Expression<boolean>;
/**
 * The Slack channel to listen to events from. Applies to events: Bot/App mention, File Shared, New Message Posted on Channel, Reaction Added.
 * @displayOptions.show { watchWorkspace: [false] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Whether to download the files and add it to the output
 * @displayOptions.show { trigger: ["any_event", "file_share"] }
 * @default false
 */
		downloadFiles?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface SlackTriggerV1Credentials {
	slackApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SlackTriggerV1NodeBase {
	type: 'n8n-nodes-base.slackTrigger';
	version: 1;
	credentials?: SlackTriggerV1Credentials;
	isTrigger: true;
}

export type SlackTriggerV1Node = SlackTriggerV1NodeBase & {
	config: NodeConfig<SlackTriggerV1Config>;
};

export type SlackTriggerV1Node = SlackTriggerV1Node;