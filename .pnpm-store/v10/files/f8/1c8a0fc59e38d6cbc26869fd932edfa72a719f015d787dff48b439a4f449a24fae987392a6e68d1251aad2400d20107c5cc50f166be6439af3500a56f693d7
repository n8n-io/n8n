# Prefer _.includes

When comparing the index of an item/substring with an `indexOf` method, it can be more expressive to use `_.includes`

## Rule Details

This rule takes one argument - an options object, with the property `includeNative`. If true, the rule will report on all `indexOf` calls, and if false, it will only report on `_.indexOf` calls.

The following patterns are considered warnings:

```js
var a = _.indexOf(b, c) === -1
```

```js
/*eslint lodash/chain-style: [2, {"includeNative": true}]*/
if (a.indexOf(b) === -1) {
 // ...
}
```

The following patterns are not considered warnings:

```js
x = _.indexOf(a, b);

if (_.includes(a, b)) {
 // ...
}
```


## When Not To Use It

If you do not want to enforce using `_.includes`, you should not use this rule.
