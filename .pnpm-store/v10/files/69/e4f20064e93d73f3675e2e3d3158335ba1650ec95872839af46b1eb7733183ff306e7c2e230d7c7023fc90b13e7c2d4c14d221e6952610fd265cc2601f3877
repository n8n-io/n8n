import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type CompletionTrainingParameters = {
    trainingSteps?: number | null | undefined;
    learningRate?: number | undefined;
    weightDecay?: number | null | undefined;
    warmupFraction?: number | null | undefined;
    epochs?: number | null | undefined;
    seqLen?: number | null | undefined;
    fimRatio?: number | null | undefined;
};
/** @internal */
export declare const CompletionTrainingParameters$inboundSchema: z.ZodType<CompletionTrainingParameters, z.ZodTypeDef, unknown>;
/** @internal */
export type CompletionTrainingParameters$Outbound = {
    training_steps?: number | null | undefined;
    learning_rate: number;
    weight_decay?: number | null | undefined;
    warmup_fraction?: number | null | undefined;
    epochs?: number | null | undefined;
    seq_len?: number | null | undefined;
    fim_ratio?: number | null | undefined;
};
/** @internal */
export declare const CompletionTrainingParameters$outboundSchema: z.ZodType<CompletionTrainingParameters$Outbound, z.ZodTypeDef, CompletionTrainingParameters>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionTrainingParameters$ {
    /** @deprecated use `CompletionTrainingParameters$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CompletionTrainingParameters, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionTrainingParameters$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CompletionTrainingParameters$Outbound, z.ZodTypeDef, CompletionTrainingParameters>;
    /** @deprecated use `CompletionTrainingParameters$Outbound` instead. */
    type Outbound = CompletionTrainingParameters$Outbound;
}
export declare function completionTrainingParametersToJSON(completionTrainingParameters: CompletionTrainingParameters): string;
export declare function completionTrainingParametersFromJSON(jsonString: string): SafeParseResult<CompletionTrainingParameters, SDKValidationError>;
//# sourceMappingURL=completiontrainingparameters.d.ts.map