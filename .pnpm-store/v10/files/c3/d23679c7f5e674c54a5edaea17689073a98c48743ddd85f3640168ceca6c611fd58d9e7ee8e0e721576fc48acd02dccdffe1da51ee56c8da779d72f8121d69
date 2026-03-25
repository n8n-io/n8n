# Namespace Resolvers

The methods on the [XPathEvaluator](XPathEvaluator.md) type can optionally take a namespace resolver to resolve 
namespace references in the XPath expression being evaluated.

There are three ways to specify a namespace resolver and you can use any one of them depending on which is 
most suited to your particular situation.

## Namespace Resolver Type 1: Plain object

A plain object with namespace prefixes as the keys and namespace URIs as the values:

Example usage:

```js
var evaluator = xpath.parse('/bk:book/hp:characters');
var characters = evaluator.select({
    node: myBookNode,
    namespaces: {
        'bk': 'http://sample.org/books/',
        'hp': 'http://sample.org/harrypotter/'
    }
});
```

## Namespace Resolver Type 2: Function

A function that takes a namespace prefix as a parameter and returns the corresponding namespace URI. 

Example usage:

```js
var evaluator = xpath.parse('/bk:book/hp:characters');
var characters = evaluator.select({
    node: myBookNode,
    namespaces: function (prefix) {
        if (prefix === 'bk') {
            return 'http://sample.org/books/';
        }
        if (prefix === 'hp') {
            return 'http://sample.org/books/';
        }
    }
});
```

## Namespace Resolver Type 3: Object with `getNamespace` method

An object with a method named `getNamespace` that works in the same way as the function-based namespace resolver 
described above.

Example usage:

```js
var evaluator = xpath.parse('/bk:book/hp:characters');
var characters = evaluator.select({
    node: myBookNode,
    namespaces: {
        getNamespace: function (prefix) {
            if (prefix === 'bk') {
                return 'http://sample.org/books/';
            }
            if (prefix === 'hp') {
                return 'http://sample.org/books/';
            }
        }
    }
});
```
