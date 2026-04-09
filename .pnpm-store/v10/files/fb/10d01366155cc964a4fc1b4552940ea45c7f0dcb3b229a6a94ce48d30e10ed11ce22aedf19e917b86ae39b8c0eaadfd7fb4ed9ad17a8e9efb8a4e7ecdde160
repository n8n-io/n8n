import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { Annotations } from "./annotations.js";
/**
 * Audio content for a message.
 */
export type AudioContent = {
    type?: "audio" | undefined;
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
export declare const AudioContent$inboundSchema: z.ZodType<AudioContent, z.ZodTypeDef, unknown>;
export declare function audioContentFromJSON(jsonString: string): SafeParseResult<AudioContent, SDKValidationError>;
//# sourceMappingURL=audiocontent.d.ts.map