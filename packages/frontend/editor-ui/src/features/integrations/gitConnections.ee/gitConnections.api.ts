import type {
	CreateGitConnectionDto,
	GitConnectionListPublicDto,
	GitConnectionPublicDto,
	UpdateGitConnectionDto,
} from '@n8n/api-types';
import type { PublicApiContext } from '@n8n/rest-api-client';
import { request } from '@n8n/rest-api-client';

export type GitConnection = GitConnectionPublicDto;
export type GitConnectionSummary = GitConnectionListPublicDto['data'][number];

const gitConnectionsApiRoot = '/git-connections';

// The backend accepts a single connection, so the first page is the whole list.
// Revisit when project-level connections land.
export const fetchGitConnections = async (
	context: PublicApiContext,
): Promise<GitConnectionSummary[]> => {
	const response: GitConnectionListPublicDto = await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: gitConnectionsApiRoot,
	});

	return response.data;
};

export const fetchGitConnection = async (
	context: PublicApiContext,
	id: string,
): Promise<GitConnection> =>
	await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `${gitConnectionsApiRoot}/${id}`,
	});

export const createGitConnection = async (
	context: PublicApiContext,
	payload: CreateGitConnectionDto,
): Promise<GitConnection> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: gitConnectionsApiRoot,
		data: payload,
	});

export const updateGitConnection = async (
	context: PublicApiContext,
	id: string,
	payload: UpdateGitConnectionDto,
): Promise<GitConnection> =>
	await request({
		method: 'PUT',
		baseURL: context.baseUrl,
		endpoint: `${gitConnectionsApiRoot}/${id}`,
		data: payload,
	});

export const deleteGitConnection = async (context: PublicApiContext, id: string): Promise<void> => {
	await request({
		method: 'DELETE',
		baseURL: context.baseUrl,
		endpoint: `${gitConnectionsApiRoot}/${id}`,
	});
};
