/**
 * Intercom Node - Version 1
 * Consume Intercom API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Companies allow you to represent commercial organizations using your product */
export type IntercomV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
/**
 * The company ID you have defined for the company
 * @displayOptions.show { resource: ["company"], operation: ["create", "update"] }
 */
		companyId?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["company"], operation: ["create", "update"], jsonParameters: [true] }
 */
		customAttributesJson?: IDataObject | string | Expression<string>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["company"], operation: ["create", "update"], jsonParameters: [false] }
 * @default {}
 */
		customAttributesUi?: {
		customAttributesValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
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
 * @displayOptions.show { resource: ["company"], operation: ["get"] }
 */
		selectBy?: 'companyId' | 'id' | 'name' | Expression<string>;
/**
 * View by value
 * @displayOptions.show { resource: ["company"], operation: ["get"] }
 */
		value: string | Expression<string>;
};

/** Companies allow you to represent commercial organizations using your product */
export type IntercomV1CompanyGetAllConfig = {
	resource: 'company';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["company"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["company"], operation: ["create", "update"] }
 */
		companyId?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["company"], operation: ["create", "update"], jsonParameters: [true] }
 */
		customAttributesJson?: IDataObject | string | Expression<string>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["company"], operation: ["create", "update"], jsonParameters: [false] }
 * @default {}
 */
		customAttributesUi?: {
		customAttributesValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
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
 * @displayOptions.show { resource: ["company"], operation: ["users"] }
 */
		value: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["company"], operation: ["users"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["users"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["lead"], operation: ["create"] }
 */
		email: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["lead"], operation: ["create", "update"], jsonParameters: [true] }
 */
		customAttributesJson?: IDataObject | string | Expression<string>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["lead"], operation: ["create", "update"], jsonParameters: [false] }
 * @default {}
 */
		customAttributesUi?: {
		customAttributesValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
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
 * @displayOptions.show { resource: ["lead"], operation: ["delete"] }
 */
		value: string | Expression<string>;
};

/** Leads are useful for representing logged-out users of your application */
export type IntercomV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
/**
 * The property to select the lead by
 * @displayOptions.show { resource: ["lead"], operation: ["get"] }
 */
		selectBy?: 'email' | 'id' | 'userId' | 'phone' | Expression<string>;
/**
 * View by value
 * @displayOptions.show { resource: ["lead"], operation: ["get"] }
 */
		value: string | Expression<string>;
};

/** Leads are useful for representing logged-out users of your application */
export type IntercomV1LeadGetAllConfig = {
	resource: 'lead';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["lead"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["lead"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["lead"], operation: ["update"] }
 * @default id
 */
		updateBy?: 'userId' | 'id' | Expression<string>;
/**
 * Value of the property to identify the lead to update
 * @displayOptions.show { resource: ["lead"], operation: ["update"] }
 */
		value: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["lead"], operation: ["create", "update"], jsonParameters: [true] }
 */
		customAttributesJson?: IDataObject | string | Expression<string>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["lead"], operation: ["create", "update"], jsonParameters: [false] }
 * @default {}
 */
		customAttributesUi?: {
		customAttributesValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
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
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		identifierType?: 'userId' | 'email' | Expression<string>;
/**
 * Unique string identifier value
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		idValue: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["user"], operation: ["create", "update"], jsonParameters: [true] }
 */
		customAttributesJson?: IDataObject | string | Expression<string>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["user"], operation: ["create", "update"], jsonParameters: [false] }
 * @default {}
 */
		customAttributesUi?: {
		customAttributesValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
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
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** The Users resource is the primary way of interacting with Intercom */
export type IntercomV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * The property to select the user by
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		selectBy?: 'id' | 'userId' | Expression<string>;
/**
 * View by value
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		value: string | Expression<string>;
};

/** The Users resource is the primary way of interacting with Intercom */
export type IntercomV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 * @default id
 */
		updateBy?: 'id' | 'email' | 'userId' | Expression<string>;
/**
 * Value of the property to identify the user to update
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 */
		value: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["user"], operation: ["create", "update"], jsonParameters: [true] }
 */
		customAttributesJson?: IDataObject | string | Expression<string>;
/**
 * A hash of key/value pairs to represent custom data you want to attribute to a user
 * @displayOptions.show { resource: ["user"], operation: ["create", "update"], jsonParameters: [false] }
 * @default {}
 */
		customAttributesUi?: {
		customAttributesValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
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
	| IntercomV1UserUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface IntercomV1Credentials {
	intercomApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type IntercomV1Node = {
	type: 'n8n-nodes-base.intercom';
	version: 1;
	config: NodeConfig<IntercomV1Params>;
	credentials?: IntercomV1Credentials;
};