// ---------------------------------------------------------------------------
// OpenRouter's public model list (no key needed). The own-model resolver uses
// it to route a model to OpenRouter only when OpenRouter really serves it.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';

import type { EvalLogger } from '../harness/logger';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const TIMEOUT_MS = 10_000;

type FetchModels = (url: string, init: RequestInit) => Promise<Response>;

/** Every model OpenRouter lists, as resolver ids (`openrouter/<id>`).
 *  Undefined when the list can't be read: the resolver then trusts its naming rules. */
export async function loadOpenRouterModelIds(
	fetchImpl: FetchModels = fetch,
): Promise<ReadonlySet<string> | undefined> {
	try {
		const response = await fetchImpl(OPENROUTER_MODELS_URL, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		return response.ok ? modelIdsOf(await response.json()) : undefined;
	} catch {
		return undefined;
	}
}

function modelIdsOf(body: unknown): ReadonlySet<string> | undefined {
	if (!isRecord(body) || !Array.isArray(body.data)) return undefined;
	const ids = body.data.flatMap((model: unknown) =>
		isRecord(model) && typeof model.id === 'string' ? [`openrouter/${model.id}`] : [],
	);
	return new Set(ids);
}

/** The list for this run, fetched only when OpenRouter has a real key (the
 *  only time the resolver routes there). */
export async function openRouterModelsForRun(
	availableKeys: ReadonlySet<string>,
	logger: Pick<EvalLogger, 'warn'>,
	fetchImpl: FetchModels = fetch,
): Promise<ReadonlySet<string> | undefined> {
	if (!availableKeys.has('openRouterApi')) return undefined;
	const ids = await loadOpenRouterModelIds(fetchImpl);
	if (!ids) logger.warn('OpenRouter model list unavailable; routing by naming rules only');
	return ids;
}
