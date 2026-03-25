import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type OCRPageDimensions = {
    /**
     * Dots per inch of the page-image
     */
    dpi: number;
    /**
     * Height of the image in pixels
     */
    height: number;
    /**
     * Width of the image in pixels
     */
    width: number;
};
/** @internal */
export declare const OCRPageDimensions$inboundSchema: z.ZodType<OCRPageDimensions, z.ZodTypeDef, unknown>;
/** @internal */
export type OCRPageDimensions$Outbound = {
    dpi: number;
    height: number;
    width: number;
};
/** @internal */
export declare const OCRPageDimensions$outboundSchema: z.ZodType<OCRPageDimensions$Outbound, z.ZodTypeDef, OCRPageDimensions>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace OCRPageDimensions$ {
    /** @deprecated use `OCRPageDimensions$inboundSchema` instead. */
    const inboundSchema: z.ZodType<OCRPageDimensions, z.ZodTypeDef, unknown>;
    /** @deprecated use `OCRPageDimensions$outboundSchema` instead. */
    const outboundSchema: z.ZodType<OCRPageDimensions$Outbound, z.ZodTypeDef, OCRPageDimensions>;
    /** @deprecated use `OCRPageDimensions$Outbound` instead. */
    type Outbound = OCRPageDimensions$Outbound;
}
export declare function ocrPageDimensionsToJSON(ocrPageDimensions: OCRPageDimensions): string;
export declare function ocrPageDimensionsFromJSON(jsonString: string): SafeParseResult<OCRPageDimensions, SDKValidationError>;
//# sourceMappingURL=ocrpagedimensions.d.ts.map