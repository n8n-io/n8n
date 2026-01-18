/**
 * LangChain Code Node Types
 *
 * LangChain Code Node
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/code/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcCodeV1Params {
	code?: {
		execute?: { code?: string | Expression<string> };
		supplyData?: { code?: string | Expression<string> };
	};
	/**
	 * The input to add
	 * @default {}
	 */
	inputs?: {
		input?: Array<{
			type?:
				| 'ai_chain'
				| 'ai_document'
				| 'ai_embedding'
				| 'ai_languageModel'
				| 'ai_memory'
				| 'ai_outputParser'
				| 'ai_textSplitter'
				| 'ai_tool'
				| 'ai_vectorStore'
				| 'main'
				| Expression<string>;
			maxConnections?: number | Expression<number>;
			required?: boolean | Expression<boolean>;
		}>;
	};
	/**
	 * The output to add
	 * @default {}
	 */
	outputs?: {
		output?: Array<{
			type?:
				| 'ai_chain'
				| 'ai_document'
				| 'ai_embedding'
				| 'ai_languageModel'
				| 'ai_memory'
				| 'ai_outputParser'
				| 'ai_textSplitter'
				| 'ai_tool'
				| 'ai_vectorStore'
				| 'main'
				| Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type LcCodeV1Node = {
	type: '@n8n/n8n-nodes-langchain.code';
	version: 1;
	config: NodeConfig<LcCodeV1Params>;
	credentials?: Record<string, never>;
};

export type LcCodeNode = LcCodeV1Node;
