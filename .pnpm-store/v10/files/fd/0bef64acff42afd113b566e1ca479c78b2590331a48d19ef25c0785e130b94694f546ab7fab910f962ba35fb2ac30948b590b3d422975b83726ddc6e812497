import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ImageURL = {
    url: string;
    detail?: string | null | undefined;
};
/** @internal */
export declare const ImageURL$inboundSchema: z.ZodType<ImageURL, z.ZodTypeDef, unknown>;
/** @internal */
export type ImageURL$Outbound = {
    url: string;
    detail?: string | null | undefined;
};
/** @internal */
export declare const ImageURL$outboundSchema: z.ZodType<ImageURL$Outbound, z.ZodTypeDef, ImageURL>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ImageURL$ {
    /** @deprecated use `ImageURL$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ImageURL, z.ZodTypeDef, unknown>;
    /** @deprecated use `ImageURL$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ImageURL$Outbound, z.ZodTypeDef, ImageURL>;
    /** @deprecated use `ImageURL$Outbound` instead. */
    type Outbound = ImageURL$Outbound;
}
export declare function imageURLToJSON(imageURL: ImageURL): string;
export declare function imageURLFromJSON(jsonString: string): SafeParseResult<ImageURL, SDKValidationError>;
//# sourceMappingURL=imageurl.d.ts.map