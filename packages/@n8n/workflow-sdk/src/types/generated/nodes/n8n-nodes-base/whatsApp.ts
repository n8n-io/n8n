/**
 * WhatsApp Business Cloud Node Types
 *
 * Access WhatsApp API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/whatsapp/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type WhatsAppV11MessageSendConfig = {
	resource: 'message';
	operation: 'send';
	messagingProduct?: unknown;
	/**
	 * The ID of the business account's phone number from which the message will be sent from
	 */
	phoneNumberId: string | Expression<string>;
	/**
	 * Phone number of the recipient of the message
	 */
	recipientPhoneNumber: string | Expression<string>;
	/**
	 * The type of the message
	 * @default text
	 */
	messageType?:
		| 'audio'
		| 'contacts'
		| 'document'
		| 'image'
		| 'location'
		| 'text'
		| 'video'
		| Expression<string>;
	name?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
	longitude: number | Expression<number>;
	latitude: number | Expression<number>;
	/**
	 * The body of the message (max 4096 characters)
	 */
	textBody: string | Expression<string>;
	/**
	 * Use a link, an ID, or n8n to upload an audio file
	 * @default useMediaLink
	 */
	mediaPath?: 'useMediaLink' | 'useMediaId' | 'useMedian8n' | Expression<string>;
	/**
	 * Link of the media to be sent
	 */
	mediaLink?: string | Expression<string>;
	/**
	 * ID of the media to be sent
	 */
	mediaId?: string | Expression<string>;
	/**
	 * The name of the input field containing the binary file data to be uploaded
	 * @default data
	 */
	mediaPropertyName: string | Expression<string>;
	/**
	 * The name of the file (required when using a file ID)
	 */
	mediaFilename: string | Expression<string>;
};

export type WhatsAppV11MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
	messagingProduct?: unknown;
	/**
	 * The ID of the business account's phone number from which the message will be sent from
	 */
	phoneNumberId: string | Expression<string>;
	/**
	 * Phone number of the recipient of the message
	 */
	recipientPhoneNumber: string | Expression<string>;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	formFields?: Record<string, unknown>;
	approvalOptions?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type WhatsAppV11MessageSendTemplateConfig = {
	resource: 'message';
	operation: 'sendTemplate';
	messagingProduct?: unknown;
	/**
	 * The ID of the business account's phone number from which the message will be sent from
	 */
	phoneNumberId: string | Expression<string>;
	/**
	 * Phone number of the recipient of the message
	 */
	recipientPhoneNumber: string | Expression<string>;
	/**
	 * Name of the template
	 */
	template: string | Expression<string>;
	components?: Record<string, unknown>;
};

export type WhatsAppV11MediaMediaUploadConfig = {
	resource: 'media';
	operation: 'mediaUpload';
	/**
	 * The ID of the business account's phone number to store the media
	 */
	phoneNumberId: string | Expression<string>;
	/**
	 * Name of the binary property which contains the data for the file to be uploaded
	 * @default data
	 */
	mediaPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type WhatsAppV11MediaMediaUrlGetConfig = {
	resource: 'media';
	operation: 'mediaUrlGet';
	/**
	 * The ID of the media
	 */
	mediaGetId: string | Expression<string>;
};

export type WhatsAppV11MediaMediaDeleteConfig = {
	resource: 'media';
	operation: 'mediaDelete';
	/**
	 * The ID of the media
	 */
	mediaDeleteId: string | Expression<string>;
};

export type WhatsAppV11Params =
	| WhatsAppV11MessageSendConfig
	| WhatsAppV11MessageSendAndWaitConfig
	| WhatsAppV11MessageSendTemplateConfig
	| WhatsAppV11MediaMediaUploadConfig
	| WhatsAppV11MediaMediaUrlGetConfig
	| WhatsAppV11MediaMediaDeleteConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface WhatsAppV11Credentials {
	whatsAppApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type WhatsAppNode = {
	type: 'n8n-nodes-base.whatsApp';
	version: 1 | 1.1;
	config: NodeConfig<WhatsAppV11Params>;
	credentials?: WhatsAppV11Credentials;
};
