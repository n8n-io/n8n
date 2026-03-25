import * as z from "zod";
export declare class SDKValidationError extends Error {
    /**
     * The raw value that failed validation.
     */
    readonly rawValue: unknown;
    /**
     * The raw message that failed validation.
     */
    readonly rawMessage: unknown;
    static [Symbol.hasInstance](instance: unknown): instance is SDKValidationError;
    constructor(message: string, cause: unknown, rawValue: unknown);
    /**
     * Return a pretty-formatted error message if the underlying validation error
     * is a ZodError or some other recognized error type, otherwise return the
     * default error message.
     */
    pretty(): string;
}
export declare function formatZodError(err: z.ZodError, level?: number): string;
//# sourceMappingURL=sdkvalidationerror.d.ts.map