# parseley

![lint status badge](https://github.com/mxxii/parseley/workflows/lint/badge.svg)
![test status badge](https://github.com/mxxii/parseley/workflows/test/badge.svg)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/mxxii/parseley/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/parseley?logo=npm)](https://www.npmjs.com/package/parseley)
[![npm](https://img.shields.io/npm/dw/parseley?color=informational&logo=npm)](https://www.npmjs.com/package/parseley)
[![deno](https://img.shields.io/badge/deno.land%2Fx%2F-parseley-informational?logo=deno)](https://deno.land/x/parseley)

**Par**ser for CSS **sele**ctors.

----


## Features

* Convert CSS selector strings into objects that are easy to work with;

* Serialize back if needed;

* Get specificity for free.


## Changelog

Available here: [CHANGELOG.md](https://github.com/mxxii/parseley/blob/main/CHANGELOG.md).


## Install

### Node

```shell
> npm i parseley
```

```typescript
import * as parseley from 'parseley';
```

### Deno

```typescript
import * as parseley from 'https://deno.land/x/parseley@.../parseley.ts';
```


## Usage example

```js
import { parse1, serialize, normalize } from 'parseley';
import { inspect } from 'node:util';

const str = 'div#id1 > .class2.class1[attr1]';

const ast = parse1(str);
console.log(inspect(ast, { breakLength: 45, depth: null }));

const serialized = serialize(ast);
console.log(`Serialized: '${serialized}'`);

normalize(ast);
const normalized = serialize(ast);
console.log(`Normalized: '${normalized}'`);
```

<details><summary>Example output</summary>

```text
{
  type: 'compound',
  list: [
    {
      type: 'class',
      name: 'class2',
      specificity: [ 0, 1, 0 ]
    },
    {
      type: 'class',
      name: 'class1',
      specificity: [ 0, 1, 0 ]
    },
    {
      type: 'attrPresence',
      name: 'attr1',
      namespace: null,
      specificity: [ 0, 1, 0 ]
    },
    {
      type: 'combinator',
      combinator: '>',
      left: {
        type: 'compound',
        list: [
          {
            type: 'tag',
            name: 'div',
            namespace: null,
            specificity: [ 0, 0, 1 ]
          },
          {
            type: 'id',
            name: 'id1',
            specificity: [ 1, 0, 0 ]
          }
        ],
        specificity: [ 1, 0, 1 ]
      },
      specificity: [ 1, 0, 1 ]
    }
  ],
  specificity: [ 1, 3, 1 ]
}
Serialized: 'div#id1>.class2.class1[attr1]'
Normalized: 'div#id1>.class1.class2[attr1]'
```

</details>


## Documentation

* [Functions](https://github.com/mxxii/parseley/blob/main/docs/index.md)
* [AST types](https://github.com/mxxii/parseley/blob/main/docs/modules/Ast.md)
* [Snapshots](https://github.com/mxxii/parseley/blob/main/test/snapshots/snapshots.ts.md)


## Input reference

<https://www.w3.org/TR/selectors-4/#grammar>

<https://www.w3.org/TR/css-syntax-3/#token-diagrams>

Terminology used in this project is more or less consistent to the spec, with some exceptions made for clarity. The term "type" is way too overloaded in particular, the term "tag" is used where appropriate instead.

Any pseudo elements are left for possible future implementation. I have no immediate need for them and they require some careful consideration.


## Output AST

Consistency: overall AST shape is always the same. This makes client code simpler, at least for a certain processing tasks.

For example, always use compound selectors, even when there is only one simple selector inside.

Comma-separated selectors might not be needed for every use case. So there are two functions - one can parse commas and always returns the top-level list regardless of the comma presence in a particular selector, and the other can't parse commas and returns a compound selector AST directly.

Complex selectors are represented in the way that makes the left side to be an another condition on the right side element. This was made with the right-to-left processing direction in mind. One consequence of this is that there is no such thing as a "complex selector" node in the AST hierarchy, but there are "combinator" nodes attached to "compound selector" nodes.

All AST nodes have their specificity computed (except the top-level list of comma-separated selectors where it doesn't really make sense).


## Motivation and inspiration

| Package    | Hits      | Misses
| ---------- | --------- | ---------
| [parsel](https://github.com/leaverou/parsel) | Sensible AST; specificity calculation; cool name | Not friendly to node.js; based on regex
| [css-what](https://github.com/fb55/css-what) and [css-select](https://github.com/fb55/css-select) | The idea to process complex selectors in right-to-left order | `css-select` is a solution for a different problem compared to what I needed; `css-what` produces only a list of tokens
| [scalpel](https://github.com/gajus/scalpel)  | Introduced me to [nearley](https://nearley.js.org/) parsing toolkit (albeit I'm not using it here anymore) | AST it produces is very far from what I can use
| [css-selector-parser](https://github.com/mdevils/css-selector-parser) | Configurable and lightweight | Again, AST is far from my needs
