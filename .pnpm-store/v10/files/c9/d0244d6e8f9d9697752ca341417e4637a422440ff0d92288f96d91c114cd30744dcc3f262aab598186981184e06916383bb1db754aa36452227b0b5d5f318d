import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type OCRImageObject = {
    /**
     * Image ID for extracted image in a page
     */
    id: string;
    /**
     * X coordinate of top-left corner of the extracted image
     */
    topLeftX: number | null;
    /**
     * Y coordinate of top-left corner of the extracted image
     */
    topLeftY: number | null;
    /**
     * X coordinate of bottom-right corner of the extracted image
     */
    bottomRightX: number | null;
    /**
     * Y coordinate of bottom-right corner of the extracted image
     */
    bottomRightY: number | null;
    /**
     * Base64 string of the extracted image
     */
    imageBase64?: string | null | undefined;
    /**
     * Annotation of the extracted image in json str
     */
    imageAnnotation?: string | null | undefined;
};
/** @internal */
export declare const OCRImageObject$inboundSchema: z.ZodType<OCRImageObject, z.ZodTypeDef, unknown>;
export declare function ocrImageObjectFromJSON(jsonString: string): SafeParseResult<OCRImageObject, SDKValidationError>;
//# sourceMappingURL=ocrimageobject.d.ts.map