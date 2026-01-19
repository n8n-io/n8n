/**
 * UptimeRobot Node - Version 1
 * Consume UptimeRobot API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["alertContact"], operation: ["create"] }
 */
		friendlyName: string | Expression<string>;
/**
 * The type of the alert contact
 * @displayOptions.show { resource: ["alertContact"], operation: ["create"] }
 */
		type: 4 | 2 | 6 | 9 | 1 | 3 | 5 | Expression<number>;
/**
 * The correspondent value for the alert contact type
 * @displayOptions.show { resource: ["alertContact"], operation: ["create"] }
 */
		value: string | Expression<string>;
};

/** Delete a monitor */
export type UptimeRobotV1AlertContactDeleteConfig = {
	resource: 'alertContact';
	operation: 'delete';
/**
 * The ID of the alert contact
 * @displayOptions.show { resource: ["alertContact"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
};

/** Get account details */
export type UptimeRobotV1AlertContactGetConfig = {
	resource: 'alertContact';
	operation: 'get';
/**
 * The ID of the alert contact
 * @displayOptions.show { resource: ["alertContact"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
};

/** Get many monitors */
export type UptimeRobotV1AlertContactGetAllConfig = {
	resource: 'alertContact';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["alertContact"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["alertContact"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["alertContact"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["create"] }
 * @default 1
 */
		duration: number | Expression<number>;
/**
 * The friendly name of the maintenance window
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["create"] }
 */
		friendlyName: string | Expression<string>;
/**
 * The type of the maintenance window
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["create"] }
 */
		type: 1 | 2 | 3 | 4 | Expression<number>;
	weekDay?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | Expression<number>;
	monthDay?: number | Expression<number>;
/**
 * The maintenance window start datetime
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["create"] }
 */
		start_time: string | Expression<string>;
};

/** Delete a monitor */
export type UptimeRobotV1MaintenanceWindowDeleteConfig = {
	resource: 'maintenanceWindow';
	operation: 'delete';
/**
 * The ID of the maintenance window
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
};

/** Get account details */
export type UptimeRobotV1MaintenanceWindowGetConfig = {
	resource: 'maintenanceWindow';
	operation: 'get';
/**
 * The ID of the maintenance window
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
};

/** Get many monitors */
export type UptimeRobotV1MaintenanceWindowGetAllConfig = {
	resource: 'maintenanceWindow';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["update"] }
 */
		id: string | Expression<string>;
/**
 * The maintenance window activation period (minutes)
 * @displayOptions.show { resource: ["maintenanceWindow"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["monitor"], operation: ["create"] }
 */
		friendlyName: string | Expression<string>;
/**
 * The type of the monitor
 * @displayOptions.show { resource: ["monitor"], operation: ["create"] }
 */
		type: 5 | 1 | 2 | 3 | 4 | Expression<number>;
/**
 * The URL/IP of the monitor
 * @displayOptions.show { resource: ["monitor"], operation: ["create"] }
 */
		url: string | Expression<string>;
};

/** Delete a monitor */
export type UptimeRobotV1MonitorDeleteConfig = {
	resource: 'monitor';
	operation: 'delete';
/**
 * The ID of the monitor
 * @displayOptions.show { resource: ["monitor"], operation: ["delete", "reset", "get"] }
 */
		id: string | Expression<string>;
};

/** Get account details */
export type UptimeRobotV1MonitorGetConfig = {
	resource: 'monitor';
	operation: 'get';
/**
 * The ID of the monitor
 * @displayOptions.show { resource: ["monitor"], operation: ["delete", "reset", "get"] }
 */
		id: string | Expression<string>;
};

/** Get many monitors */
export type UptimeRobotV1MonitorGetAllConfig = {
	resource: 'monitor';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["monitor"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["monitor"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["monitor"], operation: ["delete", "reset", "get"] }
 */
		id: string | Expression<string>;
};

/** Update a monitor */
export type UptimeRobotV1MonitorUpdateConfig = {
	resource: 'monitor';
	operation: 'update';
/**
 * The ID of the monitor
 * @displayOptions.show { resource: ["monitor"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["publicStatusPage"], operation: ["create"] }
 */
		friendlyName: string | Expression<string>;
/**
 * Monitor IDs to be displayed in status page (the values are separated with a dash (-) or 0 for all monitors)
 * @displayOptions.show { resource: ["publicStatusPage"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["publicStatusPage"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
};

/** Get account details */
export type UptimeRobotV1PublicStatusPageGetConfig = {
	resource: 'publicStatusPage';
	operation: 'get';
/**
 * The ID of the public status page
 * @displayOptions.show { resource: ["publicStatusPage"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
};

/** Get many monitors */
export type UptimeRobotV1PublicStatusPageGetAllConfig = {
	resource: 'publicStatusPage';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["publicStatusPage"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["publicStatusPage"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface UptimeRobotV1Credentials {
	uptimeRobotApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface UptimeRobotV1NodeBase {
	type: 'n8n-nodes-base.uptimeRobot';
	version: 1;
	credentials?: UptimeRobotV1Credentials;
}

export type UptimeRobotV1AccountGetNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1AccountGetConfig>;
};

export type UptimeRobotV1AlertContactCreateNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1AlertContactCreateConfig>;
};

export type UptimeRobotV1AlertContactDeleteNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1AlertContactDeleteConfig>;
};

export type UptimeRobotV1AlertContactGetNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1AlertContactGetConfig>;
};

export type UptimeRobotV1AlertContactGetAllNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1AlertContactGetAllConfig>;
};

export type UptimeRobotV1AlertContactUpdateNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1AlertContactUpdateConfig>;
};

export type UptimeRobotV1MaintenanceWindowCreateNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MaintenanceWindowCreateConfig>;
};

export type UptimeRobotV1MaintenanceWindowDeleteNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MaintenanceWindowDeleteConfig>;
};

export type UptimeRobotV1MaintenanceWindowGetNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MaintenanceWindowGetConfig>;
};

export type UptimeRobotV1MaintenanceWindowGetAllNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MaintenanceWindowGetAllConfig>;
};

export type UptimeRobotV1MaintenanceWindowUpdateNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MaintenanceWindowUpdateConfig>;
};

export type UptimeRobotV1MonitorCreateNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MonitorCreateConfig>;
};

export type UptimeRobotV1MonitorDeleteNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MonitorDeleteConfig>;
};

export type UptimeRobotV1MonitorGetNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MonitorGetConfig>;
};

export type UptimeRobotV1MonitorGetAllNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MonitorGetAllConfig>;
};

export type UptimeRobotV1MonitorResetNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MonitorResetConfig>;
};

export type UptimeRobotV1MonitorUpdateNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1MonitorUpdateConfig>;
};

export type UptimeRobotV1PublicStatusPageCreateNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1PublicStatusPageCreateConfig>;
};

export type UptimeRobotV1PublicStatusPageDeleteNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1PublicStatusPageDeleteConfig>;
};

export type UptimeRobotV1PublicStatusPageGetNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1PublicStatusPageGetConfig>;
};

export type UptimeRobotV1PublicStatusPageGetAllNode = UptimeRobotV1NodeBase & {
	config: NodeConfig<UptimeRobotV1PublicStatusPageGetAllConfig>;
};

export type UptimeRobotV1Node =
	| UptimeRobotV1AccountGetNode
	| UptimeRobotV1AlertContactCreateNode
	| UptimeRobotV1AlertContactDeleteNode
	| UptimeRobotV1AlertContactGetNode
	| UptimeRobotV1AlertContactGetAllNode
	| UptimeRobotV1AlertContactUpdateNode
	| UptimeRobotV1MaintenanceWindowCreateNode
	| UptimeRobotV1MaintenanceWindowDeleteNode
	| UptimeRobotV1MaintenanceWindowGetNode
	| UptimeRobotV1MaintenanceWindowGetAllNode
	| UptimeRobotV1MaintenanceWindowUpdateNode
	| UptimeRobotV1MonitorCreateNode
	| UptimeRobotV1MonitorDeleteNode
	| UptimeRobotV1MonitorGetNode
	| UptimeRobotV1MonitorGetAllNode
	| UptimeRobotV1MonitorResetNode
	| UptimeRobotV1MonitorUpdateNode
	| UptimeRobotV1PublicStatusPageCreateNode
	| UptimeRobotV1PublicStatusPageDeleteNode
	| UptimeRobotV1PublicStatusPageGetNode
	| UptimeRobotV1PublicStatusPageGetAllNode
	;