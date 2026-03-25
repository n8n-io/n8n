# @adobe/css-tools

> This is a fork of the npm css package due to low maintenance

CSS parser / stringifier.

## Installation

    $ npm install @adobe/css-tools

## Usage

```js
import { parse, stringify } from '@adobe/css-tools'
let obj = parse('body { font-size: 12px; }', options);
let css = stringify(obj, options);
```

## API

### parse(code, [options])

Accepts a CSS string and returns an AST `object`.

`options`:

- silent: silently fail on parse errors.
- source: the path to the file containing `css`. Makes errors and source
  maps more helpful, by letting them know where code comes from.

### stringify(object, [options])

Accepts an AST `object` (as `css.parse` produces) and returns a CSS string.

`options`:

- indent: the string used to indent the output. Defaults to two spaces.
- compress: omit comments and extraneous whitespace.

### Example

```js
var ast = parse('body { font-size: 12px; }', { source: 'source.css' });

var css = stringify(ast);
```

### Errors

Errors thrown during parsing have the following properties:

- message: `String`. The full error message with the source position.
- reason: `String`. The error message without position.
- filename: `String` or `undefined`. The value of `options.source` if
  passed to `css.parse`. Otherwise `undefined`.
- line: `Integer`.
- column: `Integer`.
- source: `String`. The portion of code that couldn't be parsed.

When parsing with the `silent` option, errors are listed in the
`parsingErrors` property of the [`stylesheet`](#stylesheet) node instead
of being thrown.

If you create any errors in plugins such as in
[rework](https://github.com/reworkcss/rework), you __must__ set the same
properties for consistency.

## AST

Interactively explore the AST with <http://iamdustan.com/reworkcss_ast_explorer/>.

### Common properties

All nodes have the following properties.

#### position

Information about the position in the source string that corresponds to
the node.

`Object`:

- start: `Object`:
  - line: `Number`.
  - column: `Number`.
- end: `Object`:
  - line: `Number`.
  - column: `Number`.
- source: `String` or `undefined`. The value of `options.source` if passed to
  `css.parse`. Otherwise `undefined`.
- content: `String`. The full source string passed to `css.parse`.

The line and column numbers are 1-based: The first line is 1 and the first
column of a line is 1 (not 0).

The `position` property lets you know from which source file the node comes
from (if available), what that file contains, and what part of that file was
parsed into the node.

#### type

`String`. The possible values are the ones listed in the Types section below.

#### parent

A reference to the parent node, or `null` if the node has no parent.

### Types

The available values of `node.type` are listed below, as well as the available
properties of each node (other than the common properties listed above.)

#### stylesheet

The root node returned by `css.parse`.

- stylesheet: `Object`:
  - rules: `Array` of nodes with the types `rule`, `comment` and any of the
    at-rule types.
  - parsingErrors: `Array` of `Error`s. Errors collected during parsing when
    option `silent` is true.

#### rule

- selectors: `Array` of `String`s. The list of selectors of the rule, split
  on commas. Each selector is trimmed from whitespace and comments.
- declarations: `Array` of nodes with the types `declaration` and `comment`.

#### declaration

- property: `String`. The property name, trimmed from whitespace and
  comments. May not be empty.
- value: `String`. The value of the property, trimmed from whitespace and
  comments. Empty values are allowed.

#### comment

A rule-level or declaration-level comment. Comments inside selectors,
properties and values etc. are lost.

- comment: `String`. The part between the starting `/*` and the ending `*/`
  of the comment, including whitespace.

#### charset

The `@charset` at-rule.

- charset: `String`. The part following `@charset `.

#### custom-media

The `@custom-media` at-rule.

- name: `String`. The `--`-prefixed name.
- media: `String`. The part following the name.

#### document

The `@document` at-rule.

- document: `String`. The part following `@document `.
- vendor: `String` or `undefined`. The vendor prefix in `@document`, or
  `undefined` if there is none.
- rules: `Array` of nodes with the types `rule`, `comment` and any of the
  at-rule types.

#### font-face

The `@font-face` at-rule.

- declarations: `Array` of nodes with the types `declaration` and `comment`.

#### host

The `@host` at-rule.

- rules: `Array` of nodes with the types `rule`, `comment` and any of the
  at-rule types.

#### import

The `@import` at-rule.

- import: `String`. The part following `@import `.

#### keyframes

The `@keyframes` at-rule.

- name: `String`. The name of the keyframes rule.
- vendor: `String` or `undefined`. The vendor prefix in `@keyframes`, or
  `undefined` if there is none.
- keyframes: `Array` of nodes with the types `keyframe` and `comment`.

#### keyframe

- values: `Array` of `String`s. The list of “selectors” of the keyframe rule,
  split on commas. Each “selector” is trimmed from whitespace.
- declarations: `Array` of nodes with the types `declaration` and `comment`.

#### media

The `@media` at-rule.

- media: `String`. The part following `@media `.
- rules: `Array` of nodes with the types `rule`, `comment` and any of the
  at-rule types.

#### namespace

The `@namespace` at-rule.

- namespace: `String`. The part following `@namespace `.

#### page

The `@page` at-rule.

- selectors: `Array` of `String`s. The list of selectors of the rule, split
  on commas. Each selector is trimmed from whitespace and comments.
- declarations: `Array` of nodes with the types `declaration` and `comment`.

#### supports

The `@supports` at-rule.

- supports: `String`. The part following `@supports `.
- rules: `Array` of nodes with the types `rule`, `comment` and any of the
  at-rule types.

### container

The `@container` at-rule.

- conatiner: `String`. The part following `@container `.
- rules: `Array` of nodes with the types `rule`, `comment` and any of the
  at-rule types.

### layer

The `@layer` at-rule.

- layer: `String`. The part following `@layer `.
- rules: `Array` of nodes with the types `rule`, `comment` and any of the
  at-rule types. This may be null, if the rule did not contain any.

### starting-style

The `@starting-style` at-rule.

- rules: `Array` of nodes with the types `rule`, `comment` and any of the
  at-rule types.

### Example

CSS:

```css
body {
  background: #eee;
  color: #888;
}
```

Parse tree:

```json
{
  "type": "stylesheet",
  "stylesheet": {
    "rules": [
      {
        "type": "rule",
        "selectors": [
          "body"
        ],
        "declarations": [
          {
            "type": "declaration",
            "property": "background",
            "value": "#eee",
            "position": {
              "start": {
                "line": 2,
                "column": 3
              },
              "end": {
                "line": 2,
                "column": 19
              }
            }
          },
          {
            "type": "declaration",
            "property": "color",
            "value": "#888",
            "position": {
              "start": {
                "line": 3,
                "column": 3
              },
              "end": {
                "line": 3,
                "column": 14
              }
            }
          }
        ],
        "position": {
          "start": {
            "line": 1,
            "column": 1
          },
          "end": {
            "line": 4,
            "column": 2
          }
        }
      }
    ]
  }
}
```

## License

MIT
