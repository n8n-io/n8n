/**
 * Intercom Node Types
 *
 * Consume Intercom API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/intercom/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Companies allow you to represent commercial organizations using your product */
export type IntercomV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	/**
	 * The company ID you have defined for the company
	 */
	companyId?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 */
	customAttributesJson?: IDataObject | string | Expression<string>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 * @default {}
	 */
	customAttributesUi?: {
		customAttributesValues?: Array<{
			name?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
};

/** Companies allow you to represent commercial organizations using your product */
export type IntercomV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	/**
	 * What property to use to query the company
	 */
	selectBy?: 'companyId' | 'id' | 'name' | Expression<string>;
	/**
	 * View by value
	 */
	value: string | Expression<string>;
};

/** Companies allow you to represent commercial organizations using your product */
export type IntercomV1CompanyGetAllConfig = {
	resource: 'company';
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

/** Companies allow you to represent commercial organizations using your product */
export type IntercomV1CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	/**
	 * The company ID you have defined for the company
	 */
	companyId?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 */
	customAttributesJson?: IDataObject | string | Expression<string>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 * @default {}
	 */
	customAttributesUi?: {
		customAttributesValues?: Array<{
			name?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
};

/** Companies allow you to represent commercial organizations using your product */
export type IntercomV1CompanyUsersConfig = {
	resource: 'company';
	operation: 'users';
	listBy?: 'id' | 'companyId' | Expression<string>;
	/**
	 * View by value
	 */
	value: string | Expression<string>;
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

/** Leads are useful for representing logged-out users of your application */
export type IntercomV1LeadCreateConfig = {
	resource: 'lead';
	operation: 'create';
	/**
	 * The email of the user
	 */
	email: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 */
	customAttributesJson?: IDataObject | string | Expression<string>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 * @default {}
	 */
	customAttributesUi?: {
		customAttributesValues?: Array<{
			name?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
};

/** Leads are useful for representing logged-out users of your application */
export type IntercomV1LeadDeleteConfig = {
	resource: 'lead';
	operation: 'delete';
	deleteBy?: 'id' | 'userId' | Expression<string>;
	/**
	 * Delete by value
	 */
	value: string | Expression<string>;
};

/** Leads are useful for representing logged-out users of your application */
export type IntercomV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
	/**
	 * The property to select the lead by
	 */
	selectBy?: 'email' | 'id' | 'userId' | 'phone' | Expression<string>;
	/**
	 * View by value
	 */
	value: string | Expression<string>;
};

/** Leads are useful for representing logged-out users of your application */
export type IntercomV1LeadGetAllConfig = {
	resource: 'lead';
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

/** Leads are useful for representing logged-out users of your application */
export type IntercomV1LeadUpdateConfig = {
	resource: 'lead';
	operation: 'update';
	/**
	 * The property via which to query the lead
	 * @default id
	 */
	updateBy?: 'userId' | 'id' | Expression<string>;
	/**
	 * Value of the property to identify the lead to update
	 */
	value: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 */
	customAttributesJson?: IDataObject | string | Expression<string>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 * @default {}
	 */
	customAttributesUi?: {
		customAttributesValues?: Array<{
			name?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
};

/** The Users resource is the primary way of interacting with Intercom */
export type IntercomV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	/**
	 * Unique string identifier
	 */
	identifierType?: 'userId' | 'email' | Expression<string>;
	/**
	 * Unique string identifier value
	 */
	idValue: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 */
	customAttributesJson?: IDataObject | string | Expression<string>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 * @default {}
	 */
	customAttributesUi?: {
		customAttributesValues?: Array<{
			name?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
};

/** The Users resource is the primary way of interacting with Intercom */
export type IntercomV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	/**
	 * The Intercom defined ID representing the Lead
	 */
	id: string | Expression<string>;
};

/** The Users resource is the primary way of interacting with Intercom */
export type IntercomV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * The property to select the user by
	 */
	selectBy?: 'id' | 'userId' | Expression<string>;
	/**
	 * View by value
	 */
	value: string | Expression<string>;
};

/** The Users resource is the primary way of interacting with Intercom */
export type IntercomV1UserGetAllConfig = {
	resource: 'user';
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

/** The Users resource is the primary way of interacting with Intercom */
export type IntercomV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	/**
	 * The property via which to query the user
	 * @default id
	 */
	updateBy?: 'id' | 'email' | 'userId' | Expression<string>;
	/**
	 * Value of the property to identify the user to update
	 */
	value: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 */
	customAttributesJson?: IDataObject | string | Expression<string>;
	/**
	 * A hash of key/value pairs to represent custom data you want to attribute to a user
	 * @default {}
	 */
	customAttributesUi?: {
		customAttributesValues?: Array<{
			name?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
};

export type IntercomV1Params =
	| IntercomV1CompanyCreateConfig
	| IntercomV1CompanyGetConfig
	| IntercomV1CompanyGetAllConfig
	| IntercomV1CompanyUpdateConfig
	| IntercomV1CompanyUsersConfig
	| IntercomV1LeadCreateConfig
	| IntercomV1LeadDeleteConfig
	| IntercomV1LeadGetConfig
	| IntercomV1LeadGetAllConfig
	| IntercomV1LeadUpdateConfig
	| IntercomV1UserCreateConfig
	| IntercomV1UserDeleteConfig
	| IntercomV1UserGetConfig
	| IntercomV1UserGetAllConfig
	| IntercomV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface IntercomV1Credentials {
	intercomApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type IntercomV1Node = {
	type: 'n8n-nodes-base.intercom';
	version: 1;
	config: NodeConfig<IntercomV1Params>;
	credentials?: IntercomV1Credentials;
};

export type IntercomNode = IntercomV1Node;
