export interface DefaultTaskOptions {
    fetch?: typeof fetch;
}
/**
 * Get the default task. Use a LRU cache of 1000 items with 10 minutes expiration
 * to avoid making too many calls to the HF hub.
 *
 * @returns The default task for the model, or `null` if it was impossible to get it
 */
export declare function getDefaultTask(model: string, accessToken: string | undefined, options?: DefaultTaskOptions): Promise<string | null>;
//# sourceMappingURL=getDefaultTask.d.ts.map