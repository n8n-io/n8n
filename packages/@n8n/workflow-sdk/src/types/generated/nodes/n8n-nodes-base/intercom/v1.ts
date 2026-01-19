/**
 * Intercom Node - Version 1
 * Consume Intercom API
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


// ===========================================================================
// Output Types
// ===========================================================================

export type IntercomV1LeadCreateOutput = {
	android_app_name?: null;
	android_app_version?: null;
	android_device?: null;
	android_last_seen_at?: null;
	android_os_version?: null;
	android_sdk_version?: null;
	avatar?: null;
	browser?: null;
	browser_language?: null;
	browser_version?: null;
	companies?: {
		has_more?: boolean;
		total_count?: number;
		type?: string;
		url?: string;
	};
	created_at?: number;
	email?: string;
	external_id?: null;
	has_hard_bounced?: boolean;
	id?: string;
	ios_app_name?: null;
	ios_app_version?: null;
	ios_device?: null;
	ios_last_seen_at?: null;
	ios_os_version?: null;
	ios_sdk_version?: null;
	language_override?: null;
	last_contacted_at?: null;
	last_email_clicked_at?: null;
	last_email_opened_at?: null;
	last_replied_at?: null;
	last_seen_at?: null;
	location?: {
		city?: null;
		continent_code?: null;
		country?: null;
		country_code?: null;
		region?: null;
		type?: string;
	};
	marked_email_as_spam?: boolean;
	notes?: {
		has_more?: boolean;
		total_count?: number;
		type?: string;
		url?: string;
	};
	opted_in_subscription_types?: {
		has_more?: boolean;
		total_count?: number;
		type?: string;
		url?: string;
	};
	opted_out_subscription_types?: {
		has_more?: boolean;
		total_count?: number;
		type?: string;
		url?: string;
	};
	os?: null;
	owner_id?: null;
	referrer?: null;
	role?: string;
	signed_up_at?: null;
	sms_consent?: boolean;
	social_profiles?: {
		type?: string;
	};
	tags?: {
		has_more?: boolean;
		total_count?: number;
		type?: string;
		url?: string;
	};
	type?: string;
	unsubscribed_from_emails?: boolean;
	unsubscribed_from_sms?: boolean;
	updated_at?: number;
	utm_campaign?: null;
	utm_content?: null;
	utm_medium?: null;
	utm_source?: null;
	utm_term?: null;
	workspace_id?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface IntercomV1Credentials {
	intercomApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface IntercomV1NodeBase {
	type: 'n8n-nodes-base.intercom';
	version: 1;
	credentials?: IntercomV1Credentials;
}

export type IntercomV1CompanyCreateNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1CompanyCreateConfig>;
};

export type IntercomV1CompanyGetNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1CompanyGetConfig>;
};

export type IntercomV1CompanyGetAllNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1CompanyGetAllConfig>;
};

export type IntercomV1CompanyUpdateNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1CompanyUpdateConfig>;
};

export type IntercomV1CompanyUsersNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1CompanyUsersConfig>;
};

export type IntercomV1LeadCreateNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1LeadCreateConfig>;
	output?: IntercomV1LeadCreateOutput;
};

export type IntercomV1LeadDeleteNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1LeadDeleteConfig>;
};

export type IntercomV1LeadGetNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1LeadGetConfig>;
};

export type IntercomV1LeadGetAllNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1LeadGetAllConfig>;
};

export type IntercomV1LeadUpdateNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1LeadUpdateConfig>;
};

export type IntercomV1UserCreateNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1UserCreateConfig>;
};

export type IntercomV1UserDeleteNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1UserDeleteConfig>;
};

export type IntercomV1UserGetNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1UserGetConfig>;
};

export type IntercomV1UserGetAllNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1UserGetAllConfig>;
};

export type IntercomV1UserUpdateNode = IntercomV1NodeBase & {
	config: NodeConfig<IntercomV1UserUpdateConfig>;
};

export type IntercomV1Node =
	| IntercomV1CompanyCreateNode
	| IntercomV1CompanyGetNode
	| IntercomV1CompanyGetAllNode
	| IntercomV1CompanyUpdateNode
	| IntercomV1CompanyUsersNode
	| IntercomV1LeadCreateNode
	| IntercomV1LeadDeleteNode
	| IntercomV1LeadGetNode
	| IntercomV1LeadGetAllNode
	| IntercomV1LeadUpdateNode
	| IntercomV1UserCreateNode
	| IntercomV1UserDeleteNode
	| IntercomV1UserGetNode
	| IntercomV1UserGetAllNode
	| IntercomV1UserUpdateNode
	;