/**
 * Adalo Node Types
 *
 * Consume Adalo API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/adalo/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AdaloV1Params {
	resource?: 'collection' | Expression<string>;
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | Expression<string>;
	/**
	 * Open your Adalo application and click on the three buttons beside the collection name, then select API Documentation
	 * @hint You can find information about app's collections on https://app.adalo.com/apps/&lt;strong&gt;your-app-id&lt;/strong&gt;/api-docs
	 */
	collectionId: string | Expression<string>;
	rowId: string | Expression<string>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineBelow
	 */
	dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	/**
	 * Field must be defined in the collection, otherwise it will be ignored. If field defined in the collection is not set here, it will be set to null.
	 * @default {}
	 */
	fieldsUi?: {
		fieldValues?: Array<{
			fieldId?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
		}>;
	};
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

export type AdaloV1Node = {
	type: 'n8n-nodes-base.adalo';
	version: 1;
	config: NodeConfig<AdaloV1Params>;
	credentials?: AdaloV1Credentials;
};

export type AdaloNode = AdaloV1Node;
