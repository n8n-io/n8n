/**
 * Microsoft Outlook Trigger Node Types
 *
 * Fetches emails from Microsoft Outlook and starts the workflow on specified polling intervals.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftoutlooktrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MicrosoftOutlookTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	event?: 'messageReceived' | Expression<string>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
	/**
	 * The fields to add to the output
	 * @default []
	 */
	fields?: Array<
		| 'bccRecipients'
		| 'body'
		| 'bodyPreview'
		| 'categories'
		| 'ccRecipients'
		| 'changeKey'
		| 'conversationId'
		| 'createdDateTime'
		| 'flag'
		| 'from'
		| 'hasAttachments'
		| 'importance'
		| 'inferenceClassification'
		| 'internetMessageId'
		| 'isDeliveryReceiptRequested'
		| 'isDraft'
		| 'isRead'
		| 'isReadReceiptRequested'
		| 'lastModifiedDateTime'
		| 'parentFolderId'
		| 'receivedDateTime'
		| 'replyTo'
		| 'sender'
		| 'sentDateTime'
		| 'subject'
		| 'toRecipients'
		| 'webLink'
	>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOutlookTriggerV1Credentials {
	microsoftOutlookOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MicrosoftOutlookTriggerNode = {
	type: 'n8n-nodes-base.microsoftOutlookTrigger';
	version: 1;
	config: NodeConfig<MicrosoftOutlookTriggerV1Params>;
	credentials?: MicrosoftOutlookTriggerV1Credentials;
	isTrigger: true;
};
