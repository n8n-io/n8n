import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Format of the table
 */
export declare const Format: {
    readonly Markdown: "markdown";
    readonly Html: "html";
};
/**
 * Format of the table
 */
export type Format = ClosedEnum<typeof Format>;
export type OCRTableObject = {
    /**
     * Table ID for extracted table in a page
     */
    id: string;
    /**
     * Content of the table in the given format
     */
    content: string;
    /**
     * Format of the table
     */
    format: Format;
};
/** @internal */
export declare const Format$inboundSchema: z.ZodNativeEnum<typeof Format>;
/** @internal */
export declare const OCRTableObject$inboundSchema: z.ZodType<OCRTableObject, z.ZodTypeDef, unknown>;
export declare function ocrTableObjectFromJSON(jsonString: string): SafeParseResult<OCRTableObject, SDKValidationError>;
//# sourceMappingURL=ocrtableobject.d.ts.map