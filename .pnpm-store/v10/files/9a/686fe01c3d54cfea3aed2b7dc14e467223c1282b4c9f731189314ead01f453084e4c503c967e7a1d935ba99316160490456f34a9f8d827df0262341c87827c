import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { OCRPageObject } from "./ocrpageobject.js";
import { OCRUsageInfo } from "./ocrusageinfo.js";
export type OCRResponse = {
    /**
     * List of OCR info for pages.
     */
    pages: Array<OCRPageObject>;
    /**
     * The model used to generate the OCR.
     */
    model: string;
    /**
     * Formatted response in the request_format if provided in json str
     */
    documentAnnotation?: string | null | undefined;
    usageInfo: OCRUsageInfo;
};
/** @internal */
export declare const OCRResponse$inboundSchema: z.ZodType<OCRResponse, z.ZodTypeDef, unknown>;
export declare function ocrResponseFromJSON(jsonString: string): SafeParseResult<OCRResponse, SDKValidationError>;
//# sourceMappingURL=ocrresponse.d.ts.map