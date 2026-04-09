//#region src/ui/utils.d.ts
/**
 * Returns true when `onFinish` declares at least one parameter and therefore
 * needs the server-fetched thread head. A zero-arity `onFinish` is treated as
 * side-effect-only and does not trigger a post-stream `getHistory` when
 * branching history is not enabled.
 *
 * Note: functions with only default parameters report `.length === 0` in
 * JavaScript; if you need the thread state, declare at least one non-default
 * parameter (e.g. `(state)` or `(_state, run)`).
 */
declare function onFinishRequiresThreadState(onFinish: unknown): boolean;
declare function unique<T>(array: T[]): T[];
declare function findLast<T>(array: T[], predicate: (item: T) => boolean): T | undefined;
declare function filterStream<T, TReturn>(stream: AsyncGenerator<T, TReturn>, filter: (event: T) => boolean): AsyncGenerator<T, TReturn>;
//#endregion
export { filterStream, findLast, onFinishRequiresThreadState, unique };
//# sourceMappingURL=utils.d.cts.map