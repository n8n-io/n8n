import { output, ZodEffects, ZodObject, ZodRawShape, ZodTypeAny } from "zod";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { Result } from "../types/fp.js";
/**
 * Utility function that executes some code which may throw a ZodError. It
 * intercepts this error and converts it to an SDKValidationError so as to not
 * leak Zod implementation details to user code.
 */
export declare function parse<Inp, Out>(rawValue: Inp, fn: (value: Inp) => Out, errorMessage: string): Out;
/**
 * Utility function that executes some code which may result in a ZodError. It
 * intercepts this error and converts it to an SDKValidationError so as to not
 * leak Zod implementation details to user code.
 */
export declare function safeParse<Inp, Out>(rawValue: Inp, fn: (value: Inp) => Out, errorMessage: string): Result<Out, SDKValidationError>;
export declare function collectExtraKeys<Shape extends ZodRawShape, Catchall extends ZodTypeAny, K extends string>(obj: ZodObject<Shape, "strip", Catchall>, extrasKey: K, optional: boolean): ZodEffects<typeof obj, output<ZodObject<Shape, "strict">> & {
    [k in K]: Record<string, output<Catchall>>;
}>;
//# sourceMappingURL=schemas.d.ts.map