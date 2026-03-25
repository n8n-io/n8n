[![Build Status](https://travis-ci.org/Automattic/juice.svg?branch=master)](https://travis-ci.org/Automattic/juice)
[![Dependency Status](https://david-dm.org/Automattic/juice.svg)](https://david-dm.org/Automattic/juice)

# Juice ![](https://i.imgur.com/jN8Ht.gif)

Given HTML, juice will inline your CSS properties into the `style` attribute.

[Some projects using Juice](PROJECTS.md)

## How to use

Juice has a number of functions based on whether you want to process a file, HTML string, or a cheerio document, and whether you want juice to automatically get remote stylesheets, scripts and image dataURIs to inline.

To inline HTML without getting remote resources, using default options:

```js
var juice = require('juice');
var result = juice("<style>div{color:red;}</style><div/>");
```

result will be:
```html
<div style="color: red;"></div>
```

[Try out the web client version](https://automattic.github.io/juice/)

## What is this useful for ?

- HTML emails. For a comprehensive list of supported selectors see [here](https://www.campaignmonitor.com/css/)
- Embedding HTML in 3rd-party websites.

## Documentation

Juice is exposed as a standard module, and from CLI with a smaller set of options.

### Options

All juice methods take an options object that can contain any of these properties, though not every method uses all of these:

* `applyAttributesTableElements` - whether to create attributes for styles in `juice.styleToAttribute` on elements set in `juice.tableElements`. Defaults to `true`.

* `applyHeightAttributes` - whether to use any CSS pixel heights to create `height` attributes on elements set in `juice.heightElements`. Defaults to `true`.

* `applyStyleTags` - whether to inline styles in `<style></style>` Defaults to `true`.

* `applyWidthAttributes` - whether to use any CSS pixel widths to create `width` attributes on elements set in `juice.widthElements`. Defaults to `true`.

* `extraCss` - extra css to apply to the file. Defaults to `""`.

* `insertPreservedExtraCss` - whether to insert into the document any preserved `@media` or `@font-face` content from `extraCss` when using `preserveMediaQueries`, `preserveFontFaces` or `preserveKeyFrames`. When `true` order of preference to append the `<style>` element is into `head`, then `body`, then at the end of the document. When a `string` the value is treated as a CSS/jQuery/cheerio selector, and when found, the `<style>` tag will be appended to the end of the first match. Defaults to `true`.

* `inlinePseudoElements` - Whether to insert pseudo elements (`::before` and `::after`) as `<span>` into the DOM. *Note*: Inserting pseudo elements will modify the DOM and may conflict with CSS selectors elsewhere on the page (e.g., `:last-child`).

* `preserveFontFaces` - preserves all `@font-face` within `<style></style>` tags as a refinement when `removeStyleTags` is `true`. Other styles are removed. Defaults to `true`.

* `preserveImportant` - preserves `!important` in values. Defaults to `false`.

* `preserveMediaQueries` - preserves all media queries (and contained styles) within `<style></style>` tags as a refinement when `removeStyleTags` is `true`. Other styles are removed. Defaults to `true`.

* `preserveKeyFrames` - preserves all key frames within `<style></style>` tags as a refinement when `removeStyleTags` is `true`. Other styles are removed. Defaults to `true`.

* `preservePseudos` - preserves all rules containing pseudo selectors defined in `ignoredPseudos` within `<style></style>` tags as a refinement when `removeStyleTags` is `true`. Other styles are removed. Defaults to `true`.

* `removeStyleTags` - whether to remove the original `<style></style>` tags after (possibly) inlining the css from them. Defaults to `true`.

* `resolveCSSVariables` - whether to resolve CSS variables. Defaults to `true`.

* `webResources` - An options object that will be passed to [web-resource-inliner](https://www.npmjs.com/package/web-resource-inliner) for juice functions that will get remote resources (`juiceResources` and `juiceFile`). Defaults to `{}`.

* `xmlMode` - whether to output XML/XHTML with all tags closed. Note that the input *must* also be valid XML/XHTML or you will get undesirable results. Defaults to `false`.


### Methods

#### juice(html [, options])

Returns string containing inlined HTML. Does not fetch remote resources.

 * `html` - html string, accepts complete documents as well as fragments
 * `options` - optional, see Options above

#### juice.juiceResources(html, options, callback)

Callback returns string containing inlined HTML. Fetches remote resources.

 * `html` - html string
 * `options` - see Options above
 * `callback(err, html)`
   - `err` - `Error` object or `null`
   - `html` - inlined HTML

#### juice.juiceFile(filePath, options, callback)

Callback returns string containing inlined HTML. Fetches remote resources.

 * `filePath` - path to the html file to be juiced
 * `options` - see Options above
 * `callback(err, html)`
   - `err` - `Error` object or `null`
   - `html` - inlined HTML

#### juice.juiceDocument($ [, options])

This takes a cheerio instance and performs inlining in-place.  Returns the
same cheerio instance.  Does not fetch remote resources.

 * `$` - a cheerio instance, be sure to use the same cheerio version that juice uses
 * `options` - optional, see Options above`

#### juice.inlineContent(html, css [, options])

This takes html and css and returns new html with the provided css inlined.
It does not look at `<style>` or `<link rel="stylesheet">` elements at all.

 * `html` - html string
 * `css` - css string
 * `options` - optional, see Options above

#### juice.inlineDocument($, css [, options])

Given a cheerio instance and css, this modifies the cheerio instance so that the provided css is inlined. It does not look at `<style>` or `<link rel="stylesheet">` elements at all.

 * `$` - a cheerio instance, be sure to use the same cheerio version that juice uses
 * `css` - css string
 * `options` - optional, see Options above

### Global settings

#### juice.codeBlocks

An object where each value has a `start` and `end` to specify fenced code blocks that should be ignored during parsing and inlining. For example, Handlebars (hbs) templates are `juice.codeBlocks.HBS = {start: '{{', end: '}}'}`. `codeBlocks` can fix problems where otherwise juice might interpret code like `<=` as HTML, when it is meant to be template language code. Note that `codeBlocks` is a dictionary which can contain many different code blocks, so don't do `juice.codeBlocks = {...}` do `juice.codeBlocks.myBlock = {...}`

#### juice.ignoredPseudos

Array of ignored pseudo-selectors such as 'hover' and 'active'.

#### juice.widthElements

Array of HTML elements that can receive `width` attributes.

#### juice.heightElements

Array of HTML elements that can receive `height` attributes.

#### juice.styleToAttribute

Object of style property names (key) to their respective attribute names (value).

#### juice.tableElements

Array of table HTML elements that can receive attributes defined in `juice.styleToAttribute`.

#### juice.nonVisualElements

Array of elements that will not have styles inlined because they are not intended to render.

#### juiceClient.excludedProperties

Array of css properties that won't be inlined.

### Special markup

#### data-embed
When a `data-embed` attribute is present on a stylesheet `<link>` that has been inlined into the document as a `<style></style>` tag by the web-resource-inliner juice will not inline the styles and will not remove the `<style></style>` tags.

This can be used to embed email client support hacks that rely on css selectors into your email templates.

### CLI Options

To use Juice from CLI, run `juice [options] input.html output.html`

For a listing of all available options, just type `juice -h`.

> Note that if you want to just type `juice` from the command line, you should `npm install juice -g` so it is globally available.

CLI Options:

The CLI should have all the above [options](#options) with the names changed from camel case to hyphen-delimited, so for example `extraCss` becomes `extra-css` and `webResources.scripts` becomes `web-resources-scripts`.

These are additional options not included in the standard `juice` options listed above:

- `--css [filepath]` will load and inject CSS into `extraCss`.
- `--options-file [filepath]` will load and inject options from a JSON file. Options from the CLI will be given priority over options in the file when there is a conflict.
- `codeBlocks` is optionally supported in the options file if you include it. This will allow you to support different template languages in a build process.

### Running Juice in the Browser

Attempting to Browserify `require('juice')` fails because portions of Juice and its dependencies interact with the file system using the standard `require('fs')`. However, you can `require('juice/client')` via Browserify which has support for `juiceDocument`, `inlineDocument`, and `inlineContent`, but not `juiceFile`, `juiceResources`, or `inlineExternal`. *Note that automated tests are not running in the browser yet.*

## License

MIT Licensed, see License.md

### 3rd-party

- Uses [cheerio](https://github.com/cheeriojs/cheerio) for the underlying DOM
representation.
- Uses [mensch](https://github.com/brettstimmerman/mensch) to parse out CSS and
[Slick](https://github.com/subtleGradient/slick) to tokenize them.
- Icon by [UnheardSounds](http://unheardsounds.deviantart.com/gallery/26536908#/d2ngozi)
