import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const ImageGenerationToolType: {
    readonly ImageGeneration: "image_generation";
};
export type ImageGenerationToolType = ClosedEnum<typeof ImageGenerationToolType>;
export type ImageGenerationTool = {
    type?: ImageGenerationToolType | undefined;
};
/** @internal */
export declare const ImageGenerationToolType$inboundSchema: z.ZodNativeEnum<typeof ImageGenerationToolType>;
/** @internal */
export declare const ImageGenerationToolType$outboundSchema: z.ZodNativeEnum<typeof ImageGenerationToolType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ImageGenerationToolType$ {
    /** @deprecated use `ImageGenerationToolType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ImageGeneration: "image_generation";
    }>;
    /** @deprecated use `ImageGenerationToolType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ImageGeneration: "image_generation";
    }>;
}
/** @internal */
export declare const ImageGenerationTool$inboundSchema: z.ZodType<ImageGenerationTool, z.ZodTypeDef, unknown>;
/** @internal */
export type ImageGenerationTool$Outbound = {
    type: string;
};
/** @internal */
export declare const ImageGenerationTool$outboundSchema: z.ZodType<ImageGenerationTool$Outbound, z.ZodTypeDef, ImageGenerationTool>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ImageGenerationTool$ {
    /** @deprecated use `ImageGenerationTool$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ImageGenerationTool, z.ZodTypeDef, unknown>;
    /** @deprecated use `ImageGenerationTool$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ImageGenerationTool$Outbound, z.ZodTypeDef, ImageGenerationTool>;
    /** @deprecated use `ImageGenerationTool$Outbound` instead. */
    type Outbound = ImageGenerationTool$Outbound;
}
export declare function imageGenerationToolToJSON(imageGenerationTool: ImageGenerationTool): string;
export declare function imageGenerationToolFromJSON(jsonString: string): SafeParseResult<ImageGenerationTool, SDKValidationError>;
//# sourceMappingURL=imagegenerationtool.d.ts.map