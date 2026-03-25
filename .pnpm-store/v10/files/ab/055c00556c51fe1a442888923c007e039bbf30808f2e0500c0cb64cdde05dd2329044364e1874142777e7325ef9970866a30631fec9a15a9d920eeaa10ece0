import type { ImageClassificationInput, ImageClassificationOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";
import { preparePayload, type LegacyImageInput } from "./utils.js";

export type ImageClassificationArgs = BaseArgs & (ImageClassificationInput | LegacyImageInput);

/**
 * This task reads some image input and outputs the likelihood of classes.
 * Recommended model: google/vit-base-patch16-224
 */
export async function imageClassification(
	args: ImageClassificationArgs,
	options?: Options
): Promise<ImageClassificationOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "image-classification");
	const payload = preparePayload(args);
	const { data: res } = await innerRequest<ImageClassificationOutput>(payload, providerHelper, {
		...options,
		task: "image-classification",
	});
	return providerHelper.getResponse(res);
}
