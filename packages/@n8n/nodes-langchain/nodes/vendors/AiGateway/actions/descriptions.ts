import type { INodeProperties } from 'n8n-workflow';

import { DEFAULT_MODEL_FOR_RESOURCE, MODEL_PARAM } from '../helpers/modelParams';

/**
 * Single model selector shared across all resources.
 * `loadOptionsDependsOn` triggers a refetch when resource or operation changes,
 * so the dropdown list is always filtered for the current context.
 */
export const modelSelector: INodeProperties = {
	displayName: 'Model',
	name: MODEL_PARAM,
	type: 'options',
	default: DEFAULT_MODEL_FOR_RESOURCE.text,
	required: true,
	description: 'The model which will generate the completion',
	typeOptions: {
		isModelSelector: true,
		loadOptionsMethod: 'getModels',
		loadOptionsDependsOn: ['resource', 'operation'],
	},
};
