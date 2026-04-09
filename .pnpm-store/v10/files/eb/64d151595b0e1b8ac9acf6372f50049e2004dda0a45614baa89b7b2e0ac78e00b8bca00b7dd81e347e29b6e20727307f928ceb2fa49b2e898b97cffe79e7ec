import * as z from "zod/v3";
import { FunctionT, FunctionT$Outbound } from "./function.js";
import { ToolTypes } from "./tooltypes.js";
export type Tool = {
    type?: ToolTypes | undefined;
    function: FunctionT;
};
/** @internal */
export type Tool$Outbound = {
    type?: string | undefined;
    function: FunctionT$Outbound;
};
/** @internal */
export declare const Tool$outboundSchema: z.ZodType<Tool$Outbound, z.ZodTypeDef, Tool>;
export declare function toolToJSON(tool: Tool): string;
//# sourceMappingURL=tool.d.ts.map