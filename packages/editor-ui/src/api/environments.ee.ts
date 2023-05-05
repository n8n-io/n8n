import type { EnvironmentVariable, IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type { IDataObject } from 'n8n-workflow';

export async function getVariables(context: IRestApiContext): Promise<EnvironmentVariable[]> {
	return await makeRestApiRequest(context, 'GET', '/variables');
}

export async function getVariable(
	context: IRestApiContext,
	{ id }: { id: EnvironmentVariable['id'] },
): Promise<EnvironmentVariable> {
	return await makeRestApiRequest(context, 'GET', `/variables/${id}`);
}

export async function createVariable(
	context: IRestApiContext,
	data: Omit<EnvironmentVariable, 'id'>,
) {
	return await makeRestApiRequest(context, 'POST', '/variables', data as unknown as IDataObject);
}

export async function updateVariable(
	context: IRestApiContext,
	{ id, ...data }: EnvironmentVariable,
) {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/variables/${id}`,
		data as unknown as IDataObject,
	);
}

export async function deleteVariable(
	context: IRestApiContext,
	{ id }: { id: EnvironmentVariable['id'] },
) {
	return await makeRestApiRequest(context, 'DELETE', `/variables/${id}`);
}
