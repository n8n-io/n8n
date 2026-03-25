import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ClassifierTrainingParameters = {
    trainingSteps?: number | null | undefined;
    learningRate?: number | undefined;
    weightDecay?: number | null | undefined;
    warmupFraction?: number | null | undefined;
    epochs?: number | null | undefined;
    seqLen?: number | null | undefined;
};
/** @internal */
export declare const ClassifierTrainingParameters$inboundSchema: z.ZodType<ClassifierTrainingParameters, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassifierTrainingParameters$Outbound = {
    training_steps?: number | null | undefined;
    learning_rate: number;
    weight_decay?: number | null | undefined;
    warmup_fraction?: number | null | undefined;
    epochs?: number | null | undefined;
    seq_len?: number | null | undefined;
};
/** @internal */
export declare const ClassifierTrainingParameters$outboundSchema: z.ZodType<ClassifierTrainingParameters$Outbound, z.ZodTypeDef, ClassifierTrainingParameters>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierTrainingParameters$ {
    /** @deprecated use `ClassifierTrainingParameters$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassifierTrainingParameters, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassifierTrainingParameters$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassifierTrainingParameters$Outbound, z.ZodTypeDef, ClassifierTrainingParameters>;
    /** @deprecated use `ClassifierTrainingParameters$Outbound` instead. */
    type Outbound = ClassifierTrainingParameters$Outbound;
}
export declare function classifierTrainingParametersToJSON(classifierTrainingParameters: ClassifierTrainingParameters): string;
export declare function classifierTrainingParametersFromJSON(jsonString: string): SafeParseResult<ClassifierTrainingParameters, SDKValidationError>;
//# sourceMappingURL=classifiertrainingparameters.d.ts.map