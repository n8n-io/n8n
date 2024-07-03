import type { INodePropertyOptions } from 'n8n-workflow';

export const harmCategories: INodePropertyOptions[] = [
	{
		value: 'HARM_CATEGORY_HARASSMENT',
		name: 'HARM_CATEGORY_HARASSMENT',
		description: 'Harassment content',
	},
	{
		value: 'HARM_CATEGORY_HATE_SPEECH',
		name: 'HARM_CATEGORY_HATE_SPEECH',
		description: 'Hate speech and content',
	},
	{
		value: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
		name: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
		description: 'Sexually explicit content',
	},
	{
		value: 'HARM_CATEGORY_DANGEROUS_CONTENT',
		name: 'HARM_CATEGORY_DANGEROUS_CONTENT',
		description: 'Dangerous content',
	},
];

export const harmThresholds: INodePropertyOptions[] = [
	{
		value: 'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
		name: 'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
		description: 'Threshold is unspecified',
	},
	{
		value: 'BLOCK_LOW_AND_ABOVE',
		name: 'BLOCK_LOW_AND_ABOVE',
		description: 'Content with NEGLIGIBLE will be allowed',
	},
	{
		value: 'BLOCK_MEDIUM_AND_ABOVE',
		name: 'BLOCK_MEDIUM_AND_ABOVE',
		description: 'Content with NEGLIGIBLE and LOW will be allowed',
	},
	{
		value: 'BLOCK_ONLY_HIGH',
		name: 'BLOCK_ONLY_HIGH',
		description: 'Content with NEGLIGIBLE, LOW, and MEDIUM will be allowed',
	},
	{
		value: 'BLOCK_NONE',
		name: 'BLOCK_NONE',
		description: 'All content will be allowed',
	},
];
