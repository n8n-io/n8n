# pug-walk

Walk and transform a Pug AST

[![Build Status](https://img.shields.io/travis/pugjs/pug-walk/master.svg)](https://travis-ci.org/pugjs/pug-walk)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-walk)](https://david-dm.org/pugjs/pug?path=packages/pug-walk)
[![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug-walk)](https://david-dm.org/pugjs/pug?path=packages/pug-walk&type=dev)
[![npm version](https://img.shields.io/npm/v/pug-walk.svg)](https://www.npmjs.org/package/pug-walk)
[![Coverage Status](https://img.shields.io/codecov/c/github/pugjs/pug-walk/master.svg)](https://codecov.io/gh/pugjs/pug-walk/branch/master)

## Installation

    npm install pug-walk

## Usage

```js
var walk = require('pug-walk');
```

### `walk(ast, before, after, options)`

Traverse and optionally transform a [Pug AST](https://github.com/pugjs/pug-ast-spec).

`ast` is not cloned, so any changes done to it will be done directly on the AST provided.

`before` and `after` are functions with the signature `(node, replace)`. `before` is called when a node is first seen, while `after` is called after the children of the node (if any) have already been traversed.

The `replace` parameter is a function that can be used to replace the node in the AST. It takes either an object or an array as its only parameter. If an object is specified, the current node is replaced by the parameter in the AST. If an array is specified and the ancestor of the current node allows such an operation, the node is replaced by all of the nodes in the specified array. This way, you can remove and add new nodes adjacent to the current node. Whether the parent node allows array operation is indicated by the property `replace.arrayAllowed`, which is set to true when the parent is a Block and when the parent is a Include and the node is an IncludeFilter.

If `before` returns `false`, the children of this node will not be traversed and left unchanged (unless `replace` has been called). Otherwise, the returned value of `before` is ignored. The returned value of `after` is always ignored. If `replace()` is called in `before()` with an array, and `before()` does not return `false`, the nodes in the array are still descended.

`options` can contain the following properties:

* `includeDependencies` (boolean): Walk the AST of a loaded dependent file (i.e., includes and extends). Defaults to `false`.
* `parents` (array<Node>): Nodes that are ancestors to the current `ast`. This option is used mainly internally, and users usually do not have to specify it. Defaults to `[]`.

```js
var lex = require('pug-lexer');
var parse = require('pug-parser');

// Changing content of all Text nodes
// ==================================

var source = '.my-class foo';
var dest = '.my-class bar';

var ast = parse(lex(source));

ast = walk(ast, function before(node, replace) {
  if (node.type === 'Text') {
    node.val = 'bar';

    // Alternatively, you can replace the entire node
    // rather than just the text.
    // replace({ type: 'Text', val: 'bar', line: node.line });
  }
}, {
  includeDependencies: true
});

assert.deepEqual(parse(lex(dest)), ast);

// Convert all simple <strong> elements to text
// ============================================

var source = 'p abc #[strong NO]\nstrong on its own line';
var dest = 'p abc #[| NO]\n| on its own line';

var ast = parse(lex(source));

ast = walk(ast, function before(node, replace) {
  // Find all <strong> tags
  if (node.type === 'Tag' && node.name === 'strong') {
    var children = node.block.nodes;

    // Make sure that the Tag only has one child -- the text
    if (children.length === 1 && children[0].type === 'Text') {
      // Replace the Tag with the Text
      replace({ type: 'Text', val: children[0].val, line: node.line });
    }
  }
}, {
  includeDependencies: true
});

assert.deepEqual(parse(lex(dest)), ast);

// Flatten blocks
// ==============

var ast = {
  type: 'Block',
  nodes: [
    { type: 'Text', val: 'a' },
    {
      type: 'Block',
      nodes: [
        { type: 'Text', val: 'b' },
        {
          type: 'Block',
          nodes: [ { type: 'Text', val: 'c' } ]
        },
        { type: 'Text', val: 'd' }
      ]
    },
    { type: 'Text', val: 'e' }
  ]
};

var dest = {
  type: 'Block',
  nodes: [
    { type: 'Text', val: 'a' },
    { type: 'Text', val: 'b' },
    { type: 'Text', val: 'c' },
    { type: 'Text', val: 'd' },
    { type: 'Text', val: 'e' }
  ]
};

// We need to use `after` handler instead of `before`
// handler because we want to flatten the innermost
// blocks first before proceeding onto outer blocks.

ast = walk(ast, null, function after(node, replace) {
  if (node.type === 'Block' && replace.arrayAllowed) {
    // Replace the block with its contents
    replace(node.nodes);
  }
});

assert.deepEqual(dest, ast);
```

## License

  MIT
