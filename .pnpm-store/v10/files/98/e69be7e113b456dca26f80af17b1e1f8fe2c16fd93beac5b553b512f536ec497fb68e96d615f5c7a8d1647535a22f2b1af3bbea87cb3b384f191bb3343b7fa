import type { TextToImageInput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { makeRequestOptions } from "../../lib/makeRequestOptions.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type TextToImageArgs = BaseArgs & TextToImageInput;

interface TextToImageOptions extends Options {
	outputType?: "url" | "blob";
}

/**
 * This task reads some text input and outputs an image.
 * Recommended model: stabilityai/stable-diffusion-2
 */
export async function textToImage(
	args: TextToImageArgs,
	options?: TextToImageOptions & { outputType: "url" }
): Promise<string>;
export async function textToImage(
	args: TextToImageArgs,
	options?: TextToImageOptions & { outputType?: undefined | "blob" }
): Promise<Blob>;
export async function textToImage(args: TextToImageArgs, options?: TextToImageOptions): Promise<Blob | string> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "text-to-image");
	const { data: res } = await innerRequest<Record<string, unknown>>(args, providerHelper, {
		...options,
		task: "text-to-image",
	});

	const { url, info } = await makeRequestOptions(args, providerHelper, { ...options, task: "text-to-image" });
	return providerHelper.getResponse(res, url, info.headers as Record<string, string>, options?.outputType);
}
