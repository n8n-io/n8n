import type { TextToImageArgs } from "../tasks/cv/textToImage.js";
import type { ImageToImageArgs } from "../tasks/cv/imageToImage.js";
import type { ImageTextToImageArgs } from "../tasks/cv/imageTextToImage.js";
import type { TextToVideoArgs } from "../tasks/cv/textToVideo.js";
import type { ImageToVideoArgs } from "../tasks/cv/imageToVideo.js";
import type { BodyParams, OutputType, RequestArgs, UrlParams } from "../types.js";
import type { ImageTextToVideoArgs } from "../tasks/cv/imageTextToVideo.js";
import { dataUrlFromBlob } from "../utils/dataUrlFromBlob.js";
import { delay } from "../utils/delay.js";
import { omit } from "../utils/omit.js";
import { base64FromBytes } from "../utils/base64FromBytes.js";
import type {
	TextToImageTaskHelper,
	TextToVideoTaskHelper,
	ImageToImageTaskHelper,
	ImageToVideoTaskHelper,
	ImageTextToImageTaskHelper,
	ImageTextToVideoTaskHelper,
} from "./providerHelper.js";
import { TaskProviderHelper } from "./providerHelper.js";
import {
	InferenceClientInputError,
	InferenceClientProviderApiError,
	InferenceClientProviderOutputError,
} from "../errors.js";

const WAVESPEEDAI_API_BASE_URL = "https://api.wavespeed.ai";

/**
 * Response structure for task status and results
 */
interface WaveSpeedAITaskResponse {
	id: string;
	model: string;
	outputs: string[];
	urls: {
		get: string;
	};
	has_nsfw_contents: boolean[];
	status: "created" | "processing" | "completed" | "failed";
	created_at: string;
	error: string;
	executionTime: number;
	timings: {
		inference: number;
	};
}

/**
 * Response structure for initial task submission
 */
interface WaveSpeedAISubmitResponse {
	id: string;
	urls: {
		get: string;
	};
}

/**
 * Response structure for WaveSpeed AI API
 */
interface WaveSpeedAIResponse {
	code: number;
	message: string;
	data: WaveSpeedAITaskResponse;
}

/**
 * Response structure for WaveSpeed AI API with submit response data
 */
interface WaveSpeedAISubmitTaskResponse {
	code: number;
	message: string;
	data: WaveSpeedAISubmitResponse;
}

async function buildImagesField(
	inputs: Blob | ArrayBuffer,
	hasImages: unknown,
): Promise<{ base: string; images: string[] }> {
	const base = base64FromBytes(
		new Uint8Array(inputs instanceof ArrayBuffer ? inputs : await (inputs as Blob).arrayBuffer()),
	);
	const images =
		Array.isArray(hasImages) && hasImages.every((value): value is string => typeof value === "string")
			? hasImages
			: [base];
	return { base, images };
}

abstract class WavespeedAITask extends TaskProviderHelper {
	constructor(url?: string) {
		super("wavespeed", url || WAVESPEEDAI_API_BASE_URL);
	}

	makeRoute(params: UrlParams): string {
		return `/api/v3/${params.model}`;
	}

	preparePayload(
		params: BodyParams<
			| ImageToImageArgs
			| ImageTextToImageArgs
			| ImageTextToVideoArgs
			| TextToImageArgs
			| TextToVideoArgs
			| ImageToVideoArgs
		>,
	): Record<string, unknown> {
		const payload: Record<string, unknown> = {
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters ? omit(params.args.parameters as Record<string, unknown>, ["images"]) : undefined),
			prompt: params.args.inputs,
		};
		// Add LoRA support if adapter is specified in the mapping
		if (params.mapping?.adapter === "lora") {
			payload.loras = [
				{
					path: params.mapping.hfModelId,
					scale: 1, // Default scale value
				},
			];
		}
		return payload;
	}

	override async getResponse(
		response: WaveSpeedAISubmitTaskResponse,
		url?: string,
		headers?: Record<string, string>,
		outputType?: OutputType,
	): Promise<string | Blob | Record<string, unknown>> {
		if (!url || !headers) {
			throw new InferenceClientInputError("Headers are required for WaveSpeed AI API calls");
		}

		const parsedUrl = new URL(url);
		const resultPath = new URL(response.data.urls.get).pathname;
		/// override the base url to use the router.huggingface.co if going through huggingface router
		const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${
			parsedUrl.host === "router.huggingface.co" ? "/wavespeed" : ""
		}`;
		const resultUrl = `${baseUrl}${resultPath}`;

		// Poll for results until completion
		while (true) {
			const resultResponse = await fetch(resultUrl, { headers });

			if (!resultResponse.ok) {
				throw new InferenceClientProviderApiError(
					"Failed to fetch response status from WaveSpeed AI API",
					{ url: resultUrl, method: "GET" },
					{
						requestId: resultResponse.headers.get("x-request-id") ?? "",
						status: resultResponse.status,
						body: await resultResponse.text(),
					},
				);
			}

			const result: WaveSpeedAIResponse = await resultResponse.json();
			const taskResult = result.data;

			switch (taskResult.status) {
				case "completed": {
					// Get the media data from the first output URL
					if (!taskResult.outputs?.[0]) {
						throw new InferenceClientProviderOutputError(
							"Received malformed response from WaveSpeed AI API: No output URL in completed response",
						);
					}
					const mediaUrl = taskResult.outputs[0];

					if (outputType === "url") {
						return mediaUrl;
					}
					if (outputType === "json") {
						return result as unknown as Record<string, unknown>;
					}

					// Default: fetch and return blob
					const mediaResponse = await fetch(mediaUrl);
					if (!mediaResponse.ok) {
						throw new InferenceClientProviderApiError(
							"Failed to fetch generation output from WaveSpeed AI API",
							{ url: mediaUrl, method: "GET" },
							{
								requestId: mediaResponse.headers.get("x-request-id") ?? "",
								status: mediaResponse.status,
								body: await mediaResponse.text(),
							},
						);
					}
					const blob = await mediaResponse.blob();
					return outputType === "dataUrl" ? dataUrlFromBlob(blob) : blob;
				}
				case "failed": {
					throw new InferenceClientProviderOutputError(taskResult.error || "Task failed");
				}

				default: {
					// Wait before polling again
					await delay(500);
					continue;
				}
			}
		}
	}
}

export class WavespeedAITextToImageTask extends WavespeedAITask implements TextToImageTaskHelper {
	constructor() {
		super(WAVESPEEDAI_API_BASE_URL);
	}
}

export class WavespeedAITextToVideoTask extends WavespeedAITask implements TextToVideoTaskHelper {
	constructor() {
		super(WAVESPEEDAI_API_BASE_URL);
	}

	override async getResponse(
		response: WaveSpeedAISubmitTaskResponse,
		url?: string,
		headers?: Record<string, string>,
	): Promise<Blob> {
		return super.getResponse(response, url, headers) as Promise<Blob>;
	}
}

export class WavespeedAIImageToImageTask extends WavespeedAITask implements ImageToImageTaskHelper {
	constructor() {
		super(WAVESPEEDAI_API_BASE_URL);
	}

	async preparePayloadAsync(args: ImageToImageArgs): Promise<RequestArgs> {
		const hasImages =
			(args as { images?: unknown }).images ?? (args.parameters as Record<string, unknown> | undefined)?.images;
		const { base, images } = await buildImagesField(args.inputs as Blob | ArrayBuffer, hasImages);
		return { ...args, inputs: args.parameters?.prompt, image: base, images };
	}

	override async getResponse(
		response: WaveSpeedAISubmitTaskResponse,
		url?: string,
		headers?: Record<string, string>,
	): Promise<Blob> {
		return super.getResponse(response, url, headers) as Promise<Blob>;
	}
}

export class WavespeedAIImageToVideoTask extends WavespeedAITask implements ImageToVideoTaskHelper {
	constructor() {
		super(WAVESPEEDAI_API_BASE_URL);
	}

	async preparePayloadAsync(args: ImageToVideoArgs): Promise<RequestArgs> {
		const hasImages =
			(args as { images?: unknown }).images ?? (args.parameters as Record<string, unknown> | undefined)?.images;
		const { base, images } = await buildImagesField(args.inputs as Blob | ArrayBuffer, hasImages);
		return { ...args, inputs: args.parameters?.prompt, image: base, images };
	}

	override async getResponse(
		response: WaveSpeedAISubmitTaskResponse,
		url?: string,
		headers?: Record<string, string>,
	): Promise<Blob> {
		return super.getResponse(response, url, headers) as Promise<Blob>;
	}
}

// 1x1 fully transparent PNG for use when no input image is provided
const TRANSPARENT_1PX_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function getTransparentPngBlob(): Blob {
	const bytes = Uint8Array.from(Buffer.from(TRANSPARENT_1PX_PNG_BASE64, "base64"));
	return new Blob([bytes], { type: "image/png" });
}

export class WavespeedAIImageTextToImageTask extends WavespeedAIImageToImageTask implements ImageTextToImageTaskHelper {
	constructor() {
		super();
	}

	override async preparePayloadAsync(args: ImageTextToImageArgs): Promise<RequestArgs> {
		const inputs = args.inputs ?? getTransparentPngBlob();
		return super.preparePayloadAsync({ ...args, inputs } as ImageToImageArgs);
	}
}

export class WavespeedAIImageTextToVideoTask extends WavespeedAIImageToVideoTask implements ImageTextToVideoTaskHelper {
	constructor() {
		super();
	}

	override async preparePayloadAsync(args: ImageTextToVideoArgs): Promise<RequestArgs> {
		const inputs = args.inputs ?? getTransparentPngBlob();
		return super.preparePayloadAsync({ ...args, inputs } as ImageToVideoArgs);
	}
}
