# Changelog

## Version 9.0.5

* `htmlparser2` updated from 8.0.1 to 8.0.2 ([release notes](https://github.com/fb55/htmlparser2/releases)) - this fixes broken parsing in certain situations: [#285](https://github.com/html-to-text/node-html-to-text/issues/285);
* `deepmerge` updated from 4.3.0 to 4.3.1 - no functional changes;
* added a link to attribute selectors syntax to Readme.

All commits: [9.0.4...9.0.5](https://github.com/html-to-text/node-html-to-text/compare/9.0.4...9.0.5)

## Version 9.0.4

* fixed: `dataTable` formatter was missing some existing cells in incompletely defined tables: [#282](https://github.com/html-to-text/node-html-to-text/issues/282);
* updated readme a bit to clarify the usage: [#281](https://github.com/html-to-text/node-html-to-text/issues/281).

All commits: [9.0.3...9.0.4](https://github.com/html-to-text/node-html-to-text/compare/9.0.3...9.0.4)

## Version 9.0.3

* document the usage of metadata object;
* explicitly mention `dom-serializer` dependency: [#269](https://github.com/html-to-text/node-html-to-text/issues/269).

All commits: [9.0.2...9.0.3](https://github.com/html-to-text/node-html-to-text/compare/9.0.2...9.0.3)

## Version 9.0.2

* support multi-character code points in `encodeCharacters` option: [#267](https://github.com/html-to-text/node-html-to-text/issues/267).

All commits: [9.0.1...9.0.2](https://github.com/html-to-text/node-html-to-text/compare/9.0.1...9.0.2)

## Version 9.0.1

* fixed a broken link in readme: [#262](https://github.com/html-to-text/node-html-to-text/pull/262);
* test and documented the usage of existing formatters from custom formatters in readme: [#263](https://github.com/html-to-text/node-html-to-text/issues/263);
* fixed jsdoc comment for `BlockTextBuilder.closeTable`: [#264](https://github.com/html-to-text/node-html-to-text/issues/264);
* added missing entry in the 9.0.0 changelog below regarding `BlockTextBuilder.closeTable`.

All commits: [9.0.0...9.0.1](https://github.com/html-to-text/node-html-to-text/compare/9.0.0...9.0.1)

## Version 9.0.0

All commits: [8.2.1...9.0.0](https://github.com/html-to-text/node-html-to-text/compare/8.2.1...9.0.0)

Version 9 roadmap: [#240](https://github.com/html-to-text/node-html-to-text/issues/240)

Request for comments: [#261 \[RFC\] Naming issue](https://github.com/html-to-text/node-html-to-text/discussions/261) - please take a look and share opinions while you're here

### Node version

Required Node version is now >=14.

### CommonJS and ES Module

Package now provides `cjs` and `mjs` exports.

### CLI is no longer built in

If you use CLI then install [that package](https://github.com/html-to-text/node-html-to-text/tree/master/packages/html-to-text-cli/) instead.

The new package uses new arg parser [aspargvs](https://github.com/mxxii/aspargvs) instead of minimist in order to deal with the vast options space of `html-to-text`.

### Dependency updates

* `htmlparser2` updated from 6.1.0 to 8.0.1 ([Release notes](https://github.com/fb55/htmlparser2/releases));
* `he` dependency is removed. It was needed at the time it was introduced, apparently, but at this point `htmlparser2` seems to do a better job itself.

### Removed features

* Options deprecated in version 6 are now removed;
* `decodeOptions` section removed with `he` dependency;
* `fromString` method removed;
* deprecated positional arguments in `BlockTextBuilder` methods are now removed.

Refer to README for [migration instructions](https://github.com/html-to-text/node-html-to-text/tree/master/packages/html-to-text#deprecated-or-removed-options).

### New options

* `decodeEntities` - controls whether HTML entities found in the input HTML should be decoded or left as is in the output text;
* `encodeCharacters` - a dictionary with characters that should be replaced in the output text and corresponding escape sequences.

### New built-in formatters

New generic formatters `blockString`, `blockTag`, `blockHtml`, `inlineString`, `inlineSurround`, `inlineTag`, `inlineHtml` cover some common usage scenarios such as [#231](https://github.com/html-to-text/node-html-to-text/issues/231).

### Changes to existing built-in formatters

* `anchor` and `image` got `pathRewrite` option;
* `dataTable` formatter allows zero `colSpacing`.

### Improvements for writing custom formatters

* Some logic for making lists is moved to BlockTextBuilder and can be reused for custom lists (`openList`, `openListItem`, `closeListItem`, `closeList`). Addresses [#238](https://github.com/html-to-text/node-html-to-text/issues/238);
* `startNoWrap`, `stopNoWrap` - allows to keep local inline content in a single line regardless of wrapping options;
* `addLiteral` - it is like `addInline` but circumvents most of the text processing logic. This should be preferred when inserting markup elements;
* It is now possible to provide a metadata object along with the HTML string to convert. Metadata object is available for custom formatters via `builder.metadata`. This allows to compile the converter once and still being able to supply per-document data. Metadata object is supplied as the last optional argument to `convert` function and the function returned by `compile` function;
* Breaking change for those who dare to write their own table formatter (in case there is anyone) - `closeTable` function got a required property in the options object - `tableToString` function, and previously existed `colSpacing` and `rowSpacing` are removed (now a responsibility of the `tableToString` function).

### Other

* Fix deprecated `tags` option support. Addresses [#253](https://github.com/html-to-text/node-html-to-text/issues/253).


----

## Version 8.2.1

No changes in published package. Bumped dev dependencies and regenerated `package-lock.json`.

## Version 8.2.0

Fix for the issue [#249](https://github.com/html-to-text/node-html-to-text/issues/249) and possibly other obscure issues when some selector options are ignored. `options.selectors` array was not fully processed before.

## Version 8.1.1

Bump `minimist` dependency, regenerate `package-lock.json`.

## Version 8.1.0

* Fix for too many newlines in certain cases when `preserveNewlines` option is used. Addresses [#232](https://github.com/html-to-text/node-html-to-text/issues/232);
* Link and image formatters now have a `linkBrackets` option - it accepts an array of two strings (default: `['[', ']']`) or `false` to remove the brackets. Addresses [#236](https://github.com/html-to-text/node-html-to-text/issues/236);
* `noLinkBrackets` formatters option is now deprecated.

All commits: [8.0.0...8.1.0](https://github.com/html-to-text/node-html-to-text/compare/8.0.0...8.1.0)

## Version 8.0.0

All commits: [7.1.1...8.0.0](https://github.com/html-to-text/node-html-to-text/compare/7.1.1...8.0.0)

Version 8 roadmap issue: [#228](https://github.com/html-to-text/node-html-to-text/issues/228)

### Selectors

The main focus of this version. Addresses the most demanded user requests ([#159](https://github.com/html-to-text/node-html-to-text/issues/159), [#179](https://github.com/html-to-text/node-html-to-text/issues/179), partially [#143](https://github.com/html-to-text/node-html-to-text/issues/143)).

It is now possible to specify formatting options or assign custom formatters not only by tag names but by almost any selectors.

See the README [Selectors](https://github.com/html-to-text/node-html-to-text#selectors) section for details.

Note: The new `selectors` option is an array, in contrast to the `tags` option introduced in version 6 (and now deprecated). Selectors have to have a well defined order and object properties is not a right tool for that.

Two new packages were created to enable this feature - [parseley](https://github.com/mxxii/parseley) and [selderee](https://github.com/mxxii/selderee).

### Base elements

The same selectors implementation is used now to narrow down the conversion to specific HTML DOM fragments. Addresses [#96](https://github.com/html-to-text/node-html-to-text/issues/96). (Previous implementation had more limited selectors format.)

BREAKING CHANGE: All outermost elements matching provided selectors will be present in the output (previously it was only the first match for each selector). Addresses [#215](https://github.com/html-to-text/node-html-to-text/issues/215).

`limits.maxBaseElements` can be used when you only need a fixed number of base elements and would like to avoid checking the rest of the source HTML document.

Base elements can be arranged in output text in the order of matched selectors (default, to keep it closer to the old implementation) or in the order of appearance in source HTML document.

BREAKING CHANGE: previous implementation was treating id selectors in the same way as class selectors (could match `<foo id="a b">` with `foo#a` selector). New implementation is closer to the spec and doesn't expect multiple ids on an element. You can achieve the old behavior with `foo[id~=a]` selector in case you rely on it for some poorly formatted documents (note that it has different specificity though).

### Batch processing

Since options preprocessing is getting more involved with selectors compilation, it seemed reasonable to break the single `htmlToText()` function into compilation and convertation steps. It might provide some performance benefits in client code.

* new function `compile(options)` returns a function of a single argument (html string);
* `htmlToText(html, options)` is now an alias to `convert(html, options)` function and works as before.

### Deprecated options

* `baseElement`;
* `returnDomByDefault`;
* `tables`;
* `tags`.

Refer to README for [migration instructions](https://github.com/html-to-text/node-html-to-text#deprecated-or-removed-options).

No previously deprecated stuff is removed in this version. Significant cleanup is planned for version 9 instead.

----

## Version ~~7.1.2~~ 7.1.3

Bump `minimist` dependency and dev dependencies, regenerate `package-lock.json`.

## Version 7.1.1

Regenerate `package-lock.json`.

## Version 7.1.0

### Dependency updates

* `htmlparser2` updated from 6.0.0 to 6.1.0 ([Release notes](https://github.com/fb55/htmlparser2/releases));
* dev dependencies are bumped.

## Version 7.0.0

### Node version

Required Node version is now >=10.23.2.

### Dependency updates

* `lodash` dependency is removed;
* `htmlparser2` updated from 4.1.0 to 6.0.0 ([Release notes](https://github.com/fb55/htmlparser2/releases), also [domhandler](https://github.com/fb55/domhandler/releases/tag/v4.0.0)). There is a slim chance you can run into some differences in case you're relying on it heavily in your custom formatters;
* dev dependencies are bumped.

### Custom formatters API change

[BlockTextBuilder](https://github.com/html-to-text/node-html-to-text/blob/master/lib/block-text-builder.js) methods now accept option objects for optional arguments. This improves client code readability and allows to introduce extra options with ease. It will see some use in future updates.

Positional arguments introduced in version 6.0.0 are now deprecated. Formatters written for the version 6.0.0 should keep working for now but the compatibility layer is rather inconvenient and will be removed with the next major version.

See the commit [f50f10f](https://github.com/html-to-text/node-html-to-text/commit/f50f10f54cf814efb2f7633d9d377ba7eadeaf1e). Changes in `lib/formatter.js` file are illustrative for how to migrate to the new API.

### And more

* Bunch of documentation and test updates.

All commits: [6.0.0...7.0.0](https://github.com/html-to-text/node-html-to-text/compare/6.0.0...7.0.0)

Version 7 roadmap issue: [#222](https://github.com/html-to-text/node-html-to-text/issues/222)

----

## Version 6.0.0

This is a major update. No code left untouched. While the goal was to keep as much compatibility as possible, some client-facing changes were unavoidable.

### fromString() is deprecated in favor of htmlToText()

Since the library has the only exported function, it is now self-titled.

### Inline and block-level tags, HTML whitespace

Formatting code was rewritten almost entirely to make it aware of block-level tags and to handle HTML whitespace properly. One of popular requests was to support divs, and it is here now, after a lot of effort.

### Options reorganized

Options are reorganized to make room for some extra format options while making everything more structured. Now tag-specific options live within that tag configuration.

For the majority of changed options there is a compatibility layer that will remain until next major release. But you are encouraged to explore new options since they provide a bit more flexibility.

### Custom formatters are different now

Because formatters are integral part of the formatting code (as the name suggests), it wasn't possible to provide a compatibility layer.

Please refer to the Readme to see how things are wired now, in case you were using them for anything other than dealing with the lack of block-level tags support.

### Tables support was improved

Cells can make use of extra space with colspan and rowspan attributes. Max column width is defined separately from global wordwrap limit.

### Limits

Multiple options to cut content in large HTML documents.

By default, any input longer than 16 million characters will be truncated.

### Node and dependencies

Required Node version is now >=8.10.0.

Dependency versions are bumped.

### Repository is moved to it's own organization

[https://github.com/html-to-text/node-html-to-text](https://github.com/html-to-text/node-html-to-text) is the new home.

GitHub should handle all redirects from the old url, so it shouldn't break anything, even if you have a local fork pointing at the old origin. But it is still a good idea to [update](https://docs.github.com/en/free-pro-team@latest/github/using-git/changing-a-remotes-url) the url.

### And more

Version 6 roadmap issue: [#200](https://github.com/html-to-text/node-html-to-text/issues/200)

----

## Version 5.1.1

* `preserveNewLines` whitespace issue fixed [#162](https://github.com/html-to-text/node-html-to-text/pull/162)

## Version 5.1.0

* Hard-coded CLI options removed [#173](https://github.com/html-to-text/node-html-to-text/pull/173)

## Version 5.0.0

### BREAKING CHANGES

#### fromFile removed

The function `fromFile` is removed. It was the main reason `html-to-text` could not be used in the browser [#164](https://github.com/html-to-text/node-html-to-text/pull/164).

You can get the `fromFile` functionality back by using the following code

```js
const fs = require('fs');
const { fromString } = require('html-to-text');

// Callback version
const fromFile = (file, options, callback) => {
  if (!callback) {
    callback = options;
    options = {};
  }
  fs.readFile(file, 'utf8', (err, str) => {
    if (err) return callback(err);
    callback(null, fromString(str, options));
  });
};

// Promise version
const fromFile = (file, option) => fs.promises.readFile(file, 'utf8').then(html => fromString(html, options));

// Sync version
const fromFileSync = (file, options) => fromString(fs.readFileSync(file, 'utf8'), options);
```

#### Supported NodeJS Versions

Node versions < 6 are no longer supported.

----

## Version 4.0.0

* Support dropped for node version < 4.
* New option `unorderedListItemPrefix` added.
* HTML entities in links are not supported.

----

## Version 3.3.0

* Ability to pass custom formatting via the `format` option #128
* Enhanced support for alpha ordered list types added #123

## Version 3.2.0

* Basic support for alpha ordered list types added #122
  * This includes support for the `ol` type values `1`, `a` and `A`

## Version 3.1.0

* Support for the ordered list start attribute added #117
* Option to format paragraph with single new line #112
* `noLinksBrackets` options added #119

## Version 3.0.0

* Switched from `htmlparser` to `htmlparser2` #113
* Treat non-numeric colspans as zero and handle them gracefully #105

----

## Version 2.1.1

* Extra space problem fixed. #88

## Version 2.1.0

* New option to disable `uppercaseHeadings` added. #86
* Starting point of html to text conversion can now be defined in the options via the `baseElement` option. #83
* Support for long words added. The behaviour can be configured via the `longWordSplit` option. #83

## Version 2.0.0

* Unicode support added. #81
* New option `decodeOptions` added.
* Dependencies updated.

Breaking Changes:

* Minimum node version increased to >=0.10.0

----

## Version 1.6.2

* Fixed: correctly handle HTML entities for images #82

## Version 1.6.1

* Fixed: using --tables=true doesn't produce the expected results. #80

## Version 1.6.0

* Preserve newlines in text feature added #75

## Version 1.5.1

* Support for h5 and h6 tags added #74

## Version 1.5.0

* Entity regex is now less greedy #69 #70

## Version 1.4.0

* Uppercase tag processing added. Table center support added. #56
* Unused dependencies removed.

## Version 1.3.2

* Support Node 4 engine #64
