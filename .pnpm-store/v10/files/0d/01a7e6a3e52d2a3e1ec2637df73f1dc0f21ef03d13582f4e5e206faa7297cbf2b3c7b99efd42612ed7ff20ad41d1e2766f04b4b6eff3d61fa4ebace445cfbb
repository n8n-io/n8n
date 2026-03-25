import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type Loc = string | number;
export type ValidationError = {
    loc: Array<string | number>;
    msg: string;
    type: string;
};
/** @internal */
export declare const Loc$inboundSchema: z.ZodType<Loc, z.ZodTypeDef, unknown>;
/** @internal */
export type Loc$Outbound = string | number;
/** @internal */
export declare const Loc$outboundSchema: z.ZodType<Loc$Outbound, z.ZodTypeDef, Loc>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Loc$ {
    /** @deprecated use `Loc$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Loc, z.ZodTypeDef, unknown>;
    /** @deprecated use `Loc$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Loc$Outbound, z.ZodTypeDef, Loc>;
    /** @deprecated use `Loc$Outbound` instead. */
    type Outbound = Loc$Outbound;
}
export declare function locToJSON(loc: Loc): string;
export declare function locFromJSON(jsonString: string): SafeParseResult<Loc, SDKValidationError>;
/** @internal */
export declare const ValidationError$inboundSchema: z.ZodType<ValidationError, z.ZodTypeDef, unknown>;
/** @internal */
export type ValidationError$Outbound = {
    loc: Array<string | number>;
    msg: string;
    type: string;
};
/** @internal */
export declare const ValidationError$outboundSchema: z.ZodType<ValidationError$Outbound, z.ZodTypeDef, ValidationError>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ValidationError$ {
    /** @deprecated use `ValidationError$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ValidationError, z.ZodTypeDef, unknown>;
    /** @deprecated use `ValidationError$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ValidationError$Outbound, z.ZodTypeDef, ValidationError>;
    /** @deprecated use `ValidationError$Outbound` instead. */
    type Outbound = ValidationError$Outbound;
}
export declare function validationErrorToJSON(validationError: ValidationError): string;
export declare function validationErrorFromJSON(jsonString: string): SafeParseResult<ValidationError, SDKValidationError>;
//# sourceMappingURL=validationerror.d.ts.map