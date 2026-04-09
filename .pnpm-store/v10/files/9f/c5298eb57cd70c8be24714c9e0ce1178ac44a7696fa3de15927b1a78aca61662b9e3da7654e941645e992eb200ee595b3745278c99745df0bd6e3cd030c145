import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type Loc = string | number;
export type Context = {};
export type ValidationError = {
    loc: Array<string | number>;
    msg: string;
    type: string;
    input?: any | undefined;
    ctx?: Context | undefined;
};
/** @internal */
export declare const Loc$inboundSchema: z.ZodType<Loc, z.ZodTypeDef, unknown>;
export declare function locFromJSON(jsonString: string): SafeParseResult<Loc, SDKValidationError>;
/** @internal */
export declare const Context$inboundSchema: z.ZodType<Context, z.ZodTypeDef, unknown>;
export declare function contextFromJSON(jsonString: string): SafeParseResult<Context, SDKValidationError>;
/** @internal */
export declare const ValidationError$inboundSchema: z.ZodType<ValidationError, z.ZodTypeDef, unknown>;
export declare function validationErrorFromJSON(jsonString: string): SafeParseResult<ValidationError, SDKValidationError>;
//# sourceMappingURL=validationerror.d.ts.map