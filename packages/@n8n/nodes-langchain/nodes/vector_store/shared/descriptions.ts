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
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

export const supabaseTableNameRLC: INodeProperties = {
	displayName: 'Table Name',
	name: 'tableName',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'supabaseTableNameSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

export const qdrantCollectionRLC: INodeProperties = {
	displayName: 'Qdrant Collection',
	name: 'qdrantCollection',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'qdrantCollectionsSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};
