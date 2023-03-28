import { IForm, IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import { IDataObject } from 'n8n-workflow';

export async function getForms(context: IRestApiContext): Promise<IForm[]> {
	return makeRestApiRequest(context, 'GET', '/forms');
}

export async function getForm(context: IRestApiContext, id: string): Promise<IForm> {
	return makeRestApiRequest(context, 'GET', `/forms/${id}`);
}

export async function createForm(
	context: IRestApiContext,
	data: Omit<IForm, 'id'>,
): Promise<{ id: IForm['id'] }> {
	return makeRestApiRequest(context, 'POST', '/forms', data as unknown as IDataObject);
}

export async function updateForm(
	context: IRestApiContext,
	id: string,
	data: Omit<IForm, 'id'>,
): Promise<IForm> {
	return makeRestApiRequest(context, 'PATCH', `/forms/${id}`, data as unknown as IDataObject);
}

export async function deleteForm(context: IRestApiContext, id: string): Promise<IForm> {
	return makeRestApiRequest(context, 'DELETE', `/forms/${id}`);
}
