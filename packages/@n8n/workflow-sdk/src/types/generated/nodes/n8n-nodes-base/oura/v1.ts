/**
 * Oura Node - Version 1
 * Consume Oura API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get the user's personal information */
export type OuraV1ProfileGetConfig = {
	resource: 'profile';
	operation: 'get';
};

/** Get the user's activity summary */
export type OuraV1SummaryGetActivityConfig = {
	resource: 'summary';
	operation: 'getActivity';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["summary"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["summary"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get the user's readiness summary */
export type OuraV1SummaryGetReadinessConfig = {
	resource: 'summary';
	operation: 'getReadiness';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["summary"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["summary"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get the user's sleep summary */
export type OuraV1SummaryGetSleepConfig = {
	resource: 'summary';
	operation: 'getSleep';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["summary"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["summary"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type OuraV1Params =
	| OuraV1ProfileGetConfig
	| OuraV1SummaryGetActivityConfig
	| OuraV1SummaryGetReadinessConfig
	| OuraV1SummaryGetSleepConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type OuraV1ProfileGetOutput = {
	age?: number;
	biological_sex?: string;
	email?: string;
	height?: number;
	id?: string;
	weight?: number;
};

export type OuraV1SummaryGetActivityOutput = {
	active_calories?: number;
	average_met_minutes?: number;
	class_5_min?: string;
	contributors?: {
		meet_daily_targets?: number;
		move_every_hour?: number;
		recovery_time?: number;
		stay_active?: number;
		training_frequency?: number;
		training_volume?: number;
	};
	day?: string;
	equivalent_walking_distance?: number;
	high_activity_met_minutes?: number;
	high_activity_time?: number;
	id?: string;
	inactivity_alerts?: number;
	low_activity_met_minutes?: number;
	low_activity_time?: number;
	medium_activity_met_minutes?: number;
	medium_activity_time?: number;
	met?: {
		interval?: number;
		items?: Array<number>;
		timestamp?: string;
	};
	meters_to_target?: number;
	non_wear_time?: number;
	resting_time?: number;
	score?: number;
	sedentary_met_minutes?: number;
	sedentary_time?: number;
	steps?: number;
	target_calories?: number;
	target_meters?: number;
	timestamp?: string;
	total_calories?: number;
};

export type OuraV1SummaryGetReadinessOutput = {
	contributors?: {
		activity_balance?: number;
		body_temperature?: number;
		previous_night?: number;
		recovery_index?: number;
		resting_heart_rate?: number;
	};
	day?: string;
	id?: string;
	score?: number;
	temperature_deviation?: number;
	timestamp?: string;
};

export type OuraV1SummaryGetSleepOutput = {
	contributors?: {
		deep_sleep?: number;
		efficiency?: number;
		latency?: number;
		rem_sleep?: number;
		restfulness?: number;
		timing?: number;
		total_sleep?: number;
	};
	day?: string;
	id?: string;
	score?: number;
	timestamp?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface OuraV1Credentials {
	ouraApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface OuraV1NodeBase {
	type: 'n8n-nodes-base.oura';
	version: 1;
	credentials?: OuraV1Credentials;
}

export type OuraV1ProfileGetNode = OuraV1NodeBase & {
	config: NodeConfig<OuraV1ProfileGetConfig>;
	output?: OuraV1ProfileGetOutput;
};

export type OuraV1SummaryGetActivityNode = OuraV1NodeBase & {
	config: NodeConfig<OuraV1SummaryGetActivityConfig>;
	output?: OuraV1SummaryGetActivityOutput;
};

export type OuraV1SummaryGetReadinessNode = OuraV1NodeBase & {
	config: NodeConfig<OuraV1SummaryGetReadinessConfig>;
	output?: OuraV1SummaryGetReadinessOutput;
};

export type OuraV1SummaryGetSleepNode = OuraV1NodeBase & {
	config: NodeConfig<OuraV1SummaryGetSleepConfig>;
	output?: OuraV1SummaryGetSleepOutput;
};

export type OuraV1Node =
	| OuraV1ProfileGetNode
	| OuraV1SummaryGetActivityNode
	| OuraV1SummaryGetReadinessNode
	| OuraV1SummaryGetSleepNode
	;