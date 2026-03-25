# Unwrap

When a lodash chain is not broken, that usually means that it will never be executed due to lazy evaluation.
A chain can be ended either with a method that doesn't support chaining (e.g. `max()`), or with `value()`.
If the chaining uses explicit method chaining (`_.chain`), it can only be ended with `value()`.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js
var x = _(a).map(f);

var x = _.chain(a).map(f).reduce(g);


```

The following patterns are not considered warnings:

```js
var x = _(a).map(f).reduce(g);

var x = _(a).map(f).filter(g).value();

var x = _.chain(a).map(f).reduce(g).value();
```


## When Not To Use It

If you do not want to enforce chaining, then you can disable this rule.
