/**
 * HF-Inference do not have a mapping since all models use IDs from the Hub.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at HF and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to HF, please open an issue on the present repo
 * and we will tag HF team members.
 *
 * Thanks!
 */
import type {
	AudioClassificationOutput,
	AutomaticSpeechRecognitionOutput,
	ChatCompletionOutput,
	DocumentQuestionAnsweringOutput,
	FeatureExtractionOutput,
	FillMaskOutput,
	ImageClassificationOutput,
	ImageSegmentationOutput,
	ImageToTextOutput,
	ObjectDetectionOutput,
	QuestionAnsweringOutput,
	SentenceSimilarityOutput,
	SummarizationOutput,
	TableQuestionAnsweringOutput,
	TextClassificationOutput,
	TextGenerationOutput,
	TokenClassificationOutput,
	TranslationOutput,
	VisualQuestionAnsweringOutput,
	ZeroShotClassificationOutput,
	ZeroShotImageClassificationOutput,
} from "@huggingface/tasks";
import { HF_ROUTER_URL } from "../config.js";
import { InferenceClientProviderOutputError } from "../errors.js";
import type { TabularClassificationOutput } from "../tasks/tabular/tabularClassification.js";
import type { BodyParams, RequestArgs, UrlParams } from "../types.js";
import { toArray } from "../utils/toArray.js";
import type {
	AudioClassificationTaskHelper,
	AudioToAudioTaskHelper,
	AutomaticSpeechRecognitionTaskHelper,
	ConversationalTaskHelper,
	DocumentQuestionAnsweringTaskHelper,
	FeatureExtractionTaskHelper,
	FillMaskTaskHelper,
	ImageClassificationTaskHelper,
	ImageSegmentationTaskHelper,
	ImageToImageTaskHelper,
	ImageToTextTaskHelper,
	ObjectDetectionTaskHelper,
	QuestionAnsweringTaskHelper,
	SentenceSimilarityTaskHelper,
	SummarizationTaskHelper,
	TableQuestionAnsweringTaskHelper,
	TabularClassificationTaskHelper,
	TabularRegressionTaskHelper,
	TextClassificationTaskHelper,
	TextGenerationTaskHelper,
	TextToAudioTaskHelper,
	TextToImageTaskHelper,
	TextToSpeechTaskHelper,
	TokenClassificationTaskHelper,
	TranslationTaskHelper,
	VisualQuestionAnsweringTaskHelper,
	ZeroShotClassificationTaskHelper,
	ZeroShotImageClassificationTaskHelper,
} from "./providerHelper.js";

import { TaskProviderHelper } from "./providerHelper.js";
import { base64FromBytes } from "../utils/base64FromBytes.js";
import type { ImageToImageArgs } from "../tasks/cv/imageToImage.js";
import type { AutomaticSpeechRecognitionArgs } from "../tasks/audio/automaticSpeechRecognition.js";
import { omit } from "../utils/omit.js";
interface Base64ImageGeneration {
	data: Array<{
		b64_json: string;
	}>;
}

interface OutputUrlImageGeneration {
	output: string[];
}

interface AudioToAudioOutput {
	blob: string;
	"content-type": string;
	label: string;
}

export const EQUIVALENT_SENTENCE_TRANSFORMERS_TASKS = ["feature-extraction", "sentence-similarity"] as const;

export class HFInferenceTask extends TaskProviderHelper {
	constructor() {
		super("hf-inference", `${HF_ROUTER_URL}/hf-inference`);
	}
	preparePayload(params: BodyParams): Record<string, unknown> {
		return params.args;
	}
	override makeUrl(params: UrlParams): string {
		if (params.model.startsWith("http://") || params.model.startsWith("https://")) {
			return params.model;
		}
		return super.makeUrl(params);
	}

	makeRoute(params: UrlParams): string {
		if (params.task && ["feature-extraction", "sentence-similarity"].includes(params.task)) {
			// when deployed on hf-inference, those two tasks are automatically compatible with one another.
			return `models/${params.model}/pipeline/${params.task}`;
		}
		return `models/${params.model}`;
	}

	override async getResponse(response: unknown): Promise<unknown> {
		return response;
	}
}

export class HFInferenceTextToImageTask extends HFInferenceTask implements TextToImageTaskHelper {
	override async getResponse(
		response: Base64ImageGeneration | OutputUrlImageGeneration,
		url?: string,
		headers?: HeadersInit,
		outputType?: "url" | "blob"
	): Promise<string | Blob> {
		if (!response) {
			throw new InferenceClientProviderOutputError(
				"Received malformed response from HF-Inference text-to-image API: response is undefined"
			);
		}
		if (typeof response == "object") {
			if ("data" in response && Array.isArray(response.data) && response.data[0].b64_json) {
				const base64Data = response.data[0].b64_json;
				if (outputType === "url") {
					return `data:image/jpeg;base64,${base64Data}`;
				}
				const base64Response = await fetch(`data:image/jpeg;base64,${base64Data}`);
				return await base64Response.blob();
			}
			if ("output" in response && Array.isArray(response.output)) {
				if (outputType === "url") {
					return response.output[0];
				}
				const urlResponse = await fetch(response.output[0]);
				const blob = await urlResponse.blob();
				return blob;
			}
		}
		if (response instanceof Blob) {
			if (outputType === "url") {
				const b64 = await response.arrayBuffer().then((buf) => Buffer.from(buf).toString("base64"));
				return `data:image/jpeg;base64,${b64}`;
			}
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference text-to-image API: expected a Blob"
		);
	}
}

export class HFInferenceConversationalTask extends HFInferenceTask implements ConversationalTaskHelper {
	override makeUrl(params: UrlParams): string {
		let url: string;
		if (params.model.startsWith("http://") || params.model.startsWith("https://")) {
			url = params.model.trim();
		} else {
			url = `${this.makeBaseUrl(params)}/models/${params.model}`;
		}

		url = url.replace(/\/+$/, "");
		if (url.endsWith("/v1")) {
			url += "/chat/completions";
		} else if (!url.endsWith("/chat/completions")) {
			url += "/v1/chat/completions";
		}

		return url;
	}

	override preparePayload(params: BodyParams): Record<string, unknown> {
		return {
			...params.args,
			model: params.model,
		};
	}

	override async getResponse(response: ChatCompletionOutput): Promise<ChatCompletionOutput> {
		return response;
	}
}

export class HFInferenceTextGenerationTask extends HFInferenceTask implements TextGenerationTaskHelper {
	override async getResponse(response: TextGenerationOutput | TextGenerationOutput[]): Promise<TextGenerationOutput> {
		const res = toArray(response);
		if (Array.isArray(res) && res.every((x) => "generated_text" in x && typeof x?.generated_text === "string")) {
			return (res as TextGenerationOutput[])?.[0];
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference text generation API: expected Array<{generated_text: string}>"
		);
	}
}

export class HFInferenceAudioClassificationTask extends HFInferenceTask implements AudioClassificationTaskHelper {
	override async getResponse(response: unknown): Promise<AudioClassificationOutput> {
		if (
			Array.isArray(response) &&
			response.every(
				(x): x is { label: string; score: number } =>
					typeof x === "object" && x !== null && typeof x.label === "string" && typeof x.score === "number"
			)
		) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference audio-classification API: expected Array<{label: string, score: number}> but received different format"
		);
	}
}

export class HFInferenceAutomaticSpeechRecognitionTask
	extends HFInferenceTask
	implements AutomaticSpeechRecognitionTaskHelper
{
	override async getResponse(response: AutomaticSpeechRecognitionOutput): Promise<AutomaticSpeechRecognitionOutput> {
		return response;
	}

	async preparePayloadAsync(args: AutomaticSpeechRecognitionArgs): Promise<RequestArgs> {
		return "data" in args
			? args
			: {
					...omit(args, "inputs"),
					data: args.inputs,
			  };
	}
}

export class HFInferenceAudioToAudioTask extends HFInferenceTask implements AudioToAudioTaskHelper {
	override async getResponse(response: AudioToAudioOutput[]): Promise<AudioToAudioOutput[]> {
		if (!Array.isArray(response)) {
			throw new InferenceClientProviderOutputError(
				"Received malformed response from HF-Inference audio-to-audio API: expected Array"
			);
		}
		if (
			!response.every((elem): elem is AudioToAudioOutput => {
				return (
					typeof elem === "object" &&
					elem &&
					"label" in elem &&
					typeof elem.label === "string" &&
					"content-type" in elem &&
					typeof elem["content-type"] === "string" &&
					"blob" in elem &&
					typeof elem.blob === "string"
				);
			})
		) {
			throw new InferenceClientProviderOutputError(
				"Received malformed response from HF-Inference audio-to-audio API: expected Array<{label: string, audio: Blob}>"
			);
		}
		return response;
	}
}

export class HFInferenceDocumentQuestionAnsweringTask
	extends HFInferenceTask
	implements DocumentQuestionAnsweringTaskHelper
{
	override async getResponse(
		response: DocumentQuestionAnsweringOutput
	): Promise<DocumentQuestionAnsweringOutput[number]> {
		if (
			Array.isArray(response) &&
			response.every(
				(elem) =>
					typeof elem === "object" &&
					!!elem &&
					typeof elem?.answer === "string" &&
					(typeof elem.end === "number" || typeof elem.end === "undefined") &&
					(typeof elem.score === "number" || typeof elem.score === "undefined") &&
					(typeof elem.start === "number" || typeof elem.start === "undefined")
			)
		) {
			return response[0];
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference document-question-answering API: expected Array<{answer: string, end: number, score: number, start: number}>"
		);
	}
}

export class HFInferenceFeatureExtractionTask extends HFInferenceTask implements FeatureExtractionTaskHelper {
	override async getResponse(response: FeatureExtractionOutput): Promise<FeatureExtractionOutput> {
		const isNumArrayRec = (arr: unknown[], maxDepth: number, curDepth = 0): boolean => {
			if (curDepth > maxDepth) return false;
			if (arr.every((x) => Array.isArray(x))) {
				return arr.every((x) => isNumArrayRec(x as unknown[], maxDepth, curDepth + 1));
			} else {
				return arr.every((x) => typeof x === "number");
			}
		};
		if (Array.isArray(response) && isNumArrayRec(response, 3, 0)) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference feature-extraction API: expected Array<number[][][] | number[][] | number[] | number>"
		);
	}
}

export class HFInferenceImageClassificationTask extends HFInferenceTask implements ImageClassificationTaskHelper {
	override async getResponse(response: ImageClassificationOutput): Promise<ImageClassificationOutput> {
		if (Array.isArray(response) && response.every((x) => typeof x.label === "string" && typeof x.score === "number")) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference image-classification API: expected Array<{label: string, score: number}>"
		);
	}
}

export class HFInferenceImageSegmentationTask extends HFInferenceTask implements ImageSegmentationTaskHelper {
	override async getResponse(response: ImageSegmentationOutput): Promise<ImageSegmentationOutput> {
		if (
			Array.isArray(response) &&
			response.every(
				(x) =>
					typeof x.label === "string" &&
					typeof x.mask === "string" &&
					(x.score === undefined || typeof x.score === "number")
			)
		) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference image-segmentation API: expected Array<{label: string, mask: string, score: number}>"
		);
	}
}

export class HFInferenceImageToTextTask extends HFInferenceTask implements ImageToTextTaskHelper {
	override async getResponse(response: ImageToTextOutput): Promise<ImageToTextOutput> {
		if (typeof response?.generated_text !== "string") {
			throw new InferenceClientProviderOutputError(
				"Received malformed response from HF-Inference image-to-text API: expected {generated_text: string}"
			);
		}
		return response;
	}
}

export class HFInferenceImageToImageTask extends HFInferenceTask implements ImageToImageTaskHelper {
	async preparePayloadAsync(args: ImageToImageArgs): Promise<RequestArgs> {
		if (!args.parameters) {
			return {
				...args,
				model: args.model,
				data: args.inputs,
			};
		} else {
			return {
				...args,
				inputs: base64FromBytes(
					new Uint8Array(args.inputs instanceof ArrayBuffer ? args.inputs : await (args.inputs as Blob).arrayBuffer())
				),
			};
		}
	}

	override async getResponse(response: Blob): Promise<Blob> {
		if (response instanceof Blob) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference image-to-image API: expected Blob"
		);
	}
}

export class HFInferenceObjectDetectionTask extends HFInferenceTask implements ObjectDetectionTaskHelper {
	override async getResponse(response: ObjectDetectionOutput): Promise<ObjectDetectionOutput> {
		if (
			Array.isArray(response) &&
			response.every(
				(x) =>
					typeof x.label === "string" &&
					typeof x.score === "number" &&
					typeof x.box.xmin === "number" &&
					typeof x.box.ymin === "number" &&
					typeof x.box.xmax === "number" &&
					typeof x.box.ymax === "number"
			)
		) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference object-detection API: expected Array<{label: string, score: number, box: {xmin: number, ymin: number, xmax: number, ymax: number}}>"
		);
	}
}

export class HFInferenceZeroShotImageClassificationTask
	extends HFInferenceTask
	implements ZeroShotImageClassificationTaskHelper
{
	override async getResponse(response: ZeroShotImageClassificationOutput): Promise<ZeroShotImageClassificationOutput> {
		if (Array.isArray(response) && response.every((x) => typeof x.label === "string" && typeof x.score === "number")) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference zero-shot-image-classification API: expected Array<{label: string, score: number}>"
		);
	}
}

export class HFInferenceTextClassificationTask extends HFInferenceTask implements TextClassificationTaskHelper {
	override async getResponse(response: TextClassificationOutput): Promise<TextClassificationOutput> {
		const output = response?.[0];
		if (Array.isArray(output) && output.every((x) => typeof x?.label === "string" && typeof x.score === "number")) {
			return output;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference text-classification API: expected Array<{label: string, score: number}>"
		);
	}
}

export class HFInferenceQuestionAnsweringTask extends HFInferenceTask implements QuestionAnsweringTaskHelper {
	override async getResponse(
		response: QuestionAnsweringOutput | QuestionAnsweringOutput[number]
	): Promise<QuestionAnsweringOutput[number]> {
		if (
			Array.isArray(response)
				? response.every(
						(elem) =>
							typeof elem === "object" &&
							!!elem &&
							typeof elem.answer === "string" &&
							typeof elem.end === "number" &&
							typeof elem.score === "number" &&
							typeof elem.start === "number"
				  )
				: typeof response === "object" &&
				  !!response &&
				  typeof response.answer === "string" &&
				  typeof response.end === "number" &&
				  typeof response.score === "number" &&
				  typeof response.start === "number"
		) {
			return Array.isArray(response) ? response[0] : response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference question-answering API: expected Array<{answer: string, end: number, score: number, start: number}>"
		);
	}
}

export class HFInferenceFillMaskTask extends HFInferenceTask implements FillMaskTaskHelper {
	override async getResponse(response: FillMaskOutput): Promise<FillMaskOutput> {
		if (
			Array.isArray(response) &&
			response.every(
				(x) =>
					typeof x.score === "number" &&
					typeof x.sequence === "string" &&
					typeof x.token === "number" &&
					typeof x.token_str === "string"
			)
		) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference fill-mask API: expected Array<{score: number, sequence: string, token: number, token_str: string}>"
		);
	}
}

export class HFInferenceZeroShotClassificationTask extends HFInferenceTask implements ZeroShotClassificationTaskHelper {
	override async getResponse(response: ZeroShotClassificationOutput): Promise<ZeroShotClassificationOutput> {
		if (
			Array.isArray(response) &&
			response.every(
				(x) =>
					Array.isArray(x.labels) &&
					x.labels.every((_label) => typeof _label === "string") &&
					Array.isArray(x.scores) &&
					x.scores.every((_score) => typeof _score === "number") &&
					typeof x.sequence === "string"
			)
		) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference zero-shot-classification API: expected Array<{labels: string[], scores: number[], sequence: string}>"
		);
	}
}

export class HFInferenceSentenceSimilarityTask extends HFInferenceTask implements SentenceSimilarityTaskHelper {
	override async getResponse(response: SentenceSimilarityOutput): Promise<SentenceSimilarityOutput> {
		if (Array.isArray(response) && response.every((x) => typeof x === "number")) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference sentence-similarity API: expected Array<number>"
		);
	}
}

export class HFInferenceTableQuestionAnsweringTask extends HFInferenceTask implements TableQuestionAnsweringTaskHelper {
	static validate(elem: unknown): elem is TableQuestionAnsweringOutput[number] {
		return (
			typeof elem === "object" &&
			!!elem &&
			"aggregator" in elem &&
			typeof elem.aggregator === "string" &&
			"answer" in elem &&
			typeof elem.answer === "string" &&
			"cells" in elem &&
			Array.isArray(elem.cells) &&
			elem.cells.every((x: unknown): x is string => typeof x === "string") &&
			"coordinates" in elem &&
			Array.isArray(elem.coordinates) &&
			elem.coordinates.every(
				(coord: unknown): coord is number[] => Array.isArray(coord) && coord.every((x) => typeof x === "number")
			)
		);
	}
	override async getResponse(response: TableQuestionAnsweringOutput): Promise<TableQuestionAnsweringOutput[number]> {
		if (
			Array.isArray(response) && Array.isArray(response)
				? response.every((elem) => HFInferenceTableQuestionAnsweringTask.validate(elem))
				: HFInferenceTableQuestionAnsweringTask.validate(response)
		) {
			return Array.isArray(response) ? response[0] : response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference table-question-answering API: expected {aggregator: string, answer: string, cells: string[], coordinates: number[][]}"
		);
	}
}

export class HFInferenceTokenClassificationTask extends HFInferenceTask implements TokenClassificationTaskHelper {
	override async getResponse(response: TokenClassificationOutput): Promise<TokenClassificationOutput> {
		if (
			Array.isArray(response) &&
			response.every(
				(x) =>
					typeof x.end === "number" &&
					typeof x.entity_group === "string" &&
					typeof x.score === "number" &&
					typeof x.start === "number" &&
					typeof x.word === "string"
			)
		) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference token-classification API: expected Array<{end: number, entity_group: string, score: number, start: number, word: string}>"
		);
	}
}

export class HFInferenceTranslationTask extends HFInferenceTask implements TranslationTaskHelper {
	override async getResponse(response: TranslationOutput): Promise<TranslationOutput> {
		if (Array.isArray(response) && response.every((x) => typeof x?.translation_text === "string")) {
			return response?.length === 1 ? response?.[0] : response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference translation API: expected Array<{translation_text: string}>"
		);
	}
}

export class HFInferenceSummarizationTask extends HFInferenceTask implements SummarizationTaskHelper {
	override async getResponse(response: SummarizationOutput): Promise<SummarizationOutput> {
		if (Array.isArray(response) && response.every((x) => typeof x?.summary_text === "string")) {
			return response?.[0];
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference summarization API: expected Array<{summary_text: string}>"
		);
	}
}

export class HFInferenceTextToSpeechTask extends HFInferenceTask implements TextToSpeechTaskHelper {
	override async getResponse(response: Blob): Promise<Blob> {
		return response;
	}
}

export class HFInferenceTabularClassificationTask extends HFInferenceTask implements TabularClassificationTaskHelper {
	override async getResponse(response: TabularClassificationOutput): Promise<TabularClassificationOutput> {
		if (Array.isArray(response) && response.every((x) => typeof x === "number")) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference tabular-classification API: expected Array<number>"
		);
	}
}

export class HFInferenceVisualQuestionAnsweringTask
	extends HFInferenceTask
	implements VisualQuestionAnsweringTaskHelper
{
	override async getResponse(response: VisualQuestionAnsweringOutput): Promise<VisualQuestionAnsweringOutput[number]> {
		if (
			Array.isArray(response) &&
			response.every(
				(elem) =>
					typeof elem === "object" && !!elem && typeof elem?.answer === "string" && typeof elem.score === "number"
			)
		) {
			return response[0];
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference visual-question-answering API: expected Array<{answer: string, score: number}>"
		);
	}
}

export class HFInferenceTabularRegressionTask extends HFInferenceTask implements TabularRegressionTaskHelper {
	override async getResponse(response: number[]): Promise<number[]> {
		if (Array.isArray(response) && response.every((x) => typeof x === "number")) {
			return response;
		}
		throw new InferenceClientProviderOutputError(
			"Received malformed response from HF-Inference tabular-regression API: expected Array<number>"
		);
	}
}

export class HFInferenceTextToAudioTask extends HFInferenceTask implements TextToAudioTaskHelper {
	override async getResponse(response: Blob): Promise<Blob> {
		return response;
	}
}
