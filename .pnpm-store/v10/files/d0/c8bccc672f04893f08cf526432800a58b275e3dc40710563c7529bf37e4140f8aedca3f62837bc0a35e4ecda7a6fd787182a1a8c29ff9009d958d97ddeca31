import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Text contents of a resource.
 */
export type TextResourceContents = {
    uri: string;
    mimeType?: string | null | undefined;
    meta?: {
        [k: string]: any;
    } | null | undefined;
    text: string;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const TextResourceContents$inboundSchema: z.ZodType<TextResourceContents, z.ZodTypeDef, unknown>;
export declare function textResourceContentsFromJSON(jsonString: string): SafeParseResult<TextResourceContents, SDKValidationError>;
//# sourceMappingURL=textresourcecontents.d.ts.map