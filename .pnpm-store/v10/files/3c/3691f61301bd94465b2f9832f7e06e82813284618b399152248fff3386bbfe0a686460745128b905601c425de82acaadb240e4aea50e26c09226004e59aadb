import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type Arguments = {
    [k: string]: any;
} | string;
export type FunctionCall = {
    name: string;
    arguments: {
        [k: string]: any;
    } | string;
};
/** @internal */
export declare const Arguments$inboundSchema: z.ZodType<Arguments, z.ZodTypeDef, unknown>;
/** @internal */
export type Arguments$Outbound = {
    [k: string]: any;
} | string;
/** @internal */
export declare const Arguments$outboundSchema: z.ZodType<Arguments$Outbound, z.ZodTypeDef, Arguments>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Arguments$ {
    /** @deprecated use `Arguments$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Arguments, z.ZodTypeDef, unknown>;
    /** @deprecated use `Arguments$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Arguments$Outbound, z.ZodTypeDef, Arguments>;
    /** @deprecated use `Arguments$Outbound` instead. */
    type Outbound = Arguments$Outbound;
}
export declare function argumentsToJSON(value: Arguments): string;
export declare function argumentsFromJSON(jsonString: string): SafeParseResult<Arguments, SDKValidationError>;
/** @internal */
export declare const FunctionCall$inboundSchema: z.ZodType<FunctionCall, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionCall$Outbound = {
    name: string;
    arguments: {
        [k: string]: any;
    } | string;
};
/** @internal */
export declare const FunctionCall$outboundSchema: z.ZodType<FunctionCall$Outbound, z.ZodTypeDef, FunctionCall>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionCall$ {
    /** @deprecated use `FunctionCall$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FunctionCall, z.ZodTypeDef, unknown>;
    /** @deprecated use `FunctionCall$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FunctionCall$Outbound, z.ZodTypeDef, FunctionCall>;
    /** @deprecated use `FunctionCall$Outbound` instead. */
    type Outbound = FunctionCall$Outbound;
}
export declare function functionCallToJSON(functionCall: FunctionCall): string;
export declare function functionCallFromJSON(jsonString: string): SafeParseResult<FunctionCall, SDKValidationError>;
//# sourceMappingURL=functioncall.d.ts.map