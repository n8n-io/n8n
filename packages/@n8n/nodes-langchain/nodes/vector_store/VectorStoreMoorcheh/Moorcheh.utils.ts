import type { IDataObject } from 'n8n-workflow';

export type MoorchehCredential = {
	apiKey: string;
	baseUrl?: string;
};

export interface MoorchehVector {
	id: string;
	vector: number[];
	metadata?: Record<string, any>;
}

export interface MoorchehSearchResult {
	id: string;
	score: number;
	label?: string;
	metadata?: Record<string, any>;
}

export interface MoorchehNamespace {
	name: string;
	type: 'text' | 'vector';
	vector_dimension?: number;
}

export class MoorchehClient {
	private apiKey: string;
	private baseUrl: string;

	constructor(credentials: MoorchehCredential) {
		this.apiKey = credentials.apiKey;
		this.baseUrl = credentials.baseUrl || 'https://api.moorcheh.ai/v1';
	}

	private async makeRequest(method: string, endpoint: string, body?: any): Promise<any> {
		const url = `${this.baseUrl}${endpoint}`;
		const headers = {
			'x-api-key': this.apiKey,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		};

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			throw new Error(`Moorcheh API error: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	async createNamespace(
		name: string,
		type: 'text' | 'vector',
		vectorDimension?: number,
	): Promise<void> {
		const body: any = {
			namespace_name: name,
			type,
		};

		if (type === 'vector' && vectorDimension) {
			body.vector_dimension = vectorDimension;
		}

		await this.makeRequest('POST', '/namespaces', body);
	}

	async listNamespaces(): Promise<MoorchehNamespace[]> {
		const res = await this.makeRequest('GET', '/namespaces');
		if (Array.isArray(res)) return res as MoorchehNamespace[];
		if (res && Array.isArray((res as any).namespaces))
			return (res as any).namespaces as MoorchehNamespace[];
		if (res && Array.isArray((res as any).data)) return (res as any).data as MoorchehNamespace[];
		return [];
	}

	async deleteNamespace(name: string): Promise<void> {
		await this.makeRequest('DELETE', `/namespaces/${name}`);
	}

	async uploadVectors(namespace: string, vectors: MoorchehVector[]): Promise<void> {
		const body = {
			vectors: vectors.map((vec) => ({
				id: vec.id,
				vector: vec.vector,
				metadata: vec.metadata ?? {},
			})),
		};

		await this.makeRequest('POST', `/namespaces/${namespace}/vectors`, body);
	}

	async deleteVectors(namespace: string, ids: string[]): Promise<void> {
		const body = { ids };
		await this.makeRequest('POST', `/namespaces/${namespace}/vectors/delete`, body);
	}

	async search(
		query: string | number[],
		namespaces: string[],
		topK: number = 10,
		_filter?: IDataObject,
	): Promise<MoorchehSearchResult[]> {
		const body: Record<string, any> = {
			query: Array.isArray(query) ? query : query,
			namespaces,
			top_k: topK,
		};

		const res = await this.makeRequest('POST', '/search', body);

		// Normalize API responses to a flat array of results
		if (Array.isArray(res)) return res as MoorchehSearchResult[];
		if (res && Array.isArray((res as any).results))
			return (res as any).results as MoorchehSearchResult[];
		if (res && Array.isArray((res as any).data)) return (res as any).data as MoorchehSearchResult[];
		return [];
	}
}

export function createMoorchehClient(credentials: MoorchehCredential): MoorchehClient {
	return new MoorchehClient(credentials);
}
