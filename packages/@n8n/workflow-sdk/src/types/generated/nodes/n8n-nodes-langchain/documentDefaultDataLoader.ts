/**
 * Default Data Loader Node Types
 *
 * Load data from previous step in the workflow
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/documentdefaultdataloader/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcDocumentDefaultDataLoaderV11Params {
	dataType: 'json' | 'binary' | Expression<string>;
	jsonMode: 'allInputData' | 'expressionData' | Expression<string>;
	binaryMode: 'allInputData' | 'specificField' | Expression<string>;
	loader:
		| 'auto'
		| 'csvLoader'
		| 'docxLoader'
		| 'epubLoader'
		| 'jsonLoader'
		| 'pdfLoader'
		| 'textLoader'
		| Expression<string>;
	/**
	 * Drag and drop fields from the input pane, or use an expression
	 */
	jsonData: string | Expression<string>;
	/**
	 * The name of the field in the agent or chain’s input that contains the binary file to be processed
	 * @default data
	 */
	binaryDataKey: string | Expression<string>;
	textSplittingMode: 'simple' | 'custom' | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcDocumentDefaultDataLoaderNode = {
	type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader';
	version: 1 | 1.1;
	config: NodeConfig<LcDocumentDefaultDataLoaderV11Params>;
	credentials?: Record<string, never>;
};
