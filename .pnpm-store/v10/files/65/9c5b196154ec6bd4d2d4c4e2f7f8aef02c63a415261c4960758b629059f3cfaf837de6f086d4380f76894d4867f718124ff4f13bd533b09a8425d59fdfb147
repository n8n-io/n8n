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
import type { AudioClassificationOutput, AutomaticSpeechRecognitionOutput, ChatCompletionOutput, DocumentQuestionAnsweringOutput, FeatureExtractionOutput, FillMaskOutput, ImageClassificationOutput, ImageSegmentationOutput, ImageToTextOutput, ObjectDetectionOutput, QuestionAnsweringOutput, QuestionAnsweringOutputElement, SentenceSimilarityOutput, SummarizationOutput, TableQuestionAnsweringOutput, TextClassificationOutput, TextGenerationOutput, TokenClassificationOutput, TranslationOutput, VisualQuestionAnsweringOutput, ZeroShotClassificationOutput, ZeroShotImageClassificationOutput } from "@huggingface/tasks";
import type { TabularClassificationOutput } from "../tasks/tabular/tabularClassification.js";
import type { BodyParams, OutputType, RequestArgs, UrlParams } from "../types.js";
import type { AudioClassificationTaskHelper, AudioToAudioTaskHelper, AutomaticSpeechRecognitionTaskHelper, ConversationalTaskHelper, DocumentQuestionAnsweringTaskHelper, FeatureExtractionTaskHelper, FillMaskTaskHelper, ImageClassificationTaskHelper, ImageSegmentationTaskHelper, ImageToImageTaskHelper, ImageToTextTaskHelper, ObjectDetectionTaskHelper, QuestionAnsweringTaskHelper, SentenceSimilarityTaskHelper, SummarizationTaskHelper, TableQuestionAnsweringTaskHelper, TabularClassificationTaskHelper, TabularRegressionTaskHelper, TextClassificationTaskHelper, TextGenerationTaskHelper, TextToAudioTaskHelper, TextToImageTaskHelper, TextToSpeechTaskHelper, TokenClassificationTaskHelper, TranslationTaskHelper, VisualQuestionAnsweringTaskHelper, ZeroShotClassificationTaskHelper, ZeroShotImageClassificationTaskHelper } from "./providerHelper.js";
import { TaskProviderHelper } from "./providerHelper.js";
import type { ImageToImageArgs } from "../tasks/cv/imageToImage.js";
import type { AutomaticSpeechRecognitionArgs } from "../tasks/audio/automaticSpeechRecognition.js";
import type { ImageSegmentationArgs } from "../tasks/cv/imageSegmentation.js";
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
export declare const EQUIVALENT_SENTENCE_TRANSFORMERS_TASKS: readonly ["feature-extraction", "sentence-similarity"];
export declare class HFInferenceTask extends TaskProviderHelper {
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    makeUrl(params: UrlParams): string;
    makeRoute(params: UrlParams): string;
    getResponse(response: unknown): Promise<unknown>;
}
export declare class HFInferenceTextToImageTask extends HFInferenceTask implements TextToImageTaskHelper {
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: Base64ImageGeneration | OutputUrlImageGeneration, url?: string, headers?: HeadersInit, outputType?: OutputType): Promise<string | Blob | Record<string, unknown>>;
}
export declare class HFInferenceConversationalTask extends HFInferenceTask implements ConversationalTaskHelper {
    makeUrl(params: UrlParams): string;
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: ChatCompletionOutput): Promise<ChatCompletionOutput>;
}
export declare class HFInferenceTextGenerationTask extends HFInferenceTask implements TextGenerationTaskHelper {
    getResponse(response: TextGenerationOutput | TextGenerationOutput[]): Promise<TextGenerationOutput>;
}
export declare class HFInferenceAudioClassificationTask extends HFInferenceTask implements AudioClassificationTaskHelper {
    getResponse(response: unknown): Promise<AudioClassificationOutput>;
}
export declare class HFInferenceAutomaticSpeechRecognitionTask extends HFInferenceTask implements AutomaticSpeechRecognitionTaskHelper {
    getResponse(response: AutomaticSpeechRecognitionOutput): Promise<AutomaticSpeechRecognitionOutput>;
    preparePayloadAsync(args: AutomaticSpeechRecognitionArgs): Promise<RequestArgs>;
}
export declare class HFInferenceAudioToAudioTask extends HFInferenceTask implements AudioToAudioTaskHelper {
    getResponse(response: AudioToAudioOutput[]): Promise<AudioToAudioOutput[]>;
}
export declare class HFInferenceDocumentQuestionAnsweringTask extends HFInferenceTask implements DocumentQuestionAnsweringTaskHelper {
    getResponse(response: DocumentQuestionAnsweringOutput): Promise<DocumentQuestionAnsweringOutput[number]>;
}
export declare class HFInferenceFeatureExtractionTask extends HFInferenceTask implements FeatureExtractionTaskHelper {
    getResponse(response: FeatureExtractionOutput): Promise<FeatureExtractionOutput>;
}
export declare class HFInferenceImageClassificationTask extends HFInferenceTask implements ImageClassificationTaskHelper {
    getResponse(response: ImageClassificationOutput): Promise<ImageClassificationOutput>;
}
export declare class HFInferenceImageSegmentationTask extends HFInferenceTask implements ImageSegmentationTaskHelper {
    getResponse(response: ImageSegmentationOutput): Promise<ImageSegmentationOutput>;
    preparePayloadAsync(args: ImageSegmentationArgs): Promise<RequestArgs>;
}
export declare class HFInferenceImageToTextTask extends HFInferenceTask implements ImageToTextTaskHelper {
    getResponse(response: ImageToTextOutput): Promise<ImageToTextOutput>;
}
export declare class HFInferenceImageToImageTask extends HFInferenceTask implements ImageToImageTaskHelper {
    preparePayloadAsync(args: ImageToImageArgs): Promise<RequestArgs>;
    getResponse(response: Blob): Promise<Blob>;
}
export declare class HFInferenceObjectDetectionTask extends HFInferenceTask implements ObjectDetectionTaskHelper {
    getResponse(response: ObjectDetectionOutput): Promise<ObjectDetectionOutput>;
}
export declare class HFInferenceZeroShotImageClassificationTask extends HFInferenceTask implements ZeroShotImageClassificationTaskHelper {
    getResponse(response: ZeroShotImageClassificationOutput): Promise<ZeroShotImageClassificationOutput>;
}
export declare class HFInferenceTextClassificationTask extends HFInferenceTask implements TextClassificationTaskHelper {
    getResponse(response: TextClassificationOutput): Promise<TextClassificationOutput>;
}
export declare class HFInferenceQuestionAnsweringTask extends HFInferenceTask implements QuestionAnsweringTaskHelper {
    getResponse(response: QuestionAnsweringOutput | QuestionAnsweringOutput[number]): Promise<QuestionAnsweringOutputElement>;
}
export declare class HFInferenceFillMaskTask extends HFInferenceTask implements FillMaskTaskHelper {
    getResponse(response: FillMaskOutput): Promise<FillMaskOutput>;
}
export declare class HFInferenceZeroShotClassificationTask extends HFInferenceTask implements ZeroShotClassificationTaskHelper {
    getResponse(response: unknown): Promise<ZeroShotClassificationOutput>;
    private static validateOutputElement;
}
export declare class HFInferenceSentenceSimilarityTask extends HFInferenceTask implements SentenceSimilarityTaskHelper {
    getResponse(response: SentenceSimilarityOutput): Promise<SentenceSimilarityOutput>;
}
export declare class HFInferenceTableQuestionAnsweringTask extends HFInferenceTask implements TableQuestionAnsweringTaskHelper {
    static validate(elem: unknown): elem is TableQuestionAnsweringOutput[number];
    getResponse(response: TableQuestionAnsweringOutput): Promise<TableQuestionAnsweringOutput[number]>;
}
export declare class HFInferenceTokenClassificationTask extends HFInferenceTask implements TokenClassificationTaskHelper {
    getResponse(response: TokenClassificationOutput): Promise<TokenClassificationOutput>;
}
export declare class HFInferenceTranslationTask extends HFInferenceTask implements TranslationTaskHelper {
    getResponse(response: TranslationOutput): Promise<TranslationOutput>;
}
export declare class HFInferenceSummarizationTask extends HFInferenceTask implements SummarizationTaskHelper {
    getResponse(response: SummarizationOutput): Promise<SummarizationOutput>;
}
export declare class HFInferenceTextToSpeechTask extends HFInferenceTask implements TextToSpeechTaskHelper {
    getResponse(response: Blob): Promise<Blob>;
}
export declare class HFInferenceTabularClassificationTask extends HFInferenceTask implements TabularClassificationTaskHelper {
    getResponse(response: TabularClassificationOutput): Promise<TabularClassificationOutput>;
}
export declare class HFInferenceVisualQuestionAnsweringTask extends HFInferenceTask implements VisualQuestionAnsweringTaskHelper {
    getResponse(response: VisualQuestionAnsweringOutput): Promise<VisualQuestionAnsweringOutput[number]>;
}
export declare class HFInferenceTabularRegressionTask extends HFInferenceTask implements TabularRegressionTaskHelper {
    getResponse(response: number[]): Promise<number[]>;
}
export declare class HFInferenceTextToAudioTask extends HFInferenceTask implements TextToAudioTaskHelper {
    getResponse(response: Blob): Promise<Blob>;
}
export {};
//# sourceMappingURL=hf-inference.d.ts.map