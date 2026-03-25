# options for node.js

An implementation of the option type, sometimes known as the maybe type.

An instance of an option type is an optional value. Either it's `none`, or an
instance of `Some`:

```javascript
var option = require("option");

var some = option.some("Bob");
var none = option.none;
```   

A function that returns an optional string isn't that different from a function
that returns a string or `null`. The advantage over null is that options
provide a number of functions that help with manipulating optional values.

```javascript
    function greet(user) {
        return "Hello " + user.name().valueOrElse("Anonymous");
    }
```

## Methods

### isNone() and isSome()

* `some(value).isNone()` returns `false`
* `some(value).isSome()` returns `true`
* `none.isNone()` returns `true`
* `none.isSome()` returns `false`

### value()

* `some(value).value()` returns `value`
* `none.value()` throws an error

### map(*func*)

* `some(value).map(func)` returns `some(func(value))`
* `none.map(func)` returns `none`

### flatMap(*func*)

Conventionally used when `func` returns another option.

* `some(value).flatMap(func)` returns `func(value)`
* `none.flatMap(func)` returns `none`

### filter(*predicate*)

* `some(value).filter(predicate)` returns:
  * `some(value)` if `predicate(value) === true`
  * `none` if `predicate(value) === false`
* `none.filter(predicate)` returns `none`

### toArray()

* `some(value).toArray()` returns `[some]`
* `none.toArray()` returns `[]`

### orElse(*other*)

If `other` is a function (`other` conventionally returning another option):

* `some(value).orElse(other)` returns `some(value)`
* `none.orElse(other)` returns `other()`

If `other` is not a function (`other` conventionally being another option):

* `some(value).orElse(other)` returns `some(value)`
* `none.orElse(other)` returns `other`

### valueOrElse(*other*)

If `other` is a function:

* `some(value).valueOrElse(other)` returns `value`
* `none.valueOrElse(other)` returns `other()`

If `other` is not a function:

* `some(value).valueOrElse(other)` returns `value`
* `none.valueOrElse(other)` returns `other`

## Functions

### option.isOption(*value*)

* `option.isOption(value)` returns `true` if `value` is `option.none` or `option.some(x)`.

### option.fromNullable(*value*)

* If `value` is `null` or `undefined`, `option.fromNullable(value)` returns `option.none`.
* Otherwise, returns `option.some(value)`.
  For instance, `option.fromNullable(5)` returns `option.some(5)`.

## Installation

    npm install option
