# Identity shorthand

When using certain method in lodash such as max, it's possible to use the
`_.identity` callback shorthand. This rule will enforce whether or not to use
shorthand when possible to keep consistency in your code.

## Rule Details

This rule takes one argument, when to use shorthand: `always` or `never` (default is always).

The following patterns are considered warnings:

```js
/*eslint lodash/identity-shorthand: [2, "always"] */
var topScore = _.maxBy(scores, function (score) {
  return score;
});
```

The following patterns are not considered warnings:

```js
/*eslint lodash/identity-shorthand: [2, "never"] */
var topScore = _.maxBy(scores);
```

## When Not To Use It

If you do not want to enforce whether or not to use the `_.identity` callback shorthand, then you can disable this rule.
