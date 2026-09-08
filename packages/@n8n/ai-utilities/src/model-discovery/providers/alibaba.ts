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
	return idsToModels(data.data ?? []).sort(byName);
};
