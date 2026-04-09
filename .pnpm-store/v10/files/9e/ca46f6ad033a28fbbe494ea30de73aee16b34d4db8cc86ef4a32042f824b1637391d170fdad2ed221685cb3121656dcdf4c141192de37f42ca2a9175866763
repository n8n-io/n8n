/**
 * See the registered mapping of HF model ID => Sambanova model ID here:
 *
 * https://huggingface.co/api/partners/sambanova/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Sambanova and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Sambanova, please open an issue on the present repo
 * and we will tag Sambanova team members.
 *
 * Thanks!
 */
import type { FeatureExtractionOutput } from "@huggingface/tasks";
import type { BodyParams } from "../types.js";
import type { FeatureExtractionTaskHelper } from "./providerHelper.js";
import { BaseConversationalTask, TaskProviderHelper } from "./providerHelper.js";
import { InferenceClientProviderOutputError } from "../errors.js";
import type { ChatCompletionInput } from "../../../tasks/dist/commonjs/index.js";

export class SambanovaConversationalTask extends BaseConversationalTask {
	constructor() {
		super("sambanova", "https://api.sambanova.ai");
	}

	override preparePayload(params: BodyParams<ChatCompletionInput>): Record<string, unknown> {
		const responseFormat = params.args.response_format;

		if (responseFormat?.type === "json_schema" && responseFormat.json_schema) {
			if (responseFormat.json_schema.strict ?? true) {
				responseFormat.json_schema.strict = false;
			}
		}
		const payload = super.preparePayload(params) as Record<string, unknown>;

		return payload;
	}
}

export class SambanovaFeatureExtractionTask extends TaskProviderHelper implements FeatureExtractionTaskHelper {
	constructor() {
		super("sambanova", "https://api.sambanova.ai");
	}

	override makeRoute(): string {
		return `/v1/embeddings`;
	}

	override async getResponse(response: FeatureExtractionOutput): Promise<FeatureExtractionOutput> {
		if (typeof response === "object" && "data" in response && Array.isArray(response.data)) {
			return response.data.map((item) => item.embedding);
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from Sambanova feature-extraction (embeddings) API",
		);
	}

	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			model: params.model,
			input: params.args.inputs,
			...params.args,
		};
	}
}
