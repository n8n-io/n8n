# Colorette

> Easily set the text color and style in the terminal.

- No wonky prototype method-chain API.
- Automatic color support detection.
- Up to [2x faster](#benchmarks) than alternatives.
- [`NO_COLOR`](https://no-color.org) friendly. 👌

Here's the first example to get you started.

```js
import { blue, bold, underline } from "colorette"

console.log(
  blue("I'm blue"),
  bold(blue("da ba dee")),
  underline(bold(blue("da ba daa")))
)
```

Here's an example using [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals).

```js
console.log(`
  There's a ${underline(blue("house"))},
  With a ${bold(blue("window"))},
  And a ${blue("corvette")}
  And everything is blue
`)
```

Of course, you can nest styles without breaking existing color sequences.

```js
console.log(bold(`I'm ${blue(`da ba ${underline("dee")} da ba`)} daa`))
```

Feeling adventurous? Try the [pipeline operator](https://github.com/tc39/proposal-pipeline-operator).

```js
console.log("Da ba dee da ba daa" |> blue |> bold)
```

## Installation

```console
npm install colorette
```

## API

### `<style>(string)`

See [supported styles](#supported-styles).

```js
import { blue } from "colorette"

blue("I'm blue") //=> \x1b[34mI'm blue\x1b[39m
```

### `options.enabled`

Colorette automatically detects if your terminal can display color, but you can toggle color as needed.

```js
import { options } from "colorette"

options.enabled = false
```

You can also force the use of color globally by setting `FORCE_COLOR=` or `NO_COLOR=` from the CLI.

```console
$ FORCE_COLOR= node example.js >log
$ NO_COLOR= node example.js
```

## Supported styles

| Colors  | Background Colors | Bright Colors | Bright Background Colors | Modifiers         |
| ------- | ----------------- | ------------- | ------------------------ | ----------------- |
| black   | bgBlack           | blackBright   | bgBlackBright            | dim               |
| red     | bgRed             | redBright     | bgRedBright              | **bold**          |
| green   | bgGreen           | greenBright   | bgGreenBright            | hidden            |
| yellow  | bgYellow          | yellowBright  | bgYellowBright           | _italic_          |
| blue    | bgBlue            | blueBright    | bgBlueBright             | <u>underline</u>  |
| magenta | bgMagenta         | magentaBright | bgMagentaBright          | ~~strikethrough~~ |
| cyan    | bgCyan            | cyanBright    | bgCyanBright             | reset             |
| white   | bgWhite           | whiteBright   | bgWhiteBright            |                   |
| gray    |                   |               |                          |                   |

## Benchmarks

```console
npm --prefix bench start
```

## License

[MIT](LICENSE.md)
