import { Pinecone } from '@pinecone-database/pinecone';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { ApplicationError, type IDataObject, type ILoadOptionsFunctions } from 'n8n-workflow';

import type { QdrantCredential } from '../../../VectorStoreQdrant/Qdrant.utils';
import { createQdrantClient } from '../../../VectorStoreQdrant/Qdrant.utils';

export async function pineconeIndexSearch(this: ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('pineconeApi');

	const client = new Pinecone({
		apiKey: credentials.apiKey as string,
	});

	const indexes = await client.listIndexes();

	const results = (indexes.indexes ?? []).map((index) => ({
		name: index.name,
		value: index.name,
	}));

	return { results };
}

export async function supabaseTableNameSearch(this: ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('supabaseApi');

	const results = [];

	if (typeof credentials.host !== 'string') {
		throw new ApplicationError('Expected Supabase credentials host to be a string');
	}

	const { paths } = (await this.helpers.requestWithAuthentication.call(this, 'supabaseApi', {
		headers: {
			Prefer: 'return=representation',
		},
		method: 'GET',
		uri: `${credentials.host}/rest/v1/`,
		json: true,
	})) as { paths: IDataObject };

	for (const path of Object.keys(paths)) {
		//omit introspection path
		if (path === '/') continue;

		results.push({
			name: path.replace('/', ''),
			value: path.replace('/', ''),
		});
	}

	return { results };
}

export async function qdrantCollectionsSearch(this: ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('qdrantApi');

	const client = createQdrantClient(credentials as QdrantCredential);

	const response = await client.getCollections();

	const results = response.collections.map((collection) => ({
		name: collection.name,
		value: collection.name,
	}));

	return { results };
}

export async function milvusCollectionsSearch(this: ILoadOptionsFunctions) {
	const credentials = await this.getCredentials<{
		baseUrl: string;
		username: string;
		password: string;
	}>('milvusApi');

	const client = new MilvusClient({
		address: credentials.baseUrl,
		token: `${credentials.username}:${credentials.password}`,
	});

	const response = await client.listCollections();

	const results = response.data.map((collection) => ({
		name: collection.name,
		value: collection.name,
	}));

	return { results };
}
