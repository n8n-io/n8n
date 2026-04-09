import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FunctionT, FunctionT$Outbound } from "./function.js";
export declare const Type: {
    readonly Function: "function";
};
export type Type = ClosedEnum<typeof Type>;
export type FunctionTool = {
    type?: Type | undefined;
    function: FunctionT;
};
/** @internal */
export declare const Type$inboundSchema: z.ZodNativeEnum<typeof Type>;
/** @internal */
export declare const Type$outboundSchema: z.ZodNativeEnum<typeof Type>;
/** @internal */
export declare const FunctionTool$inboundSchema: z.ZodType<FunctionTool, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionTool$Outbound = {
    type: string;
    function: FunctionT$Outbound;
};
/** @internal */
export declare const FunctionTool$outboundSchema: z.ZodType<FunctionTool$Outbound, z.ZodTypeDef, FunctionTool>;
export declare function functionToolToJSON(functionTool: FunctionTool): string;
export declare function functionToolFromJSON(jsonString: string): SafeParseResult<FunctionTool, SDKValidationError>;
//# sourceMappingURL=functiontool.d.ts.map