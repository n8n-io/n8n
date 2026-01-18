/**
 * UptimeRobot Node Types
 *
 * Consume UptimeRobot API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/uptimerobot/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get account details */
export type UptimeRobotV1AccountGetConfig = {
	resource: 'account';
	operation: 'get';
};

/** Create a monitor */
export type UptimeRobotV1AlertContactCreateConfig = {
	resource: 'alertContact';
	operation: 'create';
	/**
	 * The friendly name of the alert contact
	 */
	friendlyName: string | Expression<string>;
	/**
	 * The type of the alert contact
	 */
	type: 4 | 2 | 6 | 9 | 1 | 3 | 5 | Expression<number>;
	/**
	 * The correspondent value for the alert contact type
	 */
	value: string | Expression<string>;
};

/** Delete a monitor */
export type UptimeRobotV1AlertContactDeleteConfig = {
	resource: 'alertContact';
	operation: 'delete';
	/**
	 * The ID of the alert contact
	 */
	id: string | Expression<string>;
};

/** Get account details */
export type UptimeRobotV1AlertContactGetConfig = {
	resource: 'alertContact';
	operation: 'get';
	/**
	 * The ID of the alert contact
	 */
	id: string | Expression<string>;
};

/** Get many monitors */
export type UptimeRobotV1AlertContactGetAllConfig = {
	resource: 'alertContact';
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
	filters?: Record<string, unknown>;
};

/** Update a monitor */
export type UptimeRobotV1AlertContactUpdateConfig = {
	resource: 'alertContact';
	operation: 'update';
	/**
	 * The ID of the alert contact
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a monitor */
export type UptimeRobotV1MaintenanceWindowCreateConfig = {
	resource: 'maintenanceWindow';
	operation: 'create';
	/**
	 * The maintenance window activation period (minutes)
	 * @default 1
	 */
	duration: number | Expression<number>;
	/**
	 * The friendly name of the maintenance window
	 */
	friendlyName: string | Expression<string>;
	/**
	 * The type of the maintenance window
	 */
	type: 1 | 2 | 3 | 4 | Expression<number>;
	weekDay?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | Expression<number>;
	monthDay?: number | Expression<number>;
	/**
	 * The maintenance window start datetime
	 */
	start_time: string | Expression<string>;
};

/** Delete a monitor */
export type UptimeRobotV1MaintenanceWindowDeleteConfig = {
	resource: 'maintenanceWindow';
	operation: 'delete';
	/**
	 * The ID of the maintenance window
	 */
	id: string | Expression<string>;
};

/** Get account details */
export type UptimeRobotV1MaintenanceWindowGetConfig = {
	resource: 'maintenanceWindow';
	operation: 'get';
	/**
	 * The ID of the maintenance window
	 */
	id: string | Expression<string>;
};

/** Get many monitors */
export type UptimeRobotV1MaintenanceWindowGetAllConfig = {
	resource: 'maintenanceWindow';
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
	filters?: Record<string, unknown>;
};

/** Update a monitor */
export type UptimeRobotV1MaintenanceWindowUpdateConfig = {
	resource: 'maintenanceWindow';
	operation: 'update';
	/**
	 * The ID of the maintenance window
	 */
	id: string | Expression<string>;
	/**
	 * The maintenance window activation period (minutes)
	 */
	duration: number | Expression<number>;
	updateFields?: Record<string, unknown>;
};

/** Create a monitor */
export type UptimeRobotV1MonitorCreateConfig = {
	resource: 'monitor';
	operation: 'create';
	/**
	 * The friendly name of the monitor
	 */
	friendlyName: string | Expression<string>;
	/**
	 * The type of the monitor
	 */
	type: 5 | 1 | 2 | 3 | 4 | Expression<number>;
	/**
	 * The URL/IP of the monitor
	 */
	url: string | Expression<string>;
};

/** Delete a monitor */
export type UptimeRobotV1MonitorDeleteConfig = {
	resource: 'monitor';
	operation: 'delete';
	/**
	 * The ID of the monitor
	 */
	id: string | Expression<string>;
};

/** Get account details */
export type UptimeRobotV1MonitorGetConfig = {
	resource: 'monitor';
	operation: 'get';
	/**
	 * The ID of the monitor
	 */
	id: string | Expression<string>;
};

/** Get many monitors */
export type UptimeRobotV1MonitorGetAllConfig = {
	resource: 'monitor';
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
	filters?: Record<string, unknown>;
};

/** Reset a monitor */
export type UptimeRobotV1MonitorResetConfig = {
	resource: 'monitor';
	operation: 'reset';
	/**
	 * The ID of the monitor
	 */
	id: string | Expression<string>;
};

/** Update a monitor */
export type UptimeRobotV1MonitorUpdateConfig = {
	resource: 'monitor';
	operation: 'update';
	/**
	 * The ID of the monitor
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a monitor */
export type UptimeRobotV1PublicStatusPageCreateConfig = {
	resource: 'publicStatusPage';
	operation: 'create';
	/**
	 * The friendly name of the status page
	 */
	friendlyName: string | Expression<string>;
	/**
	 * Monitor IDs to be displayed in status page (the values are separated with a dash (-) or 0 for all monitors)
	 */
	monitors: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a monitor */
export type UptimeRobotV1PublicStatusPageDeleteConfig = {
	resource: 'publicStatusPage';
	operation: 'delete';
	/**
	 * The ID of the public status page
	 */
	id: string | Expression<string>;
};

/** Get account details */
export type UptimeRobotV1PublicStatusPageGetConfig = {
	resource: 'publicStatusPage';
	operation: 'get';
	/**
	 * The ID of the public status page
	 */
	id: string | Expression<string>;
};

/** Get many monitors */
export type UptimeRobotV1PublicStatusPageGetAllConfig = {
	resource: 'publicStatusPage';
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
	filters?: Record<string, unknown>;
};

export type UptimeRobotV1Params =
	| UptimeRobotV1AccountGetConfig
	| UptimeRobotV1AlertContactCreateConfig
	| UptimeRobotV1AlertContactDeleteConfig
	| UptimeRobotV1AlertContactGetConfig
	| UptimeRobotV1AlertContactGetAllConfig
	| UptimeRobotV1AlertContactUpdateConfig
	| UptimeRobotV1MaintenanceWindowCreateConfig
	| UptimeRobotV1MaintenanceWindowDeleteConfig
	| UptimeRobotV1MaintenanceWindowGetConfig
	| UptimeRobotV1MaintenanceWindowGetAllConfig
	| UptimeRobotV1MaintenanceWindowUpdateConfig
	| UptimeRobotV1MonitorCreateConfig
	| UptimeRobotV1MonitorDeleteConfig
	| UptimeRobotV1MonitorGetConfig
	| UptimeRobotV1MonitorGetAllConfig
	| UptimeRobotV1MonitorResetConfig
	| UptimeRobotV1MonitorUpdateConfig
	| UptimeRobotV1PublicStatusPageCreateConfig
	| UptimeRobotV1PublicStatusPageDeleteConfig
	| UptimeRobotV1PublicStatusPageGetConfig
	| UptimeRobotV1PublicStatusPageGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface UptimeRobotV1Credentials {
	uptimeRobotApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type UptimeRobotNode = {
	type: 'n8n-nodes-base.uptimeRobot';
	version: 1;
	config: NodeConfig<UptimeRobotV1Params>;
	credentials?: UptimeRobotV1Credentials;
};
