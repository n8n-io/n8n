import type { Faker } from '../..';
import type { RecordKey } from '../helpers/unique';
/**
 * Module to generate unique entries.
 *
 * @deprecated
 */
export declare class UniqueModule {
    private readonly faker;
    constructor(faker: Faker);
    /**
     * Generates a unique result using the results of the given method.
     * Used unique entries will be stored internally and filtered from subsequent calls.
     *
     * @template Method The type of the method to execute.
     * @param method The method used to generate the values.
     * @param args The arguments used to call the method.
     * @param options The optional options used to configure this method.
     * @param options.startTime This parameter does nothing.
     * @param options.maxTime The time in milliseconds this method may take before throwing an error. Defaults to `50`.
     * @param options.maxRetries The total number of attempts to try before throwing an error. Defaults to `50`.
     * @param options.currentIterations This parameter does nothing.
     * @param options.exclude The value or values that should be excluded/skipped. Defaults to `[]`.
     * @param options.compare The function used to determine whether a value was already returned. Defaults to check the existence of the key.
     * @param options.store The store of unique entries. Defaults to a global store.
     *
     * @see faker.helpers.unique()
     *
     * @example
     * faker.unique(faker.name.firstName) // 'Corbin'
     *
     * @since 5.0.0
     *
     * @deprecated Use faker.helpers.unique() instead.
     */
    unique<Method extends (...parameters: any[]) => RecordKey>(method: Method, args?: Parameters<Method>, options?: {
        startTime?: number;
        maxTime?: number;
        maxRetries?: number;
        currentIterations?: number;
        exclude?: RecordKey | RecordKey[];
        compare?: (obj: Record<RecordKey, RecordKey>, key: RecordKey) => 0 | -1;
        store?: Record<RecordKey, RecordKey>;
    }): ReturnType<Method>;
}
