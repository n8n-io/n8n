import type {
	AudioClassificationInput,
	AudioClassificationOutput,
	AutomaticSpeechRecognitionInput,
	AutomaticSpeechRecognitionOutput,
	ChatCompletionInput,
	ChatCompletionOutput,
	DocumentQuestionAnsweringInput,
	DocumentQuestionAnsweringOutput,
	FeatureExtractionInput,
	FeatureExtractionOutput,
	FillMaskInput,
	FillMaskOutput,
	ImageClassificationInput,
	ImageClassificationOutput,
	ImageSegmentationInput,
	ImageSegmentationOutput,
	ImageToImageInput,
	ImageToTextInput,
	ImageToTextOutput,
	ObjectDetectionInput,
	ObjectDetectionOutput,
	QuestionAnsweringInput,
	QuestionAnsweringOutput,
	SentenceSimilarityInput,
	SentenceSimilarityOutput,
	SummarizationInput,
	SummarizationOutput,
	TableQuestionAnsweringInput,
	TableQuestionAnsweringOutput,
	TextClassificationOutput,
	TextGenerationInput,
	TextGenerationOutput,
	TextToImageInput,
	TextToSpeechInput,
	TextToVideoInput,
	TokenClassificationInput,
	TokenClassificationOutput,
	TranslationInput,
	TranslationOutput,
	VisualQuestionAnsweringInput,
	VisualQuestionAnsweringOutput,
	ZeroShotClassificationInput,
	ZeroShotClassificationOutput,
	ZeroShotImageClassificationInput,
	ZeroShotImageClassificationOutput,
} from "@huggingface/tasks";
import { HF_ROUTER_URL } from "../config.js";
import { InferenceClientProviderOutputError } from "../errors.js";
import type { AudioToAudioOutput } from "../tasks/audio/audioToAudio.js";
import type { BaseArgs, BodyParams, HeaderParams, InferenceProvider, RequestArgs, UrlParams } from "../types.js";
import { toArray } from "../utils/toArray.js";
import type { ImageToImageArgs } from "../tasks/cv/imageToImage.js";
import type { AutomaticSpeechRecognitionArgs } from "../tasks/audio/automaticSpeechRecognition.js";

/**
 * Base class for task-specific provider helpers
 */
export abstract class TaskProviderHelper {
	constructor(
		readonly provider: InferenceProvider,
		private baseUrl: string,
		readonly clientSideRoutingOnly: boolean = false
	) {}

	/**
	 * Return the response in the expected format.
	 * Needs to be implemented in the subclasses.
	 */
	abstract getResponse(
		response: unknown,
		url?: string,
		headers?: HeadersInit,
		outputType?: "url" | "blob"
	): Promise<unknown>;

	/**
	 * Prepare the route for the request
	 * Needs to be implemented in the subclasses.
	 */
	abstract makeRoute(params: UrlParams): string;
	/**
	 * Prepare the payload for the request
	 * Needs to be implemented in the subclasses.
	 */
	abstract preparePayload(params: BodyParams): unknown;

	/**
	 * Prepare the base URL for the request
	 */
	makeBaseUrl(params: UrlParams): string {
		return params.authMethod !== "provider-key" ? `${HF_ROUTER_URL}/${this.provider}` : this.baseUrl;
	}

	/**
	 * Prepare the body for the request
	 */
	makeBody(params: BodyParams): BodyInit {
		if ("data" in params.args && !!params.args.data) {
			return params.args.data as BodyInit;
		}
		return JSON.stringify(this.preparePayload(params));
	}

	/**
	 * Prepare the URL for the request
	 */
	makeUrl(params: UrlParams): string {
		const baseUrl = this.makeBaseUrl(params);
		const route = this.makeRoute(params).replace(/^\/+/, "");
		return `${baseUrl}/${route}`;
	}

	/**
	 * Prepare the headers for the request
	 */
	prepareHeaders(params: HeaderParams, isBinary: boolean): Record<string, string> {
		const headers: Record<string, string> = { Authorization: `Bearer ${params.accessToken}` };
		if (!isBinary) {
			headers["Content-Type"] = "application/json";
		}
		return headers;
	}
}

// PER-TASK PROVIDER HELPER INTERFACES

// CV Tasks
export interface TextToImageTaskHelper {
	getResponse(
		response: unknown,
		url?: string,
		headers?: HeadersInit,
		outputType?: "url" | "blob"
	): Promise<string | Blob>;
	preparePayload(params: BodyParams<TextToImageInput & BaseArgs>): Record<string, unknown>;
}

export interface TextToVideoTaskHelper {
	getResponse(response: unknown, url?: string, headers?: Record<string, string>): Promise<Blob>;
	preparePayload(params: BodyParams<TextToVideoInput & BaseArgs>): Record<string, unknown>;
}

export interface ImageToImageTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<Blob>;
	preparePayload(params: BodyParams<ImageToImageInput & BaseArgs>): Record<string, unknown>;
	preparePayloadAsync(args: ImageToImageArgs): Promise<RequestArgs>;
}

export interface ImageSegmentationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<ImageSegmentationOutput>;
	preparePayload(params: BodyParams<ImageSegmentationInput & BaseArgs>): Record<string, unknown> | BodyInit;
}

export interface ImageClassificationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<ImageClassificationOutput>;
	preparePayload(params: BodyParams<ImageClassificationInput & BaseArgs>): Record<string, unknown> | BodyInit;
}

export interface ObjectDetectionTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<ObjectDetectionOutput>;
	preparePayload(params: BodyParams<ObjectDetectionInput & BaseArgs>): Record<string, unknown> | BodyInit;
}

export interface ImageToTextTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<ImageToTextOutput>;
	preparePayload(params: BodyParams<ImageToTextInput & BaseArgs>): Record<string, unknown> | BodyInit;
}

export interface ZeroShotImageClassificationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<ZeroShotImageClassificationOutput>;
	preparePayload(params: BodyParams<ZeroShotImageClassificationInput & BaseArgs>): Record<string, unknown> | BodyInit;
}

// NLP Tasks
export interface TextGenerationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<TextGenerationOutput>;
	preparePayload(params: BodyParams<TextGenerationInput & BaseArgs>): Record<string, unknown>;
}

export interface ConversationalTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<ChatCompletionOutput>;
	preparePayload(params: BodyParams<ChatCompletionInput & BaseArgs>): Record<string, unknown>;
}

export interface TextClassificationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<TextClassificationOutput>;
	preparePayload(params: BodyParams<ZeroShotClassificationInput & BaseArgs>): Record<string, unknown>;
}

export interface QuestionAnsweringTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<QuestionAnsweringOutput[number]>;
	preparePayload(params: BodyParams<QuestionAnsweringInput & BaseArgs>): Record<string, unknown>;
}

export interface FillMaskTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<FillMaskOutput>;
	preparePayload(params: BodyParams<FillMaskInput & BaseArgs>): Record<string, unknown>;
}

export interface ZeroShotClassificationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<ZeroShotClassificationOutput>;
	preparePayload(params: BodyParams<ZeroShotClassificationInput & BaseArgs>): Record<string, unknown>;
}

export interface SentenceSimilarityTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<SentenceSimilarityOutput>;
	preparePayload(params: BodyParams<SentenceSimilarityInput & BaseArgs>): Record<string, unknown>;
}

export interface TableQuestionAnsweringTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<TableQuestionAnsweringOutput[number]>;
	preparePayload(params: BodyParams<TableQuestionAnsweringInput & BaseArgs>): Record<string, unknown>;
}

export interface TokenClassificationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<TokenClassificationOutput>;
	preparePayload(params: BodyParams<TokenClassificationInput & BaseArgs>): Record<string, unknown>;
}

export interface TranslationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<TranslationOutput>;
	preparePayload(params: BodyParams<TranslationInput & BaseArgs>): Record<string, unknown>;
}

export interface SummarizationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<SummarizationOutput>;
	preparePayload(params: BodyParams<SummarizationInput & BaseArgs>): Record<string, unknown>;
}

// Audio Tasks
export interface TextToSpeechTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<Blob>;
	preparePayload(params: BodyParams<TextToSpeechInput & BaseArgs>): Record<string, unknown>;
}

export interface TextToAudioTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<Blob>;
	preparePayload(params: BodyParams<Record<string, unknown> & BaseArgs>): Record<string, unknown>;
}

export interface AudioToAudioTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<AudioToAudioOutput[]>;
	preparePayload(
		params: BodyParams<BaseArgs & { inputs: Blob } & Record<string, unknown>>
	): Record<string, unknown> | BodyInit;
}
export interface AutomaticSpeechRecognitionTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<AutomaticSpeechRecognitionOutput>;
	preparePayload(params: BodyParams<AutomaticSpeechRecognitionInput & BaseArgs>): Record<string, unknown> | BodyInit;
	preparePayloadAsync(args: AutomaticSpeechRecognitionArgs): Promise<RequestArgs>;
}

export interface AudioClassificationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<AudioClassificationOutput>;
	preparePayload(params: BodyParams<AudioClassificationInput & BaseArgs>): Record<string, unknown> | BodyInit;
}

// Multimodal Tasks
export interface DocumentQuestionAnsweringTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<DocumentQuestionAnsweringOutput[number]>;
	preparePayload(params: BodyParams<DocumentQuestionAnsweringInput & BaseArgs>): Record<string, unknown> | BodyInit;
}

export interface FeatureExtractionTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<FeatureExtractionOutput>;
	preparePayload(params: BodyParams<FeatureExtractionInput & BaseArgs>): Record<string, unknown>;
}

export interface VisualQuestionAnsweringTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<VisualQuestionAnsweringOutput[number]>;
	preparePayload(params: BodyParams<VisualQuestionAnsweringInput & BaseArgs>): Record<string, unknown> | BodyInit;
}

export interface TabularClassificationTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<number[]>;
	preparePayload(
		params: BodyParams<BaseArgs & { inputs: { data: Record<string, string[]> } } & Record<string, unknown>>
	): Record<string, unknown> | BodyInit;
}

export interface TabularRegressionTaskHelper {
	getResponse(response: unknown, url?: string, headers?: HeadersInit): Promise<number[]>;
	preparePayload(
		params: BodyParams<BaseArgs & { inputs: { data: Record<string, string[]> } } & Record<string, unknown>>
	): Record<string, unknown> | BodyInit;
}

// BASE IMPLEMENTATIONS FOR COMMON PATTERNS

export class BaseConversationalTask extends TaskProviderHelper implements ConversationalTaskHelper {
	constructor(provider: InferenceProvider, baseUrl: string, clientSideRoutingOnly: boolean = false) {
		super(provider, baseUrl, clientSideRoutingOnly);
	}

	makeRoute(): string {
		return "v1/chat/completions";
	}

	preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...params.args,
			model: params.model,
		};
	}

	async getResponse(response: ChatCompletionOutput): Promise<ChatCompletionOutput> {
		if (
			typeof response === "object" &&
			Array.isArray(response?.choices) &&
			typeof response?.created === "number" &&
			typeof response?.id === "string" &&
			typeof response?.model === "string" &&
			/// Together.ai and Nebius do not output a system_fingerprint
			(response.system_fingerprint === undefined ||
				response.system_fingerprint === null ||
				typeof response.system_fingerprint === "string") &&
			typeof response?.usage === "object"
		) {
			return response;
		}

		throw new InferenceClientProviderOutputError("Expected ChatCompletionOutput");
	}
}

export class BaseTextGenerationTask extends TaskProviderHelper implements TextGenerationTaskHelper {
	constructor(provider: InferenceProvider, baseUrl: string, clientSideRoutingOnly: boolean = false) {
		super(provider, baseUrl, clientSideRoutingOnly);
	}

	preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...params.args,
			model: params.model,
		};
	}

	makeRoute(): string {
		return "v1/completions";
	}

	async getResponse(response: unknown): Promise<TextGenerationOutput> {
		const res = toArray(response);
		if (
			Array.isArray(res) &&
			res.length > 0 &&
			res.every(
				(x): x is { generated_text: string } =>
					typeof x === "object" && !!x && "generated_text" in x && typeof x.generated_text === "string"
			)
		) {
			return res[0];
		}

		throw new InferenceClientProviderOutputError("Expected Array<{generated_text: string}>");
	}
}
