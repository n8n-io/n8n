import type { Response } from '../response';
import type { Middleware } from './index';
export type ErrorHandlerMiddlewareCallback = (response: Response) => boolean;
export declare const setErrorHandler: (errorHandler: ErrorHandlerMiddlewareCallback) => void;
/**
 * Provides a catch-all function for all requests. If the catch-all
 * function returns `true` it prevents the original promise to continue.
 */
export declare const GlobalErrorHandlerMiddleware: Middleware;
export default GlobalErrorHandlerMiddleware;
