/**
 * Gmail Node Types
 *
 * Consume the Gmail API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/gmail/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GmailV22MessageAddLabelsConfig = {
	resource: 'message';
	operation: 'addLabels';
	messageId: string | Expression<string>;
	/**
	 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	formFields?: {
		values?: Array<{
			fieldName?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldName?: string | Expression<string>;
			fieldType?:
				| 'checkbox'
				| 'html'
				| 'date'
				| 'dropdown'
				| 'email'
				| 'file'
				| 'hiddenField'
				| 'number'
				| 'password'
				| 'radio'
				| 'text'
				| 'textarea'
				| Expression<string>;
			elementName?: string | Expression<string>;
			fieldName?: string | Expression<string>;
			placeholder?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			multiselect?: boolean | Expression<boolean>;
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			numberOfSelections?: number | Expression<number>;
			minSelections?: number | Expression<number>;
			maxSelections?: number | Expression<number>;
			html?: string | Expression<string>;
			multipleFiles?: boolean | Expression<boolean>;
			acceptFileTypes?: string | Expression<string>;
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
	approvalOptions?: {
		values?: {
			approvalType?: 'single' | 'double' | Expression<string>;
			approveLabel?: string | Expression<string>;
			buttonApprovalStyle?: 'primary' | 'secondary' | Expression<string>;
			disapproveLabel?: string | Expression<string>;
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
	 */
	name: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GmailV22LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
	/**
	 * The ID of the label
	 */
	labelId: string | Expression<string>;
};

export type GmailV22LabelGetConfig = {
	resource: 'label';
	operation: 'get';
	/**
	 * The ID of the label
	 */
	labelId: string | Expression<string>;
};

export type GmailV22LabelGetAllConfig = {
	resource: 'label';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default []
	 */
	labelIds: string[];
};

export type GmailV22ThreadDeleteConfig = {
	resource: 'thread';
	operation: 'delete';
	/**
	 * The ID of the thread you are operating on
	 */
	threadId: string | Expression<string>;
};

export type GmailV22ThreadGetConfig = {
	resource: 'thread';
	operation: 'get';
	/**
	 * The ID of the thread you are operating on
	 */
	threadId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default []
	 */
	labelIds: string[];
};

export type GmailV22ThreadReplyConfig = {
	resource: 'thread';
	operation: 'reply';
	/**
	 * The ID of the thread you are operating on
	 */
	threadId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	threadId: string | Expression<string>;
};

export type GmailV22ThreadUntrashConfig = {
	resource: 'thread';
	operation: 'untrash';
	/**
	 * The ID of the thread you are operating on
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
	| GmailV22ThreadUntrashConfig;

export type GmailV1DraftCreateConfig = {
	resource: 'draft';
	operation: 'create';
	subject: string | Expression<string>;
	/**
	 * Whether the message should also be included as HTML
	 * @default false
	 */
	includeHtml?: boolean | Expression<boolean>;
	/**
	 * The HTML message body
	 */
	htmlMessage: string | Expression<string>;
	/**
	 * The message body. If HTML formatted, then you have to add and activate the option "HTML content" in the "Additional Options" section.
	 */
	message: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1DraftDeleteConfig = {
	resource: 'draft';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV1DraftGetConfig = {
	resource: 'draft';
	operation: 'get';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1DraftGetAllConfig = {
	resource: 'draft';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1LabelCreateConfig = {
	resource: 'label';
	operation: 'create';
	/**
	 * Label Name
	 */
	name: string | Expression<string>;
	/**
	 * The visibility of the label in the label list in the Gmail web interface
	 * @default labelShow
	 */
	labelListVisibility: 'labelHide' | 'labelShow' | 'labelShowIfUnread' | Expression<string>;
	/**
	 * The visibility of messages with this label in the message list in the Gmail web interface
	 * @default show
	 */
	messageListVisibility: 'hide' | 'show' | Expression<string>;
};

export type GmailV1LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
	/**
	 * The ID of the label
	 */
	labelId: string | Expression<string>;
};

export type GmailV1LabelGetConfig = {
	resource: 'label';
	operation: 'get';
	/**
	 * The ID of the label
	 */
	labelId: string | Expression<string>;
};

export type GmailV1LabelGetAllConfig = {
	resource: 'label';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

export type GmailV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV1MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1MessageReplyConfig = {
	resource: 'message';
	operation: 'reply';
	threadId: string | Expression<string>;
	messageId: string | Expression<string>;
	subject: string | Expression<string>;
	/**
	 * Whether the message should also be included as HTML
	 * @default false
	 */
	includeHtml?: boolean | Expression<boolean>;
	/**
	 * The HTML message body
	 */
	htmlMessage: string | Expression<string>;
	/**
	 * Plain text message body
	 */
	message: string | Expression<string>;
	/**
	 * The email addresses of the recipients
	 * @default []
	 */
	toList: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1MessageSendConfig = {
	resource: 'message';
	operation: 'send';
	subject: string | Expression<string>;
	/**
	 * Whether the message should also be included as HTML
	 * @default false
	 */
	includeHtml?: boolean | Expression<boolean>;
	/**
	 * The HTML message body
	 */
	htmlMessage: string | Expression<string>;
	/**
	 * Plain text message body
	 */
	message: string | Expression<string>;
	/**
	 * The email addresses of the recipients
	 * @default []
	 */
	toList: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1MessageLabelAddConfig = {
	resource: 'messageLabel';
	operation: 'add';
	messageId: string | Expression<string>;
	/**
	 * The ID of the label. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	labelIds: string[];
};

export type GmailV1MessageLabelRemoveConfig = {
	resource: 'messageLabel';
	operation: 'remove';
	messageId: string | Expression<string>;
	/**
	 * The ID of the label. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	labelIds: string[];
};

export type GmailV1Params =
	| GmailV1DraftCreateConfig
	| GmailV1DraftDeleteConfig
	| GmailV1DraftGetConfig
	| GmailV1DraftGetAllConfig
	| GmailV1LabelCreateConfig
	| GmailV1LabelDeleteConfig
	| GmailV1LabelGetConfig
	| GmailV1LabelGetAllConfig
	| GmailV1MessageDeleteConfig
	| GmailV1MessageGetConfig
	| GmailV1MessageGetAllConfig
	| GmailV1MessageReplyConfig
	| GmailV1MessageSendConfig
	| GmailV1MessageLabelAddConfig
	| GmailV1MessageLabelRemoveConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GmailV22Credentials {
	googleApi: CredentialReference;
	gmailOAuth2: CredentialReference;
}

export interface GmailV1Credentials {
	googleApi: CredentialReference;
	gmailOAuth2: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GmailV22Node = {
	type: 'n8n-nodes-base.gmail';
	version: 2 | 2.1 | 2.2;
	config: NodeConfig<GmailV22Params>;
	credentials?: GmailV22Credentials;
};

export type GmailV1Node = {
	type: 'n8n-nodes-base.gmail';
	version: 1;
	config: NodeConfig<GmailV1Params>;
	credentials?: GmailV1Credentials;
};

export type GmailNode = GmailV22Node | GmailV1Node;
