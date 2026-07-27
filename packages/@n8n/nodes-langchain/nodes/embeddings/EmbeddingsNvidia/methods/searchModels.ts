import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

/**
 * Curated set of NVIDIA NeMo Retriever embedding models that accept the `input_type`
 * parameter (passage/query). Used both as the resourceLocator default and as the allow-list
 * that filters the live `/models` response, so only supported models are ever surfaced.
 * Models that do not take `input_type` (e.g. baai/bge-m3, snowflake/arctic-embed-l) are
 * intentionally excluded because the node always injects it.
 * Update this list as new embedding models become available on build.nvidia.com.
 */
export const NVIDIA_EMBEDDING_MODELS = [
	'nvidia/llama-3.2-nv-embedqa-1b-v2',
	'nvidia/nv-embedqa-e5-v5',
	'nvidia/nv-embed-v1',
	'nvidia/llama-nemotron-embed-1b-v2',
	'nvidia/llama-nemotron-embed-300m-v2',
];

export const DEFAULT_NVIDIA_EMBEDDING_MODEL = 'nvidia/llama-3.2-nv-embedqa-1b-v2';

interface NvidiaModel {
	id: string;
}

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<{ url: string }>('nvidiaApi');

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'nvidiaApi', {
		url: `${credentials.url}/models`,
	})) as { data?: NvidiaModel[] };

	const supported = new Set(NVIDIA_EMBEDDING_MODELS);
	const search = filter?.toLowerCase();

	const results: INodeListSearchItems[] = (response.data ?? [])
		.map((model) => model.id)
		.filter((id) => supported.has(id))
		.filter((id) => !search || id.toLowerCase().includes(search))
		.sort((a, b) => a.localeCompare(b))
		.map((id) => ({ name: id, value: id }));

	return { results };
}
