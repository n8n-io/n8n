import type { ZeroShotImageClassificationInput, ZeroShotImageClassificationOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options, RequestArgs } from "../../types.js";
import { base64FromBytes } from "../../utils/base64FromBytes.js";
import { innerRequest } from "../../utils/request.js";

/**
 * @deprecated
 */
interface LegacyZeroShotImageClassificationInput {
	inputs: { image: Blob | ArrayBuffer };
}

export type ZeroShotImageClassificationArgs = BaseArgs &
	(ZeroShotImageClassificationInput | LegacyZeroShotImageClassificationInput);

async function preparePayload(args: ZeroShotImageClassificationArgs): Promise<RequestArgs> {
	if (args.inputs instanceof Blob) {
		return {
			...args,
			inputs: {
				image: base64FromBytes(new Uint8Array(await args.inputs.arrayBuffer())),
			},
		};
	} else {
		return {
			...args,
			inputs: {
				image: base64FromBytes(
					new Uint8Array(
						args.inputs.image instanceof ArrayBuffer ? args.inputs.image : await args.inputs.image.arrayBuffer()
					)
				),
			},
		};
	}
}

/**
 * Classify an image to specified classes.
 * Recommended model: openai/clip-vit-large-patch14-336
 */
export async function zeroShotImageClassification(
	args: ZeroShotImageClassificationArgs,
	options?: Options
): Promise<ZeroShotImageClassificationOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "zero-shot-image-classification");
	const payload = await preparePayload(args);
	const { data: res } = await innerRequest<ZeroShotImageClassificationOutput>(payload, providerHelper, {
		...options,
		task: "zero-shot-image-classification",
	});
	return providerHelper.getResponse(res);
}
