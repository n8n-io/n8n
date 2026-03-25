import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ImageURL, ImageURL$Outbound } from "./imageurl.js";
export type ImageURLChunkImageURL = ImageURL | string;
export declare const ImageURLChunkType: {
    readonly ImageUrl: "image_url";
};
export type ImageURLChunkType = ClosedEnum<typeof ImageURLChunkType>;
/**
 * {"type":"image_url","image_url":{"url":"data:image/png;base64,iVBORw0
 */
export type ImageURLChunk = {
    imageUrl: ImageURL | string;
    type?: ImageURLChunkType | undefined;
};
/** @internal */
export declare const ImageURLChunkImageURL$inboundSchema: z.ZodType<ImageURLChunkImageURL, z.ZodTypeDef, unknown>;
/** @internal */
export type ImageURLChunkImageURL$Outbound = ImageURL$Outbound | string;
/** @internal */
export declare const ImageURLChunkImageURL$outboundSchema: z.ZodType<ImageURLChunkImageURL$Outbound, z.ZodTypeDef, ImageURLChunkImageURL>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ImageURLChunkImageURL$ {
    /** @deprecated use `ImageURLChunkImageURL$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ImageURLChunkImageURL, z.ZodTypeDef, unknown>;
    /** @deprecated use `ImageURLChunkImageURL$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ImageURLChunkImageURL$Outbound, z.ZodTypeDef, ImageURLChunkImageURL>;
    /** @deprecated use `ImageURLChunkImageURL$Outbound` instead. */
    type Outbound = ImageURLChunkImageURL$Outbound;
}
export declare function imageURLChunkImageURLToJSON(imageURLChunkImageURL: ImageURLChunkImageURL): string;
export declare function imageURLChunkImageURLFromJSON(jsonString: string): SafeParseResult<ImageURLChunkImageURL, SDKValidationError>;
/** @internal */
export declare const ImageURLChunkType$inboundSchema: z.ZodNativeEnum<typeof ImageURLChunkType>;
/** @internal */
export declare const ImageURLChunkType$outboundSchema: z.ZodNativeEnum<typeof ImageURLChunkType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ImageURLChunkType$ {
    /** @deprecated use `ImageURLChunkType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ImageUrl: "image_url";
    }>;
    /** @deprecated use `ImageURLChunkType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ImageUrl: "image_url";
    }>;
}
/** @internal */
export declare const ImageURLChunk$inboundSchema: z.ZodType<ImageURLChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type ImageURLChunk$Outbound = {
    image_url: ImageURL$Outbound | string;
    type: string;
};
/** @internal */
export declare const ImageURLChunk$outboundSchema: z.ZodType<ImageURLChunk$Outbound, z.ZodTypeDef, ImageURLChunk>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ImageURLChunk$ {
    /** @deprecated use `ImageURLChunk$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ImageURLChunk, z.ZodTypeDef, unknown>;
    /** @deprecated use `ImageURLChunk$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ImageURLChunk$Outbound, z.ZodTypeDef, ImageURLChunk>;
    /** @deprecated use `ImageURLChunk$Outbound` instead. */
    type Outbound = ImageURLChunk$Outbound;
}
export declare function imageURLChunkToJSON(imageURLChunk: ImageURLChunk): string;
export declare function imageURLChunkFromJSON(jsonString: string): SafeParseResult<ImageURLChunk, SDKValidationError>;
//# sourceMappingURL=imageurlchunk.d.ts.map