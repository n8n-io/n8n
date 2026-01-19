/**
 * One Simple API Node - Version 1
 * A toolbox of no-code utilities
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Convert a value between currencies */
export type OneSimpleApiV1InformationExchangeRateConfig = {
	resource: 'information';
	operation: 'exchangeRate';
/**
 * Value to convert
 * @displayOptions.show { operation: ["exchangeRate"], resource: ["information"] }
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
 * @displayOptions.show { operation: ["imageMetadata"], resource: ["information"] }
 */
		link: string | Expression<string>;
};

/** Get details about an Instagram profile */
export type OneSimpleApiV1SocialProfileInstagramProfileConfig = {
	resource: 'socialProfile';
	operation: 'instagramProfile';
/**
 * Profile name to get details of
 * @displayOptions.show { operation: ["instagramProfile"], resource: ["socialProfile"] }
 */
		profileName: string | Expression<string>;
};

/** Get details about a Spotify Artist */
export type OneSimpleApiV1SocialProfileSpotifyArtistProfileConfig = {
	resource: 'socialProfile';
	operation: 'spotifyArtistProfile';
/**
 * Artist name to get details for
 * @displayOptions.show { operation: ["spotifyArtistProfile"], resource: ["socialProfile"] }
 */
		artistName: string | Expression<string>;
};

/** Expand a shortened URL */
export type OneSimpleApiV1UtilityExpandURLConfig = {
	resource: 'utility';
	operation: 'expandURL';
/**
 * URL to unshorten
 * @displayOptions.show { operation: ["expandURL"], resource: ["utility"] }
 */
		link: string | Expression<string>;
};

/** Generate a QR Code */
export type OneSimpleApiV1UtilityQrCodeConfig = {
	resource: 'utility';
	operation: 'qrCode';
/**
 * The text that should be turned into a QR code - like a website URL
 * @displayOptions.show { operation: ["qrCode"], resource: ["utility"] }
 */
		message: string | Expression<string>;
/**
 * Whether to download the QR code or return a link to it
 * @displayOptions.show { operation: ["qrCode"], resource: ["utility"] }
 * @default false
 */
		download: boolean | Expression<boolean>;
/**
 * The name of the output field to put the binary file data in
 * @displayOptions.show { operation: ["qrCode"], resource: ["utility"], download: [true] }
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
 * @displayOptions.show { operation: ["pdf"], resource: ["website"] }
 */
		link: string | Expression<string>;
/**
 * Whether to download the PDF or return a link to it
 * @displayOptions.show { operation: ["pdf"], resource: ["website"] }
 * @default false
 */
		download: boolean | Expression<boolean>;
/**
 * The name of the output field to put the binary file data in
 * @displayOptions.show { operation: ["pdf"], resource: ["website"], download: [true] }
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
 * @displayOptions.show { operation: ["seo"], resource: ["website"] }
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
 * @displayOptions.show { operation: ["screenshot"], resource: ["website"] }
 */
		link: string | Expression<string>;
/**
 * Whether to download the screenshot or return a link to it
 * @displayOptions.show { operation: ["screenshot"], resource: ["website"] }
 * @default false
 */
		download: boolean | Expression<boolean>;
/**
 * The name of the output field to put the binary file data in
 * @displayOptions.show { operation: ["screenshot"], resource: ["website"], download: [true] }
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
	| OneSimpleApiV1WebsiteScreenshotConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface OneSimpleApiV1Credentials {
	oneSimpleApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface OneSimpleApiV1NodeBase {
	type: 'n8n-nodes-base.oneSimpleApi';
	version: 1;
	credentials?: OneSimpleApiV1Credentials;
}

export type OneSimpleApiV1InformationExchangeRateNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1InformationExchangeRateConfig>;
};

export type OneSimpleApiV1InformationImageMetadataNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1InformationImageMetadataConfig>;
};

export type OneSimpleApiV1SocialProfileInstagramProfileNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1SocialProfileInstagramProfileConfig>;
};

export type OneSimpleApiV1SocialProfileSpotifyArtistProfileNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1SocialProfileSpotifyArtistProfileConfig>;
};

export type OneSimpleApiV1UtilityExpandURLNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1UtilityExpandURLConfig>;
};

export type OneSimpleApiV1UtilityQrCodeNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1UtilityQrCodeConfig>;
};

export type OneSimpleApiV1UtilityValidateEmailNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1UtilityValidateEmailConfig>;
};

export type OneSimpleApiV1WebsitePdfNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1WebsitePdfConfig>;
};

export type OneSimpleApiV1WebsiteSeoNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1WebsiteSeoConfig>;
};

export type OneSimpleApiV1WebsiteScreenshotNode = OneSimpleApiV1NodeBase & {
	config: NodeConfig<OneSimpleApiV1WebsiteScreenshotConfig>;
};

export type OneSimpleApiV1Node =
	| OneSimpleApiV1InformationExchangeRateNode
	| OneSimpleApiV1InformationImageMetadataNode
	| OneSimpleApiV1SocialProfileInstagramProfileNode
	| OneSimpleApiV1SocialProfileSpotifyArtistProfileNode
	| OneSimpleApiV1UtilityExpandURLNode
	| OneSimpleApiV1UtilityQrCodeNode
	| OneSimpleApiV1UtilityValidateEmailNode
	| OneSimpleApiV1WebsitePdfNode
	| OneSimpleApiV1WebsiteSeoNode
	| OneSimpleApiV1WebsiteScreenshotNode
	;