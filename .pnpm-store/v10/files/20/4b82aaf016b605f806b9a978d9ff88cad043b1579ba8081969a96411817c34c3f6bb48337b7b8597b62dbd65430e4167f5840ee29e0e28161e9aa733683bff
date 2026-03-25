import type { TextToSpeechInput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";
type TextToSpeechArgs = BaseArgs & TextToSpeechInput;

interface OutputUrlTextToSpeechGeneration {
	output: string | string[];
}
/**
 * This task synthesize an audio of a voice pronouncing a given text.
 * Recommended model: espnet/kan-bayashi_ljspeech_vits
 */
export async function textToSpeech(args: TextToSpeechArgs, options?: Options): Promise<Blob> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "text-to-speech");
	const { data: res } = await innerRequest<Blob | OutputUrlTextToSpeechGeneration>(args, providerHelper, {
		...options,
		task: "text-to-speech",
	});
	return providerHelper.getResponse(res);
}
