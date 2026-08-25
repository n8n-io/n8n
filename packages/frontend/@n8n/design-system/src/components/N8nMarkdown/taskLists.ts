/**
 * `markdown-it-task-lists` publishes no types, and DefinitelyTyped has none, so
 * `src/shims-modules.d.ts` types it with an ambient `declare module`. Ambient
 * declarations do not reach `dist` — `vite-plugin-dts` emits only module files —
 * so a public prop type that names the shim's `Config` ships a dangling
 * reference. This interface is the same shape, in a module the build emits.
 *
 * @see https://github.com/revin/markdown-it-task-lists#usage
 */
export interface TaskListsConfig {
	enabled?: boolean;
	label?: boolean;
	labelAfter?: boolean;
}
