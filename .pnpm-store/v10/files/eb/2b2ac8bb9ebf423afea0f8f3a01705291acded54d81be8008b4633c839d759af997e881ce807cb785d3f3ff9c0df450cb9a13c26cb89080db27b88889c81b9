# selderee

![lint status badge](https://github.com/mxxii/selderee/workflows/lint/badge.svg)
![test status badge](https://github.com/mxxii/selderee/workflows/test/badge.svg)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/mxxii/selderee/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/dw/selderee?color=informational&logo=npm)](https://www.npmjs.com/package/selderee)

**Sel**ectors **de**cision t**ree** - pick matching selectors, fast.

----


## What is it for

The problem statement: there are multiple CSS selectors with attached handlers, and a HTML DOM to process. For each HTML Element a matching handler has to be found and applied.

The naive approach is to walk through the DOM and test each and every selector against each Element. This means *O(n\*m)* complexity.

It is pretty clear though that if we have selectors that share something in common then we can reduce the number of checks.

The main `selderee` package offers the selectors tree structure. Runnable decision functions for specific DOM implementations are built via plugins.


## Limitations

- Pseudo-classes and pseudo-elements are not supported by the underlying library [parseley](https://github.com/mxxii/parseley) (yet?);
- General siblings (`~`), descendants (` `) and same column combinators (`||`) are also not supported.


## `selderee` vs `css-select`

[css-select](https://github.com/fb55/css-select) - a CSS selector compiler & engine.

| Feature                               | `selderee` | `css-select` |
| ------------------------------------- | :--------: | :----------: |
| Support for `htmlparser2` DOM AST     | plugin     | +            |
| "Compiles" into a function            | +          | +            |
| Pick selector(s) for a given Element  | +          |              |
| Query Element(s) for a given selector |            | +            |


## Packages

| Package   | Version   | Folder    | Changelog |
| --------- | --------- | --------- | --------- |
| [selderee](https://www.npmjs.com/package/selderee) | [![npm](https://img.shields.io/npm/v/selderee?logo=npm)](https://www.npmjs.com/package/selderee) | [/packages/selderee](https://github.com/mxxii/selderee/tree/main/packages/selderee/) | [changelog](https://github.com/mxxii/selderee/blob/main/packages/selderee/CHANGELOG.md) |
| [@selderee/plugin-htmlparser2](https://www.npmjs.com/package/@selderee/plugin-htmlparser2) | [![npm](https://img.shields.io/npm/v/@selderee/plugin-htmlparser2?logo=npm)](https://www.npmjs.com/package/@selderee/plugin-htmlparser2) | [/packages/plugin-htmlparser2](https://github.com/mxxii/selderee/tree/main/packages/plugin-htmlparser2/) | [changelog](https://github.com/mxxii/selderee/blob/main/packages/plugin-htmlparser2/CHANGELOG.md) |


## Install

```shell
> npm i selderee @selderee/plugin-htmlparser2
```


## Documentation

- [API](https://github.com/mxxii/selderee/blob/main/docs/index.md)


## Usage example

```js
const htmlparser2 = require('htmlparser2');
const util = require('util');

const { DecisionTree, Treeify } = require('selderee');
const { hp2Builder } = require('@selderee/plugin-htmlparser2');

const selectorValuePairs = [
  ['p', 'A'],
  ['p.foo[bar]', 'B'],
  ['p[class~=foo]', 'C'],
  ['div.foo', 'D'],
  ['div > p.foo', 'E'],
  ['div > p', 'F'],
  ['#baz', 'G']
];

// Make a tree structure from all given selectors.
const selectorsDecisionTree = new DecisionTree(selectorValuePairs);

// `treeify` builder produces a string output for testing and debug purposes.
// `treeify` expects string values attached to each selector.
const prettyTree = selectorsDecisionTree.build(Treeify.treeify);
console.log(prettyTree);

const html = /*html*/`<html><body>
  <div><p class="foo qux">second</p></div>
</body></html>`;
const dom = htmlparser2.parseDocument(html);
const element = dom.children[0].children[0].children[1].children[0];

// `hp2Builder` produces a picker that can pick values
// from the selectors tree.
const picker = selectorsDecisionTree.build(hp2Builder);

// Get all matches
const allMatches = picker.pickAll(element);
console.log(util.inspect(allMatches, { breakLength: 70, depth: null }));

// or get the value from the most specific match.
const bestMatch = picker.pick1(element);
console.log(`Best matched value: ${bestMatch}`);
```

<details><summary>Example output</summary>

```text
▽
├─◻ Tag name
│ ╟─◇ = p
│ ║ ┠─▣ Attr value: class
│ ║ ┃ ╙─◈ ~= "foo"
│ ║ ┃   ┠─◨ Attr presence: bar
│ ║ ┃   ┃ ┖─◁ #1 [0,2,1] B
│ ║ ┃   ┠─◁ #2 [0,1,1] C
│ ║ ┃   ┖─◉ Push element: >
│ ║ ┃     └─◻ Tag name
│ ║ ┃       ╙─◇ = div
│ ║ ┃         ┖─◁ #4 [0,1,2] E
│ ║ ┠─◁ #0 [0,0,1] A
│ ║ ┖─◉ Push element: >
│ ║   └─◻ Tag name
│ ║     ╙─◇ = div
│ ║       ┖─◁ #5 [0,0,2] F
│ ╙─◇ = div
│   ┖─▣ Attr value: class
│     ╙─◈ ~= "foo"
│       ┖─◁ #3 [0,1,1] D
└─▣ Attr value: id
  ╙─◈ = "baz"
    ┖─◁ #6 [1,0,0] G
[ { index: 2, value: 'C', specificity: [ 0, 1, 1 ] },
  { index: 4, value: 'E', specificity: [ 0, 1, 2 ] },
  { index: 0, value: 'A', specificity: [ 0, 0, 1 ] },
  { index: 5, value: 'F', specificity: [ 0, 0, 2 ] } ]
Best matched value: E
```

*Some gotcha: you may notice the check for `#baz` has to be performed every time the decision tree is called. If it happens to be `p#baz` or `div#baz` or even `.foo#baz` - it would be much better to write it like this. Deeper, narrower tree means less checks on average. (in case of `.foo#baz` the class check might finally outweigh the tag name check and rebalance the tree.)*

</details>


## Development

Targeting Node.js version >=14.

Monorepo uses NPM v7 workspaces (make sure v7 is installed when used with Node.js v14.)
