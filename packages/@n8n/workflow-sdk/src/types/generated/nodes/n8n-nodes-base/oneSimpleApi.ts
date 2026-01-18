/**
 * One Simple API Node Types
 *
 * A toolbox of no-code utilities
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/onesimpleapi/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Convert a value between currencies */
export type OneSimpleApiV1InformationExchangeRateConfig = {
	resource: 'information';
	operation: 'exchangeRate';
	/**
	 * Value to convert
	 */
	value: string | Expression<string>;
	fromCurrency: string | Expression<string>;
	toCurrency: string | Expression<string>;
};

/** Retrieve image metadata from a URL */
export type OneSimpleApiV1InformationImageMetadataConfig = {
	resource: 'information';
	operation: 'imageMetadata';
	/**
	 * Image to get metadata from
	 */
	link: string | Expression<string>;
};

/** Get details about an Instagram profile */
export type OneSimpleApiV1SocialProfileInstagramProfileConfig = {
	resource: 'socialProfile';
	operation: 'instagramProfile';
	/**
	 * Profile name to get details of
	 */
	profileName: string | Expression<string>;
};

/** Get details about a Spotify Artist */
export type OneSimpleApiV1SocialProfileSpotifyArtistProfileConfig = {
	resource: 'socialProfile';
	operation: 'spotifyArtistProfile';
	/**
	 * Artist name to get details for
	 */
	artistName: string | Expression<string>;
};

/** Expand a shortened URL */
export type OneSimpleApiV1UtilityExpandURLConfig = {
	resource: 'utility';
	operation: 'expandURL';
	/**
	 * URL to unshorten
	 */
	link: string | Expression<string>;
};

/** Generate a QR Code */
export type OneSimpleApiV1UtilityQrCodeConfig = {
	resource: 'utility';
	operation: 'qrCode';
	/**
	 * The text that should be turned into a QR code - like a website URL
	 */
	message: string | Expression<string>;
	/**
	 * Whether to download the QR code or return a link to it
	 * @default false
	 */
	download: boolean | Expression<boolean>;
	/**
	 * The name of the output field to put the binary file data in
	 * @default data
	 */
	output: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Validate an email address */
export type OneSimpleApiV1UtilityValidateEmailConfig = {
	resource: 'utility';
	operation: 'validateEmail';
	emailAddress: string | Expression<string>;
};

/** Generate a PDF from a webpage */
export type OneSimpleApiV1WebsitePdfConfig = {
	resource: 'website';
	operation: 'pdf';
	/**
	 * Link to webpage to convert
	 */
	link: string | Expression<string>;
	/**
	 * Whether to download the PDF or return a link to it
	 * @default false
	 */
	download: boolean | Expression<boolean>;
	/**
	 * The name of the output field to put the binary file data in
	 * @default data
	 */
	output: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get SEO information from website */
export type OneSimpleApiV1WebsiteSeoConfig = {
	resource: 'website';
	operation: 'seo';
	/**
	 * Webpage to get SEO information for
	 */
	link: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a screenshot from a webpage */
export type OneSimpleApiV1WebsiteScreenshotConfig = {
	resource: 'website';
	operation: 'screenshot';
	/**
	 * Link to webpage to convert
	 */
	link: string | Expression<string>;
	/**
	 * Whether to download the screenshot or return a link to it
	 * @default false
	 */
	download: boolean | Expression<boolean>;
	/**
	 * The name of the output field to put the binary file data in
	 * @default data
	 */
	output: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type OneSimpleApiV1Params =
	| OneSimpleApiV1InformationExchangeRateConfig
	| OneSimpleApiV1InformationImageMetadataConfig
	| OneSimpleApiV1SocialProfileInstagramProfileConfig
	| OneSimpleApiV1SocialProfileSpotifyArtistProfileConfig
	| OneSimpleApiV1UtilityExpandURLConfig
	| OneSimpleApiV1UtilityQrCodeConfig
	| OneSimpleApiV1UtilityValidateEmailConfig
	| OneSimpleApiV1WebsitePdfConfig
	| OneSimpleApiV1WebsiteSeoConfig
	| OneSimpleApiV1WebsiteScreenshotConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface OneSimpleApiV1Credentials {
	oneSimpleApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type OneSimpleApiNode = {
	type: 'n8n-nodes-base.oneSimpleApi';
	version: 1;
	config: NodeConfig<OneSimpleApiV1Params>;
	credentials?: OneSimpleApiV1Credentials;
};
