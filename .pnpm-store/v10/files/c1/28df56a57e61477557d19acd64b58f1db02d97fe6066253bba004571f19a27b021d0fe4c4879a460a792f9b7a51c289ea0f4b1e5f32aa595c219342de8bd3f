import type { OTELContext } from "./types.js";
import type { RunCreate, RunUpdate } from "../../schemas.js";
export type SerializedRunOperation<T extends "post" | "patch" = "post" | "patch"> = {
    operation: T;
    id: string;
    trace_id: string;
    run: T extends "post" ? RunCreate : RunUpdate;
};
export declare class LangSmithToOTELTranslator {
    private spans;
    exportBatch(operations: SerializedRunOperation[], otelContextMap: Map<string, OTELContext>): void;
    private createSpanForRun;
    private finishSpanSetup;
    private updateSpanForRun;
    private extractModelName;
    private setSpanAttributes;
    private setGenAiSystem;
    private setInvocationParameters;
    private setIOAttributes;
    private getUnifiedRunTokens;
    private extractUnifiedRunTokens;
}
