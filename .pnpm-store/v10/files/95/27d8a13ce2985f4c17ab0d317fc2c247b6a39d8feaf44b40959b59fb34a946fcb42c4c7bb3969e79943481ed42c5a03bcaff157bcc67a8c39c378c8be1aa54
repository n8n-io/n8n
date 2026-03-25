import type { TranslationInput, TranslationOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type TranslationArgs = BaseArgs & TranslationInput;
/**
 * This task is well known to translate text from one language to another. Recommended model: Helsinki-NLP/opus-mt-ru-en.
 */
export async function translation(args: TranslationArgs, options?: Options): Promise<TranslationOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "translation");
	const { data: res } = await innerRequest<TranslationOutput>(args, providerHelper, {
		...options,
		task: "translation",
	});
	return providerHelper.getResponse(res);
}
