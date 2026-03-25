import type { ChatCompletionInput, ChatCompletionOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

/**
 * Use the chat completion endpoint to generate a response to a prompt, using OpenAI message completion API no stream
 */
export async function chatCompletion(
	args: BaseArgs & ChatCompletionInput,
	options?: Options
): Promise<ChatCompletionOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "conversational");
	const { data: response } = await innerRequest<ChatCompletionOutput>(args, providerHelper, {
		...options,
		task: "conversational",
	});
	return providerHelper.getResponse(response);
}
