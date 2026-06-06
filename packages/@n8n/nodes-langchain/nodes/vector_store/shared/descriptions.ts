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

export const milvusCollectionRLC: INodeProperties = {
	displayName: 'Milvus Collection',
	name: 'milvusCollection',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'milvusCollectionsSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

export const weaviateCollectionRLC: INodeProperties = {
	displayName: 'Weaviate Collection',
	name: 'weaviateCollection',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'weaviateCollectionsSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};
export const chromaCollectionRLC: INodeProperties = {
	displayName: 'Chroma Collection',
	name: 'chromaCollection',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'chromaCollectionsSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

export const db2TableNameRLC: INodeProperties = {
	displayName: 'Table Name',
	name: 'tableName',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description:
		'The DB2 vector store table name. If Schema is provided, the table is resolved within that schema; otherwise the current schema is used.',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a table...',
			typeOptions: {
				searchListMethod: 'db2TableNameSearch',
				searchable: true,
			},
		},
		{
			displayName: 'By Name',
			name: 'name',
			type: 'string',
			placeholder: 'e.g. VECTOR_STORE',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[A-Z][A-Z0-9_]*$',
						errorMessage: 'Table name must be uppercase alphanumeric with underscores',
					},
				},
			],
		},
	],
};

export const db2Schema: INodeProperties = {
	displayName: 'Schema',
	name: 'schema',
	type: 'string',
	default: '',
	placeholder: 'e.g., DB2INST1',
	description:
		'The DB2 schema containing the vector store table. If not specified, uses the current schema.',
	displayOptions: {
		show: {
			'/mode': ['insert', 'load', 'retrieve', 'update'],
		},
	},
};

export const db2ColumnOptions: INodeProperties = {
	displayName: 'Column Names',
	name: 'columnNames',
	type: 'collection',
	placeholder: 'Add Column Name',
	default: {},
	description: 'Customize the column names used in the DB2 vector store table',
	options: [
		{
			displayName: 'ID Column Name',
			name: 'idColumnName',
			type: 'string',
			default: 'id',
			description: 'Name of the column storing document IDs',
			placeholder: 'e.g., doc_id',
		},
		{
			displayName: 'Content Column Name',
			name: 'contentColumnName',
			type: 'string',
			default: 'text',
			description: 'Name of the column storing document content',
			placeholder: 'e.g., doc_content',
		},
		{
			displayName: 'Metadata Column Name',
			name: 'metadataColumnName',
			type: 'string',
			default: 'metadata',
			description: 'Name of the column storing document metadata',
			placeholder: 'e.g., doc_metadata',
		},
		{
			displayName: 'Embedding Column Name',
			name: 'embeddingColumnName',
			type: 'string',
			default: 'embedding',
			description: 'Name of the column storing vector embeddings',
			placeholder: 'e.g., doc_embedding',
		},
	],
	displayOptions: {
		show: {
			'/mode': ['insert', 'load', 'retrieve', 'update'],
		},
	},
};
