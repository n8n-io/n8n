# Function Resolvers

The methods on the [XPathEvaluator](XPathEvaluator.md) type can optionally take a function resolver to resolve 
function references in the XPath expression being evaluated.

There are three ways to specify a function resolver and you can use any one of them depending on which is 
most suited to your particular situation.

Note that if your functions are in a namespace (e.g. `fn:myFunction()`), you must use the second or third 
type as the plain object implementation does not support namespaces.

## Function implementations

Custom XPath functions are implemented as JavaScript functions taking one or more arguments.

The first argument passed in is a context object containing a number of properties relating to the execution context, 
the most important being `contextNode`, the context in which the function is being evaluated.

The remaining arguments are the arguments passed into the XPath function, as instances of the `XPathResult` interface.
Please see [the documentation on that interface](XPathResult.md) for details.

As the return value, you can return a string, number, boolean, single node, or array of nodes.

## Function Resolver Type 1: Plain object

A plain object with function names as the keys and function implementations as the values.


Example usage:

```js
var evaluator = xpath.parse('squareRoot(10)');
var aboutPi = evaluator.evaluateNumber({
    functions: {
        'squareRoot': function (c, value) {
            return Math.sqrt(value.numberValue());
        }
    }
});
```

## Function Resolver Type 2: Function

A function that takes a function name as its first parameter and an optional namespace URI as its second parameter 
and returns a function based on the name and namespace.

Example usage:

```js
var evaluator = xpath.parse('math:squareRoot(10)');
var aboutPi = evaluator.evaluateNumber({
    functions: function (name, namespace) {
        if (name === 'squareRoot' && namespace === 'http://sample.org/math/') {
            return function (c, value) {
                return Math.sqrt(value.numberValue());
            };
        }
    },
    namespaces: {
        math: 'http://sample.org/math/'
    }
});
```

## Function Resolver Type 3: Object with `getFunction` method

An object with a method named `getFunction` that works in the same way as the function-based function resolver 
described above.

Example usage:

```js
var evaluator = xpath.parse('math:squareRoot(10)');
var aboutPi = evaluator.evaluateNumber({
    functions: {
        getFunction: function (name, namespace) {
            if (name === 'squareRoot' && namespace === 'http://sample.org/math/') {
                return function (c, value) {
                    return Math.sqrt(value.numberValue());
                };
            }
        }
    },
    namespaces: {
        math: 'http://sample.org/math/'
    }
});
```
