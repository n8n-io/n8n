/**
 * Home Assistant Node Types
 *
 * Consume Home Assistant API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/homeassistant/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get the camera screenshot */
export type HomeAssistantV1CameraProxyGetScreenshotConfig = {
	resource: 'cameraProxy';
	operation: 'getScreenshot';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	eventType: string | Expression<string>;
	eventAttributes?: Record<string, unknown>;
};

/** Get many events */
export type HomeAssistantV1EventGetAllConfig = {
	resource: 'event';
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
	 */
	domain: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	service: string | Expression<string>;
	serviceAttributes?: Record<string, unknown>;
};

/** Get many events */
export type HomeAssistantV1ServiceGetAllConfig = {
	resource: 'service';
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

/** Create a new record, or update the current one if it already exists (upsert) */
export type HomeAssistantV1StateUpsertConfig = {
	resource: 'state';
	operation: 'upsert';
	/**
	 * The entity ID for which a state will be created. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	entityId: string | Expression<string>;
	state: string | Expression<string>;
	stateAttributes?: Record<string, unknown>;
};

/** Get the configuration */
export type HomeAssistantV1StateGetConfig = {
	resource: 'state';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	entityId: string | Expression<string>;
};

/** Get many events */
export type HomeAssistantV1StateGetAllConfig = {
	resource: 'state';
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

/** Create an event */
export type HomeAssistantV1TemplateCreateConfig = {
	resource: 'template';
	operation: 'create';
	/**
	 * Render a Home Assistant template. &lt;a href="https://www.home-assistant.io/docs/configuration/templating/"&gt;See template docs for more information.&lt;/a&gt;.
	 */
	template: string | Expression<string>;
};

export type HomeAssistantV1Params =
	| HomeAssistantV1CameraProxyGetScreenshotConfig
	| HomeAssistantV1ConfigGetConfig
	| HomeAssistantV1ConfigCheckConfig
	| HomeAssistantV1EventCreateConfig
	| HomeAssistantV1EventGetAllConfig
	| HomeAssistantV1LogGetErroLogsConfig
	| HomeAssistantV1LogGetLogbookEntriesConfig
	| HomeAssistantV1ServiceCallConfig
	| HomeAssistantV1ServiceGetAllConfig
	| HomeAssistantV1StateUpsertConfig
	| HomeAssistantV1StateGetConfig
	| HomeAssistantV1StateGetAllConfig
	| HomeAssistantV1TemplateCreateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HomeAssistantV1Credentials {
	homeAssistantApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type HomeAssistantNode = {
	type: 'n8n-nodes-base.homeAssistant';
	version: 1;
	config: NodeConfig<HomeAssistantV1Params>;
	credentials?: HomeAssistantV1Credentials;
};
