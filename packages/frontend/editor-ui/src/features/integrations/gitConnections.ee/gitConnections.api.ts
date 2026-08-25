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

// The server stops handing out cursors once the list is exhausted; this only
// guards against a browser-hanging loop if it ever does not.
const MAX_PAGES = 20;

export const fetchGitConnections = async (
	context: PublicApiContext,
): Promise<GitConnectionSummary[]> => {
	const connections: GitConnectionSummary[] = [];
	let cursor: string | null = null;

	for (let page = 0; page < MAX_PAGES; page++) {
		const response = (await request({
			method: 'GET',
			baseURL: context.baseUrl,
			endpoint: gitConnectionsApiRoot,
			// The cursor carries the page size, so it is the whole query after page one.
			...(cursor ? { data: { cursor } } : {}),
		})) as GitConnectionListPublicDto;

		connections.push(...response.data);
		cursor = response.nextCursor;
		if (!cursor) break;
	}

	return connections;
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
