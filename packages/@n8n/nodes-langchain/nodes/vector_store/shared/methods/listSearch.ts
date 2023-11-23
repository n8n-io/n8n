import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { Pinecone } from '@pinecone-database/pinecone';

export async function pineconeIndexSearch(this: ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('pineconeApi');

	const client = new Pinecone({
		apiKey: credentials.apiKey as string,
		environment: credentials.environment as string,
	});

	const indexes = await client.listIndexes();

	const results = indexes.map((index) => ({
		name: index.name,
		value: index.name,
	}));

	return { results };
}
