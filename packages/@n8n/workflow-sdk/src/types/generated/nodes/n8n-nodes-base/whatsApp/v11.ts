/**
 * WhatsApp Business Cloud Node - Version 1.1
 * Access WhatsApp API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type WhatsAppV11MessageSendConfig = {
	resource: 'message';
	operation: 'send';
	messagingProduct?: unknown;
/**
 * The ID of the business account's phone number from which the message will be sent from
 * @displayOptions.show { resource: ["message"] }
 */
		phoneNumberId: string | Expression<string>;
/**
 * Phone number of the recipient of the message
 * @hint When entering a phone number, make sure to include the country code
 * @displayOptions.show { resource: ["message"] }
 */
		recipientPhoneNumber: string | Expression<string>;
/**
 * The type of the message
 * @displayOptions.show { resource: ["message"], operation: ["send"] }
 * @default text
 */
		messageType?: 'audio' | 'contacts' | 'document' | 'image' | 'location' | 'text' | 'video' | Expression<string>;
	name?: {
		data?: {
			/** Formatted Name
			 */
			formatted_name?: string | Expression<string>;
			/** First Name
			 */
			first_name?: string | Expression<string>;
			/** Last Name
			 */
			last_name?: string | Expression<string>;
			/** Middle Name
			 */
			middle_name?: string | Expression<string>;
			/** Suffix
			 */
			suffix?: string | Expression<string>;
			/** Prefix
			 */
			prefix?: string | Expression<string>;
		};
	};
	additionalFields?: Record<string, unknown>;
	longitude: number | Expression<number>;
	latitude: number | Expression<number>;
/**
 * The body of the message (max 4096 characters)
 * @displayOptions.show { resource: ["message"], operation: ["send"], messageType: ["text"] }
 */
		textBody: string | Expression<string>;
/**
 * Use a link, an ID, or n8n to upload an audio file
 * @displayOptions.show { operation: ["send"], messageType: ["audio"] }
 * @default useMediaLink
 */
		mediaPath?: 'useMediaLink' | 'useMediaId' | 'useMedian8n' | Expression<string>;
/**
 * Link of the media to be sent
 * @displayOptions.show { operation: ["send"], messageType: ["image", "video", "audio", "sticker", "document"], mediaPath: ["useMediaLink"] }
 */
		mediaLink?: string | Expression<string>;
/**
 * ID of the media to be sent
 * @displayOptions.show { operation: ["send"], messageType: ["image", "video", "audio", "sticker", "document"], mediaPath: ["useMediaId"] }
 */
		mediaId?: string | Expression<string>;
/**
 * The name of the input field containing the binary file data to be uploaded
 * @displayOptions.show { operation: ["send"], messageType: ["image", "video", "audio", "sticker", "document"], mediaPath: ["useMedian8n"] }
 * @default data
 */
		mediaPropertyName: string | Expression<string>;
/**
 * The name of the file (required when using a file ID)
 * @displayOptions.show { operation: ["send"], messageType: ["document"], mediaPath: ["useMediaId"] }
 */
		mediaFilename: string | Expression<string>;
};

export type WhatsAppV11MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
	messagingProduct?: unknown;
/**
 * The ID of the business account's phone number from which the message will be sent from
 * @displayOptions.show { resource: ["message"] }
 */
		phoneNumberId: string | Expression<string>;
/**
 * Phone number of the recipient of the message
 * @hint When entering a phone number, make sure to include the country code
 * @displayOptions.show { resource: ["message"] }
 */
		recipientPhoneNumber: string | Expression<string>;
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
			 * @default ✓ Approve
			 */
			approveLabel?: string | Expression<string>;
			/** Disapprove Button Label
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default ✗ Decline
			 */
			disapproveLabel?: string | Expression<string>;
		};
	};
	options?: Record<string, unknown>;
};

export type WhatsAppV11MessageSendTemplateConfig = {
	resource: 'message';
	operation: 'sendTemplate';
	messagingProduct?: unknown;
/**
 * The ID of the business account's phone number from which the message will be sent from
 * @displayOptions.show { resource: ["message"] }
 */
		phoneNumberId: string | Expression<string>;
/**
 * Phone number of the recipient of the message
 * @hint When entering a phone number, make sure to include the country code
 * @displayOptions.show { resource: ["message"] }
 */
		recipientPhoneNumber: string | Expression<string>;
/**
 * Name of the template
 * @displayOptions.show { operation: ["sendTemplate"], resource: ["message"] }
 */
		template: string | Expression<string>;
	components?: {
		component?: Array<{
			/** Type
			 * @default body
			 */
			type?: 'body' | 'button' | 'header' | Expression<string>;
			/** Parameters
			 * @displayOptions.show { type: ["body"] }
			 * @default {}
			 */
			bodyParameters?: {
		parameter?: Array<{
			/** Type
			 * @default text
			 */
			type?: 'text' | 'currency' | 'date_time' | Expression<string>;
			/** Text
			 * @displayOptions.show { type: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Currency Code
			 * @displayOptions.show { type: ["currency"] }
			 */
			code?: 'AED' | 'AFN' | 'ALL' | 'AMD' | 'ANG' | 'AOA' | 'ARS' | 'AUD' | 'AWG' | 'AZN' | 'BAM' | 'BBD' | 'BDT' | 'BGN' | 'BHD' | 'BIF' | 'BMD' | 'BND' | 'BOB' | 'BOV' | 'BRL' | 'BSD' | 'BTN' | 'BWP' | 'BYN' | 'BZD' | 'CAD' | 'CDF' | 'CHE' | 'CHF' | 'CHW' | 'CLF' | 'CLP' | 'CNY' | 'COP' | 'COU' | 'CRC' | 'CUC' | 'CUP' | 'CVE' | 'CZK' | 'DJF' | 'DKK' | 'DOP' | 'DZD' | 'EGP' | 'ERN' | 'ETB' | 'EUR' | 'FJD' | 'FKP' | 'GBP' | 'GEL' | 'GHS' | 'GIP' | 'GMD' | 'GNF' | 'GTQ' | 'GYD' | 'HKD' | 'HNL' | 'HRK' | 'HTG' | 'HUF' | 'IDR' | 'ILS' | 'INR' | 'IQD' | 'IRR' | 'ISK' | 'JMD' | 'JOD' | 'JPY' | 'KES' | 'KGS' | 'KHR' | 'KMF' | 'KPW' | 'KRW' | 'KWD' | 'KYD' | 'KZT' | 'LAK' | 'LBP' | 'LKR' | 'LRD' | 'LSL' | 'LYD' | 'MAD' | 'MDL' | 'MGA' | 'MKD' | 'MMK' | 'MNT' | 'MOP' | 'MRU' | 'MUR' | 'MVR' | 'MWK' | 'MXN' | 'MXV' | 'MYR' | 'MZN' | 'NAD' | 'NGN' | 'NIO' | 'NOK' | 'NPR' | 'NZD' | 'OMR' | 'PAB' | 'PEN' | 'PGK' | 'PHP' | 'PKR' | 'PLN' | 'PYG' | 'QAR' | 'RON' | 'RSD' | 'RUB' | 'RWF' | 'SAR' | 'SBD' | 'SCR' | 'SDG' | 'SEK' | 'SGD' | 'SHP' | 'SLL' | 'SOS' | 'SRD' | 'SSP' | 'STN' | 'SVC' | 'SYP' | 'SZL' | 'THB' | 'TJS' | 'TMT' | 'TND' | 'TOP' | 'TRY' | 'TTD' | 'TWD' | 'TZS' | 'UAH' | 'UGX' | 'USD' | 'USN' | 'UYI' | 'UYU' | 'UYW' | 'UZS' | 'VES' | 'VND' | 'VUV' | 'WST' | 'XAF' | 'XAG' | 'XAU' | 'XBA' | 'XBB' | 'XBC' | 'XBD' | 'XCD' | 'XDR' | 'XOF' | 'XPD' | 'XPF' | 'XPT' | 'XSU' | 'XTS' | 'XUA' | 'XXX' | 'YER' | 'ZAR' | 'ZMW' | 'ZWL' | Expression<string>;
			/** Amount
			 * @displayOptions.show { type: ["currency"] }
			 */
			amount_1000?: number | Expression<number>;
			/** Date Time
			 * @displayOptions.show { type: ["date_time"] }
			 */
			date_time?: string | Expression<string>;
			/** Fallback Value
			 * @displayOptions.show { type: ["currency"] }
			 */
			fallback_value?: string | Expression<string>;
		}>;
	};
			/** Sub Type
			 * @displayOptions.show { type: ["button"] }
			 * @default quick_reply
			 */
			sub_type?: 'quick_reply' | 'url' | Expression<string>;
			/** Index
			 * @displayOptions.show { type: ["button"] }
			 * @default 0
			 */
			index?: number | Expression<number>;
			/** Parameters
			 * @displayOptions.show { type: ["button"] }
			 * @default {}
			 */
			buttonParameters?: {
		parameter?: {
			/** Type
			 * @default payload
			 */
			type?: 'payload' | 'text' | Expression<string>;
			/** Payload
			 * @displayOptions.show { type: ["payload"] }
			 */
			payload?: string | Expression<string>;
			/** Text
			 * @displayOptions.show { type: ["text"] }
			 */
			text?: string | Expression<string>;
		};
	};
			/** Parameters
			 * @displayOptions.show { type: ["header"] }
			 * @default {}
			 */
			headerParameters?: {
		parameter?: Array<{
			/** Type
			 * @default text
			 */
			type?: 'text' | 'currency' | 'date_time' | 'image' | Expression<string>;
			/** Text
			 * @displayOptions.show { type: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Currency Code
			 * @displayOptions.show { type: ["currency"] }
			 */
			code?: 'AED' | 'AFN' | 'ALL' | 'AMD' | 'ANG' | 'AOA' | 'ARS' | 'AUD' | 'AWG' | 'AZN' | 'BAM' | 'BBD' | 'BDT' | 'BGN' | 'BHD' | 'BIF' | 'BMD' | 'BND' | 'BOB' | 'BOV' | 'BRL' | 'BSD' | 'BTN' | 'BWP' | 'BYN' | 'BZD' | 'CAD' | 'CDF' | 'CHE' | 'CHF' | 'CHW' | 'CLF' | 'CLP' | 'CNY' | 'COP' | 'COU' | 'CRC' | 'CUC' | 'CUP' | 'CVE' | 'CZK' | 'DJF' | 'DKK' | 'DOP' | 'DZD' | 'EGP' | 'ERN' | 'ETB' | 'EUR' | 'FJD' | 'FKP' | 'GBP' | 'GEL' | 'GHS' | 'GIP' | 'GMD' | 'GNF' | 'GTQ' | 'GYD' | 'HKD' | 'HNL' | 'HRK' | 'HTG' | 'HUF' | 'IDR' | 'ILS' | 'INR' | 'IQD' | 'IRR' | 'ISK' | 'JMD' | 'JOD' | 'JPY' | 'KES' | 'KGS' | 'KHR' | 'KMF' | 'KPW' | 'KRW' | 'KWD' | 'KYD' | 'KZT' | 'LAK' | 'LBP' | 'LKR' | 'LRD' | 'LSL' | 'LYD' | 'MAD' | 'MDL' | 'MGA' | 'MKD' | 'MMK' | 'MNT' | 'MOP' | 'MRU' | 'MUR' | 'MVR' | 'MWK' | 'MXN' | 'MXV' | 'MYR' | 'MZN' | 'NAD' | 'NGN' | 'NIO' | 'NOK' | 'NPR' | 'NZD' | 'OMR' | 'PAB' | 'PEN' | 'PGK' | 'PHP' | 'PKR' | 'PLN' | 'PYG' | 'QAR' | 'RON' | 'RSD' | 'RUB' | 'RWF' | 'SAR' | 'SBD' | 'SCR' | 'SDG' | 'SEK' | 'SGD' | 'SHP' | 'SLL' | 'SOS' | 'SRD' | 'SSP' | 'STN' | 'SVC' | 'SYP' | 'SZL' | 'THB' | 'TJS' | 'TMT' | 'TND' | 'TOP' | 'TRY' | 'TTD' | 'TWD' | 'TZS' | 'UAH' | 'UGX' | 'USD' | 'USN' | 'UYI' | 'UYU' | 'UYW' | 'UZS' | 'VES' | 'VND' | 'VUV' | 'WST' | 'XAF' | 'XAG' | 'XAU' | 'XBA' | 'XBB' | 'XBC' | 'XBD' | 'XCD' | 'XDR' | 'XOF' | 'XPD' | 'XPF' | 'XPT' | 'XSU' | 'XTS' | 'XUA' | 'XXX' | 'YER' | 'ZAR' | 'ZMW' | 'ZWL' | Expression<string>;
			/** Amount
			 * @displayOptions.show { type: ["currency"] }
			 */
			amount_1000?: number | Expression<number>;
			/** Date Time
			 * @displayOptions.show { type: ["date_time"] }
			 */
			date_time?: string | Expression<string>;
			/** Image Link
			 * @displayOptions.show { type: ["image"] }
			 */
			imageLink?: string | Expression<string>;
		}>;
	};
		}>;
	};
};

export type WhatsAppV11MediaMediaUploadConfig = {
	resource: 'media';
	operation: 'mediaUpload';
/**
 * The ID of the business account's phone number to store the media
 * @displayOptions.show { operation: ["mediaUpload"], resource: ["media"] }
 */
		phoneNumberId: string | Expression<string>;
/**
 * Name of the binary property which contains the data for the file to be uploaded
 * @displayOptions.show { operation: ["mediaUpload"], resource: ["media"] }
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
 * @displayOptions.show { operation: ["mediaUrlGet"], resource: ["media"] }
 */
		mediaGetId: string | Expression<string>;
};

export type WhatsAppV11MediaMediaDeleteConfig = {
	resource: 'media';
	operation: 'mediaDelete';
/**
 * The ID of the media
 * @displayOptions.show { operation: ["mediaDelete"], resource: ["media"] }
 */
		mediaDeleteId: string | Expression<string>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type WhatsAppV11MessageSendOutput = {
	contacts?: Array<{
		input?: string;
		wa_id?: string;
	}>;
	messages?: Array<{
		id?: string;
	}>;
	messaging_product?: string;
};

export type WhatsAppV11MessageSendAndWaitOutput = {
	data?: {
		text?: string;
	};
};

export type WhatsAppV11MessageSendTemplateOutput = {
	contacts?: Array<{
		input?: string;
		wa_id?: string;
	}>;
	messages?: Array<{
		id?: string;
		message_status?: string;
	}>;
	messaging_product?: string;
};

export type WhatsAppV11MediaMediaUploadOutput = {
	id?: string;
};

export type WhatsAppV11MediaMediaUrlGetOutput = {
	file_size?: number;
	id?: string;
	messaging_product?: string;
	mime_type?: string;
	sha256?: string;
	url?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface WhatsAppV11Credentials {
	whatsAppApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WhatsAppV11NodeBase {
	type: 'n8n-nodes-base.whatsApp';
	version: 1.1;
	credentials?: WhatsAppV11Credentials;
}

export type WhatsAppV11MessageSendNode = WhatsAppV11NodeBase & {
	config: NodeConfig<WhatsAppV11MessageSendConfig>;
	output?: WhatsAppV11MessageSendOutput;
};

export type WhatsAppV11MessageSendAndWaitNode = WhatsAppV11NodeBase & {
	config: NodeConfig<WhatsAppV11MessageSendAndWaitConfig>;
	output?: WhatsAppV11MessageSendAndWaitOutput;
};

export type WhatsAppV11MessageSendTemplateNode = WhatsAppV11NodeBase & {
	config: NodeConfig<WhatsAppV11MessageSendTemplateConfig>;
	output?: WhatsAppV11MessageSendTemplateOutput;
};

export type WhatsAppV11MediaMediaUploadNode = WhatsAppV11NodeBase & {
	config: NodeConfig<WhatsAppV11MediaMediaUploadConfig>;
	output?: WhatsAppV11MediaMediaUploadOutput;
};

export type WhatsAppV11MediaMediaUrlGetNode = WhatsAppV11NodeBase & {
	config: NodeConfig<WhatsAppV11MediaMediaUrlGetConfig>;
	output?: WhatsAppV11MediaMediaUrlGetOutput;
};

export type WhatsAppV11MediaMediaDeleteNode = WhatsAppV11NodeBase & {
	config: NodeConfig<WhatsAppV11MediaMediaDeleteConfig>;
};

export type WhatsAppV11Node =
	| WhatsAppV11MessageSendNode
	| WhatsAppV11MessageSendAndWaitNode
	| WhatsAppV11MessageSendTemplateNode
	| WhatsAppV11MediaMediaUploadNode
	| WhatsAppV11MediaMediaUrlGetNode
	| WhatsAppV11MediaMediaDeleteNode
	;