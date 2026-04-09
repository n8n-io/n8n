import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { Annotations } from "./annotations.js";
/**
 * Image content for a message.
 */
export type ImageContent = {
    type?: "image" | undefined;
    data: string;
    mimeType: string;
    annotations?: Annotations | null | undefined;
    meta?: {
        [k: string]: any;
    } | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const ImageContent$inboundSchema: z.ZodType<ImageContent, z.ZodTypeDef, unknown>;
export declare function imageContentFromJSON(jsonString: string): SafeParseResult<ImageContent, SDKValidationError>;
//# sourceMappingURL=imagecontent.d.ts.map