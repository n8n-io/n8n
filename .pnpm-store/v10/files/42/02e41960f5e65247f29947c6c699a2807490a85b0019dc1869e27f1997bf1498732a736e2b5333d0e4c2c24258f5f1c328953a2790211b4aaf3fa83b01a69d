import * as z from "zod/v3";
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
export declare function functionToJSON(functionT: FunctionT): string;
export declare function functionFromJSON(jsonString: string): SafeParseResult<FunctionT, SDKValidationError>;
//# sourceMappingURL=function.d.ts.map