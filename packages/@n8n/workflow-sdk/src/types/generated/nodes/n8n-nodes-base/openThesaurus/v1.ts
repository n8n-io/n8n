/**
 * OpenThesaurus Node - Version 1
 * Get synonmns for German words using the OpenThesaurus API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface OpenThesaurusV1Config {
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
// Node Types
// ===========================================================================

interface OpenThesaurusV1NodeBase {
	type: 'n8n-nodes-base.openThesaurus';
	version: 1;
}

export type OpenThesaurusV1Node = OpenThesaurusV1NodeBase & {
	config: NodeConfig<OpenThesaurusV1Config>;
};

export type OpenThesaurusV1Node = OpenThesaurusV1Node;