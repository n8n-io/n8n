import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ToolConfiguration, ToolConfiguration$Outbound } from "./toolconfiguration.js";
export declare const WebSearchPremiumToolType: {
    readonly WebSearchPremium: "web_search_premium";
};
export type WebSearchPremiumToolType = ClosedEnum<typeof WebSearchPremiumToolType>;
export type WebSearchPremiumTool = {
    toolConfiguration?: ToolConfiguration | null | undefined;
    type?: WebSearchPremiumToolType | undefined;
};
/** @internal */
export declare const WebSearchPremiumToolType$inboundSchema: z.ZodNativeEnum<typeof WebSearchPremiumToolType>;
/** @internal */
export declare const WebSearchPremiumToolType$outboundSchema: z.ZodNativeEnum<typeof WebSearchPremiumToolType>;
/** @internal */
export declare const WebSearchPremiumTool$inboundSchema: z.ZodType<WebSearchPremiumTool, z.ZodTypeDef, unknown>;
/** @internal */
export type WebSearchPremiumTool$Outbound = {
    tool_configuration?: ToolConfiguration$Outbound | null | undefined;
    type: string;
};
/** @internal */
export declare const WebSearchPremiumTool$outboundSchema: z.ZodType<WebSearchPremiumTool$Outbound, z.ZodTypeDef, WebSearchPremiumTool>;
export declare function webSearchPremiumToolToJSON(webSearchPremiumTool: WebSearchPremiumTool): string;
export declare function webSearchPremiumToolFromJSON(jsonString: string): SafeParseResult<WebSearchPremiumTool, SDKValidationError>;
//# sourceMappingURL=websearchpremiumtool.d.ts.map