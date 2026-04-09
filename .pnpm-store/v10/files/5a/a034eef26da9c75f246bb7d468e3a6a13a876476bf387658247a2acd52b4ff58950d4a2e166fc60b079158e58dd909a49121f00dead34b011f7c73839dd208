import type { BodyParams, HeaderParams, OutputType, RequestArgs, UrlParams } from "../types.js";
import { TaskProviderHelper, type AutomaticSpeechRecognitionTaskHelper, type ImageToImageTaskHelper, type TextToImageTaskHelper, type TextToVideoTaskHelper } from "./providerHelper.js";
import type { ImageToImageArgs } from "../tasks/cv/imageToImage.js";
import type { AutomaticSpeechRecognitionArgs } from "../tasks/audio/automaticSpeechRecognition.js";
import type { AutomaticSpeechRecognitionOutput } from "@huggingface/tasks";
export interface ReplicateOutput {
    output?: string | string[];
}
declare abstract class ReplicateTask extends TaskProviderHelper {
    constructor(url?: string);
    makeRoute(params: UrlParams): string;
    preparePayload(params: BodyParams): Record<string, unknown>;
    prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string>;
    makeUrl(params: UrlParams): string;
}
export declare class ReplicateTextToImageTask extends ReplicateTask implements TextToImageTaskHelper {
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(res: ReplicateOutput | Blob, url?: string, headers?: Record<string, string>, outputType?: OutputType): Promise<string | Blob | Record<string, unknown>>;
}
export declare class ReplicateTextToSpeechTask extends ReplicateTask {
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: ReplicateOutput): Promise<Blob>;
}
export declare class ReplicateTextToVideoTask extends ReplicateTask implements TextToVideoTaskHelper {
    getResponse(response: ReplicateOutput): Promise<Blob>;
}
export declare class ReplicateAutomaticSpeechRecognitionTask extends ReplicateTask implements AutomaticSpeechRecognitionTaskHelper {
    preparePayload(params: BodyParams): Record<string, unknown>;
    preparePayloadAsync(args: AutomaticSpeechRecognitionArgs): Promise<RequestArgs>;
    getResponse(response: ReplicateOutput): Promise<AutomaticSpeechRecognitionOutput>;
}
export declare class ReplicateImageToImageTask extends ReplicateTask implements ImageToImageTaskHelper {
    preparePayload(params: BodyParams<ImageToImageArgs>): Record<string, unknown>;
    preparePayloadAsync(args: ImageToImageArgs): Promise<RequestArgs>;
    getResponse(response: ReplicateOutput): Promise<Blob>;
}
export {};
//# sourceMappingURL=replicate.d.ts.map