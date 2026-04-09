import type { BodyParams, HeaderParams, UrlParams } from "../types.js";
import { TaskProviderHelper, type TextToImageTaskHelper } from "./providerHelper.js";
interface BlackForestLabsResponse {
    id: string;
    polling_url: string;
}
export declare class BlackForestLabsTextToImageTask extends TaskProviderHelper implements TextToImageTaskHelper {
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    prepareHeaders(params: HeaderParams, binary: boolean): Record<string, string>;
    makeRoute(params: UrlParams): string;
    getResponse(response: BlackForestLabsResponse, url?: string, headers?: HeadersInit, outputType?: "url" | "blob" | "json"): Promise<string | Blob | Record<string, unknown>>;
}
export {};
//# sourceMappingURL=black-forest-labs.d.ts.map