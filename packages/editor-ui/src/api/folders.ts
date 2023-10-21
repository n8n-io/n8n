import type { IRestApiContext, IFolder } from '@/Interface';
import { makeRestApiRequest } from '@/utils';

export async function getFolders(context: IRestApiContext): Promise<IFolder[]> {
	return makeRestApiRequest(context, 'GET', '/folders');
}

export async function createFolder(
	context: IRestApiContext,
	params: { name: string },
): Promise<IFolder> {
	return makeRestApiRequest(context, 'POST', '/folders', params);
}

export async function updateFolder(
	context: IRestApiContext,
	id: string,
	params: { name: string },
): Promise<IFolder> {
	return makeRestApiRequest(context, 'PATCH', `/folders/${id}`, params);
}

export async function deleteFolder(context: IRestApiContext, id: string): Promise<boolean> {
	return makeRestApiRequest(context, 'DELETE', `/folders/${id}`);
}
