import { baseUrl, bearerHeaders, byName, getJson, idsToModels, type IdItem } from '../request';
import type { ListModelsFn } from '../types';

/** Source: LmChatNvidia `loadOptions` routing — mirrors NEMOTRON_SUPPORTED_MODELS. */
const NVIDIA_SUPPORTED_MODELS = new Set([
	'nvidia/llama-3.1-nemotron-nano-8b-v1',
	'nvidia/llama-3.3-nemotron-super-49b-v1',
	'nvidia/llama-3.3-nemotron-super-49b-v1.5',
	'nvidia/nemotron-3-nano-30b-a3b',
	'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
	'nvidia/nemotron-3-super-120b-a12b',
	'nvidia/nemotron-nano-12b-v2-vl',
	'nvidia/nvidia-nemotron-nano-9b-v2',
]);

export const listNvidiaModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://integrate.api.nvidia.com/v1')}/models`,
		bearerHeaders(options),
		options,
		'nvidia',
	)) as { data?: IdItem[] };

	return idsToModels(data.data ?? [])
		.filter((model) => NVIDIA_SUPPORTED_MODELS.has(model.id))
		.sort(byName);
};
