# browserslist-to-esbuild

> Use [browserslist](https://github.com/browserslist/browserslist) with [esbuild](https://esbuild.github.io/).

Allows you to use use browserslist and pass the correct browsers to esbuild's [target](https://esbuild.github.io/api/#target) option.

## Install

You have to install the `browserslist` package as well in your project:

```
npm install --save-dev browserslist browserslist-to-esbuild
```

or

```
yarn add --dev browserslist browserslist-to-esbuild
```

## Usage

You can call `browserslistToEsbuild()` directly in your `esbuild.mjs` script, it will look for your browserslist config in either `package.json` or the `.browserslistrc`.

It will return an esbuild-compatible array of browsers.

```js
import { build } from 'esbuild'
import browserslistToEsbuild from 'browserslist-to-esbuild'

await build({
  entryPoints: ['input.js'],
  outfile: 'output.js',
  bundle: true,
  target: browserslistToEsbuild(), // --> ["chrome79", "edge92", "firefox91", "safari13.1"]
})
```

Otherwise, you can pass yourself a browserslist array or string to the function.

```js
browserslistToEsbuild(['>0.2%', 'not dead', 'not op_mini all'])
```

## API

### browserslistToEsbuild(browserslistConfig?, options?)

#### browserslistConfig

Type: `array | string | undefined`

An array of string of browsers [compatible with browserslist](https://github.com/browserslist/browserslist#full-list). If none is passed, a browserslist config is searched in the script running directory.

#### options

Type: `object | undefined`

An object containing the options that will be forwarded to browserslist. You can check out the [browserslist options documentation](https://github.com/browserslist/browserslist?tab=readme-ov-file#js-api) to see all the options available.

## CLI

You can also use this package on the cli to test out the command in your project.
If no argument is passed, the browserslist config is searched in the script running directory.

Here is some example usage:

```bash
$ npx browserslist-to-esbuild
chrome109 edge118 firefox115 ios15.6 opera102 safari15.6

$ npx browserslist-to-esbuild '>0.2%, not dead'
chrome103 edge87 firefox115 ios12.2 opera102 safari14.1

$ npx browserslist-to-esbuild '>0.2%' 'not dead'
chrome103 edge87 firefox115 ios12.2 opera102 safari14.1
```
