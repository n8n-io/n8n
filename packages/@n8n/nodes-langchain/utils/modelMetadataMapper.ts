import type { IModelMetadata } from 'n8n-workflow';

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
 * Mistral API model structure
 */
export interface MistralModel {
	id: string;
	object: string;
	created: number;
	owned_by: string;
}

/**
 * Maps an OpenAI API model to IModelMetadata
 * Note: OpenAI API provides very limited metadata, so we use hardcoded data for known models
 */
export function mapOpenAIModel(model: OpenAIModel): IModelMetadata {
	// Development warning for fallback usage
	if (process.env.NODE_ENV === 'development') {
		console.warn(
			`[DEV] Using fallback metadata for OpenAI model: ${model.id}\n` +
				`Consider adding metadata file: model-metadata/openai/${model.id}.json`,
		);
	}

	// Known OpenAI models with their capabilities
	const knownModels: Record<string, Partial<IModelMetadata>> = {
		'gpt-4o': {
			id: 'gpt-4o',
			name: 'GPT-4o',
			provider: 'OpenAI',
			contextLength: 128000,
			maxOutputTokens: 16384,
			intelligenceLevel: 'high',
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
			id: 'gpt-4o-mini',
			name: 'GPT-4o Mini',
			provider: 'OpenAI',
			contextLength: 128000,
			maxOutputTokens: 16384,
			intelligenceLevel: 'medium',
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
			id: 'gpt-4-turbo',
			name: 'GPT-4 Turbo',
			provider: 'OpenAI',
			contextLength: 128000,
			maxOutputTokens: 4096,
			intelligenceLevel: 'high',
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
			id: 'gpt-4',
			name: 'GPT-4',
			provider: 'OpenAI',
			contextLength: 8192,
			maxOutputTokens: 8192,
			intelligenceLevel: 'high',
			capabilities: {
				functionCalling: true,
			},
			pricing: {
				promptPerMilTokenUsd: 30.0,
				completionPerMilTokenUsd: 60.0,
			},
		},
		'gpt-3.5-turbo': {
			id: 'gpt-3.5-turbo',
			name: 'GPT-3.5 Turbo',
			provider: 'OpenAI',
			contextLength: 16385,
			maxOutputTokens: 4096,
			intelligenceLevel: 'medium',
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
		return knownModel as IModelMetadata;
	}

	// Fallback for unknown models
	return createGenericMetadata(model.id, 'OpenAI');
}

/**
 * Maps an Anthropic API model to IModelMetadata
 */
export function mapAnthropicModel(model: AnthropicModel): IModelMetadata {
	// Development warning for fallback usage
	if (process.env.NODE_ENV === 'development') {
		console.warn(
			`[DEV] Using fallback metadata for Anthropic model: ${model.id}\n` +
				`Consider adding metadata file: model-metadata/anthropic/${model.id}.json`,
		);
	}

	// Known Anthropic models with their capabilities
	const knownModels: Record<string, IModelMetadata> = {
		'claude-3-5-sonnet-20241022': {
			id: 'claude-3-5-sonnet-20241022',
			name: 'Claude 3.5 Sonnet',
			provider: 'Anthropic',
			contextLength: 200000,
			maxOutputTokens: 8192,
			intelligenceLevel: 'high',
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
			id: 'claude-3-opus-20240229',
			name: 'Claude 3 Opus',
			provider: 'Anthropic',
			contextLength: 200000,
			maxOutputTokens: 4096,
			intelligenceLevel: 'high',
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
			id: 'claude-3-sonnet-20240229',
			name: 'Claude 3 Sonnet',
			provider: 'Anthropic',
			contextLength: 200000,
			maxOutputTokens: 4096,
			intelligenceLevel: 'high',
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
			id: 'claude-3-haiku-20240307',
			name: 'Claude 3 Haiku',
			provider: 'Anthropic',
			contextLength: 200000,
			maxOutputTokens: 4096,
			intelligenceLevel: 'medium',
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
		return knownModel;
	}

	// Fallback for unknown models
	return createGenericMetadata(model.display_name || model.id, 'Anthropic');
}

/**
 * Creates generic metadata for unknown models
 */
export function createGenericMetadata(
	modelId: string,
	provider: string = 'Unknown',
): IModelMetadata {
	return {
		id: modelId,
		name: modelId,
		provider,
		contextLength: 0,
		intelligenceLevel: 'medium',
		capabilities: {},
		pricing: {
			promptPerMilTokenUsd: 0,
			completionPerMilTokenUsd: 0,
		},
	};
}

/**
 * Maps a Google Gemini API model to IModelMetadata
 */
export function mapGoogleGeminiModel(modelName: string): IModelMetadata {
	// Development warning for fallback usage
	if (process.env.NODE_ENV === 'development') {
		console.warn(
			`[DEV] Using fallback metadata for Google model: ${modelName}\n` +
				`Consider adding metadata file: model-metadata/google/${modelName}.json`,
		);
	}

	// Extract model ID from full path (e.g., "models/gemini-1.5-pro" → "gemini-1.5-pro")
	const modelId = modelName.replace(/^models\//, '');

	// Create generic metadata with basic defaults
	return createGenericMetadata(modelId, 'Google');
}

/**
 * Maps a Mistral API model to IModelMetadata
 */
export function mapMistralModel(model: MistralModel): IModelMetadata {
	// Development warning for fallback usage
	if (process.env.NODE_ENV === 'development') {
		console.warn(
			`[DEV] Using fallback metadata for Mistral model: ${model.id}\n` +
				`Consider adding metadata file: model-metadata/mistral/${model.id}.json`,
		);
	}

	// Known Mistral models with their capabilities
	const knownModels: Record<string, IModelMetadata> = {
		'mistral-large-latest': {
			id: 'mistral-large-latest',
			name: 'Mistral Large',
			provider: 'Mistral',
			contextLength: 128000,
			maxOutputTokens: 4096,
			intelligenceLevel: 'high',
			capabilities: {
				functionCalling: true,
				structuredOutput: true,
			},
			pricing: {
				promptPerMilTokenUsd: 2.0,
				completionPerMilTokenUsd: 6.0,
			},
		},
		'mistral-medium-latest': {
			id: 'mistral-medium-latest',
			name: 'Mistral Medium 3',
			provider: 'Mistral',
			contextLength: 128000,
			maxOutputTokens: 4096,
			intelligenceLevel: 'high',
			capabilities: {
				functionCalling: true,
				structuredOutput: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 0.4,
				completionPerMilTokenUsd: 2.0,
			},
		},
		'mistral-small-latest': {
			id: 'mistral-small-latest',
			name: 'Mistral Small 3',
			provider: 'Mistral',
			contextLength: 128000,
			maxOutputTokens: 4096,
			intelligenceLevel: 'medium',
			capabilities: {
				functionCalling: true,
				structuredOutput: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 0.1,
				completionPerMilTokenUsd: 0.3,
			},
		},
		'codestral-latest': {
			id: 'codestral-latest',
			name: 'Codestral',
			provider: 'Mistral',
			contextLength: 256000,
			maxOutputTokens: 8192,
			intelligenceLevel: 'high',
			capabilities: {
				functionCalling: true,
				structuredOutput: true,
			},
			pricing: {
				promptPerMilTokenUsd: 0.3,
				completionPerMilTokenUsd: 0.9,
			},
		},
		'pixtral-large-latest': {
			id: 'pixtral-large-latest',
			name: 'Pixtral Large',
			provider: 'Mistral',
			contextLength: 128000,
			maxOutputTokens: 4096,
			intelligenceLevel: 'high',
			capabilities: {
				functionCalling: true,
				structuredOutput: true,
				vision: true,
			},
			pricing: {
				promptPerMilTokenUsd: 2.0,
				completionPerMilTokenUsd: 6.0,
			},
		},
	};

	// Check if it's a known model
	const knownModel = knownModels[model.id];
	if (knownModel) {
		return knownModel;
	}

	// Fallback for unknown models
	return createGenericMetadata(model.id, 'Mistral');
}
