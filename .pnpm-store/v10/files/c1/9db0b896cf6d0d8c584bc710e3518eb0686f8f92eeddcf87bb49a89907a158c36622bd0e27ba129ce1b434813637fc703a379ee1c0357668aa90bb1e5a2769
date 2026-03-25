import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { preparePayload } from "./utils.js";
/**
 * This task reads some audio input and outputs one or multiple audio files.
 * Example model: speechbrain/sepformer-wham does audio source separation.
 */
export async function audioToAudio(args, options) {
    const model = "inputs" in args ? args.model : undefined;
    const provider = await resolveProvider(args.provider, model);
    const providerHelper = getProviderHelper(provider, "audio-to-audio");
    const payload = preparePayload(args);
    const { data: res } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "audio-to-audio",
    });
    return providerHelper.getResponse(res);
}
