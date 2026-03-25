# is-dom-node

![Build Status](https://img.shields.io/github/actions/workflow/status/xmldom/is-dom-node/ci.yml)
![Code Coverage](https://img.shields.io/codecov/c/github/xmldom/is-dom-node)
![NPM Version](https://img.shields.io/npm/v/@xmldom/is-dom-node)
![License](https://img.shields.io/npm/l/@xmldom/is-dom-node)

## Description

`@xmldom/is-dom-node` is a versatile TypeScript library designed to provide robust utility functions for working with DOM nodes. Whether you're developing for the browser or dealing with XML in NodeJS, this library offers a comprehensive set of functions for checking and asserting various types of DOM nodes. It's particularly useful when working with NodeJS libraries like [xpath](https://www.npmjs.com/package/xpath) and [@xmldom/xmldom](https://www.npmjs.com/package/@xmldom/xmldom), as it can validate the objects returned by these libraries.

## Installation

```shell
npm install @xmldom/is-dom-node
```

## Usage

Import the library and use it as follows:

```javascript
import * as isDomNode from "@xmldom/is-dom-node";

const element = document.createElement("div");
const result = isDomNode.isElementNode(element); // Output: true
```

### TypeScript Example

```typescript
import * as isDomNode from "@xmldom/is-dom-node";

function handleNode(node: Node) {
  if (isDomNode.isElementNode(node)) {
    // TypeScript now knows `node` is an Element
    console.log(node.tagName);
  } else if (isDomNode.isTextNode(node)) {
    // TypeScript now knows `node` is a Text node
    console.log(node.wholeText);
  } else {
    try {
      // Assert that the node is a Comment node
      isDomNode.assertIsCommentNode(node);
      // TypeScript now knows `node` is a Comment node
      console.log(node.nodeValue);
    } catch (error) {
      console.error("Node is not a Comment node:", error);
    }
  }
}
```

## API Overview

The API consists of two main types of functions:

### `is...` Functions

These functions return a boolean value indicating whether the given object meets certain criteria:

- `isNodeLike`: Checks if a given value resembles a DOM node.
- `isArrayOfNodes`: Checks if the given value is an array of DOM nodes.
- `isElementNode`, `isAttributeNode`, `isTextNode`, etc.: Check for specific types of DOM nodes.

### `assertIs...` Functions

These functions assert that a given object meets certain criteria and throw an error if it doesn't:

- `assertIsNodeLike`: Asserts that a given value is a DOM node.
- `assertIsArrayOfNodes`: Asserts that the given value is an array of DOM nodes.
- `assertIsElementNode`, `assertIsAttributeNode`, `assertIsTextNode`, etc.: Assert for specific types of DOM nodes.

### TypeScript Type Narrowing

Both the `is...` and `assertIs...` functions can be used for TypeScript type narrowing. After a successful check or assertion, TypeScript will recognize the specific type of the DOM node, allowing for more robust and error-free code.

## Features

- Lightweight
- Written in TypeScript
- Comprehensive tests
- Compatible with NodeJS XML libraries like `xpath` and `@xmldom/xmldom`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
