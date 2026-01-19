/**
 * Adalo Node - Version 1
 * Consume Adalo API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AdaloV1Params {
	resource?: 'collection' | Expression<string>;
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | Expression<string>;
/**
 * Open your Adalo application and click on the three buttons beside the collection name, then select API Documentation
 * @hint You can find information about app's collections on https://app.adalo.com/apps/&lt;strong&gt;your-app-id&lt;/strong&gt;/api-docs
 * @displayOptions.show { resource: ["collection"] }
 */
		collectionId: string | Expression<string>;
	rowId: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { operation: ["create", "update"], resource: ["collection"] }
 * @default defineBelow
 */
		dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
 * @displayOptions.show { operation: ["create", "update"], dataToSend: ["autoMapInputData"], resource: ["collection"] }
 */
		inputsToIgnore?: string | Expression<string>;
/**
 * Field must be defined in the collection, otherwise it will be ignored. If field defined in the collection is not set here, it will be set to null.
 * @displayOptions.show { operation: ["create", "update"], dataToSend: ["defineBelow"], resource: ["collection"] }
 * @default {}
 */
		fieldsUi?: {
		fieldValues?: Array<{
			/** Field ID
			 */
			fieldId?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["collection"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["collection"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	requestOptions?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AdaloV1Credentials {
	adaloApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AdaloV1NodeBase {
	type: 'n8n-nodes-base.adalo';
	version: 1;
	credentials?: AdaloV1Credentials;
}

export type AdaloV1ParamsNode = AdaloV1NodeBase & {
	config: NodeConfig<AdaloV1Params>;
};

export type AdaloV1Node = AdaloV1ParamsNode;