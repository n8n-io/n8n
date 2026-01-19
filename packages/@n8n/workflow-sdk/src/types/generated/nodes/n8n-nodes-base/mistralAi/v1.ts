/**
 * Mistral AI Node - Version 1
 * Consume Mistral AI API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Extract text from document using OCR */
export type MistralAiV1DocumentExtractTextConfig = {
	resource: 'document';
	operation: 'extractText';
/**
 * The OCR model to use
 * @displayOptions.show { resource: ["document"], operation: ["extractText"] }
 * @default mistral-ocr-latest
 */
		model: 'mistral-ocr-latest' | Expression<string>;
/**
 * The type of document to process
 * @displayOptions.show { resource: ["document"], operation: ["extractText"] }
 * @default document_url
 */
		documentType: 'document_url' | 'image_url' | Expression<string>;
/**
 * How the document will be provided
 * @displayOptions.show { resource: ["document"], operation: ["extractText"] }
 * @default binary
 */
		inputType: 'binary' | 'url' | Expression<string>;
/**
 * Name of the input binary field that contains the file to process
 * @hint Uploaded document files must not exceed 50 MB in size and should be no longer than 1,000 pages.
 * @displayOptions.show { inputType: ["binary"], resource: ["document"], operation: ["extractText"] }
 * @default data
 */
		binaryProperty: string | Expression<string>;
/**
 * URL of the document or image to process
 * @displayOptions.show { inputType: ["url"], resource: ["document"], operation: ["extractText"] }
 */
		url: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type MistralAiV1Params =
	| MistralAiV1DocumentExtractTextConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type MistralAiV1DocumentExtractTextOutput = {
	document_annotation?: null;
	extractedText?: string;
	model?: string;
	pageCount?: number;
	pages?: Array<{
		dimensions?: {
			dpi?: number;
			height?: number;
			width?: number;
		};
		footer?: null;
		header?: null;
		hyperlinks?: Array<string>;
		images?: Array<{
			bottom_right_x?: number;
			bottom_right_y?: number;
			id?: string;
			image_annotation?: null;
			image_base64?: null;
			top_left_x?: number;
			top_left_y?: number;
		}>;
		index?: number;
		markdown?: string;
	}>;
	usage_info?: {
		doc_size_bytes?: number;
		pages_processed?: number;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MistralAiV1Credentials {
	mistralCloudApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MistralAiV1NodeBase {
	type: 'n8n-nodes-base.mistralAi';
	version: 1;
	credentials?: MistralAiV1Credentials;
}

export type MistralAiV1DocumentExtractTextNode = MistralAiV1NodeBase & {
	config: NodeConfig<MistralAiV1DocumentExtractTextConfig>;
	output?: MistralAiV1DocumentExtractTextOutput;
};

export type MistralAiV1Node = MistralAiV1DocumentExtractTextNode;