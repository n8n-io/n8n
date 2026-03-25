import { z } from "zod";
import { StagehandAPIConstructorParams, StartSessionParams, StartSessionResult } from "../types/api";
import { GotoOptions } from "../types/playwright";
import { ActOptions, ActResult, ExtractOptions, ExtractResult, ObserveOptions, ObserveResult } from "../types/stagehand";
export declare class StagehandAPI {
    private apiKey;
    private projectId;
    private sessionId?;
    private logger;
    constructor({ apiKey, projectId, logger }: StagehandAPIConstructorParams);
    init({ modelName, modelApiKey, domSettleTimeoutMs, verbose, debugDom, systemPrompt, browserbaseSessionCreateParams, }: StartSessionParams): Promise<StartSessionResult>;
    act(options: ActOptions): Promise<ActResult>;
    extract<T extends z.AnyZodObject>(options: ExtractOptions<T>): Promise<ExtractResult<T>>;
    observe(options?: ObserveOptions): Promise<ObserveResult[]>;
    goto(url: string, options?: GotoOptions): Promise<void>;
    end(): Promise<Response>;
    private execute;
    private request;
}
