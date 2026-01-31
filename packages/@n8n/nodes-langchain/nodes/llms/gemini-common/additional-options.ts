import type { HarmBlockThreshold, HarmCategory } from '@google/genai';
import type { INodeProperties } from 'n8n-workflow';

import { harmCategories, harmThresholds } from './safety-options';

export function getAdditionalOptions({
	supportsThinkingBudget,
	supportsGoogleSearchGrounding = false,
}: { supportsThinkingBudget: boolean; supportsGoogleSearchGrounding?: boolean }) {
	const baseOptions: INodeProperties = {
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxOutputTokens',
				default: 2048,
				description: 'The maximum number of tokens to generate in the completion',
				type: 'number',
			},
			{
				displayName: 'Sampling Temperature',
				name: 'temperature',
				default: 0.4,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
				type: 'number',
			},
			{
				displayName: 'Top K',
				name: 'topK',
				default: 32,
				typeOptions: { maxValue: 40, minValue: -1, numberPrecision: 1 },
				description:
					'Used to remove "long tail" low probability responses. Defaults to -1, which disables it.',
				type: 'number',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
				type: 'number',
			},
			// Safety Settings
			{
				displayName: 'Safety Settings',
				name: 'safetySettings',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {
					values: {
						category: harmCategories[0].name as HarmCategory,
						threshold: harmThresholds[0].name as HarmBlockThreshold,
					},
				},
				placeholder: 'Add Option',
				options: [
					{
						name: 'values',
						displayName: 'Values',
						values: [
							{
								displayName: 'Safety Category',
								name: 'category',
								type: 'options',
								description: 'The category of harmful content to block',
								default: 'HARM_CATEGORY_UNSPECIFIED',
								options: harmCategories,
							},
							{
								displayName: 'Safety Threshold',
								name: 'threshold',
								type: 'options',
								description: 'The threshold of harmful content to block',
								default: 'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
								options: harmThresholds,
							},
						],
					},
				],
			},
		],
	};
	// only supported in the new google genai SDK
	if (supportsThinkingBudget) {
		baseOptions.options?.push({
			displayName: 'Thinking Budget',
			name: 'thinkingBudget',
			default: undefined,
			description:
				'Controls reasoning tokens for thinking models. Set to 0 to disable automatic thinking. Set to -1 for dynamic thinking. Leave empty for auto mode.',
			type: 'number',
			typeOptions: {
				minValue: -1,
				numberPrecision: 0,
			},
		});
	}
	if (supportsGoogleSearchGrounding) {
		baseOptions.options?.push({
			displayName: 'Google Search Grounding',
			name: 'useGoogleSearchGrounding',
			type: 'boolean',
			default: false,
			description:
				'Whether to enable Google Search grounding. When enabled, the model can use Google Search to find up-to-date information beyond its knowledge cutoff.',
		});
		baseOptions.options?.push({
			displayName: 'Dynamic Retrieval Threshold',
			name: 'dynamicRetrievalThreshold',
			type: 'number',
			default: 0.3,
			typeOptions: {
				minValue: 0,
				maxValue: 1,
				numberPrecision: 2,
			},
			description:
				'Threshold for dynamic retrieval (0-1). Higher values make the model less likely to use search.',
			displayOptions: {
				show: {
					useGoogleSearchGrounding: [true],
					// Only show for Gemini 1.x models (e.g., gemini-1.0-pro, gemini-1.5-flash)
					'/modelName': [{ _cnd: { regex: 'gemini-1\\.' } }],
				},
			},
		});
	}
	return baseOptions;
}
