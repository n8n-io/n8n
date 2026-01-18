/**
 * Unleashed Software Node Types
 *
 * Consume Unleashed Software API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/unleashedsoftware/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many sales orders */
export type UnleashedSoftwareV1SalesOrderGetAllConfig = {
	resource: 'salesOrder';
	operation: 'getAll';
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
	filters?: Record<string, unknown>;
};

/** Get a stock on hand */
export type UnleashedSoftwareV1StockOnHandGetConfig = {
	resource: 'stockOnHand';
	operation: 'get';
	productId?: string | Expression<string>;
};

/** Get many sales orders */
export type UnleashedSoftwareV1StockOnHandGetAllConfig = {
	resource: 'stockOnHand';
	operation: 'getAll';
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
	filters?: Record<string, unknown>;
};

export type UnleashedSoftwareV1Params =
	| UnleashedSoftwareV1SalesOrderGetAllConfig
	| UnleashedSoftwareV1StockOnHandGetConfig
	| UnleashedSoftwareV1StockOnHandGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface UnleashedSoftwareV1Credentials {
	unleashedSoftwareApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type UnleashedSoftwareNode = {
	type: 'n8n-nodes-base.unleashedSoftware';
	version: 1;
	config: NodeConfig<UnleashedSoftwareV1Params>;
	credentials?: UnleashedSoftwareV1Credentials;
};
