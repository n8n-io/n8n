import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ToolConfiguration, ToolConfiguration$Outbound } from "./toolconfiguration.js";
export declare const WebSearchToolType: {
    readonly WebSearch: "web_search";
};
export type WebSearchToolType = ClosedEnum<typeof WebSearchToolType>;
export type WebSearchTool = {
    toolConfiguration?: ToolConfiguration | null | undefined;
    type?: WebSearchToolType | undefined;
};
/** @internal */
export declare const WebSearchToolType$inboundSchema: z.ZodNativeEnum<typeof WebSearchToolType>;
/** @internal */
export declare const WebSearchToolType$outboundSchema: z.ZodNativeEnum<typeof WebSearchToolType>;
/** @internal */
export declare const WebSearchTool$inboundSchema: z.ZodType<WebSearchTool, z.ZodTypeDef, unknown>;
/** @internal */
export type WebSearchTool$Outbound = {
    tool_configuration?: ToolConfiguration$Outbound | null | undefined;
    type: string;
};
/** @internal */
export declare const WebSearchTool$outboundSchema: z.ZodType<WebSearchTool$Outbound, z.ZodTypeDef, WebSearchTool>;
export declare function webSearchToolToJSON(webSearchTool: WebSearchTool): string;
export declare function webSearchToolFromJSON(jsonString: string): SafeParseResult<WebSearchTool, SDKValidationError>;
//# sourceMappingURL=websearchtool.d.ts.map