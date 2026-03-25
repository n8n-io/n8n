import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BatchError, BatchError$Outbound } from "./batcherror.js";
import { BatchJobStatus } from "./batchjobstatus.js";
export declare const BatchJobOutObject: {
    readonly Batch: "batch";
};
export type BatchJobOutObject = ClosedEnum<typeof BatchJobOutObject>;
export type BatchJobOut = {
    id: string;
    object?: BatchJobOutObject | undefined;
    inputFiles: Array<string>;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    endpoint: string;
    model?: string | null | undefined;
    agentId?: string | null | undefined;
    outputFile?: string | null | undefined;
    errorFile?: string | null | undefined;
    errors: Array<BatchError>;
    status: BatchJobStatus;
    createdAt: number;
    totalRequests: number;
    completedRequests: number;
    succeededRequests: number;
    failedRequests: number;
    startedAt?: number | null | undefined;
    completedAt?: number | null | undefined;
};
/** @internal */
export declare const BatchJobOutObject$inboundSchema: z.ZodNativeEnum<typeof BatchJobOutObject>;
/** @internal */
export declare const BatchJobOutObject$outboundSchema: z.ZodNativeEnum<typeof BatchJobOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace BatchJobOutObject$ {
    /** @deprecated use `BatchJobOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Batch: "batch";
    }>;
    /** @deprecated use `BatchJobOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Batch: "batch";
    }>;
}
/** @internal */
export declare const BatchJobOut$inboundSchema: z.ZodType<BatchJobOut, z.ZodTypeDef, unknown>;
/** @internal */
export type BatchJobOut$Outbound = {
    id: string;
    object: string;
    input_files: Array<string>;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    endpoint: string;
    model?: string | null | undefined;
    agent_id?: string | null | undefined;
    output_file?: string | null | undefined;
    error_file?: string | null | undefined;
    errors: Array<BatchError$Outbound>;
    status: string;
    created_at: number;
    total_requests: number;
    completed_requests: number;
    succeeded_requests: number;
    failed_requests: number;
    started_at?: number | null | undefined;
    completed_at?: number | null | undefined;
};
/** @internal */
export declare const BatchJobOut$outboundSchema: z.ZodType<BatchJobOut$Outbound, z.ZodTypeDef, BatchJobOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace BatchJobOut$ {
    /** @deprecated use `BatchJobOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<BatchJobOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `BatchJobOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<BatchJobOut$Outbound, z.ZodTypeDef, BatchJobOut>;
    /** @deprecated use `BatchJobOut$Outbound` instead. */
    type Outbound = BatchJobOut$Outbound;
}
export declare function batchJobOutToJSON(batchJobOut: BatchJobOut): string;
export declare function batchJobOutFromJSON(jsonString: string): SafeParseResult<BatchJobOut, SDKValidationError>;
//# sourceMappingURL=batchjobout.d.ts.map