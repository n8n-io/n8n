# Momoa JSON

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate).

## About

Momoa is a general purpose JSON utility toolkit, containing:

* A **tokenizer** that allows you to separate a JSON string into its component parts.
* A ECMA-404 compliant **parser** that produces an abstract syntax tree (AST) representing everything inside of a JSON string.
* A **traverser** that visits an AST produced by the parser in order.
* A **printer** that can convert an AST produced by the parser back into a valid JSON string.

## Background

JavaScript defines the `JSON` object with methods for both parsing strings into objects and converting objects into JSON-formatted strings. In most cases, this is exactly what you need and should use without question. However, these methods aren't useful for more fine-grained analysis of JSON structures. For instance, you'll never know if a JSON object contains two properties with the same names because `JSON.parse()` will ignore the first one and return the value of the second. A tool like Momoa comes in handy when you want to know not just the result of JSON parsing, but exactly what is contained in the original JSON string.

## Installation

You can install Momoa using npm or Yarn:

```bash
npm install @humanwhocodes/momoa --save

# or

yarn add @humanwhocodes/momoa
```

## Usage

### Parsing 

To parse a JSON string into an AST, use the `parse()` function:

```js
const { parse } = require("@humanwhocodes/momoa");

const ast = parse(some_json_string);
```

The `parse()` function accepts a second argument, which is an options object that may contain one or more of the following properties:

* `comments` - set to `true` if you want to parse C-style line and block comments inside of JSON.
* `ranges` - set to `true` if you want each node to also have a `range` property, which is an array containing the start and stop index for the syntax. If `tokens` is also `true`, then the tokens will also have `range` properties.
* `tokens` - set to `true` to return a `tokens` property on the root node containing all of the tokens used to parse the code. If `comments` is also `true`, then the tokens include comment tokens.

Here's an example of passing options:

```js
const { parse } = require("@humanwhocodes/momoa");

const ast = parse(some_json_string, { tokens: true });

// root now has a tokens array
console.dir(ast.tokens);
```

### Tokenizing 

To produce JSON tokens from a string, use the `tokenize()` function:

```js
const { tokenize } = require("@humanwhocodes/momoa");

for (const token of tokenize(some_json_string)) {
    console.log(token.type);
    console.log(token.value);
}
```

The `tokenize()` function accepts a second parameter, which is an options object that may contain one or more of the following properties:

* `comments` - set to `true` if you want to tokenize C-style line and block comments inside of JSON.
* `ranges` - set to `true` if you want each token to also have a `range` property, which is an array containing the start and stop index for the syntax.

### Traversing

There are two ways to traverse an AST: iteration and traditional traversal.

#### Iterating

Iteration uses a generator function to create an iterator over the AST:

```js
const { parse, iterator } = require("@humanwhocodes/momoa");

const ast = parse(some_json_string);

for (const { node, parent, phase } of iterator(ast)) {
    console.log(node.type);
    console.log(phase); // "enter" or "exit"
}
```

Each step of the iterator returns an object with three properties:

1. `node` - the node that the traversal is currently visiting
1. `parent` - the parent node of `node`
1. `phase` - a string indicating the phase of traversal (`"enter"` when first visiting the node, `"exit"` when leaving the node)

You can also filter the iterator by passing in a filter function. For instance, if you only want steps to be returned in the `"enter"` phase, you can do this:

```js
const { parse, iterator } = require("@humanwhocodes/momoa");

const ast = parse(some_json_string);

for (const { node } of iterator(ast, ({ phase }) => phase === "enter")) {
    console.log(node.type);
}
```

#### Traversing

Traversing uses a function that accepts an object with `enter` and `exit` properties:

```js
const { parse, traverse } = require("@humanwhocodes/momoa");

const ast = parse(some_json_string);

traverse(ast, {
    enter(node, parent) {
        console.log("Entering", node.type);
    },
    exit(node, parent) {
        console.log("Exiting", node.type);
    }
});
```

## Evaluating

To convert an AST into the JavaScript value it represents, use the `evaluate()` function:

```js
const { parse, evaluate } = require("@humanwhocodes/momoa");

// same as JSON.parse(some_json_string)
const ast = parse(some_json_string);
const value = evaluate(ast);
```

In this example, `value` is the same result you would get from calling `JSON.parse(some_json_string)` (`ast` is the intermediate format representing the syntax).

### Printing

To convert an AST back into a JSON string, use the `print()` function:

```js
const { parse, print } = require("@humanwhocodes/momoa");

const ast = parse(some_json_string);
const text = print(ast);
```

**Note:** The printed AST will not produce the same result as the original JSON text as the AST does not preserve whitespace.

You can modify the output of the `print()` function by passing in an object with an `indent` option specifying the number of spaces to use for indentation. When the `indent` option is passed, the text produced will automatically have newlines insert after each `{`, `}`, `[`, `]`, and `,` characters.

```js
const { parse, print } = require("@humanwhocodes/momoa");

const ast = parse(some_json_string);
const text = print(ast, { indent: 4 });
```

## Development

To work on Momoa, you'll need:

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org)

The first step is to clone the repository:

```bash
git clone https://github.com/humanwhocodes/momoa.git
```

Then, enter the directory and install the dependencies:

```bash
cd momoa
npm install
```

After that, you can run the tests via:

```bash
npm test
```

**Note:** Momoa builds itself into a single file for deployment. The `npm test` command automatically rebuilds Momoa into that single file whenever it is run. If you are testing in a different way, then you may need to manually rebuild using the `npm run build` command.

## Acknowledgements

This project takes inspiration (but not code) from a number of other projects:

* [`Esprima`](https://esprima.org) inspired the package interface and AST format.
* [`json-to-ast`](https://github.com/vtrushin/json-to-ast) inspired the AST format.
* [`parseJson.js`](https://gist.github.com/rgrove/5cc64db4b9ae8c946401b230ba9d2451) inspired me by showing writing a parser isn't all that hard.

## License

Apache 2.0

## Frequently Asked Questions

### What does "Momoa" even mean?

Momoa is the last name of American actor [Jason Momoa](https://en.wikipedia.org/wiki/Jason_Momoa). Because "JSON" is pronounced "Jason", I wanted a name that played off of this fact. The most obvious choice would have been something related to [Jason and the Argonauts](https://en.wikipedia.org/wiki/Jason_and_the_Argonauts_(1963_film)), as this movie is referenced in the [JSON specification](https://ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf) directly. However, both "Argo" and "Argonaut" were already used for open source projects. When I did a search for "Jason" online, Jason Momoa was the first result that came up. He always plays badass characters so it seemed to fit.

### Why support comments in JSON?

There are a number of programs that allow C-style comments in JSON files, most notably, configuration files for [Visual Studio Code](https://code.visualstudio.com). As there seems to be a need for this functionality, I decided to add it out-of-the-box.

### Why are the source files in ESM and the test files are in CommonJS?

Unfortunately, Node.js still doesn't natively support ECMAScript Modules (ESM) and everyone generally expects npm packages to export things via CommonJS. As such, the source files are built (using Rollup) into a CommonJS package before publishing. To ensure that the published API is working correctly, it makes sense to write the tests in CommonJS and to pull in what would be the published package API.
