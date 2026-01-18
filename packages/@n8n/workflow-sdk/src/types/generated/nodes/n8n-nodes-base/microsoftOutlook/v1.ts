/**
 * Microsoft Outlook Node - Version 1
 * Consume Microsoft Outlook API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new email draft */
export type MicrosoftOutlookV1DraftCreateConfig = {
	resource: 'draft';
	operation: 'create';
/**
 * The subject of the message
 * @displayOptions.show { resource: ["draft"], operation: ["create"] }
 */
		subject?: string | Expression<string>;
/**
 * Message body content
 * @displayOptions.show { resource: ["draft"], operation: ["create"] }
 */
		bodyContent?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a draft */
export type MicrosoftOutlookV1DraftDeleteConfig = {
	resource: 'draft';
	operation: 'delete';
	messageId: string | Expression<string>;
};

/** Get a single draft */
export type MicrosoftOutlookV1DraftGetConfig = {
	resource: 'draft';
	operation: 'get';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Send an existing draft message */
export type MicrosoftOutlookV1DraftSendConfig = {
	resource: 'draft';
	operation: 'send';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Update a draft */
export type MicrosoftOutlookV1DraftUpdateConfig = {
	resource: 'draft';
	operation: 'update';
	messageId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a new email draft */
export type MicrosoftOutlookV1FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
/**
 * Folder Type
 * @displayOptions.show { resource: ["folder"], operation: ["create"] }
 * @default folder
 */
		folderType?: 'folder' | 'searchFolder' | Expression<string>;
/**
 * Name of the folder
 * @displayOptions.show { resource: ["folder"], operation: ["create"] }
 */
		displayName: string | Expression<string>;
/**
 * Whether to include child folders in the search
 * @displayOptions.show { resource: ["folder"], operation: ["create"], folderType: ["searchFolder"] }
 * @default false
 */
		includeNestedFolders?: boolean | Expression<boolean>;
/**
 * The mailbox folders that should be mined
 * @displayOptions.show { resource: ["folder"], operation: ["create"], folderType: ["searchFolder"] }
 * @default []
 */
		sourceFolderIds?: string | Expression<string>;
/**
 * The OData query to filter the messages
 * @displayOptions.show { resource: ["folder"], operation: ["create"], folderType: ["searchFolder"] }
 */
		filterQuery: string | Expression<string>;
};

/** Delete a draft */
export type MicrosoftOutlookV1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	folderId: string | Expression<string>;
};

/** Get a single draft */
export type MicrosoftOutlookV1FolderGetConfig = {
	resource: 'folder';
	operation: 'get';
	folderId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Lists all child folders under the folder */
export type MicrosoftOutlookV1FolderGetChildrenConfig = {
	resource: 'folder';
	operation: 'getChildren';
	folderId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["folder"], operation: ["getAll", "getChildren"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["folder"], operation: ["getAll", "getChildren"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get many messages in the signed-in user's mailbox */
export type MicrosoftOutlookV1FolderGetAllConfig = {
	resource: 'folder';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["folder"], operation: ["getAll", "getChildren"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["folder"], operation: ["getAll", "getChildren"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get many messages in the signed-in user's mailbox */
export type MicrosoftOutlookV1FolderMessageGetAllConfig = {
	resource: 'folderMessage';
	operation: 'getAll';
	folderId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["folderMessage"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["folderMessage"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a draft */
export type MicrosoftOutlookV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	messageId: string | Expression<string>;
};

/** Get a single draft */
export type MicrosoftOutlookV1MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many messages in the signed-in user's mailbox */
export type MicrosoftOutlookV1MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["message"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["message"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get MIME content of a message */
export type MicrosoftOutlookV1MessageGetMimeConfig = {
	resource: 'message';
	operation: 'getMime';
	messageId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Move a message */
export type MicrosoftOutlookV1MessageMoveConfig = {
	resource: 'message';
	operation: 'move';
	messageId: string | Expression<string>;
/**
 * Target Folder ID
 * @displayOptions.show { resource: ["message"], operation: ["move"] }
 */
		folderId: string | Expression<string>;
};

/** Create reply to a message */
export type MicrosoftOutlookV1MessageReplyConfig = {
	resource: 'message';
	operation: 'reply';
	messageId: string | Expression<string>;
	replyType: 'reply' | 'replyAll' | Expression<string>;
/**
 * A comment to include. Can be an empty string.
 * @displayOptions.show { resource: ["message"], operation: ["reply"] }
 */
		comment?: string | Expression<string>;
/**
 * Whether to send the reply message directly. If not set, it will be saved as draft.
 * @displayOptions.show { resource: ["message"], operation: ["reply"] }
 * @default true
 */
		send?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Send an existing draft message */
export type MicrosoftOutlookV1MessageSendConfig = {
	resource: 'message';
	operation: 'send';
/**
 * The subject of the message
 * @displayOptions.show { resource: ["message"], operation: ["create", "send"] }
 */
		subject?: string | Expression<string>;
/**
 * Message body content
 * @displayOptions.show { resource: ["message"], operation: ["create", "send"] }
 */
		bodyContent?: string | Expression<string>;
/**
 * Email addresses of recipients. Multiple can be added separated by comma.
 * @displayOptions.show { resource: ["message"], operation: ["send"] }
 */
		toRecipients: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Update a draft */
export type MicrosoftOutlookV1MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
	messageId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add an attachment to a message */
export type MicrosoftOutlookV1MessageAttachmentAddConfig = {
	resource: 'messageAttachment';
	operation: 'add';
	messageId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Download attachment content */
export type MicrosoftOutlookV1MessageAttachmentDownloadConfig = {
	resource: 'messageAttachment';
	operation: 'download';
	messageId: string | Expression<string>;
	attachmentId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Get a single draft */
export type MicrosoftOutlookV1MessageAttachmentGetConfig = {
	resource: 'messageAttachment';
	operation: 'get';
	messageId: string | Expression<string>;
	attachmentId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many messages in the signed-in user's mailbox */
export type MicrosoftOutlookV1MessageAttachmentGetAllConfig = {
	resource: 'messageAttachment';
	operation: 'getAll';
	messageId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["messageAttachment"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["messageAttachment"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type MicrosoftOutlookV1Params =
	| MicrosoftOutlookV1DraftCreateConfig
	| MicrosoftOutlookV1DraftDeleteConfig
	| MicrosoftOutlookV1DraftGetConfig
	| MicrosoftOutlookV1DraftSendConfig
	| MicrosoftOutlookV1DraftUpdateConfig
	| MicrosoftOutlookV1FolderCreateConfig
	| MicrosoftOutlookV1FolderDeleteConfig
	| MicrosoftOutlookV1FolderGetConfig
	| MicrosoftOutlookV1FolderGetChildrenConfig
	| MicrosoftOutlookV1FolderGetAllConfig
	| MicrosoftOutlookV1FolderMessageGetAllConfig
	| MicrosoftOutlookV1MessageDeleteConfig
	| MicrosoftOutlookV1MessageGetConfig
	| MicrosoftOutlookV1MessageGetAllConfig
	| MicrosoftOutlookV1MessageGetMimeConfig
	| MicrosoftOutlookV1MessageMoveConfig
	| MicrosoftOutlookV1MessageReplyConfig
	| MicrosoftOutlookV1MessageSendConfig
	| MicrosoftOutlookV1MessageUpdateConfig
	| MicrosoftOutlookV1MessageAttachmentAddConfig
	| MicrosoftOutlookV1MessageAttachmentDownloadConfig
	| MicrosoftOutlookV1MessageAttachmentGetConfig
	| MicrosoftOutlookV1MessageAttachmentGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOutlookV1Credentials {
	microsoftOutlookOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MicrosoftOutlookV1Node = {
	type: 'n8n-nodes-base.microsoftOutlook';
	version: 1;
	config: NodeConfig<MicrosoftOutlookV1Params>;
	credentials?: MicrosoftOutlookV1Credentials;
};