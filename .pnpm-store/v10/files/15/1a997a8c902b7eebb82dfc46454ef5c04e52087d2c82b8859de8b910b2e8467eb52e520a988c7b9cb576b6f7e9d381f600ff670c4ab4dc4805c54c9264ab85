import { ErrorLike, OnoError } from "./types";
/**
 * Extends the new error with the properties of the original error and the `props` object.
 *
 * @param newError - The error object to extend
 * @param originalError - The original error object, if any
 * @param props - Additional properties to add, if any
 */
export declare function extendError<T extends ErrorLike, E extends ErrorLike, P extends object>(error: T, originalError?: E, props?: P): T & E & P & OnoError<T & E & P>;
