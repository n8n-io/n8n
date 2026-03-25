import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FunctionCallEntryArguments = {
    [k: string]: any;
} | string;
/** @internal */
export declare const FunctionCallEntryArguments$inboundSchema: z.ZodType<FunctionCallEntryArguments, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionCallEntryArguments$Outbound = {
    [k: string]: any;
} | string;
/** @internal */
export declare const FunctionCallEntryArguments$outboundSchema: z.ZodType<FunctionCallEntryArguments$Outbound, z.ZodTypeDef, FunctionCallEntryArguments>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionCallEntryArguments$ {
    /** @deprecated use `FunctionCallEntryArguments$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FunctionCallEntryArguments, z.ZodTypeDef, unknown>;
    /** @deprecated use `FunctionCallEntryArguments$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FunctionCallEntryArguments$Outbound, z.ZodTypeDef, FunctionCallEntryArguments>;
    /** @deprecated use `FunctionCallEntryArguments$Outbound` instead. */
    type Outbound = FunctionCallEntryArguments$Outbound;
}
export declare function functionCallEntryArgumentsToJSON(functionCallEntryArguments: FunctionCallEntryArguments): string;
export declare function functionCallEntryArgumentsFromJSON(jsonString: string): SafeParseResult<FunctionCallEntryArguments, SDKValidationError>;
//# sourceMappingURL=functioncallentryarguments.d.ts.map