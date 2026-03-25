import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { OCRPageObject, OCRPageObject$Outbound } from "./ocrpageobject.js";
import { OCRUsageInfo, OCRUsageInfo$Outbound } from "./ocrusageinfo.js";
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
/** @internal */
export type OCRResponse$Outbound = {
    pages: Array<OCRPageObject$Outbound>;
    model: string;
    document_annotation?: string | null | undefined;
    usage_info: OCRUsageInfo$Outbound;
};
/** @internal */
export declare const OCRResponse$outboundSchema: z.ZodType<OCRResponse$Outbound, z.ZodTypeDef, OCRResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace OCRResponse$ {
    /** @deprecated use `OCRResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<OCRResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `OCRResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<OCRResponse$Outbound, z.ZodTypeDef, OCRResponse>;
    /** @deprecated use `OCRResponse$Outbound` instead. */
    type Outbound = OCRResponse$Outbound;
}
export declare function ocrResponseToJSON(ocrResponse: OCRResponse): string;
export declare function ocrResponseFromJSON(jsonString: string): SafeParseResult<OCRResponse, SDKValidationError>;
//# sourceMappingURL=ocrresponse.d.ts.map