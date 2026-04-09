import type { BodyParams, HeaderParams, OutputType } from "../types.js";
import { BaseConversationalTask, TaskProviderHelper, type TextToImageTaskHelper } from "./providerHelper.js";
export declare class ZaiConversationalTask extends BaseConversationalTask {
    constructor();
    prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string>;
    makeRoute(): string;
}
interface ZaiTextToImageResponse {
    model: string;
    id: string;
    request_id: string;
    task_status: "PROCESSING" | "SUCCESS" | "FAIL";
}
export declare class ZaiTextToImageTask extends TaskProviderHelper implements TextToImageTaskHelper {
    constructor();
    prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string>;
    makeRoute(): string;
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: ZaiTextToImageResponse, url?: string, headers?: Record<string, string>, outputType?: OutputType): Promise<string | Blob | Record<string, unknown>>;
}
export {};
//# sourceMappingURL=zai-org.d.ts.map