/**
 * Strava Node - Version 1.1
 * Consume Strava API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new activity */
export type StravaV11ActivityCreateConfig = {
	resource: 'activity';
	operation: 'create';
/**
 * The name of the activity
 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * Type of sport
 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
 * @default Run
 */
		sport_type?: 'AlpineSki' | 'BackcountrySki' | 'Badminton' | 'Canoeing' | 'Crossfit' | 'EBikeRide' | 'Elliptical' | 'EMountainBikeRide' | 'Golf' | 'GravelRide' | 'Handcycle' | 'HighIntensityIntervalTraining' | 'Hike' | 'IceSkate' | 'InlineSkate' | 'Kayaking' | 'Kitesurf' | 'MountainBikeRide' | 'NordicSki' | 'Pickleball' | 'Pilates' | 'Racquetball' | 'Ride' | 'RockClimbing' | 'RollerSki' | 'Rowing' | 'Run' | 'Sail' | 'Skateboard' | 'Snowboard' | 'Snowshoe' | 'Soccer' | 'Squash' | 'StairStepper' | 'StandUpPaddling' | 'Surfing' | 'Swim' | 'TableTennis' | 'Tennis' | 'TrailRun' | 'Velomobile' | 'VirtualRide' | 'VirtualRow' | 'VirtualRun' | 'Walk' | 'WeightTraining' | 'Wheelchair' | 'Windsurf' | 'Workout' | 'Yoga' | Expression<string>;
/**
 * ISO 8601 formatted date time
 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
 */
		startDate: string | Expression<string>;
/**
 * In seconds
 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["activity"], operation: ["get"] }
 */
		activityId: string | Expression<string>;
};

/** Get all activity comments */
export type StravaV11ActivityGetCommentsConfig = {
	resource: 'activity';
	operation: 'getComments';
/**
 * ID or email of activity
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones", "getStreams"] }
 */
		activityId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones", "getStreams"] }
 */
		activityId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones", "getStreams"] }
 */
		activityId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["activity"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["activity"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones", "getStreams"] }
 */
		activityId: string | Expression<string>;
/**
 * Desired stream types to return
 * @displayOptions.show { resource: ["activity"], operation: ["getStreams"] }
 * @default []
 */
		keys: Array<'altitude' | 'cadence' | 'distance' | 'grade_smooth' | 'heartrate' | 'latlng' | 'moving' | 'temp' | 'time' | 'velocity_smooth' | 'watts'>;
};

/** Get all activity zones */
export type StravaV11ActivityGetZonesConfig = {
	resource: 'activity';
	operation: 'getZones';
/**
 * ID or email of activity
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones", "getStreams"] }
 */
		activityId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["activity"], operation: ["getComments", "getLaps", "getKudos", "getZones"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["activity"], operation: ["update"] }
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
	| StravaV11ActivityUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type StravaV11ActivityGetAllOutput = {
	achievement_count?: number;
	athlete?: {
		id?: number;
		resource_state?: number;
	};
	athlete_count?: number;
	comment_count?: number;
	commute?: boolean;
	device_watts?: boolean;
	display_hide_heartrate_option?: boolean;
	elapsed_time?: number;
	flagged?: boolean;
	from_accepted_tag?: boolean;
	has_heartrate?: boolean;
	has_kudoed?: boolean;
	heartrate_opt_out?: boolean;
	id?: number;
	kudos_count?: number;
	location_city?: null;
	location_state?: null;
	manual?: boolean;
	map?: {
		id?: string;
		resource_state?: number;
		summary_polyline?: string;
	};
	max_heartrate?: number;
	moving_time?: number;
	name?: string;
	photo_count?: number;
	pr_count?: number;
	private?: boolean;
	resource_state?: number;
	sport_type?: string;
	start_date?: string;
	start_date_local?: string;
	timezone?: string;
	total_photo_count?: number;
	trainer?: boolean;
	type?: string;
	upload_id_str?: string;
	utc_offset?: number;
	visibility?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface StravaV11Credentials {
	stravaOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface StravaV11NodeBase {
	type: 'n8n-nodes-base.strava';
	version: 1.1;
	credentials?: StravaV11Credentials;
}

export type StravaV11ActivityCreateNode = StravaV11NodeBase & {
	config: NodeConfig<StravaV11ActivityCreateConfig>;
};

export type StravaV11ActivityGetNode = StravaV11NodeBase & {
	config: NodeConfig<StravaV11ActivityGetConfig>;
};

export type StravaV11ActivityGetCommentsNode = StravaV11NodeBase & {
	config: NodeConfig<StravaV11ActivityGetCommentsConfig>;
};

export type StravaV11ActivityGetKudosNode = StravaV11NodeBase & {
	config: NodeConfig<StravaV11ActivityGetKudosConfig>;
};

export type StravaV11ActivityGetLapsNode = StravaV11NodeBase & {
	config: NodeConfig<StravaV11ActivityGetLapsConfig>;
};

export type StravaV11ActivityGetAllNode = StravaV11NodeBase & {
	config: NodeConfig<StravaV11ActivityGetAllConfig>;
	output?: StravaV11ActivityGetAllOutput;
};

export type StravaV11ActivityGetStreamsNode = StravaV11NodeBase & {
	config: NodeConfig<StravaV11ActivityGetStreamsConfig>;
};

export type StravaV11ActivityGetZonesNode = StravaV11NodeBase & {
	config: NodeConfig<StravaV11ActivityGetZonesConfig>;
};

export type StravaV11ActivityUpdateNode = StravaV11NodeBase & {
	config: NodeConfig<StravaV11ActivityUpdateConfig>;
};

export type StravaV11Node =
	| StravaV11ActivityCreateNode
	| StravaV11ActivityGetNode
	| StravaV11ActivityGetCommentsNode
	| StravaV11ActivityGetKudosNode
	| StravaV11ActivityGetLapsNode
	| StravaV11ActivityGetAllNode
	| StravaV11ActivityGetStreamsNode
	| StravaV11ActivityGetZonesNode
	| StravaV11ActivityUpdateNode
	;