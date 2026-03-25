<h1 align="center">vite-plugin-dts</h1>

<p align="center">
  一款用于在 <a href="https://cn.vitejs.dev/guide/build.html#library-mode">库模式</a> 中从 <code>.ts(x)</code> 或 <code>.vue</code> 源文件生成类型文件（<code>*.d.ts</code>）的 Vite 插件。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vite-plugin-dts">
    <img src="https://img.shields.io/npm/v/vite-plugin-dts?color=orange&label=" alt="version" />
  </a>
  <a href="https://github.com/qmhc/vite-plugin-dts/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/vite-plugin-dts" alt="license" />
  </a>
</p>

**中文** | [English](./README.md)

## 安装

```sh
pnpm i vite-plugin-dts -D
```

## 使用

在 `vite.config.ts`：

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

默认情况，生成的类型文件会跟随源文件的结构。

如果你希望将所有的类型合并到一个文件中，只需指定 `rollupTypes: true`：

```ts
{
  plugins: [dts({ rollupTypes: true })]
}
```

如果你从 Vite 官方模板开始，你应该指定 `tsconfigPath`：

```ts
{
  plugins: [dts({ tsconfigPath: './tsconfig.app.json' })]
}
```

从 `3.0.0` 开始，你可以在 Rollup 中使用该插件。

## 常见问题

此处将收录一些常见的问题并提供一些解决方案。

### 打包时出现了无法从 `node_modules` 的包中推断类型的错误

这是 TypeScript 通过软链接 (pnpm) 读取 `node_modules` 中过的类型时会出现的一个已知的问题，可以参考这个 [issue](https://github.com/microsoft/TypeScript/issues/42873)，目前已有的一个解决方案，在你的 `tsconfig.json` 中添加 `baseUrl` 以及在 `paths` 添加这些包的路径：

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

### 在 `rollupTypes: true` 时出现 `Internal Error`

参考这个 [issue](https://github.com/microsoft/rushstack/issues/3875)，这是由于 `@microsoft/api-extractor` 或者是 TypeScript 解析器的一些限制导致的。

主要原因在于 `tsconfig.json` 中指定了 `baseUrl` 并且在引入时直接使用非标准路径。

例如：指定了 `baseUrl: 'src'` 并且在 `<root>/src/index.ts` 中引入 `<root>/src/components/index.ts` 时使用了 `import 'components'` 而不是 `import './components'`。

目前想要正常打包，需要规避上述情况，或使用别名代替（配合 `paths` 属性）。

### 打包时出现找不到模块的错误

这很有可能是因为在你的默认 `tsconfig.json` 中未有正确配置 `include` 导致的。

由于一些局限性，插件依赖最上层的 `tsconfig.json` 来解析需要包含的文件，所以你需要在最上层的 `tsconfig.json` 中指定正确的 `include`，或者通过插件的 `tsconfigPath` 选项指定一个包含了正确 `include` 的配置文件路径，例如在 Vite 初始模板中它是 `tsconfig.app.json`。

可以参考这个 [评论](https://github.com/qmhc/vite-plugin-dts/issues/343#issuecomment-2198111439).

<details>
  <summary>过时的</summary>

### 打包后出现类型文件缺失 (`1.7.0` 之前)

默认情况下 `skipDiagnostics` 选项的值为 `true`，这意味着打包过程中将跳过类型检查（一些项目通常有 `vue-tsc` 等的类型检查工具），这时如果出现存在类型错误的文件，并且这是错误会中断打包过程，那么这些文件对应的类型文件将不会被生成。

如果您的项目没有依赖外部的类型检查工具，这时候可以您可以设置 `skipDiagnostics: false` 和 `logDiagnostics: true` 来打开插件的诊断与输出功能，这将帮助您检查打包过程中出现的类型错误并将错误信息输出至终端。

### Vue 组件中同时使用了 `script` 和 `setup-script` 后出现类型错误（`3.0.0` 之前）

这通常是由于分别在 `script` 和 `setup-script` 中同时使用了 `defineComponent` 方法导致的。 `vue/compiler-sfc` 为这类文件编译时会将 `script` 中的默认导出结果合并到 `setup-script` 的 `defineComponent` 的参数定义中，而 `defineComponent` 的参数类型与结果类型并不兼容，这一行为将会导致类型错误。

这是一个简单的[示例](https://github.com/qmhc/vite-plugin-dts/blob/main/examples/vue/components/BothScripts.vue)，您应该将位于 `script` 中的 `defineComponent` 方法移除，直接导出一个原始的对象。

</details>

## 选项

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
   * 解析器的名称
   *
   * 靠后的同名解析器将会覆盖靠前的
   */
  name: string,
  /**
   * 判断解析器是否支持该文件
   */
  supports: (id: string) => void | boolean,
  /**
   * 将源文件转换为类型文件
   *
   * 注意，返回的文件的路径应该基于 `outDir`，或者相对于 `root`
   */
  transform: (payload: {
    id: string,
    code: string,
    root: string,
    outDir: string,
    host: ts.CompilerHost,
    program: ts.Program,
  }) => MaybePromise<{ path: string, content: string }[]>
}

export interface PluginOptions {
  /**
   * 指定根目录
   *
   * 默认为 Vite 配置的 'root'，使用 Rollup 为 `process.cwd()`
   */
  root?: string,

  /**
   * 指定输出目录
   *
   * 可以指定一个数组来输出到多个目录中
   *
   * 默认为 Vite 配置的 'build.outDir'，使用 Rollup 时为 tsconfig.json 的 `outDir`
   */
  outDir?: string | string[],

  /**
   * 用于手动设置入口文件的根路径（通常用在 monorepo）
   *
   * 在计算每个文件的输出路径时将基于该路径
   *
   * 默认为所有源文件的最小公共路径
   */
  entryRoot?: string,

  /**
   * 限制类型文件生成在 `outDir` 内
   *
   * 如果为 `true`，生成在 `outDir` 外的文件将被忽略
   *
   * @default true
   */
  strictOutput?: boolean,

  /**
   * 覆写 CompilerOptions
   *
   * @default null
   */
  compilerOptions?: ts.CompilerOptions | null,

  /**
   * 指定 tsconfig.json 的路径
   *
   * 插件会解析 tsconfig.json 的 include 和 exclude 选项
   *
   * 未指定时插件默认从根目录开始寻找配置文件
   */
  tsconfigPath?: string,

  /**
   * 指定自定义的解析器
   *
   * @default []
   */
  resolvers?: Resolver[],

  /**
   * 解析 tsconfig.json 的 `paths` 作为别名
   *
   * 注意，这些别名仅用在类型文件中使用
   *
   * @default true
   * @remarks 只使用每个路径的第一个替换
   */
  pathsToAliases?: boolean,

  /**
   * 设置在转换别名时哪些路径需要排除
   *
   * @default []
   */
  aliasesExclude?: (string | RegExp)[],

  /**
   * 是否将 '.vue.d.ts' 文件名转换为 '.d.ts'
   *
   * 如果转换后出现重名，将会回退到原来的名字。
   *
   * @default false
   */
  cleanVueFileName?: boolean,

  /**
   * 是否将动态引入转换为静态（例如：`import('vue').DefineComponent` 转换为 `import { DefineComponent } from 'vue'`）
   *
   * 开启 `rollupTypes` 时强制为 `true`
   *
   * @default false
   */
  staticImport?: boolean,

  /**
   * 手动设置包含路径的 glob（相对于 root）
   *
   * 默认基于 tsconfig.json 的 `include` 选项（相对于 tsconfig.json 所在目录）
   */
  include?: string | string[],

  /**
   * 手动设置排除路径的 glob
   *
   * 默认基于 tsconfig.json 的 `exclude` 选线，未设置时为 `'node_modules/**'`
   */
  exclude?: string | string[],

  /**
   * 是否移除 `import 'xxx'`
   *
   * @default true
   */
  clearPureImport?: boolean,

  /**
   * 是否生成类型入口文件
   *
   * 当为 `true` 时会基于 package.json 的 `types` 字段生成，或者 `${outDir}/index.d.ts`
   *
   * 当开启 `rollupTypes` 时强制为 `true`
   *
   * @default false
   */
  insertTypesEntry?: boolean,

  /**
   * 设置是否将发出的类型文件打包进单个文件
   *
   * 基于 `@microsoft/api-extractor`，过程将会消耗一些时间
   *
   * @default false
   */
  rollupTypes?: boolean,

  /**
   * 设置 `@microsoft/api-extractor` 的 `bundledPackages` 选项
   *
   * @default []
   * @see https://api-extractor.com/pages/configs/api-extractor_json/#bundledpackages
   */
  bundledPackages?: string[],

  /**
   * 覆写 `@microsoft/api-extractor` 的配置
   *
   * @default null
   * @see https://api-extractor.com/pages/setup/configure_api_report/
   */
  rollupConfig?: RollupConfig,

  /**
   * 覆写 `@microsoft/api-extractor` 的调用选项
   *
   * @default null
   * @see https://api-extractor.com/pages/setup/invoking/#invoking-from-a-build-script
   */
  rollupOptions?: IExtractorInvokeOptions,

  /**
   * 是否将源码里的 .d.ts 文件复制到 `outDir`
   *
   * @default false
   * @remarks 在 2.0 之前它默认为 `true`
   */
  copyDtsFiles?: boolean,

  /**
   * 是否只生成类型文件
   *
   * 当为 `true` 时会强制删除所有 Vite（Rollup）的原始产物
   *
   * @default false
   */
  declarationOnly?: boolean,

  /**
   * 指定插件的输出等级
   *
   * 默认基于 Vite 配置的 'logLevel' 选项
   */
  logLevel?: LogLevel,

  /**
   * 获取诊断信息后的钩子
   *
   * 可以根据 `diagnostics.length` 来判断有误类型错误
   *
   * @default () => {}
   */
  afterDiagnostic?: (diagnostics: readonly ts.Diagnostic[]) => MaybePromise<void>,

  /**
   * 类型声明文件被写入前的钩子
   *
   * 可以在钩子里转换文件路径和文件内容
   *
   * 当返回 `false` 或 `Promise<false>` 时会跳过该文件
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
   * 类型文件被打包进单个文件后的钩子
   *
   * @default () => {}
   */
  afterRollup?: (result: ExtractorResult) => MaybePromise<void>,

  /**
   * 在所有类型文件被写入后的钩子
   *
   * 它会接收一个记录了那些最终被写入的文件的映射（path -> content）
   *
   * @default () => {}
   */
  afterBuild?: (emittedFiles: Map<string, string>) => MaybePromise<void>
}
```

## 贡献者

感谢他们的所做的一切贡献！

<a href="https://github.com/qmhc/vite-plugin-dts/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=qmhc/vite-plugin-dts" alt="contributors" />
</a>

## 示例

克隆项目然后执行下列命令：

```sh
pnpm run test:ts
```

然后检查 `examples/ts/types` 目录。

`examples` 目录下同样有 Vue 和 React 的案例。

一个使用该插件的真实项目：[Vexip UI](https://github.com/vexip-ui/vexip-ui)。

## 授权

MIT 授权。
