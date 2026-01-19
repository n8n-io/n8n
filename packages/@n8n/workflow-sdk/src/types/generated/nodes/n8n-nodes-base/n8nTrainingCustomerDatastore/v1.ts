/**
 * Customer Datastore (n8n training) Node - Version 1
 * Dummy node used for n8n training
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface N8nTrainingCustomerDatastoreV1Params {
	operation?: 'getOnePerson' | 'getAllPeople' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAllPeople"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAllPeople"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface N8nTrainingCustomerDatastoreV1NodeBase {
	type: 'n8n-nodes-base.n8nTrainingCustomerDatastore';
	version: 1;
}

export type N8nTrainingCustomerDatastoreV1ParamsNode = N8nTrainingCustomerDatastoreV1NodeBase & {
	config: NodeConfig<N8nTrainingCustomerDatastoreV1Params>;
};

export type N8nTrainingCustomerDatastoreV1Node = N8nTrainingCustomerDatastoreV1ParamsNode;