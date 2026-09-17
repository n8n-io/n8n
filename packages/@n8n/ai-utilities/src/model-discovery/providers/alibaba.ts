import {
	baseUrl,
	bearerHeaders,
	byName,
	ensureUrlPathSuffix,
	getJson,
	idsToModels,
} from '../request';
import type { IdItem } from '../request';
import type { ListModelsFn } from '../types';

const COMPATIBLE_MODE_SUFFIX = '/compatible-mode/v1';
const DEFAULT_BASE_URL = `https://dashscope-intl.aliyuncs.com${COMPATIBLE_MODE_SUFFIX}`;

/**
 * Keep only chat-capable Qwen models. DashScope's OpenAI-compatible `/models`
 * lists non-chat models with no capability field, so filter by id: drop
 * embedding, reranking, image-generation (`qwen-image-*`), machine translation
 * (`qwen-mt-*`) and Wan media models. Wan ids carry the modality as a token:
 * `t2i` (text-to-image), `i2i` (image-to-image), `t2v` (text-to-video) and
 * `i2v` (image-to-video), for example `wan2.6-t2i`.
 */
export function shouldIncludeAlibabaModel(id: string): boolean {
	return (
		!id.includes('embedding') &&
		!id.includes('rerank') &&
		!id.includes('image') &&
		!id.includes('-mt-') &&
		!id.includes('t2i') &&
		!id.includes('i2i') &&
		!id.includes('t2v') &&
		!id.includes('i2v')
	);
}

/**
 * Source: LmChatAlibabaCloud `loadOptions` routing.
 *
 * n8n Alibaba credentials store the region's bare host — Alibaba serves its
 * native and its OpenAI-compatible API under different paths on that host —
 * so a caller-supplied `baseURL` needs the compatible-mode path appended.
 */
export const listAlibabaModels: ListModelsFn = async (options) => {
	const resolvedBaseUrl = ensureUrlPathSuffix(
		baseUrl(options, DEFAULT_BASE_URL),
		COMPATIBLE_MODE_SUFFIX,
	);
	const data = (await getJson(
		`${resolvedBaseUrl}/models`,
		bearerHeaders(options),
		options,
		'alibaba',
	)) as { data?: IdItem[] };
	return idsToModels(data.data ?? [])
		.filter((model) => shouldIncludeAlibabaModel(model.id))
		.sort(byName);
};
