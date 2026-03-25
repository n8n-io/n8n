# web-resource-inliner [![build status](https://api.travis-ci.org/jrit/web-resource-inliner.svg)](http://travis-ci.org/jrit/web-resource-inliner)

Brings externally referenced resources, such as js, css and images, into a single file.

For example:

```html
<link href="css/style.css" rel="stylesheet" data-inline >
```
is replaced with
```html
<style>
/* contents of css/style.css */
</style>
```

Javascript references are brought inline, and images in the html and css blocks are converted to base-64 data: urls.

By default, all links and scripts are inlined, plus any images under 8KB, however this behavior can be overrided via several options.


## Getting Started
```
npm install web-resource-inliner
```


## Usage Examples

For a number of usage examples, see ./test/spec.js and the associated test.* and test_out.* files in ./test/cases/

## Methods

#### html( options, callback )
Expects options.fileContent to be HTML and creates a new HTML document. `callback` will be called on completion or error with arguments `( error, result )`.

#### css( options, callback )
Expects options.fileContent to be CSS and creates a new CSS document. `callback` will be called on completion or error with arguments `( error, result )`.


## Options

#### `fileContent`, required
This is the HTML or CSS content to be inlined, you should provide HTML to the `html()` method and CSS to the `css()` method or you will get errors or garbage output.

#### `inlineAttribute`, string, default `data-inline`
Sets the attribute that is used to include/exclude specific resources based on the default behavior for the resource type. For example, if `scripts` is set to `false`, an individual script can be inlined by adding the attribute to the `script` tag like `<script src="myscript.js" data-inline ></script>`. On the other hand, if `images` are set to be inlined by default, a specific image can be excluded by adding `-ignore` to the end of the `inlineAttribute` like `<img src="myimg.png" data-inline-ignore >`. In CSS, a comment is required at the end of the line to perform the same thing, such as `/*data-inline*/` or `/*data-inline-ignore*/`.

#### `images`, Boolean or Number, default `8`
When true, inline images unless they have an exclusion attribute (see inlineAttribute option). When false, exclude images unless they have an inclusion attribute (see inlineAttribute option). When a number, inline images only when the base64 content size is less than the number of KBs. For example, the default is to only inline images less than 8KB.

#### `svgs`, Boolean or Number, default `8`
When true, inline SVG `<use>` unless they have an exclusion attribute (see inlineAttribute option). When false, exclude SVG `<use>` unless they have an inclusion attribute (see inlineAttribute option). When a number, inline SVG `<use>` only when the content size is less than the number of KBs. For example, the default is to only inline SVGs less than 8KB.

#### `scripts`, Boolean or Number, default `true`
When true, inline scripts unless they have an exclusion attribute (see inlineAttribute option). When false, exclude scripts unless they have an inclusion attribute (see inlineAttribute option). When a number, inline scripts only when the base64 content size is less than the number of KBs.

#### `links`, Boolean or Number, default `true`
When true, inline stylesheet links unless they have an exclusion attribute (see inlineAttribute option). When false, exclude stylesheet links unless they have an inclusion attribute (see inlineAttribute option). When a number, inline stylesheet links only when the base64 content size is less than the number of KBs.

#### `relativeTo`, string, default empty string
Describes the path relationship between where web-resource-inliner is running and what the relative paths in `fileContent` or href/src urls refer to. For example, the tests cases in this package are in `test/cases/` so their relative paths start by referring to that folder, but the root of this project and where `npm test` runs from is 2 folders up, so `relativeTo` is set to `test/cases/` in `test/spec.js`. Likewise, with `href="content.css"` and a `relativeTo` of `http://github.com/` the resource retrieved would be `http://github.com/content.css`.

#### `rebaseRelativeTo`, string, default empty string
Describes the path relationship between CSS content and the context it will be loaded in. For example, when a CSS file contains `url(some-file.png)` and the file is moved from a location in a folder like `/css` to `/` then the path to the image needs to be changed to `url(css/some-file.png)`. In this case, `rebaseRelativeTo` would be `css`. You probably don't want to set this when you are using `html()`.

#### `strict`, Boolean, default `false`
When strict is `true`, a missing resource will cause the inliner to halt and return an error in the callback. The default behavior is to log a warning to the console and continue inlining with the available resources, which is more similar to how a web page behaves.

#### `requestResource`, Function, default `undefined`
Allows to adjust issued requests. E.g., add authentication tokens to requested URLs. The function is called with `{ uri, encoding, gzip }` object as its parameter. It can replace builtin [node-fetch](https://github.com/node-fetch/node-fetch) with your own solution.

#### `scriptTransform`, Function( content, callback ), default `undefined`
Allows to make changes to scripts before they are inlined, such as minifying. Callback is standard node error first, second argument is transformed value.

#### `linkTransform`, Function( content, callback ), default `undefined`
Allows to make changes to links before they are inlined, such as CSS pre-and-post-processors. Callback is standard node error first, second argument is transformed value.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Run tests with `npm test`.
