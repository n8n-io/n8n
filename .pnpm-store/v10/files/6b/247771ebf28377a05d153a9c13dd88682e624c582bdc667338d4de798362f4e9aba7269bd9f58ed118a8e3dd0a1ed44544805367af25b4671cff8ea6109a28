import type { TextGenerationInput, TextGenerationOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { HyperbolicTextCompletionOutput } from "../../providers/hyperbolic.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type { TextGenerationInput, TextGenerationOutput };

/**
 * Use to continue text from a prompt. This is a very generic task. Recommended model: gpt2 (it’s a simple model, but fun to play with).
 */
export async function textGeneration(
	args: BaseArgs & TextGenerationInput,
	options?: Options
): Promise<TextGenerationOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "text-generation");
	const { data: response } = await innerRequest<
		HyperbolicTextCompletionOutput | TextGenerationOutput | TextGenerationOutput[]
	>(args, providerHelper, {
		...options,
		task: "text-generation",
	});
	return providerHelper.getResponse(response);
}
