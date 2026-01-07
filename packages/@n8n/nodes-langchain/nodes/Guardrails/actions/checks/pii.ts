// Source: https://github.com/openai/openai-guardrails-js/blob/b9b99b4fb454f02a362c2836aec6285176ec40a8/src/checks/pii.ts
/**
 * PII detection guardrail for sensitive text content.
 *
 * This module implements a guardrail for detecting Personally Identifiable
 * Information (PII) in text using regex patterns. It defines the config
 * schema for entity selection, output/result structures, and the async guardrail
 * check_fn for runtime enforcement.
 */

import { parseRegex } from '../../helpers/common';
import type { CreateCheckFn, CustomRegex } from '../types';

/**
 * Supported PII entity types for detection.
 *
 * Includes global and region-specific types (US, UK, Spain, Italy, etc.).
 * These map to regex patterns for detection.
 */
// eslint-disable-next-line no-restricted-syntax
export enum PIIEntity {
	// Global
	CREDIT_CARD = 'CREDIT_CARD',
	CRYPTO = 'CRYPTO',
	DATE_TIME = 'DATE_TIME',
	EMAIL_ADDRESS = 'EMAIL_ADDRESS',
	IBAN_CODE = 'IBAN_CODE',
	IP_ADDRESS = 'IP_ADDRESS',
	LOCATION = 'LOCATION',
	PHONE_NUMBER = 'PHONE_NUMBER',
	MEDICAL_LICENSE = 'MEDICAL_LICENSE',

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

const allEntities = Object.values(PIIEntity);

export type PIIConfig = {
	entities?: PIIEntity[];
	customRegex?: CustomRegex[];
};

export type CustomRegexConfig = {
	customRegex: CustomRegex[];
};

/**
 * Internal result structure for PII detection.
 */
interface PiiDetectionResult {
	mapping: Record<string, string[]>;
	analyzerResults: PiiAnalyzerResult[];
}

/**
 * PII analyzer result structure.
 */
interface PiiAnalyzerResult {
	entityType: string;
	text: string;
}

export const PII_NAME_MAP: Record<PIIEntity, string> = {
	[PIIEntity.CREDIT_CARD]: 'Credit Card',
	[PIIEntity.CRYPTO]: 'Crypto',
	[PIIEntity.DATE_TIME]: 'Date Time',
	[PIIEntity.EMAIL_ADDRESS]: 'Email Address',
	[PIIEntity.IBAN_CODE]: 'IBAN Code',
	[PIIEntity.IP_ADDRESS]: 'IP Address',
	[PIIEntity.LOCATION]: 'Location',
	[PIIEntity.PHONE_NUMBER]: 'Phone Number',
	[PIIEntity.MEDICAL_LICENSE]: 'Medical License',
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
	[PIIEntity.LOCATION]:
		/\b[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Way|Highway|Hwy)\b/g,
	[PIIEntity.PHONE_NUMBER]: /\b[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}\b/g,
	[PIIEntity.MEDICAL_LICENSE]: /\b[A-Z]{2}\d{6}\b/g,

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

/**
 * Run regex analysis and collect findings by entity type.
 *
 * @param text The text to analyze for PII
 * @param config PII detection configuration
 * @returns Object containing mapping of entities to detected snippets
 * @throws Error if text is empty or null
 */
function detectPii(text: string, config: PIIConfig): PiiDetectionResult {
	if (!text) {
		return {
			mapping: {},
			analyzerResults: [],
		};
	}

	const grouped: Record<string, string[]> = {};
	const analyzerResults: PiiAnalyzerResult[] = [];

	const matchAgainstPattern = (name: string, pattern: RegExp) => {
		// make sure to add the global flag to the regex, otherwise while() will never end
		const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
		const regex = new RegExp(pattern.source, flags);
		let match;
		while ((match = regex.exec(text)) !== null) {
			const entityType = name;
			const start = match.index;
			const end = match.index + match[0].length;

			if (!grouped[entityType]) {
				grouped[entityType] = [];
			}
			grouped[entityType].push(text.substring(start, end));

			analyzerResults.push({
				entityType,
				text: text.substring(start, end),
			});
		}
	};

	// Check each configured entity type
	const entities = config.entities ?? allEntities;
	for (const entity of entities) {
		const pattern = DEFAULT_PII_PATTERNS[entity];
		if (pattern) {
			matchAgainstPattern(entity, pattern);
		}
	}
	if (config.customRegex?.length) {
		for (const regex of config.customRegex) {
			matchAgainstPattern(regex.name, parseRegex(regex.value));
		}
	}

	return {
		mapping: grouped,
		analyzerResults,
	};
}

export const createPiiCheckFn: CreateCheckFn<PIIConfig> = (config) => {
	return (input: string) => {
		const detection = detectPii(input, config);
		const piiFound = detection.mapping && Object.keys(detection.mapping).length > 0;
		return {
			guardrailName: 'personalData',
			tripwireTriggered: piiFound,
			info: {
				maskEntities: detection.mapping,
				analyzerResults: detection.analyzerResults,
			},
		};
	};
};

export const createCustomRegexCheckFn: CreateCheckFn<CustomRegexConfig> = (config) => {
	return (input: string) => {
		const detection = detectPii(input, { customRegex: config.customRegex, entities: [] });
		const customRegexFound = detection.mapping && Object.keys(detection.mapping).length > 0;
		return {
			guardrailName: 'customRegex',
			tripwireTriggered: customRegexFound,
			info: {
				maskEntities: detection.mapping,
				analyzerResults: detection.analyzerResults,
			},
		};
	};
};
