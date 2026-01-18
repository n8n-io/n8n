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
	formFields?: {
		values?: Array<{
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [2.4] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"lt":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { fieldType: ["hiddenField"], @version: [{"_cnd":{"lt":2.4}}] }
			 */
			fieldName?: string | Expression<string>;
			/** The type of field to add to the form
			 * @default text
			 */
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
			/** Optional field. It can be used to include the html in the output.
			 * @displayOptions.show { fieldType: ["html"] }
			 */
			elementName?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.5}}] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Sample text to display inside the field
			 * @displayOptions.hide { fieldType: ["dropdown", "date", "file", "html", "hiddenField", "radio", "checkbox"] }
			 */
			placeholder?: string | Expression<string>;
			/** Default value that will be pre-filled in the form field
			 * @displayOptions.show { fieldType: ["text", "number", "email", "textarea"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default date value that will be pre-filled in the form field (format: YYYY-MM-DD)
			 * @displayOptions.show { fieldType: ["date"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value that will be pre-selected. Must match one of the option labels.
			 * @displayOptions.show { fieldType: ["dropdown", "radio"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value(s) that will be pre-selected. Must match one or multiple of the option labels. Separate multiple pre-selected options with a comma.
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Input value can be set here or will be passed as a query parameter via Field Name if no value is set
			 * @displayOptions.show { fieldType: ["hiddenField"] }
			 */
			fieldValue?: string | Expression<string>;
			/** List of options that can be selected from the dropdown
			 * @displayOptions.show { fieldType: ["dropdown"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Option
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Checkboxes
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Checkbox Label
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Radio Buttons
			 * @displayOptions.show { fieldType: ["radio"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Radio Button Label
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Whether to allow the user to select multiple options from the dropdown list
			 * @displayOptions.show { fieldType: ["dropdown"], @version: [{"_cnd":{"lt":2.3}}] }
			 * @default false
			 */
			multiselect?: boolean | Expression<boolean>;
			/** Limit Selection
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default unlimited
			 */
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			/** Number of Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["exact"] }
			 * @default 1
			 */
			numberOfSelections?: number | Expression<number>;
			/** Minimum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 0
			 */
			minSelections?: number | Expression<number>;
			/** Maximum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 1
			 */
			maxSelections?: number | Expression<number>;
			/** HTML elements to display on the form page
			 * @hint Does not accept &lt;code&gt;&lt;script&gt;&lt;/code&gt;, &lt;code&gt;&lt;style&gt;&lt;/code&gt; or &lt;code&gt;&lt;input&gt;&lt;/code&gt; tags
			 * @displayOptions.show { fieldType: ["html"] }
			 * @default <!-- Your custom HTML here --->



			 */
			html?: string | Expression<string>;
			/** Whether to allow the user to select multiple files from the file input or just one
			 * @displayOptions.show { fieldType: ["file"] }
			 * @default true
			 */
			multipleFiles?: boolean | Expression<boolean>;
			/** Comma-separated list of allowed file extensions
			 * @hint Leave empty to allow all file types
			 * @displayOptions.show { fieldType: ["file"] }
			 */
			acceptFileTypes?: string | Expression<string>;
			/** Whether to require the user to enter a value for this field before submitting the form
			 * @displayOptions.hide { fieldType: ["html", "hiddenField"] }
			 * @default false
			 */
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
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
	| GmailV22ThreadUntrashConfig;

export type GmailV1DraftCreateConfig = {
	resource: 'draft';
	operation: 'create';
	subject: string | Expression<string>;
	/**
	 * Whether the message should also be included as HTML
	 * @displayOptions.show { resource: ["draft"], operation: ["create"] }
	 * @default false
	 */
	includeHtml?: boolean | Expression<boolean>;
	/**
	 * The HTML message body
	 * @displayOptions.show { includeHtml: [true], resource: ["draft"], operation: ["create"] }
	 */
	htmlMessage: string | Expression<string>;
	/**
	 * The message body. If HTML formatted, then you have to add and activate the option "HTML content" in the "Additional Options" section.
	 * @displayOptions.show { resource: ["draft"], operation: ["create"] }
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
	 * @displayOptions.show { operation: ["getAll"], resource: ["draft"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["draft"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["label"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	/**
	 * The visibility of the label in the label list in the Gmail web interface
	 * @displayOptions.show { resource: ["label"], operation: ["create"] }
	 * @default labelShow
	 */
	labelListVisibility: 'labelHide' | 'labelShow' | 'labelShowIfUnread' | Expression<string>;
	/**
	 * The visibility of messages with this label in the message list in the Gmail web interface
	 * @displayOptions.show { resource: ["label"], operation: ["create"] }
	 * @default show
	 */
	messageListVisibility: 'hide' | 'show' | Expression<string>;
};

export type GmailV1LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
	/**
	 * The ID of the label
	 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
	 */
	labelId: string | Expression<string>;
};

export type GmailV1LabelGetConfig = {
	resource: 'label';
	operation: 'get';
	/**
	 * The ID of the label
	 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
	 */
	labelId: string | Expression<string>;
};

export type GmailV1LabelGetAllConfig = {
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
	 * @displayOptions.show { operation: ["getAll"], resource: ["message"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["message"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["message"], operation: ["send", "reply"] }
	 * @default false
	 */
	includeHtml?: boolean | Expression<boolean>;
	/**
	 * The HTML message body
	 * @displayOptions.show { includeHtml: [true], resource: ["message"], operation: ["reply", "send"] }
	 */
	htmlMessage: string | Expression<string>;
	/**
	 * Plain text message body
	 * @displayOptions.show { resource: ["message"], operation: ["reply", "send"] }
	 */
	message: string | Expression<string>;
	/**
	 * The email addresses of the recipients
	 * @displayOptions.show { resource: ["message"], operation: ["reply", "send"] }
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
	 * @displayOptions.show { resource: ["message"], operation: ["send", "reply"] }
	 * @default false
	 */
	includeHtml?: boolean | Expression<boolean>;
	/**
	 * The HTML message body
	 * @displayOptions.show { includeHtml: [true], resource: ["message"], operation: ["reply", "send"] }
	 */
	htmlMessage: string | Expression<string>;
	/**
	 * Plain text message body
	 * @displayOptions.show { resource: ["message"], operation: ["reply", "send"] }
	 */
	message: string | Expression<string>;
	/**
	 * The email addresses of the recipients
	 * @displayOptions.show { resource: ["message"], operation: ["reply", "send"] }
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
	 * @displayOptions.show { resource: ["messageLabel"], operation: ["add", "remove"] }
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
	 * @displayOptions.show { resource: ["messageLabel"], operation: ["add", "remove"] }
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
