import type { TextToVideoArgs } from "../tasks/index.js";
import type { BodyParams, UrlParams } from "../types.js";
import { BaseConversationalTask, BaseTextGenerationTask, TaskProviderHelper, type TextToVideoTaskHelper } from "./providerHelper.js";
export interface NovitaAsyncAPIOutput {
    task_id: string;
}
export declare class NovitaTextGenerationTask extends BaseTextGenerationTask {
    constructor();
    makeRoute(): string;
}
export declare class NovitaConversationalTask extends BaseConversationalTask {
    constructor();
    makeRoute(): string;
}
export declare class NovitaTextToVideoTask extends TaskProviderHelper implements TextToVideoTaskHelper {
    constructor();
    makeRoute(params: UrlParams): string;
    preparePayload(params: BodyParams<TextToVideoArgs>): Record<string, unknown>;
    getResponse(response: NovitaAsyncAPIOutput, url?: string, headers?: Record<string, string>): Promise<Blob>;
}
//# sourceMappingURL=novita.d.ts.map