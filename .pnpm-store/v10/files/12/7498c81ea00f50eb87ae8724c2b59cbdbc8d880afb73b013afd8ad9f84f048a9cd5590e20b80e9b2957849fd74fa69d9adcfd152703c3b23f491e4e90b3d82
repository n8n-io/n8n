import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BatchJobOut, BatchJobOut$Outbound } from "./batchjobout.js";
export declare const BatchJobsOutObject: {
    readonly List: "list";
};
export type BatchJobsOutObject = ClosedEnum<typeof BatchJobsOutObject>;
export type BatchJobsOut = {
    data?: Array<BatchJobOut> | undefined;
    object?: BatchJobsOutObject | undefined;
    total: number;
};
/** @internal */
export declare const BatchJobsOutObject$inboundSchema: z.ZodNativeEnum<typeof BatchJobsOutObject>;
/** @internal */
export declare const BatchJobsOutObject$outboundSchema: z.ZodNativeEnum<typeof BatchJobsOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace BatchJobsOutObject$ {
    /** @deprecated use `BatchJobsOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly List: "list";
    }>;
    /** @deprecated use `BatchJobsOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly List: "list";
    }>;
}
/** @internal */
export declare const BatchJobsOut$inboundSchema: z.ZodType<BatchJobsOut, z.ZodTypeDef, unknown>;
/** @internal */
export type BatchJobsOut$Outbound = {
    data?: Array<BatchJobOut$Outbound> | undefined;
    object: string;
    total: number;
};
/** @internal */
export declare const BatchJobsOut$outboundSchema: z.ZodType<BatchJobsOut$Outbound, z.ZodTypeDef, BatchJobsOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace BatchJobsOut$ {
    /** @deprecated use `BatchJobsOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<BatchJobsOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `BatchJobsOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<BatchJobsOut$Outbound, z.ZodTypeDef, BatchJobsOut>;
    /** @deprecated use `BatchJobsOut$Outbound` instead. */
    type Outbound = BatchJobsOut$Outbound;
}
export declare function batchJobsOutToJSON(batchJobsOut: BatchJobsOut): string;
export declare function batchJobsOutFromJSON(jsonString: string): SafeParseResult<BatchJobsOut, SDKValidationError>;
//# sourceMappingURL=batchjobsout.d.ts.map