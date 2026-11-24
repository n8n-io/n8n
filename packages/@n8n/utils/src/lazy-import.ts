/**
 * Lazily `import()` a dual-published (ESM + CJS) dependency while keeping the
 * `require`-condition types the rest of a CommonJS / NodeNext package resolves
 * via top-level `import type`.
 *
 * Under `moduleResolution: NodeNext` a top-level `import type { X } from 'pkg'`
 * in a CommonJS module resolves `pkg`'s `require`-condition declarations
 * (`.d.cts`), while `await import('pkg')` resolves the `import`-condition
 * declarations (`.d.ts`); TypeScript treats the two identically-named types as
 * unrelated. Pass the module namespace type (via `import type * as NS`) as `T`
 * and the returned value is typed as the same declaration copy the callers use.
 *
 * @param loader thunk performing the dynamic import, e.g. `() => import('pkg')`
 */
export async function lazyImport<T>(loader: () => Promise<unknown>): Promise<T> {
	return (await loader()) as T;
}
