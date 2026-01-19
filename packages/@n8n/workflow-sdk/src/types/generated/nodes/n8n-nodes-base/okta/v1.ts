/**
 * Okta Node - Version 1
 * Use the Okta API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new user */
export type OktaV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	firstName: string | Expression<string>;
	lastName: string | Expression<string>;
	login: string | Expression<string>;
	email: string | Expression<string>;
/**
 * Whether to activate the user and allow access to all assigned applications
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 * @default true
 */
		activate?: boolean | Expression<boolean>;
	getCreateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete an existing user */
export type OktaV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * The user you want to operate on. Choose from the list, or specify an ID.
 * @displayOptions.show { resource: ["user"], operation: ["get", "update", "delete"] }
 * @default {"mode":"list","value":""}
 */
		userId: ResourceLocatorValue;
/**
 * Whether to send a deactivation email to the administrator
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 * @default false
 */
		sendEmail?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Get details of a user */
export type OktaV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * The user you want to operate on. Choose from the list, or specify an ID.
 * @displayOptions.show { resource: ["user"], operation: ["get", "update", "delete"] }
 * @default {"mode":"list","value":""}
 */
		userId: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["user"], operation: ["get", "getAll"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Get many users */
export type OktaV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	searchQuery?: string | Expression<string>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["user"], operation: ["get", "getAll"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Update an existing user */
export type OktaV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * The user you want to operate on. Choose from the list, or specify an ID.
 * @displayOptions.show { resource: ["user"], operation: ["get", "update", "delete"] }
 * @default {"mode":"list","value":""}
 */
		userId: ResourceLocatorValue;
	getUpdateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type OktaV1UserGetOutput = {
	_links?: {
		changePassword?: {
			href?: string;
			method?: string;
		};
		changeRecoveryQuestion?: {
			href?: string;
			method?: string;
		};
		deactivate?: {
			href?: string;
			method?: string;
		};
		expirePassword?: {
			href?: string;
			method?: string;
		};
		forgotPassword?: {
			href?: string;
			method?: string;
		};
		reactivate?: {
			href?: string;
			method?: string;
		};
		resetFactors?: {
			href?: string;
			method?: string;
		};
		resetPassword?: {
			href?: string;
			method?: string;
		};
		schema?: {
			href?: string;
		};
		self?: {
			href?: string;
		};
		suspend?: {
			href?: string;
			method?: string;
		};
		type?: {
			href?: string;
		};
	};
	created?: string;
	credentials?: {
		provider?: {
			name?: string;
			type?: string;
		};
	};
	id?: string;
	lastUpdated?: string;
	profile?: {
		email?: string;
		firstName?: string;
		lastName?: string;
		login?: string;
	};
	status?: string;
	type?: {
		id?: string;
	};
};

export type OktaV1UserGetAllOutput = {
	_links?: {
		self?: {
			href?: string;
		};
	};
	created?: string;
	credentials?: {
		provider?: {
			name?: string;
			type?: string;
		};
	};
	id?: string;
	lastUpdated?: string;
	profile?: {
		city?: string;
		countryCode?: string;
		department?: string;
		displayName?: string;
		email?: string;
		firstName?: string;
		lastName?: string;
		login?: string;
		manager?: string;
		managerEmail?: string;
		organization?: string;
		site?: string;
		startDate?: string;
		timezone?: string;
		title?: string;
		userType?: string;
	};
	realmId?: string;
	status?: string;
	type?: {
		id?: string;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface OktaV1Credentials {
	oktaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface OktaV1NodeBase {
	type: 'n8n-nodes-base.okta';
	version: 1;
	credentials?: OktaV1Credentials;
}

export type OktaV1UserCreateNode = OktaV1NodeBase & {
	config: NodeConfig<OktaV1UserCreateConfig>;
};

export type OktaV1UserDeleteNode = OktaV1NodeBase & {
	config: NodeConfig<OktaV1UserDeleteConfig>;
};

export type OktaV1UserGetNode = OktaV1NodeBase & {
	config: NodeConfig<OktaV1UserGetConfig>;
	output?: OktaV1UserGetOutput;
};

export type OktaV1UserGetAllNode = OktaV1NodeBase & {
	config: NodeConfig<OktaV1UserGetAllConfig>;
	output?: OktaV1UserGetAllOutput;
};

export type OktaV1UserUpdateNode = OktaV1NodeBase & {
	config: NodeConfig<OktaV1UserUpdateConfig>;
};

export type OktaV1Node =
	| OktaV1UserCreateNode
	| OktaV1UserDeleteNode
	| OktaV1UserGetNode
	| OktaV1UserGetAllNode
	| OktaV1UserUpdateNode
	;