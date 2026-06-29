export interface AiqCollection {
	name: string;
	description?: string;
	metadata?: Record<string, unknown>;
}

export interface AiqDocument {
	file_id: string;
	filename?: string;
	name?: string;
	metadata?: Record<string, unknown>;
	status?: string;
}

export interface AiqUploadResponse {
	job_id: string;
	file_ids: string[];
	message?: string;
}

export interface AiqJobStatus {
	status: 'completed' | 'failed' | 'running' | 'pending' | string;
	message?: string;
	error?: string;
}

export type AiqHealthStatus = 'idle' | 'checking' | 'available' | 'unavailable';

export class AiqKnowledgeApiError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message);
		this.name = 'AiqKnowledgeApiError';
	}
}

export function normalizeAiqBaseUrl(baseUrl: string): string {
	return baseUrl.trim().replace(/\/+$/, '');
}

async function aiqFetch<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${normalizeAiqBaseUrl(baseUrl)}${path}`, init);
	} catch (error) {
		throw new AiqKnowledgeApiError(
			error instanceof Error ? error.message : 'Could not connect to AI-Q.',
		);
	}

	if (!response.ok) {
		throw new AiqKnowledgeApiError(await response.text(), response.status);
	}

	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}

export async function getAiqHealth(baseUrl: string): Promise<unknown> {
	return await aiqFetch<unknown>(baseUrl, '/v1/knowledge/health');
}

export async function listAiqCollections(baseUrl: string): Promise<AiqCollection[]> {
	const response = await aiqFetch<AiqCollection[] | { collections?: AiqCollection[] }>(
		baseUrl,
		'/v1/collections',
	);
	return Array.isArray(response) ? response : (response.collections ?? []);
}

export async function createAiqCollection(
	baseUrl: string,
	collection: AiqCollection,
): Promise<AiqCollection> {
	return await aiqFetch<AiqCollection>(baseUrl, '/v1/collections', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(collection),
	});
}

export async function deleteAiqCollection(baseUrl: string, name: string): Promise<void> {
	await aiqFetch<void>(baseUrl, `/v1/collections/${encodeURIComponent(name)}`, {
		method: 'DELETE',
	});
}

export async function getAiqCollection(baseUrl: string, name: string): Promise<AiqCollection> {
	return await aiqFetch<AiqCollection>(baseUrl, `/v1/collections/${encodeURIComponent(name)}`);
}

export async function listAiqDocuments(
	baseUrl: string,
	collectionName: string,
): Promise<AiqDocument[]> {
	const response = await aiqFetch<AiqDocument[] | { documents?: AiqDocument[] }>(
		baseUrl,
		`/v1/collections/${encodeURIComponent(collectionName)}/documents`,
	);
	return Array.isArray(response) ? response : (response.documents ?? []);
}

export async function uploadAiqDocuments(
	baseUrl: string,
	collectionName: string,
	files: File[],
): Promise<AiqUploadResponse> {
	const formData = new FormData();
	for (const file of files) {
		formData.append('files', file);
	}

	return await aiqFetch<AiqUploadResponse>(
		baseUrl,
		`/v1/collections/${encodeURIComponent(collectionName)}/documents`,
		{
			method: 'POST',
			body: formData,
		},
	);
}

export async function getAiqJobStatus(baseUrl: string, jobId: string): Promise<AiqJobStatus> {
	return await aiqFetch<AiqJobStatus>(baseUrl, `/v1/documents/${encodeURIComponent(jobId)}/status`);
}

export async function deleteAiqDocuments(
	baseUrl: string,
	collectionName: string,
	fileIds: string[],
): Promise<void> {
	await aiqFetch<void>(baseUrl, `/v1/collections/${encodeURIComponent(collectionName)}/documents`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ file_ids: fileIds }),
	});
}
