/**
 * NASA Node - Version 1
 * Retrieve data from the NASA API
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
// Output Types
// ===========================================================================

export type NasaV1AstronomyPictureOfTheDayGetOutput = {
	copyright?: string;
	date?: string;
	explanation?: string;
	hdurl?: string;
	media_type?: string;
	service_version?: string;
	title?: string;
	url?: string;
};

export type NasaV1DonkiCoronalMassEjectionGetOutput = {
	activityID?: string;
	catalog?: string;
	cmeAnalyses?: Array<{
		featureCode?: string;
		halfAngle?: number;
		imageType?: string;
		isMostAccurate?: boolean;
		latitude?: number;
		levelOfData?: number;
		link?: string;
		measurementTechnique?: string;
		minorHalfWidth?: null;
		note?: string;
		speed?: number;
		submissionTime?: string;
		tilt?: null;
		time21_5?: string;
		type?: string;
	}>;
	instruments?: Array<{
		displayName?: string;
	}>;
	link?: string;
	note?: string;
	sourceLocation?: string;
	startTime?: string;
	submissionTime?: string;
	versionId?: number;
};

export type NasaV1DonkiSolarFlareGetOutput = {
	activeRegionNum?: number;
	beginTime?: string;
	catalog?: string;
	classType?: string;
	endTime?: string;
	flrID?: string;
	instruments?: Array<{
		displayName?: string;
	}>;
	link?: string;
	note?: string;
	peakTime?: string;
	sentNotifications?: null;
	sourceLocation?: string;
	submissionTime?: string;
	versionId?: number;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface NasaV1Credentials {
	nasaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface NasaV1NodeBase {
	type: 'n8n-nodes-base.nasa';
	version: 1;
	credentials?: NasaV1Credentials;
}

export type NasaV1AsteroidNeoBrowseGetAllNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1AsteroidNeoBrowseGetAllConfig>;
};

export type NasaV1AsteroidNeoFeedGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1AsteroidNeoFeedGetConfig>;
};

export type NasaV1AsteroidNeoLookupGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1AsteroidNeoLookupGetConfig>;
};

export type NasaV1AstronomyPictureOfTheDayGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1AstronomyPictureOfTheDayGetConfig>;
	output?: NasaV1AstronomyPictureOfTheDayGetOutput;
};

export type NasaV1DonkiCoronalMassEjectionGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1DonkiCoronalMassEjectionGetConfig>;
	output?: NasaV1DonkiCoronalMassEjectionGetOutput;
};

export type NasaV1DonkiHighSpeedStreamGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1DonkiHighSpeedStreamGetConfig>;
};

export type NasaV1DonkiInterplanetaryShockGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1DonkiInterplanetaryShockGetConfig>;
};

export type NasaV1DonkiMagnetopauseCrossingGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1DonkiMagnetopauseCrossingGetConfig>;
};

export type NasaV1DonkiNotificationsGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1DonkiNotificationsGetConfig>;
};

export type NasaV1DonkiRadiationBeltEnhancementGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1DonkiRadiationBeltEnhancementGetConfig>;
};

export type NasaV1DonkiSolarEnergeticParticleGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1DonkiSolarEnergeticParticleGetConfig>;
};

export type NasaV1DonkiSolarFlareGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1DonkiSolarFlareGetConfig>;
	output?: NasaV1DonkiSolarFlareGetOutput;
};

export type NasaV1DonkiWsaEnlilSimulationGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1DonkiWsaEnlilSimulationGetConfig>;
};

export type NasaV1EarthAssetsGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1EarthAssetsGetConfig>;
};

export type NasaV1EarthImageryGetNode = NasaV1NodeBase & {
	config: NodeConfig<NasaV1EarthImageryGetConfig>;
};

export type NasaV1Node =
	| NasaV1AsteroidNeoBrowseGetAllNode
	| NasaV1AsteroidNeoFeedGetNode
	| NasaV1AsteroidNeoLookupGetNode
	| NasaV1AstronomyPictureOfTheDayGetNode
	| NasaV1DonkiCoronalMassEjectionGetNode
	| NasaV1DonkiHighSpeedStreamGetNode
	| NasaV1DonkiInterplanetaryShockGetNode
	| NasaV1DonkiMagnetopauseCrossingGetNode
	| NasaV1DonkiNotificationsGetNode
	| NasaV1DonkiRadiationBeltEnhancementGetNode
	| NasaV1DonkiSolarEnergeticParticleGetNode
	| NasaV1DonkiSolarFlareGetNode
	| NasaV1DonkiWsaEnlilSimulationGetNode
	| NasaV1EarthAssetsGetNode
	| NasaV1EarthImageryGetNode
	;