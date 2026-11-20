import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * How many agent turns enclose the code that runs now, in this process. A
 * workflow tool that runs a sub-workflow adds one. A Message an Agent node in
 * that sub-workflow then starts a nested turn.
 */
const nesting = new AsyncLocalStorage<number>();

/** Agent turns that may enclose each other. Deeper chains stop with an error. */
export const MAX_TURN_DEPTH = 3;

/** How many agent turns enclose the code that runs now. 0 outside of any turn. */
export function turnDepth(): number {
	return nesting.getStore() ?? 0;
}

/** Run `fn` one level deeper. Use it where an agent turn starts work that can start another turn. */
export async function runNested<T>(fn: () => Promise<T>): Promise<T> {
	return await nesting.run(turnDepth() + 1, fn);
}
