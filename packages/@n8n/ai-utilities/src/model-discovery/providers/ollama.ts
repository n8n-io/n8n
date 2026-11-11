import { z } from 'zod';

import { baseUrl, bearerHeaders, byName, getJson } from '../request';
import type { ListModelsFn, ProviderModel } from '../types';

const DISCOVERY_TIMEOUT_MS = 10_000;
const METADATA_CONCURRENCY = 4;

const tagsSchema = z.object({ models: z.array(z.unknown()) });
const modelSchema = z.object({ name: z.string().min(1) });
const showSchema = z.object({
	capabilities: z.array(z.string()).optional(),
	model_info: z.record(z.string(), z.unknown()).optional(),
});

/** Discover the server's installed models. Enrich them with native Ollama metadata. */
export const listOllamaModels: ListModelsFn = async (options) => {
	const base = baseUrl(options, 'http://localhost:11434');
	const headers = options.apiKey ? bearerHeaders(options) : {};
	const signal = AbortSignal.timeout(DISCOVERY_TIMEOUT_MS);
	const data = tagsSchema.parse(
		await getJson(`${base}/api/tags`, headers, options, 'ollama', { signal }),
	);
	const names = new Set<string>();
	for (const entry of data.models) {
		const parsed = modelSchema.safeParse(entry);
		if (parsed.success) names.add(parsed.data.name);
	}

	const models: ProviderModel[] = [];
	const modelNames = [...names];
	// Limit concurrent metadata requests to avoid overloading a local server.
	for (let offset = 0; offset < modelNames.length; offset += METADATA_CONCURRENCY) {
		const batch = await Promise.all(
			modelNames
				.slice(offset, offset + METADATA_CONCURRENCY)
				.map(async (name): Promise<ProviderModel | undefined> => {
					const model: ProviderModel = { id: name, name };
					try {
						const details = showSchema.parse(
							await getJson(
								`${base}/api/show`,
								{ ...headers, 'Content-Type': 'application/json' },
								options,
								'ollama',
								{ method: 'POST', body: JSON.stringify({ model: name }), signal },
							),
						);
						const { capabilities, model_info: info } = details;
						// Embedding-only models cannot answer chat requests.
						if (capabilities && !capabilities.includes('completion')) return undefined;
						const architecture = info?.['general.architecture'];
						const context =
							typeof architecture === 'string'
								? info?.[`${architecture}.context_length`]
								: undefined;
						model.metadata = {
							...(capabilities
								? {
										toolCall: capabilities.includes('tools'),
										reasoning: capabilities.includes('thinking'),
									}
								: {}),
							...(typeof context === 'number' && Number.isFinite(context) && context > 0
								? { limits: { context } }
								: {}),
						};
					} catch {
						// Listing remains useful when an older server or proxy cannot return metadata.
					}
					return model;
				}),
		);
		for (const model of batch) {
			if (model) models.push(model);
		}
	}
	return models.sort(byName);
};
