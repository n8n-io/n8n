<h1 align="center">vite-plugin-dts</h1>

<p align="center">
  A Vite plugin that generates declaration files (<code>*.d.ts</code>) from <code>.ts(x)</code> or <code>.vue</code> source files when using Vite in <a href="https://vitejs.dev/guide/build.html#library-mode">library mode</a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vite-plugin-dts">
    <img src="https://img.shields.io/npm/v/vite-plugin-dts?color=orange&label=" alt="version" />
  </a>
  <a href="https://github.com/qmhc/vite-plugin-dts/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/vite-plugin-dts" alt="license" />
  </a>
</p>

**English** | [中文](./README.zh-CN.md)

## Install

```sh
pnpm i vite-plugin-dts -D
```

## Usage

In `vite.config.ts`:

```ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      formats: ['es'],
      fileName: 'my-lib'
    }
  },
  plugins: [dts()]
})
```

By default, the generated declaration files are following the source structure.

If you want to merge all declarations into one file, just specify `rollupTypes: true`:

```ts
{
  plugins: [dts({ rollupTypes: true })]
}
```

If you start with official Vite template, you should specify the `tsconfigPath`:

```ts
{
  plugins: [dts({ tsconfigPath: './tsconfig.app.json' })]
}
```

Starting with `3.0.0`, you can use this plugin with Rollup.

## FAQ

Here are some FAQ's and solutions.

### Type errors that are unable to infer types from packages in `node_modules`

This is an existing [TypeScript issue](https://github.com/microsoft/TypeScript/issues/42873) where TypeScript infers types from packages located in `node_modules` through soft links (pnpm). A workaround is to add `baseUrl` to your `tsconfig.json` and specify the `paths` for these packages:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "third-lib": ["node_modules/third-lib"]
    }
  }
}
```

### `Internal Error` occurs when using `rollupTypes: true`

Refer to this [issue](https://github.com/microsoft/rushstack/issues/3875), it's due to a limitation of `@microsoft/api-extractor` or TypeScript resolver.

The main reason is that `baseUrl` is specified in `tsconfig.json` and non-standard paths are used directly when imported.

For example: `baseUrl: 'src'` is specified and importing from `<root>/src/components/index.ts` in `<root>/src/index.ts`, and `import 'components'` is used instead of `import './components'`.

Currently, you need to avoid the above situation, or use aliases instead (with the `paths` option).

### Get module not found errors during build

This is likely due to incorrect configuration of the `include` property in your default `tsconfig.json`.

Due to some limitations, the plugin relies on the top-level `tsconfig.json` to resolve the files to include. Therefore, you need to specify the correct `include` property in the top-level `tsconfig.json`, or you can specify a configuration file path with the correct `include` property using the `tsconfigPath` option of the plugin. For example, in the Vite initial template, it is `tsconfig.app.json`.

You can refer to this [comment](https://github.com/qmhc/vite-plugin-dts/issues/343#issuecomment-2198111439).

<details>
  <summary>Legacy</summary>

### Missing some declaration files after build (before `1.7.0`)

By default, the `skipDiagnostics` option is set to `true` which means type diagnostics will be skipped during the build process (some projects may have diagnostic tools such as `vue-tsc`). Files with type errors which interrupt the build process will not be emitted (declaration files won't be generated).

If your project doesn't use type diagnostic tools, you can set `skipDiagnostics: false` and `logDiagnostics: true` to turn on diagnostic and logging features of this plugin. Type errors during build will be logged to the terminal.

### Type error when using both `script` and `setup-script` in Vue component (before `3.0.0`)

This is usually caused by using the `defineComponent` function in both `script` and `setup-script`. When `vue/compiler-sfc` compiles these files, the default export result from `script` gets merged with the parameter object of `defineComponent` from `setup-script`. This is incompatible with parameters and types returned from `defineComponent`. This results in a type error.

Here is a simple [example](https://github.com/qmhc/vite-plugin-dts/blob/main/examples/vue/components/BothScripts.vue). You should remove the `defineComponent` in `script` and export a native object directly.

</details>

## Options

```ts
import type ts from 'typescript'
import type { IExtractorConfigPrepareOptions, IExtractorInvokeOptions } from '@microsoft/api-extractor'
import type { LogLevel } from 'vite'

type MaybePromise<T> = T | Promise<T>

export type RollupConfig = Omit<
  IExtractorConfigPrepareOptions['configObject'],
  | 'projectFolder'
  | 'mainEntryPointFilePath'
  | 'compiler'
  | 'dtsRollup'
  >

export interface Resolver {
  /**
   * The name of the resolver
   *
   * The later resolver with the same name will overwrite the earlier
   */
  name: string,
  /**
   * Determine whether the resolver supports the file
   */
  supports: (id: string) => void | boolean,
  /**
   * Transform source to declaration files
   *
   * Note that the path of the returns should base on `outDir`, or relative path to `root`
   */
  transform: (payload: {
    id: string,
    code: string,
    root: string,
    outDir: string,
    host: ts.CompilerHost,
    program: ts.Program
  }) => MaybePromise<{ path: string, content: string }[]>
}

export interface PluginOptions {
  /**
   * Specify root directory.
   *
   * Defaults to the 'root' of the Vite config, or `process.cwd()` if using Rollup.
   */
  root?: string,

  /**
   * Output directory for declaration files.
   *
   * Can be an array to output to multiple directories.
   *
   * Defaults to 'build.outDir' of the Vite config, or `outDir` of tsconfig.json if using Rollup.
   */
  outDir?: string | string[],

  /**
   * Override root path of entry files (useful in monorepos).
   *
   * The output path of each file will be calculated based on the value provided.
   *
   * The default is the smallest public path for all source files.
   */
  entryRoot?: string,

  /**
   * Restrict declaration files output to `outDir`.
   *
   * If true, generated declaration files outside `outDir` will be ignored.
   *
   * @default true
   */
  strictOutput?: boolean,

  /**
   * Override compilerOptions.
   *
   * @default null
   */
  compilerOptions?: ts.CompilerOptions | null,

  /**
   * Specify tsconfig.json path.
   *
   * Plugin resolves `include` and `exclude` globs from tsconfig.json.
   *
   * If not specified, plugin will find config file from root.
   */
  tsconfigPath?: string,

  /**
   * Specify custom resolvers.
   *
   * @default []
   */
  resolvers?: Resolver[],

  /**
   * Parsing `paths` of tsconfig.json to aliases.
   *
   * Note that these aliases only use for declaration files.
   *
   * @default true
   * @remarks Only use first replacement of each path.
   */
  pathsToAliases?: boolean,

  /**
   * Set which paths should be excluded when transforming aliases.
   *
   * @default []
   */
  aliasesExclude?: (string | RegExp)[],

  /**
   * Whether to transform file names ending in '.vue.d.ts' to '.d.ts'.
   *
   * If there is a duplicate name after transform, it will fall back to the original name.
   *
   * @default false
   */
  cleanVueFileName?: boolean,

  /**
   * Whether to transform dynamic imports to static (eg `import('vue').DefineComponent` to `import { DefineComponent } from 'vue'`).
   *
   * Value is forced to `true` when `rollupTypes` is `true`.
   *
   * @default false
   */
  staticImport?: boolean,

  /**
   * Override `include` glob (relative to root).
   *
   * Defaults to `include` property of tsconfig.json (relative to tsconfig.json located).
   */
  include?: string | string[],

  /**
   * Override `exclude` glob.
   *
   * Defaults to `exclude` property of tsconfig.json or `'node_modules/**'` if not supplied.
   */
  exclude?: string | string[],

  /**
   * Whether to remove `import 'xxx'`.
   *
   * @default true
   */
  clearPureImport?: boolean,

  /**
   * Whether to generate types entry file(s).
   *
   * When `true`, uses package.json `types` property if it exists or `${outDir}/index.d.ts`.
   *
   * Value is forced to `true` when `rollupTypes` is `true`.
   *
   * @default false
   */
  insertTypesEntry?: boolean,

  /**
   * Rollup type declaration files after emitting them.
   *
   * Powered by `@microsoft/api-extractor` - time-intensive operation.
   *
   * @default false
   */
  rollupTypes?: boolean,

  /**
   * Bundled packages for `@microsoft/api-extractor`.
   *
   * @default []
   * @see https://api-extractor.com/pages/configs/api-extractor_json/#bundledpackages
   */
  bundledPackages?: string[],

  /**
   * Override the config of `@microsoft/api-extractor`.
   *
   * @default null
   * @see https://api-extractor.com/pages/setup/configure_api_report/
   */
  rollupConfig?: RollupConfig,

  /**
   * Override the invoke options of `@microsoft/api-extractor`.
   *
   * @default null
   * @see https://api-extractor.com/pages/setup/invoking/#invoking-from-a-build-script
   */
  rollupOptions?: IExtractorInvokeOptions,

  /**
   * Whether to copy .d.ts source files to `outDir`.
   *
   * @default false
   * @remarks Before 2.0, the default was `true`.
   */
  copyDtsFiles?: boolean,

  /**
   * Whether to emit declaration files only.
   *
   * When `true`, all the original outputs of vite (rollup) will be force removed.
   *
   * @default false
   */
  declarationOnly?: boolean,

  /**
   * Logging level for this plugin.
   *
   * Defaults to the 'logLevel' property of your Vite config.
   */
  logLevel?: LogLevel,

  /**
   * Hook called after diagnostic is emitted.
   *
   * According to the `diagnostics.length`, you can judge whether there is any type error.
   *
   * @default () => {}
   */
  afterDiagnostic?: (diagnostics: readonly ts.Diagnostic[]) => MaybePromise<void>,

  /**
   * Hook called prior to writing each declaration file.
   *
   * This allows you to transform the path or content.
   *
   * The file will be skipped when the return value `false` or `Promise<false>`.
   *
   * @default () => {}
   */
  beforeWriteFile?: (
    filePath: string,
    content: string
  ) => MaybePromise<
    | void
    | false
    | {
      filePath?: string,
      content?: string
    }
  >,

  /**
   * Hook called after rolling up declaration files.
   *
   * @default () => {}
   */
  afterRollup?: (result: ExtractorResult) => MaybePromise<void>,

  /**
   * Hook called after all declaration files are written.
   *
   * It will be received a map (path -> content) that records those emitted files.
   *
   * @default () => {}
   */
  afterBuild?: (emittedFiles: Map<string, string>) => MaybePromise<void>
}
```

## Contributors

Thanks for all the contributions!

<a href="https://github.com/qmhc/vite-plugin-dts/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=qmhc/vite-plugin-dts" alt="contributors" />
</a>

## Example

Clone and run the following script:

```sh
pnpm run test:ts
```

Then check `examples/ts/types`.

Also Vue and React cases under `examples`.

A real project using this plugin: [Vexip UI](https://github.com/vexip-ui/vexip-ui).

## License

MIT License.
