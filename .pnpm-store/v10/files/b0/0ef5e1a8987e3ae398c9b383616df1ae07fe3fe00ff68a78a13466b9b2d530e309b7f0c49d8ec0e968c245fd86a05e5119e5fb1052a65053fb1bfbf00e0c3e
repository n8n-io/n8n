import type { AutomaticSpeechRecognitionOutput, ImageSegmentationOutput } from "@huggingface/tasks";
import type { BodyParams, HeaderParams, InferenceTask, OutputType, RequestArgs, UrlParams } from "../types.js";
import type { ImageSegmentationTaskHelper, ImageToImageTaskHelper, ImageTextToImageTaskHelper, ImageTextToVideoTaskHelper } from "./providerHelper.js";
import { type AutomaticSpeechRecognitionTaskHelper, TaskProviderHelper, type TextToImageTaskHelper, type TextToVideoTaskHelper, type ImageToVideoTaskHelper } from "./providerHelper.js";
import type { AutomaticSpeechRecognitionArgs } from "../tasks/audio/automaticSpeechRecognition.js";
import type { ImageToImageArgs, ImageToVideoArgs } from "../tasks/index.js";
import type { ImageTextToImageArgs } from "../tasks/cv/imageTextToImage.js";
import type { ImageTextToVideoArgs } from "../tasks/cv/imageTextToVideo.js";
import type { ImageSegmentationArgs } from "../tasks/cv/imageSegmentation.js";
export interface FalAiQueueOutput {
    request_id: string;
    status: string;
    response_url: string;
}
export declare const FAL_AI_SUPPORTED_BLOB_TYPES: string[];
declare abstract class FalAITask extends TaskProviderHelper {
    constructor(url?: string);
    preparePayload(params: BodyParams): Record<string, unknown>;
    makeRoute(params: UrlParams): string;
    prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string>;
}
declare abstract class FalAiQueueTask extends FalAITask {
    abstract task: InferenceTask;
    makeRoute(params: UrlParams): string;
    getResponseFromQueueApi(response: FalAiQueueOutput, url?: string, headers?: Record<string, string>): Promise<unknown>;
}
export declare class FalAITextToImageTask extends FalAiQueueTask implements TextToImageTaskHelper {
    task: InferenceTask;
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: FalAiQueueOutput, url?: string, headers?: Record<string, string>, outputType?: OutputType): Promise<string | Blob | Record<string, unknown>>;
}
export declare class FalAIImageToImageTask extends FalAiQueueTask implements ImageToImageTaskHelper {
    task: InferenceTask;
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    preparePayloadAsync(args: ImageToImageArgs): Promise<RequestArgs>;
    getResponse(response: FalAiQueueOutput, url?: string, headers?: Record<string, string>): Promise<Blob>;
}
export declare class FalAIImageTextToImageTask extends FalAIImageToImageTask implements ImageTextToImageTaskHelper {
    constructor();
    preparePayloadAsync(args: ImageTextToImageArgs): Promise<RequestArgs>;
}
export declare class FalAITextToVideoTask extends FalAiQueueTask implements TextToVideoTaskHelper {
    task: InferenceTask;
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: FalAiQueueOutput, url?: string, headers?: Record<string, string>): Promise<Blob>;
}
export declare class FalAIImageToVideoTask extends FalAiQueueTask implements ImageToVideoTaskHelper {
    task: InferenceTask;
    constructor();
    /** Synchronous case – caller already gave us base64 or a URL */
    preparePayload(params: BodyParams): Record<string, unknown>;
    /** Asynchronous helper – caller gave us a Blob */
    preparePayloadAsync(args: ImageToVideoArgs): Promise<RequestArgs>;
    /** Queue polling + final download – mirrors Text‑to‑Video */
    getResponse(response: FalAiQueueOutput, url?: string, headers?: Record<string, string>): Promise<Blob>;
}
export declare class FalAIImageTextToVideoTask extends FalAIImageToVideoTask implements ImageTextToVideoTaskHelper {
    constructor();
    preparePayloadAsync(args: ImageTextToVideoArgs): Promise<RequestArgs>;
}
export declare class FalAIAutomaticSpeechRecognitionTask extends FalAITask implements AutomaticSpeechRecognitionTaskHelper {
    prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string>;
    getResponse(response: unknown): Promise<AutomaticSpeechRecognitionOutput>;
    preparePayloadAsync(args: AutomaticSpeechRecognitionArgs): Promise<RequestArgs>;
}
export declare class FalAITextToSpeechTask extends FalAITask {
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: unknown): Promise<Blob>;
}
export declare class FalAIImageSegmentationTask extends FalAiQueueTask implements ImageSegmentationTaskHelper {
    task: InferenceTask;
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    preparePayloadAsync(args: ImageSegmentationArgs): Promise<RequestArgs>;
    getResponse(response: FalAiQueueOutput, url?: string, headers?: Record<string, string>): Promise<ImageSegmentationOutput>;
}
export {};
//# sourceMappingURL=fal-ai.d.ts.map