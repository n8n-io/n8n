import { a as RE_JSON, c as RE_VUE, i as RE_JS, n as RE_DTS, o as RE_NODE_MODULES, r as RE_DTS_MAP, s as RE_TS, t as RE_CSS } from "./filename-Dn8CLu7g.mjs";
import { IsolatedDeclarationsOptions } from "rolldown/experimental";
import { TsConfigJson } from "get-tsconfig";
import { AddonFunction, Plugin } from "rolldown";

//#region src/options.d.ts
interface GeneralOptions {
  /**
  * The directory in which the plugin will search for the `tsconfig.json` file.
  */
  cwd?: string;
  /**
  * Set to `true` if your entry files are `.d.ts` files instead of `.ts` files.
  *
  * When enabled, the plugin will skip generating a `.d.ts` file for the entry point.
  */
  dtsInput?: boolean;
  /**
  * If `true`, the plugin will emit only `.d.ts` files and remove all other output chunks.
  *
  * This is especially useful when generating `.d.ts` files for the CommonJS format as part of a separate build step.
  */
  emitDtsOnly?: boolean;
  /**
  * The path to the `tsconfig.json` file.
  *
  * If set to `false`, the plugin will ignore any `tsconfig.json` file.
  * You can still specify `compilerOptions` directly in the options.
  *
  * @default 'tsconfig.json'
  */
  tsconfig?: string | boolean;
  /**
  * Pass a raw `tsconfig.json` object directly to the plugin.
  *
  * @see https://www.typescriptlang.org/tsconfig
  */
  tsconfigRaw?: Omit<TsConfigJson, "compilerOptions">;
  /**
  * Override the `compilerOptions` specified in `tsconfig.json`.
  *
  * @see https://www.typescriptlang.org/tsconfig/#compilerOptions
  */
  compilerOptions?: TsConfigJson.CompilerOptions;
  /**
  * If `true`, the plugin will generate declaration maps (`.d.ts.map`) for `.d.ts` files.
  */
  sourcemap?: boolean;
  /**
  * Controls whether type definitions from `node_modules` are bundled into your final `.d.ts` file or kept as external `import` statements.
  * 
  * By default, dependencies are external, resulting in `import { Type } from 'some-package'`. When bundled, this `import` is removed, and the type definitions from `some-package` are copied directly into your file.
  
  * - `true`: Bundles all dependencies.
  * - `false`: (Default) Keeps all dependencies external.
  * - `(string | RegExp)[]`: Bundles only dependencies matching the provided strings or regular expressions (e.g. `['pkg-a', /^@scope\//]`).
  */
  resolve?: boolean | (string | RegExp)[];
  /**
  * Specifies a resolver to resolve type definitions, especially for `node_modules`.
  *
  * - `'oxc'`: Uses Oxc's module resolution, which is faster and more efficient.
  * - `'tsc'`: Uses TypeScript's native module resolution, which may be more compatible with complex setups, but slower.
  *
  * @default 'oxc'
  */
  resolver?: "oxc" | "tsc";
  /**
  * Determines how the default export is emitted.
  *
  * If set to `true`, and you are only exporting a single item using `export default ...`,
  * the output will use `export = ...` instead of the standard ES module syntax.
  * This is useful for compatibility with CommonJS.
  */
  cjsDefault?: boolean;
  /**
  * Indicates whether the generated `.d.ts` files have side effects.
  * - If set to `true`, Rolldown will treat the `.d.ts` files as having side effects during tree-shaking.
  * - If set to `false`, Rolldown may consider the `.d.ts` files as side-effect-free, potentially removing them if they are not imported.
  *
  * @default false
  */
  sideEffects?: boolean;
}
interface TscOptions {
  /**
  * Build mode for the TypeScript compiler:
  *
  * - If `true`, the plugin will use [`tsc -b`](https://www.typescriptlang.org/docs/handbook/project-references.html#build-mode-for-typescript) to build the project and all referenced projects before emitting `.d.ts` files.
  * - If `false`, the plugin will use [`tsc`](https://www.typescriptlang.org/docs/handbook/compiler-options.html) to emit `.d.ts` files without building referenced projects.
  *
  * @default false
  */
  build?: boolean;
  /**
  * If your tsconfig.json has
  * [`references`](https://www.typescriptlang.org/tsconfig/#references) option,
  * `rolldown-plugin-dts` will use [`tsc
  * -b`](https://www.typescriptlang.org/docs/handbook/project-references.html#build-mode-for-typescript)
  * to build the project and all referenced projects before emitting `.d.ts`
  * files.
  *
  * In such case, if this option is `true`, `rolldown-plugin-dts` will write
  * down all built files into your disk, including
  * [`.tsbuildinfo`](https://www.typescriptlang.org/tsconfig/#tsBuildInfoFile)
  * and other built files. This is equivalent to running `tsc -b` in your
  * project.
  *
  * Otherwise, if this option is `false`, `rolldown-plugin-dts` will write
  * built files only into memory and leave a small footprint in your disk.
  *
  * Enabling this option will decrease the build time by caching previous build
  * results. This is helpful when you have a large project with multiple
  * referenced projects.
  *
  * By default, `incremental` is `true` if your tsconfig has
  * [`incremental`](https://www.typescriptlang.org/tsconfig/#incremental) or
  * [`tsBuildInfoFile`](https://www.typescriptlang.org/tsconfig/#tsBuildInfoFile)
  * enabled.
  *
  * This option is only used when {@link Options.oxc} is
  * `false`.
  */
  incremental?: boolean;
  /**
  * If `true`, the plugin will generate `.d.ts` files using `vue-tsc`.
  */
  vue?: boolean;
  /**
  * If `true`, the plugin will generate `.d.ts` files using `@ts-macro/tsc`.
  */
  tsMacro?: boolean;
  /**
  * If `true`, the plugin will launch a separate process for `tsc` or `vue-tsc`.
  * This enables processing multiple projects in parallel.
  */
  parallel?: boolean;
  /**
  * If `true`, the plugin will prepare all files listed in `tsconfig.json` for `tsc` or `vue-tsc`.
  *
  * This is especially useful when you have a single `tsconfig.json` for multiple projects in a monorepo.
  */
  eager?: boolean;
  /**
  * If `true`, the plugin will create a new isolated context for each build,
  * ensuring that previously generated `.d.ts` code and caches are not reused.
  *
  * By default, the plugin may reuse internal caches or incremental build artifacts
  * to speed up repeated builds. Enabling this option forces a clean context,
  * guaranteeing that all type definitions are generated from scratch.
  *
  * @default false
  */
  newContext?: boolean;
  /**
  * If `true`, the plugin will emit `.d.ts` files for `.js` files as well.
  * This is useful when you want to generate type definitions for JavaScript files with JSDoc comments.
  *
  * Enabled by default when `allowJs` in compilerOptions is `true`.
  * This option is only used when {@link Options.oxc} is
  * `false`.
  */
  emitJs?: boolean;
  /**
  * Content to be added at the top of each generated `.d.ts` file.
  */
  banner?: string | Promise<string> | AddonFunction;
  /**
  * Content to be added at the bottom of each generated `.d.ts` file.
  */
  footer?: string | Promise<string> | AddonFunction;
}
interface Options extends GeneralOptions, TscOptions {
  /**
  * If `true`, the plugin will generate `.d.ts` files using Oxc,
  * which is significantly faster than the TypeScript compiler.
  *
  * This option is automatically enabled when `isolatedDeclarations` in `compilerOptions` is set to `true`.
  */
  oxc?: boolean | Omit<IsolatedDeclarationsOptions, "sourcemap">;
  /**
  * **[Experimental]** Enables DTS generation using `tsgo`.
  *
  * To use this option, make sure `@typescript/native-preview` is installed as a dependency.
  *
  * **Note:** This option is not yet recommended for production environments.
  * `tsconfigRaw` and `isolatedDeclarations` options will be ignored when this option is enabled.
  */
  tsgo?: boolean;
}
type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type MarkPartial<T, K extends keyof T> = Omit<Required<T>, K> & Partial<Pick<T, K>>;
type OptionsResolved = Overwrite<MarkPartial<Omit<Options, "compilerOptions">, "banner" | "footer">, {
  tsconfig?: string;
  oxc: IsolatedDeclarationsOptions | false;
  tsconfigRaw: TsConfigJson;
}>;
declare function resolveOptions({
  cwd,
  dtsInput,
  emitDtsOnly,
  tsconfig,
  tsconfigRaw: overriddenTsconfigRaw,
  compilerOptions,
  sourcemap,
  resolve,
  resolver,
  cjsDefault,
  banner,
  footer,
  sideEffects,
  build,
  incremental,
  vue,
  tsMacro,
  parallel,
  eager,
  newContext,
  emitJs,
  oxc,
  tsgo
}: Options): OptionsResolved;
//#endregion
//#region src/fake-js.d.ts
declare function createFakeJsPlugin({
  sourcemap,
  cjsDefault,
  sideEffects
}: Pick<OptionsResolved, "sourcemap" | "cjsDefault" | "sideEffects">): Plugin;
//#endregion
//#region src/generate.d.ts
declare function createGeneratePlugin({
  tsconfig,
  tsconfigRaw,
  build,
  incremental,
  cwd,
  oxc,
  emitDtsOnly,
  vue,
  tsMacro,
  parallel,
  eager,
  tsgo,
  newContext,
  emitJs,
  sourcemap
}: Pick<OptionsResolved, "cwd" | "tsconfig" | "tsconfigRaw" | "build" | "incremental" | "oxc" | "emitDtsOnly" | "vue" | "tsMacro" | "parallel" | "eager" | "tsgo" | "newContext" | "emitJs" | "sourcemap">): Plugin;
//#endregion
//#region src/index.d.ts
declare function dts(options?: Options): Plugin[];
//#endregion
export { type Options, RE_CSS, RE_DTS, RE_DTS_MAP, RE_JS, RE_JSON, RE_NODE_MODULES, RE_TS, RE_VUE, createFakeJsPlugin, createGeneratePlugin, dts, resolveOptions };