import type { TextToImageArgs } from "../tasks/cv/textToImage.js";
import type { ImageToImageArgs } from "../tasks/cv/imageToImage.js";
import type { ImageTextToImageArgs } from "../tasks/cv/imageTextToImage.js";
import type { TextToVideoArgs } from "../tasks/cv/textToVideo.js";
import type { ImageToVideoArgs } from "../tasks/cv/imageToVideo.js";
import type { BodyParams, OutputType, RequestArgs, UrlParams } from "../types.js";
import type { ImageTextToVideoArgs } from "../tasks/cv/imageTextToVideo.js";
import type { TextToImageTaskHelper, TextToVideoTaskHelper, ImageToImageTaskHelper, ImageToVideoTaskHelper, ImageTextToImageTaskHelper, ImageTextToVideoTaskHelper } from "./providerHelper.js";
import { TaskProviderHelper } from "./providerHelper.js";
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
 * Response structure for WaveSpeed AI API with submit response data
 */
interface WaveSpeedAISubmitTaskResponse {
    code: number;
    message: string;
    data: WaveSpeedAISubmitResponse;
}
declare abstract class WavespeedAITask extends TaskProviderHelper {
    constructor(url?: string);
    makeRoute(params: UrlParams): string;
    preparePayload(params: BodyParams<ImageToImageArgs | ImageTextToImageArgs | ImageTextToVideoArgs | TextToImageArgs | TextToVideoArgs | ImageToVideoArgs>): Record<string, unknown>;
    getResponse(response: WaveSpeedAISubmitTaskResponse, url?: string, headers?: Record<string, string>, outputType?: OutputType): Promise<string | Blob | Record<string, unknown>>;
}
export declare class WavespeedAITextToImageTask extends WavespeedAITask implements TextToImageTaskHelper {
    constructor();
}
export declare class WavespeedAITextToVideoTask extends WavespeedAITask implements TextToVideoTaskHelper {
    constructor();
    getResponse(response: WaveSpeedAISubmitTaskResponse, url?: string, headers?: Record<string, string>): Promise<Blob>;
}
export declare class WavespeedAIImageToImageTask extends WavespeedAITask implements ImageToImageTaskHelper {
    constructor();
    preparePayloadAsync(args: ImageToImageArgs): Promise<RequestArgs>;
    getResponse(response: WaveSpeedAISubmitTaskResponse, url?: string, headers?: Record<string, string>): Promise<Blob>;
}
export declare class WavespeedAIImageToVideoTask extends WavespeedAITask implements ImageToVideoTaskHelper {
    constructor();
    preparePayloadAsync(args: ImageToVideoArgs): Promise<RequestArgs>;
    getResponse(response: WaveSpeedAISubmitTaskResponse, url?: string, headers?: Record<string, string>): Promise<Blob>;
}
export declare class WavespeedAIImageTextToImageTask extends WavespeedAIImageToImageTask implements ImageTextToImageTaskHelper {
    constructor();
    preparePayloadAsync(args: ImageTextToImageArgs): Promise<RequestArgs>;
}
export declare class WavespeedAIImageTextToVideoTask extends WavespeedAIImageToVideoTask implements ImageTextToVideoTaskHelper {
    constructor();
    preparePayloadAsync(args: ImageTextToVideoArgs): Promise<RequestArgs>;
}
export {};
//# sourceMappingURL=wavespeed.d.ts.map