/**
 * Mandrill Node - Version 1
 * Consume Mandrill API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send a message */
export type MandrillV1MessageSendTemplateConfig = {
	resource: 'message';
	operation: 'sendTemplate';
/**
 * The template you want to send. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["sendTemplate"] }
 */
		template: string | Expression<string>;
/**
 * Email address of the sender optional with name
 * @displayOptions.show { operation: ["sendHtml", "sendTemplate"] }
 */
		fromEmail: string | Expression<string>;
/**
 * Email address of the recipient. Multiple ones can be separated by comma.
 * @displayOptions.show { operation: ["sendHtml", "sendTemplate"] }
 */
		toEmail: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
/**
 * Global merge variables
 * @displayOptions.show { jsonParameters: [true] }
 */
		mergeVarsJson?: IDataObject | string | Expression<string>;
/**
 * Per-recipient merge variables
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		mergeVarsUi?: {
		mergeVarsValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Content
			 */
			content?: string | Expression<string>;
		}>;
	};
/**
 * Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		metadataUi?: {
		metadataValues?: Array<{
			/** Name
			 * @default Name of the metadata key to add.
			 */
			name?: string | Expression<string>;
			/** Value to set for the metadata key
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.
 * @displayOptions.show { jsonParameters: [true] }
 */
		metadataJson?: IDataObject | string | Expression<string>;
/**
 * An array of supported attachments to add to the message
 * @displayOptions.show { jsonParameters: [true] }
 */
		attachmentsJson?: IDataObject | string | Expression<string>;
/**
 * Array of supported attachments to add to the message
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		attachmentsUi?: {
		attachmentsValues?: Array<{
			/** The MIME type of the attachment
			 */
			type?: string | Expression<string>;
			/** The file name of the attachment
			 */
			name?: string | Expression<string>;
			/** The content of the attachment as a base64-encoded string
			 */
			content?: string | Expression<string>;
		}>;
		attachmentsBinary?: Array<{
			/** Name of the binary properties which contain data which should be added to email as attachment
			 */
			property?: string | Expression<string>;
		}>;
	};
/**
 * Optional extra headers to add to the message (most headers are allowed)
 * @displayOptions.show { jsonParameters: [true] }
 */
		headersJson?: IDataObject | string | Expression<string>;
/**
 * Optional extra headers to add to the message (most headers are allowed)
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		headersUi?: {
		headersValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Send a message */
export type MandrillV1MessageSendHtmlConfig = {
	resource: 'message';
	operation: 'sendHtml';
/**
 * Email address of the sender optional with name
 * @displayOptions.show { operation: ["sendHtml", "sendTemplate"] }
 */
		fromEmail: string | Expression<string>;
/**
 * Email address of the recipient. Multiple ones can be separated by comma.
 * @displayOptions.show { operation: ["sendHtml", "sendTemplate"] }
 */
		toEmail: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
/**
 * Global merge variables
 * @displayOptions.show { jsonParameters: [true] }
 */
		mergeVarsJson?: IDataObject | string | Expression<string>;
/**
 * Per-recipient merge variables
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		mergeVarsUi?: {
		mergeVarsValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Content
			 */
			content?: string | Expression<string>;
		}>;
	};
/**
 * Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		metadataUi?: {
		metadataValues?: Array<{
			/** Name
			 * @default Name of the metadata key to add.
			 */
			name?: string | Expression<string>;
			/** Value to set for the metadata key
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.
 * @displayOptions.show { jsonParameters: [true] }
 */
		metadataJson?: IDataObject | string | Expression<string>;
/**
 * An array of supported attachments to add to the message
 * @displayOptions.show { jsonParameters: [true] }
 */
		attachmentsJson?: IDataObject | string | Expression<string>;
/**
 * Array of supported attachments to add to the message
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		attachmentsUi?: {
		attachmentsValues?: Array<{
			/** The MIME type of the attachment
			 */
			type?: string | Expression<string>;
			/** The file name of the attachment
			 */
			name?: string | Expression<string>;
			/** The content of the attachment as a base64-encoded string
			 */
			content?: string | Expression<string>;
		}>;
		attachmentsBinary?: Array<{
			/** Name of the binary properties which contain data which should be added to email as attachment
			 */
			property?: string | Expression<string>;
		}>;
	};
/**
 * Optional extra headers to add to the message (most headers are allowed)
 * @displayOptions.show { jsonParameters: [true] }
 */
		headersJson?: IDataObject | string | Expression<string>;
/**
 * Optional extra headers to add to the message (most headers are allowed)
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		headersUi?: {
		headersValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};


// ===========================================================================
// Output Types
// ===========================================================================

export type MandrillV1MessageSendTemplateOutput = {
	_id?: string;
	email?: string;
	status?: string;
};

export type MandrillV1MessageSendHtmlOutput = {
	_id?: string;
	email?: string;
	status?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MandrillV1Credentials {
	mandrillApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MandrillV1NodeBase {
	type: 'n8n-nodes-base.mandrill';
	version: 1;
	credentials?: MandrillV1Credentials;
}

export type MandrillV1MessageSendTemplateNode = MandrillV1NodeBase & {
	config: NodeConfig<MandrillV1MessageSendTemplateConfig>;
	output?: MandrillV1MessageSendTemplateOutput;
};

export type MandrillV1MessageSendHtmlNode = MandrillV1NodeBase & {
	config: NodeConfig<MandrillV1MessageSendHtmlConfig>;
	output?: MandrillV1MessageSendHtmlOutput;
};

export type MandrillV1Node =
	| MandrillV1MessageSendTemplateNode
	| MandrillV1MessageSendHtmlNode
	;