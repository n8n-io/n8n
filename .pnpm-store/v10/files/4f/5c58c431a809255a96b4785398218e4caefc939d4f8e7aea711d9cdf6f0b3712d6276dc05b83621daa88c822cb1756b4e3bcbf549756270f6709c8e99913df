import type { ImageToTextInput, ImageToTextOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";
import type { LegacyImageInput } from "./utils.js";
import { preparePayload } from "./utils.js";

export type ImageToTextArgs = BaseArgs & (ImageToTextInput | LegacyImageInput);
/**
 * This task reads some image input and outputs the text caption.
 */
export async function imageToText(args: ImageToTextArgs, options?: Options): Promise<ImageToTextOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "image-to-text");
	const payload = preparePayload(args);
	const { data: res } = await innerRequest<[ImageToTextOutput]>(payload, providerHelper, {
		...options,
		task: "image-to-text",
	});

	return providerHelper.getResponse(res[0]);
}
