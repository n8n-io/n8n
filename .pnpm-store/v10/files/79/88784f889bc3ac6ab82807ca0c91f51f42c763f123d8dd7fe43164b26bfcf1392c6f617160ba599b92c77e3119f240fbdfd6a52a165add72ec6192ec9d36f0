import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FunctionCall, FunctionCall$Outbound } from "./functioncall.js";
import { ToolTypes } from "./tooltypes.js";
export type ToolCall = {
    id?: string | undefined;
    type?: ToolTypes | undefined;
    function: FunctionCall;
    index?: number | undefined;
};
/** @internal */
export declare const ToolCall$inboundSchema: z.ZodType<ToolCall, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolCall$Outbound = {
    id: string;
    type?: string | undefined;
    function: FunctionCall$Outbound;
    index: number;
};
/** @internal */
export declare const ToolCall$outboundSchema: z.ZodType<ToolCall$Outbound, z.ZodTypeDef, ToolCall>;
export declare function toolCallToJSON(toolCall: ToolCall): string;
export declare function toolCallFromJSON(jsonString: string): SafeParseResult<ToolCall, SDKValidationError>;
//# sourceMappingURL=toolcall.d.ts.map