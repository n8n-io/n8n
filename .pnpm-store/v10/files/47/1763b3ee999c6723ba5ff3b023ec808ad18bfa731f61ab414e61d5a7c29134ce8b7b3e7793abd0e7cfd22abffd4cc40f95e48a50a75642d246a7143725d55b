<div align="center">
  <img src="./logo/logo-web.svg" width="348.61" height="100" alt=""/>
</div>

# SVGO [![npm](https://img.shields.io/npm/v/svgo)](https://npmjs.org/package/svgo) [![chat](https://img.shields.io/discord/815166721315831868)](https://discord.gg/z8jX8NYxrE) [![docs](https://img.shields.io/badge/docs-svgo.dev-blue)](https://svgo.dev/)

SVGO, short for **SVG O**ptimizer, is a Node.js library and command-line application for optimizing SVG files.

## Why?

SVG files, especially those exported from vector editors, usually contain a lot of redundant information. This includes editor metadata, comments, hidden elements, default or suboptimal values, and other stuff that can be safely removed or converted without impacting rendering.

## Installation

You can install SVGO globally through npm, yarn, or pnpm. Alternatively, drop the global flag (`global`/`-g`) to use it in your Node.js project.

```sh
# npm
npm install -g svgo

# yarn
yarn global add svgo

# pnpm
pnpm add -g svgo
```

## Command-line usage

Process single files:

```sh
svgo one.svg two.svg -o one.min.svg two.min.svg
```

Process a directory of files recursively with `-f`/`--folder`:

```sh
svgo -f path/to/directory_with_svgs -o path/to/output_directory
```

Help for advanced usage:

```sh
svgo --help
```

## Configuration

SVGO has a plugin architecture. You can read more about all plugins in [Plugins | SVGO Documentation](https://svgo.dev/docs/plugins/), and the default plugins in [Preset Default | SVGO Documentation](https://svgo.dev/docs/preset-default/).

SVGO reads the configuration from `svgo.config.js` or the `--config path/to/config.js` command-line option. Some other parameters can be configured though command-line options too.

**`svgo.config.js`**

```js
module.exports = {
  multipass: false, // boolean
  datauri: 'base64', // 'base64'|'enc'|'unenc'
  js2svg: {
    indent: 4, // number
    pretty: false, // boolean
  },
  plugins: [
    'preset-default', // built-in plugins enabled by default
    'prefixIds', // enable built-in plugins by name

    // enable built-in plugins with an object to configure plugins
    {
      name: 'prefixIds',
      params: {
        prefix: 'uwu',
      },
    },
  ],
};
```

### Default preset

Instead of configuring SVGO from scratch, you can tweak the default preset to suit your needs by configuring or disabling the respective plugin.

**`svgo.config.js`**

```js
module.exports = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // disable a default plugin
          removeViewBox: false,

          // customize the params of a default plugin
          inlineStyles: {
            onlyMatchedOnce: false,
          },
        },
      },
    },
  ],
};
```

You can find a list of the default plugins in the order they run in [Preset Default | SVGO Documentation](https://svgo.dev/docs/preset-default/#plugins-list).

### Custom plugins

You can also specify custom plugins:

**`svgo.config.js`**

```js
const importedPlugin = require('./imported-plugin');

module.exports = {
  plugins: [
    // plugin imported from another JavaScript file
    importedPlugin,

    // plugin defined inline
    {
      name: 'customPlugin',
      params: {
        paramName: 'paramValue',
      },
      fn: (ast, params, info) => {},
    },
  ],
};
```

## API usage

SVGO provides a few low level utilities.

### optimize

The core of SVGO is `optimize` function.

```js
const { optimize } = require('svgo');

const result = optimize(svgString, {
  path: 'path-to.svg', // recommended
  multipass: true, // all other config fields are available here
});

const optimizedSvgString = result.data;
```

### loadConfig

If you write a tool on top of SVGO you may want to resolve the `svgo.config.js` file.

```js
const { loadConfig } = require('svgo');

const config = await loadConfig();
```

You can also specify a path and customize the current working directory.

```js
const config = await loadConfig(configFile, cwd);
```

## Other ways to use SVGO

| Method                    | Reference                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Web app                   | [SVGOMG](https://jakearchibald.github.io/svgomg/)                                                                       |
| Grunt task                | [grunt-svgmin](https://github.com/sindresorhus/grunt-svgmin)                                                            |
| Gulp task                 | [gulp-svgmin](https://github.com/ben-eb/gulp-svgmin)                                                                    |
| Webpack loader            | [image-minimizer-webpack-plugin](https://github.com/webpack-contrib/image-minimizer-webpack-plugin/#optimize-with-svgo) |
| PostCSS plugin            | [postcss-svgo](https://github.com/cssnano/cssnano/tree/master/packages/postcss-svgo)                                    |
| Inkscape plugin           | [inkscape-svgo](https://github.com/konsumer/inkscape-svgo)                                                              |
| Sketch plugin             | [svgo-compressor](https://github.com/BohemianCoding/svgo-compressor)                                                    |
| Rollup plugin             | [rollup-plugin-svgo](https://github.com/porsager/rollup-plugin-svgo)                                                    |
| Visual Studio Code plugin | [vscode-svgo](https://github.com/1000ch/vscode-svgo)                                                                    |
| Atom plugin               | [atom-svgo](https://github.com/1000ch/atom-svgo)                                                                        |
| Sublime plugin            | [Sublime-svgo](https://github.com/1000ch/Sublime-svgo)                                                                  |
| Figma plugin              | [Advanced SVG Export](https://www.figma.com/c/plugin/782713260363070260/Advanced-SVG-Export)                            |
| Linux app                 | [Oh My SVG](https://github.com/sonnyp/OhMySVG)                                                                          |
| Browser extension         | [SVG Gobbler](https://github.com/rossmoody/svg-gobbler)                                                                 |
| API                       | [Vector Express](https://github.com/smidyo/vectorexpress-api#convertor-svgo)                                            |

## Donors

| [<img src="https://sheetjs.com/sketch128.png" width="80">](https://sheetjs.com/) | [<img src="https://raw.githubusercontent.com/fontello/fontello/8.0.0/fontello-image.svg" width="80">](https://fontello.com/) |
| :------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------: |
|                       [SheetJS LLC](https://sheetjs.com/)                        |                                              [Fontello](https://fontello.com/)                                               |

## License and Copyright

This software is released under the terms of the [MIT license](https://github.com/svg/svgo/blob/main/LICENSE).

Logo by [André Castillo](https://github.com/DerianAndre).
