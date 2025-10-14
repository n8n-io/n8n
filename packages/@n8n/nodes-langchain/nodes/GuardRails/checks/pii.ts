import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

/**
 * Supported PII entity types for detection.
 *
 * Includes global and region-specific types (US, UK, Spain, Italy, etc.).
 * These map to regex patterns for detection.
 */
export enum PIIEntity {
	// Global
	CREDIT_CARD = 'CREDIT_CARD',
	CRYPTO = 'CRYPTO',
	DATE_TIME = 'DATE_TIME',
	EMAIL_ADDRESS = 'EMAIL_ADDRESS',
	IBAN_CODE = 'IBAN_CODE',
	IP_ADDRESS = 'IP_ADDRESS',
	NRP = 'NRP',
	LOCATION = 'LOCATION',
	PERSON = 'PERSON',
	PHONE_NUMBER = 'PHONE_NUMBER',
	MEDICAL_LICENSE = 'MEDICAL_LICENSE',
	URL = 'URL',

	// USA
	US_BANK_NUMBER = 'US_BANK_NUMBER',
	US_DRIVER_LICENSE = 'US_DRIVER_LICENSE',
	US_ITIN = 'US_ITIN',
	US_PASSPORT = 'US_PASSPORT',
	US_SSN = 'US_SSN',

	// UK
	UK_NHS = 'UK_NHS',
	UK_NINO = 'UK_NINO',

	// Spain
	ES_NIF = 'ES_NIF',
	ES_NIE = 'ES_NIE',

	// Italy
	IT_FISCAL_CODE = 'IT_FISCAL_CODE',
	IT_DRIVER_LICENSE = 'IT_DRIVER_LICENSE',
	IT_VAT_CODE = 'IT_VAT_CODE',
	IT_PASSPORT = 'IT_PASSPORT',
	IT_IDENTITY_CARD = 'IT_IDENTITY_CARD',

	// Poland
	PL_PESEL = 'PL_PESEL',

	// Singapore
	SG_NRIC_FIN = 'SG_NRIC_FIN',
	SG_UEN = 'SG_UEN',

	// Australia
	AU_ABN = 'AU_ABN',
	AU_ACN = 'AU_ACN',
	AU_TFN = 'AU_TFN',
	AU_MEDICARE = 'AU_MEDICARE',

	// India
	IN_PAN = 'IN_PAN',
	IN_AADHAAR = 'IN_AADHAAR',
	IN_VEHICLE_REGISTRATION = 'IN_VEHICLE_REGISTRATION',
	IN_VOTER = 'IN_VOTER',
	IN_PASSPORT = 'IN_PASSPORT',

	// Finland
	FI_PERSONAL_IDENTITY_CODE = 'FI_PERSONAL_IDENTITY_CODE',
}

export const PII_DISPLAY_NAMES: Record<PIIEntity, string> = {
	[PIIEntity.CREDIT_CARD]: 'Credit Card',
	[PIIEntity.CRYPTO]: 'Crypto',
	[PIIEntity.DATE_TIME]: 'Date Time',
	[PIIEntity.EMAIL_ADDRESS]: 'Email Address',
	[PIIEntity.IBAN_CODE]: 'IBAN Code',
	[PIIEntity.IP_ADDRESS]: 'IP Address',
	[PIIEntity.NRP]: 'NRP',
	[PIIEntity.LOCATION]: 'Location',
	[PIIEntity.PERSON]: 'Person',
	[PIIEntity.PHONE_NUMBER]: 'Phone Number',
	[PIIEntity.MEDICAL_LICENSE]: 'Medical License',
	[PIIEntity.URL]: 'URL',
	[PIIEntity.US_BANK_NUMBER]: 'US Bank Number',
	[PIIEntity.US_DRIVER_LICENSE]: 'US Driver License',
	[PIIEntity.US_ITIN]: 'US ITIN',
	[PIIEntity.US_PASSPORT]: 'US Passport',
	[PIIEntity.US_SSN]: 'US SSN',
	[PIIEntity.UK_NHS]: 'UK NHS',
	[PIIEntity.UK_NINO]: 'UK NINO',
	[PIIEntity.ES_NIF]: 'ES NIF',
	[PIIEntity.ES_NIE]: 'ES NIE',
	[PIIEntity.IT_FISCAL_CODE]: 'IT Fiscal Code',
	[PIIEntity.IT_DRIVER_LICENSE]: 'IT Driver License',
	[PIIEntity.IT_VAT_CODE]: 'IT VAT Code',
	[PIIEntity.IT_PASSPORT]: 'IT Passport',
	[PIIEntity.IT_IDENTITY_CARD]: 'IT Identity Card',
	[PIIEntity.PL_PESEL]: 'PL PESEL',
	[PIIEntity.SG_NRIC_FIN]: 'SG NRIC FIN',
	[PIIEntity.SG_UEN]: 'SG UEN',
	[PIIEntity.AU_ABN]: 'AU ABN',
	[PIIEntity.AU_ACN]: 'AU ACN',
	[PIIEntity.AU_TFN]: 'AU TFN',
	[PIIEntity.AU_MEDICARE]: 'AU Medicare',
	[PIIEntity.IN_PAN]: 'IN PAN',
	[PIIEntity.IN_AADHAAR]: 'IN AADHAAR',
	[PIIEntity.IN_VEHICLE_REGISTRATION]: 'IN Vehicle Registration',
	[PIIEntity.IN_VOTER]: 'IN Voter',
	[PIIEntity.IN_PASSPORT]: 'IN Passport',
	[PIIEntity.FI_PERSONAL_IDENTITY_CODE]: 'FI Personal Identity Code',
};

/**
 * Default regex patterns for PII entity types.
 */
const DEFAULT_PII_PATTERNS: Record<PIIEntity, RegExp> = {
	[PIIEntity.CREDIT_CARD]: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
	[PIIEntity.CRYPTO]: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
	[PIIEntity.DATE_TIME]: /\b(0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
	[PIIEntity.EMAIL_ADDRESS]: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
	[PIIEntity.IBAN_CODE]: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g,
	[PIIEntity.IP_ADDRESS]: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
	[PIIEntity.NRP]: /\b[A-Za-z]+ [A-Za-z]+\b/g,
	[PIIEntity.LOCATION]:
		/\b[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Way|Highway|Hwy)\b/g,
	[PIIEntity.PERSON]: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
	[PIIEntity.PHONE_NUMBER]: /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
	[PIIEntity.MEDICAL_LICENSE]: /\b[A-Z]{2}\d{6}\b/g,
	[PIIEntity.URL]:
		/\bhttps?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g,

	// USA
	[PIIEntity.US_BANK_NUMBER]: /\b\d{8,17}\b/g,
	[PIIEntity.US_DRIVER_LICENSE]: /\b[A-Z]\d{7}\b/g,
	[PIIEntity.US_ITIN]: /\b9\d{2}-\d{2}-\d{4}\b/g,
	[PIIEntity.US_PASSPORT]: /\b[A-Z]\d{8}\b/g,
	[PIIEntity.US_SSN]: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,

	// UK
	[PIIEntity.UK_NHS]: /\b\d{3} \d{3} \d{4}\b/g,
	[PIIEntity.UK_NINO]: /\b[A-Z]{2}\d{6}[A-Z]\b/g,

	// Spain
	[PIIEntity.ES_NIF]: /\b[A-Z]\d{8}\b/g,
	[PIIEntity.ES_NIE]: /\b[A-Z]\d{8}\b/g,

	// Italy
	[PIIEntity.IT_FISCAL_CODE]: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/g,
	[PIIEntity.IT_DRIVER_LICENSE]: /\b[A-Z]{2}\d{7}\b/g,
	[PIIEntity.IT_VAT_CODE]: /\bIT\d{11}\b/g,
	[PIIEntity.IT_PASSPORT]: /\b[A-Z]{2}\d{7}\b/g,
	[PIIEntity.IT_IDENTITY_CARD]: /\b[A-Z]{2}\d{7}\b/g,

	// Poland
	[PIIEntity.PL_PESEL]: /\b\d{11}\b/g,

	// Singapore
	[PIIEntity.SG_NRIC_FIN]: /\b[A-Z]\d{7}[A-Z]\b/g,
	[PIIEntity.SG_UEN]: /\b\d{8}[A-Z]\b|\b\d{9}[A-Z]\b/g,

	// Australia
	[PIIEntity.AU_ABN]: /\b\d{2} \d{3} \d{3} \d{3}\b/g,
	[PIIEntity.AU_ACN]: /\b\d{3} \d{3} \d{3}\b/g,
	[PIIEntity.AU_TFN]: /\b\d{9}\b/g,
	[PIIEntity.AU_MEDICARE]: /\b\d{4} \d{5} \d{1}\b/g,

	// India
	[PIIEntity.IN_PAN]: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
	[PIIEntity.IN_AADHAAR]: /\b\d{4} \d{4} \d{4}\b/g,
	[PIIEntity.IN_VEHICLE_REGISTRATION]: /\b[A-Z]{2}\d{2}[A-Z]{2}\d{4}\b/g,
	[PIIEntity.IN_VOTER]: /\b[A-Z]{3}\d{7}\b/g,
	[PIIEntity.IN_PASSPORT]: /\b[A-Z]\d{7}\b/g,

	// Finland
	[PIIEntity.FI_PERSONAL_IDENTITY_CODE]: /\b\d{6}[+-A]\d{3}[A-Z0-9]\b/g,
};
