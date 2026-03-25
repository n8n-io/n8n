import type { AudioClassificationInput, AudioClassificationOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";
import type { LegacyAudioInput } from "./utils.js";
import { preparePayload } from "./utils.js";

export type AudioClassificationArgs = BaseArgs & (AudioClassificationInput | LegacyAudioInput);

/**
 * This task reads some audio input and outputs the likelihood of classes.
 * Recommended model:  superb/hubert-large-superb-er
 */
export async function audioClassification(
	args: AudioClassificationArgs,
	options?: Options
): Promise<AudioClassificationOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "audio-classification");
	const payload = preparePayload(args);
	const { data: res } = await innerRequest<AudioClassificationOutput>(payload, providerHelper, {
		...options,
		task: "audio-classification",
	});

	return providerHelper.getResponse(res);
}
