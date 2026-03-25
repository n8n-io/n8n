import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const WebSearchToolType: {
    readonly WebSearch: "web_search";
};
export type WebSearchToolType = ClosedEnum<typeof WebSearchToolType>;
export type WebSearchTool = {
    type?: WebSearchToolType | undefined;
};
/** @internal */
export declare const WebSearchToolType$inboundSchema: z.ZodNativeEnum<typeof WebSearchToolType>;
/** @internal */
export declare const WebSearchToolType$outboundSchema: z.ZodNativeEnum<typeof WebSearchToolType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace WebSearchToolType$ {
    /** @deprecated use `WebSearchToolType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly WebSearch: "web_search";
    }>;
    /** @deprecated use `WebSearchToolType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly WebSearch: "web_search";
    }>;
}
/** @internal */
export declare const WebSearchTool$inboundSchema: z.ZodType<WebSearchTool, z.ZodTypeDef, unknown>;
/** @internal */
export type WebSearchTool$Outbound = {
    type: string;
};
/** @internal */
export declare const WebSearchTool$outboundSchema: z.ZodType<WebSearchTool$Outbound, z.ZodTypeDef, WebSearchTool>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace WebSearchTool$ {
    /** @deprecated use `WebSearchTool$inboundSchema` instead. */
    const inboundSchema: z.ZodType<WebSearchTool, z.ZodTypeDef, unknown>;
    /** @deprecated use `WebSearchTool$outboundSchema` instead. */
    const outboundSchema: z.ZodType<WebSearchTool$Outbound, z.ZodTypeDef, WebSearchTool>;
    /** @deprecated use `WebSearchTool$Outbound` instead. */
    type Outbound = WebSearchTool$Outbound;
}
export declare function webSearchToolToJSON(webSearchTool: WebSearchTool): string;
export declare function webSearchToolFromJSON(jsonString: string): SafeParseResult<WebSearchTool, SDKValidationError>;
//# sourceMappingURL=websearchtool.d.ts.map