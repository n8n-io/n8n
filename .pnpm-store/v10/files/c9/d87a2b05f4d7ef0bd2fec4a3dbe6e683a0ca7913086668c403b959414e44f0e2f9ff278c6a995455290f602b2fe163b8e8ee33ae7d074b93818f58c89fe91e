import * as z from "zod/v3";
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
export declare function functionCallToJSON(functionCall: FunctionCall): string;
export declare function functionCallFromJSON(jsonString: string): SafeParseResult<FunctionCall, SDKValidationError>;
//# sourceMappingURL=functioncall.d.ts.map