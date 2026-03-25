import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { base64FromBytes } from "../../utils/base64FromBytes.js";
import { innerRequest } from "../../utils/request.js";
/**
 * Answers a question on a document image. Recommended model: impira/layoutlm-document-qa.
 */
export async function documentQuestionAnswering(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "document-question-answering");
    const reqArgs = {
        ...args,
        inputs: {
            question: args.inputs.question,
            // convert Blob or ArrayBuffer to base64
            image: base64FromBytes(new Uint8Array(await args.inputs.image.arrayBuffer())),
        },
    };
    const { data: res } = await innerRequest(reqArgs, providerHelper, {
        ...options,
        task: "document-question-answering",
    });
    return providerHelper.getResponse(res);
}
