# unplugin-swc

[![npm version](https://badgen.net/npm/v/unplugin-swc)](https://npm.im/unplugin-swc)

> [SWC](https://swc.rs/) plugin for Vite and Rollup.

## Install

```bash
npm i unplugin-swc @swc/core -D
```

## Usage

Vite or Rollup:

```ts
import swc from 'unplugin-swc'

export default {
  plugins: [
    // Vite plugin
    swc.vite(),
    // Rollup plugin
    swc.rollup(),
  ],
}
```

### `tsconfig.json`

Following SWC options are inferred from `tsconfig.json`:

- `jsc.parser.syntax`: based on file extension
- `jsc.parser.jsx`, `parser.tsx`: `compilerOptions.jsx`
- `jsc.parser.decorators`: `compilerOptions.experimentalDecorators`
- `jsc.transform.react.pragma`: `compilerOptions.jsxFactory`
- `jsc.transform.react.pragmaFrag`: `compilerOptions.jsxFragmentFactory`
- `jsc.transform.react.importSource`: `compilerOptions.jsxImportSource`
- `jsc.transform.legacyDecorator`: `compilerOptions.experimentalDecorators`
- `jsc.transform.decoratorMetadata`: `compilerOptions.emitDecoratorMetadata`
- `jsc.keepClassNames`: when decorator is enabled, because original class name is required by libs like `type-graphql` to generate correct graphql type

If you wish to disable this behavior and use `.swcrc` to control above `jsc` options, you can use `tsconfigFile` option:

```ts
// Or swc.rollup
swc.vite({
  tsconfigFile: false,
})

// It's also possible to use a custom tsconfig file instead of tsconfig.json
swc.vite({
  tsconfigFile: './tsconfig.build.json',
})
```

### Minification

Use the `minify: true` option, it only works for Rollup as Vite uses esbuild to minify the code and cannot be changed.

To have advanced control over the minification process, [use `jsc.minify` option in `.swcrc`](https://swc.rs/docs/configuration/minification).

### Vite

`esbuild` will be automatically disabled if you use this plugin.

## Options

This plugin accepts all `@swc/core` options, except for `jsc` which should be configured in `.swcrc` instead, and some extra options that are specific to this plugin:

### `options.tsconfigFile`

- Type: `boolean`, `string`
- Default: `tsconfig.json`

Disable the use of tsconfig file or specify a custom one.

### `options.include`

- Type: `RegExp`
- Default: `/\.[jt]sx?$/`

Files to include in the transpilation process.

### `options.exclude`

- Type: `RegExp`
- Default: `/node_modules/`

Files to exclude in the transpilation process.

### `options.jsc`

- Type: `object`

Custom [jsc](https://swc.rs/docs/configuration/compilation) options to merge with the default one.

## License

MIT &copy; [EGOIST](https://github.com/sponsors/egoist)
