import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * this restriction of `Function` is used to select a specific function to call
 */
export type FunctionName = {
    name: string;
};
/** @internal */
export declare const FunctionName$inboundSchema: z.ZodType<FunctionName, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionName$Outbound = {
    name: string;
};
/** @internal */
export declare const FunctionName$outboundSchema: z.ZodType<FunctionName$Outbound, z.ZodTypeDef, FunctionName>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionName$ {
    /** @deprecated use `FunctionName$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FunctionName, z.ZodTypeDef, unknown>;
    /** @deprecated use `FunctionName$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FunctionName$Outbound, z.ZodTypeDef, FunctionName>;
    /** @deprecated use `FunctionName$Outbound` instead. */
    type Outbound = FunctionName$Outbound;
}
export declare function functionNameToJSON(functionName: FunctionName): string;
export declare function functionNameFromJSON(jsonString: string): SafeParseResult<FunctionName, SDKValidationError>;
//# sourceMappingURL=functionname.d.ts.map