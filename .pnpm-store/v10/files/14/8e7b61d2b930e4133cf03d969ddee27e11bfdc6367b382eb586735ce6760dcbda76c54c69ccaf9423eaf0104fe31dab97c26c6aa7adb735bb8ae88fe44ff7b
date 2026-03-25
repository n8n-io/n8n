import type { FillMaskInput, FillMaskOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type FillMaskArgs = BaseArgs & FillMaskInput;

/**
 * Tries to fill in a hole with a missing word (token to be precise). That’s the base task for BERT models.
 */
export async function fillMask(args: FillMaskArgs, options?: Options): Promise<FillMaskOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "fill-mask");
	const { data: res } = await innerRequest<FillMaskOutput>(args, providerHelper, {
		...options,
		task: "fill-mask",
	});
	return providerHelper.getResponse(res);
}
