import { ErrorLike, OnoOptions } from "./types";
/**
 * Normalizes Ono options, accounting for defaults and optional options.
 */
export declare function normalizeOptions(options?: OnoOptions): OnoOptions;
/**
 * Normalizes the Ono arguments, accounting for defaults, options, and optional arguments.
 */
export declare function normalizeArgs<E extends ErrorLike, P extends object>(args: unknown[], options: OnoOptions): {
    originalError: E | undefined;
    props: P | undefined;
    message: string;
};
