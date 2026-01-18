/**
 * Mandrill Node Types
 *
 * Consume Mandrill API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mandrill/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send a message */
export type MandrillV1MessageSendTemplateConfig = {
	resource: 'message';
	operation: 'sendTemplate';
	/**
	 * The template you want to send. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	template: string | Expression<string>;
	/**
	 * Email address of the sender optional with name
	 */
	fromEmail: string | Expression<string>;
	/**
	 * Email address of the recipient. Multiple ones can be separated by comma.
	 */
	toEmail: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	/**
	 * Global merge variables
	 */
	mergeVarsJson?: IDataObject | string | Expression<string>;
	/**
	 * Per-recipient merge variables
	 * @default {}
	 */
	mergeVarsUi?: Record<string, unknown>;
	/**
	 * Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.
	 * @default {}
	 */
	metadataUi?: Record<string, unknown>;
	/**
	 * Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.
	 */
	metadataJson?: IDataObject | string | Expression<string>;
	/**
	 * An array of supported attachments to add to the message
	 */
	attachmentsJson?: IDataObject | string | Expression<string>;
	/**
	 * Array of supported attachments to add to the message
	 * @default {}
	 */
	attachmentsUi?: Record<string, unknown>;
	/**
	 * Optional extra headers to add to the message (most headers are allowed)
	 */
	headersJson?: IDataObject | string | Expression<string>;
	/**
	 * Optional extra headers to add to the message (most headers are allowed)
	 * @default {}
	 */
	headersUi?: Record<string, unknown>;
};

/** Send a message */
export type MandrillV1MessageSendHtmlConfig = {
	resource: 'message';
	operation: 'sendHtml';
	/**
	 * Email address of the sender optional with name
	 */
	fromEmail: string | Expression<string>;
	/**
	 * Email address of the recipient. Multiple ones can be separated by comma.
	 */
	toEmail: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	/**
	 * Global merge variables
	 */
	mergeVarsJson?: IDataObject | string | Expression<string>;
	/**
	 * Per-recipient merge variables
	 * @default {}
	 */
	mergeVarsUi?: Record<string, unknown>;
	/**
	 * Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.
	 * @default {}
	 */
	metadataUi?: Record<string, unknown>;
	/**
	 * Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.
	 */
	metadataJson?: IDataObject | string | Expression<string>;
	/**
	 * An array of supported attachments to add to the message
	 */
	attachmentsJson?: IDataObject | string | Expression<string>;
	/**
	 * Array of supported attachments to add to the message
	 * @default {}
	 */
	attachmentsUi?: Record<string, unknown>;
	/**
	 * Optional extra headers to add to the message (most headers are allowed)
	 */
	headersJson?: IDataObject | string | Expression<string>;
	/**
	 * Optional extra headers to add to the message (most headers are allowed)
	 * @default {}
	 */
	headersUi?: Record<string, unknown>;
};

export type MandrillV1Params =
	| MandrillV1MessageSendTemplateConfig
	| MandrillV1MessageSendHtmlConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MandrillV1Credentials {
	mandrillApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MandrillNode = {
	type: 'n8n-nodes-base.mandrill';
	version: 1;
	config: NodeConfig<MandrillV1Params>;
	credentials?: MandrillV1Credentials;
};
