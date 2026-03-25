@protobufjs/codegen
===================
[![npm](https://img.shields.io/npm/v/@protobufjs/codegen.svg)](https://www.npmjs.com/package/@protobufjs/codegen)

A minimalistic code generation utility.

API
---

* **codegen([functionParams: `string[]`], [functionName: string]): `Codegen`**<br />
  Begins generating a function.

* **codegen.verbose = `false`**<br />
  When set to true, codegen will log generated code to console. Useful for debugging.

Invoking **codegen** returns an appender function that appends code to the function's body and returns itself:

* **Codegen(formatString: `string`, [...formatParams: `any`]): Codegen**<br />
  Appends code to the function's body. The format string can contain placeholders specifying the types of inserted format parameters:

  * `%d`: Number (integer or floating point value)
  * `%f`: Floating point value
  * `%i`: Integer value
  * `%j`: JSON.stringify'ed value
  * `%s`: String value
  * `%%`: Percent sign<br />

* **Codegen([scope: `Object.<string,*>`]): `Function`**<br />
  Finishes the function and returns it.

* **Codegen.toString([functionNameOverride: `string`]): `string`**<br />
  Returns the function as a string.

Example
-------

```js
var codegen = require("@protobufjs/codegen");

var add = codegen(["a", "b"], "add") // A function with parameters "a" and "b" named "add"
  ("// awesome comment")             // adds the line to the function's body
  ("return a + b - c + %d", 1)       // replaces %d with 1 and adds the line to the body
  ({ c: 1 });                        // adds "c" with a value of 1 to the function's scope

console.log(add.toString()); // function add(a, b) { return a + b - c + 1 }
console.log(add(1, 2));      // calculates 1 + 2 - 1 + 1 = 3
```

**License:** [BSD 3-Clause License](https://opensource.org/licenses/BSD-3-Clause)
