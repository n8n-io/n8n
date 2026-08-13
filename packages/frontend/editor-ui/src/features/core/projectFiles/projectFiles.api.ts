import type { ProjectFileListResponse, ProjectFileResponse } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export const fetchProjectFilesApi = async (
	context: IRestApiContext,
	projectId: string,
	options?: { take?: number; skip?: number; search?: string },
) =>
	await makeRestApiRequest<ProjectFileListResponse>(
		context,
		'GET',
		`/projects/${projectId}/files`,
		options,
	);

export const uploadProjectFileApi = async (
	context: IRestApiContext,
	projectId: string,
	file: File,
	options?: { overwrite?: boolean },
) => {
	const formData = new FormData();
	formData.append('file', file);

	// `overwrite` rides in the query string so it is parsed independently of the
	// multipart body.
	const query = options?.overwrite ? '?overwrite=true' : '';

	return await makeRestApiRequest<ProjectFileResponse>(
		context,
		'POST',
		`/projects/${projectId}/files${query}`,
		formData,
	);
};

export const renameProjectFileApi = async (
	context: IRestApiContext,
	projectId: string,
	fileId: string,
	name: string,
) =>
	await makeRestApiRequest<ProjectFileResponse>(
		context,
		'PATCH',
		`/projects/${projectId}/files/${fileId}`,
		{ name },
	);

export const deleteProjectFileApi = async (
	context: IRestApiContext,
	projectId: string,
	fileId: string,
) =>
	await makeRestApiRequest<{ success: true }>(
		context,
		'DELETE',
		`/projects/${projectId}/files/${fileId}`,
	);

/**
 * Absolute URL of a file's bytes.
 *
 * Downloads navigate to this rather than fetching into a blob: the endpoint sets
 * `Content-Disposition: attachment`, so the browser streams straight to disk and
 * a 100 MB file never lands in a tab's memory.
 *
 * `action: 'view'` serves the same bytes inline for preview, and the server
 * rejects it for any type outside `ProjectFilePreviewableMimeTypes`.
 */
export const projectFileContentUrl = (
	context: IRestApiContext,
	projectId: string,
	fileId: string,
	action?: 'view',
) => {
	const url = `${context.baseUrl}/projects/${projectId}/files/${fileId}/content`;

	return action ? `${url}?action=${action}` : url;
};

/**
 * Fetches a previewable file as text.
 *
 * Goes through `fetch` with credentials rather than the API client because the
 * response is raw bytes, not the `{ data }` envelope the client unwraps.
 */
export const fetchProjectFileTextApi = async (
	context: IRestApiContext,
	projectId: string,
	fileId: string,
): Promise<string> => {
	const response = await fetch(projectFileContentUrl(context, projectId, fileId, 'view'), {
		credentials: 'include',
	});

	if (!response.ok) throw new Error(`Preview failed with status ${response.status}`);

	return await response.text();
};
