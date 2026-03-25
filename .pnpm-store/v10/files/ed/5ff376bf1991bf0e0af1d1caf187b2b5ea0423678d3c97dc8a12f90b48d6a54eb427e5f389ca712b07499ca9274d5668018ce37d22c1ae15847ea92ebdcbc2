import type { SummarizationInput, SummarizationOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type SummarizationArgs = BaseArgs & SummarizationInput;

/**
 * This task is well known to summarize longer text into shorter text. Be careful, some models have a maximum length of input. That means that the summary cannot handle full books for instance. Be careful when choosing your model.
 */
export async function summarization(args: SummarizationArgs, options?: Options): Promise<SummarizationOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "summarization");
	const { data: res } = await innerRequest<SummarizationOutput[]>(args, providerHelper, {
		...options,
		task: "summarization",
	});
	return providerHelper.getResponse(res);
}
