import type {
	VisualQuestionAnsweringInput,
	VisualQuestionAnsweringInputData,
	VisualQuestionAnsweringOutput,
} from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options, RequestArgs } from "../../types.js";
import { base64FromBytes } from "../../utils/base64FromBytes.js";
import { innerRequest } from "../../utils/request.js";

/// Override the type to properly set inputs.image as Blob
export type VisualQuestionAnsweringArgs = BaseArgs &
	VisualQuestionAnsweringInput & { inputs: VisualQuestionAnsweringInputData & { image: Blob } };

/**
 * Answers a question on an image. Recommended model: dandelin/vilt-b32-finetuned-vqa.
 */
export async function visualQuestionAnswering(
	args: VisualQuestionAnsweringArgs,
	options?: Options
): Promise<VisualQuestionAnsweringOutput[number]> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "visual-question-answering");
	const reqArgs: RequestArgs = {
		...args,
		inputs: {
			question: args.inputs.question,
			// convert Blob or ArrayBuffer to base64
			image: base64FromBytes(new Uint8Array(await args.inputs.image.arrayBuffer())),
		},
	} as RequestArgs;

	const { data: res } = await innerRequest<VisualQuestionAnsweringOutput>(reqArgs, providerHelper, {
		...options,
		task: "visual-question-answering",
	});
	return providerHelper.getResponse(res);
}
