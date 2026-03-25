# Matches shorthand

When using certain methods in Lodash such as filter, it is possible to use the `_.matches` callback shorthand.
This rule will enforce using shorthand when possible to keep consistency in your code.

## Rule Details

This rule takes four arguments:

* The first, when to use the shorthand: `always` or `never` (default is `always`).
* The second is the maximum path length (default is 3).
* The third is whether to include computed properties (default is `false`). This is only possible when the ES6 computed object properties feature is on.
* The fourth is an object with one possible property - `onlyLiterals` (default to false). This exists because changing to a matches will do a deep comparison rather than an instance equality check, so in some circumstances the rule could error on a line that if changed would change behaviour. However, switching on onlyLiterals will not warn on comparing with variables since it is difficult to determine the possible types of variables used.

The following patterns are considered warnings:

```js
/* eslint lodash/matches-shorthand: [2, "always"] */
var result = _.filter(users, function (user) { return user.age === 30 && user.name === 'Bob'; });
```

```js
/* eslint lodash/matches-shorthand: [2, "never"] */
var result = _.filter(users, {age: 30, name: 'Bob'}));
```

```js
/* eslint lodash/matches-shorthand: [2, "always", true] */
var result = _.filter(users, user => user.age === 30 && user[prop] === value)); // can be _.filter(users, {age: 30, [prop]: value})
```
The following patterns are not considered warnings:

```js
/* eslint lodash/matches-shorthand: [2, "never"] */
var result = _.filter(users, function (user) { return user.age === 30 && user.name === 'Bob'; });
```

```js
/* eslint lodash/matches-shorthand: [2, "always"] */
var result = _.filter(users, {age: 30, name: 'Bob'}));
```

```js
/* eslint lodash/matches-shorthand: [2, "always", true, { onlyLiterals: true }] */
var result = _.filter(users, user => user.age === 30 && user[prop] === value));
```

## When Not To Use It

If you do not want to enforce whether or not to use `_.matches` callback shorthand, then you can disable this rule.
