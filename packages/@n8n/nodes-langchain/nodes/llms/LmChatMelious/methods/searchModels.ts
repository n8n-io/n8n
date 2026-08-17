import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

export const DEFAULT_MELIOUS_CHAT_MODEL = 'glm-5.1';

/**
 * Melious serves chat, embedding, image, audio and guardrail models from the same
 * `/models` endpoint. `include_meta=true` adds the `_meta.type` discriminator, which
 * is the only way to tell them apart — there is no server-side type filter.
 */
interface MeliousModel {
	id: string;
	_meta?: { type?: string };
}

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<{ url: string }>('meliousApi');

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'meliousApi', {
		url: `${credentials.url}/models`,
		qs: { include_meta: true },
	})) as { data?: MeliousModel[] };

	const search = filter?.toLowerCase();

	const results: INodeListSearchItems[] = (response.data ?? [])
		// Keep unannotated models: if the metadata ever goes away, an unfiltered list
		// beats an empty dropdown.
		.filter((model) => (model._meta?.type ?? 'chat') === 'chat')
		.map((model) => model.id)
		.filter((id) => !search || id.toLowerCase().includes(search))
		.sort((a, b) => a.localeCompare(b))
		.map((id) => ({ name: id, value: id }));

	return { results };
}
