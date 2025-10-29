import type { IModelMetadata } from 'n8n-workflow';

/**
 * OpenRouter API model structure
 */
export interface OpenRouterModel {
	slug: string;
	name: string;
	short_name?: string;
	author: string;
	description?: string;
	context_length: number;
	input_modalities?: string[];
	output_modalities?: string[];
	endpoint?: {
		provider_display_name?: string;
		provider_name?: string;
		max_completion_tokens?: number;
		supported_parameters?: string[];
		pricing?: {
			prompt?: string;
			completion?: string;
		};
		features?: {
			supports_tool_choice?: {
				literal_none?: boolean;
				literal_auto?: boolean;
				literal_required?: boolean;
				type_function?: boolean;
			};
			supported_parameters?: {
				response_format?: boolean;
				structured_outputs?: boolean;
			};
			supports_input_audio?: boolean;
		};
	};
}

/**
 * OpenAI API model structure (basic)
 */
export interface OpenAIModel {
	id: string;
	created?: number;
	owned_by?: string;
}

/**
 * Anthropic API model structure
 */
export interface AnthropicModel {
	id: string;
	display_name: string;
	created_at: string;
	type?: string;
}

/**
 * Maps an OpenRouter API model to IModelMetadata
 */
export function mapOpenRouterModel(model: OpenRouterModel): IModelMetadata {
	const endpoint = model.endpoint;
	const pricing = endpoint?.pricing;
	const features = endpoint?.features;

	return {
		name: model.name,
		shortName: model.short_name,
		provider: endpoint?.provider_display_name || model.author,
		pricing: {
			promptPerMilTokenUsd: pricing?.prompt ? parseFloat(pricing.prompt) * 1_000_000 : 0,
			completionPerMilTokenUsd: pricing?.completion
				? parseFloat(pricing.completion) * 1_000_000
				: 0,
		},
		contextLength: model.context_length || 0,
		maxOutputTokens: endpoint?.max_completion_tokens,
		capabilities: {
			functionCalling:
				endpoint?.supported_parameters?.includes('tools') ||
				features?.supports_tool_choice?.type_function === true,
			structuredOutput:
				endpoint?.supported_parameters?.includes('structured_outputs') ||
				features?.supported_parameters?.structured_outputs === true,
			vision: model.input_modalities?.includes('image'),
			imageGeneration: model.output_modalities?.includes('image'),
			audio: model.input_modalities?.includes('audio') || features?.supports_input_audio === true,
		},
		inputModalities: model.input_modalities,
		outputModalities: model.output_modalities,
		description: model.description,
	};
}

/**
 * Maps an OpenAI API model to IModelMetadata
 * Note: OpenAI API provides very limited metadata, so we use hardcoded data for known models
 */
export function mapOpenAIModel(model: OpenAIModel): IModelMetadata {
	// Known OpenAI models with their capabilities
	const knownModels: Record<string, Partial<IModelMetadata>> = {
		'gpt-4o': {
			name: 'GPT-4o',
			provider: 'OpenAI',
			contextLength: 128000,
			maxOutputTokens: 16384,
			capabilities: {
				functionCalling: true,
				structuredOutput: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 2.5,
				completionPerMilTokenUsd: 10.0,
			},
		},
		'gpt-4o-mini': {
			name: 'GPT-4o Mini',
			provider: 'OpenAI',
			contextLength: 128000,
			maxOutputTokens: 16384,
			capabilities: {
				functionCalling: true,
				structuredOutput: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 0.15,
				completionPerMilTokenUsd: 0.6,
			},
		},
		'gpt-4-turbo': {
			name: 'GPT-4 Turbo',
			provider: 'OpenAI',
			contextLength: 128000,
			maxOutputTokens: 4096,
			capabilities: {
				functionCalling: true,
				structuredOutput: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 10.0,
				completionPerMilTokenUsd: 30.0,
			},
		},
		'gpt-4': {
			name: 'GPT-4',
			provider: 'OpenAI',
			contextLength: 8192,
			maxOutputTokens: 8192,
			capabilities: {
				functionCalling: true,
			},
			pricing: {
				promptPerMilTokenUsd: 30.0,
				completionPerMilTokenUsd: 60.0,
			},
		},
		'gpt-3.5-turbo': {
			name: 'GPT-3.5 Turbo',
			provider: 'OpenAI',
			contextLength: 16385,
			maxOutputTokens: 4096,
			capabilities: {
				functionCalling: true,
			},
			pricing: {
				promptPerMilTokenUsd: 0.5,
				completionPerMilTokenUsd: 1.5,
			},
		},
	};

	// Check if it's a known model
	const knownModel = knownModels[model.id];
	if (knownModel) {
		return {
			name: knownModel.name!,
			provider: knownModel.provider!,
			contextLength: knownModel.contextLength!,
			maxOutputTokens: knownModel.maxOutputTokens,
			capabilities: knownModel.capabilities || {},
			pricing: knownModel.pricing!,
		};
	}

	// Fallback for unknown models
	return createGenericMetadata(model.id, 'OpenAI');
}

/**
 * Maps an Anthropic API model to IModelMetadata
 */
export function mapAnthropicModel(model: AnthropicModel): IModelMetadata {
	// Known Anthropic models with their capabilities
	const knownModels: Record<string, Partial<IModelMetadata>> = {
		'claude-3-5-sonnet-20241022': {
			name: 'Claude 3.5 Sonnet',
			provider: 'Anthropic',
			contextLength: 200000,
			maxOutputTokens: 8192,
			capabilities: {
				functionCalling: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 3.0,
				completionPerMilTokenUsd: 15.0,
			},
		},
		'claude-3-opus-20240229': {
			name: 'Claude 3 Opus',
			provider: 'Anthropic',
			contextLength: 200000,
			maxOutputTokens: 4096,
			capabilities: {
				functionCalling: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 15.0,
				completionPerMilTokenUsd: 75.0,
			},
		},
		'claude-3-sonnet-20240229': {
			name: 'Claude 3 Sonnet',
			provider: 'Anthropic',
			contextLength: 200000,
			maxOutputTokens: 4096,
			capabilities: {
				functionCalling: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 3.0,
				completionPerMilTokenUsd: 15.0,
			},
		},
		'claude-3-haiku-20240307': {
			name: 'Claude 3 Haiku',
			provider: 'Anthropic',
			contextLength: 200000,
			maxOutputTokens: 4096,
			capabilities: {
				functionCalling: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 0.25,
				completionPerMilTokenUsd: 1.25,
			},
		},
	};

	// Check if it's a known model
	const knownModel = knownModels[model.id];
	if (knownModel) {
		return {
			name: knownModel.name!,
			provider: knownModel.provider!,
			contextLength: knownModel.contextLength!,
			maxOutputTokens: knownModel.maxOutputTokens,
			capabilities: knownModel.capabilities || {},
			pricing: knownModel.pricing!,
		};
	}

	// Fallback for unknown models
	return {
		name: model.display_name || model.id,
		provider: 'Anthropic',
		contextLength: 200000, // Default Anthropic context
		capabilities: {},
		pricing: {
			promptPerMilTokenUsd: 0,
			completionPerMilTokenUsd: 0,
		},
	};
}

/**
 * Creates generic metadata for unknown models
 */
export function createGenericMetadata(
	modelId: string,
	provider: string = 'Unknown',
): IModelMetadata {
	return {
		name: modelId,
		provider,
		contextLength: 0,
		capabilities: {},
		pricing: {
			promptPerMilTokenUsd: 0,
			completionPerMilTokenUsd: 0,
		},
	};
}

/**
 * Generic mapper that tries to detect the API type and map accordingly
 */
export function mapToModelMetadata(
	model: OpenRouterModel | OpenAIModel | AnthropicModel | any,
	provider?: string,
): IModelMetadata {
	// Try to detect OpenRouter format
	if ('endpoint' in model && model.endpoint?.pricing) {
		return mapOpenRouterModel(model as OpenRouterModel);
	}

	// Try to detect Anthropic format
	if ('display_name' in model) {
		return mapAnthropicModel(model as AnthropicModel);
	}

	// Try to detect OpenAI format
	if ('id' in model && !('display_name' in model)) {
		return mapOpenAIModel(model as OpenAIModel);
	}

	// Fallback to generic
	const modelId = (model as any).id || (model as any).slug || 'Unknown Model';
	return createGenericMetadata(modelId, provider);
}
