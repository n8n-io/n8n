<p align="center">
  <a href="https://github.com/webdiscus/ansis">
    <img width="323" src="docs/img/ansis-logo.png" alt="ansis"><br>
    ANSI Styling
  </a>
</p>

---
[![node](https://img.shields.io/node/v/ansis)](https://nodejs.org)
[![Test](https://github.com/webdiscus/ansis/actions/workflows/test.yml/badge.svg)](https://github.com/webdiscus/ansis/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/webdiscus/ansis/branch/master/graph/badge.svg?token=H7SFJONX1X)](https://codecov.io/gh/webdiscus/ansis)
[![node](https://img.shields.io/npm/dm/ansis)](https://www.npmjs.com/package/ansis)

Colorize terminal with ANSI colors & styles, **smaller** and **faster** alternative to [Chalk](https://github.com/chalk/chalk).

#### Usage example

```js
import ansis, { red, green, black, ansi256, hex } from 'ansis';

ansis.cyan('path/to/file')
green('Succeful!')
red`Error!`
black.bgYellow`Warning!`
ansi256(214)`Orange`
hex('#E0115F').bold.underline('Hello TrueColor!')
```

🚀 [Install and Quick Start](https://github.com/webdiscus/ansis#install)\
📖 [Read full docs on GitHub](https://github.com/webdiscus/ansis)

## 🏆 Compare & Benchmark

See the [features comparison](https://github.com/webdiscus/ansis#compare) and [benchmarks](https://github.com/webdiscus/ansis#benchmark) of most popular terminal colors libraries:\
`ansis` `chalk` `kleur` `kolorist` `colors.js` `colorette` `picocolors` `ansi-colors` `cli-color` `colors-cli`.

## 💡 Highlights

![ANSI demo](docs/img/ansis-demo.png)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/edit/stackblitz-starters-gs2gve?file=index.js)

- Supports **ESM**, **CommonJS**, **TypeScript**, **Bun**, **Deno**, **Next.JS**
- [Standard API](https://github.com/webdiscus/ansis#base-colors) compatible with **Chalk**
- Default and [named import](https://github.com/webdiscus/ansis#named-import) `import ansis, { red, green, bold, underline } from 'ansis'`
- [Chained syntax](https://github.com/webdiscus/ansis#chained-syntax) `red.bold.underline('text')`
- [Nested **template strings**](https://github.com/webdiscus/ansis#nested-syntax) ``` red`RED text ${green`GREEN text`} RED text` ```
- [Base ANSI styles](https://github.com/webdiscus/ansis#base-colors) `dim` **`bold`** _`italic`_ <u>`underline`</u> <s>`strikethrough`</s>
- [Base ANSI 16 colors](https://github.com/webdiscus/ansis#base-colors) ``` red`Error!` ``` ``` redBright`Error!` ``` ``` bgRed`Error!` ``` ``` bgRedBright`Error!` ```
- [ANSI 256 colors](https://github.com/webdiscus/ansis#256-colors) ``` fg(56)`violet` ``` ``` bg(208)`orange` ```
- [TrueColor](https://github.com/webdiscus/ansis#truecolor) (**RGB**, **HEX**) ``` rgb(224, 17, 95)`Ruby` ```, ``` hex('#96C')`Amethyst` ```
- [Fallback](https://github.com/webdiscus/ansis#fallback) to supported color space: TrueColor → 256 colors → 16 colors → no colors
- [ANSI codes](https://github.com/webdiscus/ansis#escape-codes) as `open` and `close` properties ``` `Hello ${red.open}World${red.close}!` ```
- [Strip ANSI codes](https://github.com/webdiscus/ansis#strip) method `ansis.strip()`
- [Correct style break](https://github.com/webdiscus/ansis#new-line) at the `end of line` when used `\n` in string
- Detect [color support](https://github.com/webdiscus/ansis#color-support) using `ansis.isSupported()` method
- Supports [CLI](https://github.com/webdiscus/ansis#cli-vars) `NO_COLOR` `FORCE_COLOR` `--no-color` `--color`
- Doesn't extend `String.prototype`
- Zero dependencies

## License

[ISC](https://github.com/webdiscus/ansis/blob/master/LICENSE)
