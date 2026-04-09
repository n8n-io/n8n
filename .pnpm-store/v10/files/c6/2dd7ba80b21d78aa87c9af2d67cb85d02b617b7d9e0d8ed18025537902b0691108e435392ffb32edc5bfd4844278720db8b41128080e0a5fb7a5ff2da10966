import type { ImageTextToImageInput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type ImageTextToImageArgs = BaseArgs & ImageTextToImageInput;

/**
 * This task takes an image and text input and outputs a new generated image.
 * Recommended model: black-forest-labs/FLUX.2-dev
 */
export async function imageTextToImage(args: ImageTextToImageArgs, options?: Options): Promise<Blob> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "image-text-to-image");
	const payload = await providerHelper.preparePayloadAsync(args);
	const { data: res, requestContext } = await innerRequest<Blob>(payload, providerHelper, {
		...options,
		task: "image-text-to-image",
	});
	return providerHelper.getResponse(res, requestContext.url, requestContext.info.headers as Record<string, string>);
}
