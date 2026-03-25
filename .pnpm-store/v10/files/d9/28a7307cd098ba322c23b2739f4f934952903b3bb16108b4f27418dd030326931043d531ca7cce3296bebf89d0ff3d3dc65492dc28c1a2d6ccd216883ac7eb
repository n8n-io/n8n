import * as z from "zod";
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
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolCall$ {
    /** @deprecated use `ToolCall$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ToolCall, z.ZodTypeDef, unknown>;
    /** @deprecated use `ToolCall$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ToolCall$Outbound, z.ZodTypeDef, ToolCall>;
    /** @deprecated use `ToolCall$Outbound` instead. */
    type Outbound = ToolCall$Outbound;
}
export declare function toolCallToJSON(toolCall: ToolCall): string;
export declare function toolCallFromJSON(jsonString: string): SafeParseResult<ToolCall, SDKValidationError>;
//# sourceMappingURL=toolcall.d.ts.map