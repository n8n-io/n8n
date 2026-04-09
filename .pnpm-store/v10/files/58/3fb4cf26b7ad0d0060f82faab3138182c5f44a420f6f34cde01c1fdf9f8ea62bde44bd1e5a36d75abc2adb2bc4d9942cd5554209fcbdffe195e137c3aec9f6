/**
 * See the registered mapping of HF model ID => Scaleway model ID here:
 *
 * https://huggingface.co/api/partners/scaleway/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Scaleway and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Scaleway, please open an issue on the present repo
 * and we will tag Scaleway team members.
 *
 * Thanks!
 */
import type { FeatureExtractionOutput, TextGenerationOutput } from "@huggingface/tasks";
import type { BodyParams } from "../types.js";
import { InferenceClientProviderOutputError } from "../errors.js";

import type { FeatureExtractionTaskHelper } from "./providerHelper.js";
import { BaseConversationalTask, TaskProviderHelper, BaseTextGenerationTask } from "./providerHelper.js";

const SCALEWAY_API_BASE_URL = "https://api.scaleway.ai";

interface ScalewayEmbeddingsResponse {
	data: Array<{
		embedding: number[];
	}>;
}

export class ScalewayConversationalTask extends BaseConversationalTask {
	constructor() {
		super("scaleway", SCALEWAY_API_BASE_URL);
	}
}

export class ScalewayTextGenerationTask extends BaseTextGenerationTask {
	constructor() {
		super("scaleway", SCALEWAY_API_BASE_URL);
	}

	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			model: params.model,
			...params.args,
			prompt: params.args.inputs,
		};
	}

	override async getResponse(response: unknown): Promise<TextGenerationOutput> {
		if (
			typeof response === "object" &&
			response !== null &&
			"choices" in response &&
			Array.isArray(response.choices) &&
			response.choices.length > 0
		) {
			const completion: unknown = response.choices[0];
			if (
				typeof completion === "object" &&
				!!completion &&
				"text" in completion &&
				completion.text &&
				typeof completion.text === "string"
			) {
				return {
					generated_text: completion.text,
				};
			}
		}
		throw new InferenceClientProviderOutputError("Received malformed response from Scaleway text generation API");
	}
}

export class ScalewayFeatureExtractionTask extends TaskProviderHelper implements FeatureExtractionTaskHelper {
	constructor() {
		super("scaleway", SCALEWAY_API_BASE_URL);
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

	async getResponse(response: ScalewayEmbeddingsResponse): Promise<FeatureExtractionOutput> {
		return response.data.map((item) => item.embedding);
	}
}
