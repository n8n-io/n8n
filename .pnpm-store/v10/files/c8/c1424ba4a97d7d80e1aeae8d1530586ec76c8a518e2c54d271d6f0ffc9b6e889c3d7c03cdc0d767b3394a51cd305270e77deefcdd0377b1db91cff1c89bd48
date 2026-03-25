# Prefer Over-Quantifier

When using methods that select according to a set of conditions with 'some' and 'every' behavior, it's possible to pass an iteratee created by overSome and overEvery

## Rule Details

This rule takes no arguments

The following patterns are considered warnings:

```js
var t = _.filter(a, function(x) { return f(x) && g(x); })

'var t = _.filter(a, x => f(x) || g(x) || h(x))'

```

The following patterns are not considered warnings:

```js
var t = _.filter(a, _.overSome([f, g, h]);

```
## When Not To Use It
##### This rule is only relevant for Lodash 4. If you don't use Lodash 4, you should not use this rule.
If you do not want to enforce using `_.overSome` and `_.overEvery`, do not use this rule.