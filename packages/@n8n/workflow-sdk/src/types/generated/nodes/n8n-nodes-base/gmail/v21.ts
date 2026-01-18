/**
 * Gmail Node - Version 2.1
 * Consume the Gmail API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GmailV21MessageAddLabelsConfig = {
	resource: 'message';
	operation: 'addLabels';
	messageId: string | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["message"], operation: ["addLabels", "removeLabels"] }
 * @default []
 */
		labelIds: string[];
};

export type GmailV21MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV21MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	messageId: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["get"], resource: ["message"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type GmailV21MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["message"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["message"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["message"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type GmailV21MessageMarkAsReadConfig = {
	resource: 'message';
	operation: 'markAsRead';
	messageId: string | Expression<string>;
};

export type GmailV21MessageMarkAsUnreadConfig = {
	resource: 'message';
	operation: 'markAsUnread';
	messageId: string | Expression<string>;
};

export type GmailV21MessageRemoveLabelsConfig = {
	resource: 'message';
	operation: 'removeLabels';
	messageId: string | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["message"], operation: ["addLabels", "removeLabels"] }
 * @default []
 */
		labelIds: string[];
};

export type GmailV21MessageReplyConfig = {
	resource: 'message';
	operation: 'reply';
	messageId: string | Expression<string>;
	emailType: 'text' | 'html' | Expression<string>;
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV21MessageSendConfig = {
	resource: 'message';
	operation: 'send';
/**
 * The email addresses of the recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.
 * @displayOptions.show { resource: ["message"], operation: ["send"] }
 */
		sendTo: string | Expression<string>;
	subject: string | Expression<string>;
	emailType: 'text' | 'html' | Expression<string>;
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV21MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
	sendTo: string | Expression<string>;
	subject: string | Expression<string>;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	approvalOptions?: {
		values?: {
			/** Type of Approval
			 * @default single
			 */
			approvalType?: 'single' | 'double' | Expression<string>;
			/** Approve Button Label
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default Approve
			 */
			approveLabel?: string | Expression<string>;
			/** Approve Button Style
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default primary
			 */
			buttonApprovalStyle?: 'primary' | 'secondary' | Expression<string>;
			/** Disapprove Button Label
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default Decline
			 */
			disapproveLabel?: string | Expression<string>;
			/** Disapprove Button Style
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default secondary
			 */
			buttonDisapprovalStyle?: 'primary' | 'secondary' | Expression<string>;
		};
	};
	options?: Record<string, unknown>;
};

export type GmailV21LabelCreateConfig = {
	resource: 'label';
	operation: 'create';
/**
 * Label Name
 * @displayOptions.show { resource: ["label"], operation: ["create"] }
 */
		name: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV21LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
/**
 * The ID of the label
 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
 */
		labelId: string | Expression<string>;
};

export type GmailV21LabelGetConfig = {
	resource: 'label';
	operation: 'get';
/**
 * The ID of the label
 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
 */
		labelId: string | Expression<string>;
};

export type GmailV21LabelGetAllConfig = {
	resource: 'label';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["label"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["label"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type GmailV21DraftCreateConfig = {
	resource: 'draft';
	operation: 'create';
	subject: string | Expression<string>;
	emailType: 'html' | 'text' | Expression<string>;
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV21DraftDeleteConfig = {
	resource: 'draft';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV21DraftGetConfig = {
	resource: 'draft';
	operation: 'get';
	messageId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV21DraftGetAllConfig = {
	resource: 'draft';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["draft"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["draft"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type GmailV21ThreadAddLabelsConfig = {
	resource: 'thread';
	operation: 'addLabels';
	threadId: string | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["thread"], operation: ["addLabels", "removeLabels"] }
 * @default []
 */
		labelIds: string[];
};

export type GmailV21ThreadDeleteConfig = {
	resource: 'thread';
	operation: 'delete';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
};

export type GmailV21ThreadGetConfig = {
	resource: 'thread';
	operation: 'get';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["get"], resource: ["thread"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type GmailV21ThreadGetAllConfig = {
	resource: 'thread';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["thread"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["thread"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type GmailV21ThreadRemoveLabelsConfig = {
	resource: 'thread';
	operation: 'removeLabels';
	threadId: string | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["thread"], operation: ["addLabels", "removeLabels"] }
 * @default []
 */
		labelIds: string[];
};

export type GmailV21ThreadReplyConfig = {
	resource: 'thread';
	operation: 'reply';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["thread"], operation: ["reply"] }
 */
		messageId?: string | Expression<string>;
	emailType: 'text' | 'html' | Expression<string>;
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV21ThreadTrashConfig = {
	resource: 'thread';
	operation: 'trash';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
};

export type GmailV21ThreadUntrashConfig = {
	resource: 'thread';
	operation: 'untrash';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
};

export type GmailV21Params =
	| GmailV21MessageAddLabelsConfig
	| GmailV21MessageDeleteConfig
	| GmailV21MessageGetConfig
	| GmailV21MessageGetAllConfig
	| GmailV21MessageMarkAsReadConfig
	| GmailV21MessageMarkAsUnreadConfig
	| GmailV21MessageRemoveLabelsConfig
	| GmailV21MessageReplyConfig
	| GmailV21MessageSendConfig
	| GmailV21MessageSendAndWaitConfig
	| GmailV21LabelCreateConfig
	| GmailV21LabelDeleteConfig
	| GmailV21LabelGetConfig
	| GmailV21LabelGetAllConfig
	| GmailV21DraftCreateConfig
	| GmailV21DraftDeleteConfig
	| GmailV21DraftGetConfig
	| GmailV21DraftGetAllConfig
	| GmailV21ThreadAddLabelsConfig
	| GmailV21ThreadDeleteConfig
	| GmailV21ThreadGetConfig
	| GmailV21ThreadGetAllConfig
	| GmailV21ThreadRemoveLabelsConfig
	| GmailV21ThreadReplyConfig
	| GmailV21ThreadTrashConfig
	| GmailV21ThreadUntrashConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GmailV21Credentials {
	googleApi: CredentialReference;
	gmailOAuth2: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GmailV21Node = {
	type: 'n8n-nodes-base.gmail';
	version: 2.1;
	config: NodeConfig<GmailV21Params>;
	credentials?: GmailV21Credentials;
};