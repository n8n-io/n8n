/**
 * See the registered mapping of HF model ID => Fal model ID here:
 *
 * https://huggingface.co/api/partners/fal-ai/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Fal and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Fal, please open an issue on the present repo
 * and we will tag Fal team members.
 *
 * Thanks!
 */
import { base64FromBytes } from "../utils/base64FromBytes.js";
import { dataUrlFromBlob } from "../utils/dataUrlFromBlob.js";

import type { AutomaticSpeechRecognitionOutput, ImageSegmentationOutput } from "@huggingface/tasks";
import { isUrl } from "../lib/isUrl.js";
import type { BodyParams, HeaderParams, InferenceTask, ModelId, OutputType, RequestArgs, UrlParams } from "../types.js";
import { delay } from "../utils/delay.js";
import { omit } from "../utils/omit.js";
import type {
	ImageSegmentationTaskHelper,
	ImageToImageTaskHelper,
	ImageTextToImageTaskHelper,
	ImageTextToVideoTaskHelper,
} from "./providerHelper.js";
import {
	type AutomaticSpeechRecognitionTaskHelper,
	TaskProviderHelper,
	type TextToImageTaskHelper,
	type TextToVideoTaskHelper,
	type ImageToVideoTaskHelper,
} from "./providerHelper.js";
import { HF_HUB_URL } from "../config.js";
import type { AutomaticSpeechRecognitionArgs } from "../tasks/audio/automaticSpeechRecognition.js";
import {
	InferenceClientInputError,
	InferenceClientProviderApiError,
	InferenceClientProviderOutputError,
} from "../errors.js";
import type { ImageToImageArgs, ImageToVideoArgs } from "../tasks/index.js";
import type { ImageTextToImageArgs } from "../tasks/cv/imageTextToImage.js";
import type { ImageTextToVideoArgs } from "../tasks/cv/imageTextToVideo.js";
import type { ImageSegmentationArgs } from "../tasks/cv/imageSegmentation.js";

export interface FalAiQueueOutput {
	request_id: string;
	status: string;
	response_url: string;
}

interface FalAITextToImageOutput {
	images: Array<{
		url: string;
	}>;
}

interface FalAIAutomaticSpeechRecognitionOutput {
	text: string;
}

interface FalAITextToSpeechOutput {
	audio: {
		url: string;
		content_type: string;
	};
}
export const FAL_AI_SUPPORTED_BLOB_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"];

abstract class FalAITask extends TaskProviderHelper {
	constructor(url?: string) {
		super("fal-ai", url || "https://fal.run");
	}

	preparePayload(params: BodyParams): Record<string, unknown> {
		return params.args;
	}
	makeRoute(params: UrlParams): string {
		return `/${params.model}`;
	}
	override prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string> {
		const headers: Record<string, string> = {
			Authorization:
				params.authMethod !== "provider-key" ? `Bearer ${params.accessToken}` : `Key ${params.accessToken}`,
		};
		if (!binary) {
			headers["Content-Type"] = "application/json";
		}
		return headers;
	}
}

abstract class FalAiQueueTask extends FalAITask {
	abstract task: InferenceTask;

	override makeRoute(params: UrlParams): string {
		if (params.authMethod !== "provider-key") {
			return `/${params.model}?_subdomain=queue`;
		}
		return `/${params.model}`;
	}
	async getResponseFromQueueApi(
		response: FalAiQueueOutput,
		url?: string,
		headers?: Record<string, string>,
	): Promise<unknown> {
		if (!url || !headers) {
			throw new InferenceClientInputError(`URL and headers are required for ${this.task} task`);
		}
		const requestId = response.request_id;
		if (!requestId) {
			throw new InferenceClientProviderOutputError(
				`Received malformed response from Fal.ai ${this.task} API: no request ID found in the response`,
			);
		}
		let status = response.status;

		const parsedUrl = new URL(url);
		const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${
			parsedUrl.host === "router.huggingface.co" ? "/fal-ai" : ""
		}`;

		// extracting the provider model id for status and result urls
		// from the response as it might be different from the mapped model in `url`
		const modelId = new URL(response.response_url).pathname;
		const queryParams = parsedUrl.search;

		const statusUrl = `${baseUrl}${modelId}/status${queryParams}`;
		const resultUrl = `${baseUrl}${modelId}${queryParams}`;

		while (status !== "COMPLETED") {
			await delay(500);
			const statusResponse = await fetch(statusUrl, { headers });

			if (!statusResponse.ok) {
				throw new InferenceClientProviderApiError(
					"Failed to fetch response status from fal-ai API",
					{ url: statusUrl, method: "GET" },
					{
						requestId: statusResponse.headers.get("x-request-id") ?? "",
						status: statusResponse.status,
						body: await statusResponse.text(),
					},
				);
			}
			try {
				status = (await statusResponse.json()).status;
			} catch (error) {
				throw new InferenceClientProviderOutputError(
					"Failed to parse status response from fal-ai API: received malformed response",
				);
			}
		}

		const resultResponse = await fetch(resultUrl, { headers });
		let result: unknown;
		try {
			result = await resultResponse.json();
		} catch (error) {
			throw new InferenceClientProviderOutputError(
				"Failed to parse result response from fal-ai API: received malformed response",
			);
		}
		return result;
	}
}

function buildLoraPath(modelId: ModelId, adapterWeightsPath: string): string {
	return `${HF_HUB_URL}/${modelId}/resolve/main/${adapterWeightsPath}`;
}

export class FalAITextToImageTask extends FalAiQueueTask implements TextToImageTaskHelper {
	task: InferenceTask;

	constructor() {
		super("https://queue.fal.run");
		this.task = "text-to-image";
	}

	override preparePayload(params: BodyParams): Record<string, unknown> {
		const payload: Record<string, unknown> = {
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters as Record<string, unknown>),
			prompt: params.args.inputs,
		};

		if (params.mapping?.adapter === "lora" && params.mapping.adapterWeightsPath) {
			payload.loras = [
				{
					path: buildLoraPath(params.mapping.hfModelId, params.mapping.adapterWeightsPath),
					scale: 1,
				},
			];
			if (params.mapping.providerId === "fal-ai/lora") {
				payload.model_name = "stabilityai/stable-diffusion-xl-base-1.0";
			}
		}

		return payload;
	}

	override async getResponse(
		response: FalAiQueueOutput,
		url?: string,
		headers?: Record<string, string>,
		outputType?: OutputType,
	): Promise<string | Blob | Record<string, unknown>> {
		const result = (await this.getResponseFromQueueApi(response, url, headers)) as FalAITextToImageOutput;
		if (
			typeof result === "object" &&
			"images" in result &&
			Array.isArray(result.images) &&
			result.images.length > 0 &&
			"url" in result.images[0] &&
			typeof result.images[0].url === "string" &&
			isUrl(result.images[0].url)
		) {
			if (outputType === "json") {
				return { ...result };
			}
			if (outputType === "url") {
				return result.images[0].url;
			}
			const urlResponse = await fetch(result.images[0].url);
			const blob = await urlResponse.blob();
			return outputType === "dataUrl" ? dataUrlFromBlob(blob) : blob;
		}

		throw new InferenceClientProviderOutputError(
			`Received malformed response from Fal.ai text-to-image API: expected { images: Array<{ url: string }> } result format, got instead: ${JSON.stringify(
				result,
			)}`,
		);
	}
}

export class FalAIImageToImageTask extends FalAiQueueTask implements ImageToImageTaskHelper {
	task: InferenceTask;
	constructor() {
		super("https://queue.fal.run");
		this.task = "image-to-image";
	}

	override preparePayload(params: BodyParams): Record<string, unknown> {
		const payload = params.args;
		if (params.mapping?.adapter === "lora" && params.mapping.adapterWeightsPath) {
			payload.loras = [
				{
					path: buildLoraPath(params.mapping.hfModelId, params.mapping.adapterWeightsPath),
					scale: 1,
				},
			];
		}
		return payload;
	}

	async preparePayloadAsync(args: ImageToImageArgs): Promise<RequestArgs> {
		const mimeType = args.inputs instanceof Blob ? args.inputs.type : "image/png";
		const imageDataUrl = `data:${mimeType};base64,${base64FromBytes(
			new Uint8Array(args.inputs instanceof ArrayBuffer ? args.inputs : await (args.inputs as Blob).arrayBuffer()),
		)}`;
		return {
			...omit(args, ["inputs", "parameters"]),
			image_url: imageDataUrl,
			...args.parameters,
			...args,
			// Some fal endpoints (e.g. FLUX.2-dev) expect `image_urls` (array) instead of `image_url`
			image_urls: [imageDataUrl],
		};
	}

	override async getResponse(
		response: FalAiQueueOutput,
		url?: string,
		headers?: Record<string, string>,
	): Promise<Blob> {
		const result = await this.getResponseFromQueueApi(response, url, headers);

		if (
			typeof result === "object" &&
			!!result &&
			"images" in result &&
			Array.isArray(result.images) &&
			result.images.length > 0 &&
			typeof result.images[0] === "object" &&
			!!result.images[0] &&
			"url" in result.images[0] &&
			typeof result.images[0].url === "string" &&
			isUrl(result.images[0].url)
		) {
			const urlResponse = await fetch(result.images[0].url);
			return await urlResponse.blob();
		} else {
			throw new InferenceClientProviderOutputError(
				`Received malformed response from Fal.ai image-to-image API: expected { images: Array<{ url: string }> } result format, got instead: ${JSON.stringify(
					result,
				)}`,
			);
		}
	}
}

export class FalAIImageTextToImageTask extends FalAIImageToImageTask implements ImageTextToImageTaskHelper {
	constructor() {
		super();
		this.task = "image-text-to-image";
	}

	override async preparePayloadAsync(args: ImageTextToImageArgs): Promise<RequestArgs> {
		if (args.inputs) {
			return super.preparePayloadAsync(args as ImageToImageArgs);
		}
		return {
			...omit(args, ["inputs", "parameters"]),
			...(args.parameters as Record<string, unknown>),
			prompt: args.parameters?.prompt,
			urlTransform: (url) => {
				const urlObj = new URL(url);
				// Strip last path segment: fal-ai/flux-2/edit => fal-ai/flux-2
				urlObj.pathname = urlObj.pathname.split("/").slice(0, -1).join("/");
				return urlObj.toString();
			},
		} as RequestArgs;
	}
}

export class FalAITextToVideoTask extends FalAiQueueTask implements TextToVideoTaskHelper {
	task: InferenceTask;
	constructor() {
		super("https://queue.fal.run");
		this.task = "text-to-video";
	}

	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters as Record<string, unknown>),
			prompt: params.args.inputs,
		};
	}

	override async getResponse(
		response: FalAiQueueOutput,
		url?: string,
		headers?: Record<string, string>,
	): Promise<Blob> {
		const result = await this.getResponseFromQueueApi(response, url, headers);

		if (
			typeof result === "object" &&
			!!result &&
			"video" in result &&
			typeof result.video === "object" &&
			!!result.video &&
			"url" in result.video &&
			typeof result.video.url === "string" &&
			isUrl(result.video.url)
		) {
			const urlResponse = await fetch(result.video.url);
			return await urlResponse.blob();
		} else {
			throw new InferenceClientProviderOutputError(
				`Received malformed response from Fal.ai text-to-video API: expected { video: { url: string } } result format, got instead: ${JSON.stringify(
					result,
				)}`,
			);
		}
	}
}

export class FalAIImageToVideoTask extends FalAiQueueTask implements ImageToVideoTaskHelper {
	task: InferenceTask;

	constructor() {
		super("https://queue.fal.run");
		this.task = "image-to-video";
	}

	/** Synchronous case – caller already gave us base64 or a URL */
	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters as Record<string, unknown>),
			// args.inputs is expected to be a base64 data URI or an URL
			image_url: params.args.image_url,
		};
	}

	/** Asynchronous helper – caller gave us a Blob */
	async preparePayloadAsync(args: ImageToVideoArgs): Promise<RequestArgs> {
		const mimeType = args.inputs instanceof Blob ? args.inputs.type : "image/png";
		return {
			...omit(args, ["inputs", "parameters"]),
			image_url: `data:${mimeType};base64,${base64FromBytes(
				new Uint8Array(args.inputs instanceof ArrayBuffer ? args.inputs : await (args.inputs as Blob).arrayBuffer()),
			)}`,
			...args.parameters,
			...args,
		};
	}

	/** Queue polling + final download – mirrors Text‑to‑Video */
	override async getResponse(
		response: FalAiQueueOutput,
		url?: string,
		headers?: Record<string, string>,
	): Promise<Blob> {
		const result = await this.getResponseFromQueueApi(response, url, headers);

		if (
			typeof result === "object" &&
			result !== null &&
			"video" in result &&
			typeof result.video === "object" &&
			result.video !== null &&
			"url" in result.video &&
			typeof result.video.url === "string" &&
			"url" in result.video &&
			isUrl(result.video.url)
		) {
			const urlResponse = await fetch(result.video.url);
			return await urlResponse.blob();
		}

		throw new InferenceClientProviderOutputError(
			`Received malformed response from Fal.ai image‑to‑video API: expected { video: { url: string } }, got: ${JSON.stringify(
				result,
			)}`,
		);
	}
}

export class FalAIImageTextToVideoTask extends FalAIImageToVideoTask implements ImageTextToVideoTaskHelper {
	constructor() {
		super();
		this.task = "image-text-to-video";
	}

	override async preparePayloadAsync(args: ImageTextToVideoArgs): Promise<RequestArgs> {
		if (args.inputs) {
			return super.preparePayloadAsync(args as ImageToVideoArgs);
		}
		return {
			...omit(args, ["inputs", "parameters"]),
			...(args.parameters as Record<string, unknown>),
			prompt: args.parameters?.prompt,
			urlTransform: (url) => {
				const urlObj = new URL(url);
				urlObj.pathname = urlObj.pathname.split("/").slice(0, -1).join("/");
				return urlObj.toString();
			},
		} as RequestArgs;
	}
}

export class FalAIAutomaticSpeechRecognitionTask extends FalAITask implements AutomaticSpeechRecognitionTaskHelper {
	override prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string> {
		const headers = super.prepareHeaders(params, binary);
		headers["Content-Type"] = "application/json";
		return headers;
	}
	override async getResponse(response: unknown): Promise<AutomaticSpeechRecognitionOutput> {
		const res = response as FalAIAutomaticSpeechRecognitionOutput;
		if (typeof res?.text !== "string") {
			throw new InferenceClientProviderOutputError(
				`Received malformed response from Fal.ai Automatic Speech Recognition API: expected { text: string } format, got instead: ${JSON.stringify(
					response,
				)}`,
			);
		}
		return { text: res.text };
	}

	async preparePayloadAsync(args: AutomaticSpeechRecognitionArgs): Promise<RequestArgs> {
		const blob = "data" in args && args.data instanceof Blob ? args.data : "inputs" in args ? args.inputs : undefined;
		const contentType = blob?.type;
		if (!contentType) {
			throw new InferenceClientInputError(
				`Unable to determine the input's content-type. Make sure your are passing a Blob when using provider fal-ai.`,
			);
		}
		if (!FAL_AI_SUPPORTED_BLOB_TYPES.includes(contentType)) {
			throw new InferenceClientInputError(
				`Provider fal-ai does not support blob type ${contentType} - supported content types are: ${FAL_AI_SUPPORTED_BLOB_TYPES.join(
					", ",
				)}`,
			);
		}
		const base64audio = base64FromBytes(new Uint8Array(await blob.arrayBuffer()));
		return {
			...("data" in args ? omit(args, "data") : omit(args, "inputs")),
			audio_url: `data:${contentType};base64,${base64audio}`,
		};
	}
}

export class FalAITextToSpeechTask extends FalAITask {
	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters as Record<string, unknown>),
			text: params.args.inputs,
		};
	}

	override async getResponse(response: unknown): Promise<Blob> {
		const res = response as FalAITextToSpeechOutput;
		if (typeof res?.audio?.url !== "string") {
			throw new InferenceClientProviderOutputError(
				`Received malformed response from Fal.ai Text-to-Speech API: expected { audio: { url: string } } format, got instead: ${JSON.stringify(
					response,
				)}`,
			);
		}
		const urlResponse = await fetch(res.audio.url);
		if (!urlResponse.ok) {
			throw new InferenceClientProviderApiError(
				`Failed to fetch audio from ${res.audio.url}: ${urlResponse.statusText}`,
				{ url: res.audio.url, method: "GET", headers: { "Content-Type": "application/json" } },
				{
					requestId: urlResponse.headers.get("x-request-id") ?? "",
					status: urlResponse.status,
					body: await urlResponse.text(),
				},
			);
		}
		try {
			return await urlResponse.blob();
		} catch (error) {
			throw new InferenceClientProviderApiError(
				`Failed to fetch audio from ${res.audio.url}: ${error instanceof Error ? error.message : String(error)}`,
				{ url: res.audio.url, method: "GET", headers: { "Content-Type": "application/json" } },
				{
					requestId: urlResponse.headers.get("x-request-id") ?? "",
					status: urlResponse.status,
					body: await urlResponse.text(),
				},
			);
		}
	}
}
export class FalAIImageSegmentationTask extends FalAiQueueTask implements ImageSegmentationTaskHelper {
	task: InferenceTask;
	constructor() {
		super("https://queue.fal.run");
		this.task = "image-segmentation";
	}

	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...omit(params.args, ["inputs", "parameters"]),
			...(params.args.parameters as Record<string, unknown>),
			sync_mode: true,
		};
	}

	async preparePayloadAsync(args: ImageSegmentationArgs): Promise<RequestArgs> {
		const blob = "data" in args && args.data instanceof Blob ? args.data : "inputs" in args ? args.inputs : undefined;
		const mimeType = blob instanceof Blob ? blob.type : "image/png";
		const base64Image = base64FromBytes(
			new Uint8Array(blob instanceof ArrayBuffer ? blob : await (blob as Blob).arrayBuffer()),
		);
		return {
			...omit(args, ["inputs", "parameters", "data"]),
			...args.parameters,
			...args,
			image_url: `data:${mimeType};base64,${base64Image}`,
			sync_mode: true,
		};
	}

	override async getResponse(
		response: FalAiQueueOutput,
		url?: string,
		headers?: Record<string, string>,
	): Promise<ImageSegmentationOutput> {
		const result = await this.getResponseFromQueueApi(response, url, headers);
		if (
			typeof result === "object" &&
			result !== null &&
			"image" in result &&
			typeof result.image === "object" &&
			result.image !== null &&
			"url" in result.image &&
			typeof result.image.url === "string"
		) {
			const maskResponse = await fetch(result.image.url);
			if (!maskResponse.ok) {
				throw new InferenceClientProviderApiError(
					`Failed to fetch segmentation mask from ${result.image.url}`,
					{ url: result.image.url, method: "GET" },
					{
						requestId: maskResponse.headers.get("x-request-id") ?? "",
						status: maskResponse.status,
						body: await maskResponse.text(),
					},
				);
			}
			const maskBlob = await maskResponse.blob();
			const maskArrayBuffer = await maskBlob.arrayBuffer();
			const maskBase64 = base64FromBytes(new Uint8Array(maskArrayBuffer));

			return [
				{
					label: "mask", // placeholder label, as Fal does not provide labels in the response(?)
					score: 1.0, // placeholder score, as Fal does not provide scores in the response(?)
					mask: maskBase64,
				},
			];
		}

		throw new InferenceClientProviderOutputError(
			`Received malformed response from Fal.ai image-segmentation API: expected { image: { url: string } } format, got instead: ${JSON.stringify(
				response,
			)}`,
		);
	}
}
