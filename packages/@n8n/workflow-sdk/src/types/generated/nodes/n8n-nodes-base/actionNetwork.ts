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
	 */
	personId: string | Expression<string>;
	/**
	 * ID of the event to create an attendance for
	 */
	eventId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1AttendanceGetConfig = {
	resource: 'attendance';
	operation: 'get';
	/**
	 * ID of the event whose attendance to retrieve
	 */
	eventId: string | Expression<string>;
	/**
	 * ID of the attendance to retrieve
	 */
	attendanceId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1AttendanceGetAllConfig = {
	resource: 'attendance';
	operation: 'getAll';
	/**
	 * ID of the event to create an attendance for
	 */
	eventId: string | Expression<string>;
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1EventCreateConfig = {
	resource: 'event';
	operation: 'create';
	/**
	 * Source where the event originated
	 */
	originSystem: string | Expression<string>;
	/**
	 * Title of the event to create
	 */
	title: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 */
	eventId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1EventGetAllConfig = {
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PersonCreateConfig = {
	resource: 'person';
	operation: 'create';
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	/**
	 * Person’s email addresses
	 * @default {}
	 */
	email_addresses?: {
		email_addresses_fields?: {
			address?: string | Expression<string>;
			primary?: unknown;
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
	 */
	personId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PersonGetAllConfig = {
	resource: 'person';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 25
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PersonUpdateConfig = {
	resource: 'person';
	operation: 'update';
	/**
	 * ID of the person to update
	 */
	personId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default []
	 */
	tagId: string | Expression<string>;
	/**
	 * ID of the person to add the tag to
	 */
	personId: string | Expression<string>;
};

export type ActionNetworkV1PersonTagRemoveConfig = {
	resource: 'personTag';
	operation: 'remove';
	/**
	 * ID of the tag whose tagging to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	tagId: string | Expression<string>;
	/**
	 * ID of the tagging to remove. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	taggingId: string | Expression<string>;
};

export type ActionNetworkV1PetitionCreateConfig = {
	resource: 'petition';
	operation: 'create';
	/**
	 * Source where the petition originated
	 */
	originSystem: string | Expression<string>;
	/**
	 * Title of the petition to create
	 */
	title: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 */
	petitionId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PetitionGetAllConfig = {
	resource: 'petition';
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1PetitionUpdateConfig = {
	resource: 'petition';
	operation: 'update';
	/**
	 * ID of the petition to update
	 */
	petitionId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 */
	petitionId: string | Expression<string>;
	/**
	 * ID of the person whose signature to create
	 */
	personId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 */
	petitionId: string | Expression<string>;
	/**
	 * ID of the signature to retrieve
	 */
	signatureId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1SignatureGetAllConfig = {
	resource: 'signature';
	operation: 'getAll';
	/**
	 * ID of the petition whose signatures to retrieve
	 */
	petitionId: string | Expression<string>;
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1SignatureUpdateConfig = {
	resource: 'signature';
	operation: 'update';
	/**
	 * ID of the petition whose signature to update
	 */
	petitionId: string | Expression<string>;
	/**
	 * ID of the signature to update
	 */
	signatureId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 */
	name: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1TagGetConfig = {
	resource: 'tag';
	operation: 'get';
	/**
	 * ID of the tag to retrieve
	 */
	tagId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type ActionNetworkV1TagGetAllConfig = {
	resource: 'tag';
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
