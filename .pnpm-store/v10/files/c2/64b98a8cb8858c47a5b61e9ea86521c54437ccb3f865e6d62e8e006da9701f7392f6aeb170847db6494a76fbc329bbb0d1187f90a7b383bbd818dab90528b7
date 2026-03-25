import { MistralError } from "./mistralerror.js";
export declare class ResponseValidationError extends MistralError {
    /**
     * The raw value that failed validation.
     */
    readonly rawValue: unknown;
    /**
     * The raw message that failed validation.
     */
    readonly rawMessage: unknown;
    constructor(message: string, extra: {
        response: Response;
        request: Request;
        body: string;
        cause: unknown;
        rawValue: unknown;
        rawMessage: unknown;
    });
    /**
     * Return a pretty-formatted error message if the underlying validation error
     * is a ZodError or some other recognized error type, otherwise return the
     * default error message.
     */
    pretty(): string;
}
//# sourceMappingURL=responsevalidationerror.d.ts.map