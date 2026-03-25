import { Mechanism, WrappedFunction } from '@sentry/core';
import { GLOBAL_OBJ } from '@sentry/core';
export declare const WINDOW: typeof GLOBAL_OBJ & Window;
/**
 * @hidden
 */
export declare function shouldIgnoreOnError(): boolean;
/**
 * @hidden
 */
export declare function ignoreNextOnError(): void;
type WrappableFunction = Function;
export declare function wrap<T extends WrappableFunction>(fn: T, options?: {
    mechanism?: Mechanism;
}): WrappedFunction<T>;
export declare function wrap<NonFunction>(fn: NonFunction, options?: {
    mechanism?: Mechanism;
}): NonFunction;
/**
 * Get HTTP request data from the current page.
 */
export declare function getHttpRequestData(): {
    url: string;
    headers: Record<string, string>;
};
export {};
//# sourceMappingURL=helpers.d.ts.map
