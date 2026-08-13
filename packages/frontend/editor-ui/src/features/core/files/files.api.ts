import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext, RequestOptions } from '@n8n/rest-api-client';
import type { ListProjectFilesQuerySortOptions, ProjectFileConflictMode } from '@n8n/api-types';

import type { FileStorageLimits, ProjectFile } from '@/features/core/files/files.types';

export const fetchFilesApi = async (
	context: IRestApiContext,
	projectId: string,
	options?: {
		skip?: number;
		take?: number;
	},
	filter?: {
		id?: string | string[];
		name?: string | string[];
		projectId?: string | string[];
	},
	sortBy?: ListProjectFilesQuerySortOptions,
) => {
	const apiEndpoint = projectId ? `/projects/${projectId}/files` : '/files';
	return await makeRestApiRequest<{ count: number; data: ProjectFile[] }>(
		context,
		'GET',
		apiEndpoint,
		{
			...options,
			filter: filter ? JSON.stringify(filter) : undefined,
			sortBy,
		},
	);
};

export const fetchFileApi = async (context: IRestApiContext, projectId: string, fileId: string) => {
	return await makeRestApiRequest<ProjectFile>(
		context,
		'GET',
		`/projects/${projectId}/files/${fileId}`,
	);
};

export const uploadFileApi = async (
	context: IRestApiContext,
	projectId: string,
	file: File,
	conflict: ProjectFileConflictMode,
	options?: RequestOptions,
) => {
	const formData = new FormData();
	formData.append('file', file);

	return await makeRestApiRequest<ProjectFile>(
		context,
		'POST',
		`/projects/${projectId}/files?conflict=${conflict}`,
		formData,
		options,
	);
};

export const replaceFileContentApi = async (
	context: IRestApiContext,
	projectId: string,
	fileId: string,
	file: File,
	options?: RequestOptions,
) => {
	const formData = new FormData();
	formData.append('file', file);

	return await makeRestApiRequest<ProjectFile>(
		context,
		'PUT',
		`/projects/${projectId}/files/${fileId}/content`,
		formData,
		options,
	);
};

export const renameFileApi = async (
	context: IRestApiContext,
	projectId: string,
	fileId: string,
	name: string,
) => {
	return await makeRestApiRequest<ProjectFile>(
		context,
		'PATCH',
		`/projects/${projectId}/files/${fileId}`,
		{ name },
	);
};

export const deleteFileApi = async (
	context: IRestApiContext,
	projectId: string,
	fileId: string,
) => {
	return await makeRestApiRequest<{ deleted: boolean; name: string }>(
		context,
		'DELETE',
		`/projects/${projectId}/files/${fileId}`,
	);
};

export const batchDeleteFilesApi = async (
	context: IRestApiContext,
	projectId: string,
	fileIds: string[],
) => {
	return await makeRestApiRequest<{ deleted: number }>(
		context,
		'POST',
		`/projects/${projectId}/files/batch-delete`,
		{ fileIds },
	);
};

export const fetchFileStorageLimitsApi = async (context: IRestApiContext) => {
	return await makeRestApiRequest<FileStorageLimits>(context, 'GET', '/files/limits');
};

/**
 * Builds the authenticated content URL for a file, used for inline previews
 * (`action=view`) and browser downloads (`action=download`).
 */
export const getFileContentUrl = (
	context: IRestApiContext,
	projectId: string,
	fileId: string,
	action: 'view' | 'download',
): string => {
	let restUrl = context.baseUrl;
	if (restUrl.startsWith('/')) restUrl = window.location.origin + restUrl;
	const url = new URL(`${restUrl}/projects/${projectId}/files/${fileId}/content`);
	url.searchParams.append('action', action);
	return url.toString();
};
