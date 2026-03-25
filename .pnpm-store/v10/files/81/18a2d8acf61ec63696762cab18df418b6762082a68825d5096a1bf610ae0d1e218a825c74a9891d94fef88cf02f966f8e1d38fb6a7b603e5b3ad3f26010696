import * as z from "zod";
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
/** @internal */
export type OCRImageObject$Outbound = {
    id: string;
    top_left_x: number | null;
    top_left_y: number | null;
    bottom_right_x: number | null;
    bottom_right_y: number | null;
    image_base64?: string | null | undefined;
    image_annotation?: string | null | undefined;
};
/** @internal */
export declare const OCRImageObject$outboundSchema: z.ZodType<OCRImageObject$Outbound, z.ZodTypeDef, OCRImageObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace OCRImageObject$ {
    /** @deprecated use `OCRImageObject$inboundSchema` instead. */
    const inboundSchema: z.ZodType<OCRImageObject, z.ZodTypeDef, unknown>;
    /** @deprecated use `OCRImageObject$outboundSchema` instead. */
    const outboundSchema: z.ZodType<OCRImageObject$Outbound, z.ZodTypeDef, OCRImageObject>;
    /** @deprecated use `OCRImageObject$Outbound` instead. */
    type Outbound = OCRImageObject$Outbound;
}
export declare function ocrImageObjectToJSON(ocrImageObject: OCRImageObject): string;
export declare function ocrImageObjectFromJSON(jsonString: string): SafeParseResult<OCRImageObject, SDKValidationError>;
//# sourceMappingURL=ocrimageobject.d.ts.map