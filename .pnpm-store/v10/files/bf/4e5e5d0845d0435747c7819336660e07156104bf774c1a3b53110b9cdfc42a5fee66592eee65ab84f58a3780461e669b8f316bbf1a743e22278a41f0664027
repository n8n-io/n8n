import { MonoTypeOperatorFunction, ObservableInput } from '../types';
/**
 * The {@link retry} operator configuration object. `retry` either accepts a `number`
 * or an object described by this interface.
 */
export interface RetryConfig {
    /**
     * The maximum number of times to retry. If `count` is omitted, `retry` will try to
     * resubscribe on errors infinite number of times.
     */
    count?: number;
    /**
     * The number of milliseconds to delay before retrying, OR a function to
     * return a notifier for delaying. If a function is given, that function should
     * return a notifier that, when it emits will retry the source. If the notifier
     * completes _without_ emitting, the resulting observable will complete without error,
     * if the notifier errors, the error will be pushed to the result.
     */
    delay?: number | ((error: any, retryCount: number) => ObservableInput<any>);
    /**
     * Whether or not to reset the retry counter when the retried subscription
     * emits its first value.
     */
    resetOnSuccess?: boolean;
}
export declare function retry<T>(count?: number): MonoTypeOperatorFunction<T>;
export declare function retry<T>(config: RetryConfig): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=retry.d.ts.map