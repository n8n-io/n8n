# Gonzales PE @dev

[![NPM version][npm-img]][npm]
[![Build Status][travis-img]][travis]
[![AppVeyor Build Status][appveyor-img]][appveyor]

[npm-img]:      https://img.shields.io/npm/v/gonzales-pe.svg
[npm]:          https://www.npmjs.com/package/gonzales-pe
[travis-img]:   https://travis-ci.org/tonyganch/gonzales-pe.svg
[travis]:       https://travis-ci.org/tonyganch/gonzales-pe
[appveyor-img]: https://ci.appveyor.com/api/projects/status/m29jphtrqt398v2o/branch/dev?svg=true
[appveyor]:     https://ci.appveyor.com/project/tonyganch/gonzales-pe/branch/dev

Gonzales PE is a CSS parser which plays nicely with preprocessors.    
Currently those are supported: SCSS, Sass, LESS.    
Try out Gonzales PE online: [Gonzales PE Playground](https://tonyganch.io/gonzales-pe/).

## Install

(1) To install command-line tool globally:

```bash
npm install -g git://github.com/tonyganch/gonzales-pe.git#dev
```

(2) To install parser as a project dependency:

```bash
npm install --save git://github.com/tonyganch/gonzales-pe.git#dev
```

(3) If for some reason you want to build files yourself:

```bash
# Clone the repo.
git clone git@github.com:tonyganch/gonzales-pe.git
# Go to dev branch.
git checkout dev
# Install project dependencies.
npm install
# Install git hooks and build files.
npm run init
```

## API

Basically there are a few things you can do:

1. parse css string and get a parse tree in return;
2. modify tree nodes;
3. remove tree nodes;
4. add new nodes to the tree;
5. convert modified tree back to a string.

The different type of tree nodes can be found in [docs/node-types.md](https://github.com/tonyganch/gonzales-pe/blob/dev/docs/node-types.md).

In examples below I assume that `gonzales` is a parser module and `parseTree`
is some parsed css:

```js
let gonzales = require('gonzales-pe');
let parseTree = gonzales.parse(css);
```

### gonzales.createNode(options)

##### Description

Creates a new node. Useful when you need to add something to a tree.

##### Parameters

<table>
  <tr>
    <td><i>{Object}</i></td>
    <td>options</td>
    <td>Options to pass to a `Node` constructor.</td>
  </tr>
  <tr>
</table>

##### Returns

<table>
  <tr>
    <td><i>{Object}</i></td>
    <td>A new node.</td>
  </tr>
</table>

##### Examples

```js
let css = 'a {color: tomato}';
let parseTree = gonzales.parse(css);
let node = gonzales.createNode({ type: 'animal', content: 'panda' });
parseTree.content.push(node);
```


### gonzales.parse(css[, options])

##### Description

Parses a css string.

##### Parameters

<table>
  <tr>
    <td><i>{string}</i></td>
    <td>css</td>
    <td>A string to parse.</td>
  </tr>
  <tr>
    <td><i>{Object=}</i></td>
    <td>options</td>
    <td>Optional. Additional options:
      <ul>
        <li>
          <code>{string} syntax</code> — any of the following: <code>css</code>,
          <code>less</code>, <code>sass</code>, <code>scss</code>.
          Default one is <code>css</code>.
        </li>
        <li>
          <code>{string} context</code> — root node's type. For a list of available
          values see <a href="docs/node-types.md">"Node types"</a>. Default
          one is <code>stylesheet</code>.
        </li>
        <li>
          <code>{number} tabSize</code> — size of a tab character in spaces.
          Default one is 1.
        </li>
      </ul>
    </td>
  </tr>
</table>

##### Returns

<table>
  <tr>
    <td><i>{Object}</i></td>
    <td>Parse tree.</td>
  </tr>
</table>

##### Examples

```js
let css = 'a {color: tomato}';
let parseTree = gonzales.parse(css);
```

```js
let less = 'a {$color: tomato}';
let parseTree = gonzales.parse(less, {syntax: 'less'});
```

```js
let less = '$color: tomato';
let parseTree = gonzales.parse(less, {syntax: 'less', rule: 'declaration'});
```

### parseTree.contains(type)

##### Description

Checks whether there is a child node of given type.

##### Parameters

<table>
  <tr>
    <td><i>{string}</i></td>
    <td>type</td>
    <td>
      Node type we're looking for. For a list of available values see
      <a href="docs/node-types.md">"Node types"</a>.
    </td>
  </tr>
</table>

##### Returns

<table>
  <tr>
    <td><i>{boolean}</i></td>
    <td>
      <code>true</code> if a tree contains a child node of a given type,
      <code>false</code> otherwise.
    </td>
  </tr>
</table>

##### Examples

```js
if (parseTree.contains('space')) {
  doSomething();
}
```

### parseTree.content

##### Returns

<table>
  <tr>
    <td><i>{string|Array}</i></td>
    <td>Node's content (child nodes or a string).</td>
  </tr>
</table>

### parseTree.eachFor([type, ]callback)

##### Description

Calls a function for every child node in tree. If `type` parameter is passed,
calls a function only for child nodes of a given type. The main difference from
`parseTree.forEach()` is that this method loops through node list from the end
to beginning.

##### Parameters

<table>
  <tr>
    <td><i>{string=}</i></td>
    <td>type</td>
    <td>
      Optional. A node type by which to filter child nodes before applying
      a callback function. For a list of available values see
      <a href="docs/node-types.md">"Node types"</a>.
    </td>
  </tr>
  <tr>
    <td><i>{Function}</i></td>
    <td>callback</td>
    <td>
      Function to call for every child node. Accepts following parameters:
      <ul>
        <li><code>{Object}</code> — a child node;</li>
        <li><code>{number}</code> — index of the child node in node list;</li>
        <li>
          <code>{Object}</code> — parent node (equals to <code>parseTree</code>).
        </li>
      </ul>
    </td>
  </tr>
</table>

##### Examples

```js
parseTree.eachFor(function(childNode) {
  doSomething(childNode);
});
```

```js
// Remove all child spaces.
parseTree.eachFor('space', function(spaceNode, i) {
  parseTree.removeChild(i);
});
```

### parseTree.end

##### Returns

<table>
  <tr>
    <td><i>{Object}</i></td>
    <td>
      End position of the node. Contains following info:
      <ul>
        <li>
          <code>{number} line</code> — last symbol's line number
          (1-based index);
        </li>
        <li>
          <code>{number} column</code> — last symbol's column number
          (1-based index).
        </li>
      </ul>
    </td>
  </tr>
</table>

### parseTree.first([type])

##### Description

Gets the first child node. If `type` parameter is passed, gets the first child
node of a given type. If no node has been found, returns `null`.

##### Parameters

<table>
  <tr>
    <td><i>{string=}</i></td>
    <td>type</td>
    <td>
      Optional. Node type to look for. For a list of available values see
      <a href="docs/node-types.md">"Node types"</a>.
    </td>
  </tr>
</table>

##### Returns

<table>
  <tr>
    <td><i>{?Object}</i></td>
    <td>A node.</td>
  </tr>
</table>

##### Examples

```js
let node = parseTree.first();
node.content = 'panda';
```

```js
let node = parseTree.first('multilineComment');
node.content = 'panda';
```

### parseTree.forEach([type, ]callback)

##### Description

Calls a function for every child node in tree. If `type` parameter is passed,
calls a function only for child nodes of a given type. The main difference from
`parseTree.eachFor()` is that this method loops through node list from the
beginnig to end.

##### Parameters

<table>
  <tr>
    <td><i>{string=}</i></td>
    <td>type</td>
    <td>
      Optional. A node type by which to filter child nodes before applying
      a callback function. For a list of available values see
      <a href="docs/node-types.md">"Node types"</a>.
    </td>
  </tr>
  <tr>
    <td><i>{Function}</i></td>
    <td>callback</td>
    <td>
      Function to call for every child node. Accepts following parameters:
      <ul>
        <li><code>{Object}</code> — a child node;</li>
        <li><code>{number}</code> — index of the child node in node list;</li>
        <li>
          <code>{Object}</code> — parent node (equals to <code>parseTree</code>).
        </li>
      </ul>
    </td>
  </tr>
</table>

##### Examples

```js
parseTree.forEach(function(childNode) {
  doSomething();
});
```

```js
parseTree.forEach('space', function(spaceNode) {
  doSomething();
});
```

### parseTree.get(index)

##### Description

Gets *nth* child of the `parseTree`. If no node has been found, returns `null`.

##### Parameters

<table>
  <tr>
    <td><i>{number}</i></td>
    <td>index</td>
    <td>Index number of node which we're looking for.</td>
  </tr>
</table>

##### Returns

<table>
  <tr>
    <td><i>{?Object}</i></td>
    <td>A node.</td>
  </tr>
</table>

##### Examples

```js
var node = parseTree.get(2);
doSomething(node);
```

### parseTree.insert(index, node)

##### Description

Inserts a node to a given position in `parseTree`.

##### Parameters

<table>
  <tr>
    <td><i>{number}</i></td>
    <td>index</td>
    <td>Index of position where to insert the node.</td>
  </tr>
  <tr>
    <td><i>{Object}</i></td>
    <td>node</td>
    <td>A node to insert.</td>
  </tr>
</table>

##### Examples

```js
let node = gonzales.createNode({type: 'animal', content: 'panda'});
parseTree.insert(2, node);
```

### parseTree.is(type)

##### Description

Checks whether the node is of given type.

##### Parameters

<table>
  <tr>
    <td><i>{string}</i></td>
    <td>type</td>
    <td>
      A node type against which to check type of <code>parseTree</code>.
      For a list of available values see
      <a href="docs/node-types.md">"Node types"</a>.
    </td>
  </tr>
</table>

##### Returns

<table>
  <tr>
    <td><i>{boolean}</i></td>
    <td>
      <code>true</code> if types are equal, <code>false</code> otherwise.
    </td>
  </tr>
</table>

##### Examples

```js
if (node.is('space')) {
  node.content = '';
}
```

### parseTree.last(type)

Gets the last child node. If `type` parameter is passed, gets the last child
node of a given type. If no node has been found, returns `null`.

##### Parameters

<table>
  <tr>
    <td><i>{string=}</i></td>
    <td>type</td>
    <td>
      Optional. Node type to look for. For a list of available values see
      <a href="docs/node-types.md">"Node types"</a>.
    </td>
  </tr>
</table>

##### Returns

<table>
  <tr>
    <td><i>{?Object}</i></td>
    <td>A node.</td>
  </tr>
</table>

##### Examples

```js
let node = parseTree.last();
node.content = 'panda';
```

```js
let node = parseTree.last('multilineComment');
node.content = 'panda';
```

### parseTree.length

##### Returns

<table>
  <tr>
    <td><i>{number}</i></td>
    <td>Number of child nodes.</td>
  </tr>
</table>

### parseTree.removeChild(index)

##### Description

Removes a child node at a given position.

##### Parameters

<table>
  <tr>
    <td><i>{number}</i></td>
    <td>index</td>
    <td>Index of a child node we need to remove.</td>
  </tr>
</table>

##### Returns

<table>
  <tr>
    <td><i>{Object}</i></td>
    <td>Removed node.</td>
  </tr>
</table>
##### Examples

```js
// Swap nodes.
var node = parseTree.removeChild(1);
parseTree.insert(0, node);
```

### parseTree.start

##### Returns

<table>
  <tr>
    <td><i>{Object}</i></td>
    <td>
      Start position of the node. Contains following info:
      <ul>
        <li>
          <code>{number} line</code> — first symbol's line number
          (1-based index);
        </li>
        <li>
          <code>{number} column</code> — first symbol's column number
          (1-based index).
        </li>
      </ul>
    </td>
  </tr>
</table>


### parseTree.syntax

##### Returns

<table>
  <tr>
    <td><i>{string}</i></td>
    <td>Syntax of original parsed string.</td>
  </tr>
</table>

### parseTree.toJson()

##### Description

Converts parse tree to JSON. Useful for printing.

##### Returns

<table>
  <tr>
    <td><i>{Object}</i></td>
    <td>Parse tree in JSON</td>
  </tr>
</table>

### parseTree.toString()

##### Description

Converts parse tree back to string according to original syntax.

##### Returns

<table>
  <tr>
    <td><i>{string}</i></td>
    <td>A compiled string.</td>
  </tr>
</table>

##### Examples

```js
let css = parseTree.toString();
```

### parseTree.traverse(callback)

##### Description

Calls the function for every node in a tree including `parseTree` itself.

##### Parameters

<table>
  <tr>
    <td><i>{Function}</i></td>
    <td>callback</td>
    <td>
      Function to apply to every node. Accepts following parameters:
      <ul>
        <li><code>{Object}</code> — a node to which we apply callback;</li>
        <li><code>{number}</code> — node's index number inside its parent;</li>
        <li><code>{Object}</code> — a node's parent;</li>
        <li>
          <code>{number}</code> — node's nesting level relative to its parent.
        </li>
      </ul>
    </td>
  </tr>
</table>

##### Examples

```js
parseTree.traverse(function(node, index, parent) {
  if (node.is('multilineComment')) {
    parent.removeChild(index);
  } else if (node.is('space')) {
    node.content = ' ';
  }
});
```

### parseTree.traverseByType(type, callback)

##### Description

This method should be called for a root node, because calling it for a child
will be more time consuming.    
Calls the function for every node of a given type. This means not just child
nodes, but grandchilds and so on.

##### Parameters

<table>
  <tr>
    <td><i>{string}</i></td>
    <td>type</td>
    <td>
      Node type. For a list of available values please see
      <a href="docs/node-types.md">"Node types"</a>.
    </td>
  </tr>
  <tr>
    <td><i>{Function}</i></td>
    <td>callback</td>
    <td>
      Function to apply to every node of a given type.
      Accepts following parameters:
      <ul>
        <li><code>{Object}</code> — a node to which we apply callback;</li>
        <li><code>{number}</code> — node's index number inside its parent;</li>
        <li><code>{Object}</code> — a node's parent.</li>
      </ul>
    </td>
  </tr>
</table>

##### Examples

```js
// Remove all comments.
parseTree.traverseByType('multilineComment', function(node, index, parent) {
  parent.removeChild(index);
});
```

### parseTree.traverseByTypes(types, callback)

##### Description

This method should be called for a root node, because calling it for a child
will be more time consuming.    
Calls the function for every node of given types. This means not just child
nodes, but grandchilds and so on.

##### Parameters

<table>
  <tr>
    <td><i>{Array.string}</i></td>
    <td>types</td>
    <td>
      List of node types. For a list of available values please see
      <a href="docs/node-types.md">"Node types"</a>.
    </td>
  </tr>
  <tr>
    <td><i>{Function}</i></td>
    <td>callback</td>
    <td>
      Function to apply to every node of given types.
      Accepts following parameters:
      <ul>
        <li><code>{Object}</code> — a node to which we apply callback;</li>
        <li><code>{number}</code> — node's index number inside its parent;</li>
        <li><code>{Object}</code> — a node's parent.</li>
      </ul>
    </td>
  </tr>
</table>

##### Examples

```js
// Remove all comments and spaces.
let types = ['multilineComment', 'space'];
parseTree.traverseByTypes(types, function(node, index, parent) {
  parent.removeChild(index);
});
```

### parseTree.type

##### Returns

<table>
  <tr>
    <td><i>{string}</i></td>
    <td>
      Node type. For a list of available values see
      <a href="docs/node-types.md">"Node types"</a>.
    </td>
  </tr>
</table>


## Test

To run tests:

    npm test

This command will build library files from sources and run tests on all files
in syntax directories.

Every test has 3 files: source stylesheet, expected parse tree and expected
string compiled back from parse tree to css.

If some tests fail, you can find information in test logs:

- `log/test.log` contains all information from stdout;
- `log/expected.txt` contains only expected text;
- `log/result.txt` contains only result text.

The last two are made for your convenience: you can use any diff app to see
the defference between them.

If you want to test one specific string or get a general idea of how Gonzales
works, you can use `test/ast.js` file.    
Simply change the first two strings (`css` and `syntax` vars) and run:

    node test/single-test.js

## Report

If you find a bug or want to add a feature, welcome to [Issues](https://github.com/tonyganch/gonzales-pe/issues).

If you are shy but have a question, feel free to [drop me a
line](mailto:tonyganch+gonzales@gmail.com).
