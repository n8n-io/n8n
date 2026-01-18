/**
 * Google Chat Node Types
 *
 * Consume Google Chat API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlechat/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a membership */
export type GoogleChatV1MemberGetConfig = {
	resource: 'member';
	operation: 'get';
	/**
	 * Member to be retrieved in the form "spaces/*\/members/*"
	 */
	memberId: string | Expression<string>;
};

/** Get many memberships in a space */
export type GoogleChatV1MemberGetAllConfig = {
	resource: 'member';
	operation: 'getAll';
	/**
	 * The name of the space for which to retrieve members, in the form "spaces/*". Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	spaceId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Create a message */
export type GoogleChatV1MessageCreateConfig = {
	resource: 'message';
	operation: 'create';
	/**
	 * Space resource name, in the form "spaces/*". Example: spaces/AAAAMpdlehY. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	spaceId: string | Expression<string>;
	/**
	 * Whether to pass the message object as JSON
	 * @default false
	 */
	jsonParameters?: boolean | Expression<boolean>;
	messageUi: Record<string, unknown>;
	/**
	 * Message input as JSON Object or JSON String
	 */
	messageJson: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a message */
export type GoogleChatV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	/**
	 * Resource name of the message to be deleted, in the form "spaces//messages/"
	 */
	messageId: string | Expression<string>;
};

/** Get a membership */
export type GoogleChatV1MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	/**
	 * Resource name of the message to be retrieved, in the form "spaces//messages/"
	 */
	messageId: string | Expression<string>;
};

/** Send a message and wait for response */
export type GoogleChatV1MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
	/**
	 * Space resource name, in the form "spaces/*". Example: spaces/AAAAMpdlehY. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	spaceId: string | Expression<string>;
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
			disapproveLabel?: string | Expression<string>;
		};
	};
	options?: Record<string, unknown>;
};

/** Update a message */
export type GoogleChatV1MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
	/**
	 * Resource name of the message to be updated, in the form "spaces//messages/"
	 */
	messageId: string | Expression<string>;
	/**
	 * Whether to pass the update fields object as JSON
	 * @default false
	 */
	jsonParameters?: boolean | Expression<boolean>;
	updateFieldsUi: Record<string, unknown>;
	/**
	 * Message input as JSON Object or JSON String
	 */
	updateFieldsJson: IDataObject | string | Expression<string>;
};

/** Get a membership */
export type GoogleChatV1SpaceGetConfig = {
	resource: 'space';
	operation: 'get';
	/**
	 * Resource name of the space, in the form "spaces/*"
	 */
	spaceId: string | Expression<string>;
};

/** Get many memberships in a space */
export type GoogleChatV1SpaceGetAllConfig = {
	resource: 'space';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

export type GoogleChatV1Params =
	| GoogleChatV1MemberGetConfig
	| GoogleChatV1MemberGetAllConfig
	| GoogleChatV1MessageCreateConfig
	| GoogleChatV1MessageDeleteConfig
	| GoogleChatV1MessageGetConfig
	| GoogleChatV1MessageSendAndWaitConfig
	| GoogleChatV1MessageUpdateConfig
	| GoogleChatV1SpaceGetConfig
	| GoogleChatV1SpaceGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleChatV1Credentials {
	googleApi: CredentialReference;
	googleChatOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleChatV1Node = {
	type: 'n8n-nodes-base.googleChat';
	version: 1;
	config: NodeConfig<GoogleChatV1Params>;
	credentials?: GoogleChatV1Credentials;
};

export type GoogleChatNode = GoogleChatV1Node;
