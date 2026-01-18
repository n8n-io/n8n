/**
 * Peekalink Node Types
 *
 * Consume the Peekalink API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/peekalink/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PeekalinkV1Params {
	operation?: 'isAvailable' | 'preview' | Expression<string>;
	url: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PeekalinkV1Credentials {
	peekalinkApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type PeekalinkV1Node = {
	type: 'n8n-nodes-base.peekalink';
	version: 1;
	config: NodeConfig<PeekalinkV1Params>;
	credentials?: PeekalinkV1Credentials;
};

export type PeekalinkNode = PeekalinkV1Node;
