# Prefer immutable methods
Prefer a method that doesn't mutate the arguments when available.

## Rule Details

This rule takes no arguments

The following patterns are considered warnings:

```js
_.pull(arr, value)
```

```js
const a = _.remove(arr, fn);
```

The following patterns are not considered warnings:

```js
const a = _.without(arr, value);
```

```js
const a = _.filter(arr, fn);
```


## When Not To Use It
If you do not want to enforce using methods that do not mutate the arguments when available, do not enable this rule.
