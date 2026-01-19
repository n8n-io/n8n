/**
 * Home Assistant Node - Version 1
 * Consume Home Assistant API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get the camera screenshot */
export type HomeAssistantV1CameraProxyGetScreenshotConfig = {
	resource: 'cameraProxy';
	operation: 'getScreenshot';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getScreenshot"], resource: ["cameraProxy"] }
 */
		cameraEntityId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Get the configuration */
export type HomeAssistantV1ConfigGetConfig = {
	resource: 'config';
	operation: 'get';
};

/** Check the configuration */
export type HomeAssistantV1ConfigCheckConfig = {
	resource: 'config';
	operation: 'check';
};

/** Create an event */
export type HomeAssistantV1EventCreateConfig = {
	resource: 'event';
	operation: 'create';
/**
 * The Entity ID for which an event will be created
 * @displayOptions.show { operation: ["create"], resource: ["event"] }
 */
		eventType: string | Expression<string>;
	eventAttributes?: {
		attributes?: Array<{
			/** Name of the attribute
			 */
			name?: string | Expression<string>;
			/** Value of the attribute
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Get many events */
export type HomeAssistantV1EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["event"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["event"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Get a log for a specific entity */
export type HomeAssistantV1LogGetErroLogsConfig = {
	resource: 'log';
	operation: 'getErroLogs';
};

/** Get all logs */
export type HomeAssistantV1LogGetLogbookEntriesConfig = {
	resource: 'log';
	operation: 'getLogbookEntries';
	additionalFields?: Record<string, unknown>;
};

/** Call a service within a specific domain */
export type HomeAssistantV1ServiceCallConfig = {
	resource: 'service';
	operation: 'call';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["service"], operation: ["call"] }
 */
		domain: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["service"], operation: ["call"] }
 */
		service: string | Expression<string>;
	serviceAttributes?: {
		attributes?: Array<{
			/** Name of the field
			 */
			name?: string | Expression<string>;
			/** Value of the field
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Get many events */
export type HomeAssistantV1ServiceGetAllConfig = {
	resource: 'service';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["service"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["service"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type HomeAssistantV1StateUpsertConfig = {
	resource: 'state';
	operation: 'upsert';
/**
 * The entity ID for which a state will be created. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["upsert"], resource: ["state"] }
 */
		entityId: string | Expression<string>;
	state: string | Expression<string>;
	stateAttributes?: {
		attributes?: Array<{
			/** Name of the attribute
			 */
			name?: string | Expression<string>;
			/** Value of the attribute
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Get the configuration */
export type HomeAssistantV1StateGetConfig = {
	resource: 'state';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["get"], resource: ["state"] }
 */
		entityId: string | Expression<string>;
};

/** Get many events */
export type HomeAssistantV1StateGetAllConfig = {
	resource: 'state';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["state"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["state"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create an event */
export type HomeAssistantV1TemplateCreateConfig = {
	resource: 'template';
	operation: 'create';
/**
 * Render a Home Assistant template. &lt;a href="https://www.home-assistant.io/docs/configuration/templating/"&gt;See template docs for more information.&lt;/a&gt;.
 * @displayOptions.show { resource: ["template"], operation: ["create"] }
 */
		template: string | Expression<string>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type HomeAssistantV1ServiceCallOutput = {
	attributes?: {
		friendly_name?: string;
	};
	context?: {
		id?: string;
		parent_id?: null;
		user_id?: string;
	};
	entity_id?: string;
	last_changed?: string;
	last_reported?: string;
	last_updated?: string;
	state?: string;
};

export type HomeAssistantV1StateUpsertOutput = {
	context?: {
		id?: string;
		parent_id?: null;
		user_id?: string;
	};
	entity_id?: string;
	last_changed?: string;
	last_reported?: string;
	last_updated?: string;
	state?: string;
};

export type HomeAssistantV1StateGetOutput = {
	attributes?: {
		device_class?: string;
		friendly_name?: string;
	};
	context?: {
		id?: string;
	};
	entity_id?: string;
	last_changed?: string;
	last_reported?: string;
	last_updated?: string;
	state?: string;
};

export type HomeAssistantV1StateGetAllOutput = {
	attributes?: {
		auto_update?: boolean;
		device_trackers?: Array<string>;
		editable?: boolean;
		entity_picture?: string;
		friendly_name?: string;
		id?: string;
		in_progress?: boolean;
		installed_version?: string;
		latest_version?: string;
		latitude?: number;
		longitude?: number;
		release_summary?: null;
		release_url?: string;
		skipped_version?: null;
		source?: string;
		supported_features?: number;
		title?: string;
		user_id?: string;
	};
	context?: {
		id?: string;
		parent_id?: null;
		user_id?: null;
	};
	entity_id?: string;
	last_changed?: string;
	last_reported?: string;
	last_updated?: string;
	state?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface HomeAssistantV1Credentials {
	homeAssistantApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HomeAssistantV1NodeBase {
	type: 'n8n-nodes-base.homeAssistant';
	version: 1;
	credentials?: HomeAssistantV1Credentials;
}

export type HomeAssistantV1CameraProxyGetScreenshotNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1CameraProxyGetScreenshotConfig>;
};

export type HomeAssistantV1ConfigGetNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1ConfigGetConfig>;
};

export type HomeAssistantV1ConfigCheckNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1ConfigCheckConfig>;
};

export type HomeAssistantV1EventCreateNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1EventCreateConfig>;
};

export type HomeAssistantV1EventGetAllNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1EventGetAllConfig>;
};

export type HomeAssistantV1LogGetErroLogsNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1LogGetErroLogsConfig>;
};

export type HomeAssistantV1LogGetLogbookEntriesNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1LogGetLogbookEntriesConfig>;
};

export type HomeAssistantV1ServiceCallNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1ServiceCallConfig>;
	output?: HomeAssistantV1ServiceCallOutput;
};

export type HomeAssistantV1ServiceGetAllNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1ServiceGetAllConfig>;
};

export type HomeAssistantV1StateUpsertNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1StateUpsertConfig>;
	output?: HomeAssistantV1StateUpsertOutput;
};

export type HomeAssistantV1StateGetNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1StateGetConfig>;
	output?: HomeAssistantV1StateGetOutput;
};

export type HomeAssistantV1StateGetAllNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1StateGetAllConfig>;
	output?: HomeAssistantV1StateGetAllOutput;
};

export type HomeAssistantV1TemplateCreateNode = HomeAssistantV1NodeBase & {
	config: NodeConfig<HomeAssistantV1TemplateCreateConfig>;
};

export type HomeAssistantV1Node =
	| HomeAssistantV1CameraProxyGetScreenshotNode
	| HomeAssistantV1ConfigGetNode
	| HomeAssistantV1ConfigCheckNode
	| HomeAssistantV1EventCreateNode
	| HomeAssistantV1EventGetAllNode
	| HomeAssistantV1LogGetErroLogsNode
	| HomeAssistantV1LogGetLogbookEntriesNode
	| HomeAssistantV1ServiceCallNode
	| HomeAssistantV1ServiceGetAllNode
	| HomeAssistantV1StateUpsertNode
	| HomeAssistantV1StateGetNode
	| HomeAssistantV1StateGetAllNode
	| HomeAssistantV1TemplateCreateNode
	;