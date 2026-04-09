/**
 * See the registered mapping of HF model ID => Nebius model ID here:
 *
 * https://huggingface.co/api/partners/nebius/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Nebius and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Nebius, please open an issue on the present repo
 * and we will tag Nebius team members.
 *
 * Thanks!
 */
import type { FeatureExtractionOutput, TextGenerationOutput } from "@huggingface/tasks";
import type { BodyParams, OutputType } from "../types.js";
import { omit } from "../utils/omit.js";
import {
	BaseConversationalTask,
	BaseTextGenerationTask,
	TaskProviderHelper,
	type FeatureExtractionTaskHelper,
	type TextToImageTaskHelper,
} from "./providerHelper.js";
import { InferenceClientProviderOutputError } from "../errors.js";
import type { ChatCompletionInput } from "../../../tasks/dist/commonjs/index.js";

const NEBIUS_API_BASE_URL = "https://api.studio.nebius.ai";

interface NebiusImageGeneration {
	data: Array<{
		b64_json?: string;
		url?: string;
	}>;
}

interface NebiusEmbeddingsResponse {
	data: Array<{
		embedding: number[];
	}>;
}

interface NebiusTextGenerationOutput extends Omit<TextGenerationOutput, "choices"> {
	choices: Array<{
		text: string;
	}>;
}

export class NebiusConversationalTask extends BaseConversationalTask {
	constructor() {
		super("nebius", NEBIUS_API_BASE_URL);
	}

	override preparePayload(params: BodyParams<ChatCompletionInput>): Record<string, unknown> {
		const payload = super.preparePayload(params) as Record<string, unknown>;

		const responseFormat = params.args.response_format;
		if (responseFormat?.type === "json_schema" && responseFormat.json_schema?.schema) {
			payload["guided_json"] = responseFormat.json_schema.schema;
		}

		return payload;
	}
}

export class NebiusTextGenerationTask extends BaseTextGenerationTask {
	constructor() {
		super("nebius", NEBIUS_API_BASE_URL);
	}

	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...params.args,
			model: params.model,
			prompt: params.args.inputs,
		};
	}

	override async getResponse(response: NebiusTextGenerationOutput): Promise<TextGenerationOutput> {
		if (
			typeof response === "object" &&
			"choices" in response &&
			Array.isArray(response?.choices) &&
			response.choices.length > 0 &&
			typeof response.choices[0]?.text === "string"
		) {
			return {
				generated_text: response.choices[0].text,
			};
		}
		throw new InferenceClientProviderOutputError("Received malformed response from Nebius text generation API");
	}
}

export class NebiusTextToImageTask extends TaskProviderHelper implements TextToImageTaskHelper {
	constructor() {
		super("nebius", NEBIUS_API_BASE_URL);
	}

	preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters as Record<string, unknown>),
			response_format: params.outputType === "url" ? "url" : "b64_json",
			prompt: params.args.inputs,
			model: params.model,
		};
	}

	makeRoute(): string {
		return "v1/images/generations";
	}

	async getResponse(
		response: NebiusImageGeneration,
		url?: string,
		headers?: HeadersInit,
		outputType?: OutputType,
	): Promise<string | Blob | Record<string, unknown>> {
		if (
			typeof response === "object" &&
			"data" in response &&
			Array.isArray(response.data) &&
			response.data.length > 0
		) {
			if (outputType === "json") {
				return { ...response };
			}

			if ("url" in response.data[0] && typeof response.data[0].url === "string") {
				return response.data[0].url;
			}

			if ("b64_json" in response.data[0] && typeof response.data[0].b64_json === "string") {
				const base64Data = response.data[0].b64_json;
				if (outputType === "dataUrl") {
					return `data:image/jpeg;base64,${base64Data}`;
				}
				return fetch(`data:image/jpeg;base64,${base64Data}`).then((res) => res.blob());
			}
		}

		throw new InferenceClientProviderOutputError("Received malformed response from Nebius text-to-image API");
	}
}

export class NebiusFeatureExtractionTask extends TaskProviderHelper implements FeatureExtractionTaskHelper {
	constructor() {
		super("nebius", NEBIUS_API_BASE_URL);
	}

	preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			input: params.args.inputs,
			model: params.model,
		};
	}

	makeRoute(): string {
		return "v1/embeddings";
	}

	async getResponse(response: NebiusEmbeddingsResponse): Promise<FeatureExtractionOutput> {
		return response.data.map((item) => item.embedding);
	}
}
