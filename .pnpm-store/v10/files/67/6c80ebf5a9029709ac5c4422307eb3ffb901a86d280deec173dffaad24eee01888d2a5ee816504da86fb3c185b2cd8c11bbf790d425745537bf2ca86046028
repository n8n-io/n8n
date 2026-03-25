import type { TableQuestionAnsweringInput, TableQuestionAnsweringOutput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type TableQuestionAnsweringArgs = BaseArgs & TableQuestionAnsweringInput;

/**
 * Don’t know SQL? Don’t want to dive into a large spreadsheet? Ask questions in plain english! Recommended model: google/tapas-base-finetuned-wtq.
 */
export async function tableQuestionAnswering(
	args: TableQuestionAnsweringArgs,
	options?: Options
): Promise<TableQuestionAnsweringOutput[number]> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "table-question-answering");
	const { data: res } = await innerRequest<TableQuestionAnsweringOutput | TableQuestionAnsweringOutput[number]>(
		args,
		providerHelper,
		{
			...options,
			task: "table-question-answering",
		}
	);
	return providerHelper.getResponse(res);
}
