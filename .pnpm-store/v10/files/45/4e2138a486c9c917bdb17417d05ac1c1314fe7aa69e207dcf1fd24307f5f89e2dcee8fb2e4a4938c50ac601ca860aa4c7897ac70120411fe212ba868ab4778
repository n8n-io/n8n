UglifyJS 3
==========

UglifyJS is a JavaScript parser, minifier, compressor and beautifier toolkit.

#### Note:
- `uglify-js` supports JavaScript and most language features in ECMAScript.
- For more exotic parts of ECMAScript, process your source file with transpilers
  like [Babel](https://babeljs.io/) before passing onto `uglify-js`.
- `uglify-js@3` has a simplified [API](#api-reference) and [CLI](#command-line-usage)
  that is not backwards compatible with [`uglify-js@2`](https://github.com/mishoo/UglifyJS/tree/v2.x).

Install
-------

First make sure you have installed the latest version of [node.js](http://nodejs.org/)
(You may need to restart your computer after this step).

From NPM for use as a command line app:

    npm install uglify-js -g

From NPM for programmatic use:

    npm install uglify-js

# Command line usage

    uglifyjs [input files] [options]

UglifyJS can take multiple input files.  It's recommended that you pass the
input files first, then pass the options.  UglifyJS will parse input files
in sequence and apply any compression options.  The files are parsed in the
same global scope, that is, a reference from a file to some
variable/function declared in another file will be matched properly.

If no input file is specified, UglifyJS will read from STDIN.

If you wish to pass your options before the input files, separate the two with
a double dash to prevent input files being used as option arguments:

    uglifyjs --compress --mangle -- input.js

### Command line options

```
    -h, --help                  Print usage information.
                                `--help options` for details on available options.
    -V, --version               Print version number.
    -p, --parse <options>       Specify parser options:
                                `acorn`  Use Acorn for parsing.
                                `bare_returns`  Allow return outside of functions.
                                                Useful when minifying CommonJS
                                                modules and Userscripts that may
                                                be anonymous function wrapped (IIFE)
                                                by the .user.js engine `caller`.
                                `spidermonkey`  Assume input files are SpiderMonkey
                                                AST format (as JSON).
    -c, --compress [options]    Enable compressor/specify compressor options:
                                `pure_funcs`  List of functions that can be safely
                                              removed when their return values are
                                              not used.
    -m, --mangle [options]      Mangle names/specify mangler options:
                                `reserved`  List of names that should not be mangled.
    --mangle-props [options]    Mangle properties/specify mangler options:
                                `builtins`  Mangle property names that overlaps
                                            with standard JavaScript globals.
                                `debug`  Add debug prefix and suffix.
                                `domprops`  Mangle property names that overlaps
                                            with DOM properties.
                                `keep_quoted`  Only mangle unquoted properties.
                                `regex`  Only mangle matched property names.
                                `reserved`  List of names that should not be mangled.
    -b, --beautify [options]    Beautify output/specify output options:
                                `beautify`  Enabled with `--beautify` by default.
                                `preamble`  Preamble to prepend to the output. You
                                            can use this to insert a comment, for
                                            example for licensing information.
                                            This will not be parsed, but the source
                                            map will adjust for its presence.
                                `quote_style`  Quote style:
                                               0 - auto
                                               1 - single
                                               2 - double
                                               3 - original
                                `wrap_iife`  Wrap IIFEs in parentheses. Note: you may
                                             want to disable `negate_iife` under
                                             compressor options.
    -O, --output-opts [options] Specify output options (`beautify` disabled by default).
    -o, --output <file>         Output file path (default STDOUT). Specify `ast` or
                                `spidermonkey` to write UglifyJS or SpiderMonkey AST
                                as JSON to STDOUT respectively.
    --annotations               Process and preserve comment annotations.
                                (`/*@__PURE__*/` or `/*#__PURE__*/`)
    --no-annotations            Ignore and discard comment annotations.
    --comments [filter]         Preserve copyright comments in the output. By
                                default this works like Google Closure, keeping
                                JSDoc-style comments that contain "@license" or
                                "@preserve". You can optionally pass one of the
                                following arguments to this flag:
                                - "all" to keep all comments
                                - a valid JS RegExp like `/foo/` or `/^!/` to
                                keep only matching comments.
                                Note that currently not *all* comments can be
                                kept when compression is on, because of dead
                                code removal or cascading statements into
                                sequences.
    --config-file <file>        Read `minify()` options from JSON file.
    -d, --define <expr>[=value] Global definitions.
    -e, --enclose [arg[:value]] Embed everything in a big function, with configurable
                                argument(s) & value(s).
    --expression                Parse a single expression, rather than a program
                                (for parsing JSON).
    --ie                        Support non-standard Internet Explorer.
                                Equivalent to setting `ie: true` in `minify()`
                                for `compress`, `mangle` and `output` options.
                                By default UglifyJS will not try to be IE-proof.
    --keep-fargs                Do not mangle/drop function arguments.
    --keep-fnames               Do not mangle/drop function names.  Useful for
                                code relying on Function.prototype.name.
    --module                    Process input as ES module (implies --toplevel)
    --no-module                 Avoid optimizations which may alter runtime behavior
                                under prior versions of JavaScript.
    --name-cache <file>         File to hold mangled name mappings.
    --self                      Build UglifyJS as a library (implies --wrap UglifyJS)
    --source-map [options]      Enable source map/specify source map options:
                                `base`  Path to compute relative paths from input files.
                                `content`  Input source map, useful if you're compressing
                                           JS that was generated from some other original
                                           code. Specify "inline" if the source map is
                                           included within the sources.
                                `filename`  Filename and/or location of the output source
                                            (sets `file` attribute in source map).
                                `includeSources`  Pass this flag if you want to include
                                                  the content of source files in the
                                                  source map as sourcesContent property.
                                `names` Include symbol names in the source map.
                                `root`  Path to the original source to be included in
                                        the source map.
                                `url`  If specified, path to the source map to append in
                                       `//# sourceMappingURL`.
    --timings                   Display operations run time on STDERR.
    --toplevel                  Compress and/or mangle variables in top level scope.
    --v8                        Support non-standard Chrome & Node.js
                                Equivalent to setting `v8: true` in `minify()`
                                for `mangle` and `output` options.
                                By default UglifyJS will not try to be v8-proof.
    --verbose                   Print diagnostic messages.
    --warn                      Print warning messages.
    --webkit                    Support non-standard Safari/Webkit.
                                Equivalent to setting `webkit: true` in `minify()`
                                for `compress`, `mangle` and `output` options.
                                By default UglifyJS will not try to be Safari-proof.
    --wrap <name>               Embed everything in a big function, making the
                                “exports” and “global” variables available. You
                                need to pass an argument to this option to
                                specify the name that your module will take
                                when included in, say, a browser.
```

Specify `--output` (`-o`) to declare the output file.  Otherwise the output
goes to STDOUT.

## CLI source map options

UglifyJS can generate a source map file, which is highly useful for
debugging your compressed JavaScript.  To get a source map, pass
`--source-map --output output.js` (source map will be written out to
`output.js.map`).

Additional options:

- `--source-map "filename='<NAME>'"` to specify the name of the source map. The value of
  `filename` is only used to set `file` attribute (see [the spec][sm-spec])
  in source map file.

- `--source-map "root='<URL>'"` to pass the URL where the original files can be found.

- `--source-map "names=false"` to omit symbol names if you want to reduce size
  of the source map file.

- `--source-map "url='<URL>'"` to specify the URL where the source map can be found.
  Otherwise UglifyJS assumes HTTP `X-SourceMap` is being used and will omit the
  `//# sourceMappingURL=` directive.

For example:

    uglifyjs js/file1.js js/file2.js \
             -o foo.min.js -c -m \
             --source-map "root='http://foo.com/src',url='foo.min.js.map'"

The above will compress and mangle `file1.js` and `file2.js`, will drop the
output in `foo.min.js` and the source map in `foo.min.js.map`.  The source
mapping will refer to `http://foo.com/src/js/file1.js` and
`http://foo.com/src/js/file2.js` (in fact it will list `http://foo.com/src`
as the source map root, and the original files as `js/file1.js` and
`js/file2.js`).

### Composed source map

When you're compressing JS code that was output by a compiler such as
CoffeeScript, mapping to the JS code won't be too helpful.  Instead, you'd
like to map back to the original code (i.e. CoffeeScript).  UglifyJS has an
option to take an input source map.  Assuming you have a mapping from
CoffeeScript → compiled JS, UglifyJS can generate a map from CoffeeScript →
compressed JS by mapping every token in the compiled JS to its original
location.

To use this feature pass `--source-map "content='/path/to/input/source.map'"`
or `--source-map "content=inline"` if the source map is included inline with
the sources.

## CLI compress options

You need to pass `--compress` (`-c`) to enable the compressor.  Optionally
you can pass a comma-separated list of [compress options](#compress-options).

Options are in the form `foo=bar`, or just `foo` (the latter implies
a boolean option that you want to set `true`; it's effectively a
shortcut for `foo=true`).

Example:

    uglifyjs file.js -c toplevel,sequences=false

## CLI mangle options

To enable the mangler you need to pass `--mangle` (`-m`).  The following
(comma-separated) options are supported:

- `eval` (default: `false`) — mangle names visible in scopes where `eval` or
  `with` are used.

- `reserved` (default: `[]`) — when mangling is enabled but you want to
  prevent certain names from being mangled, you can declare those names with
  `--mangle reserved` — pass a comma-separated list of names.  For example:

      uglifyjs ... -m reserved=['$','require','exports']

  to prevent the `require`, `exports` and `$` names from being changed.

### CLI mangling property names (`--mangle-props`)

**Note:** THIS WILL PROBABLY BREAK YOUR CODE.  Mangling property names
is a separate step, different from variable name mangling.  Pass
`--mangle-props` to enable it.  It will mangle all properties in the
input code with the exception of built in DOM properties and properties
in core JavaScript classes.  For example:

```javascript
// example.js
var x = {
    baz_: 0,
    foo_: 1,
    calc: function() {
        return this.foo_ + this.baz_;
    }
};
x.bar_ = 2;
x["baz_"] = 3;
console.log(x.calc());
```
Mangle all properties (except for JavaScript `builtins`):
```bash
$ uglifyjs example.js -c -m --mangle-props
```
```javascript
var x={o:0,_:1,l:function(){return this._+this.o}};x.t=2,x.o=3,console.log(x.l());
```
Mangle all properties except for `reserved` properties:
```bash
$ uglifyjs example.js -c -m --mangle-props reserved=[foo_,bar_]
```
```javascript
var x={o:0,foo_:1,_:function(){return this.foo_+this.o}};x.bar_=2,x.o=3,console.log(x._());
```
Mangle all properties matching a `regex`:
```bash
$ uglifyjs example.js -c -m --mangle-props regex=/_$/
```
```javascript
var x={o:0,_:1,calc:function(){return this._+this.o}};x.l=2,x.o=3,console.log(x.calc());
```

Combining mangle properties options:
```bash
$ uglifyjs example.js -c -m --mangle-props regex=/_$/,reserved=[bar_]
```
```javascript
var x={o:0,_:1,calc:function(){return this._+this.o}};x.bar_=2,x.o=3,console.log(x.calc());
```

In order for this to be of any use, we avoid mangling standard JS names by
default (`--mangle-props builtins` to override).

A default exclusion file is provided in `tools/domprops.json` which should
cover most standard JS and DOM properties defined in various browsers.  Pass
`--mangle-props domprops` to disable this feature.

A regular expression can be used to define which property names should be
mangled.  For example, `--mangle-props regex=/^_/` will only mangle property
names that start with an underscore.

When you compress multiple files using this option, in order for them to
work together in the end we need to ensure somehow that one property gets
mangled to the same name in all of them.  For this, pass `--name-cache filename.json`
and UglifyJS will maintain these mappings in a file which can then be reused.
It should be initially empty.  Example:

```bash
$ rm -f /tmp/cache.json  # start fresh
$ uglifyjs file1.js file2.js --mangle-props --name-cache /tmp/cache.json -o part1.js
$ uglifyjs file3.js file4.js --mangle-props --name-cache /tmp/cache.json -o part2.js
```

Now, `part1.js` and `part2.js` will be consistent with each other in terms
of mangled property names.

Using the name cache is not necessary if you compress all your files in a
single call to UglifyJS.

### Mangling unquoted names (`--mangle-props keep_quoted`)

Using quoted property name (`o["foo"]`) reserves the property name (`foo`)
so that it is not mangled throughout the entire script even when used in an
unquoted style (`o.foo`). Example:

```javascript
// stuff.js
var o = {
    "foo": 1,
    bar: 3,
};
o.foo += o.bar;
console.log(o.foo);
```
```bash
$ uglifyjs stuff.js --mangle-props keep_quoted -c -m
```
```javascript
var o={foo:1,o:3};o.foo+=o.o,console.log(o.foo);
```

If the minified output will be processed again by UglifyJS, consider specifying
`keep_quoted_props` so the same property names are preserved:

```bash
$ uglifyjs stuff.js --mangle-props keep_quoted -c -m -O keep_quoted_props
```
```javascript
var o={"foo":1,o:3};o.foo+=o.o,console.log(o.foo);
```

### Debugging property name mangling

You can also pass `--mangle-props debug` in order to mangle property names
without completely obscuring them. For example the property `o.foo`
would mangle to `o._$foo$_` with this option. This allows property mangling
of a large codebase while still being able to debug the code and identify
where mangling is breaking things.

```bash
$ uglifyjs stuff.js --mangle-props debug -c -m
```
```javascript
var o={_$foo$_:1,_$bar$_:3};o._$foo$_+=o._$bar$_,console.log(o._$foo$_);
```

You can also pass a custom suffix using `--mangle-props debug=XYZ`. This would then
mangle `o.foo` to `o._$foo$XYZ_`. You can change this each time you compile a
script to identify how a property got mangled. One technique is to pass a
random number on every compile to simulate mangling changing with different
inputs (e.g. as you update the input script with new properties), and to help
identify mistakes like writing mangled keys to storage.


# API Reference

Assuming installation via NPM, you can load UglifyJS in your application
like this:
```javascript
var UglifyJS = require("uglify-js");
```

There is a single high level function, **`minify(code, options)`**,
which will perform all minification [phases](#minify-options) in a configurable
manner. By default `minify()` will enable the options [`compress`](#compress-options)
and [`mangle`](#mangle-options). Example:
```javascript
var code = "function add(first, second) { return first + second; }";
var result = UglifyJS.minify(code);
console.log(result.error); // runtime error, or `undefined` if no error
console.log(result.code);  // minified output: function add(n,d){return n+d}
```

You can `minify` more than one JavaScript file at a time by using an object
for the first argument where the keys are file names and the values are source
code:
```javascript
var code = {
    "file1.js": "function add(first, second) { return first + second; }",
    "file2.js": "console.log(add(1 + 2, 3 + 4));"
};
var result = UglifyJS.minify(code);
console.log(result.code);
// function add(d,n){return d+n}console.log(add(3,7));
```

The `toplevel` option:
```javascript
var code = {
    "file1.js": "function add(first, second) { return first + second; }",
    "file2.js": "console.log(add(1 + 2, 3 + 4));"
};
var options = { toplevel: true };
var result = UglifyJS.minify(code, options);
console.log(result.code);
// console.log(3+7);
```

The `nameCache` option:
```javascript
var options = {
    mangle: {
        toplevel: true,
    },
    nameCache: {}
};
var result1 = UglifyJS.minify({
    "file1.js": "function add(first, second) { return first + second; }"
}, options);
var result2 = UglifyJS.minify({
    "file2.js": "console.log(add(1 + 2, 3 + 4));"
}, options);
console.log(result1.code);
// function n(n,r){return n+r}
console.log(result2.code);
// console.log(n(3,7));
```

You may persist the name cache to the file system in the following way:
```javascript
var cacheFileName = "/tmp/cache.json";
var options = {
    mangle: {
        properties: true,
    },
    nameCache: JSON.parse(fs.readFileSync(cacheFileName, "utf8"))
};
fs.writeFileSync("part1.js", UglifyJS.minify({
    "file1.js": fs.readFileSync("file1.js", "utf8"),
    "file2.js": fs.readFileSync("file2.js", "utf8")
}, options).code, "utf8");
fs.writeFileSync("part2.js", UglifyJS.minify({
    "file3.js": fs.readFileSync("file3.js", "utf8"),
    "file4.js": fs.readFileSync("file4.js", "utf8")
}, options).code, "utf8");
fs.writeFileSync(cacheFileName, JSON.stringify(options.nameCache), "utf8");
```

An example of a combination of `minify()` options:
```javascript
var code = {
    "file1.js": "function add(first, second) { return first + second; }",
    "file2.js": "console.log(add(1 + 2, 3 + 4));"
};
var options = {
    toplevel: true,
    compress: {
        global_defs: {
            "@console.log": "alert"
        },
        passes: 2
    },
    output: {
        beautify: false,
        preamble: "/* uglified */"
    }
};
var result = UglifyJS.minify(code, options);
console.log(result.code);
// /* uglified */
// alert(10);"
```

To produce warnings:
```javascript
var code = "function f(){ var u; return 2 + 3; }";
var options = { warnings: true };
var result = UglifyJS.minify(code, options);
console.log(result.error);    // runtime error, `undefined` in this case
console.log(result.warnings); // [ 'Dropping unused variable u [0:1,18]' ]
console.log(result.code);     // function f(){return 5}
```

An error example:
```javascript
var result = UglifyJS.minify({"foo.js" : "if (0) else console.log(1);"});
console.log(JSON.stringify(result.error));
// {"message":"Unexpected token: keyword (else)","filename":"foo.js","line":1,"col":7,"pos":7}
```
Note: unlike `uglify-js@2.x`, the `3.x` API does not throw errors. To
achieve a similar effect one could do the following:
```javascript
var result = UglifyJS.minify(code, options);
if (result.error) throw result.error;
```

## Minify options

- `annotations` — pass `false` to ignore all comment annotations and elide them
  from output. Useful when, for instance, external tools incorrectly applied
  `/*@__PURE__*/` or `/*#__PURE__*/`. Pass `true` to both compress and retain
  comment annotations in output to allow for further processing downstream.

- `compress` (default: `{}`) — pass `false` to skip compressing entirely.
  Pass an object to specify custom [compress options](#compress-options).

- `expression` (default: `false`) — parse as a single expression, e.g. JSON.

- `ie` (default: `false`) — enable workarounds for Internet Explorer bugs.

- `keep_fargs` (default: `false`) — pass `true` to prevent discarding or mangling
  of function arguments.

- `keep_fnames` (default: `false`) — pass `true` to prevent discarding or mangling
  of function names.  Useful for code relying on `Function.prototype.name`.

- `mangle` (default: `true`) — pass `false` to skip mangling names, or pass
  an object to specify [mangle options](#mangle-options) (see below).

  - `mangle.properties` (default: `false`) — a subcategory of the mangle option.
    Pass an object to specify custom [mangle property options](#mangle-properties-options).

- `module` (default: `true`) — process input as ES module, i.e. implicit
  `"use strict";` and support for top-level `await`. When explicitly specified,
  also enables `toplevel`.

- `nameCache` (default: `null`) — pass an empty object `{}` or a previously
  used `nameCache` object if you wish to cache mangled variable and
  property names across multiple invocations of `minify()`. Note: this is
  a read/write property. `minify()` will read the name cache state of this
  object and update it during minification so that it may be
  reused or externally persisted by the user.

- `output` (default: `null`) — pass an object if you wish to specify
  additional [output options](#output-options).  The defaults are optimized
  for best compression.

- `parse` (default: `{}`) — pass an object if you wish to specify some
  additional [parse options](#parse-options).

- `sourceMap` (default: `false`) — pass an object if you wish to specify
  [source map options](#source-map-options).

- `toplevel` (default: `false`) — set to `true` if you wish to enable top level
  variable and function name mangling and to drop unused variables and functions.

- `v8` (default: `false`) — enable workarounds for Chrome & Node.js bugs.

- `warnings` (default: `false`) — pass `true` to return compressor warnings
  in `result.warnings`. Use the value `"verbose"` for more detailed warnings.

- `webkit` (default: `false`) — enable workarounds for Safari/WebKit bugs.
  PhantomJS users should set this option to `true`.

## Minify options structure

```javascript
{
    parse: {
        // parse options
    },
    compress: {
        // compress options
    },
    mangle: {
        // mangle options

        properties: {
            // mangle property options
        }
    },
    output: {
        // output options
    },
    sourceMap: {
        // source map options
    },
    nameCache: null, // or specify a name cache object
    toplevel: false,
    warnings: false,
}
```

### Source map options

To generate a source map:
```javascript
var result = UglifyJS.minify({"file1.js": "var a = function() {};"}, {
    sourceMap: {
        filename: "out.js",
        url: "out.js.map"
    }
});
console.log(result.code); // minified output
console.log(result.map);  // source map
```

Note that the source map is not saved in a file, it's just returned in
`result.map`.  The value passed for `sourceMap.url` is only used to set
`//# sourceMappingURL=out.js.map` in `result.code`. The value of
`filename` is only used to set `file` attribute (see [the spec][sm-spec])
in source map file.

You can set option `sourceMap.url` to be `"inline"` and source map will
be appended to code.

You can also specify sourceRoot property to be included in source map:
```javascript
var result = UglifyJS.minify({"file1.js": "var a = function() {};"}, {
    sourceMap: {
        root: "http://example.com/src",
        url: "out.js.map"
    }
});
```

If you're compressing compiled JavaScript and have a source map for it, you
can use `sourceMap.content`:
```javascript
var result = UglifyJS.minify({"compiled.js": "compiled code"}, {
    sourceMap: {
        content: "content from compiled.js.map",
        url: "minified.js.map"
    }
});
// same as before, it returns `code` and `map`
```

If you're using the `X-SourceMap` header instead, you can just omit `sourceMap.url`.

If you wish to reduce file size of the source map, set option `sourceMap.names`
to be `false` and all symbol names will be omitted.

## Parse options

- `bare_returns` (default: `false`) — support top level `return` statements

- `html5_comments` (default: `true`) — process HTML comment as workaround for
  browsers which do not recognize `<script>` tags

- `module` (default: `false`) — set to `true` if you wish to process input as
  ES module, i.e. implicit `"use strict";` and support for top-level `await`.

- `shebang` (default: `true`) — support `#!command` as the first line

## Compress options

- `annotations` (default: `true`) — Pass `false` to disable potentially dropping
  functions marked as "pure".  A function call is marked as "pure" if a comment
  annotation `/*@__PURE__*/` or `/*#__PURE__*/` immediately precedes the call. For
  example: `/*@__PURE__*/foo();`

- `arguments` (default: `true`) — replace `arguments[index]` with function
  parameter name whenever possible.

- `arrows` (default: `true`) — apply optimizations to arrow functions

- `assignments` (default: `true`) — apply optimizations to assignment expressions

- `awaits` (default: `true`) — apply optimizations to `await` expressions

- `booleans` (default: `true`) — various optimizations for boolean context,
  for example `!!a ? b : c → a ? b : c`

- `collapse_vars` (default: `true`) — Collapse single-use non-constant variables,
  side effects permitting.

- `comparisons` (default: `true`) — apply certain optimizations to binary nodes,
  e.g. `!(a <= b) → a > b`, attempts to negate binary nodes, e.g.
  `a = !b && !c && !d && !e → a=!(b||c||d||e)` etc.

- `conditionals` (default: `true`) — apply optimizations for `if`-s and conditional
  expressions

- `dead_code` (default: `true`) — remove unreachable code

- `default_values` (default: `true`) — drop overshadowed default values

- `directives` (default: `true`) — remove redundant or non-standard directives

- `drop_console` (default: `false`) — Pass `true` to discard calls to
  `console.*` functions. If you wish to drop a specific function call
  such as `console.info` and/or retain side effects from function arguments
  after dropping the function call then use `pure_funcs` instead.

- `drop_debugger` (default: `true`) — remove `debugger;` statements

- `evaluate` (default: `true`) — Evaluate expression for shorter constant
  representation. Pass `"eager"` to always replace function calls whenever
  possible, or a positive integer to specify an upper bound for each individual
  evaluation in number of characters.

- `expression` (default: `false`) — Pass `true` to preserve completion values
  from terminal statements without `return`, e.g. in bookmarklets.

- `functions` (default: `true`) — convert declarations from `var` to `function`
  whenever possible.

- `global_defs` (default: `{}`) — see [conditional compilation](#conditional-compilation)

- `hoist_exports` (default: `true`) — hoist `export` statements to facilitate
  various `compress` and `mangle` optimizations.

- `hoist_funs` (default: `false`) — hoist function declarations

- `hoist_props` (default: `true`) — hoist properties from constant object and
  array literals into regular variables subject to a set of constraints. For example:
  `var o={p:1, q:2}; f(o.p, o.q);` is converted to `f(1, 2);`. Note: `hoist_props`
  works best with `toplevel` and `mangle` enabled, alongside with `compress` option
  `passes` set to `2` or higher.

- `hoist_vars` (default: `false`) — hoist `var` declarations (this is `false`
  by default because it seems to increase the size of the output in general)

- `if_return` (default: `true`) — optimizations for if/return and if/continue

- `imports` (default: `true`) — drop unreferenced import symbols when used with `unused`

- `inline` (default: `true`) — inline calls to function with simple/`return` statement:
  - `false` — same as `0`
  - `0` — disabled inlining
  - `1` — inline simple functions
  - `2` — inline functions with arguments
  - `3` — inline functions with arguments and variables
  - `4` — inline functions with arguments, variables and statements
  - `true` — same as `4`

- `join_vars` (default: `true`) — join consecutive `var` statements

- `keep_fargs` (default: `false`) — discard unused function arguments except
  when unsafe to do so, e.g. code which relies on `Function.prototype.length`.
  Pass `true` to always retain function arguments.

- `keep_infinity` (default: `false`) — Pass `true` to prevent `Infinity` from
  being compressed into `1/0`, which may cause performance issues on Chrome.

- `loops` (default: `true`) — optimizations for `do`, `while` and `for` loops
  when we can statically determine the condition.

- `merge_vars` (default: `true`) — combine and reuse variables.

- `module` (default: `false`) — set to `true` if you wish to process input as
  ES module, i.e. implicit `"use strict";`.

- `negate_iife` (default: `true`) — negate "Immediately-Called Function Expressions"
  where the return value is discarded, to avoid the parentheses that the
  code generator would insert.

- `objects` (default: `true`) — compact duplicate keys in object literals.

- `passes` (default: `1`) — The maximum number of times to run compress.
  In some cases more than one pass leads to further compressed code.  Keep in
  mind more passes will take more time.

- `properties` (default: `true`) — rewrite property access using the dot notation, for
  example `foo["bar"] → foo.bar`

- `pure_funcs` (default: `null`) — You can pass an array of names and
  UglifyJS will assume that those functions do not produce side
  effects.  DANGER: will not check if the name is redefined in scope.
  An example case here, for instance `var q = Math.floor(a/b)`.  If
  variable `q` is not used elsewhere, UglifyJS will drop it, but will
  still keep the `Math.floor(a/b)`, not knowing what it does.  You can
  pass `pure_funcs: [ 'Math.floor' ]` to let it know that this
  function won't produce any side effect, in which case the whole
  statement would get discarded.  The current implementation adds some
  overhead (compression will be slower). Make sure symbols under `pure_funcs`
  are also under `mangle.reserved` to avoid mangling.

- `pure_getters` (default: `"strict"`) — Pass `true` for UglifyJS to assume that
  object property access (e.g. `foo.bar` or `a[42]`) does not throw exception or
  alter program states via getter function. Pass `"strict"` to allow dropping or
  reordering `foo.bar` only if `foo` is not `null` or `undefined` and is safe to
  access as a variable. Pass `false` to retain all property accesses.

- `reduce_funcs` (default: `true`) — Allows single-use functions to be
  inlined as function expressions when permissible allowing further
  optimization.  Enabled by default.  Option depends on `reduce_vars`
  being enabled.  Some code runs faster in the Chrome V8 engine if this
  option is disabled.  Does not negatively impact other major browsers.

- `reduce_vars` (default: `true`) — Improve optimization on variables assigned with and
  used as constant values.

- `rests` (default: `true`) — apply optimizations to rest parameters

- `sequences` (default: `true`) — join consecutive simple statements using the
  comma operator.  May be set to a positive integer to specify the maximum number
  of consecutive comma sequences that will be generated. If this option is set to
  `true` then the default `sequences` limit is `200`. Set option to `false` or `0`
  to disable. The smallest `sequences` length is `2`. A `sequences` value of `1`
  is grandfathered to be equivalent to `true` and as such means `200`. On rare
  occasions the default sequences limit leads to very slow compress times in which
  case a value of `20` or less is recommended.

- `side_effects` (default: `true`) — drop extraneous code which does not affect
  outcome of runtime execution.

- `spreads` (default: `true`) — flatten spread expressions.

- `strings` (default: `true`) — compact string concatenations.

- `switches` (default: `true`) — de-duplicate and remove unreachable `switch` branches

- `templates` (default: `true`) — compact template literals by embedding expressions
  and/or converting to string literals, e.g. `` `foo ${42}` → "foo 42"``

- `top_retain` (default: `null`) — prevent specific toplevel functions and
  variables from `unused` removal (can be array, comma-separated, RegExp or
  function. Implies `toplevel`)

- `toplevel` (default: `false`) — drop unreferenced functions (`"funcs"`) and/or
  variables (`"vars"`) in the top level scope (`false` by default, `true` to drop
  both unreferenced functions and variables)

- `typeofs` (default: `true`) — compress `typeof` expressions, e.g.
  `typeof foo == "undefined" → void 0 === foo`

- `unsafe` (default: `false`) — apply "unsafe" transformations (discussion below)

- `unsafe_comps` (default: `false`) — assume operands cannot be (coerced to) `NaN`
  in numeric comparisons, e.g. `a <= b`. In addition, expressions involving `in`
  or `instanceof` would never throw.

- `unsafe_Function` (default: `false`) — compress and mangle `Function(args, code)`
  when both `args` and `code` are string literals.

- `unsafe_math` (default: `false`) — optimize numerical expressions like
  `2 * x * 3` into `6 * x`, which may give imprecise floating point results.

- `unsafe_proto` (default: `false`) — optimize expressions like
  `Array.prototype.slice.call(a)` into `[].slice.call(a)`

- `unsafe_regexp` (default: `false`) — enable substitutions of variables with
  `RegExp` values the same way as if they are constants.

- `unsafe_undefined` (default: `false`) — substitute `void 0` if there is a
  variable named `undefined` in scope (variable name will be mangled, typically
  reduced to a single character)

- `unused` (default: `true`) — drop unreferenced functions and variables (simple
  direct variable assignments do not count as references unless set to `"keep_assign"`)

- `varify` (default: `true`) — convert block-scoped declarations into `var`
  whenever safe to do so

- `yields` (default: `true`) — apply optimizations to `yield` expressions

## Mangle options

- `eval` (default: `false`) — Pass `true` to mangle names visible in scopes
  where `eval` or `with` are used.

- `reserved` (default: `[]`) — Pass an array of identifiers that should be
  excluded from mangling. Example: `["foo", "bar"]`.

- `toplevel` (default: `false`) — Pass `true` to mangle names declared in the
  top level scope.

Examples:

```javascript
// test.js
var globalVar;
function funcName(firstLongName, anotherLongName) {
    var myVariable = firstLongName +  anotherLongName;
}
```
```javascript
var code = fs.readFileSync("test.js", "utf8");

UglifyJS.minify(code).code;
// 'function funcName(a,n){}var globalVar;'

UglifyJS.minify(code, { mangle: { reserved: ['firstLongName'] } }).code;
// 'function funcName(firstLongName,a){}var globalVar;'

UglifyJS.minify(code, { mangle: { toplevel: true } }).code;
// 'function n(n,a){}var a;'
```

### Mangle properties options

- `builtins` (default: `false`) — Use `true` to allow the mangling of built-in
  properties of JavaScript API. Not recommended to override this setting.

- `debug` (default: `false`) — Mangle names with the original name still present.
  Pass an empty string `""` to enable, or a non-empty string to set the debug suffix.

- `domprops` (default: `false`) — Use `true` to allow the mangling of properties
  commonly found in Document Object Model. Not recommended to override this setting.

- `keep_fargs` (default: `false`) — Use `true` to prevent mangling of function
  arguments.

- `keep_quoted` (default: `false`) — Only mangle unquoted property names.

- `regex` (default: `null`) — Pass a RegExp literal to only mangle property
  names matching the regular expression.

- `reserved` (default: `[]`) — Do not mangle property names listed in the
  `reserved` array.

## Output options

The code generator tries to output shortest code possible by default.  In
case you want beautified output, pass `--beautify` (`-b`).  Optionally you
can pass additional arguments that control the code output:

- `annotations` (default: `false`) — pass `true` to retain comment annotations
  `/*@__PURE__*/` or `/*#__PURE__*/`, otherwise they will be discarded even if
  `comments` is set.

- `ascii_only` (default: `false`) — escape Unicode characters in strings and
  regexps (affects directives with non-ascii characters becoming invalid)

- `beautify` (default: `true`) — whether to actually beautify the output.
  Passing `-b` will set this to true. Use `-O` if you want to generate minified
  code and specify additional arguments.

- `braces` (default: `false`) — always insert braces in `if`, `for`,
  `do`, `while` or `with` statements, even if their body is a single
  statement.

- `comments` (default: `false`) — pass `true` or `"all"` to preserve all
  comments, `"some"` to preserve multi-line comments that contain `@cc_on`,
  `@license`, or `@preserve` (case-insensitive), a regular expression string
  (e.g. `/^!/`), or a function which returns `boolean`, e.g.
  ```javascript
  function(node, comment) {
      return comment.value.indexOf("@type " + node.TYPE) >= 0;
  }
  ```

- `extendscript` (default: `false`) — enable workarounds for Adobe ExtendScript
  bugs

- `galio` (default: `false`) — enable workarounds for ANT Galio bugs

- `indent_level` (default: `4`) — indent by specified number of spaces or the
  exact whitespace sequence supplied, e.g. `"\t"`.

- `indent_start` (default: `0`) — prefix all lines by whitespace sequence
  specified in the same format as `indent_level`.

- `inline_script` (default: `true`) — escape HTML comments and the slash in
  occurrences of `</script>` in strings

- `keep_quoted_props` (default: `false`) — when turned on, prevents stripping
  quotes from property names in object literals.

- `max_line_len` (default: `false`) — maximum line length (for uglified code)

- `preamble` (default: `null`) — when passed it must be a string and
  it will be prepended to the output literally.  The source map will
  adjust for this text.  Can be used to insert a comment containing
  licensing information, for example.

- `preserve_line` (default: `false`) — pass `true` to retain line numbering on
  a best effort basis.

- `quote_keys` (default: `false`) — pass `true` to quote all keys in literal
  objects

- `quote_style` (default: `0`) — preferred quote style for strings (affects
  quoted property names and directives as well):
  - `0` — prefers double quotes, switches to single quotes when there are
    more double quotes in the string itself. `0` is best for gzip size.
  - `1` — always use single quotes
  - `2` — always use double quotes
  - `3` — always use the original quotes

- `semicolons` (default: `true`) — separate statements with semicolons.  If
  you pass `false` then whenever possible we will use a newline instead of a
  semicolon, leading to more readable output of uglified code (size before
  gzip could be smaller; size after gzip insignificantly larger).

- `shebang` (default: `true`) — preserve shebang `#!` in preamble (bash scripts)

- `width` (default: `80`) — only takes effect when beautification is on, this
  specifies an (orientative) line width that the beautifier will try to
  obey.  It refers to the width of the line text (excluding indentation).
  It doesn't work very well currently, but it does make the code generated
  by UglifyJS more readable.

- `wrap_iife` (default: `false`) — pass `true` to wrap immediately invoked
  function expressions. See
  [#640](https://github.com/mishoo/UglifyJS/issues/640) for more details.

# Miscellaneous

### Keeping copyright notices or other comments

You can pass `--comments` to retain certain comments in the output.  By
default it will keep JSDoc-style comments that contain "@preserve",
"@license" or "@cc_on" (conditional compilation for IE).  You can pass
`--comments all` to keep all the comments, or a valid JavaScript regexp to
keep only comments that match this regexp.  For example `--comments /^!/`
will keep comments like `/*! Copyright Notice */`.

Note, however, that there might be situations where comments are lost.  For
example:
```javascript
function f() {
    /** @preserve Foo Bar */
    function g() {
        // this function is never called
    }
    return something();
}
```

Even though it has "@preserve", the comment will be lost because the inner
function `g` (which is the AST node to which the comment is attached to) is
discarded by the compressor as not referenced.

The safest comments where to place copyright information (or other info that
needs to be kept in the output) are comments attached to toplevel nodes.

### The `unsafe` `compress` option

It enables some transformations that *might* break code logic in certain
contrived cases, but should be fine for most code.  You might want to try it
on your own code, it should reduce the minified size.  Here's what happens
when this flag is on:

- `new Array(1, 2, 3)` or `Array(1, 2, 3)` → `[ 1, 2, 3 ]`
- `new Object()` → `{}`
- `String(exp)` or `exp.toString()` → `"" + exp`
- `new Object/RegExp/Function/Error/Array (...)` → we discard the `new`

### Conditional compilation

You can use the `--define` (`-d`) switch in order to declare global
variables that UglifyJS will assume to be constants (unless defined in
scope).  For example if you pass `--define DEBUG=false` then, coupled with
dead code removal UglifyJS will discard the following from the output:
```javascript
if (DEBUG) {
    console.log("debug stuff");
}
```

You can specify nested constants in the form of `--define env.DEBUG=false`.

UglifyJS will warn about the condition being always false and about dropping
unreachable code; for now there is no option to turn off only this specific
warning, you can pass `warnings=false` to turn off *all* warnings.

Another way of doing that is to declare your globals as constants in a
separate file and include it into the build.  For example you can have a
`build/defines.js` file with the following:
```javascript
var DEBUG = false;
var PRODUCTION = true;
// etc.
```

and build your code like this:

    uglifyjs build/defines.js js/foo.js js/bar.js... -c

UglifyJS will notice the constants and, since they cannot be altered, it
will evaluate references to them to the value itself and drop unreachable
code as usual.  The build will contain the `const` declarations if you use
them. If you are targeting < ES6 environments which does not support `const`,
using `var` with `reduce_vars` (enabled by default) should suffice.

### Conditional compilation API

You can also use conditional compilation via the programmatic API. With the difference that the
property name is `global_defs` and is a compressor property:

```javascript
var result = UglifyJS.minify(fs.readFileSync("input.js", "utf8"), {
    compress: {
        dead_code: true,
        global_defs: {
            DEBUG: false
        }
    }
});
```

To replace an identifier with an arbitrary non-constant expression it is
necessary to prefix the `global_defs` key with `"@"` to instruct UglifyJS
to parse the value as an expression:
```javascript
UglifyJS.minify("alert('hello');", {
    compress: {
        global_defs: {
            "@alert": "console.log"
        }
    }
}).code;
// returns: 'console.log("hello");'
```

Otherwise it would be replaced as string literal:
```javascript
UglifyJS.minify("alert('hello');", {
    compress: {
        global_defs: {
            "alert": "console.log"
        }
    }
}).code;
// returns: '"console.log"("hello");'
```

### Using native Uglify AST with `minify()`
```javascript
// example: parse only, produce native Uglify AST

var result = UglifyJS.minify(code, {
    parse: {},
    compress: false,
    mangle: false,
    output: {
        ast: true,
        code: false  // optional - faster if false
    }
});

// result.ast contains native Uglify AST
```
```javascript
// example: accept native Uglify AST input and then compress and mangle
//          to produce both code and native AST.

var result = UglifyJS.minify(ast, {
    compress: {},
    mangle: {},
    output: {
        ast: true,
        code: true  // optional - faster if false
    }
});

// result.ast contains native Uglify AST
// result.code contains the minified code in string form.
```

### Working with Uglify AST

Transversal and transformation of the native AST can be performed through
[`TreeWalker`](https://github.com/mishoo/UglifyJS/blob/master/lib/ast.js) and
[`TreeTransformer`](https://github.com/mishoo/UglifyJS/blob/master/lib/transform.js)
respectively.

### ESTree / SpiderMonkey AST

UglifyJS has its own abstract syntax tree format; for
[practical reasons](http://lisperator.net/blog/uglifyjs-why-not-switching-to-spidermonkey-ast/)
we can't easily change to using the SpiderMonkey AST internally.  However,
UglifyJS now has a converter which can import a SpiderMonkey AST.

For example [Acorn][acorn] is a super-fast parser that produces a
SpiderMonkey AST.  It has a small CLI utility that parses one file and dumps
the AST in JSON on the standard output.  To use UglifyJS to mangle and
compress that:

    acorn file.js | uglifyjs -p spidermonkey -m -c

The `-p spidermonkey` option tells UglifyJS that all input files are not
JavaScript, but JS code described in SpiderMonkey AST in JSON.  Therefore we
don't use our own parser in this case, but just transform that AST into our
internal AST.

### Use Acorn for parsing

More for fun, I added the `-p acorn` option which will use Acorn to do all
the parsing.  If you pass this option, UglifyJS will `require("acorn")`.

Acorn is really fast (e.g. 250ms instead of 380ms on some 650K code), but
converting the SpiderMonkey tree that Acorn produces takes another 150ms so
in total it's a bit more than just using UglifyJS's own parser.

[acorn]: https://github.com/ternjs/acorn
[sm-spec]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k

### Uglify Fast Minify Mode

It's not well known, but whitespace removal and symbol mangling accounts
for 95% of the size reduction in minified code for most JavaScript - not
elaborate code transforms. One can simply disable `compress` to speed up
Uglify builds by 3 to 5 times.

| d3.js | minify size | gzip size | minify time (seconds) |
| --- | ---: | ---: | ---: |
| original | 511,371 | 119,932 | - |
| uglify-js@3.13.0 mangle=false, compress=false | 363,988 | 95,695 | 0.56 |
| uglify-js@3.13.0 mangle=true, compress=false | 253,305 | 81,281 | 0.99 |
| uglify-js@3.13.0 mangle=true, compress=true | 244,436 | 79,854 | 5.30 |

To enable fast minify mode from the CLI use:
```
uglifyjs file.js -m
```
To enable fast minify mode with the API use:
```javascript
UglifyJS.minify(code, { compress: false, mangle: true });
```

### Source maps and debugging

Various `compress` transforms that simplify, rearrange, inline and remove code
are known to have an adverse effect on debugging with source maps. This is
expected as code is optimized and mappings are often simply not possible as
some code no longer exists. For highest fidelity in source map debugging
disable the Uglify `compress` option and just use `mangle`.

### Compiler assumptions

To allow for better optimizations, the compiler makes various assumptions:

- The code does not rely on preserving its runtime performance characteristics.
  Typically uglified code will run faster due to less instructions and easier
  inlining, but may be slower on rare occasions for a specific platform, e.g.
  see [`reduce_funcs`](#compress-options).
- `.toString()` and `.valueOf()` don't have side effects, and for built-in
  objects they have not been overridden.
- `undefined`, `NaN` and `Infinity` have not been externally redefined.
- `arguments.callee`, `arguments.caller` and `Function.prototype.caller` are not used.
- The code doesn't expect the contents of `Function.prototype.toString()` or
  `Error.prototype.stack` to be anything in particular.
- Getting and setting properties on a plain object does not cause other side effects
  (using `.watch()` or `Proxy`).
- Object properties can be added, removed and modified (not prevented with
  `Object.defineProperty()`, `Object.defineProperties()`, `Object.freeze()`,
  `Object.preventExtensions()` or `Object.seal()`).
- If array destructuring is present, index-like properties in `Array.prototype`
  have not been overridden:
  ```javascript
  Object.prototype[0] = 42;
  var [ a ] = [];
  var { 0: b } = {};
  // 42 undefined
  console.log([][0], a);
  // 42 42
  console.log({}[0], b);
  ```
- Earlier versions of JavaScript will throw `SyntaxError` with the following:
  ```javascript
  ({
      p: 42,
      get p() {},
  });
  // SyntaxError: Object literal may not have data and accessor property with
  //              the same name
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Iteration order of keys over an object which contains spread syntax in later
  versions of Chrome and Node.js may be altered.
- When `toplevel` is enabled, UglifyJS effectively assumes input code is wrapped
  within `function(){ ... }`, thus forbids aliasing of declared global variables:
  ```javascript
  A = "FAIL";
  var B = "FAIL";
  // can be `global`, `self`, `window` etc.
  var top = function() {
      return this;
  }();
  // "PASS"
  top.A = "PASS";
  console.log(A);
  // "FAIL" after compress and/or mangle
  top.B = "PASS";
  console.log(B);
  ```
- Use of `arguments` alongside destructuring as function parameters, e.g.
  `function({}, arguments) {}` will result in `SyntaxError` in earlier versions
  of Chrome and Node.js - UglifyJS may modify the input which in turn may
  suppress those errors.
- Earlier versions of Chrome and Node.js will throw `ReferenceError` with the
  following:
  ```javascript
  var a;
  try {
      throw 42;
  } catch ({
      [a]: b,
      // ReferenceError: a is not defined
  }) {
      let a;
  }
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Later versions of JavaScript will throw `SyntaxError` with the following:
  ```javascript
  a => {
      let a;
  };
  // SyntaxError: Identifier 'a' has already been declared
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Later versions of JavaScript will throw `SyntaxError` with the following:
  ```javascript
  try {
      // ...
  } catch ({ message: a }) {
      var a;
  }
  // SyntaxError: Identifier 'a' has already been declared
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Some versions of Chrome and Node.js will throw `ReferenceError` with the
  following:
  ```javascript
  console.log(((a, b = function() {
      return a;
      // ReferenceError: a is not defined
  }()) => b)());
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Some arithmetic operations with `BigInt` may throw `TypeError`:
  ```javascript
  1n + 1;
  // TypeError: can't convert BigInt to number
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Some versions of JavaScript will throw `SyntaxError` with the
  following:
  ```javascript
  console.log(String.raw`\uFo`);
  // SyntaxError: Invalid Unicode escape sequence
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Some versions of JavaScript will throw `SyntaxError` with the
  following:
  ```javascript
  try {} catch (e) {
      for (var e of []);
  }
  // SyntaxError: Identifier 'e' has already been declared
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Some versions of Chrome and Node.js will give incorrect results with the
  following:
  ```javascript
  console.log({
      ...{
          set 42(v) {},
          42: "PASS",
      },
  });
  // Expected: { '42': 'PASS' }
  // Actual:   { '42': undefined }
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Later versions of JavaScript will throw `SyntaxError` with the following:
  ```javascript
  var await;
  class A {
      static p = await;
  }
  // SyntaxError: Unexpected reserved word
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Later versions of JavaScript will throw `SyntaxError` with the following:
  ```javascript
  var async;
  for (async of []);
  // SyntaxError: The left-hand side of a for-of loop may not be 'async'.
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Some versions of Chrome and Node.js will give incorrect results with the
  following:
  ```javascript
  console.log({
      ...console,
      get 42() {
          return "FAIL";
      },
      [42]: "PASS",
  }[42], {
      ...console,
      get 42() {
          return "FAIL";
      },
      42: "PASS",
  }[42]);
  // Expected: "PASS PASS"
  // Actual:   "PASS FAIL"
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Earlier versions of JavaScript will throw `TypeError` with the following:
  ```javascript
  (function() {
      {
          const a = "foo";
      }
      {
          const a = "bar";
      }
  })();
  // TypeError: const 'a' has already been declared
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Later versions of Chrome and Node.js will give incorrect results with the
  following:
  ```javascript
  try {
      class A {
          static 42;
          static get 42() {}
      }
      console.log("PASS");
  } catch (e) {
      console.log("FAIL");
  }
  // Expected: "PASS"
  // Actual:   "FAIL"
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Some versions of Chrome and Node.js will give incorrect results with the
  following:
  ```javascript
  (async function(a) {
      (function() {
          var b = await => console.log("PASS");
          b();
      })();
  })().catch(console.error);
  // Expected: "PASS"
  // Actual:   SyntaxError: Unexpected reserved word
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Later versions of Chrome and Node.js will give incorrect results with the
  following:
  ```javascript
  try {
      f();
      function f() {
          throw 42;
      }
  } catch (e) {
      console.log(typeof f, e);
  }
  // Expected: "function 42"
  // Actual:   "undefined 42"
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Later versions of JavaScript will throw `SyntaxError` with the following:
  ```javascript
  "use strict";
  console.log(function f() {
      return f = "PASS";
  }());
  // Expected: "PASS"
  // Actual:   TypeError: invalid assignment to const 'f'
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Adobe ExtendScript will give incorrect results with the following:
  ```javascript
  alert(true ? "PASS" : false ? "FAIL" : null);
  // Expected: "PASS"
  // Actual:   "FAIL"
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
- Adobe ExtendScript will give incorrect results with the following:
  ```javascript
  alert(42 ? null ? "FAIL" : "PASS" : "FAIL");
  // Expected: "PASS"
  // Actual:   SyntaxError: Expected: :
  ```
  UglifyJS may modify the input which in turn may suppress those errors.
