import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * This task reads some audio input and outputs the said words within the audio files.
 * Recommended model (english language): facebook/wav2vec2-large-960h-lv60-self
 */
export async function automaticSpeechRecognition(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "automatic-speech-recognition");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "automatic-speech-recognition",
    });
    return providerHelper.getResponse(res);
}
