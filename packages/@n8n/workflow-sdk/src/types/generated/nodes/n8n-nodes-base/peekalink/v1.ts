/**
 * Peekalink Node - Version 1
 * Consume the Peekalink API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PeekalinkV1Config {
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

interface PeekalinkV1NodeBase {
	type: 'n8n-nodes-base.peekalink';
	version: 1;
	credentials?: PeekalinkV1Credentials;
}

export type PeekalinkV1Node = PeekalinkV1NodeBase & {
	config: NodeConfig<PeekalinkV1Config>;
};

export type PeekalinkV1Node = PeekalinkV1Node;