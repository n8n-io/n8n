import { HF_HUB_URL } from "../config.js";
import { isUrl } from "./isUrl.js";

/**
 * We want to make calls to the huggingface hub the least possible, eg if
 * someone is calling Inference Endpoints 1000 times per second, we don't want
 * to make 1000 calls to the hub to get the task name.
 */
const taskCache = new Map<string, { task: string; date: Date }>();
const CACHE_DURATION = 10 * 60 * 1000;
const MAX_CACHE_ITEMS = 1000;

export interface DefaultTaskOptions {
	fetch?: typeof fetch;
}

/**
 * Get the default task. Use a LRU cache of 1000 items with 10 minutes expiration
 * to avoid making too many calls to the HF hub.
 *
 * @returns The default task for the model, or `null` if it was impossible to get it
 */
export async function getDefaultTask(
	model: string,
	accessToken: string | undefined,
	options?: DefaultTaskOptions
): Promise<string | null> {
	if (isUrl(model)) {
		return null;
	}

	const key = `${model}:${accessToken}`;
	let cachedTask = taskCache.get(key);

	if (cachedTask && cachedTask.date < new Date(Date.now() - CACHE_DURATION)) {
		taskCache.delete(key);
		cachedTask = undefined;
	}

	if (cachedTask === undefined) {
		const modelTask = await (options?.fetch ?? fetch)(`${HF_HUB_URL}/api/models/${model}?expand[]=pipeline_tag`, {
			headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
		})
			.then((resp) => resp.json())
			.then((json) => json.pipeline_tag)
			.catch(() => null);

		if (!modelTask) {
			return null;
		}

		cachedTask = { task: modelTask, date: new Date() };
		taskCache.set(key, { task: modelTask, date: new Date() });

		if (taskCache.size > MAX_CACHE_ITEMS) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			taskCache.delete(taskCache.keys().next().value!);
		}
	}

	return cachedTask.task;
}
