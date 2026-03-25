import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ProcessingStatusOut = {
    documentId: string;
    processingStatus: string;
};
/** @internal */
export declare const ProcessingStatusOut$inboundSchema: z.ZodType<ProcessingStatusOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ProcessingStatusOut$Outbound = {
    document_id: string;
    processing_status: string;
};
/** @internal */
export declare const ProcessingStatusOut$outboundSchema: z.ZodType<ProcessingStatusOut$Outbound, z.ZodTypeDef, ProcessingStatusOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ProcessingStatusOut$ {
    /** @deprecated use `ProcessingStatusOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ProcessingStatusOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ProcessingStatusOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ProcessingStatusOut$Outbound, z.ZodTypeDef, ProcessingStatusOut>;
    /** @deprecated use `ProcessingStatusOut$Outbound` instead. */
    type Outbound = ProcessingStatusOut$Outbound;
}
export declare function processingStatusOutToJSON(processingStatusOut: ProcessingStatusOut): string;
export declare function processingStatusOutFromJSON(jsonString: string): SafeParseResult<ProcessingStatusOut, SDKValidationError>;
//# sourceMappingURL=processingstatusout.d.ts.map