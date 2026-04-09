export declare type RecordKey = string | number | symbol;
/**
 * Generates a unique result using the results of the given method.
 * Used unique entries will be stored internally and filtered from subsequent calls.
 *
 * @template Method The type of the method to execute.
 * @param method The method used to generate the values.
 * @param args The arguments used to call the method.
 * @param options The optional options used to configure this method.
 * @param options.startTime The time this execution stared. Defaults to `new Date().getTime()`.
 * @param options.maxTime The time in milliseconds this method may take before throwing an error. Defaults to `50`.
 * @param options.maxRetries The total number of attempts to try before throwing an error. Defaults to `50`.
 * @param options.currentIterations The current attempt. Defaults to `0`.
 * @param options.exclude The value or values that should be excluded/skipped. Defaults to `[]`.
 * @param options.compare The function used to determine whether a value was already returned. Defaults to check the existence of the key.
 * @param options.store The store of unique entries. Defaults to `GLOBAL_UNIQUE_STORE`.
 */
export declare function exec<Method extends (...parameters: any[]) => RecordKey>(method: Method, args: Parameters<Method>, options?: {
    startTime?: number;
    maxTime?: number;
    maxRetries?: number;
    currentIterations?: number;
    exclude?: RecordKey | RecordKey[];
    compare?: (obj: Record<RecordKey, RecordKey>, key: RecordKey) => 0 | -1;
    store?: Record<RecordKey, RecordKey>;
}): ReturnType<Method>;
