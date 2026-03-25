import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FunctionT = {
    name: string;
    description?: string | undefined;
    strict?: boolean | undefined;
    parameters: {
        [k: string]: any;
    };
};
/** @internal */
export declare const FunctionT$inboundSchema: z.ZodType<FunctionT, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionT$Outbound = {
    name: string;
    description?: string | undefined;
    strict?: boolean | undefined;
    parameters: {
        [k: string]: any;
    };
};
/** @internal */
export declare const FunctionT$outboundSchema: z.ZodType<FunctionT$Outbound, z.ZodTypeDef, FunctionT>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionT$ {
    /** @deprecated use `FunctionT$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FunctionT, z.ZodTypeDef, unknown>;
    /** @deprecated use `FunctionT$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FunctionT$Outbound, z.ZodTypeDef, FunctionT>;
    /** @deprecated use `FunctionT$Outbound` instead. */
    type Outbound = FunctionT$Outbound;
}
export declare function functionToJSON(functionT: FunctionT): string;
export declare function functionFromJSON(jsonString: string): SafeParseResult<FunctionT, SDKValidationError>;
//# sourceMappingURL=function.d.ts.map