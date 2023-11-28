import type { IDataObject, ILoadOptionsFunctions } from 'n8n-workflow';
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

export async function supabaseTableNameSearch(this: ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('supabaseApi');

	const results = [];

	const paths = (
		await this.helpers.requestWithAuthentication.call(this, 'supabaseApi', {
			headers: {
				Prefer: 'return=representation',
			},
			method: 'GET',
			uri: `${credentials.host}/rest/v1/`,
			json: true,
		})
	).paths as IDataObject;

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
