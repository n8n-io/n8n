/**
 * Lemonade Model Node - Version 1
 * Language Model Lemonade
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmLemonadeV1Config {
/**
 * The model which will generate the completion. Models are loaded and managed through the Lemonade server.
 */
		model: string | Expression<string>;
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmLemonadeV1Credentials {
	lemonadeApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmLemonadeV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmLemonade';
	version: 1;
	credentials?: LcLmLemonadeV1Credentials;
	isTrigger: true;
}

export type LcLmLemonadeV1Node = LcLmLemonadeV1NodeBase & {
	config: NodeConfig<LcLmLemonadeV1Config>;
};

export type LcLmLemonadeV1Node = LcLmLemonadeV1Node;