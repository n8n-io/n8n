import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerStreamingRequest } from "../../utils/request.js";
import { AutoRouterConversationalTask } from "../../providers/providerHelper.js";
/**
 * Use to continue text from a prompt. Same as `textGeneration` but returns generator that can be read one token at a time
 */
export async function* chatCompletionStream(args, options) {
    let providerHelper;
    if (!args.provider || args.provider === "auto") {
        // Special case: we have a dedicated auto-router for conversational models. No need to fetch provider mapping.
        providerHelper = new AutoRouterConversationalTask();
    }
    else {
        const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
        providerHelper = getProviderHelper(provider, "conversational");
    }
    yield* innerStreamingRequest(args, providerHelper, {
        ...options,
        task: "conversational",
    });
}
