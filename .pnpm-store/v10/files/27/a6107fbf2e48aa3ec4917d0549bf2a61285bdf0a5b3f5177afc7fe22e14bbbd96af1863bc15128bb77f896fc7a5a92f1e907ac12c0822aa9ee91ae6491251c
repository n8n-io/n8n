import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { InferenceClientProviderOutputError } from "../../errors.js";
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
    const isValidOutput = typeof res?.text === "string";
    if (!isValidOutput) {
        throw new InferenceClientProviderOutputError("Received malformed response from automatic-speech-recognition API");
    }
    return providerHelper.getResponse(res);
}
