/**
 * Customer Datastore (n8n training) Node Types
 *
 * Dummy node used for n8n training
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/n8ntrainingcustomerdatastore/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface N8nTrainingCustomerDatastoreV1Params {
	operation?: 'getOnePerson' | 'getAllPeople' | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type N8nTrainingCustomerDatastoreNode = {
	type: 'n8n-nodes-base.n8nTrainingCustomerDatastore';
	version: 1;
	config: NodeConfig<N8nTrainingCustomerDatastoreV1Params>;
	credentials?: Record<string, never>;
};
