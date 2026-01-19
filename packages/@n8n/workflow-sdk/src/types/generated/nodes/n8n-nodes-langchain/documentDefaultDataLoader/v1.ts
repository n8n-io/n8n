/**
 * Default Data Loader Node - Version 1
 * Load data from previous step in the workflow
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcDocumentDefaultDataLoaderV1Config {
	dataType: 'json' | 'binary' | Expression<string>;
	jsonMode: 'allInputData' | 'expressionData' | Expression<string>;
	binaryMode: 'allInputData' | 'specificField' | Expression<string>;
	loader: 'auto' | 'csvLoader' | 'docxLoader' | 'epubLoader' | 'jsonLoader' | 'pdfLoader' | 'textLoader' | Expression<string>;
/**
 * Drag and drop fields from the input pane, or use an expression
 * @displayOptions.show { dataType: ["json"], jsonMode: ["expressionData"] }
 */
		jsonData: string | Expression<string>;
/**
 * The name of the field in the agent or chain’s input that contains the binary file to be processed
 * @displayOptions.show { dataType: ["binary"] }
 * @displayOptions.hide { binaryMode: ["allInputData"] }
 * @default data
 */
		binaryDataKey: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcDocumentDefaultDataLoaderV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader';
	version: 1;
}

export type LcDocumentDefaultDataLoaderV1Node = LcDocumentDefaultDataLoaderV1NodeBase & {
	config: NodeConfig<LcDocumentDefaultDataLoaderV1Config>;
};

export type LcDocumentDefaultDataLoaderV1Node = LcDocumentDefaultDataLoaderV1Node;