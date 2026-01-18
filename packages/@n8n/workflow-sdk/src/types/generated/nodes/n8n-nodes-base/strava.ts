/**
 * Strava Node Types
 *
 * Consume Strava API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/strava/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new activity */
export type StravaV11ActivityCreateConfig = {
	resource: 'activity';
	operation: 'create';
	/**
	 * The name of the activity
	 */
	name: string | Expression<string>;
	/**
	 * Type of activity. For example - Run, Ride etc.
	 */
	type: string | Expression<string>;
	/**
	 * Type of sport
	 * @default Run
	 */
	sport_type?:
		| 'AlpineSki'
		| 'BackcountrySki'
		| 'Badminton'
		| 'Canoeing'
		| 'Crossfit'
		| 'EBikeRide'
		| 'Elliptical'
		| 'EMountainBikeRide'
		| 'Golf'
		| 'GravelRide'
		| 'Handcycle'
		| 'HighIntensityIntervalTraining'
		| 'Hike'
		| 'IceSkate'
		| 'InlineSkate'
		| 'Kayaking'
		| 'Kitesurf'
		| 'MountainBikeRide'
		| 'NordicSki'
		| 'Pickleball'
		| 'Pilates'
		| 'Racquetball'
		| 'Ride'
		| 'RockClimbing'
		| 'RollerSki'
		| 'Rowing'
		| 'Run'
		| 'Sail'
		| 'Skateboard'
		| 'Snowboard'
		| 'Snowshoe'
		| 'Soccer'
		| 'Squash'
		| 'StairStepper'
		| 'StandUpPaddling'
		| 'Surfing'
		| 'Swim'
		| 'TableTennis'
		| 'Tennis'
		| 'TrailRun'
		| 'Velomobile'
		| 'VirtualRide'
		| 'VirtualRow'
		| 'VirtualRun'
		| 'Walk'
		| 'WeightTraining'
		| 'Wheelchair'
		| 'Windsurf'
		| 'Workout'
		| 'Yoga'
		| Expression<string>;
	/**
	 * ISO 8601 formatted date time
	 */
	startDate: string | Expression<string>;
	/**
	 * In seconds
	 * @default 0
	 */
	elapsedTime: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get an activity */
export type StravaV11ActivityGetConfig = {
	resource: 'activity';
	operation: 'get';
	/**
	 * ID or email of activity
	 */
	activityId: string | Expression<string>;
};

/** Get all activity comments */
export type StravaV11ActivityGetCommentsConfig = {
	resource: 'activity';
	operation: 'getComments';
	/**
	 * ID or email of activity
	 */
	activityId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Get all activity kudos */
export type StravaV11ActivityGetKudosConfig = {
	resource: 'activity';
	operation: 'getKudos';
	/**
	 * ID or email of activity
	 */
	activityId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Get all activity laps */
export type StravaV11ActivityGetLapsConfig = {
	resource: 'activity';
	operation: 'getLaps';
	/**
	 * ID or email of activity
	 */
	activityId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Get many activities */
export type StravaV11ActivityGetAllConfig = {
	resource: 'activity';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Get activity streams */
export type StravaV11ActivityGetStreamsConfig = {
	resource: 'activity';
	operation: 'getStreams';
	/**
	 * ID or email of activity
	 */
	activityId: string | Expression<string>;
	/**
	 * Desired stream types to return
	 * @default []
	 */
	keys: Array<
		| 'altitude'
		| 'cadence'
		| 'distance'
		| 'grade_smooth'
		| 'heartrate'
		| 'latlng'
		| 'moving'
		| 'temp'
		| 'time'
		| 'velocity_smooth'
		| 'watts'
	>;
};

/** Get all activity zones */
export type StravaV11ActivityGetZonesConfig = {
	resource: 'activity';
	operation: 'getZones';
	/**
	 * ID or email of activity
	 */
	activityId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update an activity */
export type StravaV11ActivityUpdateConfig = {
	resource: 'activity';
	operation: 'update';
	/**
	 * ID or email of activity
	 */
	activityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type StravaV11Params =
	| StravaV11ActivityCreateConfig
	| StravaV11ActivityGetConfig
	| StravaV11ActivityGetCommentsConfig
	| StravaV11ActivityGetKudosConfig
	| StravaV11ActivityGetLapsConfig
	| StravaV11ActivityGetAllConfig
	| StravaV11ActivityGetStreamsConfig
	| StravaV11ActivityGetZonesConfig
	| StravaV11ActivityUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface StravaV11Credentials {
	stravaOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type StravaV11Node = {
	type: 'n8n-nodes-base.strava';
	version: 1 | 1.1;
	config: NodeConfig<StravaV11Params>;
	credentials?: StravaV11Credentials;
};

export type StravaNode = StravaV11Node;
