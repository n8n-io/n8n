# regexp-tree

[![Build Status](https://travis-ci.org/DmitrySoshnikov/regexp-tree.svg?branch=master)](https://travis-ci.org/DmitrySoshnikov/regexp-tree) [![npm version](https://badge.fury.io/js/regexp-tree.svg)](https://badge.fury.io/js/regexp-tree) [![npm downloads](https://img.shields.io/npm/dt/regexp-tree.svg)](https://www.npmjs.com/package/regexp-tree)

Regular expressions processor in JavaScript

TL;DR: **RegExp Tree** is a _regular expressions processor_, which includes _parser_, _traversal_, _transformer_, _optimizer_, and _interpreter_ APIs.

You can get an overview of the tool in [this article](https://medium.com/@DmitrySoshnikov/regexp-tree-a-regular-expressions-parser-with-a-simple-ast-format-bcd4d5580df6).

### Table of Contents

- [Installation](#installation)
- [Development](#development)
- [Usage as a CLI](#usage-as-a-cli)
- [Usage from Node](#usage-from-node)
- [Capturing locations](#capturing-locations)
- [Parsing options](#parsing-options)
- [Using traversal API](#using-traversal-api)
- [Using transform API](#using-transform-api)
  - [Transform plugins](#transform-plugins)
- [Using generator API](#using-generator-api)
- [Using optimizer API](#using-optimizer-api)
  - [Optimizer ESLint plugin](#optimizer-eslint-plugin)
- [Using compat-transpiler API](#using-compat-transpiler-api)
  - [Compat-transpiler Babel plugin](#compat-transpiler-babel-plugin)
- [RegExp extensions](#regexp-extensions)
  - [RegExp extensions Babel plugin](#regexp-extensions-babel-plugin)
- [Creating RegExp objects](#creating-regexp-objects)
- [Executing regexes](#executing-regexes)
- [Using interpreter API](#using-interpreter-api)
  - [Printing NFA/DFA tables](#printing-nfadfa-tables)
- [AST nodes specification](#ast-nodes-specification)

### Installation

The parser can be installed as an [npm module](https://www.npmjs.com/package/regexp-tree):

```
npm install -g regexp-tree
```

You can also [try it online](https://astexplorer.net/#/gist/4ea2b52f0e546af6fb14f9b2f5671c1c/39b55944da3e5782396ffa1fea3ba68d126cd394) using _AST Explorer_.

### Development

1. Fork https://github.com/DmitrySoshnikov/regexp-tree repo
2. If there is an actual issue from the [issues](https://github.com/DmitrySoshnikov/regexp-tree/issues) list you'd like to work on, feel free to assign it yourself, or comment on it to avoid collisions (open a new issue if needed)
3. Make your changes
4. Make sure `npm test` still passes (add new tests if needed)
5. Submit a PR

The _regexp-tree_ parser is implemented as an automatic LR parser using [Syntax](https://www.npmjs.com/package/syntax-cli) tool. The parser module is generated from the [regexp grammar](https://github.com/DmitrySoshnikov/regexp-tree/blob/master/src/parser/regexp.bnf), which is based on the regular expressions grammar used in ECMAScript.

For development from the github repository, run `build` command to generate the parser module, and transpile JS code:

```
git clone https://github.com/<your-github-account>/regexp-tree.git
cd regexp-tree
npm install
npm run build
```

> NOTE: JS code transpilation is used to support older versions of Node. For faster development cycle you can use `npm run watch` command, which continuously transpiles JS code.

### Usage as a CLI

**Note:** the CLI is exposed as its own [regexp-tree-cli](https://www.npmjs.com/package/regexp-tree-cli) module.

Check the options available from CLI:

```
regexp-tree-cli --help
```

```
Usage: regexp-tree-cli [options]

Options:
   -e, --expression   A regular expression to be parsed
   -l, --loc          Whether to capture AST node locations
   -o, --optimize     Applies optimizer on the passed expression
   -c, --compat       Applies compat-transpiler on the passed expression
   -t, --table        Print NFA/DFA transition tables (nfa/dfa/all)
```

To parse a regular expression, pass `-e` option:

```
regexp-tree-cli -e '/a|b/i'
```

Which produces an AST node corresponding to this regular expression:

```js
{
  type: 'RegExp',
  body: {
    type: 'Disjunction',
    left: {
      type: 'Char',
      value: 'a',
      symbol: 'a',
      kind: 'simple',
      codePoint: 97
    },
    right: {
      type: 'Char',
      value: 'b',
      symbol: 'b',
      kind: 'simple',
      codePoint: 98
    }
  },
  flags: 'i',
}
```

> NOTE: the format of a regexp is `/ Body / OptionalFlags`.

### Usage from Node

The parser can also be used as a Node module:

```js
const regexpTree = require('regexp-tree');

console.log(regexpTree.parse(/a|b/i)); // RegExp AST
```

Note, _regexp-tree_ supports parsing regexes from strings, and also from actual `RegExp` objects (in general -- from any object which can be coerced to a string). If some feature is not implemented yet in an actual JavaScript RegExp, it should be passed as a string:

```js
// Pass an actual JS RegExp object.
regexpTree.parse(/a|b/i);

// Pass a string, since `s` flag may not be supported in older versions.
regexpTree.parse('/./s');
```

Also note, that in string-mode, escaping is done using two slashes `\\` per JavaScript:

```js
// As an actual regexp.
regexpTree.parse(/\n/);

// As a string.
regexpTree.parse('/\\n/');
```

### Capturing locations

For source code transformation tools it might be useful also to capture _locations_ of the AST nodes. From the command line it's controlled via the `-l` option:

```
regexp-tree-cli -e '/ab/' -l
```

This attaches `loc` object to each AST node:

```js
{
  type: 'RegExp',
  body: {
    type: 'Alternative',
    expressions: [
      {
        type: 'Char',
        value: 'a',
        symbol: 'a',
        kind: 'simple',
        codePoint: 97,
        loc: {
          start: {
            line: 1,
            column: 1,
            offset: 1,
          },
          end: {
            line: 1,
            column: 2,
            offset: 2,
          },
        }
      },
      {
        type: 'Char',
        value: 'b',
        symbol: 'b',
        kind: 'simple',
        codePoint: 98,
        loc: {
          start: {
            line: 1,
            column: 2,
            offset: 2,
          },
          end: {
            line: 1,
            column: 3,
            offset: 3,
          },
        }
      }
    ],
    loc: {
      start: {
        line: 1,
        column: 1,
        offset: 1,
      },
      end: {
        line: 1,
        column: 3,
        offset: 3,
      },
    }
  },
  flags: '',
  loc: {
    start: {
      line: 1,
      column: 0,
      offset: 0,
    },
    end: {
      line: 1,
      column: 4,
      offset: 4,
    },
  }
}
```

From Node it's controlled via `setOptions` method exposed on the parser:

```js
const regexpTree = require('regexp-tree');

const parsed = regexpTree
  .parser
  .setOptions({captureLocations: true})
  .parse(/a|b/);
```

The `setOptions` method sets global options, which are preserved between calls. It is also possible to provide options per a single `parse` call, which might be more preferred:

```js
const regexpTree = require('regexp-tree');

const parsed = regexpTree.parse(/a|b/, {
  captureLocations: true,
});
```

### Parsing options

The parser supports several options which can be set globally via the `setOptions` method on the parser, or by passing them with each `parse` method invocation.

Example:

```js
const regexpTree = require('regexp-tree');

const parsed = regexpTree.parse(/a|b/, {
  allowGroupNameDuplicates: true,
});
```

The following options are supported:

- `captureLocations: boolean` -- whether to capture AST node [locations](#capturing-locations) (`false` by default)
- `allowGroupNameDuplicates: boolean` -- whether to skip duplicates check of the [named capturing groups](#named-capturing-group)

Set `allowGroupNameDuplicates` would make the following expression possible:

```regexp
/
  # YYY-MM-DD date format:

  (?<year>  \d{4}) -
  (?<month> \d{2}) -
  (?<day>   \d{2})

  |

  # DD.MM.YYY date format

  (?<day>   \d{2}) .
  (?<month> \d{2}) .
  (?<year>  \d{4})

/x
```

### Using traversal API

The [traverse](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/traverse) module allows handling needed AST nodes using the _visitor_ pattern. In Node the module is exposed as the `regexpTree.traverse` method. Handlers receive an instance of the [NodePath](https://github.com/DmitrySoshnikov/regexp-tree/blob/master/src/traverse/README.md#nodepath-class) class, which encapsulates `node` itself, its `parent` node, `property`, and `index` (in case the node is part of a collection).

Visiting a node follows this algorithm:
- call `pre` handler.
- recurse into node's children.
- call `post` handler.

For each node type of interest, you can provide either:
- a function (`pre`).
- an object with members `pre` and `post`.

You can also provide a `*` handler which will be executed on every node.

Example:

```js
const regexpTree = require('regexp-tree');

// Get AST.
const ast = regexpTree.parse('/[a-z]{1,}/');

// Traverse AST nodes.
regexpTree.traverse(ast, {

  // Visit every node before any type-specific handlers.
  '*': function({node}) {
    ...
  },

  // Handle "Quantifier" node type.
  Quantifier({node}) {
    ...
  },

  // Handle "Char" node type, before and after.
  Char: {
    pre({node}) {
      ...
    },
    post({node}) {
      ...
    }
  }

});

// Generate the regexp.
const re = regexpTree.generate(ast);

console.log(re); // '/[a-z]+/'
```

### Using transform API

> NOTE: you can play with transformation APIs, and write actual transforms for quick tests in AST Explorer. See [this example](http://astexplorer.net/#/gist/d293d22742b42cd1f7ee7b7e5dc6f697/39b0aabc42fb6fb106b9e368341d3300098f08c0).

While traverse module provides basic traversal API, which can be used for any purposes of AST handling, _transform_ module focuses mainly on _transformation_ of regular expressions.

It accepts a regular expressions in different formats (string, an actual `RegExp` object, or an AST), applies a set of transformations, and retuns an instance of [TransformResult](https://github.com/DmitrySoshnikov/regexp-tree/blob/master/src/transform/README.md#transformresult). Handles receive as a parameter the same [NodePath](https://github.com/DmitrySoshnikov/regexp-tree/blob/master/src/traverse/README.md#nodepath-class) object used in traverse.

Example:

```js
const regexpTree = require('regexp-tree');

// Handle nodes.
const re = regexpTree.transform('/[a-z]{1,}/i', {

  /**
   * Handle "Quantifier" node type,
   * transforming `{1,}` quantifier to `+`.
   */
  Quantifier(path) {
    const {node} = path;

    // {1,} -> +
    if (
      node.kind === 'Range' &&
      node.from === 1 &&
      !node.to
    ) {
      path.replace({
        type: 'Quantifier',
        kind: '+',
        greedy: node.greedy,
      });
    }
  },
});

console.log(re.toString()); // '/[a-z]+/i'
console.log(re.toRegExp()); // /[a-z]+/i
console.log(re.getAST()); // AST for /[a-z]+/i
```

#### Transform plugins

A _transformation plugin_ is a module which exports a _transformation handler_. We have seen [above](#using-transform-api) how we can pass a handler object directly to the `regexpTree.transform` method, here we extract it into a separate module, so it can be implemented and shared independently:

Example of a plugin:

```js
// file: ./regexp-tree-a-to-b-transform.js


/**
 * This plugin replaces chars 'a' with chars 'b'.
 */
module.exports = {
  Char({node}) {
    if (node.kind === 'simple' && node.value === 'a') {
      node.value = 'b';
      node.symbol = 'b';
      node.codePoint = 98;
    }
  },
};
```

Once we have this plugin ready, we can require it, and pass to the `transform` function:

```js
const regexpTree = require('regexp-tree');
const plugin = require('./regexp-tree-a-to-b-transform');

const re = regexpTree.transform(/(a|c)a+[a-z]/, plugin);

console.log(re.toRegExp()); // /(b|c)b+[b-z]/
```

> NOTE: we can also pass a _list of plugins_ to the `regexpTree.transform`. In this case the plugins are applied in one pass in order. Another approach is to run several sequential calls to `transform`, setting up a pipeline, when a transformed AST is passed further to another plugin, etc.

You can see other examples of transform plugins in the [optimizer/transforms](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/optimizer/transforms) or in the [compat-transpiler/transforms](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/compat-transpiler/transforms) directories.

### Using generator API

The [generator](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/generator) module generates regular expressions from corresponding AST nodes. In Node the module is exposed as `regexpTree.generate` method.

Example:

```js
const regexpTree = require('regexp-tree');

const re = regexpTree.generate({
  type: 'RegExp',
  body: {
    type: 'Char',
    value: 'a',
    symbol: 'a',
    kind: 'simple',
    codePoint: 97
  },
  flags: 'i',
});

console.log(re); // '/a/i'
```

### Using optimizer API

[Optimizer](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/optimizer) transforms your regexp into an _optimized_ version, replacing some sub-expressions with their idiomatic patterns. This might be good for different kinds of minifiers, as well as for regexp machines.

> NOTE: the Optimizer is implemented as a set of _regexp-tree_ [plugins](#transform-plugins).

Example:

```js
const regexpTree = require('regexp-tree');

const originalRe = /[a-zA-Z_0-9][A-Z_\da-z]*\e{1,}/;

const optimizedRe = regexpTree
  .optimize(originalRe)
  .toRegExp();

console.log(optimizedRe); // /\w+e+/
```

From CLI the optimizer is available via `--optimize` (`-o`) option:

```
regexp-tree-cli -e '/[a-zA-Z_0-9][A-Z_\da-z]*\e{1,}/' -o
```

Result:

```
Optimized: /\w+e+/
```

See the [optimizer README](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/optimizer) for more details.

#### Optimizer ESLint plugin

The [optimizer](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/optimizer) module is also available as an _ESLint plugin_, which can be installed at: [eslint-plugin-optimize-regex](https://www.npmjs.com/package/eslint-plugin-optimize-regex).

### Using compat-transpiler API

The [compat-transpiler](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/compat-transpiler) module translates your regexp in new format or in new syntax, into an equivalent regexp in a legacy representation, so it can be used in engines which don't yet implement the new syntax.

> NOTE: the compat-transpiler is implemented as a set of _regexp-tree_ [plugins](#transform-plugins).

Example, "dotAll" `s` flag:


```js
/./s
```

Is translated into:

```js
/[\0-\uFFFF]/
```

Or [named capturing groups](#named-capturing-group):

```js
/(?<value>a)\k<value>\1/
```

Becomes:

```js
/(a)\1\1/
```

To use the API from Node:

```js
const regexpTree = require('regexp-tree');

// Using new syntax.
const originalRe = '/(?<all>.)\\k<all>/s';

// For legacy engines.
const compatTranspiledRe = regexpTree
  .compatTranspile(originalRe)
  .toRegExp();

console.log(compatTranspiledRe); // /([\0-\uFFFF])\1/
```

From CLI the compat-transpiler is available via `--compat` (`-c`) option:

```
regexp-tree-cli -e '/(?<all>.)\k<all>/s' -c
```

Result:

```
Compat: /([\0-\uFFFF])\1/
```

#### Compat-transpiler Babel plugin

The [compat-transpiler](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/compat-transpiler) module is also available as a _Babel plugin_, which can be installed at: [babel-plugin-transform-modern-regexp](https://www.npmjs.com/package/babel-plugin-transform-modern-regexp).

Note, the plugin also includes [extended regexp](#regexp-extensions) features.

### RegExp extensions

Some of the _non-standard_ feature are also supported by _regexp-tree_.

> NOTE: _"non-standard"_ means specifically ECMAScript standard, since in other regexp egnines, e.g. PCRE, Python, etc. these features are standard.

One of such features is the `x` flag, which enables _extended_ mode of regular expressions. In this mode most of whitespaces are ignored, and expressions can use #-comments.

Example:

```regex
/
  # A regular expression for date.

  (?<year>\d{4})-    # year part of a date
  (?<month>\d{2})-   # month part of a date
  (?<day>\d{2})      # day part of a date

/x
```

This is normally parsed by the _regexp-tree_ parser, and [compat-transpiler](#using-compat-transpiler-api) has full support for it; it's translated into:

```regex
/(\d{4})-(\d{2})-(\d{2})/
```

#### RegExp extensions Babel plugin

The regexp extensions are also available as a _Babel plugin_, which can be installed at: [babel-plugin-transform-modern-regexp](https://www.npmjs.com/package/babel-plugin-transform-modern-regexp).

Note, the plugin also includes [compat-transpiler](#using-compat-transpiler-api) features.

### Creating RegExp objects

To create an actual `RegExp` JavaScript object, we can use `regexpTree.toRegExp` method:

```js
const regexpTree = require('regexp-tree');

const re = regexpTree.toRegExp('/[a-z]/i');

console.log(
  re.test('a'), // true
  re.test('Z'), // true
);
```

### Executing regexes

It is also possible to execute regular expressions using `exec` API method, which has support for new syntax, and features, such as [named capturing group](#named-capturing-group), etc:

```js
const regexpTree = require('regexp-tree');

const re = `/

  # A regular expression for date.

  (?<year>\\d{4})-    # year part of a date
  (?<month>\\d{2})-   # month part of a date
  (?<day>\\d{2})      # day part of a date

/x`;

const string = '2017-04-14';

const result = regexpTree.exec(re, string);

console.log(result.groups); // {year: '2017', month: '04', day: '14'}
```

### Using interpreter API

> NOTE: you can read more about implementation details of the interpreter in [this series of articles](https://medium.com/@DmitrySoshnikov/building-a-regexp-machine-part-1-regular-grammars-d4986b585d7e).

In addition to executing regular expressions using JavaScript built-in RegExp engine, RegExp Tree also implements own [interpreter](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/interpreter/finite-automaton) based on classic NFA/DFA finite automaton engine.

Currently it aims educational purposes -- to trace the regexp matching process, transitioning in NFA/DFA states. It also allows building state transitioning table, which can be used for custom implementation. In API the module is exposed as `fa` (finite-automaton) object.

Example:

```js
const {fa} = require('regexp-tree');

const re = /ab|c*/;

console.log(fa.test(re, 'ab')); // true
console.log(fa.test(re, '')); // true
console.log(fa.test(re, 'c')); // true

// NFA, and its transition table.
const nfa = fa.toNFA(re);
console.log(nfa.getTransitionTable());

// DFA, and its transition table.
const dfa = fa.toDFA(re);
console.log(dfa.getTransitionTable());
```

For more granular work with NFA and DFA, `fa` module also exposes convenient builders, so you can build NFA fragments directly:

```js
const {fa} = require('regexp-tree');

const {
  alt,
  char,
  or,
  rep,
} = fa.builders;

// ab|c*
const re = or(
  alt(char('a'), char('b')),
  rep(char('c'))
);

console.log(re.matches('ab')); // true
console.log(re.matches('')); // true
console.log(re.matches('c')); // true

// Build DFA from NFA
const {DFA} = fa;

const reDFA = new DFA(re);

console.log(reDFA.matches('ab')); // true
console.log(reDFA.matches('')); // true
console.log(reDFA.matches('c')); // true
```

#### Printing NFA/DFA tables

The `--table` option allows displaying NFA/DFA transition tables. RegExp Tree also applies _DFA minimization_ (using _N-equivalence_ algorithm), and produces the minimal transition table as its final result.

In the example below for the `/a|b|c/` regexp, we first obtain the NFA transition table, which is further converted to the original DFA transition table (down from the 10 non-deterministic states to 4 deterministic states), and eventually minimized to the final DFA table (from 4 to only 2 states).

```
./bin/regexp-tree-cli -e '/a|b|c/' --table all
```

Result:

```
> - starting
✓ - accepting

NFA transition table:

┌─────┬───┬───┬────┬─────────────┐
│     │ a │ b │ c  │ ε*          │
├─────┼───┼───┼────┼─────────────┤
│ 1 > │   │   │    │ {1,2,3,7,9} │
├─────┼───┼───┼────┼─────────────┤
│ 2   │   │   │    │ {2,3,7}     │
├─────┼───┼───┼────┼─────────────┤
│ 3   │ 4 │   │    │ 3           │
├─────┼───┼───┼────┼─────────────┤
│ 4   │   │   │    │ {4,5,6}     │
├─────┼───┼───┼────┼─────────────┤
│ 5   │   │   │    │ {5,6}       │
├─────┼───┼───┼────┼─────────────┤
│ 6 ✓ │   │   │    │ 6           │
├─────┼───┼───┼────┼─────────────┤
│ 7   │   │ 8 │    │ 7           │
├─────┼───┼───┼────┼─────────────┤
│ 8   │   │   │    │ {8,5,6}     │
├─────┼───┼───┼────┼─────────────┤
│ 9   │   │   │ 10 │ 9           │
├─────┼───┼───┼────┼─────────────┤
│ 10  │   │   │    │ {10,6}      │
└─────┴───┴───┴────┴─────────────┘


DFA: Original transition table:

┌─────┬───┬───┬───┐
│     │ a │ b │ c │
├─────┼───┼───┼───┤
│ 1 > │ 4 │ 3 │ 2 │
├─────┼───┼───┼───┤
│ 2 ✓ │   │   │   │
├─────┼───┼───┼───┤
│ 3 ✓ │   │   │   │
├─────┼───┼───┼───┤
│ 4 ✓ │   │   │   │
└─────┴───┴───┴───┘


DFA: Minimized transition table:

┌─────┬───┬───┬───┐
│     │ a │ b │ c │
├─────┼───┼───┼───┤
│ 1 > │ 2 │ 2 │ 2 │
├─────┼───┼───┼───┤
│ 2 ✓ │   │   │   │
└─────┴───┴───┴───┘
```

### AST nodes specification

Below are the AST node types for different regular expressions patterns:

- [Char](#char)
  - [Simple char](#simple-char)
  - [Escaped char](#escaped-char)
  - [Meta char](#meta-char)
  - [Control char](#control-char)
  - [Hex char-code](#hex-char-code)
  - [Decimal char-code](#decimal-char-code)
  - [Octal char-code](#octal-char-code)
  - [Unicode](#unicode)
- [Character class](#character-class)
  - [Positive character class](#positive-character-class)
  - [Negative character class](#negative-character-class)
  - [Character class ranges](#character-class-ranges)
- [Unicode properties](#unicode-properties)
- [Alternative](#alternative)
- [Disjunction](#disjunction)
- [Groups](#groups)
  - [Capturing group](#capturing-group)
  - [Named capturing group](#named-capturing-group)
  - [Non-capturing group](#non-capturing-group)
  - [Backreferences](#backreferences)
- [Quantifiers](#quantifiers)
  - [? zero-or-one](#-zero-or-one)
  - [* zero-or-more](#-zero-or-more)
  - [+ one-or-more](#-one-or-more)
  - [Range-based quantifiers](#range-based-quantifiers)
    - [Exact number of matches](#exact-number-of-matches)
    - [Open range](#open-range)
    - [Closed range](#closed-range)
  - [Non-greedy](#non-greedy)
- [Assertions](#assertions)
  - [^ begin marker](#-begin-marker)
  - [$ end marker](#-end-marker)
  - [Boundary assertions](#boundary-assertions)
  - [Lookahead assertions](#lookahead-assertions)
    - [Positive lookahead assertion](#positive-lookahead-assertion)
    - [Negative lookahead assertion](#negative-lookahead-assertion)
  - [Lookbehind assertions](#lookbehind-assertions)
    - [Positive lookbehind assertion](#positive-lookbehind-assertion)
    - [Negative lookbehind assertion](#negative-lookbehind-assertion)

#### Char

A basic building block, single character. Can be _escaped_, and be of different _kinds_.

##### Simple char

Basic _non-escaped_ char in a regexp:

```
z
```

Node:

```js
{
  type: 'Char',
  value: 'z',
  symbol: 'z',
  kind: 'simple',
  codePoint: 122
}
```

> NOTE: to test this from CLI, the char should be in an actual regexp -- `/z/`.

##### Escaped char

```
\z
```

The same value, `escaped` flag is added:

```js
{
  type: 'Char',
  value: 'z',
  symbol: 'z',
  kind: 'simple',
  codePoint: 122,
  escaped: true
}
```

Escaping is mostly used with meta symbols:

```
// Syntax error
*
```

```
\*
```

OK, node:

```js
{
  type: 'Char',
  value: '*',
  symbol: '*',
  kind: 'simple',
  codePoint: 42,
  escaped: true
}
```

##### Meta char

A _meta character_ should not be confused with an [escaped char](#escaped-char).

Example:

```
\n
```

Node:

```js
{
  type: 'Char',
  value: '\\n',
  symbol: '\n',
  kind: 'meta',
  codePoint: 10
}
```

Among other meta character are: `.`, `\f`, `\r`, `\n`, `\t`, `\v`, `\0`, `[\b]` (backspace char), `\s`, `\S`, `\w`, `\W`, `\d`, `\D`.

> NOTE: Meta characters representing ranges (like `.`, `\s`, etc.) have `undefined` value for `symbol` and `NaN` for `codePoint`.

> NOTE: `\b` and `\B` are parsed as `Assertion` node type, not `Char`.

##### Control char

A char preceded with `\c`, e.g. `\cx`, which stands for `CTRL+x`:

```
\cx
```

Node:

```js
{
  type: 'Char',
  value: '\\cx',
  symbol: undefined,
  kind: 'control',
  codePoint: NaN
}
```

##### HEX char-code

A char preceded with `\x`, followed by a HEX-code, e.g. `\x3B` (symbol `;`):

```
\x3B
```

Node:

```js
{
  type: 'Char',
  value: '\\x3B',
  symbol: ';',
  kind: 'hex',
  codePoint: 59
}
```

##### Decimal char-code

Char-code:

```
\42
```

Node:

```js
{
  type: 'Char',
  value: '\\42',
  symbol: '*',
  kind: 'decimal',
  codePoint: 42
}
```

##### Octal char-code

Char-code started with `\0`, followed by an octal number:

```
\073
```

Node:

```js
{
  type: 'Char',
  value: '\\073',
  symbol: ';',
  kind: 'oct',
  codePoint: 59
}
```

##### Unicode

Unicode char started with `\u`, followed by a hex number:

```
\u003B
```

Node:

```js
{
  type: 'Char',
  value: '\\u003B',
  symbol: ';',
  kind: 'unicode',
  codePoint: 59
}
```

When using the `u` flag, unicode chars can also be represented using `\u` followed by a hex number between curly braces:

```
\u{1F680}
```

Node:

```js
{
  type: 'Char',
  value: '\\u{1F680}',
  symbol: '🚀',
  kind: 'unicode',
  codePoint: 128640
}
```

When using the `u` flag, unicode chars can also be represented using a surrogate pair:

```
\ud83d\ude80
```

Node:

```js
{
  type: 'Char',
  value: '\\ud83d\\ude80',
  symbol: '🚀',
  kind: 'unicode',
  codePoint: 128640,
  isSurrogatePair: true
}
```

#### Character class

Character classes define a _set_ of characters. A set may include as simple characters, as well as _character ranges_. A class can be _positive_ (any from the characters in the class match), or _negative_ (any _but_ the characters from the class match).

##### Positive character class

A positive character class is defined between `[` and `]` brackets:

```
[a*]
```

A node:

```js
{
  type: 'CharacterClass',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      symbol: 'a',
      kind: 'simple',
      codePoint: 97
    },
    {
      type: 'Char',
      value: '*',
      symbol: '*',
      kind: 'simple',
      codePoint: 42
    }
  ]
}
```

> NOTE: some meta symbols are treated as normal characters in a character class. E.g. `*` is not a repetition quantifier, but a simple char.

##### Negative character class

A negative character class is defined between `[^` and `]` brackets:

```
[^ab]
```

An AST node is the same, just `negative` property is added:

```js
{
  type: 'CharacterClass',
  negative: true,
  expressions: [
    {
      type: 'Char',
      value: 'a',
      symbol: 'a',
      kind: 'simple',
      codePoint: 97
    },
    {
      type: 'Char',
      value: 'b',
      symbol: 'b',
      kind: 'simple',
      codePoint: 98
    }
  ]
}
```

##### Character class ranges

As mentioned, a character class may also contain _ranges_ of symbols:

```
[a-z]
```

A node:

```js
{
  type: 'CharacterClass',
  expressions: [
    {
      type: 'ClassRange',
      from: {
        type: 'Char',
        value: 'a',
        symbol: 'a',
        kind: 'simple',
        codePoint: 97
      },
      to: {
        type: 'Char',
        value: 'z',
        symbol: 'z',
        kind: 'simple',
        codePoint: 122
      }
    }
  ]
}
```

> NOTE: it is a _syntax error_ if `to` value is less than `from` value: `/[z-a]/`.

The range value can be the same for `from` and `to`, and the special range `-` character is treated as a simple character when it stands in a char position:

```
// from: 'a', to: 'a'
[a-a]

// from: '-', to: '-'
[---]

// simple '-' char:
[-]

// 3 ranges:
[a-zA-Z0-9]+
```

#### Unicode properties

Unicode property escapes are a new type of escape sequence available in regular expressions that have the `u` flag set. With this feature it is possible to write Unicode expressions as:

```js
const greekSymbolRe = /\p{Script=Greek}/u;

greekSymbolRe.test('π'); // true
```

The AST node for this expression is:

```js
{
  type: 'UnicodeProperty',
  name: 'Script',
  value: 'Greek',
  negative: false,
  shorthand: false,
  binary: false,
  canonicalName: 'Script',
  canonicalValue: 'Greek'
}
```

All possible property names, values, and their aliases can be found at the [specification](https://tc39.github.io/ecma262/#sec-runtime-semantics-unicodematchproperty-p).

For `General_Category` it is possible to use a shorthand:

```js
/\p{Letter}/u;   // Shorthand

/\p{General_Category=Letter}/u; // Full notation
```

Binary names use the single value as well:

```js
/\p{ASCII_Hex_Digit}/u; // Same as: /[0-9A-Fa-f]/
```

The capitalized `P` defines the negation of the expression:

```js
/\P{ASCII_Hex_Digit}/u; // NOT a ASCII Hex digit
```

#### Alternative

An _alternative_ (or _concatenation_) defines a chain of patterns followed one after another:

```
abc
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      symbol: 'a',
      kind: 'simple',
      codePoint: 97
    },
    {
      type: 'Char',
      value: 'b',
      symbol: 'b',
      kind: 'simple',
      codePoint: 98
    },
    {
      type: 'Char',
      value: 'c',
      symbol: 'c',
      kind: 'simple',
      codePoint: 99
    }
  ]
}
```

Another examples:

```
// 'a' with a quantifier, followed by 'b'
a?b

// A group followed by a class:
(ab)[a-z]
```

#### Disjunction

The _disjunction_ defines "OR" operation for regexp patterns. It's a _binary_ operation, having `left`, and `right` nodes.

Matches `a` or `b`:

```
a|b
```

A node:

```js
{
  type: 'Disjunction',
  left: {
    type: 'Char',
    value: 'a',
    symbol: 'a',
    kind: 'simple',
    codePoint: 97
  },
  right: {
    type: 'Char',
    value: 'b',
    symbol: 'b',
    kind: 'simple',
    codePoint: 98
  }
}
```

#### Groups

The groups play two roles: they define _grouping precedence_, and allow to _capture_ needed sub-expressions in case of a capturing group.

##### Capturing group

_"Capturing"_ means the matched string can be referred later by a user, including in the pattern itself -- by using [backreferences](#backreferences).

Char `a`, and `b` are grouped, followed by the `c` char:

```
(ab)c
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Group',
      capturing: true,
      number: 1,
      expression: {
        type: 'Alternative',
        expressions: [
          {
            type: 'Char',
            value: 'a',
            symbol: 'a',
            kind: 'simple',
            codePoint: 97
          },
          {
            type: 'Char',
            value: 'b',
            symbol: 'b',
            kind: 'simple',
            codePoint: 98
          }
        ]
      }
    },
    {
      type: 'Char',
      value: 'c',
      symbol: 'c',
      kind: 'simple',
      codePoint: 99
    }
  ]
}
```

As we can see, it also tracks the number of the group.

Another example:

```
// A grouped disjunction of a symbol, and a character class:
(5|[a-z])
```

##### Named capturing group

A capturing group can be given a name using the `(?<name>...)` syntax, for any identifier `name`.

For example, a regular expressions for a date:

```js
/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u
```

For the group:

```js
(?<foo>x)
```

We have the following node (the `name` property with value `foo` is added):

```js
{
  type: 'Group',
  capturing: true,
  name: 'foo',
  nameRaw: 'foo',
  number: 1,
  expression: {
    type: 'Char',
    value: 'x',
    symbol: 'x',
    kind: 'simple',
    codePoint: 120
  }
}
```

Note: The `nameRaw` property represents the name *as parsed from the original source*, including escape sequences. The `name` property represents the canonical decoded form of the name.

For example, given the `/u` flag and the following group:

```regexp
(?<\u{03C0}>x)
```

We would have the following node:

```js
{
  type: 'Group',
  capturing: true,
  name: 'π',
  nameRaw: '\\u{03C0}',
  number: 1,
  expression: {
    type: 'Char',
    value: 'x',
    symbol: 'x',
    kind: 'simple',
    codePoint: 120
  }
}
```

##### Non-capturing group

Sometimes we don't need to actually capture the matched string from a group. In this case we can use a _non-capturing_ group:

Char `a`, and `b` are grouped, _but not captured_, followed by the `c` char:

```
(?:ab)c
```

The same node, the `capturing` flag is `false`:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Group',
      capturing: false,
      expression: {
        type: 'Alternative',
        expressions: [
          {
            type: 'Char',
            value: 'a',
            symbol: 'a',
            kind: 'simple',
            codePoint: 97
          },
          {
            type: 'Char',
            value: 'b',
            symbol: 'b',
            kind: 'simple',
            codePoint: 98
          }
        ]
      }
    },
    {
      type: 'Char',
      value: 'c',
      symbol: 'c',
      kind: 'simple',
      codePoint: 99
    }
  ]
}
```

##### Backreferences

A [capturing group](#capturing-group) can be referenced in the pattern using notation of an escaped group number.

Matches `abab` string:

```
(ab)\1
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Group',
      capturing: true,
      number: 1,
      expression: {
        type: 'Alternative',
        expressions: [
          {
            type: 'Char',
            value: 'a',
            symbol: 'a',
            kind: 'simple',
            codePoint: 97
          },
          {
            type: 'Char',
            value: 'b',
            symbol: 'b',
            kind: 'simple',
            codePoint: 98
          }
        ]
      }
    },
    {
      type: 'Backreference',
      kind: 'number',
      number: 1,
      reference: 1,
    }
  ]
}
```

A [named capturing group](#named-capturing-group) can be accessed using `\k<name>` pattern, and also using a numbered reference.

Matches `www`:

```js
(?<foo>w)\k<foo>\1
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Group',
      capturing: true,
      name: 'foo',
      nameRaw: 'foo',
      number: 1,
      expression: {
        type: 'Char',
        value: 'w',
        symbol: 'w',
        kind: 'simple',
        codePoint: 119
      }
    },
    {
      type: 'Backreference',
      kind: 'name',
      number: 1,
      reference: 'foo',
      referenceRaw: 'foo'
    },
    {
      type: 'Backreference',
      kind: 'number',
      number: 1,
      reference: 1
    }
  ]
}
```

Note: The `referenceRaw` property represents the reference *as parsed from the original source*, including escape sequences. The `reference` property represents the canonical decoded form of the reference.

For example, given the `/u` flag and the following pattern (matches `www`):

```regexp
(?<π>w)\k<\u{03C0}>\1
```

We would have the following node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Group',
      capturing: true,
      name: 'π',
      nameRaw: 'π',
      number: 1,
      expression: {
        type: 'Char',
        value: 'w',
        symbol: 'w',
        kind: 'simple',
        codePoint: 119
      }
    },
    {
      type: 'Backreference',
      kind: 'name',
      number: 1,
      reference: 'π',
      referenceRaw: '\\u{03C0}'
    },
    {
      type: 'Backreference',
      kind: 'number',
      number: 1,
      reference: 1
    }
  ]
}
```


#### Quantifiers

Quantifiers specify _repetition_ of a regular expression (or of its part). Below are the quantifiers which _wrap_ a parsed expression into a `Repetition` node. The quantifier itself can be of different _kinds_, and has `Quantifier` node type.

##### ? zero-or-one

The `?` quantifier is short for `{0,1}`.

```
a?
```

Node:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    symbol: 'a',
    kind: 'simple',
    codePoint: 97
  },
  quantifier: {
    type: 'Quantifier',
    kind: '?',
    greedy: true
  }
}
```

##### * zero-or-more

The `*` quantifier is short for `{0,}`.

```
a*
```

Node:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    symbol: 'a',
    kind: 'simple',
    codePoint: 97
  },
  quantifier: {
    type: 'Quantifier',
    kind: '*',
    greedy: true
  }
}
```

##### + one-or-more

The `+` quantifier is short for `{1,}`.

```
// Same as `aa*`, or `a{1,}`
a+
```

Node:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    symbol: 'a',
    kind: 'simple',
    codePoint: 97
  },
  quantifier: {
    type: 'Quantifier',
    kind: '+',
    greedy: true
  }
}
```

##### Range-based quantifiers

Explicit _range-based_ quantifiers are parsed as follows:

###### Exact number of matches

```
a{3}
```

The type of the quantifier is `Range`, and `from`, and `to` properties have the same value:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    symbol: 'a',
    kind: 'simple',
    codePoint: 97
  },
  quantifier: {
    type: 'Quantifier',
    kind: 'Range',
    from: 3,
    to: 3,
    greedy: true
  }
}
```

###### Open range

An open range doesn't have max value (assuming semantic "more", or Infinity value):

```
a{3,}
```

An AST node for such range doesn't contain `to` property:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    symbol: 'a',
    kind: 'simple',
    codePoint: 97
  },
  quantifier: {
    type: 'Quantifier',
    kind: 'Range',
    from: 3,
    greedy: true
  }
}
```

###### Closed range

A closed range has explicit max value: (which syntactically can be the same as min value):

```
a{3,5}

// Same as a{3}
a{3,3}
```

An AST node for a closed range:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    symbol: 'a',
    kind: 'simple',
    codePoint: 97
  },
  quantifier: {
    type: 'Quantifier',
    kind: 'Range',
    from: 3,
    to: 5,
    greedy: true
  }
}
```

> NOTE: it is a _syntax error_ if the max value is less than min value: `/a{3,2}/`

##### Non-greedy

If any quantifier is followed by the `?`, the quantifier becomes _non-greedy_.

Example:

```
a+?
```

Node:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    symbol: 'a',
    kind: 'simple',
    codePoint: 97
  },
  quantifier: {
    type: 'Quantifier',
    kind: '+',
    greedy: false
  }
}
```

Other examples:

```
a??
a*?
a{1}?
a{1,}?
a{1,3}?
```

#### Assertions

Assertions appear as separate AST nodes, however instread of manipulating on the characters themselves, they _assert_ certain conditions of a matching string. Examples: `^` -- beginning of a string (or a line in multiline mode), `$` -- end of a string, etc.

##### ^ begin marker

The `^` assertion checks whether a scanner is at the beginning of a string (or a line in multiline mode).

In the example below `^` is not a property of the `a` symbol, but a separate AST node for the assertion. The parsed node is actually an `Alternative` with two nodes:

```
^a
```

The node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Assertion',
      kind: '^'
    },
    {
      type: 'Char',
      value: 'a',
      symbol: 'a',
      kind: 'simple',
      codePoint: 97
    }
  ]
}
```

Since assertion is a separate node, it may appear anywhere in the matching string. The following regexp is completely valid, and asserts beginning of the string; it'll match an empty string:

```
^^^^^
```

##### $ end marker

The `$` assertion is similar to `^`, but asserts the end of a string (or a line in a multiline mode):

```
a$
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      symbol: 'a',
      kind: 'simple',
      codePoint: 97
    },
    {
      type: 'Assertion',
      kind: '$'
    }
  ]
}
```

And again, this is a completely valid regexp, and matches an empty string:

```
^^^^$$$$$

// valid too:
$^
```

##### Boundary assertions

The `\b` assertion check for _word boundary_, i.e. the position between a word and a space.

Matches `x` in `x y`, but not in `xy`:

```
x\b
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'x',
      symbol: 'x',
      kind: 'simple',
      codePoint: 120
    },
    {
      type: 'Assertion',
      kind: '\\b'
    }
  ]
}
```

The `\B` is vice-versa checks for _non-word_ boundary. The following example matches `x` in `xy`, but not in `x y`:

```
x\B
```

A node is the same:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'x',
      symbol: 'x',
      kind: 'simple',
      codePoint: 120
    },
    {
      type: 'Assertion',
      kind: '\\B'
    }
  ]
}
```

##### Lookahead assertions

These assertions check whether a pattern is _followed_ (or not followed for the negative assertion) by another pattern.

###### Positive lookahead assertion

Matches `a` only if it's followed by `b`:

```
a(?=b)
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      symbol: 'a',
      kind: 'simple',
      codePoint: 97
    },
    {
      type: 'Assertion',
      kind: 'Lookahead',
      assertion: {
        type: 'Char',
        value: 'b',
        symbol: 'b',
        kind: 'simple',
        codePoint: 98
      }
    }
  ]
}
```

###### Negative lookahead assertion

Matches `a` only if it's _not_ followed by `b`:

```
a(?!b)
```

A node is similar, just `negative` flag is added:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      symbol: 'a',
      kind: 'simple',
      codePoint: 97
    },
    {
      type: 'Assertion',
      kind: 'Lookahead',
      negative: true,
      assertion: {
        type: 'Char',
        value: 'b',
        symbol: 'b',
        kind: 'simple',
        codePoint: 98
      }
    }
  ]
}
```

##### Lookbehind assertions

> NOTE: _Lookbehind assertions_ are not yet supported by JavaScript RegExp. It is an ECMAScript [proposal](https://tc39.github.io/proposal-regexp-lookbehind/) which is at stage 3 at the moment.

These assertions check whether a pattern is _preceded_ (or not preceded for the negative assertion) by another pattern.

###### Positive lookbehind assertion

Matches `b` only if it's preceded by `a`:

```
(?<=a)b
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Assertion',
      kind: 'Lookbehind',
      assertion: {
        type: 'Char',
        value: 'a',
        symbol: 'a',
        kind: 'simple',
        codePoint: 97
      }
    },
    {
      type: 'Char',
      value: 'b',
      symbol: 'b',
      kind: 'simple',
      codePoint: 98
    },
  ]
}
```

###### Negative lookbehind assertion

Matches `b` only if it's _not_ preceded by `a`:

```
(?<!a)b
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Assertion',
      kind: 'Lookbehind',
      negative: true,
      assertion: {
        type: 'Char',
        value: 'a',
        symbol: 'a',
        kind: 'simple',
        codePoint: 97
      }
    },
    {
      type: 'Char',
      value: 'b',
      symbol: 'b',
      kind: 'simple',
      codePoint: 98
    },
  ]
}
```
