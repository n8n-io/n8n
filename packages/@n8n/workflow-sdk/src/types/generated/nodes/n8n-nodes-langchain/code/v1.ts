/**
 * LangChain Code Node - Version 1
 * LangChain Code Node
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcCodeV1Params {
	code?: {
		execute?: {
			/** JavaScript - Execute
			 * @hint This code will only run and return data if a "Main" input & output got created.
			 * @default const { PromptTemplate } = require('@langchain/core/prompts');

const query = 'Tell me a joke';
const prompt = PromptTemplate.fromTemplate(query);

// If you are allowing more than one language model input connection (-1 or
// anything greater than 1), getInputConnectionData returns an array, so you
// will have to change the code below it to deal with that. For example, use
// llm[0] in the chain definition

const llm = await this.getInputConnectionData('ai_languageModel', 0);
let chain = prompt.pipe(llm);
const output = await chain.invoke();
return [ {json: { output } } ];

// NOTE: Old langchain imports (e.g., 'langchain/chains') are automatically
// converted to '@langchain/classic' imports for backwards compatibility.
			 */
			code?: string | Expression<string>;
		};
		supplyData?: {
			/** JavaScript - Supply Data
			 * @hint This code will only run and return data if an output got created which is not "Main".
			 * @default const { WikipediaQueryRun } = require( '@langchain/community/tools/wikipedia_query_run');
return new WikipediaQueryRun();
			 */
			code?: string | Expression<string>;
		};
	};
/**
 * The input to add
 * @default {}
 */
		inputs?: {
		input?: Array<{
			/** The type of the input
			 */
			type?: 'ai_chain' | 'ai_document' | 'ai_embedding' | 'ai_languageModel' | 'ai_memory' | 'ai_outputParser' | 'ai_textSplitter' | 'ai_tool' | 'ai_vectorStore' | 'main' | Expression<string>;
			/** How many nodes of this type are allowed to be connected. Set it to -1 for unlimited.
			 * @default -1
			 */
			maxConnections?: number | Expression<number>;
			/** Whether the input needs a connection
			 * @default false
			 */
			required?: boolean | Expression<boolean>;
		}>;
	};
/**
 * The output to add
 * @default {}
 */
		outputs?: {
		output?: Array<{
			/** The type of the input
			 */
			type?: 'ai_chain' | 'ai_document' | 'ai_embedding' | 'ai_languageModel' | 'ai_memory' | 'ai_outputParser' | 'ai_textSplitter' | 'ai_tool' | 'ai_vectorStore' | 'main' | Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcCodeV1Node = {
	type: '@n8n/n8n-nodes-langchain.code';
	version: 1;
	config: NodeConfig<LcCodeV1Params>;
	credentials?: Record<string, never>;
};