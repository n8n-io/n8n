# Prefer compact

When using _.filter with an identity or boolean casting , it could improve readability by switching to _.compact

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

_(arr).map(f).filter(function(x) {return x}),

_.filter(arr, function(x) { return !!x})
```

The following patterns are not considered warnings:

```js

var x = _.filter(arr, function(x) {return !x.a && p});

var x = _.filter(arr, function(x) {return f(x) || g(x)});

var x = _.compact(arr);
```


## When Not To Use It

If you do not want to enforce using `_.compact`, you should not use this rule.
