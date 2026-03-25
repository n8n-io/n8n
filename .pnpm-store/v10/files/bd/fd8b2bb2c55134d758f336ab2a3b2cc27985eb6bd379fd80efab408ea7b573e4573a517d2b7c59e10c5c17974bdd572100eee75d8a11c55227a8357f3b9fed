# rollup-plugin-dts

[![Build Status](https://github.com/Swatinem/rollup-plugin-dts/workflows/CI/badge.svg)](https://github.com/Swatinem/rollup-plugin-dts/actions?workflow=CI)
[![Coverage Status](https://img.shields.io/codecov/c/github/Swatinem/rollup-plugin-dts.svg)](https://codecov.io/gh/Swatinem/rollup-plugin-dts)

This is a plugin that lets you roll-up your `.d.ts` definition files.

## Usage

Install the package from `npm`:

    $ npm install --save-dev rollup-plugin-dts

Add it to your `rollup.config.js`:

```js
import dts from "rollup-plugin-dts";

const config = [
  // …
  {
    input: "./my-input/index.d.ts",
    output: [{ file: "dist/my-library.d.ts", format: "es" }],
    plugins: [dts()],
  },
];

export default config;
```

And then instruct typescript where to find your definitions inside your `package.json`:

```json
  "types": "dist/my-library.d.ts",
```

**NOTE** that the plugin will automatically mark any external library
(`@types` for example) as `external`, so those will be excluded from bundling.

## What to expect

While this plugin is fairly complete, it does not support all imaginable use-cases.
In particular, the plugin works best with already existing `.d.ts` files generated
by the typescript compiler from idiomatic code.

Working with `.ts(x)` or even `.js(x)` (when setting `allowJs: true`) does work,
but is not recommended.

The plugin does its own import resolution through the typescript compiler, and
usage together with other resolution plugins, such as `node-resolve` can lead
to errors and is not recommended.

All external dependencies from `node_modules` are automatically excluded from
bundling. This can be overridden using the `respectExternal` setting, but it is
generally not recommended. While rollup of external `@types` generally works,
it is not recommended.

## Why?

Well, ideally TypeScript should just do all this itself, and it even has a
[proposal](https://github.com/Microsoft/TypeScript/issues/4433) to do that.
But there hasn’t been any progress in ~3 years.

Some projects, like [rollup itself](https://github.com/rollup/rollup/blob/24fe07f39da8e4225f4bc4f797331930d8405ec2/src/rollup/types.d.ts)
go the route of completely separating their public interfaces in a separate file.

## Alternatives

- [API Extractor](https://api-extractor.com/)
- [dts-bundle-generator](https://github.com/timocov/dts-bundle-generator)
- [rollup-plugin-ts](https://github.com/wessberg/rollup-plugin-ts)
- [tsc-prog](https://github.com/jeremyben/tsc-prog)

[See](https://github.com/Swatinem/rollup-plugin-dts/issues/5)
[some](https://github.com/Swatinem/rollup-plugin-dts/issues/13)
[discussions](https://github.com/timocov/dts-bundle-generator/issues/68)
about some of these projects and their tradeoffs.

## [How does it work](./docs/how-it-works.md)

## License

The code is licensed under the copyleft **LGPL-3.0**. I have no intention to
license this under any non-copyleft license.
