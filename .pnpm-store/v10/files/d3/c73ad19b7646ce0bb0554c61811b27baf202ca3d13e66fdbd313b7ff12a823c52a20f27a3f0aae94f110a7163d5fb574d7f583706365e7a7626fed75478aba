import type {
	ChatCompletionOutput,
	TextGenerationInput,
	TextGenerationOutput,
	TextGenerationOutputFinishReason,
} from "@huggingface/tasks";
import type { BodyParams } from "../types.js";
import { BaseConversationalTask, BaseTextGenerationTask } from "./providerHelper.js";
import { omit } from "../utils/omit.js";
import { InferenceClientProviderOutputError } from "../errors.js";

interface FeatherlessAITextCompletionOutput extends Omit<ChatCompletionOutput, "choices"> {
	choices: Array<{
		text: string;
		finish_reason: TextGenerationOutputFinishReason;
		seed: number;
		logprobs: unknown;
		index: number;
	}>;
}

const FEATHERLESS_API_BASE_URL = "https://api.featherless.ai";

export class FeatherlessAIConversationalTask extends BaseConversationalTask {
	constructor() {
		super("featherless-ai", FEATHERLESS_API_BASE_URL);
	}
}

export class FeatherlessAITextGenerationTask extends BaseTextGenerationTask {
	constructor() {
		super("featherless-ai", FEATHERLESS_API_BASE_URL);
	}

	override preparePayload(params: BodyParams<TextGenerationInput>): Record<string, unknown> {
		return {
			model: params.model,
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters
				? {
						max_tokens: params.args.parameters.max_new_tokens,
						...omit(params.args.parameters, "max_new_tokens"),
				  }
				: undefined),
			prompt: params.args.inputs,
		};
	}

	override async getResponse(response: FeatherlessAITextCompletionOutput): Promise<TextGenerationOutput> {
		if (
			typeof response === "object" &&
			"choices" in response &&
			Array.isArray(response?.choices) &&
			typeof response?.model === "string"
		) {
			const completion = response.choices[0];
			return {
				generated_text: completion.text,
			};
		}
		throw new InferenceClientProviderOutputError("Received malformed response from Featherless AI text generation API");
	}
}
