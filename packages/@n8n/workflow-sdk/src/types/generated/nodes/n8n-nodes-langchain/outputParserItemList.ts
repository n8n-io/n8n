/**
 * Item List Output Parser Node Types
 *
 * Return the results as separate items
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/outputparseritemlist/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcOutputParserItemListV1Params {
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type LcOutputParserItemListV1Node = {
	type: '@n8n/n8n-nodes-langchain.outputParserItemList';
	version: 1;
	config: NodeConfig<LcOutputParserItemListV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type LcOutputParserItemListNode = LcOutputParserItemListV1Node;
