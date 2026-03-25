import type { BodyParams, HeaderParams, UrlParams } from "../types.js";
import { TaskProviderHelper, type TextToImageTaskHelper, type TextToVideoTaskHelper } from "./providerHelper.js";
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
    getResponse(res: ReplicateOutput | Blob, url?: string, headers?: Record<string, string>, outputType?: "url" | "blob"): Promise<string | Blob>;
}
export declare class ReplicateTextToSpeechTask extends ReplicateTask {
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: ReplicateOutput): Promise<Blob>;
}
export declare class ReplicateTextToVideoTask extends ReplicateTask implements TextToVideoTaskHelper {
    getResponse(response: ReplicateOutput): Promise<Blob>;
}
export {};
//# sourceMappingURL=replicate.d.ts.map