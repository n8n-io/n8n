import type { ImageToImageInput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";
import { makeRequestOptions } from "../../lib/makeRequestOptions.js";

export type ImageToImageArgs = BaseArgs & ImageToImageInput;

/**
 * This task reads some text input and outputs an image.
 * Recommended model: lllyasviel/sd-controlnet-depth
 */
export async function imageToImage(args: ImageToImageArgs, options?: Options): Promise<Blob> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "image-to-image");
	const payload = await providerHelper.preparePayloadAsync(args);
	const { data: res } = await innerRequest<Blob>(payload, providerHelper, {
		...options,
		task: "image-to-image",
	});
	const { url, info } = await makeRequestOptions(args, providerHelper, { ...options, task: "image-to-image" });
	return providerHelper.getResponse(res, url, info.headers as Record<string, string>);
}
