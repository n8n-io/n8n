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
	pollTimes?: {
		item?: Array<{
			mode?:
				| 'everyMinute'
				| 'everyHour'
				| 'everyDay'
				| 'everyWeek'
				| 'everyMonth'
				| 'everyX'
				| 'custom'
				| Expression<string>;
			hour?: number | Expression<number>;
			minute?: number | Expression<number>;
			dayOfMonth?: number | Expression<number>;
			weekday?: '1' | '2' | '3' | '4' | '5' | '6' | '0' | Expression<string>;
			cronExpression?: string | Expression<string>;
			value?: number | Expression<number>;
			unit?: 'minutes' | 'hours' | Expression<string>;
		}>;
	};
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
// Node Types
// ===========================================================================

export type MicrosoftOutlookTriggerV1Node = {
	type: 'n8n-nodes-base.microsoftOutlookTrigger';
	version: 1;
	config: NodeConfig<MicrosoftOutlookTriggerV1Params>;
	credentials?: MicrosoftOutlookTriggerV1Credentials;
	isTrigger: true;
};

export type MicrosoftOutlookTriggerNode = MicrosoftOutlookTriggerV1Node;
