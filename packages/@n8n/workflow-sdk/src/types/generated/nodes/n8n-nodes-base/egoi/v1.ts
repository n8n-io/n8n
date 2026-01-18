/**
 * E-goi Node - Version 1
 * Consume E-goi API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface EgoiV1Params {
	resource: 'contact' | Expression<string>;
	operation: 'create' | 'get' | 'getAll' | 'update' | Expression<string>;
/**
 * ID of list to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll", "create", "update", "get"] }
 */
		list?: string | Expression<string>;
/**
 * Email address for a subscriber
 * @displayOptions.show { operation: ["create"] }
 */
		email?: string | Expression<string>;
/**
 * Contact ID of the subscriber
 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
 */
		contactId?: string | Expression<string>;
/**
 * By default the response just includes the contact ID. If this option gets activated, it will resolve the data automatically.
 * @displayOptions.show { operation: ["create", "update"] }
 * @default true
 */
		resolveData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	updateFields?: Record<string, unknown>;
/**
 * Search by
 * @displayOptions.show { operation: ["get"], resource: ["contact"] }
 * @default id
 */
		by?: 'id' | 'email' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["get", "getAll"], resource: ["contact"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface EgoiV1Credentials {
	egoiApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type EgoiV1Node = {
	type: 'n8n-nodes-base.egoi';
	version: 1;
	config: NodeConfig<EgoiV1Params>;
	credentials?: EgoiV1Credentials;
};