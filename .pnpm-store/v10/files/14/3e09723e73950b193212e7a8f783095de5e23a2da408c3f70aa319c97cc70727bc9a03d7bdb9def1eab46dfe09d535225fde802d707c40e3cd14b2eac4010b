import type { ChatCompletionInput, ChatCompletionStreamOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerStreamingRequest } from "../../utils/request.js";
import type { ConversationalTaskHelper, TaskProviderHelper } from "../../providers/providerHelper.js";
import { AutoRouterConversationalTask } from "../../providers/providerHelper.js";

/**
 * Use to continue text from a prompt. Same as `textGeneration` but returns generator that can be read one token at a time
 */
export async function* chatCompletionStream(
	args: BaseArgs & ChatCompletionInput,
	options?: Options,
): AsyncGenerator<ChatCompletionStreamOutput> {
	let providerHelper: ConversationalTaskHelper & TaskProviderHelper;
	if (!args.provider || args.provider === "auto") {
		// Special case: we have a dedicated auto-router for conversational models. No need to fetch provider mapping.
		providerHelper = new AutoRouterConversationalTask();
	} else {
		const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
		providerHelper = getProviderHelper(provider, "conversational");
	}
	yield* innerStreamingRequest<ChatCompletionStreamOutput>(args, providerHelper, {
		...options,
		task: "conversational",
	});
}
