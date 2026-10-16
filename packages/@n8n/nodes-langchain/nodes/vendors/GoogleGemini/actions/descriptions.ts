import type { INodeProperties } from 'n8n-workflow';

import { MODEL_SELECTION_HINT } from '@utils/model-builder-hints';

export const modelRLC = (searchListMethod: string): INodeProperties => ({
	displayName: 'Model',
	name: 'modelId',
	builderHint: { propertyHint: MODEL_SELECTION_HINT },
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	typeOptions: {
		loadOptionsDependsOn: ['operation', 'resource'],
	},
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod,
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. models/gemini-3.1-flash-lite',
		},
	],
});
