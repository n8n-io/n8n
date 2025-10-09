import type { IUsedCredential } from '@/Interface';
import type {
	ChangeLocationSearchResponseItem,
	FolderCreateResponse,
	FolderTreeResponseItem,
} from './folders.types';
import type { IRestApiContext } from '@n8n/rest-api-client';

import { getFullApiResponse, makeRestApiRequest } from '@n8n/rest-api-client';

export async function createFolder(
	context: IRestApiContext,
	projectId: string,
	name: string,
	parentFolderId?: string,
): Promise<FolderCreateResponse> {
	return await makeRestApiRequest(context, 'POST', `/projects/${projectId}/folders`, {
		name,
		parentFolderId,
	});
}

export async function getFolderPath(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
): Promise<FolderTreeResponseItem[]> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/folders/${folderId}/tree`,
	);
}

export async function deleteFolder(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
	transferToFolderId?: string,
): Promise<void> {
	return await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/folders/${folderId}`, {
		transferToFolderId,
	});
}

export async function renameFolder(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
	name: string,
): Promise<void> {
	return await makeRestApiRequest(context, 'PATCH', `/projects/${projectId}/folders/${folderId}`, {
		name,
	});
}

export async function getProjectFolders(
	context: IRestApiContext,
	projectId: string,
	options?: {
		skip?: number;
		take?: number;
		sortBy?: string;
	},
	filter?: {
		excludeFolderIdAndDescendants?: string;
		name?: string;
	},
	select?: string[],
): Promise<{ data: ChangeLocationSearchResponseItem[]; count: number }> {
	const res = await getFullApiResponse<ChangeLocationSearchResponseItem[]>(
		context,
		'GET',
		`/projects/${projectId}/folders`,
		{
			...(filter ? { filter } : {}),
			...(options ? options : {}),
			...(select ? { select: JSON.stringify(select) } : {}),
		},
	);
	return {
		data: res.data,
		count: res.count,
	};
}

export async function getFolderUsedCredentials(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
): Promise<IUsedCredential[]> {
	const res = await getFullApiResponse<IUsedCredential[]>(
		context,
		'GET',
		`/projects/${projectId}/folders/${folderId}/credentials`,
	);
	return res.data;
}

export async function moveFolder(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
	parentFolderId?: string,
): Promise<void> {
	return await makeRestApiRequest(context, 'PATCH', `/projects/${projectId}/folders/${folderId}`, {
		parentFolderId,
	});
}

export async function getFolderContent(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
): Promise<{ totalSubFolders: number; totalWorkflows: number }> {
	const res = await getFullApiResponse<{ totalSubFolders: number; totalWorkflows: number }>(
		context,
		'GET',
		`/projects/${projectId}/folders/${folderId}/content`,
	);
	return res.data;
}
