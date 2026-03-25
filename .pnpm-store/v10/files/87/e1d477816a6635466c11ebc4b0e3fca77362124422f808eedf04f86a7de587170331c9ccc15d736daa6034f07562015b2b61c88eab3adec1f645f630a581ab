# Prefer get

When writing an expression like `a && a.b && a.b.c` just to make sure the path exists, it is more readable to use the functions `_.get`, `_.set` and `_.has` instead.

## Rule Details

This rule takes one argument - the minimal depth (default is 3).

The following patterns are considered warnings:

```js

var isThree = a && a.b && a.b.c === 3;

if (a && a.b && a.b.c) {
// ...
}

```

The following patterns are not considered warnings:

```js

var isThree = _.get(a, 'b.c') === 3;

if (_.has(a, 'b.c')) {
// ...
}
 
```


## When Not To Use It

If you do not want to enforce using `get`, you should not use this rule.
