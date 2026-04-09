import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { Annotations } from "./annotations.js";
/**
 * Text content for a message.
 */
export type TextContent = {
    type?: "text" | undefined;
    text: string;
    annotations?: Annotations | null | undefined;
    meta?: {
        [k: string]: any;
    } | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const TextContent$inboundSchema: z.ZodType<TextContent, z.ZodTypeDef, unknown>;
export declare function textContentFromJSON(jsonString: string): SafeParseResult<TextContent, SDKValidationError>;
//# sourceMappingURL=textcontent.d.ts.map