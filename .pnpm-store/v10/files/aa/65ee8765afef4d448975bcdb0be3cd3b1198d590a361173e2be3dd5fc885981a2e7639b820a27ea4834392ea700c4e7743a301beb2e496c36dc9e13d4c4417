import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ApiEndpoint } from "./apiendpoint.js";
export type BatchJobIn = {
    inputFiles: Array<string>;
    endpoint: ApiEndpoint;
    model?: string | null | undefined;
    agentId?: string | null | undefined;
    metadata?: {
        [k: string]: string;
    } | null | undefined;
    timeoutHours?: number | undefined;
};
/** @internal */
export declare const BatchJobIn$inboundSchema: z.ZodType<BatchJobIn, z.ZodTypeDef, unknown>;
/** @internal */
export type BatchJobIn$Outbound = {
    input_files: Array<string>;
    endpoint: string;
    model?: string | null | undefined;
    agent_id?: string | null | undefined;
    metadata?: {
        [k: string]: string;
    } | null | undefined;
    timeout_hours: number;
};
/** @internal */
export declare const BatchJobIn$outboundSchema: z.ZodType<BatchJobIn$Outbound, z.ZodTypeDef, BatchJobIn>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace BatchJobIn$ {
    /** @deprecated use `BatchJobIn$inboundSchema` instead. */
    const inboundSchema: z.ZodType<BatchJobIn, z.ZodTypeDef, unknown>;
    /** @deprecated use `BatchJobIn$outboundSchema` instead. */
    const outboundSchema: z.ZodType<BatchJobIn$Outbound, z.ZodTypeDef, BatchJobIn>;
    /** @deprecated use `BatchJobIn$Outbound` instead. */
    type Outbound = BatchJobIn$Outbound;
}
export declare function batchJobInToJSON(batchJobIn: BatchJobIn): string;
export declare function batchJobInFromJSON(jsonString: string): SafeParseResult<BatchJobIn, SDKValidationError>;
//# sourceMappingURL=batchjobin.d.ts.map