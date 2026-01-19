/**
 * Item List Output Parser Node - Version 1
 * Return the results as separate items
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcOutputParserItemListV1Config {
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcOutputParserItemListV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.outputParserItemList';
	version: 1;
	isTrigger: true;
}

export type LcOutputParserItemListV1Node = LcOutputParserItemListV1NodeBase & {
	config: NodeConfig<LcOutputParserItemListV1Config>;
};

export type LcOutputParserItemListV1Node = LcOutputParserItemListV1Node;