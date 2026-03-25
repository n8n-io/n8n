import type { AutomaticSpeechRecognitionInput, AutomaticSpeechRecognitionOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";
import type { LegacyAudioInput } from "./utils.js";
import { InferenceClientProviderOutputError } from "../../errors.js";

export type AutomaticSpeechRecognitionArgs = BaseArgs & (AutomaticSpeechRecognitionInput | LegacyAudioInput);
/**
 * This task reads some audio input and outputs the said words within the audio files.
 * Recommended model (english language): facebook/wav2vec2-large-960h-lv60-self
 */
export async function automaticSpeechRecognition(
	args: AutomaticSpeechRecognitionArgs,
	options?: Options
): Promise<AutomaticSpeechRecognitionOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "automatic-speech-recognition");
	const payload = await providerHelper.preparePayloadAsync(args);
	const { data: res } = await innerRequest<AutomaticSpeechRecognitionOutput>(payload, providerHelper, {
		...options,
		task: "automatic-speech-recognition",
	});
	const isValidOutput = typeof res?.text === "string";
	if (!isValidOutput) {
		throw new InferenceClientProviderOutputError("Received malformed response from automatic-speech-recognition API");
	}
	return providerHelper.getResponse(res);
}
