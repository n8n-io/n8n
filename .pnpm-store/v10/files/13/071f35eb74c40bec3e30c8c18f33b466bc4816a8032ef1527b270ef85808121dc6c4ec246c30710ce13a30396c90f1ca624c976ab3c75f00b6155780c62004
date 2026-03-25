# postcss-media-query-parser

[![NPM version](http://img.shields.io/npm/v/postcss-media-query-parser.svg)](https://www.npmjs.com/package/postcss-media-query-parser) [![Build Status](https://travis-ci.org/dryoma/postcss-media-query-parser.svg?branch=master)](https://travis-ci.org/dryoma/postcss-media-query-parser)

Media query parser with very simple traversing functionality.

## Installation and usage

First install it via NPM:

```
npm install postcss-media-query-parser
```

Then in your Node.js application:

```js
import mediaParser from "postcss-media-query-parser";

const mediaQueryString = "(max-width: 100px), not print";
const result = mediaParser(mediaQueryString);
```

The `result` will be this object:

```js
{
  type: 'media-query-list',
  value: '(max-width: 100px), not print',
  after: '',
  before: '',
  sourceIndex: 0,

  // the first media query
  nodes: [{
    type: 'media-query',
    value: '(max-width: 100px)',
    before: '',
    after: '',
    sourceIndex: 0,
    parent: <link to parent 'media-query-list' node>,
    nodes: [{
      type: 'media-feature-expression',
      value: '(max-width: 100px)',
      before: '',
      after: '',
      sourceIndex: 0,
      parent: <link to parent 'media-query' node>,
      nodes: [{
        type: 'media-feature',
        value: 'max-width',
        before: '',
        after: '',
        sourceIndex: 1,
        parent: <link to parent 'media-feature-expression' node>,
      }, {
        type: 'colon',
        value: ':',
        before: '',
        after: ' ',
        sourceIndex: 10,
        parent: <link to parent 'media-feature-expression' node>,
      }, {
        type: 'value',
        value: '100px',
        before: ' ',
        after: '',
        sourceIndex: 12,
        parent: <link to parent 'media-feature-expression' node>,
      }]
    }]
  },
  // the second media query
  {
    type: 'media-query',
    value: 'not print',
    before: ' ',
    after: '',
    sourceIndex: 20,
    parent: <link to parent 'media-query-list' node>,
    nodes: [{
      type: 'keyword',
      value: 'not',
      before: ' ',
      after: ' ',
      sourceIndex: 20,
      parent: <link to parent 'media-query' node>,
    }, {
      type: 'media-type',
      value: 'print',
      before: ' ',
      after: '',
      sourceIndex: 24,
      parent: <link to parent 'media-query' node>,
    }]
  }]
}
```

One of the likely sources of a string to parse would be traversing [a PostCSS container node](http://api.postcss.org/Root.html) and getting the `params` property of nodes with the name of "atRule":

```js
import postcss from "postcss";
import mediaParser from "postcss-media-query-parser";

const root = postcss.parse(<contents>);
// ... or any other way to get sucn container

root.walkAtRules("media", (atRule) => {
  const mediaParsed = mediaParser(atRule.params);
  // Do something with "mediaParsed" object
});
```

## Nodes

Node is a very generic item in terms of this parser. It's is pretty much everything that ends up in the parsed result. Each node has these properties:

* `type`: the type of the node (see below);
* `value`: the node's value stripped of trailing whitespaces;
* `sourceIndex`: 0-based index of the node start relative to the source start (excluding trailing whitespaces);
* `before`: a string that contain a whitespace between the node start and the previous node end/source start;
* `after`: a string that contain a whitespace between the node end and the next node start/source end;
* `parent`: a link to this node's parent node (a container).

A node can have one of these types (according to [the 2012 CSS3 standard](https://www.w3.org/TR/2012/REC-css3-mediaqueries-20120619/)):

* `media-query-list`: that is the root level node of the parsing result. A [container](#containers); its children can have types of `url` and `media-query`.
* `url`: if a source is taken from a CSS `@import` rule, it will have a `url(...)` function call. The value of such node will be `url(http://uri-address)`, it is to be parsed separately.
* `media-query`: such nodes correspond to each media query in a comma separated list. In the exapmle above there are two. Nodes of this type are [containers](#containers).
* `media-type`: `screen`, `tv` and other media types.
* `keyword`: `only`, `not` or `and` keyword.
* `media-feature-expression`: an expression in parentheses that checks for a condition of a particular media feature. The value would be like this: `(max-width: 1000px)`. Such nodes are [containers](#containers). They always have a `media-feature` child node, but might not have a `value` child node (like in `screen and (color)`).
* `media-feature`: a media feature, e.g. `max-width`.
* `colon`: present if a media feature expression has a colon (e.g. `(min-width: 1000px)`, compared to `(color)`).
* `value`: a media feature expression value, e.g. `100px` in `(max-width: 1000px)`.

### Parsing details

postcss-media-query-parser allows for cases of some **non-standard syntaxes** and tries its best to work them around. For example, in a media query from a code with SCSS syntax:

```scss
@media #{$media-type} and ( #{"max-width" + ": 10px"} ) { ... }
```

`#{$media-type}` will be the node of type `media-type`, alghough `$media-type`'s value can be `only screen`. And inside `media-feature-expression` there will only be a `media-feature` type node with the value of `#{"max-width" + ": 10px"}` (this example doesn't make much sense, it's for demo purpose).

But the result of parsing **malformed media queries** (such as with incorrect amount of closing parens, curly braces, etc.) can be unexpected. For exapmle, parsing:

```scss
@media ((min-width: -100px)
```

would return a media query list with the single `media-query` node that has no child nodes.

## Containers

Containers are [nodes](#nodes) that have other nodes as children. Container nodes have an additional property `nodes` which is an array of their child nodes. And also these methods:

* `each(callback)` - traverses the direct child nodes of a container, calling `callback` function for each of them. Returns `false` if traversing has stopped by means of `callback` returning `false`, and `true` otherwise.
* `walk([filter, ]callback)` - traverses ALL descendant nodes of a container, calling `callback` function for each of them. Returns `false` if traversing has stopped by means of `callback` returning `false`, and `true` otherwise.

In both cases `callback` takes these parameters:

- `node` - the current node (one of the container's descendats, that the callback has been called against).
- `i` - 0-based index of the `node` in an array of its parent's children.
- `nodes` - array of child nodes of `node`'s parent.

If `callback` returns `false`, the traversing stops.

## License

MIT
