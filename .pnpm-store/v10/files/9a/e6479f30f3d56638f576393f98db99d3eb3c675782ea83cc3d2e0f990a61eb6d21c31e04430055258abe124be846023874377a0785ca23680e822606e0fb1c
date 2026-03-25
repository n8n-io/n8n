# Web Tree-sitter

[![npmjs.com badge]][npmjs.com]

[npmjs.com]: https://www.npmjs.org/package/web-tree-sitter
[npmjs.com badge]: https://img.shields.io/npm/v/web-tree-sitter.svg?color=%23BF4A4A

WebAssembly bindings to the [Tree-sitter](https://github.com/tree-sitter/tree-sitter) parsing library.

### Setup

You can download the `tree-sitter.js` and `tree-sitter.wasm` files from [the latest GitHub release](https://github.com/tree-sitter/tree-sitter/releases/latest) and load them using a standalone script:

```html
<script src="/the/path/to/tree-sitter.js"></script>

<script>
  const Parser = window.TreeSitter;
  Parser.init().then(() => { /* the library is ready */ });
</script>
```

You can also install [the `web-tree-sitter` module](https://www.npmjs.com/package/web-tree-sitter) from NPM and load it using a system like Webpack:

```js
const Parser = require('web-tree-sitter');
Parser.init().then(() => { /* the library is ready */ });
```

You can use this module with [deno](https://deno.land/):

```js
import Parser from "npm:web-tree-sitter";
await Parser.init();
// the library is ready
```

### Basic Usage

First, create a parser:

```js
const parser = new Parser;
```

Then assign a language to the parser. Tree-sitter languages are packaged as individual `.wasm` files (more on this below):

```js
const JavaScript = await Parser.Language.load('/path/to/tree-sitter-javascript.wasm');
parser.setLanguage(JavaScript);
```

Now you can parse source code:

```js
const sourceCode = 'let x = 1; console.log(x);';
const tree = parser.parse(sourceCode);
```

and inspect the syntax tree.

```javascript
console.log(tree.rootNode.toString());

// (program
//   (lexical_declaration
//     (variable_declarator (identifier) (number)))
//   (expression_statement
//     (call_expression
//       (member_expression (identifier) (property_identifier))
//       (arguments (identifier)))))

const callExpression = tree.rootNode.child(1).firstChild;
console.log(callExpression);

// { type: 'call_expression',
//   startPosition: {row: 0, column: 16},
//   endPosition: {row: 0, column: 30},
//   startIndex: 0,
//   endIndex: 30 }
```

### Editing

If your source code *changes*, you can update the syntax tree. This will take less time than the first parse.

```javascript
// Replace 'let' with 'const'
const newSourceCode = 'const x = 1; console.log(x);';

tree.edit({
  startIndex: 0,
  oldEndIndex: 3,
  newEndIndex: 5,
  startPosition: {row: 0, column: 0},
  oldEndPosition: {row: 0, column: 3},
  newEndPosition: {row: 0, column: 5},
});

const newTree = parser.parse(newSourceCode, tree);
```

### Parsing Text From a Custom Data Structure

If your text is stored in a data structure other than a single string, you can parse it by supplying a callback to `parse` instead of a string:

```javascript
const sourceLines = [
  'let x = 1;',
  'console.log(x);'
];

const tree = parser.parse((index, position) => {
  let line = sourceLines[position.row];
  if (line) return line.slice(position.column);
});
```

### Generate .wasm language files

The following example shows how to generate `.wasm` file for tree-sitter JavaScript grammar.

**IMPORTANT**: [emscripten](https://emscripten.org/docs/getting_started/downloads.html), [docker](https://www.docker.com/), or [podman](https://podman.io) need to be installed.

First install `tree-sitter-cli` and the tree-sitter language for which to generate `.wasm` (`tree-sitter-javascript` in this example):

```sh
npm install --save-dev tree-sitter-cli tree-sitter-javascript
```

Then just use tree-sitter cli tool to generate the `.wasm`.

```sh
npx tree-sitter build --wasm node_modules/tree-sitter-javascript
```

If everything is fine, file `tree-sitter-javascript.wasm` should be generated in current directory.

#### Running .wasm in Node.js

Notice that executing `.wasm` files in node.js is considerably slower than running [node.js bindings](https://github.com/tree-sitter/node-tree-sitter). However could be useful for testing purposes:

```javascript
const Parser = require('web-tree-sitter');

(async () => {
  await Parser.init();
  const parser = new Parser();
  const Lang = await Parser.Language.load('tree-sitter-javascript.wasm');
  parser.setLanguage(Lang);
  const tree = parser.parse('let x = 1;');
  console.log(tree.rootNode.toString());
})();
```

#### Running .wasm in browser

`web-tree-sitter` can run in the browser, but there are some common pitfalls.

##### Loading the .wasm file

`web-tree-sitter` needs to load the `tree-sitter.wasm` file. By default, it assumes that this file is available in the
same path as the JavaScript code. Therefore, if the code is being served from `http://localhost:3000/bundle.js`, then
the wasm file should be at `http://localhost:3000/tree-sitter.wasm`.

For server side frameworks like NextJS, this can be tricky as pages are often served from a path such as
`http://localhost:3000/_next/static/chunks/pages/index.js`. The loader will therefore look for the wasm file at
`http://localhost:3000/_next/static/chunks/pages/tree-sitter.wasm`. The solution is to pass a `locateFile` function in
the `moduleOptions` argument to `Parser.init()`:

```javascript
await Parser.init({
  locateFile(scriptName: string, scriptDirectory: string) {
    return scriptName;
  },
});
```

`locateFile` takes in two parameters, `scriptName`, i.e. the wasm file name, and `scriptDirectory`, i.e. the directory
where the loader expects the script to be. It returns the path where the loader will look for the wasm file. In the NextJS
case, we want to return just the `scriptName` so that the loader will look at `http://localhost:3000/tree-sitter.wasm`
and not `http://localhost:3000/_next/static/chunks/pages/tree-sitter.wasm`.

##### `Can't resolve 'fs' in 'node_modules/web-tree-sitter'`

Most bundlers will notice that the `tree-sitter.js` file is attempting to import `fs`, i.e. node's file system library.
Since this doesn't exist in the browser, the bundlers will get confused. For webpack you can fix this by adding the
following to your webpack config:

```javascript
{
  resolve: {
    fallback: {
      fs: false
    }
  }
}
```
