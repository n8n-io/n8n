/**
 * See the registered mapping of HF model ID => Novita model ID here:
 *
 * https://huggingface.co/api/partners/novita/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Novita and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Novita, please open an issue on the present repo
 * and we will tag Novita team members.
 *
 * Thanks!
 */
import { isUrl } from "../lib/isUrl.js";
import type { TextToVideoArgs } from "../tasks/index.js";
import type { BodyParams, UrlParams } from "../types.js";
import { delay } from "../utils/delay.js";
import { omit } from "../utils/omit.js";
import {
	BaseConversationalTask,
	BaseTextGenerationTask,
	TaskProviderHelper,
	type TextToVideoTaskHelper,
} from "./providerHelper.js";
import {
	InferenceClientInputError,
	InferenceClientProviderApiError,
	InferenceClientProviderOutputError,
} from "../errors.js";

const NOVITA_API_BASE_URL = "https://api.novita.ai";

export interface NovitaAsyncAPIOutput {
	task_id: string;
}

export class NovitaTextGenerationTask extends BaseTextGenerationTask {
	constructor() {
		super("novita", NOVITA_API_BASE_URL);
	}

	override makeRoute(): string {
		return "/v3/openai/chat/completions";
	}
}

export class NovitaConversationalTask extends BaseConversationalTask {
	constructor() {
		super("novita", NOVITA_API_BASE_URL);
	}

	override makeRoute(): string {
		return "/v3/openai/chat/completions";
	}
}

export class NovitaTextToVideoTask extends TaskProviderHelper implements TextToVideoTaskHelper {
	constructor() {
		super("novita", NOVITA_API_BASE_URL);
	}

	override makeRoute(params: UrlParams): string {
		return `/v3/async/${params.model}`;
	}

	override preparePayload(params: BodyParams<TextToVideoArgs>): Record<string, unknown> {
		const { num_inference_steps, ...restParameters } = params.args.parameters ?? {};
		return {
			...omit(params.args, ["inputs", "parameters"]),
			...restParameters,
			steps: num_inference_steps,
			prompt: params.args.inputs,
		};
	}

	override async getResponse(
		response: NovitaAsyncAPIOutput,
		url?: string,
		headers?: Record<string, string>
	): Promise<Blob> {
		if (!url || !headers) {
			throw new InferenceClientInputError("URL and headers are required for text-to-video task");
		}
		const taskId = response.task_id;
		if (!taskId) {
			throw new InferenceClientProviderOutputError(
				"Received malformed response from Novita text-to-video API: no task ID found in the response"
			);
		}

		const parsedUrl = new URL(url);
		const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${
			parsedUrl.host === "router.huggingface.co" ? "/novita" : ""
		}`;
		const resultUrl = `${baseUrl}/v3/async/task-result?task_id=${taskId}`;

		let status = "";
		let taskResult: unknown;

		while (status !== "TASK_STATUS_SUCCEED" && status !== "TASK_STATUS_FAILED") {
			await delay(500);
			const resultResponse = await fetch(resultUrl, { headers });
			if (!resultResponse.ok) {
				throw new InferenceClientProviderApiError(
					"Failed to fetch task result",
					{ url: resultUrl, method: "GET", headers },
					{
						requestId: resultResponse.headers.get("x-request-id") ?? "",
						status: resultResponse.status,
						body: await resultResponse.text(),
					}
				);
			}
			try {
				taskResult = await resultResponse.json();
				if (
					taskResult &&
					typeof taskResult === "object" &&
					"task" in taskResult &&
					taskResult.task &&
					typeof taskResult.task === "object" &&
					"status" in taskResult.task &&
					typeof taskResult.task.status === "string"
				) {
					status = taskResult.task.status;
				} else {
					throw new InferenceClientProviderOutputError(
						"Received malformed response from Novita text-to-video API: failed to get task status"
					);
				}
			} catch (error) {
				throw new InferenceClientProviderOutputError(
					"Received malformed response from Novita text-to-video API: failed to parse task result"
				);
			}
		}

		if (status === "TASK_STATUS_FAILED") {
			throw new InferenceClientProviderOutputError("Novita text-to-video task failed");
		}

		if (
			typeof taskResult === "object" &&
			!!taskResult &&
			"videos" in taskResult &&
			typeof taskResult.videos === "object" &&
			!!taskResult.videos &&
			Array.isArray(taskResult.videos) &&
			taskResult.videos.length > 0 &&
			"video_url" in taskResult.videos[0] &&
			typeof taskResult.videos[0].video_url === "string" &&
			isUrl(taskResult.videos[0].video_url)
		) {
			const urlResponse = await fetch(taskResult.videos[0].video_url);
			return await urlResponse.blob();
		} else {
			throw new InferenceClientProviderOutputError(
				`Received malformed response from Novita text-to-video API: expected { videos: [{ video_url: string }] } format, got instead: ${JSON.stringify(
					taskResult
				)}`
			);
		}
	}
}
