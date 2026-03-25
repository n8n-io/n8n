# Prefer _.isNil

When checking that a value is undefined or null (but not false or ''), it is more concise to use _.isNil instead.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js
var t = !_.isNull(x) && !_.isUndefined(x);

var t = x === undefined || x === null;
```

The following patterns are not considered warnings:

```js

var t = _.isNil(x);

var t = _.isUndefined(x) || _.isNull(y);
```


## When Not To Use It
##### This rule is only relevant for Lodash 4. If you don't use Lodash 4, you should not use this rule.
If you do not want to enforce using `_.isNil`, and prefer using specific checks instead.
