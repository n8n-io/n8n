import { Pinecone } from '@pinecone-database/pinecone';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { ApplicationError, type IDataObject, type ILoadOptionsFunctions } from 'n8n-workflow';

import type { QdrantCredential } from '../../../VectorStoreQdrant/Qdrant.utils';
import { createQdrantClient } from '../../../VectorStoreQdrant/Qdrant.utils';
import type { WeaviateCredential } from '../../../VectorStoreWeaviate/Weaviate.utils';
import { createWeaviateClient } from '../../../VectorStoreWeaviate/Weaviate.utils';
import type { MoorchehCredential } from '../../../VectorStoreMoorcheh/Moorcheh.utils';
import { createMoorchehClient } from '../../../VectorStoreMoorcheh/Moorcheh.utils';

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

export async function weaviateCollectionsSearch(this: ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('weaviateApi');

	const client = await createWeaviateClient(credentials as WeaviateCredential);

	const collections = await client.collections.listAll();

	const results = collections.map((collection: { name: string }) => ({
		name: collection.name,
		value: collection.name,
	}));

	return { results };
}

export async function moorchehNamespacesSearch(this: ILoadOptionsFunctions) {
	function isMoorchehCredential(value: unknown): value is MoorchehCredential {
		if (!value || typeof value !== 'object') return false;
		const cred = value as Record<string, unknown>;
		return (
			typeof cred.apiKey === 'string' &&
			(cred.baseUrl === undefined || typeof cred.baseUrl === 'string')
		);
	}

	const credentials = await this.getCredentials('moorchehApi');
	if (!isMoorchehCredential(credentials)) {
		throw new ApplicationError('Invalid Moorcheh API credentials format');
	}

	const client = createMoorchehClient(credentials);

	const namespaces = await client.listNamespaces();

	// Only list vector namespaces for the vector store node
	const results = namespaces
		.filter((ns: any) => {
			const type = (ns?.type ?? '').toString().toLowerCase();
			// Some APIs may not return `type`, so try to infer from presence of dimension fields
			const looksVector =
				type === 'vector' ||
				typeof ns?.vector_dimension === 'number' ||
				typeof ns?.dimension === 'number';
			// Keep only vector-like namespaces
			return looksVector;
		})
		.map((ns: any) => {
			const rawName =
				ns?.name || ns?.namespace_name || ns?.namespace || (ns?.id != null ? String(ns.id) : '');
			const dimension =
				typeof ns?.vector_dimension === 'number'
					? ns.vector_dimension
					: typeof ns?.dimension === 'number'
						? ns.dimension
						: undefined;

			return {
				name: typeof dimension === 'number' ? `${rawName} (dim ${dimension})` : String(rawName),
				value: String(rawName),
			};
		})
		// Filter out any entries where value could not be determined
		.filter((r: { value: string }) => !!r.value);

	return { results };
}
