# Prefer Lodash method

When using native functions like forEach and map, it's often better to use the Lodash implementation.

This can be for performance reasons, for implicit care of edge cases (e.g. `_.map` over a variable that might be undefined), or for use of Lodash's shorthands.

## Rule Details

This rule takes one argument - an optional options object. This object can have any of these keys:
- `ignoreMethods`: contains an array of regular expressions of methods that should not be reported on
- `ignoreObjects`: contains an array of regular expressions for objects that should not be reported on


Examples:

If you do not wish to use `_.keys` but prefer `Object.keys`, the config would be:
```json
{
  "rules": {
    "lodash/prefer-lodash-method": [2, {"ignoreMethods": ["keys"]}]
  }
}
```
If you do not wish to use `_.reduce` or `_.reduceRight`:
```json
{
  "rules": {
    "lodash/prefer-lodash-method": [2, {"ignoreMethods": ["reduce(Right)?"]}]
  }
}
```
If you do not want the rule to work on any object named `fp`:
```json
{
  "rules": {
    "lodash/prefer-lodash-method": [2, {"ignoreObjects": ["fp"]}]
  }
}
```
If you do not want the rule to work on `React.Children`:
```json
{
  "rules": {
    "lodash/prefer-lodash-method": [2, {"ignoreObjects": ["React\\.Children"]}]
  }
}
```
And if you don't want the rule to work on any object starting with `$`:
```js
{
  "rules": {
    "lodash/prefer-lodash-method": [2, {"ignoreObjects": ["^\$[a-zA-Z0-9\_]+"]}]
  }
}
```
The following patterns are considered warnings:

```js

var b = a.map(f);
var c = arr.map(f).reduce(g);
var d = 'hello'.toUpperCase();

if (arr.some(f)) {
  // ...
}

```

The following patterns are not considered warnings:

```js

var b = _.map(a, f);
var c = _(arr).map(f).reduce(g);
var d = _.toUpper('hello');

if (_.some(arr, f)) {
  // ...
}

```


## When Not To Use It

If you do not want to enforce using Lodash methods, you should not use this rule.
