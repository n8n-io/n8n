import { pinPrioritizedModels } from '@n8n/api-types';
import { z } from 'zod';

import { baseUrl, byName, getJson } from '../request';
import type { ListModelsFn } from '../types';

/**
 * Keep only chat-capable Gemini models. A chat model reports `generateContent`
 * in `supportedGenerationMethods`; embedding (`embedContent`), Veo
 * (`predictLongRunning`), Imagen (`predict`) and AQA (`generateAnswer`) models
 * do not, so require that method. Image, TTS and embedding models are dropped
 * by name as well: they return output a chat chain cannot use, and the method
 * check alone does not hold for a proxied list — Gateway credits report
 * `generateContent` for every model they serve, embeddings included.
 */
export function shouldIncludeGoogleModel(model: {
	name: string;
	supportedGenerationMethods?: unknown;
}): boolean {
	const methods = model.supportedGenerationMethods;
	const supportsChat = Array.isArray(methods) && methods.includes('generateContent');
	return (
		supportsChat &&
		!model.name.includes('image') &&
		!model.name.includes('tts') &&
		!model.name.includes('embedding')
	);
}

/**
 * Source: LmChatGoogleGemini `loadOptions` routing (GET /v1beta/models). Ids
 * keep Google's `models/` prefix, matching the node dropdown values. Auth uses
 * the `x-goog-api-key` header (Google's preferred method) rather than the
 * credential's `?key=` query auth, so the key cannot leak through access logs
 * or proxies.
 */
export const listGoogleModels: ListModelsFn = async (options) => {
	const base = baseUrl(options, 'https://generativelanguage.googleapis.com');
	const data = await getJson(
		`${base}/v1beta/models`,
		{ 'x-goog-api-key': options.apiKey },
		options,
		'google',
	);

	const models = parseGoogleModels(data)
		.filter(shouldIncludeGoogleModel)
		.map((model) => ({
			id: model.name,
			name: getGoogleModelLabel(model.name, model.displayName),
			...(model.priority !== undefined ? { priority: model.priority } : {}),
		}))
		.sort(byName);
	return pinPrioritizedModels(models, (model) => model.priority);
};

/** A malformed optional field is dropped; a model without a name is skipped. */
const googleModelSchema = z.object({
	name: z.string(),
	displayName: z.string().optional().catch(undefined),
	priority: z.number().finite().optional().catch(undefined),
	supportedGenerationMethods: z.array(z.string()).optional().catch(undefined),
});

const googleModelsResponseSchema = z.object({
	models: z.array(z.unknown()).optional().catch(undefined),
});

export type GoogleModel = z.infer<typeof googleModelSchema>;

/** Models of a Google `GET /v1beta/models` response. */
export function parseGoogleModels(data: unknown): GoogleModel[] {
	const response = googleModelsResponseSchema.safeParse(data);
	return (response.success ? (response.data.models ?? []) : []).flatMap((item) => {
		const model = googleModelSchema.safeParse(item);
		return model.success ? [model.data] : [];
	});
}

/** Dropdown label of a Google model: the API's `displayName`, else the id. */
export function getGoogleModelLabel(modelId: string, displayName?: string): string {
	return displayName?.trim() || modelId;
}
