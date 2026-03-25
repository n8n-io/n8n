import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const WebSearchPremiumToolType: {
    readonly WebSearchPremium: "web_search_premium";
};
export type WebSearchPremiumToolType = ClosedEnum<typeof WebSearchPremiumToolType>;
export type WebSearchPremiumTool = {
    type?: WebSearchPremiumToolType | undefined;
};
/** @internal */
export declare const WebSearchPremiumToolType$inboundSchema: z.ZodNativeEnum<typeof WebSearchPremiumToolType>;
/** @internal */
export declare const WebSearchPremiumToolType$outboundSchema: z.ZodNativeEnum<typeof WebSearchPremiumToolType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace WebSearchPremiumToolType$ {
    /** @deprecated use `WebSearchPremiumToolType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly WebSearchPremium: "web_search_premium";
    }>;
    /** @deprecated use `WebSearchPremiumToolType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly WebSearchPremium: "web_search_premium";
    }>;
}
/** @internal */
export declare const WebSearchPremiumTool$inboundSchema: z.ZodType<WebSearchPremiumTool, z.ZodTypeDef, unknown>;
/** @internal */
export type WebSearchPremiumTool$Outbound = {
    type: string;
};
/** @internal */
export declare const WebSearchPremiumTool$outboundSchema: z.ZodType<WebSearchPremiumTool$Outbound, z.ZodTypeDef, WebSearchPremiumTool>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace WebSearchPremiumTool$ {
    /** @deprecated use `WebSearchPremiumTool$inboundSchema` instead. */
    const inboundSchema: z.ZodType<WebSearchPremiumTool, z.ZodTypeDef, unknown>;
    /** @deprecated use `WebSearchPremiumTool$outboundSchema` instead. */
    const outboundSchema: z.ZodType<WebSearchPremiumTool$Outbound, z.ZodTypeDef, WebSearchPremiumTool>;
    /** @deprecated use `WebSearchPremiumTool$Outbound` instead. */
    type Outbound = WebSearchPremiumTool$Outbound;
}
export declare function webSearchPremiumToolToJSON(webSearchPremiumTool: WebSearchPremiumTool): string;
export declare function webSearchPremiumToolFromJSON(jsonString: string): SafeParseResult<WebSearchPremiumTool, SDKValidationError>;
//# sourceMappingURL=websearchpremiumtool.d.ts.map