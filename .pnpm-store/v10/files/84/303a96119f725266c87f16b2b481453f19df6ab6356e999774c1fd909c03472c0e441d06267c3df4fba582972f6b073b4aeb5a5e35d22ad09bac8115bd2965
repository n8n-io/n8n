import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ToolConfiguration, ToolConfiguration$Outbound } from "./toolconfiguration.js";
export declare const ImageGenerationToolType: {
    readonly ImageGeneration: "image_generation";
};
export type ImageGenerationToolType = ClosedEnum<typeof ImageGenerationToolType>;
export type ImageGenerationTool = {
    toolConfiguration?: ToolConfiguration | null | undefined;
    type?: ImageGenerationToolType | undefined;
};
/** @internal */
export declare const ImageGenerationToolType$inboundSchema: z.ZodNativeEnum<typeof ImageGenerationToolType>;
/** @internal */
export declare const ImageGenerationToolType$outboundSchema: z.ZodNativeEnum<typeof ImageGenerationToolType>;
/** @internal */
export declare const ImageGenerationTool$inboundSchema: z.ZodType<ImageGenerationTool, z.ZodTypeDef, unknown>;
/** @internal */
export type ImageGenerationTool$Outbound = {
    tool_configuration?: ToolConfiguration$Outbound | null | undefined;
    type: string;
};
/** @internal */
export declare const ImageGenerationTool$outboundSchema: z.ZodType<ImageGenerationTool$Outbound, z.ZodTypeDef, ImageGenerationTool>;
export declare function imageGenerationToolToJSON(imageGenerationTool: ImageGenerationTool): string;
export declare function imageGenerationToolFromJSON(jsonString: string): SafeParseResult<ImageGenerationTool, SDKValidationError>;
//# sourceMappingURL=imagegenerationtool.d.ts.map