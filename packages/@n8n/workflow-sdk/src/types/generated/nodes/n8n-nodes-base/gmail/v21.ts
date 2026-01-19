/**
 * Gmail Node - Version 2.1
 * Consume the Gmail API
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface GmailV21Credentials {
	googleApi: CredentialReference;
	gmailOAuth2: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GmailV21NodeBase {
	type: 'n8n-nodes-base.gmail';
	version: 2.1;
	credentials?: GmailV21Credentials;
}

export type GmailV21MessageAddLabelsNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageAddLabelsConfig>;
};

export type GmailV21MessageDeleteNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageDeleteConfig>;
};

export type GmailV21MessageGetNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageGetConfig>;
};

export type GmailV21MessageGetAllNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageGetAllConfig>;
};

export type GmailV21MessageMarkAsReadNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageMarkAsReadConfig>;
};

export type GmailV21MessageMarkAsUnreadNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageMarkAsUnreadConfig>;
};

export type GmailV21MessageRemoveLabelsNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageRemoveLabelsConfig>;
};

export type GmailV21MessageReplyNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageReplyConfig>;
};

export type GmailV21MessageSendNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageSendConfig>;
};

export type GmailV21MessageSendAndWaitNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21MessageSendAndWaitConfig>;
};

export type GmailV21LabelCreateNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21LabelCreateConfig>;
};

export type GmailV21LabelDeleteNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21LabelDeleteConfig>;
};

export type GmailV21LabelGetNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21LabelGetConfig>;
};

export type GmailV21LabelGetAllNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21LabelGetAllConfig>;
};

export type GmailV21DraftCreateNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21DraftCreateConfig>;
};

export type GmailV21DraftDeleteNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21DraftDeleteConfig>;
};

export type GmailV21DraftGetNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21DraftGetConfig>;
};

export type GmailV21DraftGetAllNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21DraftGetAllConfig>;
};

export type GmailV21ThreadAddLabelsNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21ThreadAddLabelsConfig>;
};

export type GmailV21ThreadDeleteNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21ThreadDeleteConfig>;
};

export type GmailV21ThreadGetNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21ThreadGetConfig>;
};

export type GmailV21ThreadGetAllNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21ThreadGetAllConfig>;
};

export type GmailV21ThreadRemoveLabelsNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21ThreadRemoveLabelsConfig>;
};

export type GmailV21ThreadReplyNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21ThreadReplyConfig>;
};

export type GmailV21ThreadTrashNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21ThreadTrashConfig>;
};

export type GmailV21ThreadUntrashNode = GmailV21NodeBase & {
	config: NodeConfig<GmailV21ThreadUntrashConfig>;
};

export type GmailV21Node =
	| GmailV21MessageAddLabelsNode
	| GmailV21MessageDeleteNode
	| GmailV21MessageGetNode
	| GmailV21MessageGetAllNode
	| GmailV21MessageMarkAsReadNode
	| GmailV21MessageMarkAsUnreadNode
	| GmailV21MessageRemoveLabelsNode
	| GmailV21MessageReplyNode
	| GmailV21MessageSendNode
	| GmailV21MessageSendAndWaitNode
	| GmailV21LabelCreateNode
	| GmailV21LabelDeleteNode
	| GmailV21LabelGetNode
	| GmailV21LabelGetAllNode
	| GmailV21DraftCreateNode
	| GmailV21DraftDeleteNode
	| GmailV21DraftGetNode
	| GmailV21DraftGetAllNode
	| GmailV21ThreadAddLabelsNode
	| GmailV21ThreadDeleteNode
	| GmailV21ThreadGetNode
	| GmailV21ThreadGetAllNode
	| GmailV21ThreadRemoveLabelsNode
	| GmailV21ThreadReplyNode
	| GmailV21ThreadTrashNode
	| GmailV21ThreadUntrashNode
	;