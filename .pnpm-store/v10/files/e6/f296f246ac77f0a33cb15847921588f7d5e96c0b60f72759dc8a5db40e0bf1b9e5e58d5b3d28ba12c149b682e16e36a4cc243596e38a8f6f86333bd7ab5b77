# xpath methods

This page details the methods exposed on the `xpath` object.

### `xpath.parse(expression)`

Creates a parsed expression. See the [documentation page](parsed%20expressions.md) for details.

### `xpath.select(expression[, node[, single]])`

Evaluates an XPath expression and returns the result. The return value is determined based on the result type of the expression (which can always be predicted ahead of time based on the expression's syntax):

- A boolean value if the expression evaluates to a boolean value.
- A number if the expression evaluates to a numeric value.
- A string if the expression evaluates to a string.
- If the expression evaluates to a nodeset:
  - An array of 0 or more nodes if `single` is unspecified or falsy
  - A single node (the first node in document order) or `undefined` if `single` is truthy
  
`node` is optional and if specified, is used as the context node for evaluating the expression. (It is necessary if the expression makes use of the current contex.)

`single` is optional and is ignored if the expression evaluates to anything other than a nodeset.

### `xpath.select1(expression[, node])`

Alias for [`xpath.select(expression, node, true)`](#xpathselectexpression-node-single). Selects a single node or value.

### `xpath.useNamespaces(mappings)`

Produces a function with the same signature as [`xpath.select()`](#xpathselectexpression-node-single) that evaluates the provided xpath expression using the XML namespace definitions provided in `mapppings`.

`mappings` should be an object with namespace prefixes as its property names and namespace URIs as its property values.

Example usage:

```js
var expr = xpath.useNamespaces({ hp: 'http://www.example.com/harryPotter', bk: 'http://www.example.com/books' });
var result = expr('/bk:books/bk:book[@name = "Harry Potter and the Half-Blood Prince"]/hp:characters', myBooks);
```
