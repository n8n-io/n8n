

<div align="center">
  <img width="100" height="100" title="Load Options" src="http://michael-ciniawsky.github.io/postcss-load-options/logo.svg">
  <a href="https://github.com/postcss/postcss">
    <img width="110" height="110" title="PostCSS"           src="http://postcss.github.io/postcss/logo.svg" hspace="10">
  </a>
  <img width="100" height="100" title="Load Plugins" src="http://michael-ciniawsky.github.io/postcss-load-plugins/logo.svg">
  <h1>Load Config</h1>
</div>

<h2 align="center">Install</h2>

```bash
npm i -D postcss-load-config
```

<h2 align="center">Usage</h2>

```bash
npm i -S|-D postcss-plugin
```

Install all required PostCSS plugins and save them to your **package.json** `dependencies`/`devDependencies`

Then create a PostCSS config file by choosing one of the following formats

### `package.json`

Create a **`postcss`** section in your project's **`package.json`**

```
Project (Root)
  |– client
  |– public
  |
  |- package.json
```

```json
{
  "postcss": {
    "parser": "sugarss",
    "map": false,
    "plugins": {
      "postcss-plugin": {}
    }
  }
}
```

### `.postcssrc`

Create a **`.postcssrc`** file in JSON or YAML format

> ℹ️ It's recommended to use an extension (e.g **`.postcssrc.json`** or **`.postcssrc.yml`**) instead of `.postcssrc`

```
Project (Root)
  |– client
  |– public
  |
  |- (.postcssrc|.postcssrc.json|.postcssrc.yml)
  |- package.json
```

**`.postcssrc.json`**
```json
{
  "parser": "sugarss",
  "map": false,
  "plugins": {
    "postcss-plugin": {}
  }
}
```

**`.postcssrc.yml`**
```yaml
parser: sugarss
map: false
plugins:
  postcss-plugin: {}
```

> [!NOTE]
> For YAML configs, you must have [yaml](https://www.npmjs.com/package/yaml) installed as a peer dependency.

### `.postcssrc.js` or `postcss.config.js`

You may need some logic within your config.
In this case create JS/TS file named:
- `.postcssrc.js`
- `.postcssrc.mjs`
- `.postcssrc.cjs`
- `.postcssrc.ts`
- `.postcssrc.mts`
- `.postcssrc.cts`
- `postcss.config.js`
- `postcss.config.mjs`
- `postcss.config.cjs`
- `postcss.config.ts`
- `postcss.config.mts`
- `postcss.config.cts`

> [!NOTE]
> For TypeScript configs, you must have [tsx](https://www.npmjs.com/package/tsx) or [jiti](https://www.npmjs.com/package/jiti) installed as a peer dependency.

```
Project (Root)
  |– client
  |– public
  |- (.postcssrc|postcss.config).(js|mjs|cjs|ts|mts|cts)
  |- package.json
```

You can export the config as an `{Object}`

**.postcssrc.js**
```js
module.exports = {
  parser: 'sugarss',
  map: false,
  plugins: {
    'postcss-plugin': {}
  }
}
```

Or export a `{Function}` that returns the config (more about the `ctx` param below)

**.postcssrc.js**
```js
module.exports = (ctx) => ({
  parser: ctx.parser ? 'sugarss' : false,
  map: ctx.env === 'development' ? ctx.map : false,
  plugins: {
    'postcss-plugin': ctx.options.plugin
  }
})
```

Plugins can be loaded either using an `{Object}` or an `{Array}`

#### `{Object}`

**.postcssrc.js**
```js
module.exports = ({ env }) => ({
  ...options,
  plugins: {
    'postcss-plugin': env === 'production' ? {} : false
  }
})
```

> ℹ️ When using an `{Object}`, the key can be a Node.js module name, a path to a JavaScript file that is relative to the directory of the PostCSS config file, or an absolute path to a JavaScript file.

#### `{Array}`

**.postcssrc.js**
```js
module.exports = ({ env }) => ({
  ...options,
  plugins: [
    env === 'production' ? require('postcss-plugin')() : false
  ]
})
```
> :warning: When using an `{Array}`, make sure to `require()` each plugin

<h2 align="center">Options</h2>

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|[**`to`**](#to)|`{String}`|`undefined`|Destination File Path|
|[**`map`**](#map)|`{String\|Object}`|`false`|Enable/Disable Source Maps|
|[**`from`**](#from)|`{String}`|`undefined`|Source File Path|
|[**`parser`**](#parser)|`{String\|Function}`|`false`|Custom PostCSS Parser|
|[**`syntax`**](#syntax)|`{String\|Function}`|`false`|Custom PostCSS Syntax|
|[**`stringifier`**](#stringifier)|`{String\|Function}`|`false`|Custom PostCSS Stringifier|

### `parser`

**.postcssrc.js**
```js
module.exports = {
  parser: 'sugarss'
}
```

### `syntax`

**.postcssrc.js**
```js
module.exports = {
  syntax: 'postcss-scss'
}
```

### `stringifier`

**.postcssrc.js**
```js
module.exports = {
  stringifier: 'midas'
}
```

### [**`map`**](https://github.com/postcss/postcss/blob/master/docs/source-maps.md)

**.postcssrc.js**
```js
module.exports = {
  map: 'inline'
}
```

> :warning: In most cases `options.from` && `options.to` are set by the third-party which integrates this package (CLI, gulp, webpack). It's unlikely one needs to set/use `options.from` && `options.to` within a config file. Unless you're a third-party plugin author using this module and its Node API directly **dont't set `options.from` && `options.to` yourself**

### `to`

```js
module.exports = {
  to: 'path/to/dest.css'
}
```

### `from`

```js
module.exports = {
  from: 'path/to/src.css'
}
```

<h2 align="center">Plugins</h2>

### `{} || null`

The plugin will be loaded with defaults

```js
'postcss-plugin': {} || null
```

**.postcssrc.js**
```js
module.exports = {
  plugins: {
    'postcss-plugin': {} || null
  }
}
```

> :warning: `{}` must be an **empty** `{Object}` literal

### `{Object}`

The plugin will be loaded with given options

```js
'postcss-plugin': { option: '', option: '' }
```

**.postcssrc.js**
```js
module.exports = {
  plugins: {
    'postcss-plugin': { option: '', option: '' }
  }
}
```

### `false`

The plugin will not be loaded

```js
'postcss-plugin': false
```

**.postcssrc.js**
```js
module.exports = {
  plugins: {
    'postcss-plugin': false
  }
}
```

### `Ordering`

Plugin **execution order** is determined by declaration in the plugins section (**top-down**)

```js
{
  plugins: {
    'postcss-plugin': {}, // [0]
    'postcss-plugin': {}, // [1]
    'postcss-plugin': {}  // [2]
  }
}
```

<h2 align="center">Context</h2>

When using a `{Function}` (`postcss.config.js` or `.postcssrc.js`), it's possible to pass context to `postcss-load-config`, which will be evaluated while loading your config. By default `ctx.env (process.env.NODE_ENV)` and `ctx.cwd (process.cwd())` are available on the `ctx` `{Object}`

> ℹ️ Most third-party integrations add additional properties to the `ctx` (e.g `postcss-loader`). Check the specific module's README for more information about what is available on the respective `ctx`

<h2 align="center">Examples</h2>

**postcss.config.js**

```js
module.exports = (ctx) => ({
  parser: ctx.parser ? 'sugarss' : false,
  map: ctx.env === 'development' ? ctx.map : false,
  plugins: {
    'postcss-import': {},
    'postcss-nested': {},
    cssnano: ctx.env === 'production' ? {} : false
  }
})
```

<div align="center">
  <img width="80" height="80" src="https://worldvectorlogo.com/logos/nodejs-icon.svg">
</div>

```json
"scripts": {
  "build": "NODE_ENV=production node postcss",
  "start": "NODE_ENV=development node postcss"
}
```

```js
const { readFileSync } = require('fs')

const postcss = require('postcss')
const postcssrc = require('postcss-load-config')

const css = readFileSync('index.css', 'utf8')

const ctx = { parser: true, map: 'inline' }

postcssrc(ctx).then(({ plugins, options }) => {
  postcss(plugins)
    .process(css, options)
    .then((result) => console.log(result.css))
})
```

<div align="center">
  <img width="80" height="80" halign="10" src="https://worldvectorlogo.com/logos/gulp.svg">
</div>

```json
"scripts": {
  "build": "NODE_ENV=production gulp",
  "start": "NODE_ENV=development gulp"
}
```

```js
const { task, src, dest, series, watch } = require('gulp')

const postcss = require('gulp-postcssrc')

const css = () => {
  src('src/*.css')
    .pipe(postcss())
    .pipe(dest('dest'))
})

task('watch', () => {
  watch(['src/*.css', 'postcss.config.js'], css)
})

task('default', series(css, 'watch'))
```

<div align="center">
  <img width="80" height="80" src="https://cdn.rawgit.com/webpack/media/e7485eb2/logo/icon.svg">
</div>

```json
"scripts": {
  "build": "NODE_ENV=production webpack",
  "start": "NODE_ENV=development webpack-dev-server"
}
```

**webpack.config.js**
```js
module.exports = (env) => ({
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  }
})
```

<h2 align="center">Maintainers</h2>

<table>
  <tbody>
   <tr>
    <td align="center">
      <img width="150" height="150"
        src="https://github.com/michael-ciniawsky.png?v=3&s=150">
      <br />
      <a href="https://github.com/michael-ciniawsky">Michael Ciniawsky</a>
    </td>
    <td align="center">
      <img width="150" height="150"
        src="https://github.com/ertrzyiks.png?v=3&s=150">
      <br />
      <a href="https://github.com/ertrzyiks">Mateusz Derks</a>
    </td>
  </tr>
  <tbody>
</table>

<h2 align="center">Contributors</h2>

<table>
  <tbody>
   <tr>
    <td align="center">
      <img width="150" height="150"
        src="https://github.com/sparty02.png?v=3&s=150">
      <br />
      <a href="https://github.com/sparty02">Ryan Dunckel</a>
    </td>
    <td align="center">
      <img width="150" height="150"
        src="https://github.com/pcgilday.png?v=3&s=150">
      <br />
      <a href="https://github.com/pcgilday">Patrick Gilday</a>
    </td>
    <td align="center">
      <img width="150" height="150"
        src="https://github.com/daltones.png?v=3&s=150">
      <br />
      <a href="https://github.com/daltones">Dalton Santos</a>
    </td>
    <td align="center">
      <img width="150" height="150"
        src="https://github.com/fwouts.png?v=3&s=150">
      <br />
      <a href="https://github.com/fwouts">François Wouts</a>
    </td>
  </tr>
  <tbody>
</table


## Security Contact

To report a security vulnerability, please use the [Tidelift security contact].
Tidelift will coordinate the fix and disclosure.

[Tidelift security contact]: https://tidelift.com/security
