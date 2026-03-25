<h1><img src="https://google.github.io/zx/img/logo.svg" alt="Zx logo" height="32" width="28" valign="middle"> zx</h1>

```js
#!/usr/bin/env zx

await $`cat package.json | grep name`

const branch = await $`git branch --show-current`
await $`dep deploy --branch=${branch}`

await Promise.all([
  $`sleep 1; echo 1`,
  $`sleep 2; echo 2`,
  $`sleep 3; echo 3`,
])

const name = 'foo bar'
await $`mkdir /tmp/${name}`
```

Bash is great, but when it comes to writing more complex scripts,
many people prefer a more convenient programming language.
JavaScript is a perfect choice, but the Node.js standard library
requires additional hassle before using. No compromise, take the best of both. The `zx` package provides
useful cross-platform wrappers around `child_process`, escapes arguments and
gives sensible defaults.

## Install

```bash
npm install zx
```
All setup options: [zx/setup](https://google.github.io/zx/setup).
See also [**zx@lite**](https://google.github.io/zx/lite).

## Usage

* [Documentation at google.github.io/zx/](https://google.github.io/zx/)
* [Code examples](https://github.com/google/zx/tree/main/examples)

## Compatibility
* Linux, macOS, or Windows
* JavaScript Runtime:
    * Node.js >= 12.17.0
    * Bun >= 1.0.0
    * Deno 1.x, 2.x
    * GraalVM Node.js
* Some kind of [bash or PowerShell](https://google.github.io/zx/shell)
* [Both CJS or ESM](https://google.github.io/zx/setup#hybrid) modules in [JS or TS](https://google.github.io/zx/typescript)


## License

[Apache-2.0](LICENSE)

Disclaimer: _This is not an officially supported Google product._
