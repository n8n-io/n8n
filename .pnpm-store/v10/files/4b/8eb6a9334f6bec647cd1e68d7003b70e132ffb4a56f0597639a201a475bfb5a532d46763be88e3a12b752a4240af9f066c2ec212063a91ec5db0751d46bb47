# ist

This is a tiny assertion library (in the same space as
`require("assert")`) that is only a handful of lines, and exports a
simple API.

```javascript
var ist = require("ist")

ist([] instanceof Array) // Assert that the argument is truthy
ist(1 + 1, 2)            // Assert that two values are the same
ist(1 + 1, 3, "<")       // Assert that 2 is less than 3
ist(a, b, myCompareFunc) // Pass an arbitrary compare function

ist.throws(function() { undefined.prop }) // Ensure something throws
```

**`ist`**`(value)`

Throws a exception of class `ist.Failure` when `value` is falsy.

**`ist`**`(a, b, compare)`

Compares `a` and `b`, and throws an `ist.Failure` if the comparison
fails. `compare` defaults to `==`, but you can pass a string that
corresponds to a JavaScript comparison operator, or a custom function,
to compare in a different way.

**`ist.throws`**`(f, matches)`

Ensure that calling `f` throws an exception, and optionally test
whether the exception matches your expectation. `matches` may be a
regexp, which is matched against the exception's `message` property, a
string, which should be the same as the `message`, or a function that
takes an exception and returns a boolean.

## License

This software is licensed under an MIT license.
