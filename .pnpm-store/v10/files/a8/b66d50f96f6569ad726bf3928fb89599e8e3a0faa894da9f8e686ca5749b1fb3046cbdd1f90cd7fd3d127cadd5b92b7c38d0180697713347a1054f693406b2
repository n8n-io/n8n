import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ImageURL, ImageURL$Outbound } from "./imageurl.js";
export type ImageURLChunkImageURL = ImageURL | string;
/**
 * {"type":"image_url","image_url":{"url":"data:image/png;base64,iVBORw0
 */
export type ImageURLChunk = {
    type?: "image_url" | undefined;
    imageUrl: ImageURL | string;
};
/** @internal */
export declare const ImageURLChunkImageURL$inboundSchema: z.ZodType<ImageURLChunkImageURL, z.ZodTypeDef, unknown>;
/** @internal */
export type ImageURLChunkImageURL$Outbound = ImageURL$Outbound | string;
/** @internal */
export declare const ImageURLChunkImageURL$outboundSchema: z.ZodType<ImageURLChunkImageURL$Outbound, z.ZodTypeDef, ImageURLChunkImageURL>;
export declare function imageURLChunkImageURLToJSON(imageURLChunkImageURL: ImageURLChunkImageURL): string;
export declare function imageURLChunkImageURLFromJSON(jsonString: string): SafeParseResult<ImageURLChunkImageURL, SDKValidationError>;
/** @internal */
export declare const ImageURLChunk$inboundSchema: z.ZodType<ImageURLChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type ImageURLChunk$Outbound = {
    type: "image_url";
    image_url: ImageURL$Outbound | string;
};
/** @internal */
export declare const ImageURLChunk$outboundSchema: z.ZodType<ImageURLChunk$Outbound, z.ZodTypeDef, ImageURLChunk>;
export declare function imageURLChunkToJSON(imageURLChunk: ImageURLChunk): string;
export declare function imageURLChunkFromJSON(jsonString: string): SafeParseResult<ImageURLChunk, SDKValidationError>;
//# sourceMappingURL=imageurlchunk.d.ts.map