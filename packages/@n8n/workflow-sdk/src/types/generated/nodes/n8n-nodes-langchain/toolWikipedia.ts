/**
 * Wikipedia Node Types
 *
 * Search in Wikipedia
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/toolwikipedia/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolWikipediaV1Params {}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type LcToolWikipediaV1Node = {
	type: '@n8n/n8n-nodes-langchain.toolWikipedia';
	version: 1;
	config: NodeConfig<LcToolWikipediaV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type LcToolWikipediaNode = LcToolWikipediaV1Node;
