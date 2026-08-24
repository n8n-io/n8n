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

export const fetchGitConnections = async (
	context: PublicApiContext,
): Promise<GitConnectionSummary[]> => {
	const response = (await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: gitConnectionsApiRoot,
	})) as GitConnectionListPublicDto;

	return response.data;
};

export const fetchGitConnection = async (
	context: PublicApiContext,
	id: string,
): Promise<GitConnection> =>
	(await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `${gitConnectionsApiRoot}/${id}`,
	})) as GitConnection;

export const createGitConnection = async (
	context: PublicApiContext,
	payload: CreateGitConnectionDto,
): Promise<GitConnection> =>
	(await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: gitConnectionsApiRoot,
		data: payload,
	})) as GitConnection;

export const updateGitConnection = async (
	context: PublicApiContext,
	id: string,
	payload: UpdateGitConnectionDto,
): Promise<GitConnection> =>
	(await request({
		method: 'PUT',
		baseURL: context.baseUrl,
		endpoint: `${gitConnectionsApiRoot}/${id}`,
		data: payload,
	})) as GitConnection;

export const deleteGitConnection = async (context: PublicApiContext, id: string): Promise<void> => {
	await request({
		method: 'DELETE',
		baseURL: context.baseUrl,
		endpoint: `${gitConnectionsApiRoot}/${id}`,
	});
};
