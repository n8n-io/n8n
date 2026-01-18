/**
 * TheHive Node Types
 *
 * Consume TheHive API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/thehive/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create task log */
export type TheHiveV1LogCreateConfig = {
	resource: 'log';
	operation: 'create';
	/**
	 * ID of the task
	 */
	taskId: string | Expression<string>;
	/**
	 * Content of the Log
	 */
	message: string | Expression<string>;
	/**
	 * Date of the log submission default=now
	 */
	startDate: string | Expression<string>;
	/**
	 * Status of the log (Ok or Deleted) default=Ok
	 */
	status: 'Ok' | 'Deleted' | Expression<string>;
	options?: Record<string, unknown>;
};

/** Execute a responder on a selected log */
export type TheHiveV1LogExecuteResponderConfig = {
	resource: 'log';
	operation: 'executeResponder';
	id: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	responder: string | Expression<string>;
};

/** Get many task logs */
export type TheHiveV1LogGetAllConfig = {
	resource: 'log';
	operation: 'getAll';
	/**
	 * ID of the task
	 */
	taskId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Get a single log */
export type TheHiveV1LogGetConfig = {
	resource: 'log';
	operation: 'get';
	id: string | Expression<string>;
};

export type TheHiveV1Params =
	| TheHiveV1LogCreateConfig
	| TheHiveV1LogExecuteResponderConfig
	| TheHiveV1LogGetAllConfig
	| TheHiveV1LogGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TheHiveV1Credentials {
	theHiveApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TheHiveNode = {
	type: 'n8n-nodes-base.theHive';
	version: 1;
	config: NodeConfig<TheHiveV1Params>;
	credentials?: TheHiveV1Credentials;
};
