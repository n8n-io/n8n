/**
 * See the registered mapping of HF model ID => Hyperbolic model ID here:
 *
 * https://huggingface.co/api/partners/hyperbolic/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Hyperbolic and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Hyperbolic, please open an issue on the present repo
 * and we will tag Hyperbolic team members.
 *
 * Thanks!
 */
import type { ChatCompletionOutput, TextGenerationOutput } from "@huggingface/tasks";
import type { BodyParams, OutputType, UrlParams } from "../types.js";
import { omit } from "../utils/omit.js";
import {
	BaseConversationalTask,
	BaseTextGenerationTask,
	TaskProviderHelper,
	type TextToImageTaskHelper,
} from "./providerHelper.js";
import { InferenceClientInputError, InferenceClientProviderOutputError } from "../errors.js";
const HYPERBOLIC_API_BASE_URL = "https://api.hyperbolic.xyz";

export interface HyperbolicTextCompletionOutput extends Omit<ChatCompletionOutput, "choices"> {
	choices: Array<{
		message: { content: string };
	}>;
}

interface HyperbolicTextToImageOutput {
	images: Array<{ image: string }>;
}

export class HyperbolicConversationalTask extends BaseConversationalTask {
	constructor() {
		super("hyperbolic", HYPERBOLIC_API_BASE_URL);
	}
}

export class HyperbolicTextGenerationTask extends BaseTextGenerationTask {
	constructor() {
		super("hyperbolic", HYPERBOLIC_API_BASE_URL);
	}

	override makeRoute(): string {
		return "v1/chat/completions";
	}

	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			messages: [{ content: params.args.inputs, role: "user" }],
			...(params.args.parameters
				? {
						max_tokens: (params.args.parameters as Record<string, unknown>).max_new_tokens,
						...omit(params.args.parameters as Record<string, unknown>, "max_new_tokens"),
					}
				: undefined),
			...omit(params.args, ["inputs", "parameters"]),
			model: params.model,
		};
	}

	override async getResponse(response: HyperbolicTextCompletionOutput): Promise<TextGenerationOutput> {
		if (
			typeof response === "object" &&
			"choices" in response &&
			Array.isArray(response?.choices) &&
			typeof response?.model === "string"
		) {
			const completion = response.choices[0];
			return {
				generated_text: completion.message.content,
			};
		}

		throw new InferenceClientProviderOutputError("Received malformed response from Hyperbolic text generation API");
	}
}

export class HyperbolicTextToImageTask extends TaskProviderHelper implements TextToImageTaskHelper {
	constructor() {
		super("hyperbolic", HYPERBOLIC_API_BASE_URL);
	}

	makeRoute(params: UrlParams): string {
		void params;
		return `/v1/images/generations`;
	}

	preparePayload(params: BodyParams): Record<string, unknown> {
		if (params.outputType === "url") {
			throw new InferenceClientInputError(
				"hyperbolic provider does not support URL output. Use outputType 'blob', 'dataUrl' or 'json' instead.",
			);
		}
		return {
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters as Record<string, unknown>),
			prompt: params.args.inputs,
			model_name: params.model,
		};
	}

	async getResponse(
		response: HyperbolicTextToImageOutput,
		url?: string,
		headers?: HeadersInit,
		outputType?: OutputType,
	): Promise<string | Blob | Record<string, unknown>> {
		if (
			typeof response === "object" &&
			"images" in response &&
			Array.isArray(response.images) &&
			response.images[0] &&
			typeof response.images[0].image === "string"
		) {
			if (outputType === "json") {
				return { ...response };
			}
			if (outputType === "dataUrl") {
				return `data:image/jpeg;base64,${response.images[0].image}`;
			}
			return fetch(`data:image/jpeg;base64,${response.images[0].image}`).then((res) => res.blob());
		}

		throw new InferenceClientProviderOutputError("Received malformed response from Hyperbolic text-to-image API");
	}
}
