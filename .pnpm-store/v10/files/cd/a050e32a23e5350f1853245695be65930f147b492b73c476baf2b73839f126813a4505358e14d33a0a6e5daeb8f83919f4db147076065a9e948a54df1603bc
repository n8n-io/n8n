/**
 * See the registered mapping of HF model ID => Replicate model ID here:
 *
 * https://huggingface.co/api/partners/replicate/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Replicate and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Replicate, please open an issue on the present repo
 * and we will tag Replicate team members.
 *
 * Thanks!
 */
import { InferenceClientProviderOutputError } from "../errors.js";
import { isUrl } from "../lib/isUrl.js";
import type { BodyParams, HeaderParams, UrlParams } from "../types.js";
import { omit } from "../utils/omit.js";
import { TaskProviderHelper, type TextToImageTaskHelper, type TextToVideoTaskHelper } from "./providerHelper.js";
export interface ReplicateOutput {
	output?: string | string[];
}

abstract class ReplicateTask extends TaskProviderHelper {
	constructor(url?: string) {
		super("replicate", url || "https://api.replicate.com");
	}

	makeRoute(params: UrlParams): string {
		if (params.model.includes(":")) {
			return "v1/predictions";
		}
		return `v1/models/${params.model}/predictions`;
	}
	preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			input: {
				...omit(params.args, ["inputs", "parameters"]),
				...(params.args.parameters as Record<string, unknown>),
				prompt: params.args.inputs,
			},
			version: params.model.includes(":") ? params.model.split(":")[1] : undefined,
		};
	}
	override prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string> {
		const headers: Record<string, string> = { Authorization: `Bearer ${params.accessToken}`, Prefer: "wait" };
		if (!binary) {
			headers["Content-Type"] = "application/json";
		}
		return headers;
	}

	override makeUrl(params: UrlParams): string {
		const baseUrl = this.makeBaseUrl(params);
		if (params.model.includes(":")) {
			return `${baseUrl}/v1/predictions`;
		}
		return `${baseUrl}/v1/models/${params.model}/predictions`;
	}
}

export class ReplicateTextToImageTask extends ReplicateTask implements TextToImageTaskHelper {
	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			input: {
				...omit(params.args, ["inputs", "parameters"]),
				...(params.args.parameters as Record<string, unknown>),
				prompt: params.args.inputs,
				lora_weights:
					params.mapping?.adapter === "lora" && params.mapping.adapterWeightsPath
						? `https://huggingface.co/${params.mapping.hfModelId}`
						: undefined,
			},
			version: params.model.includes(":") ? params.model.split(":")[1] : undefined,
		};
	}

	override async getResponse(
		res: ReplicateOutput | Blob,
		url?: string,
		headers?: Record<string, string>,
		outputType?: "url" | "blob"
	): Promise<string | Blob> {
		void url;
		void headers;
		if (
			typeof res === "object" &&
			"output" in res &&
			Array.isArray(res.output) &&
			res.output.length > 0 &&
			typeof res.output[0] === "string"
		) {
			if (outputType === "url") {
				return res.output[0];
			}
			const urlResponse = await fetch(res.output[0]);
			return await urlResponse.blob();
		}

		throw new InferenceClientProviderOutputError("Received malformed response from Replicate text-to-image API");
	}
}

export class ReplicateTextToSpeechTask extends ReplicateTask {
	override preparePayload(params: BodyParams): Record<string, unknown> {
		const payload = super.preparePayload(params);

		const input = payload["input"];
		if (typeof input === "object" && input !== null && "prompt" in input) {
			const inputObj = input as Record<string, unknown>;
			inputObj["text"] = inputObj["prompt"];
			delete inputObj["prompt"];
		}

		return payload;
	}

	override async getResponse(response: ReplicateOutput): Promise<Blob> {
		if (response instanceof Blob) {
			return response;
		}
		if (response && typeof response === "object") {
			if ("output" in response) {
				if (typeof response.output === "string") {
					const urlResponse = await fetch(response.output);
					return await urlResponse.blob();
				} else if (Array.isArray(response.output)) {
					const urlResponse = await fetch(response.output[0]);
					return await urlResponse.blob();
				}
			}
		}
		throw new InferenceClientProviderOutputError("Received malformed response from Replicate text-to-speech API");
	}
}

export class ReplicateTextToVideoTask extends ReplicateTask implements TextToVideoTaskHelper {
	override async getResponse(response: ReplicateOutput): Promise<Blob> {
		if (
			typeof response === "object" &&
			!!response &&
			"output" in response &&
			typeof response.output === "string" &&
			isUrl(response.output)
		) {
			const urlResponse = await fetch(response.output);
			return await urlResponse.blob();
		}

		throw new InferenceClientProviderOutputError("Received malformed response from Replicate text-to-video API");
	}
}
