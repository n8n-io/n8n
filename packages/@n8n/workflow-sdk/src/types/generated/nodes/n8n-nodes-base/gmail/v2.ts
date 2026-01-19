/**
 * Gmail Node - Version 2
 * Consume the Gmail API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GmailV2MessageAddLabelsConfig = {
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

export type GmailV2MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV2MessageGetConfig = {
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

export type GmailV2MessageGetAllConfig = {
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

export type GmailV2MessageMarkAsReadConfig = {
	resource: 'message';
	operation: 'markAsRead';
	messageId: string | Expression<string>;
};

export type GmailV2MessageMarkAsUnreadConfig = {
	resource: 'message';
	operation: 'markAsUnread';
	messageId: string | Expression<string>;
};

export type GmailV2MessageRemoveLabelsConfig = {
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

export type GmailV2MessageReplyConfig = {
	resource: 'message';
	operation: 'reply';
	messageId: string | Expression<string>;
	emailType: 'text' | 'html' | Expression<string>;
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV2MessageSendConfig = {
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

export type GmailV2MessageSendAndWaitConfig = {
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

export type GmailV2LabelCreateConfig = {
	resource: 'label';
	operation: 'create';
/**
 * Label Name
 * @displayOptions.show { resource: ["label"], operation: ["create"] }
 */
		name: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV2LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
/**
 * The ID of the label
 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
 */
		labelId: string | Expression<string>;
};

export type GmailV2LabelGetConfig = {
	resource: 'label';
	operation: 'get';
/**
 * The ID of the label
 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
 */
		labelId: string | Expression<string>;
};

export type GmailV2LabelGetAllConfig = {
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

export type GmailV2DraftCreateConfig = {
	resource: 'draft';
	operation: 'create';
	subject: string | Expression<string>;
	emailType: 'html' | 'text' | Expression<string>;
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV2DraftDeleteConfig = {
	resource: 'draft';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV2DraftGetConfig = {
	resource: 'draft';
	operation: 'get';
	messageId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV2DraftGetAllConfig = {
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

export type GmailV2ThreadAddLabelsConfig = {
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

export type GmailV2ThreadDeleteConfig = {
	resource: 'thread';
	operation: 'delete';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
};

export type GmailV2ThreadGetConfig = {
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

export type GmailV2ThreadGetAllConfig = {
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

export type GmailV2ThreadRemoveLabelsConfig = {
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

export type GmailV2ThreadReplyConfig = {
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

export type GmailV2ThreadTrashConfig = {
	resource: 'thread';
	operation: 'trash';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
};

export type GmailV2ThreadUntrashConfig = {
	resource: 'thread';
	operation: 'untrash';
/**
 * The ID of the thread you are operating on
 * @displayOptions.show { resource: ["thread"], operation: ["get", "delete", "reply", "trash", "untrash"] }
 */
		threadId: string | Expression<string>;
};

export type GmailV2Params =
	| GmailV2MessageAddLabelsConfig
	| GmailV2MessageDeleteConfig
	| GmailV2MessageGetConfig
	| GmailV2MessageGetAllConfig
	| GmailV2MessageMarkAsReadConfig
	| GmailV2MessageMarkAsUnreadConfig
	| GmailV2MessageRemoveLabelsConfig
	| GmailV2MessageReplyConfig
	| GmailV2MessageSendConfig
	| GmailV2MessageSendAndWaitConfig
	| GmailV2LabelCreateConfig
	| GmailV2LabelDeleteConfig
	| GmailV2LabelGetConfig
	| GmailV2LabelGetAllConfig
	| GmailV2DraftCreateConfig
	| GmailV2DraftDeleteConfig
	| GmailV2DraftGetConfig
	| GmailV2DraftGetAllConfig
	| GmailV2ThreadAddLabelsConfig
	| GmailV2ThreadDeleteConfig
	| GmailV2ThreadGetConfig
	| GmailV2ThreadGetAllConfig
	| GmailV2ThreadRemoveLabelsConfig
	| GmailV2ThreadReplyConfig
	| GmailV2ThreadTrashConfig
	| GmailV2ThreadUntrashConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GmailV2Credentials {
	googleApi: CredentialReference;
	gmailOAuth2: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GmailV2NodeBase {
	type: 'n8n-nodes-base.gmail';
	version: 2;
	credentials?: GmailV2Credentials;
}

export type GmailV2MessageAddLabelsNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageAddLabelsConfig>;
};

export type GmailV2MessageDeleteNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageDeleteConfig>;
};

export type GmailV2MessageGetNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageGetConfig>;
};

export type GmailV2MessageGetAllNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageGetAllConfig>;
};

export type GmailV2MessageMarkAsReadNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageMarkAsReadConfig>;
};

export type GmailV2MessageMarkAsUnreadNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageMarkAsUnreadConfig>;
};

export type GmailV2MessageRemoveLabelsNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageRemoveLabelsConfig>;
};

export type GmailV2MessageReplyNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageReplyConfig>;
};

export type GmailV2MessageSendNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageSendConfig>;
};

export type GmailV2MessageSendAndWaitNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2MessageSendAndWaitConfig>;
};

export type GmailV2LabelCreateNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2LabelCreateConfig>;
};

export type GmailV2LabelDeleteNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2LabelDeleteConfig>;
};

export type GmailV2LabelGetNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2LabelGetConfig>;
};

export type GmailV2LabelGetAllNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2LabelGetAllConfig>;
};

export type GmailV2DraftCreateNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2DraftCreateConfig>;
};

export type GmailV2DraftDeleteNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2DraftDeleteConfig>;
};

export type GmailV2DraftGetNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2DraftGetConfig>;
};

export type GmailV2DraftGetAllNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2DraftGetAllConfig>;
};

export type GmailV2ThreadAddLabelsNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2ThreadAddLabelsConfig>;
};

export type GmailV2ThreadDeleteNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2ThreadDeleteConfig>;
};

export type GmailV2ThreadGetNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2ThreadGetConfig>;
};

export type GmailV2ThreadGetAllNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2ThreadGetAllConfig>;
};

export type GmailV2ThreadRemoveLabelsNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2ThreadRemoveLabelsConfig>;
};

export type GmailV2ThreadReplyNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2ThreadReplyConfig>;
};

export type GmailV2ThreadTrashNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2ThreadTrashConfig>;
};

export type GmailV2ThreadUntrashNode = GmailV2NodeBase & {
	config: NodeConfig<GmailV2ThreadUntrashConfig>;
};

export type GmailV2Node =
	| GmailV2MessageAddLabelsNode
	| GmailV2MessageDeleteNode
	| GmailV2MessageGetNode
	| GmailV2MessageGetAllNode
	| GmailV2MessageMarkAsReadNode
	| GmailV2MessageMarkAsUnreadNode
	| GmailV2MessageRemoveLabelsNode
	| GmailV2MessageReplyNode
	| GmailV2MessageSendNode
	| GmailV2MessageSendAndWaitNode
	| GmailV2LabelCreateNode
	| GmailV2LabelDeleteNode
	| GmailV2LabelGetNode
	| GmailV2LabelGetAllNode
	| GmailV2DraftCreateNode
	| GmailV2DraftDeleteNode
	| GmailV2DraftGetNode
	| GmailV2DraftGetAllNode
	| GmailV2ThreadAddLabelsNode
	| GmailV2ThreadDeleteNode
	| GmailV2ThreadGetNode
	| GmailV2ThreadGetAllNode
	| GmailV2ThreadRemoveLabelsNode
	| GmailV2ThreadReplyNode
	| GmailV2ThreadTrashNode
	| GmailV2ThreadUntrashNode
	;