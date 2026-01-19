/**
 * TheHive Node - Version 1
 * Consume TheHive API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create task log */
export type TheHiveV1LogCreateConfig = {
	resource: 'log';
	operation: 'create';
/**
 * ID of the task
 * @displayOptions.show { resource: ["log"], operation: ["create", "getAll"] }
 */
		taskId: string | Expression<string>;
/**
 * Content of the Log
 * @displayOptions.show { resource: ["log"], operation: ["create"] }
 */
		message: string | Expression<string>;
/**
 * Date of the log submission default=now
 * @displayOptions.show { resource: ["log"], operation: ["create"] }
 */
		startDate: string | Expression<string>;
/**
 * Status of the log (Ok or Deleted) default=Ok
 * @displayOptions.show { resource: ["log"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["log"], operation: ["executeResponder"] }
 * @displayOptions.hide { id: [""] }
 */
		responder: string | Expression<string>;
};

/** Get many task logs */
export type TheHiveV1LogGetAllConfig = {
	resource: 'log';
	operation: 'getAll';
/**
 * ID of the task
 * @displayOptions.show { resource: ["log"], operation: ["create", "getAll"] }
 */
		taskId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["log"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["log"], returnAll: [false] }
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface TheHiveV1Credentials {
	theHiveApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TheHiveV1NodeBase {
	type: 'n8n-nodes-base.theHive';
	version: 1;
	credentials?: TheHiveV1Credentials;
}

export type TheHiveV1LogCreateNode = TheHiveV1NodeBase & {
	config: NodeConfig<TheHiveV1LogCreateConfig>;
};

export type TheHiveV1LogExecuteResponderNode = TheHiveV1NodeBase & {
	config: NodeConfig<TheHiveV1LogExecuteResponderConfig>;
};

export type TheHiveV1LogGetAllNode = TheHiveV1NodeBase & {
	config: NodeConfig<TheHiveV1LogGetAllConfig>;
};

export type TheHiveV1LogGetNode = TheHiveV1NodeBase & {
	config: NodeConfig<TheHiveV1LogGetConfig>;
};

export type TheHiveV1Node =
	| TheHiveV1LogCreateNode
	| TheHiveV1LogExecuteResponderNode
	| TheHiveV1LogGetAllNode
	| TheHiveV1LogGetNode
	;