/**
 * Lemonade Model Node Types
 *
 * Language Model Lemonade
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmlemonade/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmLemonadeV1Params {
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

export type LcLmLemonadeV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmLemonade';
	version: 1;
	config: NodeConfig<LcLmLemonadeV1Params>;
	credentials?: LcLmLemonadeV1Credentials;
	isTrigger: true;
};

export type LcLmLemonadeNode = LcLmLemonadeV1Node;
