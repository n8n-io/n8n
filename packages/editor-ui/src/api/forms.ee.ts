import { IForm, IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import { IDataObject } from 'n8n-workflow';

const dummyForms: IForm[] = [
	{
		id: '1',
		slug: 'my-form',
		title: 'My Form',
		schema: {},
	},
];

export async function getForms(context: IRestApiContext): Promise<{ forms: IForm[] }> {
	return { forms: dummyForms };

	return makeRestApiRequest(context, 'GET', '/forms');
}

export async function getForm(context: IRestApiContext, id: string): Promise<IForm> {
	return dummyForms[0];

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
	return makeRestApiRequest(context, 'POST', '/forms', data as unknown as IDataObject);
}

export async function deleteForm(context: IRestApiContext, id: string): Promise<IForm> {
	return makeRestApiRequest(context, 'DELETE', `/forms/${id}`);
}
