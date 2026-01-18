/**
 * Strava Node - Version 1
 * Consume Strava API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new activity */
export type StravaV1ActivityCreateConfig = {
	resource: 'activity';
	operation: 'create';
/**
 * The name of the activity
 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * Type of activity. For example - Run, Ride etc.
 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
 */
		type: string | Expression<string>;
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
export type StravaV1ActivityGetConfig = {
	resource: 'activity';
	operation: 'get';
/**
 * ID or email of activity
 * @displayOptions.show { resource: ["activity"], operation: ["get"] }
 */
		activityId: string | Expression<string>;
};

/** Get all activity comments */
export type StravaV1ActivityGetCommentsConfig = {
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
export type StravaV1ActivityGetKudosConfig = {
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
export type StravaV1ActivityGetLapsConfig = {
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
export type StravaV1ActivityGetAllConfig = {
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
export type StravaV1ActivityGetStreamsConfig = {
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
export type StravaV1ActivityGetZonesConfig = {
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
export type StravaV1ActivityUpdateConfig = {
	resource: 'activity';
	operation: 'update';
/**
 * ID or email of activity
 * @displayOptions.show { resource: ["activity"], operation: ["update"] }
 */
		activityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type StravaV1Params =
	| StravaV1ActivityCreateConfig
	| StravaV1ActivityGetConfig
	| StravaV1ActivityGetCommentsConfig
	| StravaV1ActivityGetKudosConfig
	| StravaV1ActivityGetLapsConfig
	| StravaV1ActivityGetAllConfig
	| StravaV1ActivityGetStreamsConfig
	| StravaV1ActivityGetZonesConfig
	| StravaV1ActivityUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface StravaV1Credentials {
	stravaOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type StravaV1Node = {
	type: 'n8n-nodes-base.strava';
	version: 1;
	config: NodeConfig<StravaV1Params>;
	credentials?: StravaV1Credentials;
};