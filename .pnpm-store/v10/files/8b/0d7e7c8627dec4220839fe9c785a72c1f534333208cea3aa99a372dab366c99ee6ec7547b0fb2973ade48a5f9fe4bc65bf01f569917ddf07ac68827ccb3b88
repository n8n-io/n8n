import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { AutoRouterConversationalTask } from "../../providers/providerHelper.js";
/**
 * Use the chat completion endpoint to generate a response to a prompt, using OpenAI message completion API no stream
 */
export async function chatCompletion(args, options) {
    let providerHelper;
    if (!args.provider || args.provider === "auto") {
        // Special case: we have a dedicated auto-router for conversational models. No need to fetch provider mapping.
        providerHelper = new AutoRouterConversationalTask();
    }
    else {
        const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
        providerHelper = getProviderHelper(provider, "conversational");
    }
    const { data: response } = await innerRequest(args, providerHelper, {
        ...options,
        task: "conversational",
    });
    return providerHelper.getResponse(response);
}
