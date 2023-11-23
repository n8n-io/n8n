import type { INodeProperties } from 'n8n-workflow';

export const pineconeIndexRLC: INodeProperties = {
	displayName: 'Pinecone Index',
	name: 'pineconeIndex',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'pineconeIndexSearch',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};
