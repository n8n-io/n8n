# magic-string

<a href="https://travis-ci.org/Rich-Harris/magic-string">
  <img src="http://img.shields.io/travis/Rich-Harris/magic-string.svg"
       alt="build status">
</a>
<a href="https://npmjs.org/package/magic-string">
  <img src="https://img.shields.io/npm/v/magic-string.svg"
       alt="npm version">
</a>
<a href="https://github.com/Rich-Harris/magic-string/blob/master/LICENSE.md">
  <img src="https://img.shields.io/npm/l/magic-string.svg"
       alt="license">
</a>

Suppose you have some source code. You want to make some light modifications to it - replacing a few characters here and there, wrapping it with a header and footer, etc - and ideally you'd like to generate a source map at the end of it. You've thought about using something like [recast](https://github.com/benjamn/recast) (which allows you to generate an AST from some JavaScript, manipulate it, and reprint it with a sourcemap without losing your comments and formatting), but it seems like overkill for your needs (or maybe the source code isn't JavaScript).

Your requirements are, frankly, rather niche. But they're requirements that I also have, and for which I made magic-string. It's a small, fast utility for manipulating strings and generating sourcemaps.

## Installation

magic-string works in both node.js and browser environments. For node, install with npm:

```bash
npm i magic-string
```

To use in browser, grab the [magic-string.umd.js](https://unpkg.com/magic-string/dist/magic-string.umd.js) file and add it to your page:

```html
<script src='magic-string.umd.js'></script>
```

(It also works with various module systems, if you prefer that sort of thing - it has a dependency on [vlq](https://github.com/Rich-Harris/vlq).)

## Usage

These examples assume you're in node.js, or something similar:

```js
import MagicString from 'magic-string';
import fs from 'fs'

const s = new MagicString('problems = 99');

s.overwrite(0, 8, 'answer');
s.toString(); // 'answer = 99'

s.overwrite(11, 13, '42'); // character indices always refer to the original string
s.toString(); // 'answer = 42'

s.prepend('var ').append(';'); // most methods are chainable
s.toString(); // 'var answer = 42;'

const map = s.generateMap({
  source: 'source.js',
  file: 'converted.js.map',
  includeContent: true
}); // generates a v3 sourcemap

fs.writeFileSync('converted.js', s.toString());
fs.writeFileSync('converted.js.map', map.toString());
```

You can pass an options argument:

```js
const s = new MagicString(someCode, {
  // both these options will be used if you later
  // call `bundle.addSource( s )` - see below
  filename: 'foo.js',
  indentExclusionRanges: [/*...*/]
});
```

## Methods

### s.addSourcemapLocation( index )

Adds the specified character index (with respect to the original string) to sourcemap mappings, if `hires` is `false` (see below).

### s.append( content )

Appends the specified content to the end of the string. Returns `this`.

### s.appendLeft( index, content )

Appends the specified `content` at the `index` in the original string. If a range *ending* with `index` is subsequently moved, the insert will be moved with it. Returns `this`. See also `s.prependLeft(...)`.

### s.appendRight( index, content )

Appends the specified `content` at the `index` in the original string. If a range *starting* with `index` is subsequently moved, the insert will be moved with it. Returns `this`. See also `s.prependRight(...)`.

### s.clone()

Does what you'd expect.

### s.generateDecodedMap( options )

Generates a sourcemap object with raw mappings in array form, rather than encoded as a string. See `generateMap` documentation below for options details. Useful if you need to manipulate the sourcemap further, but most of the time you will use `generateMap` instead.

### s.generateMap( options )

Generates a [version 3 sourcemap](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit). All options are, well, optional:

* `file` - the filename where you plan to write the sourcemap
* `source` - the filename of the file containing the original source
* `includeContent` - whether to include the original content in the map's `sourcesContent` array
* `hires` - whether the mapping should be high-resolution. Hi-res mappings map every single character, meaning (for example) your devtools will always be able to pinpoint the exact location of function calls and so on. With lo-res mappings, devtools may only be able to identify the correct line - but they're quicker to generate and less bulky. If sourcemap locations have been specified with `s.addSourceMapLocation()`, they will be used here.

The returned sourcemap has two (non-enumerable) methods attached for convenience:

* `toString` - returns the equivalent of `JSON.stringify(map)`
* `toUrl` - returns a DataURI containing the sourcemap. Useful for doing this sort of thing:

```js
code += '\n//# sourceMappingURL=' + map.toUrl();
```

### s.indent( prefix[, options] )

Prefixes each line of the string with `prefix`. If `prefix` is not supplied, the indentation will be guessed from the original content, falling back to a single tab character. Returns `this`.

The `options` argument can have an `exclude` property, which is an array of `[start, end]` character ranges. These ranges will be excluded from the indentation - useful for (e.g.) multiline strings.

### s.insertLeft( index, content )

**DEPRECATED** since 0.17 – use `s.appendLeft(...)` instead

### s.insertRight( index, content )

**DEPRECATED** since 0.17 – use `s.prependRight(...)` instead

### s.locate( index )

**DEPRECATED** since 0.10 – see [#30](https://github.com/Rich-Harris/magic-string/pull/30)

### s.locateOrigin( index )

**DEPRECATED** since 0.10 – see [#30](https://github.com/Rich-Harris/magic-string/pull/30)

### s.move( start, end, newIndex )

Moves the characters from `start` and `end` to `index`. Returns `this`.

### s.overwrite( start, end, content[, options] )

Replaces the characters from `start` to `end` with `content`. The same restrictions as `s.remove()` apply. Returns `this`.

The fourth argument is optional. It can have a `storeName` property — if `true`, the original name will be stored for later inclusion in a sourcemap's `names` array — and a `contentOnly` property which determines whether only the content is overwritten, or anything that was appended/prepended to the range as well.

### s.prepend( content )

Prepends the string with the specified content. Returns `this`.

### s.prependLeft ( index, content )

Same as `s.appendLeft(...)`, except that the inserted content will go *before* any previous appends or prepends at `index`

### s.prependRight ( index, content )

Same as `s.appendRight(...)`, except that the inserted content will go *before* any previous appends or prepends at `index`

### s.remove( start, end )

Removes the characters from `start` to `end` (of the original string, **not** the generated string). Removing the same content twice, or making removals that partially overlap, will cause an error. Returns `this`.

### s.slice( start, end )

Returns the content of the generated string that corresponds to the slice between `start` and `end` of the original string. Throws error if the indices are for characters that were already removed.

### s.snip( start, end )

Returns a clone of `s`, with all content before the `start` and `end` characters of the original string removed.

### s.toString()

Returns the generated string.

### s.trim([ charType ])

Trims content matching `charType` (defaults to `\s`, i.e. whitespace) from the start and end. Returns `this`.

### s.trimStart([ charType ])

Trims content matching `charType` (defaults to `\s`, i.e. whitespace) from the start. Returns `this`.

### s.trimEnd([ charType ])

Trims content matching `charType` (defaults to `\s`, i.e. whitespace) from the end. Returns `this`.

### s.trimLines()

Removes empty lines from the start and end. Returns `this`.

### s.isEmpty()

Returns true if the resulting source is empty (disregarding white space).

## Bundling

To concatenate several sources, use `MagicString.Bundle`:

```js
const bundle = new MagicString.Bundle();

bundle.addSource({
  filename: 'foo.js',
  content: new MagicString('var answer = 42;')
});

bundle.addSource({
  filename: 'bar.js',
  content: new MagicString('console.log( answer )')
});

// Advanced: a source can include an `indentExclusionRanges` property
// alongside `filename` and `content`. This will be passed to `s.indent()`
// - see documentation above

bundle.indent() // optionally, pass an indent string, otherwise it will be guessed
  .prepend('(function () {\n')
  .append('}());');

bundle.toString();
// (function () {
//   var answer = 42;
//   console.log( answer );
// }());

// options are as per `s.generateMap()` above
const map = bundle.generateMap({
  file: 'bundle.js',
  includeContent: true,
  hires: true
});
```

As an alternative syntax, if you a) don't have `filename` or `indentExclusionRanges` options, or b) passed those in when you used `new MagicString(...)`, you can simply pass the `MagicString` instance itself:

```js
const bundle = new MagicString.Bundle();
const source = new MagicString(someCode, {
  filename: 'foo.js'
});

bundle.addSource(source);
```

## License

MIT
