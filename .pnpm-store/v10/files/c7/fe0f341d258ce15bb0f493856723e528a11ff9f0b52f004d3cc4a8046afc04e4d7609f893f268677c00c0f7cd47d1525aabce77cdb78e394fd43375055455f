import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FunctionT, FunctionT$Outbound } from "./function.js";
export declare const FunctionToolType: {
    readonly Function: "function";
};
export type FunctionToolType = ClosedEnum<typeof FunctionToolType>;
export type FunctionTool = {
    type?: FunctionToolType | undefined;
    function: FunctionT;
};
/** @internal */
export declare const FunctionToolType$inboundSchema: z.ZodNativeEnum<typeof FunctionToolType>;
/** @internal */
export declare const FunctionToolType$outboundSchema: z.ZodNativeEnum<typeof FunctionToolType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionToolType$ {
    /** @deprecated use `FunctionToolType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Function: "function";
    }>;
    /** @deprecated use `FunctionToolType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Function: "function";
    }>;
}
/** @internal */
export declare const FunctionTool$inboundSchema: z.ZodType<FunctionTool, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionTool$Outbound = {
    type: string;
    function: FunctionT$Outbound;
};
/** @internal */
export declare const FunctionTool$outboundSchema: z.ZodType<FunctionTool$Outbound, z.ZodTypeDef, FunctionTool>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionTool$ {
    /** @deprecated use `FunctionTool$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FunctionTool, z.ZodTypeDef, unknown>;
    /** @deprecated use `FunctionTool$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FunctionTool$Outbound, z.ZodTypeDef, FunctionTool>;
    /** @deprecated use `FunctionTool$Outbound` instead. */
    type Outbound = FunctionTool$Outbound;
}
export declare function functionToolToJSON(functionTool: FunctionTool): string;
export declare function functionToolFromJSON(jsonString: string): SafeParseResult<FunctionTool, SDKValidationError>;
//# sourceMappingURL=functiontool.d.ts.map