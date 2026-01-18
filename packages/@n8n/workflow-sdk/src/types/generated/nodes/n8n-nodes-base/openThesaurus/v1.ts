/**
 * OpenThesaurus Node - Version 1
 * Get synonmns for German words using the OpenThesaurus API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface OpenThesaurusV1Params {
	operation?: 'getSynonyms' | Expression<string>;
/**
 * The word to get synonyms for
 * @displayOptions.show { operation: ["getSynonyms"] }
 */
		text: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type OpenThesaurusV1Node = {
	type: 'n8n-nodes-base.openThesaurus';
	version: 1;
	config: NodeConfig<OpenThesaurusV1Params>;
	credentials?: Record<string, never>;
};