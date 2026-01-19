/**
 * DHL Node - Version 1
 * Consume DHL API
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
// Node Types
// ===========================================================================

interface DhlV1NodeBase {
	type: 'n8n-nodes-base.dhl';
	version: 1;
	credentials?: DhlV1Credentials;
}

export type DhlV1ParamsNode = DhlV1NodeBase & {
	config: NodeConfig<DhlV1Params>;
};

export type DhlV1Node = DhlV1ParamsNode;