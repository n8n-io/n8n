# Using Parsed Expressions

The `xpath.parse()` method allows pre-parsing an XPath expression and creating an XPath executor to evaluate the XPath as many times as needed.

This can provide a performance benefit if you plan to evaluate the same XPath multiple times, because the expression only needs to be parsed once.

This also provides access to additional features such as the use of variables and custom XPath functions, which are not available using the evaluation methods on the `xpath` object.

#### xpath.parse(expression)

Parses the specified XPath expression and returns an `XPathEvaluator`. See the [documentation page](XPathEvaluator.md) for API details.

`expression` should be a string.

Example usage:

```js
var evaluator = xpath.parse('/book/characters');
```


