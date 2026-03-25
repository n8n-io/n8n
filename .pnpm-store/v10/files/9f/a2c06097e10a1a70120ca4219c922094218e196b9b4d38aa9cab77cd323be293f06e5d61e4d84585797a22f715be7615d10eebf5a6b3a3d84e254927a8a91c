# recast, _v_. ![CI](https://github.com/benjamn/recast/workflows/CI/badge.svg) [![Join the chat at https://gitter.im/benjamn/recast](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/benjamn/recast?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

1. to give (a metal object) a different form by melting it down and reshaping it.
1. to form, fashion, or arrange again.
1. to remodel or reconstruct (a literary work, document, sentence, etc.).
1. to supply (a theater or opera work) with a new cast.

## Installation

From npm:

    npm install recast

From GitHub:

    cd path/to/node_modules
    git clone git://github.com/benjamn/recast.git
    cd recast
    npm install .

## Import style

Recast is designed to be imported using **named** imports:

```js
import { parse, print } from "recast";
console.log(print(parse(source)).code);

import * as recast from "recast";
console.log(recast.print(recast.parse(source)).code);
```

If you're using CommonJS:

```js
const { parse, print } = require("recast");
console.log(print(parse(source)).code);

const recast = require("recast");
console.log(recast.print(recast.parse(source)).code);
```

## Usage

Recast exposes two essential interfaces, one for parsing JavaScript code (`require("recast").parse`) and the other for reprinting modified syntax trees (`require("recast").print`).

Here's a simple but non-trivial example of how you might use `.parse` and `.print`:

```js
import * as recast from "recast";

// Let's turn this function declaration into a variable declaration.
const code = [
  "function add(a, b) {",
  "  return a +",
  "    // Weird formatting, huh?",
  "    b;",
  "}"
].join("\n");

// Parse the code using an interface similar to require("esprima").parse.
const ast = recast.parse(code);
```

Now do _whatever_ you want to `ast`. Really, anything at all!

See [ast-types](https://github.com/benjamn/ast-types) (especially the [def/core.ts](https://github.com/benjamn/ast-types/blob/master/def/core.ts)) module for a thorough overview of the `ast` API.

```js
// Grab a reference to the function declaration we just parsed.
const add = ast.program.body[0];

// Make sure it's a FunctionDeclaration (optional).
const n = recast.types.namedTypes;
n.FunctionDeclaration.assert(add);

// If you choose to use recast.builders to construct new AST nodes, all builder
// arguments will be dynamically type-checked against the Mozilla Parser API.
const b = recast.types.builders;

// This kind of manipulation should seem familiar if you've used Esprima or the
// Mozilla Parser API before.
ast.program.body[0] = b.variableDeclaration("var", [
  b.variableDeclarator(add.id, b.functionExpression(
    null, // Anonymize the function expression.
    add.params,
    add.body
  ))
]);

// Just for fun, because addition is commutative:
add.params.push(add.params.shift());
```

When you finish manipulating the AST, let `recast.print` work its magic:

```js
const output = recast.print(ast).code;
```

The `output` string now looks exactly like this, weird formatting and all:

```js
var add = function(b, a) {
  return a +
    // Weird formatting, huh?
    b;
}
```

The magic of Recast is that it reprints only those parts of the syntax tree that you modify. In other words, the following identity is guaranteed:

```js
recast.print(recast.parse(source)).code === source
```

Whenever Recast cannot reprint a modified node using the original source code, it falls back to using a generic pretty printer. So the worst that can happen is that your changes trigger some harmless reformatting of your code.

If you really don't care about preserving the original formatting, you can access the pretty printer directly:

```js
var output = recast.prettyPrint(ast, { tabWidth: 2 }).code;
```

And here's the exact `output`:

```js
var add = function(b, a) {
  return a + b;
}
```

Note that the weird formatting was discarded, yet the behavior and abstract structure of the code remain the same.

## Using a different parser

By default, Recast uses the [Esprima JavaScript parser](https://www.npmjs.com/package/esprima) when you call `recast.parse(code)`. While Esprima supports almost all modern ECMAScript syntax, you may want to use a different parser to enable TypeScript or Flow syntax, or just because you want to match other compilation tools you might be using.

In order to get any benefits from Recast's conservative pretty-printing, **it is very important that you continue to call `recast.parse`** (rather than parsing the AST yourself using a different parser), and simply instruct `recast.parse` to use a different parser:

```js
const acornAst = recast.parse(source, {
  parser: require("acorn")
});
```

Why is this so important? When you call `recast.parse`, it makes a shadow copy of the AST before returning it to you, giving every copied AST node a reference back to the original through a special `.original` property. This information is what enables `recast.print` to detect where the AST has been modified, so that it can preserve formatting for parts of the AST that were not modified.

Any `parser` object that supports a `parser.parse(source)` method will work here; however, if your parser requires additional options, you can always implement your own `parse` method that invokes your parser with custom options:

```js
const acornAst = recast.parse(source, {
  parser: {
    parse(source) {
      return require("acorn").parse(source, {
        // additional options
      });
    }
  }
});
```

To take some of the guesswork out of configuring common parsers, Recast provides [several preconfigured parsers](https://github.com/benjamn/recast/tree/master/parsers), so you can parse TypeScript (for example) without worrying about the configuration details:

```js
const tsAst = recast.parse(source, {
  parser: require("recast/parsers/typescript")
});
```

**Note:** Some of these parsers import npm packages that Recast does not directly depend upon, so please be aware you may have to run `npm install @babel/parser` to use the `typescript`, `flow`, or `babel` parsers, or `npm install acorn` to use the `acorn` parser. Only Esprima is installed by default when Recast is installed.

After calling `recast.parse`, if you're going to transform the AST, make sure that the `.original` property is preserved. With Babel, for instance, if you call `transformFromAST`, you must pass `cloneInputAst: false` in its options. ([More detail](https://github.com/babel/babel/issues/12882).

## Source maps

One of the coolest consequences of tracking and reusing original source code during reprinting is that it's pretty easy to generate a high-resolution mapping between the original code and the generated code—completely automatically!

With every `slice`, `join`, and re-`indent`-ation, the reprinting process maintains exact knowledge of which character sequences are original, and where in the original source they came from.

All you have to think about is how to manipulate the syntax tree, and Recast will give you a [source map](https://github.com/mozilla/source-map) in exchange for specifying the names of your source file(s) and the desired name of the map:

```js
var result = recast.print(transform(recast.parse(source, {
  sourceFileName: "source.js"
})), {
  sourceMapName: "source.min.js"
});

console.log(result.code); // Resulting string of code.
console.log(result.map); // JSON source map.

var SourceMapConsumer = require("source-map").SourceMapConsumer;
var smc = new SourceMapConsumer(result.map);
console.log(smc.originalPositionFor({
  line: 3,
  column: 15
})); // { source: 'source.js',
     //   line: 2,
     //   column: 10,
     //   name: null }
```

Note that you are free to mix and match syntax trees parsed from different source files, and the resulting source map will automatically keep track of the separate file origins for you.

Note also that the source maps generated by Recast are character-by-character maps, so meaningful identifier names are not recorded at this time. This approach leads to higher-resolution debugging in modern browsers, at the expense of somewhat larger map sizes. Striking the perfect balance here is an area for future exploration, but such improvements will not require any breaking changes to the interface demonstrated above.

## Options

All Recast API functions take second parameter with configuration options, documented in
[options.ts](https://github.com/benjamn/recast/blob/master/lib/options.ts)

## Motivation

The more code you have, the harder it becomes to make big, sweeping changes quickly and confidently. Even if you trust yourself not to make too many mistakes, and no matter how proficient you are with your text editor, changing tens of thousands of lines of code takes precious, non-refundable time.

Is there a better way? Not always! When a task requires you to alter the semantics of many different pieces of code in subtly different ways, your brain inevitably becomes the bottleneck, and there is little hope of completely automating the process. Your best bet is to plan carefully, buckle down, and get it right the first time. Love it or loathe it, that's the way programming goes sometimes.

What I hope to eliminate are the brain-wasting tasks, the tasks that are bottlenecked by keystrokes, the tasks that can be expressed as operations on the _syntactic structure_ of your code. Specifically, my goal is to make it possible for you to run your code through a parser, manipulate the abstract syntax tree directly, subject only to the constraints of your imagination, and then automatically translate those modifications back into source code, without upsetting the formatting of unmodified code.

And here's the best part: when you're done running a Recast script, if you're not completely satisfied with the results, blow them away with `git reset --hard`, tweak the script, and just run it again. Change your mind as many times as you like. Instead of typing yourself into a nasty case of [RSI](http://en.wikipedia.org/wiki/Repetitive_strain_injury), gaze upon your new wells of free time and ask yourself: what next?
