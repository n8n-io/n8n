import { array, name, uuid } from 'minifaker';
import 'minifaker/locales/en';
import type {
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	ResourceMapperFields,
} from 'n8n-workflow';

export const returnData: INodeExecutionData[] = [
	{
		json: {
			id: '23423532',
			name: 'Hello World',
		},
	},
];

export const remoteOptions: INodePropertyOptions[] = [
	{
		name: 'Resource 1',
		value: 'resource1',
	},
	{
		name: 'Resource 2',
		value: 'resource2',
	},
	{
		name: 'Resource 3',
		value: 'resource3',
	},
];

export const resourceMapperFields: ResourceMapperFields = {
	fields: [
		{
			id: 'id',
			displayName: 'ID',
			defaultMatch: true,
			canBeUsedToMatch: true,
			required: true,
			display: true,
			type: 'string',
		},
		{
			id: 'name',
			displayName: 'Name',
			defaultMatch: false,
			canBeUsedToMatch: false,
			required: false,
			display: true,
			type: 'string',
		},
		{
			id: 'age',
			displayName: 'Age',
			defaultMatch: false,
			canBeUsedToMatch: false,
			required: false,
			display: true,
			type: 'number',
		},
	],
};

export const searchOptions: INodeListSearchResult['results'] = array(100, () => {
	const value = uuid.v4();
	return {
		name: name(),
		value,
		url: 'https://example.com/user/' + value,
	};
});
