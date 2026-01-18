/**
 * Action Network Node Types
 *
 * Consume the Action Network API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/actionnetwork/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type ActionNetworkV1AttendanceCreateConfig = {
	resource: 'attendance';
	operation: 'create';
	/**
	 * ID of the person to create an attendance for
	 * @displayOptions.show { resource: ["attendance"], operation: ["create"] }
	 */
	personId: string | Expression<string>;
	/**
	 * ID of the event to create an attendance for
	 * @displayOptions.show { resource: ["attendance"], operation: ["create"] }
	 */
	eventId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["attendance"], operation: ["create"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1AttendanceGetConfig = {
	resource: 'attendance';
	operation: 'get';
	/**
	 * ID of the event whose attendance to retrieve
	 * @displayOptions.show { resource: ["attendance"], operation: ["get"] }
	 */
	eventId: string | Expression<string>;
	/**
	 * ID of the attendance to retrieve
	 * @displayOptions.show { resource: ["attendance"], operation: ["get"] }
	 */
	attendanceId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["attendance"], operation: ["get"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1AttendanceGetAllConfig = {
	resource: 'attendance';
	operation: 'getAll';
	/**
	 * ID of the event to create an attendance for
	 * @displayOptions.show { resource: ["attendance"], operation: ["getAll"] }
	 */
	eventId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["attendance"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["attendance"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["attendance"], operation: ["getAll"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1EventCreateConfig = {
	resource: 'event';
	operation: 'create';
	/**
	 * Source where the event originated
	 * @displayOptions.show { resource: ["event"], operation: ["create"] }
	 */
	originSystem: string | Expression<string>;
	/**
	 * Title of the event to create
	 * @displayOptions.show { resource: ["event"], operation: ["create"] }
	 */
	title: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["event"], operation: ["create"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

export type ActionNetworkV1EventGetConfig = {
	resource: 'event';
	operation: 'get';
	/**
	 * ID of the event to retrieve
	 * @displayOptions.show { resource: ["event"], operation: ["get"] }
	 */
	eventId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["event"], operation: ["get"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["event"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["event"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["event"], operation: ["getAll"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PersonCreateConfig = {
	resource: 'person';
	operation: 'create';
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["person"], operation: ["create"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	/**
	 * Person’s email addresses
	 * @displayOptions.show { resource: ["person"], operation: ["create"] }
	 * @default {}
	 */
	email_addresses?: {
		email_addresses_fields?: {
			/** Person's email address
			 */
			address?: string | Expression<string>;
			/** Whether this is the person's primary email address
			 * @default true
			 */
			primary?: unknown;
			/** Subscription status of this email address
			 * @default subscribed
			 */
			status?:
				| 'bouncing'
				| 'previous bounce'
				| 'previous spam complaint'
				| 'spam complaint'
				| 'subscribed'
				| 'unsubscribed'
				| Expression<string>;
		};
	};
	additionalFields?: Record<string, unknown>;
};

export type ActionNetworkV1PersonGetConfig = {
	resource: 'person';
	operation: 'get';
	/**
	 * ID of the person to retrieve
	 * @displayOptions.show { resource: ["person"], operation: ["get"] }
	 */
	personId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["person"], operation: ["get"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PersonGetAllConfig = {
	resource: 'person';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["person"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["person"], operation: ["getAll"], returnAll: [false] }
	 * @default 25
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["person"], operation: ["getAll"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PersonUpdateConfig = {
	resource: 'person';
	operation: 'update';
	/**
	 * ID of the person to update
	 * @displayOptions.show { resource: ["person"], operation: ["update"] }
	 */
	personId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["person"], operation: ["update"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
};

export type ActionNetworkV1PersonTagAddConfig = {
	resource: 'personTag';
	operation: 'add';
	/**
	 * ID of the tag to add. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["personTag"], operation: ["add"] }
	 * @default []
	 */
	tagId: string | Expression<string>;
	/**
	 * ID of the person to add the tag to
	 * @displayOptions.show { resource: ["personTag"], operation: ["add"] }
	 */
	personId: string | Expression<string>;
};

export type ActionNetworkV1PersonTagRemoveConfig = {
	resource: 'personTag';
	operation: 'remove';
	/**
	 * ID of the tag whose tagging to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["personTag"], operation: ["remove"] }
	 * @default []
	 */
	tagId: string | Expression<string>;
	/**
	 * ID of the tagging to remove. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["personTag"], operation: ["remove"] }
	 * @default []
	 */
	taggingId: string | Expression<string>;
};

export type ActionNetworkV1PetitionCreateConfig = {
	resource: 'petition';
	operation: 'create';
	/**
	 * Source where the petition originated
	 * @displayOptions.show { resource: ["petition"], operation: ["create"] }
	 */
	originSystem: string | Expression<string>;
	/**
	 * Title of the petition to create
	 * @displayOptions.show { resource: ["petition"], operation: ["create"] }
	 */
	title: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["petition"], operation: ["create"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

export type ActionNetworkV1PetitionGetConfig = {
	resource: 'petition';
	operation: 'get';
	/**
	 * ID of the petition to retrieve
	 * @displayOptions.show { resource: ["petition"], operation: ["get"] }
	 */
	petitionId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["petition"], operation: ["get"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PetitionGetAllConfig = {
	resource: 'petition';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["petition"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["petition"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["petition"], operation: ["getAll"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PetitionUpdateConfig = {
	resource: 'petition';
	operation: 'update';
	/**
	 * ID of the petition to update
	 * @displayOptions.show { resource: ["petition"], operation: ["update"] }
	 */
	petitionId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["petition"], operation: ["update"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
};

export type ActionNetworkV1SignatureCreateConfig = {
	resource: 'signature';
	operation: 'create';
	/**
	 * ID of the petition to sign
	 * @displayOptions.show { resource: ["signature"], operation: ["create"] }
	 */
	petitionId: string | Expression<string>;
	/**
	 * ID of the person whose signature to create
	 * @displayOptions.show { resource: ["signature"], operation: ["create"] }
	 */
	personId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["signature"], operation: ["create"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

export type ActionNetworkV1SignatureGetConfig = {
	resource: 'signature';
	operation: 'get';
	/**
	 * ID of the petition whose signature to retrieve
	 * @displayOptions.show { resource: ["signature"], operation: ["get"] }
	 */
	petitionId: string | Expression<string>;
	/**
	 * ID of the signature to retrieve
	 * @displayOptions.show { resource: ["signature"], operation: ["get"] }
	 */
	signatureId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["signature"], operation: ["get"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1SignatureGetAllConfig = {
	resource: 'signature';
	operation: 'getAll';
	/**
	 * ID of the petition whose signatures to retrieve
	 * @displayOptions.show { resource: ["signature"], operation: ["getAll"] }
	 */
	petitionId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["signature"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["signature"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["signature"], operation: ["getAll"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1SignatureUpdateConfig = {
	resource: 'signature';
	operation: 'update';
	/**
	 * ID of the petition whose signature to update
	 * @displayOptions.show { resource: ["signature"], operation: ["update"] }
	 */
	petitionId: string | Expression<string>;
	/**
	 * ID of the signature to update
	 * @displayOptions.show { resource: ["signature"], operation: ["update"] }
	 */
	signatureId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["signature"], operation: ["update"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
};

export type ActionNetworkV1TagCreateConfig = {
	resource: 'tag';
	operation: 'create';
	/**
	 * Name of the tag to create
	 * @displayOptions.show { resource: ["tag"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["tag"], operation: ["create"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1TagGetConfig = {
	resource: 'tag';
	operation: 'get';
	/**
	 * ID of the tag to retrieve
	 * @displayOptions.show { resource: ["tag"], operation: ["get"] }
	 */
	tagId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["tag"], operation: ["get"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1TagGetAllConfig = {
	resource: 'tag';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["tag"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["tag"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { resource: ["tag"], operation: ["getAll"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1Params =
	| ActionNetworkV1AttendanceCreateConfig
	| ActionNetworkV1AttendanceGetConfig
	| ActionNetworkV1AttendanceGetAllConfig
	| ActionNetworkV1EventCreateConfig
	| ActionNetworkV1EventGetConfig
	| ActionNetworkV1EventGetAllConfig
	| ActionNetworkV1PersonCreateConfig
	| ActionNetworkV1PersonGetConfig
	| ActionNetworkV1PersonGetAllConfig
	| ActionNetworkV1PersonUpdateConfig
	| ActionNetworkV1PersonTagAddConfig
	| ActionNetworkV1PersonTagRemoveConfig
	| ActionNetworkV1PetitionCreateConfig
	| ActionNetworkV1PetitionGetConfig
	| ActionNetworkV1PetitionGetAllConfig
	| ActionNetworkV1PetitionUpdateConfig
	| ActionNetworkV1SignatureCreateConfig
	| ActionNetworkV1SignatureGetConfig
	| ActionNetworkV1SignatureGetAllConfig
	| ActionNetworkV1SignatureUpdateConfig
	| ActionNetworkV1TagCreateConfig
	| ActionNetworkV1TagGetConfig
	| ActionNetworkV1TagGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ActionNetworkV1Credentials {
	actionNetworkApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ActionNetworkV1Node = {
	type: 'n8n-nodes-base.actionNetwork';
	version: 1;
	config: NodeConfig<ActionNetworkV1Params>;
	credentials?: ActionNetworkV1Credentials;
};

export type ActionNetworkNode = ActionNetworkV1Node;
