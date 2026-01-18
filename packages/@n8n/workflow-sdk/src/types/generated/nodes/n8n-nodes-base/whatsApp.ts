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
	 * @hint When entering a phone number, make sure to include the country code
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
	name?: {
		data?: {
			formatted_name?: string | Expression<string>;
			first_name?: string | Expression<string>;
			last_name?: string | Expression<string>;
			middle_name?: string | Expression<string>;
			suffix?: string | Expression<string>;
			prefix?: string | Expression<string>;
		};
	};
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
	 * @hint When entering a phone number, make sure to include the country code
	 */
	recipientPhoneNumber: string | Expression<string>;
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
	 * @hint When entering a phone number, make sure to include the country code
	 */
	recipientPhoneNumber: string | Expression<string>;
	/**
	 * Name of the template
	 */
	template: string | Expression<string>;
	components?: {
		component?: Array<{
			type?: 'body' | 'button' | 'header' | Expression<string>;
			bodyParameters?: {
				parameter?: Array<{
					type?: 'text' | 'currency' | 'date_time' | Expression<string>;
					text?: string | Expression<string>;
					code?:
						| 'AED'
						| 'AFN'
						| 'ALL'
						| 'AMD'
						| 'ANG'
						| 'AOA'
						| 'ARS'
						| 'AUD'
						| 'AWG'
						| 'AZN'
						| 'BAM'
						| 'BBD'
						| 'BDT'
						| 'BGN'
						| 'BHD'
						| 'BIF'
						| 'BMD'
						| 'BND'
						| 'BOB'
						| 'BOV'
						| 'BRL'
						| 'BSD'
						| 'BTN'
						| 'BWP'
						| 'BYN'
						| 'BZD'
						| 'CAD'
						| 'CDF'
						| 'CHE'
						| 'CHF'
						| 'CHW'
						| 'CLF'
						| 'CLP'
						| 'CNY'
						| 'COP'
						| 'COU'
						| 'CRC'
						| 'CUC'
						| 'CUP'
						| 'CVE'
						| 'CZK'
						| 'DJF'
						| 'DKK'
						| 'DOP'
						| 'DZD'
						| 'EGP'
						| 'ERN'
						| 'ETB'
						| 'EUR'
						| 'FJD'
						| 'FKP'
						| 'GBP'
						| 'GEL'
						| 'GHS'
						| 'GIP'
						| 'GMD'
						| 'GNF'
						| 'GTQ'
						| 'GYD'
						| 'HKD'
						| 'HNL'
						| 'HRK'
						| 'HTG'
						| 'HUF'
						| 'IDR'
						| 'ILS'
						| 'INR'
						| 'IQD'
						| 'IRR'
						| 'ISK'
						| 'JMD'
						| 'JOD'
						| 'JPY'
						| 'KES'
						| 'KGS'
						| 'KHR'
						| 'KMF'
						| 'KPW'
						| 'KRW'
						| 'KWD'
						| 'KYD'
						| 'KZT'
						| 'LAK'
						| 'LBP'
						| 'LKR'
						| 'LRD'
						| 'LSL'
						| 'LYD'
						| 'MAD'
						| 'MDL'
						| 'MGA'
						| 'MKD'
						| 'MMK'
						| 'MNT'
						| 'MOP'
						| 'MRU'
						| 'MUR'
						| 'MVR'
						| 'MWK'
						| 'MXN'
						| 'MXV'
						| 'MYR'
						| 'MZN'
						| 'NAD'
						| 'NGN'
						| 'NIO'
						| 'NOK'
						| 'NPR'
						| 'NZD'
						| 'OMR'
						| 'PAB'
						| 'PEN'
						| 'PGK'
						| 'PHP'
						| 'PKR'
						| 'PLN'
						| 'PYG'
						| 'QAR'
						| 'RON'
						| 'RSD'
						| 'RUB'
						| 'RWF'
						| 'SAR'
						| 'SBD'
						| 'SCR'
						| 'SDG'
						| 'SEK'
						| 'SGD'
						| 'SHP'
						| 'SLL'
						| 'SOS'
						| 'SRD'
						| 'SSP'
						| 'STN'
						| 'SVC'
						| 'SYP'
						| 'SZL'
						| 'THB'
						| 'TJS'
						| 'TMT'
						| 'TND'
						| 'TOP'
						| 'TRY'
						| 'TTD'
						| 'TWD'
						| 'TZS'
						| 'UAH'
						| 'UGX'
						| 'USD'
						| 'USN'
						| 'UYI'
						| 'UYU'
						| 'UYW'
						| 'UZS'
						| 'VES'
						| 'VND'
						| 'VUV'
						| 'WST'
						| 'XAF'
						| 'XAG'
						| 'XAU'
						| 'XBA'
						| 'XBB'
						| 'XBC'
						| 'XBD'
						| 'XCD'
						| 'XDR'
						| 'XOF'
						| 'XPD'
						| 'XPF'
						| 'XPT'
						| 'XSU'
						| 'XTS'
						| 'XUA'
						| 'XXX'
						| 'YER'
						| 'ZAR'
						| 'ZMW'
						| 'ZWL'
						| Expression<string>;
					amount_1000?: number | Expression<number>;
					date_time?: string | Expression<string>;
					fallback_value?: string | Expression<string>;
				}>;
			};
			sub_type?: 'quick_reply' | 'url' | Expression<string>;
			index?: number | Expression<number>;
			buttonParameters?: {
				parameter?: {
					type?: 'payload' | 'text' | Expression<string>;
					payload?: string | Expression<string>;
					text?: string | Expression<string>;
				};
			};
			headerParameters?: {
				parameter?: Array<{
					type?: 'text' | 'currency' | 'date_time' | 'image' | Expression<string>;
					text?: string | Expression<string>;
					code?:
						| 'AED'
						| 'AFN'
						| 'ALL'
						| 'AMD'
						| 'ANG'
						| 'AOA'
						| 'ARS'
						| 'AUD'
						| 'AWG'
						| 'AZN'
						| 'BAM'
						| 'BBD'
						| 'BDT'
						| 'BGN'
						| 'BHD'
						| 'BIF'
						| 'BMD'
						| 'BND'
						| 'BOB'
						| 'BOV'
						| 'BRL'
						| 'BSD'
						| 'BTN'
						| 'BWP'
						| 'BYN'
						| 'BZD'
						| 'CAD'
						| 'CDF'
						| 'CHE'
						| 'CHF'
						| 'CHW'
						| 'CLF'
						| 'CLP'
						| 'CNY'
						| 'COP'
						| 'COU'
						| 'CRC'
						| 'CUC'
						| 'CUP'
						| 'CVE'
						| 'CZK'
						| 'DJF'
						| 'DKK'
						| 'DOP'
						| 'DZD'
						| 'EGP'
						| 'ERN'
						| 'ETB'
						| 'EUR'
						| 'FJD'
						| 'FKP'
						| 'GBP'
						| 'GEL'
						| 'GHS'
						| 'GIP'
						| 'GMD'
						| 'GNF'
						| 'GTQ'
						| 'GYD'
						| 'HKD'
						| 'HNL'
						| 'HRK'
						| 'HTG'
						| 'HUF'
						| 'IDR'
						| 'ILS'
						| 'INR'
						| 'IQD'
						| 'IRR'
						| 'ISK'
						| 'JMD'
						| 'JOD'
						| 'JPY'
						| 'KES'
						| 'KGS'
						| 'KHR'
						| 'KMF'
						| 'KPW'
						| 'KRW'
						| 'KWD'
						| 'KYD'
						| 'KZT'
						| 'LAK'
						| 'LBP'
						| 'LKR'
						| 'LRD'
						| 'LSL'
						| 'LYD'
						| 'MAD'
						| 'MDL'
						| 'MGA'
						| 'MKD'
						| 'MMK'
						| 'MNT'
						| 'MOP'
						| 'MRU'
						| 'MUR'
						| 'MVR'
						| 'MWK'
						| 'MXN'
						| 'MXV'
						| 'MYR'
						| 'MZN'
						| 'NAD'
						| 'NGN'
						| 'NIO'
						| 'NOK'
						| 'NPR'
						| 'NZD'
						| 'OMR'
						| 'PAB'
						| 'PEN'
						| 'PGK'
						| 'PHP'
						| 'PKR'
						| 'PLN'
						| 'PYG'
						| 'QAR'
						| 'RON'
						| 'RSD'
						| 'RUB'
						| 'RWF'
						| 'SAR'
						| 'SBD'
						| 'SCR'
						| 'SDG'
						| 'SEK'
						| 'SGD'
						| 'SHP'
						| 'SLL'
						| 'SOS'
						| 'SRD'
						| 'SSP'
						| 'STN'
						| 'SVC'
						| 'SYP'
						| 'SZL'
						| 'THB'
						| 'TJS'
						| 'TMT'
						| 'TND'
						| 'TOP'
						| 'TRY'
						| 'TTD'
						| 'TWD'
						| 'TZS'
						| 'UAH'
						| 'UGX'
						| 'USD'
						| 'USN'
						| 'UYI'
						| 'UYU'
						| 'UYW'
						| 'UZS'
						| 'VES'
						| 'VND'
						| 'VUV'
						| 'WST'
						| 'XAF'
						| 'XAG'
						| 'XAU'
						| 'XBA'
						| 'XBB'
						| 'XBC'
						| 'XBD'
						| 'XCD'
						| 'XDR'
						| 'XOF'
						| 'XPD'
						| 'XPF'
						| 'XPT'
						| 'XSU'
						| 'XTS'
						| 'XUA'
						| 'XXX'
						| 'YER'
						| 'ZAR'
						| 'ZMW'
						| 'ZWL'
						| Expression<string>;
					amount_1000?: number | Expression<number>;
					date_time?: string | Expression<string>;
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
// Node Types
// ===========================================================================

export type WhatsAppV11Node = {
	type: 'n8n-nodes-base.whatsApp';
	version: 1 | 1.1;
	config: NodeConfig<WhatsAppV11Params>;
	credentials?: WhatsAppV11Credentials;
};

export type WhatsAppNode = WhatsAppV11Node;
