import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ClassifierTrainingParameters = {
    trainingSteps?: number | null | undefined;
    learningRate: number | undefined;
    weightDecay?: number | null | undefined;
    warmupFraction?: number | null | undefined;
    epochs?: number | null | undefined;
    seqLen?: number | null | undefined;
};
/** @internal */
export declare const ClassifierTrainingParameters$inboundSchema: z.ZodType<ClassifierTrainingParameters, z.ZodTypeDef, unknown>;
export declare function classifierTrainingParametersFromJSON(jsonString: string): SafeParseResult<ClassifierTrainingParameters, SDKValidationError>;
//# sourceMappingURL=classifiertrainingparameters.d.ts.map