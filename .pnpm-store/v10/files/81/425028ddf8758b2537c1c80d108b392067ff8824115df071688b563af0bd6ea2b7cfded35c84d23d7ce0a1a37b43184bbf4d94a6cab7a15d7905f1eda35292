import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Binary contents of a resource.
 */
export type BlobResourceContents = {
    uri: string;
    mimeType?: string | null | undefined;
    meta?: {
        [k: string]: any;
    } | null | undefined;
    blob: string;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const BlobResourceContents$inboundSchema: z.ZodType<BlobResourceContents, z.ZodTypeDef, unknown>;
export declare function blobResourceContentsFromJSON(jsonString: string): SafeParseResult<BlobResourceContents, SDKValidationError>;
//# sourceMappingURL=blobresourcecontents.d.ts.map