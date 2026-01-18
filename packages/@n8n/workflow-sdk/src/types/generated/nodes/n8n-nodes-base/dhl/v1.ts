/**
 * DHL Node - Version 1
 * Consume DHL API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface DhlV1Params {
	resource?: unknown;
	operation?: 'get' | Expression<string>;
	trackingNumber: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface DhlV1Credentials {
	dhlApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type DhlV1Node = {
	type: 'n8n-nodes-base.dhl';
	version: 1;
	config: NodeConfig<DhlV1Params>;
	credentials?: DhlV1Credentials;
};