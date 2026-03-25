import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerStreamingRequest } from "../../utils/request.js";
/**
 * Use to continue text from a prompt. Same as `textGeneration` but returns generator that can be read one token at a time
 */
export async function* chatCompletionStream(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "conversational");
    yield* innerStreamingRequest(args, providerHelper, {
        ...options,
        task: "conversational",
    });
}
