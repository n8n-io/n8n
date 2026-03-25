import type {
	DocumentQuestionAnsweringInput,
	DocumentQuestionAnsweringInputData,
	DocumentQuestionAnsweringOutput,
} from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options, RequestArgs } from "../../types.js";
import { base64FromBytes } from "../../utils/base64FromBytes.js";
import { innerRequest } from "../../utils/request.js";

/// Override the type to properly set inputs.image as Blob
export type DocumentQuestionAnsweringArgs = BaseArgs &
	DocumentQuestionAnsweringInput & { inputs: DocumentQuestionAnsweringInputData & { image: Blob } };

/**
 * Answers a question on a document image. Recommended model: impira/layoutlm-document-qa.
 */
export async function documentQuestionAnswering(
	args: DocumentQuestionAnsweringArgs,
	options?: Options
): Promise<DocumentQuestionAnsweringOutput[number]> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "document-question-answering");
	const reqArgs: RequestArgs = {
		...args,
		inputs: {
			question: args.inputs.question,
			// convert Blob or ArrayBuffer to base64
			image: base64FromBytes(new Uint8Array(await args.inputs.image.arrayBuffer())),
		},
	} as RequestArgs;
	const { data: res } = await innerRequest<DocumentQuestionAnsweringOutput | DocumentQuestionAnsweringOutput[number]>(
		reqArgs,
		providerHelper,
		{
			...options,
			task: "document-question-answering",
		}
	);
	return providerHelper.getResponse(res);
}
