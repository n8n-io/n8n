/**
 * Mistral AI Node Types
 *
 * Consume Mistral AI API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mistralai/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Extract text from document using OCR */
export type MistralAiV1DocumentExtractTextConfig = {
	resource: 'document';
	operation: 'extractText';
	/**
	 * The OCR model to use
	 * @default mistral-ocr-latest
	 */
	model: 'mistral-ocr-latest' | Expression<string>;
	/**
	 * The type of document to process
	 * @default document_url
	 */
	documentType: 'document_url' | 'image_url' | Expression<string>;
	/**
	 * How the document will be provided
	 * @default binary
	 */
	inputType: 'binary' | 'url' | Expression<string>;
	/**
	 * Name of the input binary field that contains the file to process
	 * @default data
	 */
	binaryProperty: string | Expression<string>;
	/**
	 * URL of the document or image to process
	 */
	url: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type MistralAiV1Params = MistralAiV1DocumentExtractTextConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MistralAiV1Credentials {
	mistralCloudApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MistralAiV1Node = {
	type: 'n8n-nodes-base.mistralAi';
	version: 1;
	config: NodeConfig<MistralAiV1Params>;
	credentials?: MistralAiV1Credentials;
};

export type MistralAiNode = MistralAiV1Node;
