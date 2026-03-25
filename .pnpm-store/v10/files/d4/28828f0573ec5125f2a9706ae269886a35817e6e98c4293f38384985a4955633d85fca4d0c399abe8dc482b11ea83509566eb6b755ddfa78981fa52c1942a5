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
