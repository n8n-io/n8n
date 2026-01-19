/**
 * Wikipedia Node - Version 1
 * Search in Wikipedia
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolWikipediaV1Config {
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcToolWikipediaV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolWikipedia';
	version: 1;
	isTrigger: true;
}

export type LcToolWikipediaV1Node = LcToolWikipediaV1NodeBase & {
	config: NodeConfig<LcToolWikipediaV1Config>;
};

export type LcToolWikipediaV1Node = LcToolWikipediaV1Node;