/**
 * See the registered mapping of HF model ID => Clarifai model ID here:
 *
 * https://huggingface.co/api/partners/clarifai/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Clarifai and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Clarifai, please open an issue on the present repo
 * and we will tag Clarifai team members.
 *
 * Thanks!
 */
import { BaseConversationalTask } from "./providerHelper.js";
import type { HeaderParams } from "../types.js";

const CLARIFAI_API_BASE_URL = "https://api.clarifai.com";

export class ClarifaiConversationalTask extends BaseConversationalTask {
	constructor() {
		super("clarifai", CLARIFAI_API_BASE_URL);
	}

	override makeRoute(): string {
		return "/v2/ext/openai/v1/chat/completions";
	}

	override prepareHeaders(params: HeaderParams, isBinary: boolean): Record<string, string> {
		const headers: Record<string, string> = {
			Authorization:
				params.authMethod !== "provider-key" ? `Bearer ${params.accessToken}` : `Key ${params.accessToken}`,
		};
		if (!isBinary) {
			headers["Content-Type"] = "application/json";
		}
		return headers;
	}
}
