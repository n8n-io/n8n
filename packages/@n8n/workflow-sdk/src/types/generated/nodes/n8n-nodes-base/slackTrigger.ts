/**
 * Slack Trigger Node Types
 *
 * Handle Slack events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/slacktrigger/
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

export interface SlackTriggerV1Params {
	authentication?: unknown;
	trigger?: Array<
		| 'any_event'
		| 'app_mention'
		| 'file_public'
		| 'file_share'
		| 'message'
		| 'channel_created'
		| 'team_join'
		| 'reaction_added'
	>;
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

export type SlackTriggerV1Node = {
	type: 'n8n-nodes-base.slackTrigger';
	version: 1;
	config: NodeConfig<SlackTriggerV1Params>;
	credentials?: SlackTriggerV1Credentials;
	isTrigger: true;
};

export type SlackTriggerNode = SlackTriggerV1Node;
