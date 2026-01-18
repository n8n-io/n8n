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
// Node Type
// ===========================================================================

export type LcToolWikipediaNode = {
	type: '@n8n/n8n-nodes-langchain.toolWikipedia';
	version: 1;
	config: NodeConfig<LcToolWikipediaV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
