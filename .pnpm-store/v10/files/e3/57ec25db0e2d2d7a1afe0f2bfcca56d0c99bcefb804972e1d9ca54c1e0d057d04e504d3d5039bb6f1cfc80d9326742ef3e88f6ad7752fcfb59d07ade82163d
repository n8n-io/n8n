import type { ZeroShotClassificationInput, ZeroShotClassificationOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type ZeroShotClassificationArgs = BaseArgs & ZeroShotClassificationInput;

/**
 * This task is super useful to try out classification with zero code, you simply pass a sentence/paragraph and the possible labels for that sentence, and you get a result. Recommended model: facebook/bart-large-mnli.
 */
export async function zeroShotClassification(
	args: ZeroShotClassificationArgs,
	options?: Options
): Promise<ZeroShotClassificationOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "zero-shot-classification");
	const { data: res } = await innerRequest<ZeroShotClassificationOutput[number] | ZeroShotClassificationOutput>(
		args,
		providerHelper,
		{
			...options,
			task: "zero-shot-classification",
		}
	);
	return providerHelper.getResponse(res);
}
