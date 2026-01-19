/**
 * Microsoft Dynamics CRM Node - Version 1
 * Consume Microsoft Dynamics CRM API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MicrosoftDynamicsCrmV1AccountCreateConfig = {
	resource: 'account';
	operation: 'create';
/**
 * Company or business name
 * @displayOptions.show { resource: ["account"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type MicrosoftDynamicsCrmV1AccountDeleteConfig = {
	resource: 'account';
	operation: 'delete';
	accountId: string | Expression<string>;
};

export type MicrosoftDynamicsCrmV1AccountGetConfig = {
	resource: 'account';
	operation: 'get';
	accountId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type MicrosoftDynamicsCrmV1AccountGetAllConfig = {
	resource: 'account';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["account"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["account"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
	filters?: Record<string, unknown>;
};

export type MicrosoftDynamicsCrmV1AccountUpdateConfig = {
	resource: 'account';
	operation: 'update';
	accountId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type MicrosoftDynamicsCrmV1Params =
	| MicrosoftDynamicsCrmV1AccountCreateConfig
	| MicrosoftDynamicsCrmV1AccountDeleteConfig
	| MicrosoftDynamicsCrmV1AccountGetConfig
	| MicrosoftDynamicsCrmV1AccountGetAllConfig
	| MicrosoftDynamicsCrmV1AccountUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftDynamicsCrmV1Credentials {
	microsoftDynamicsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftDynamicsCrmV1NodeBase {
	type: 'n8n-nodes-base.microsoftDynamicsCrm';
	version: 1;
	credentials?: MicrosoftDynamicsCrmV1Credentials;
}

export type MicrosoftDynamicsCrmV1AccountCreateNode = MicrosoftDynamicsCrmV1NodeBase & {
	config: NodeConfig<MicrosoftDynamicsCrmV1AccountCreateConfig>;
};

export type MicrosoftDynamicsCrmV1AccountDeleteNode = MicrosoftDynamicsCrmV1NodeBase & {
	config: NodeConfig<MicrosoftDynamicsCrmV1AccountDeleteConfig>;
};

export type MicrosoftDynamicsCrmV1AccountGetNode = MicrosoftDynamicsCrmV1NodeBase & {
	config: NodeConfig<MicrosoftDynamicsCrmV1AccountGetConfig>;
};

export type MicrosoftDynamicsCrmV1AccountGetAllNode = MicrosoftDynamicsCrmV1NodeBase & {
	config: NodeConfig<MicrosoftDynamicsCrmV1AccountGetAllConfig>;
};

export type MicrosoftDynamicsCrmV1AccountUpdateNode = MicrosoftDynamicsCrmV1NodeBase & {
	config: NodeConfig<MicrosoftDynamicsCrmV1AccountUpdateConfig>;
};

export type MicrosoftDynamicsCrmV1Node =
	| MicrosoftDynamicsCrmV1AccountCreateNode
	| MicrosoftDynamicsCrmV1AccountDeleteNode
	| MicrosoftDynamicsCrmV1AccountGetNode
	| MicrosoftDynamicsCrmV1AccountGetAllNode
	| MicrosoftDynamicsCrmV1AccountUpdateNode
	;