# Prefer invoke

When using `_.map` with a method call of each item in the collection, it could improve readability by switching to `_.invokeMap`

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

_.map(arr, function(x) { return x.f(a, b)});

_(arr).filter(f).map(function(x) { return x.f()}).value();
```

The following patterns are not considered warnings:

```js

var x = _.invokeMap(arr, 'f');

var x = _.invokeMap(collection, 'split', ':'); 
```


## When Not To Use It
##### This rule is only relevant for Lodash 4. If you don't use Lodash 4, you should not use this rule.
If you do not want to enforce using `_.invokeMap`, and prefer using `_.map` with a method call instead.
