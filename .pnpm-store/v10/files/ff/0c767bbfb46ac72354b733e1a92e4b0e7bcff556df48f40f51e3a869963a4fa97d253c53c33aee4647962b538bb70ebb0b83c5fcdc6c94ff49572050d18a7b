import type { ImageToVideoInput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";
import { makeRequestOptions } from "../../lib/makeRequestOptions.js";

export type ImageToVideoArgs = BaseArgs & ImageToVideoInput;

/**
 * This task reads some text input and outputs an image.
 * Recommended model: Wan-AI/Wan2.1-I2V-14B-720P
 */
export async function imageToVideo(args: ImageToVideoArgs, options?: Options): Promise<Blob> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "image-to-video");
	const payload = await providerHelper.preparePayloadAsync(args);
	const { data: res } = await innerRequest<Blob>(payload, providerHelper, {
		...options,
		task: "image-to-video",
	});
	const { url, info } = await makeRequestOptions(args, providerHelper, { ...options, task: "image-to-video" });
	return providerHelper.getResponse(res, url, info.headers as Record<string, string>);
}
