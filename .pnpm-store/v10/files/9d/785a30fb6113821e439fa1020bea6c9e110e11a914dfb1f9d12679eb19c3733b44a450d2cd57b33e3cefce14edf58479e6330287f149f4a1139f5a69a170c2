export interface UsesConcurrency {
    /**
     * Assign the given `concurrency` as the number of tasks being processed concurrently the promise pool.
     */
    useConcurrency(concurrency: number): this;
    /**
     * Returns the number of concurrently processed tasks.
     */
    concurrency(): number;
}
export interface Stoppable {
    /**
     * Stop the promise pool and returns any results that already have been calculated.
     * Stopping the pool waits for  active task to finish processing before returning.
     */
    stop(): void;
    /**
     * Determine whether the pool is marked as stopped.
     */
    isStopped(): boolean;
}
export interface Statistics<T> {
    /**
     * Returns the number of currently active tasks.
     *
     * @deprecated use the `activeTasksCount()` method (plural naming) instead
     */
    activeTaskCount(): number;
    /**
     * Returns the number of currently active tasks.
     */
    activeTasksCount(): number;
    /**
     * Returns the list of processed items.
     */
    processedItems(): T[];
    /**
     * Returns the number of processed items.
     */
    processedCount(): number;
    /**
     * Returns the percentage progress of items that have been processed.
     */
    processedPercentage(): number;
}
export type ErrorHandler<T> = (error: Error, item: T, pool: Stoppable & UsesConcurrency) => Promise<void> | void;
export type ProcessHandler<T, R> = (item: T, index: number, pool: Stoppable & UsesConcurrency) => Promise<R> | R;
export type OnProgressCallback<T> = (item: T, pool: Stoppable & Statistics<T> & UsesConcurrency) => void;
export type SomeIterable<T> = T[] | Iterable<T> | AsyncIterable<T>;
