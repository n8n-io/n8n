# Matches property shorthand

When using certain methods in Lodash such as filter, it is possible to use the `_.matchesProperty` callback shorthand.
This rule will enforce whether or not to use shorthand when possible to keep consistency in your code.

## Rule Details

This rule takes two arguments.

* The first is when to use the code: `always` or `never` (default is `always`).

* The second is an object with one possible property - `onlyLiterals` (default to false). This exists because changing to a matches will do a deep comparison rather than an instance equality check, so in some circumstances the rule could error on a line that if changed would change behaviour. However, switching on `onlyLiterals` will not warn on comparing with variables since it is difficult to determine the possible types of variables used.

The following patterns are considered warnings:

```js
/* eslint lodash/matches-prop-shorthand: [2, "always"] */
var result = _.filter(users, function (i) { return i.id === 3; });
```

```js
/* eslint lodash/matches-prop-shorthand: [2, "never"] */
var result = _.filter(users, ['id', 3]);
```

The following patterns are not considered warnings:

```js
/* eslint lodash/matches-prop-shorthand: [2, "always"] */
var result = _.filter(users, ['id', 3]);
```

```js
/* eslint lodash/matches-prop-shorthand: [2, "never"] */
var result = _.filter(users, function (i) { return i.id === 3; });
```

```js
/* eslint lodash/matches-prop-shorthand: [2, "always", { onlyLiterals: true }] */
var result = _.filter(users, function (i) { return i.id === id; });
```

## When Not To Use It

If you do not want to enforce whether or not to use `_.matchesProperty` callback shorthand, then you can disable this rule.
