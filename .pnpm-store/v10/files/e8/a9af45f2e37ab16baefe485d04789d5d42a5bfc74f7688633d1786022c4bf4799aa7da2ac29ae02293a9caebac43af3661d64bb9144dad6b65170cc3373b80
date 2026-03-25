# Unwrapping an already finished chain (no-double-unwrap)

Some Lodash and wrapper methods remove the wrapper from the chain, e.g. `reduce`, `max` or `join`.
In these cases, the use of `.value()` would most likely cause an error.


## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js
var x = _(a).reduce(f).value();


```

The following patterns are not considered warnings:

```js
var x = _(a).map(f).reduce(g);

var x = _(a).map(f).value();

var x = _.chain(a).map(f).reduce(g).value();
```


## When Not To Use It

If you don't want to check for this possible error, or if the objects you pass to Lodash have a `value`, `run` or `toJSON` method. 
