import type { INodeProperties } from 'n8n-workflow';

export const modelRLC = (searchListMethod: string = 'modelSearch'): INodeProperties => ({
	displayName: 'Model',
	name: 'modelId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
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
			placeholder: 'e.g. gpt-4',
		},
	],
});

export const assistantRLC: INodeProperties = {
	displayName: 'Assistant',
	name: 'assistantId',
	type: 'resourceLocator',
	description:
		'Assistant to respond to the message. You can add, modify or remove assistants in the <a href="https://platform.openai.com/playground?mode=assistant" target="_blank">playground</a>.',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'assistantSearch',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. asst_abc123',
		},
	],
};
