import * as z from "zod/v3";
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
export declare function ocrPageDimensionsFromJSON(jsonString: string): SafeParseResult<OCRPageDimensions, SDKValidationError>;
//# sourceMappingURL=ocrpagedimensions.d.ts.map