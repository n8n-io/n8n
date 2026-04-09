import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ImageDetail } from "./imagedetail.js";
export type ImageURL = {
    url: string;
    detail?: ImageDetail | null | undefined;
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
export declare function imageURLToJSON(imageURL: ImageURL): string;
export declare function imageURLFromJSON(jsonString: string): SafeParseResult<ImageURL, SDKValidationError>;
//# sourceMappingURL=imageurl.d.ts.map