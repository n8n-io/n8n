import * as z from "zod/v3";
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
export declare function ocrUsageInfoFromJSON(jsonString: string): SafeParseResult<OCRUsageInfo, SDKValidationError>;
//# sourceMappingURL=ocrusageinfo.d.ts.map