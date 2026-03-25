# AST Types ![CI](https://github.com/benjamn/ast-types/workflows/CI/badge.svg)

This module provides an efficient, modular,
[Esprima](https://github.com/ariya/esprima)-compatible implementation of
the [abstract syntax
tree](http://en.wikipedia.org/wiki/Abstract_syntax_tree) type hierarchy
pioneered by the [Mozilla Parser
API](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API).

Installation
---

From NPM:

    npm install ast-types

From GitHub:

    cd path/to/node_modules
    git clone git://github.com/benjamn/ast-types.git
    cd ast-types
    npm install .

Basic Usage
---
```js
import assert from "assert";
import {
  namedTypes as n,
  builders as b,
} from "ast-types";

var fooId = b.identifier("foo");
var ifFoo = b.ifStatement(fooId, b.blockStatement([
  b.expressionStatement(b.callExpression(fooId, []))
]));

assert.ok(n.IfStatement.check(ifFoo));
assert.ok(n.Statement.check(ifFoo));
assert.ok(n.Node.check(ifFoo));

assert.ok(n.BlockStatement.check(ifFoo.consequent));
assert.strictEqual(
  ifFoo.consequent.body[0].expression.arguments.length,
  0,
);

assert.strictEqual(ifFoo.test, fooId);
assert.ok(n.Expression.check(ifFoo.test));
assert.ok(n.Identifier.check(ifFoo.test));
assert.ok(!n.Statement.check(ifFoo.test));
```

AST Traversal
---

Because it understands the AST type system so thoroughly, this library
is able to provide excellent node iteration and traversal mechanisms.

If you want complete control over the traversal, and all you need is a way
of enumerating the known fields of your AST nodes and getting their
values, you may be interested in the primitives `getFieldNames` and
`getFieldValue`:
```js
import {
  getFieldNames,
  getFieldValue,
} from "ast-types";

const partialFunExpr = { type: "FunctionExpression" };

// Even though partialFunExpr doesn't actually contain all the fields that
// are expected for a FunctionExpression, types.getFieldNames knows:
console.log(getFieldNames(partialFunExpr));
// [ 'type', 'id', 'params', 'body', 'generator', 'expression',
//   'defaults', 'rest', 'async' ]

// For fields that have default values, types.getFieldValue will return
// the default if the field is not actually defined.
console.log(getFieldValue(partialFunExpr, "generator"));
// false
```

Two more low-level helper functions, `eachField` and `someField`, are
defined in terms of `getFieldNames` and `getFieldValue`:
```js
// Iterate over all defined fields of an object, including those missing
// or undefined, passing each field name and effective value (as returned
// by getFieldValue) to the callback. If the object has no corresponding
// Def, the callback will never be called.
export function eachField(object, callback, context) {
  getFieldNames(object).forEach(function(name) {
    callback.call(this, name, getFieldValue(object, name));
  }, context);
}

// Similar to eachField, except that iteration stops as soon as the
// callback returns a truthy value. Like Array.prototype.some, the final
// result is either true or false to indicates whether the callback
// returned true for any element or not.
export function someField(object, callback, context) {
  return getFieldNames(object).some(function(name) {
    return callback.call(this, name, getFieldValue(object, name));
  }, context);
}
```

So here's how you might make a copy of an AST node:
```js
import { eachField } from "ast-types";
const copy = {};
eachField(node, function(name, value) {
  // Note that undefined fields will be visited too, according to
  // the rules associated with node.type, and default field values
  // will be substituted if appropriate.
  copy[name] = value;
})
```

But that's not all! You can also easily visit entire syntax trees using
the powerful `types.visit` abstraction.

Here's a trivial example of how you might assert that `arguments.callee`
is never used in `ast`:
```js
import assert from "assert";
import {
  visit,
  namedTypes as n,
} from "ast-types";

visit(ast, {
  // This method will be called for any node with .type "MemberExpression":
  visitMemberExpression(path) {
    // Visitor methods receive a single argument, a NodePath object
    // wrapping the node of interest.
    var node = path.node;

    if (
      n.Identifier.check(node.object) &&
      node.object.name === "arguments" &&
      n.Identifier.check(node.property)
    ) {
      assert.notStrictEqual(node.property.name, "callee");
    }

    // It's your responsibility to call this.traverse with some
    // NodePath object (usually the one passed into the visitor
    // method) before the visitor method returns, or return false to
    // indicate that the traversal need not continue any further down
    // this subtree.
    this.traverse(path);
  }
});
```

Here's a slightly more involved example of transforming `...rest`
parameters into browser-runnable ES5 JavaScript:

```js
import { builders as b, visit } from "ast-types";

// Reuse the same AST structure for Array.prototype.slice.call.
var sliceExpr = b.memberExpression(
  b.memberExpression(
    b.memberExpression(
      b.identifier("Array"),
      b.identifier("prototype"),
      false
    ),
    b.identifier("slice"),
    false
  ),
  b.identifier("call"),
  false
);

visit(ast, {
  // This method will be called for any node whose type is a subtype of
  // Function (e.g., FunctionDeclaration, FunctionExpression, and
  // ArrowFunctionExpression). Note that types.visit precomputes a
  // lookup table from every known type to the appropriate visitor
  // method to call for nodes of that type, so the dispatch takes
  // constant time.
  visitFunction(path) {
    // Visitor methods receive a single argument, a NodePath object
    // wrapping the node of interest.
    const node = path.node;

    // It's your responsibility to call this.traverse with some
    // NodePath object (usually the one passed into the visitor
    // method) before the visitor method returns, or return false to
    // indicate that the traversal need not continue any further down
    // this subtree. An assertion will fail if you forget, which is
    // awesome, because it means you will never again make the
    // disastrous mistake of forgetting to traverse a subtree. Also
    // cool: because you can call this method at any point in the
    // visitor method, it's up to you whether your traversal is
    // pre-order, post-order, or both!
    this.traverse(path);

    // This traversal is only concerned with Function nodes that have
    // rest parameters.
    if (!node.rest) {
      return;
    }

    // For the purposes of this example, we won't worry about functions
    // with Expression bodies.
    n.BlockStatement.assert(node.body);

    // Use types.builders to build a variable declaration of the form
    //
    //   var rest = Array.prototype.slice.call(arguments, n);
    //
    // where `rest` is the name of the rest parameter, and `n` is a
    // numeric literal specifying the number of named parameters the
    // function takes.
    const restVarDecl = b.variableDeclaration("var", [
      b.variableDeclarator(
        node.rest,
        b.callExpression(sliceExpr, [
          b.identifier("arguments"),
          b.literal(node.params.length)
        ])
      )
    ]);

    // Similar to doing node.body.body.unshift(restVarDecl), except
    // that the other NodePath objects wrapping body statements will
    // have their indexes updated to accommodate the new statement.
    path.get("body", "body").unshift(restVarDecl);

    // Nullify node.rest now that we have simulated the behavior of
    // the rest parameter using ordinary JavaScript.
    path.get("rest").replace(null);

    // There's nothing wrong with doing node.rest = null, but I wanted
    // to point out that the above statement has the same effect.
    assert.strictEqual(node.rest, null);
  }
});
```

Here's how you might use `types.visit` to implement a function that
determines if a given function node refers to `this`:

```js
function usesThis(funcNode) {
  n.Function.assert(funcNode);
  var result = false;

  visit(funcNode, {
    visitThisExpression(path) {
      result = true;

      // The quickest way to terminate the traversal is to call
      // this.abort(), which throws a special exception (instanceof
      // this.AbortRequest) that will be caught in the top-level
      // types.visit method, so you don't have to worry about
      // catching the exception yourself.
      this.abort();
    },

    visitFunction(path) {
      // ThisExpression nodes in nested scopes don't count as `this`
      // references for the original function node, so we can safely
      // avoid traversing this subtree.
      return false;
    },

    visitCallExpression(path) {
      const node = path.node;

      // If the function contains CallExpression nodes involving
      // super, those expressions will implicitly depend on the
      // value of `this`, even though they do not explicitly contain
      // any ThisExpression nodes.
      if (this.isSuperCallExpression(node)) {
        result = true;
        this.abort(); // Throws AbortRequest exception.
      }

      this.traverse(path);
    },

    // Yes, you can define arbitrary helper methods.
    isSuperCallExpression(callExpr) {
      n.CallExpression.assert(callExpr);
      return this.isSuperIdentifier(callExpr.callee)
          || this.isSuperMemberExpression(callExpr.callee);
    },

    // And even helper helper methods!
    isSuperIdentifier(node) {
      return n.Identifier.check(node.callee)
          && node.callee.name === "super";
    },

    isSuperMemberExpression(node) {
      return n.MemberExpression.check(node.callee)
          && n.Identifier.check(node.callee.object)
          && node.callee.object.name === "super";
    }
  });

  return result;
}
```

As you might guess, when an `AbortRequest` is thrown from a subtree, the
exception will propagate from the corresponding calls to `this.traverse`
in the ancestor visitor methods. If you decide you want to cancel the
request, simply catch the exception and call its `.cancel()` method. The
rest of the subtree beneath the `try`-`catch` block will be abandoned, but
the remaining siblings of the ancestor node will still be visited.

NodePath
---

The `NodePath` object passed to visitor methods is a wrapper around an AST
node, and it serves to provide access to the chain of ancestor objects
(all the way back to the root of the AST) and scope information.

In general, `path.node` refers to the wrapped node, `path.parent.node`
refers to the nearest `Node` ancestor, `path.parent.parent.node` to the
grandparent, and so on.

Note that `path.node` may not be a direct property value of
`path.parent.node`; for instance, it might be the case that `path.node` is
an element of an array that is a direct child of the parent node:
```js
path.node === path.parent.node.elements[3]
```
in which case you should know that `path.parentPath` provides
finer-grained access to the complete path of objects (not just the `Node`
ones) from the root of the AST:
```js
// In reality, path.parent is the grandparent of path:
path.parentPath.parentPath === path.parent

// The path.parentPath object wraps the elements array (note that we use
// .value because the elements array is not a Node):
path.parentPath.value === path.parent.node.elements

// The path.node object is the fourth element in that array:
path.parentPath.value[3] === path.node

// Unlike path.node and path.value, which are synonyms because path.node
// is a Node object, path.parentPath.node is distinct from
// path.parentPath.value, because the elements array is not a
// Node. Instead, path.parentPath.node refers to the closest ancestor
// Node, which happens to be the same as path.parent.node:
path.parentPath.node === path.parent.node

// The path is named for its index in the elements array:
path.name === 3

// Likewise, path.parentPath is named for the property by which
// path.parent.node refers to it:
path.parentPath.name === "elements"

// Putting it all together, we can follow the chain of object references
// from path.parent.node all the way to path.node by accessing each
// property by name:
path.parent.node[path.parentPath.name][path.name] === path.node
```

These `NodePath` objects are created during the traversal without
modifying the AST nodes themselves, so it's not a problem if the same node
appears more than once in the AST (like `Array.prototype.slice.call` in
the example above), because it will be visited with a distict `NodePath`
each time it appears.

Child `NodePath` objects are created lazily, by calling the `.get` method
of a parent `NodePath` object:
```js
// If a NodePath object for the elements array has never been created
// before, it will be created here and cached in the future:
path.get("elements").get(3).value === path.value.elements[3]

// Alternatively, you can pass multiple property names to .get instead of
// chaining multiple .get calls:
path.get("elements", 0).value === path.value.elements[0]
```

`NodePath` objects support a number of useful methods:
```js
// Replace one node with another node:
var fifth = path.get("elements", 4);
fifth.replace(newNode);

// Now do some stuff that might rearrange the list, and this replacement
// remains safe:
fifth.replace(newerNode);

// Replace the third element in an array with two new nodes:
path.get("elements", 2).replace(
  b.identifier("foo"),
  b.thisExpression()
);

// Remove a node and its parent if it would leave a redundant AST node:
//e.g. var t = 1, y =2; removing the `t` and `y` declarators results in `var undefined`.
path.prune(); //returns the closest parent `NodePath`.

// Remove a node from a list of nodes:
path.get("elements", 3).replace();

// Add three new nodes to the beginning of a list of nodes:
path.get("elements").unshift(a, b, c);

// Remove and return the first node in a list of nodes:
path.get("elements").shift();

// Push two new nodes onto the end of a list of nodes:
path.get("elements").push(d, e);

// Remove and return the last node in a list of nodes:
path.get("elements").pop();

// Insert a new node before/after the seventh node in a list of nodes:
var seventh = path.get("elements", 6);
seventh.insertBefore(newNode);
seventh.insertAfter(newNode);

// Insert a new element at index 5 in a list of nodes:
path.get("elements").insertAt(5, newNode);
```

Scope
---

The object exposed as `path.scope` during AST traversals provides
information about variable and function declarations in the scope that
contains `path.node`. See [scope.ts](lib/scope.ts) for its public
interface, which currently includes `.isGlobal`, `.getGlobalScope()`,
`.depth`, `.declares(name)`, `.lookup(name)`, and `.getBindings()`.

Custom AST Node Types
---

The `ast-types` module was designed to be extended. To that end, it
provides a readable, declarative syntax for specifying new AST node types,
based primarily upon the `require("ast-types").Type.def` function:
```js
import {
  Type,
  builtInTypes,
  builders as b,
  finalize,
} from "ast-types";

const { def } = Type;
const { string } = builtInTypes;

// Suppose you need a named File type to wrap your Programs.
def("File")
  .bases("Node")
  .build("name", "program")
  .field("name", string)
  .field("program", def("Program"));

// Prevent further modifications to the File type (and any other
// types newly introduced by def(...)).
finalize();

// The b.file builder function is now available. It expects two
// arguments, as named by .build("name", "program") above.
const main = b.file("main.js", b.program([
  // Pointless program contents included for extra color.
  b.functionDeclaration(b.identifier("succ"), [
    b.identifier("x")
  ], b.blockStatement([
    b.returnStatement(
      b.binaryExpression(
        "+", b.identifier("x"), b.literal(1)
      )
    )
  ]))
]));

assert.strictEqual(main.name, "main.js");
assert.strictEqual(main.program.body[0].params[0].name, "x");
// etc.

// If you pass the wrong type of arguments, or fail to pass enough
// arguments, an AssertionError will be thrown.

b.file(b.blockStatement([]));
// ==> AssertionError: {"body":[],"type":"BlockStatement","loc":null} does not match type string

b.file("lib/types.js", b.thisExpression());
// ==> AssertionError: {"type":"ThisExpression","loc":null} does not match type Program
```

The `def` syntax is used to define all the default AST node types found in
[babel-core.ts](def/babel-core.ts),
[babel.ts](def/babel.ts),
[core.ts](def/core.ts),
[es-proposals.ts](def/es-proposals.ts),
[es6.ts](def/es6.ts),
[es7.ts](def/es7.ts),
[es2020.ts](def/es2020.ts),
[esprima.ts](def/esprima.ts),
[flow.ts](def/flow.ts),
[jsx.ts](def/jsx.ts),
[type-annotations.ts](def/type-annotations.ts),
and
[typescript.ts](def/typescript.ts),
so you have
no shortage of examples to learn from.
