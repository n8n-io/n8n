import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IDataObject } from 'n8n-workflow';

import type { SnippetResource, CreateSnippet, UpdateSnippet } from './snippets.types';

export async function getSnippets(context: IRestApiContext): Promise<SnippetResource[]> {
	return await makeRestApiRequest(context, 'GET', '/snippets');
}

export async function createSnippet(
	context: IRestApiContext,
	data: CreateSnippet,
): Promise<SnippetResource> {
	return await makeRestApiRequest(context, 'POST', '/snippets', data as unknown as IDataObject);
}

export async function updateSnippet(
	context: IRestApiContext,
	{ id, ...data }: UpdateSnippet,
): Promise<SnippetResource> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/snippets/${id}`,
		data as unknown as IDataObject,
	);
}

export async function deleteSnippet(
	context: IRestApiContext,
	{ id }: { id: SnippetResource['id'] },
) {
	return await makeRestApiRequest(context, 'DELETE', `/snippets/${id}`);
}
