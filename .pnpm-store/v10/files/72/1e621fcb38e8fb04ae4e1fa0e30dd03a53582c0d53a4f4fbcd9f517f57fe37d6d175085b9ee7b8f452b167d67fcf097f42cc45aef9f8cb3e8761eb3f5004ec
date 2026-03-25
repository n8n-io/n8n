# postcss-import

[![Build](https://img.shields.io/travis/postcss/postcss-import/master)](https://travis-ci.org/postcss/postcss-import)
[![Version](https://img.shields.io/npm/v/postcss-import)](https://github.com/postcss/postcss-import/blob/master/CHANGELOG.md)
[![postcss compatibility](https://img.shields.io/npm/dependency-version/postcss-import/peer/postcss)](https://postcss.org/)

> [PostCSS](https://github.com/postcss/postcss) plugin to transform `@import`
rules by inlining content.

This plugin can consume local files, node modules or web_modules.
To resolve path of an `@import` rule, it can look into root directory
(by default `process.cwd()`), `web_modules`, `node_modules`
or local modules.
_When importing a module, it will look for `index.css` or file referenced in
`package.json` in the `style` or `main` fields._
You can also provide manually multiples paths where to look at.

**Notes:**

- **This plugin should probably be used as the first plugin of your list.
This way, other plugins will work on the AST as if there were only a single file
to process, and will probably work as you can expect**.
- This plugin works great with
[postcss-url](https://github.com/postcss/postcss-url) plugin,
which will allow you to adjust assets `url()` (or even inline them) after
inlining imported files.
- In order to optimize output, **this plugin will only import a file once** on
a given scope (root, media query...).
Tests are made from the path & the content of imported files (using a hash
table).
If this behavior is not what you want, look at `skipDuplicates` option
- If you are looking for **Glob Imports**, you can use [postcss-import-ext-glob](https://github.com/dimitrinicolas/postcss-import-ext-glob) to extend postcss-import.
- Imports which are not modified (by `options.filter` or because they are remote
  imports) are moved to the top of the output.
- **This plugin attempts to follow the CSS `@import` spec**; `@import`
  statements must precede all other statements (besides `@charset`).

## Installation

```console
$ npm install -D postcss-import
```

## Usage

Unless your stylesheet is in the same place where you run postcss
(`process.cwd()`), you will need to use `from` option to make relative imports
work.

```js
// dependencies
const fs = require("fs")
const postcss = require("postcss")
const atImport = require("postcss-import")

// css to be processed
const css = fs.readFileSync("css/input.css", "utf8")

// process css
postcss()
  .use(atImport())
  .process(css, {
    // `from` option is needed here
    from: "css/input.css"
  })
  .then((result) => {
    const output = result.css

    console.log(output)
  })
```

`css/input.css`:

```css
/* can consume `node_modules`, `web_modules` or local modules */
@import "cssrecipes-defaults"; /* == @import "../node_modules/cssrecipes-defaults/index.css"; */
@import "normalize.css"; /* == @import "../node_modules/normalize.css/normalize.css"; */

@import "foo.css"; /* relative to css/ according to `from` option above */

@import "bar.css" (min-width: 25em);

@import 'baz.css' layer(baz-layer);

body {
  background: black;
}
```

will give you:

```css
/* ... content of ../node_modules/cssrecipes-defaults/index.css */
/* ... content of ../node_modules/normalize.css/normalize.css */

/* ... content of css/foo.css */

@media (min-width: 25em) {
/* ... content of css/bar.css */
}

@layer baz-layer {
/* ... content of css/baz.css */
}

body {
  background: black;
}
```

Checkout the [tests](test) for more examples.

### Options

### `filter`
Type: `Function`  
Default: `() => true`

Only transform imports for which the test function returns `true`. Imports for
which the test function returns `false` will be left as is. The function gets
the path to import as an argument and should return a boolean.

#### `root`

Type: `String`  
Default: `process.cwd()` or _dirname of
[the postcss `from`](https://github.com/postcss/postcss#node-source)_

Define the root where to resolve path (eg: place where `node_modules` are).
Should not be used that much.  
_Note: nested `@import` will additionally benefit of the relative dirname of
imported files._

#### `path`

Type: `String|Array`  
Default: `[]`

A string or an array of paths in where to look for files.

#### `plugins`

Type: `Array`  
Default: `undefined`

An array of plugins to be applied on each imported files.

#### `resolve`

Type: `Function`  
Default: `null`

You can provide a custom path resolver with this option. This function gets
`(id, basedir, importOptions)` arguments and should return a path, an array of
paths or a promise resolving to the path(s). If you do not return an absolute
path, your path will be resolved to an absolute path using the default
resolver.
You can use [resolve](https://github.com/substack/node-resolve) for this.

#### `load`

Type: `Function`  
Default: null

You can overwrite the default loading way by setting this option.
This function gets `(filename, importOptions)` arguments and returns content or
promised content.

#### `skipDuplicates`

Type: `Boolean`  
Default: `true`

By default, similar files (based on the same content) are being skipped.
It's to optimize output and skip similar files like `normalize.css` for example.
If this behavior is not what you want, just set this option to `false` to
disable it.

#### `addModulesDirectories`

Type: `Array`  
Default: `[]`

An array of folder names to add to [Node's resolver](https://github.com/substack/node-resolve).
Values will be appended to the default resolve directories:
`["node_modules", "web_modules"]`.

This option is only for adding additional directories to default resolver. If
you provide your own resolver via the `resolve` configuration option above, then
this value will be ignored.

#### `nameLayer`

Type: `Function`
Default: `null`

You can provide a custom naming function for anonymous layers (`@import 'baz.css' layer;`).
This function gets `(index, rootFilename)` arguments and should return a unique string.

This option only influences imports without a layer name.
Without this option the plugin will warn on anonymous layers.

#### Example with some options

```js
const postcss = require("postcss")
const atImport = require("postcss-import")

postcss()
  .use(atImport({
    path: ["src/css"],
  }))
  .process(cssString)
  .then((result) => {
    const { css } = result
  })
```

## `dependency` Message Support

`postcss-import` adds a message to `result.messages` for each `@import`. Messages are in the following format:

```
{
  type: 'dependency',
  file: absoluteFilePath,
  parent: fileContainingTheImport
}
```

This is mainly for use by postcss runners that implement file watching.

---

## CONTRIBUTING

* ⇄ Pull requests and ★ Stars are always welcome.
* For bugs and feature requests, please create an issue.
* Pull requests must be accompanied by passing automated tests (`$ npm test`).

## [Changelog](CHANGELOG.md)

## [License](LICENSE)
