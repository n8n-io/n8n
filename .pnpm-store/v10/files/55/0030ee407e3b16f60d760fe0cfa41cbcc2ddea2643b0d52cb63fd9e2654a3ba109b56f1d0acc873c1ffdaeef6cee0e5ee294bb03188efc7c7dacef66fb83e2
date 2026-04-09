import * as z from "zod/v3";
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
export declare function functionCallEntryArgumentsToJSON(functionCallEntryArguments: FunctionCallEntryArguments): string;
export declare function functionCallEntryArgumentsFromJSON(jsonString: string): SafeParseResult<FunctionCallEntryArguments, SDKValidationError>;
//# sourceMappingURL=functioncallentryarguments.d.ts.map