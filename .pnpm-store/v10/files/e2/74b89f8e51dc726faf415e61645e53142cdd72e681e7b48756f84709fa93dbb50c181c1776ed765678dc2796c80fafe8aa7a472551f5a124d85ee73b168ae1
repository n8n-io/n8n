import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { OCRImageObject, OCRImageObject$Outbound } from "./ocrimageobject.js";
import { OCRPageDimensions, OCRPageDimensions$Outbound } from "./ocrpagedimensions.js";
export type OCRPageObject = {
    /**
     * The page index in a pdf document starting from 0
     */
    index: number;
    /**
     * The markdown string response of the page
     */
    markdown: string;
    /**
     * List of all extracted images in the page
     */
    images: Array<OCRImageObject>;
    /**
     * The dimensions of the PDF Page's screenshot image
     */
    dimensions: OCRPageDimensions | null;
};
/** @internal */
export declare const OCRPageObject$inboundSchema: z.ZodType<OCRPageObject, z.ZodTypeDef, unknown>;
/** @internal */
export type OCRPageObject$Outbound = {
    index: number;
    markdown: string;
    images: Array<OCRImageObject$Outbound>;
    dimensions: OCRPageDimensions$Outbound | null;
};
/** @internal */
export declare const OCRPageObject$outboundSchema: z.ZodType<OCRPageObject$Outbound, z.ZodTypeDef, OCRPageObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace OCRPageObject$ {
    /** @deprecated use `OCRPageObject$inboundSchema` instead. */
    const inboundSchema: z.ZodType<OCRPageObject, z.ZodTypeDef, unknown>;
    /** @deprecated use `OCRPageObject$outboundSchema` instead. */
    const outboundSchema: z.ZodType<OCRPageObject$Outbound, z.ZodTypeDef, OCRPageObject>;
    /** @deprecated use `OCRPageObject$Outbound` instead. */
    type Outbound = OCRPageObject$Outbound;
}
export declare function ocrPageObjectToJSON(ocrPageObject: OCRPageObject): string;
export declare function ocrPageObjectFromJSON(jsonString: string): SafeParseResult<OCRPageObject, SDKValidationError>;
//# sourceMappingURL=ocrpageobject.d.ts.map