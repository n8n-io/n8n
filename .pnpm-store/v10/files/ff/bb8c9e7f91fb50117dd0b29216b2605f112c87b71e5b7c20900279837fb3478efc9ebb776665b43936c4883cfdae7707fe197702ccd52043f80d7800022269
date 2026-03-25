import type { TextToVideoInput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { makeRequestOptions } from "../../lib/makeRequestOptions.js";
import type { FalAiQueueOutput } from "../../providers/fal-ai.js";
import type { NovitaAsyncAPIOutput } from "../../providers/novita.js";
import type { ReplicateOutput } from "../../providers/replicate.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

export type TextToVideoArgs = BaseArgs & TextToVideoInput;

export type TextToVideoOutput = Blob;

export async function textToVideo(args: TextToVideoArgs, options?: Options): Promise<TextToVideoOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "text-to-video");
	const { data: response } = await innerRequest<FalAiQueueOutput | ReplicateOutput | NovitaAsyncAPIOutput>(
		args,
		providerHelper,
		{
			...options,
			task: "text-to-video",
		}
	);
	const { url, info } = await makeRequestOptions(args, providerHelper, { ...options, task: "text-to-video" });
	return providerHelper.getResponse(response, url, info.headers as Record<string, string>);
}
