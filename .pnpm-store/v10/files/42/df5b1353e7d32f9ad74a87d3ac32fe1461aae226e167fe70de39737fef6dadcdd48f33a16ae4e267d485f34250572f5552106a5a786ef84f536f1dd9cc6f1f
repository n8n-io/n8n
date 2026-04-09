import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { OCRImageObject } from "./ocrimageobject.js";
import { OCRPageDimensions } from "./ocrpagedimensions.js";
import { OCRTableObject } from "./ocrtableobject.js";
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
     * List of all extracted tables in the page
     */
    tables?: Array<OCRTableObject> | undefined;
    /**
     * List of all hyperlinks in the page
     */
    hyperlinks?: Array<string> | undefined;
    /**
     * Header of the page
     */
    header?: string | null | undefined;
    /**
     * Footer of the page
     */
    footer?: string | null | undefined;
    /**
     * The dimensions of the PDF Page's screenshot image
     */
    dimensions: OCRPageDimensions | null;
};
/** @internal */
export declare const OCRPageObject$inboundSchema: z.ZodType<OCRPageObject, z.ZodTypeDef, unknown>;
export declare function ocrPageObjectFromJSON(jsonString: string): SafeParseResult<OCRPageObject, SDKValidationError>;
//# sourceMappingURL=ocrpageobject.d.ts.map