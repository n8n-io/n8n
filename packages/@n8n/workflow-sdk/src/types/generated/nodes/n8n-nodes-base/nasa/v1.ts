/**
 * NASA Node - Version 1
 * Retrieve data from the NASA API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Browse the overall asteroid dataset */
export type NasaV1AsteroidNeoBrowseGetAllConfig = {
	resource: 'asteroidNeoBrowse';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1AsteroidNeoFeedGetConfig = {
	resource: 'asteroidNeoFeed';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1AsteroidNeoLookupGetConfig = {
	resource: 'asteroidNeoLookup';
	operation: 'get';
/**
 * The ID of the asteroid to be returned
 * @displayOptions.show { resource: ["asteroidNeoLookup"], operation: ["get"] }
 */
		asteroidId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1AstronomyPictureOfTheDayGetConfig = {
	resource: 'astronomyPictureOfTheDay';
	operation: 'get';
/**
 * By default just the URL of the image is returned. When set to true the image will be downloaded.
 * @displayOptions.show { resource: ["astronomyPictureOfTheDay"] }
 * @default true
 */
		download?: boolean | Expression<boolean>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1DonkiCoronalMassEjectionGetConfig = {
	resource: 'donkiCoronalMassEjection';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1DonkiHighSpeedStreamGetConfig = {
	resource: 'donkiHighSpeedStream';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1DonkiInterplanetaryShockGetConfig = {
	resource: 'donkiInterplanetaryShock';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1DonkiMagnetopauseCrossingGetConfig = {
	resource: 'donkiMagnetopauseCrossing';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1DonkiNotificationsGetConfig = {
	resource: 'donkiNotifications';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1DonkiRadiationBeltEnhancementGetConfig = {
	resource: 'donkiRadiationBeltEnhancement';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1DonkiSolarEnergeticParticleGetConfig = {
	resource: 'donkiSolarEnergeticParticle';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1DonkiSolarFlareGetConfig = {
	resource: 'donkiSolarFlare';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1DonkiWsaEnlilSimulationGetConfig = {
	resource: 'donkiWsaEnlilSimulation';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1EarthAssetsGetConfig = {
	resource: 'earthAssets';
	operation: 'get';
/**
 * Latitude for the location of the image
 * @displayOptions.show { resource: ["earthImagery", "earthAssets"], operation: ["get"] }
 */
		lat?: number | Expression<number>;
/**
 * Longitude for the location of the image
 * @displayOptions.show { resource: ["earthImagery", "earthAssets"], operation: ["get"] }
 */
		lon?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get the Astronomy Picture of the Day */
export type NasaV1EarthImageryGetConfig = {
	resource: 'earthImagery';
	operation: 'get';
/**
 * Latitude for the location of the image
 * @displayOptions.show { resource: ["earthImagery", "earthAssets"], operation: ["get"] }
 */
		lat?: number | Expression<number>;
/**
 * Longitude for the location of the image
 * @displayOptions.show { resource: ["earthImagery", "earthAssets"], operation: ["get"] }
 */
		lon?: number | Expression<number>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type NasaV1Params =
	| NasaV1AsteroidNeoBrowseGetAllConfig
	| NasaV1AsteroidNeoFeedGetConfig
	| NasaV1AsteroidNeoLookupGetConfig
	| NasaV1AstronomyPictureOfTheDayGetConfig
	| NasaV1DonkiCoronalMassEjectionGetConfig
	| NasaV1DonkiHighSpeedStreamGetConfig
	| NasaV1DonkiInterplanetaryShockGetConfig
	| NasaV1DonkiMagnetopauseCrossingGetConfig
	| NasaV1DonkiNotificationsGetConfig
	| NasaV1DonkiRadiationBeltEnhancementGetConfig
	| NasaV1DonkiSolarEnergeticParticleGetConfig
	| NasaV1DonkiSolarFlareGetConfig
	| NasaV1DonkiWsaEnlilSimulationGetConfig
	| NasaV1EarthAssetsGetConfig
	| NasaV1EarthImageryGetConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface NasaV1Credentials {
	nasaApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type NasaV1Node = {
	type: 'n8n-nodes-base.nasa';
	version: 1;
	config: NodeConfig<NasaV1Params>;
	credentials?: NasaV1Credentials;
};