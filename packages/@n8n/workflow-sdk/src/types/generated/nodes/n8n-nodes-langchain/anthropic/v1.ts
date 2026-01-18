/**
 * Anthropic Node - Version 1
 * Interact with Anthropic AI models
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Take in documents and answer questions about them */
export type LcAnthropicV1DocumentAnalyzeConfig = {
	resource: 'document';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL(s) of the document(s) to analyze, multiple URLs can be added separated by comma
 * @displayOptions.show { inputType: ["url"], operation: ["analyze"], resource: ["document"] }
 */
		documentUrls?: string | Expression<string>;
/**
 * Name of the binary field(s) which contains the document(s), seperate multiple field names with commas
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["analyze"], resource: ["document"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
/**
 * Whether to simplify the response or not
 * @displayOptions.show { operation: ["analyze"], resource: ["document"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Upload a file to the Anthropic API for later use */
export type LcAnthropicV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL of the file to upload
 * @displayOptions.show { inputType: ["url"], operation: ["upload"], resource: ["file"] }
 */
		fileUrl?: string | Expression<string>;
/**
 * Name of the binary field which contains the file
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["upload"], resource: ["file"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get metadata for a file from the Anthropic API */
export type LcAnthropicV1FileGetConfig = {
	resource: 'file';
	operation: 'get';
/**
 * ID of the file to get metadata for
 * @displayOptions.show { operation: ["get"], resource: ["file"] }
 */
		fileId?: string | Expression<string>;
};

/** List files from the Anthropic API */
export type LcAnthropicV1FileListConfig = {
	resource: 'file';
	operation: 'list';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["list"], resource: ["file"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], operation: ["list"], resource: ["file"] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Delete a file from the Anthropic API */
export type LcAnthropicV1FileDeleteFileConfig = {
	resource: 'file';
	operation: 'deleteFile';
/**
 * ID of the file to delete
 * @displayOptions.show { operation: ["deleteFile"], resource: ["file"] }
 */
		fileId?: string | Expression<string>;
};

/** Take in documents and answer questions about them */
export type LcAnthropicV1ImageAnalyzeConfig = {
	resource: 'image';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL(s) of the image(s) to analyze, multiple URLs can be added separated by comma
 * @displayOptions.show { inputType: ["url"], operation: ["analyze"], resource: ["image"] }
 */
		imageUrls?: string | Expression<string>;
/**
 * Name of the binary field(s) which contains the image(s), seperate multiple field names with commas
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["analyze"], resource: ["image"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
/**
 * Whether to simplify the response or not
 * @displayOptions.show { operation: ["analyze"], resource: ["image"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Generate a prompt for a model */
export type LcAnthropicV1PromptGenerateConfig = {
	resource: 'prompt';
	operation: 'generate';
/**
 * Description of the prompt's purpose
 * @displayOptions.show { operation: ["generate"], resource: ["prompt"] }
 */
		task?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["generate"], resource: ["prompt"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
};

/** Improve a prompt for a model */
export type LcAnthropicV1PromptImproveConfig = {
	resource: 'prompt';
	operation: 'improve';
/**
 * Messages that constitute the prompt to be improved
 * @displayOptions.show { operation: ["improve"], resource: ["prompt"] }
 * @default {"values":[{"content":"","role":"user"}]}
 */
		messages?: {
		values?: Array<{
			/** The content of the message to be sent
			 */
			content?: string | Expression<string>;
			/** Role in shaping the model's response, it tells the model how it should behave and interact with the user
			 * @default user
			 */
			role?: 'user' | 'assistant' | Expression<string>;
		}>;
	};
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["improve"], resource: ["prompt"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Templatize a prompt for a model */
export type LcAnthropicV1PromptTemplatizeConfig = {
	resource: 'prompt';
	operation: 'templatize';
/**
 * Messages that constitute the prompt to be templatized
 * @displayOptions.show { operation: ["templatize"], resource: ["prompt"] }
 * @default {"values":[{"content":"","role":"user"}]}
 */
		messages?: {
		values?: Array<{
			/** The content of the message to be sent
			 */
			content?: string | Expression<string>;
			/** Role in shaping the model's response, it tells the model how it should behave and interact with the user
			 * @default user
			 */
			role?: 'user' | 'assistant' | Expression<string>;
		}>;
	};
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["templatize"], resource: ["prompt"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Create a completion with Anthropic model */
export type LcAnthropicV1TextMessageConfig = {
	resource: 'text';
	operation: 'message';
	modelId: ResourceLocatorValue;
	messages?: {
		values?: Array<{
			/** The content of the message to be sent
			 */
			content?: string | Expression<string>;
			/** Role in shaping the model's response, it tells the model how it should behave and interact with the user
			 * @default user
			 */
			role?: 'user' | 'assistant' | Expression<string>;
		}>;
	};
/**
 * Whether to add attachments to the message
 * @displayOptions.show { operation: ["message"], resource: ["text"] }
 * @default false
 */
		addAttachments?: boolean | Expression<boolean>;
/**
 * The type of input to use for the attachments
 * @displayOptions.show { addAttachments: [true], operation: ["message"], resource: ["text"] }
 * @default url
 */
		attachmentsInputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL(s) of the file(s) to attach, multiple URLs can be added separated by comma
 * @displayOptions.show { addAttachments: [true], attachmentsInputType: ["url"], operation: ["message"], resource: ["text"] }
 */
		attachmentsUrls?: string | Expression<string>;
/**
 * Name of the binary field(s) which contains the file(s) to attach, multiple field names can be added separated by comma
 * @displayOptions.show { addAttachments: [true], attachmentsInputType: ["binary"], operation: ["message"], resource: ["text"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["message"], resource: ["text"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type LcAnthropicV1Params =
	| LcAnthropicV1DocumentAnalyzeConfig
	| LcAnthropicV1FileUploadConfig
	| LcAnthropicV1FileGetConfig
	| LcAnthropicV1FileListConfig
	| LcAnthropicV1FileDeleteFileConfig
	| LcAnthropicV1ImageAnalyzeConfig
	| LcAnthropicV1PromptGenerateConfig
	| LcAnthropicV1PromptImproveConfig
	| LcAnthropicV1PromptTemplatizeConfig
	| LcAnthropicV1TextMessageConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAnthropicV1Credentials {
	anthropicApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcAnthropicV1Node = {
	type: '@n8n/n8n-nodes-langchain.anthropic';
	version: 1;
	config: NodeConfig<LcAnthropicV1Params>;
	credentials?: LcAnthropicV1Credentials;
};