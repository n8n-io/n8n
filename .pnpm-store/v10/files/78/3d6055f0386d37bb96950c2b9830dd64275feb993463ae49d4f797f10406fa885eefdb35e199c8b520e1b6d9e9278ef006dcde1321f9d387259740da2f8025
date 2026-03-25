import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type OCRUsageInfo = {
    /**
     * Number of pages processed
     */
    pagesProcessed: number;
    /**
     * Document size in bytes
     */
    docSizeBytes?: number | null | undefined;
};
/** @internal */
export declare const OCRUsageInfo$inboundSchema: z.ZodType<OCRUsageInfo, z.ZodTypeDef, unknown>;
/** @internal */
export type OCRUsageInfo$Outbound = {
    pages_processed: number;
    doc_size_bytes?: number | null | undefined;
};
/** @internal */
export declare const OCRUsageInfo$outboundSchema: z.ZodType<OCRUsageInfo$Outbound, z.ZodTypeDef, OCRUsageInfo>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace OCRUsageInfo$ {
    /** @deprecated use `OCRUsageInfo$inboundSchema` instead. */
    const inboundSchema: z.ZodType<OCRUsageInfo, z.ZodTypeDef, unknown>;
    /** @deprecated use `OCRUsageInfo$outboundSchema` instead. */
    const outboundSchema: z.ZodType<OCRUsageInfo$Outbound, z.ZodTypeDef, OCRUsageInfo>;
    /** @deprecated use `OCRUsageInfo$Outbound` instead. */
    type Outbound = OCRUsageInfo$Outbound;
}
export declare function ocrUsageInfoToJSON(ocrUsageInfo: OCRUsageInfo): string;
export declare function ocrUsageInfoFromJSON(jsonString: string): SafeParseResult<OCRUsageInfo, SDKValidationError>;
//# sourceMappingURL=ocrusageinfo.d.ts.map