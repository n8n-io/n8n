/**
 * OpenThesaurus Node Types
 *
 * Get synonmns for German words using the OpenThesaurus API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/openthesaurus/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface OpenThesaurusV1Params {
	operation?: 'getSynonyms' | Expression<string>;
	/**
	 * The word to get synonyms for
	 */
	text: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type OpenThesaurusNode = {
	type: 'n8n-nodes-base.openThesaurus';
	version: 1;
	config: NodeConfig<OpenThesaurusV1Params>;
	credentials?: Record<string, never>;
};
