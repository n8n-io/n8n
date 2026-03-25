import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type TrainingFile = {
    fileId: string;
    weight?: number | undefined;
};
/** @internal */
export declare const TrainingFile$inboundSchema: z.ZodType<TrainingFile, z.ZodTypeDef, unknown>;
/** @internal */
export type TrainingFile$Outbound = {
    file_id: string;
    weight: number;
};
/** @internal */
export declare const TrainingFile$outboundSchema: z.ZodType<TrainingFile$Outbound, z.ZodTypeDef, TrainingFile>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TrainingFile$ {
    /** @deprecated use `TrainingFile$inboundSchema` instead. */
    const inboundSchema: z.ZodType<TrainingFile, z.ZodTypeDef, unknown>;
    /** @deprecated use `TrainingFile$outboundSchema` instead. */
    const outboundSchema: z.ZodType<TrainingFile$Outbound, z.ZodTypeDef, TrainingFile>;
    /** @deprecated use `TrainingFile$Outbound` instead. */
    type Outbound = TrainingFile$Outbound;
}
export declare function trainingFileToJSON(trainingFile: TrainingFile): string;
export declare function trainingFileFromJSON(jsonString: string): SafeParseResult<TrainingFile, SDKValidationError>;
//# sourceMappingURL=trainingfile.d.ts.map