import type { AutomaticSpeechRecognitionOutput } from "@huggingface/tasks";
import type { BodyParams, HeaderParams, RequestArgs, UrlParams } from "../types.js";
import { type AutomaticSpeechRecognitionTaskHelper, TaskProviderHelper, type TextToImageTaskHelper, type TextToVideoTaskHelper } from "./providerHelper.js";
import type { AutomaticSpeechRecognitionArgs } from "../tasks/audio/automaticSpeechRecognition.js";
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
export declare const FAL_AI_SUPPORTED_BLOB_TYPES: string[];
declare abstract class FalAITask extends TaskProviderHelper {
    constructor(url?: string);
    preparePayload(params: BodyParams): Record<string, unknown>;
    makeRoute(params: UrlParams): string;
    prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string>;
}
export declare class FalAITextToImageTask extends FalAITask implements TextToImageTaskHelper {
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: FalAITextToImageOutput, outputType?: "url" | "blob"): Promise<string | Blob>;
}
export declare class FalAITextToVideoTask extends FalAITask implements TextToVideoTaskHelper {
    constructor();
    makeRoute(params: UrlParams): string;
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: FalAiQueueOutput, url?: string, headers?: Record<string, string>): Promise<Blob>;
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
export {};
//# sourceMappingURL=fal-ai.d.ts.map