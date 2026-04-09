import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type CompletionTrainingParameters = {
    trainingSteps?: number | null | undefined;
    learningRate: number | undefined;
    weightDecay?: number | null | undefined;
    warmupFraction?: number | null | undefined;
    epochs?: number | null | undefined;
    seqLen?: number | null | undefined;
    fimRatio?: number | null | undefined;
};
/** @internal */
export declare const CompletionTrainingParameters$inboundSchema: z.ZodType<CompletionTrainingParameters, z.ZodTypeDef, unknown>;
export declare function completionTrainingParametersFromJSON(jsonString: string): SafeParseResult<CompletionTrainingParameters, SDKValidationError>;
//# sourceMappingURL=completiontrainingparameters.d.ts.map