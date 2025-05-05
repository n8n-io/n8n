import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { Schema, CreateSchemaDto } from '@n8n/api-types';

export async function getSchemas(context: IRestApiContext): Promise<Schema[]> {
	return await makeRestApiRequest(context, 'GET', '/schemas');
}

export async function createSchema(
	context: IRestApiContext,
	payload: CreateSchemaDto,
): Promise<Schema> {
	return await makeRestApiRequest(context, 'POST', '/schemas', payload);
}
