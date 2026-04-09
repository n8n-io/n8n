import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { InferenceTask, Options, RequestArgs } from "../../types.js";
import { innerRequest } from "../../utils/request.js";
import { getLogger } from "../../lib/logger.js";

/**
 * Primitive to make custom calls to the inference provider
 * @deprecated Use specific task functions instead. This function will be removed in a future version.
 */
export async function request<T>(
	args: RequestArgs,
	options?: Options & {
		/** In most cases (unless we pass a endpointUrl) we know the task */
		task?: InferenceTask;
	},
): Promise<T> {
	const logger = getLogger();
	logger.warn(
		"The request method is deprecated and will be removed in a future version of huggingface.js. Use specific task functions instead.",
	);
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, options?.task);
	const result = await innerRequest<T>(args, providerHelper, options);
	return result.data;
}
