/**
 * Cockpit Node Types
 *
 * Consume Cockpit API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/cockpit/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a collection entry */
export type CockpitV1CollectionCreateConfig = {
	resource: 'collection';
	operation: 'create';
	/**
	 * Name of the collection to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collection: string | Expression<string>;
	/**
	 * Whether new entry fields should be set via the value-key pair UI or JSON
	 * @default false
	 */
	jsonDataFields?: boolean | Expression<boolean>;
	/**
	 * Entry data to send as JSON
	 */
	dataFieldsJson?: IDataObject | string | Expression<string>;
	/**
	 * Entry data to send
	 * @default {}
	 */
	dataFieldsUi?: Record<string, unknown>;
};

/** Get many collection entries */
export type CockpitV1CollectionGetAllConfig = {
	resource: 'collection';
	operation: 'getAll';
	/**
	 * Name of the collection to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collection: string | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Update a collection entry */
export type CockpitV1CollectionUpdateConfig = {
	resource: 'collection';
	operation: 'update';
	/**
	 * Name of the collection to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collection: string | Expression<string>;
	id: string | Expression<string>;
	/**
	 * Whether new entry fields should be set via the value-key pair UI or JSON
	 * @default false
	 */
	jsonDataFields?: boolean | Expression<boolean>;
	/**
	 * Entry data to send as JSON
	 */
	dataFieldsJson?: IDataObject | string | Expression<string>;
	/**
	 * Entry data to send
	 * @default {}
	 */
	dataFieldsUi?: Record<string, unknown>;
};

/** Store data from a form submission */
export type CockpitV1FormSubmitConfig = {
	resource: 'form';
	operation: 'submit';
	/**
	 * Name of the form to operate on
	 */
	form: string | Expression<string>;
	/**
	 * Whether form fields should be set via the value-key pair UI or JSON
	 * @default false
	 */
	jsonDataFields?: boolean | Expression<boolean>;
	/**
	 * Form data to send as JSON
	 */
	dataFieldsJson?: IDataObject | string | Expression<string>;
	/**
	 * Form data to send
	 * @default {}
	 */
	dataFieldsUi?: Record<string, unknown>;
};

/** Get a singleton */
export type CockpitV1SingletonGetConfig = {
	resource: 'singleton';
	operation: 'get';
	/**
	 * Name of the singleton to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	singleton: string | Expression<string>;
};

export type CockpitV1Params =
	| CockpitV1CollectionCreateConfig
	| CockpitV1CollectionGetAllConfig
	| CockpitV1CollectionUpdateConfig
	| CockpitV1FormSubmitConfig
	| CockpitV1SingletonGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CockpitV1Credentials {
	cockpitApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CockpitNode = {
	type: 'n8n-nodes-base.cockpit';
	version: 1;
	config: NodeConfig<CockpitV1Params>;
	credentials?: CockpitV1Credentials;
};
