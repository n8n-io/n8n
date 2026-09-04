import { baseUrl, bearerHeaders, byName, getJson, idsToModels, type IdItem } from '../request';
import type { ListModelsFn } from '../types';

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

/**
 * Verified chat models on Volcengine Ark.
 * Ark's GET /models returns hundreds of internal/experimental/unreleased items
 * (e.g. test-v1, ddd-1.0.0, as well as unactivated model IDs that 404 on chat),
 * so we filter to the verified Doubao Seed chat models.
 */
const VOLCENGINE_SUPPORTED_MODELS = new Set([
	'doubao-seed-2-1-pro-260628',
	'doubao-seed-2-1-turbo-260628',
	'doubao-seed-2-0-pro-260215',
	'doubao-seed-2-0-lite-260428',
	'doubao-seed-2-0-mini-260428',
	'doubao-seed-2-0-code-preview-260215',
	'doubao-seed-1-8-251228',
	'doubao-seed-1-6-251015',
	'doubao-seed-1-6-flash-250828',
	'doubao-seed-1-6-vision-250815',
	'doubao-seed-character-260628',
	'doubao-seed-evolving',
]);

/**
 * Source: Volcengine Ark `/models` standard bearer listing filtered to supported models.
 */
export const listVolcengineModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, DEFAULT_BASE_URL)}/models`,
		bearerHeaders(options),
		options,
		'volcengine',
	)) as { data?: IdItem[] };

	return idsToModels(data.data ?? [])
		.filter((model) => VOLCENGINE_SUPPORTED_MODELS.has(model.id))
		.sort(byName);
};
