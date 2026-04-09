/**
 * See the registered mapping of HF model ID => ZAI model ID here:
 *
 * https://huggingface.co/api/partners/zai-org/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at zai and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to zai, please open an issue on the present repo
 * and we will tag zai team members.
 *
 * Thanks!
 */
import {
	InferenceClientInputError,
	InferenceClientProviderApiError,
	InferenceClientProviderOutputError,
} from "../errors.js";
import { isUrl } from "../lib/isUrl.js";
import type { BodyParams, HeaderParams, OutputType } from "../types.js";
import { dataUrlFromBlob } from "../utils/dataUrlFromBlob.js";
import { delay } from "../utils/delay.js";
import { omit } from "../utils/omit.js";
import { BaseConversationalTask, TaskProviderHelper, type TextToImageTaskHelper } from "./providerHelper.js";

const ZAI_API_BASE_URL = "https://api.z.ai";

export class ZaiConversationalTask extends BaseConversationalTask {
	constructor() {
		super("zai-org", ZAI_API_BASE_URL);
	}

	override prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string> {
		const headers = super.prepareHeaders(params, binary);
		headers["x-source-channel"] = "hugging_face";
		headers["accept-language"] = "en-US,en";
		return headers;
	}

	override makeRoute(): string {
		return "/api/paas/v4/chat/completions";
	}
}

interface ZaiTextToImageResponse {
	model: string;
	id: string;
	request_id: string;
	task_status: "PROCESSING" | "SUCCESS" | "FAIL";
}

interface ZaiAsyncResultResponse {
	image_result?: Array<{ url: string }>;
	model: string;
	id: string;
	request_id: string;
	task_status: "PROCESSING" | "SUCCESS" | "FAIL";
}

const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 5000;

export class ZaiTextToImageTask extends TaskProviderHelper implements TextToImageTaskHelper {
	constructor() {
		super("zai-org", ZAI_API_BASE_URL);
	}

	override prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string> {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${params.accessToken}`,
			"x-source-channel": "hugging_face",
			"accept-language": "en-US,en",
		};
		if (!binary) {
			headers["Content-Type"] = "application/json";
		}
		return headers;
	}

	makeRoute(): string {
		return "/api/paas/v4/async/images/generations";
	}

	preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters as Record<string, unknown>),
			model: params.model,
			prompt: params.args.inputs,
		};
	}

	async getResponse(
		response: ZaiTextToImageResponse,
		url?: string,
		headers?: Record<string, string>,
		outputType?: OutputType,
	): Promise<string | Blob | Record<string, unknown>> {
		if (!url || !headers) {
			throw new InferenceClientInputError(`URL and headers are required for 'text-to-image' task`);
		}
		if (
			typeof response !== "object" ||
			!response ||
			!("task_status" in response) ||
			!("id" in response) ||
			typeof response.id !== "string"
		) {
			throw new InferenceClientProviderOutputError(
				`Received malformed response from ZAI text-to-image API: expected { id: string, task_status: string }, got: ${JSON.stringify(
					response,
				)}`,
			);
		}

		if (response.task_status === "FAIL") {
			throw new InferenceClientProviderOutputError("ZAI API returned task status: FAIL");
		}

		const taskId = response.id;
		const parsedUrl = new URL(url);
		const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${
			parsedUrl.host === "router.huggingface.co" ? "/zai-org" : ""
		}`;
		const pollUrl = `${baseUrl}/api/paas/v4/async-result/${taskId}`;

		const pollHeaders: Record<string, string> = {
			...headers,
			"x-source-channel": "hugging_face",
			"accept-language": "en-US,en",
		};

		for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
			await delay(POLL_INTERVAL_MS);

			const resp = await fetch(pollUrl, {
				method: "GET",
				headers: pollHeaders,
			});

			if (!resp.ok) {
				throw new InferenceClientProviderApiError(
					`Failed to fetch result from ZAI text-to-image API: ${resp.status}`,
					{ url: pollUrl, method: "GET" },
					{ requestId: resp.headers.get("x-request-id") ?? "", status: resp.status, body: await resp.text() },
				);
			}

			const result: ZaiAsyncResultResponse = await resp.json();

			if (result.task_status === "FAIL") {
				throw new InferenceClientProviderOutputError("ZAI text-to-image API task failed");
			}

			if (result.task_status === "SUCCESS") {
				if (
					!result.image_result ||
					!Array.isArray(result.image_result) ||
					result.image_result.length === 0 ||
					typeof result.image_result[0]?.url !== "string" ||
					!isUrl(result.image_result[0].url)
				) {
					throw new InferenceClientProviderOutputError(
						`Received malformed response from ZAI text-to-image API: expected { image_result: Array<{ url: string }> }, got: ${JSON.stringify(
							result,
						)}`,
					);
				}

				const imageUrl = result.image_result[0].url;

				if (outputType === "json") {
					return { ...result };
				}
				if (outputType === "url") {
					return imageUrl;
				}

				const imageResponse = await fetch(imageUrl);
				const blob = await imageResponse.blob();
				return outputType === "dataUrl" ? dataUrlFromBlob(blob) : blob;
			}
		}

		throw new InferenceClientProviderOutputError(
			`Timed out while waiting for the result from ZAI API - aborting after ${MAX_POLL_ATTEMPTS} attempts`,
		);
	}
}
