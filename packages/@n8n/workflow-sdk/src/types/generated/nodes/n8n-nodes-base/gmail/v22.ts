/**
 * Gmail Node - Version 2.2
 * Consume the Gmail API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GmailV22MessageAddLabelsConfig = {
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

export type GmailV22MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV22MessageGetConfig = {
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

export type GmailV22MessageGetAllConfig = {
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

export type GmailV22MessageMarkAsReadConfig = {
	resource: 'message';
	operation: 'markAsRead';
	messageId: string | Expression<string>;
};

export type GmailV22MessageMarkAsUnreadConfig = {
	resource: 'message';
	operation: 'markAsUnread';
	messageId: string | Expression<string>;
};

export type GmailV22MessageRemoveLabelsConfig = {
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

export type GmailV22MessageReplyConfig = {
	resource: 'message';
	operation: 'reply';
	messageId: string | Expression<string>;
	emailType: 'text' | 'html' | Expression<string>;
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV22MessageSendConfig = {
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

export type GmailV22MessageSendAndWaitConfig = {
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

export type GmailV22LabelCreateConfig = {
	resource: 'label';
	operation: 'create';
/**
 * Label Name
 * @displayOptions.show { resource: ["label"], operation: ["create"] }
 */
		name: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV22LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
/**
 * The ID of the label
 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
 */
		labelId: string | Expression<string>;
};

export type GmailV22LabelGetConfig = {
	resource: 'label';
	operation: 'get';
/**
 * The ID of the label
 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
 */
		labelId: string | Expression<string>;
};

export type GmailV22LabelGetAllConfig = {
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

export type GmailV22DraftCreateConfig = {
	resource: 'draft';
	operation: 'create';
	subject: string | Expression<string>;
	emailType: 'html' | 'text' | Expression<string>;
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV22DraftDeleteConfig = {
	resource: 'draft';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV22DraftGetConfig = {
	resource: 'draft';
	operation: 'get';
	messageId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV22DraftGetAllConfig = {
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

export type GmailV22ThreadAddLabelsConfig = {
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

export type GmailV22ThreadDeleteConfig = {
	resource: 'thread';
	operation: 'delete';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
};

export type GmailV22ThreadGetConfig = {
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

export type GmailV22ThreadGetAllConfig = {
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

export type GmailV22ThreadRemoveLabelsConfig = {
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

export type GmailV22ThreadReplyConfig = {
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

export type GmailV22ThreadTrashConfig = {
	resource: 'thread';
	operation: 'trash';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
};

export type GmailV22ThreadUntrashConfig = {
	resource: 'thread';
	operation: 'untrash';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
};

export type GmailV22Params =
	| GmailV22MessageAddLabelsConfig
	| GmailV22MessageDeleteConfig
	| GmailV22MessageGetConfig
	| GmailV22MessageGetAllConfig
	| GmailV22MessageMarkAsReadConfig
	| GmailV22MessageMarkAsUnreadConfig
	| GmailV22MessageRemoveLabelsConfig
	| GmailV22MessageReplyConfig
	| GmailV22MessageSendConfig
	| GmailV22MessageSendAndWaitConfig
	| GmailV22LabelCreateConfig
	| GmailV22LabelDeleteConfig
	| GmailV22LabelGetConfig
	| GmailV22LabelGetAllConfig
	| GmailV22DraftCreateConfig
	| GmailV22DraftDeleteConfig
	| GmailV22DraftGetConfig
	| GmailV22DraftGetAllConfig
	| GmailV22ThreadAddLabelsConfig
	| GmailV22ThreadDeleteConfig
	| GmailV22ThreadGetConfig
	| GmailV22ThreadGetAllConfig
	| GmailV22ThreadRemoveLabelsConfig
	| GmailV22ThreadReplyConfig
	| GmailV22ThreadTrashConfig
	| GmailV22ThreadUntrashConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GmailV22Credentials {
	googleApi: CredentialReference;
	gmailOAuth2: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GmailV22NodeBase {
	type: 'n8n-nodes-base.gmail';
	version: 2.2;
	credentials?: GmailV22Credentials;
}

export type GmailV22MessageAddLabelsNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageAddLabelsConfig>;
};

export type GmailV22MessageDeleteNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageDeleteConfig>;
};

export type GmailV22MessageGetNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageGetConfig>;
};

export type GmailV22MessageGetAllNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageGetAllConfig>;
};

export type GmailV22MessageMarkAsReadNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageMarkAsReadConfig>;
};

export type GmailV22MessageMarkAsUnreadNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageMarkAsUnreadConfig>;
};

export type GmailV22MessageRemoveLabelsNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageRemoveLabelsConfig>;
};

export type GmailV22MessageReplyNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageReplyConfig>;
};

export type GmailV22MessageSendNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageSendConfig>;
};

export type GmailV22MessageSendAndWaitNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22MessageSendAndWaitConfig>;
};

export type GmailV22LabelCreateNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22LabelCreateConfig>;
};

export type GmailV22LabelDeleteNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22LabelDeleteConfig>;
};

export type GmailV22LabelGetNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22LabelGetConfig>;
};

export type GmailV22LabelGetAllNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22LabelGetAllConfig>;
};

export type GmailV22DraftCreateNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22DraftCreateConfig>;
};

export type GmailV22DraftDeleteNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22DraftDeleteConfig>;
};

export type GmailV22DraftGetNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22DraftGetConfig>;
};

export type GmailV22DraftGetAllNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22DraftGetAllConfig>;
};

export type GmailV22ThreadAddLabelsNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22ThreadAddLabelsConfig>;
};

export type GmailV22ThreadDeleteNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22ThreadDeleteConfig>;
};

export type GmailV22ThreadGetNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22ThreadGetConfig>;
};

export type GmailV22ThreadGetAllNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22ThreadGetAllConfig>;
};

export type GmailV22ThreadRemoveLabelsNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22ThreadRemoveLabelsConfig>;
};

export type GmailV22ThreadReplyNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22ThreadReplyConfig>;
};

export type GmailV22ThreadTrashNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22ThreadTrashConfig>;
};

export type GmailV22ThreadUntrashNode = GmailV22NodeBase & {
	config: NodeConfig<GmailV22ThreadUntrashConfig>;
};

export type GmailV22Node =
	| GmailV22MessageAddLabelsNode
	| GmailV22MessageDeleteNode
	| GmailV22MessageGetNode
	| GmailV22MessageGetAllNode
	| GmailV22MessageMarkAsReadNode
	| GmailV22MessageMarkAsUnreadNode
	| GmailV22MessageRemoveLabelsNode
	| GmailV22MessageReplyNode
	| GmailV22MessageSendNode
	| GmailV22MessageSendAndWaitNode
	| GmailV22LabelCreateNode
	| GmailV22LabelDeleteNode
	| GmailV22LabelGetNode
	| GmailV22LabelGetAllNode
	| GmailV22DraftCreateNode
	| GmailV22DraftDeleteNode
	| GmailV22DraftGetNode
	| GmailV22DraftGetAllNode
	| GmailV22ThreadAddLabelsNode
	| GmailV22ThreadDeleteNode
	| GmailV22ThreadGetNode
	| GmailV22ThreadGetAllNode
	| GmailV22ThreadRemoveLabelsNode
	| GmailV22ThreadReplyNode
	| GmailV22ThreadTrashNode
	| GmailV22ThreadUntrashNode
	;