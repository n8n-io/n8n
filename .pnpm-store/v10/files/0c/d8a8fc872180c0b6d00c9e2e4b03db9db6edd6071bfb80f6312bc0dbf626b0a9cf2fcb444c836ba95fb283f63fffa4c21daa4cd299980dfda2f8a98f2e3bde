import type { TextClassificationInput, TextClassificationOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type TextClassificationArgs = BaseArgs & TextClassificationInput;

/**
 * Usually used for sentiment-analysis this will output the likelihood of classes of an input. Recommended model: distilbert-base-uncased-finetuned-sst-2-english
 */
export async function textClassification(
	args: TextClassificationArgs,
	options?: Options
): Promise<TextClassificationOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "text-classification");
	const { data: res } = await innerRequest<TextClassificationOutput>(args, providerHelper, {
		...options,
		task: "text-classification",
	});
	return providerHelper.getResponse(res);
}
