# Property shorthand

When using certain method in lodash such as map, it's possible to use the `_.property` callback shorthand. 
This rule will enforce whether or not to use shorthand when possible to keep consistency in your code.

## Rule Details

This rule takes one argument, when to use shorthand: `always` or `never` (default is always).

The following patterns are considered warnings:

```js
/*eslint lodash/prop-shorthand: [2, "always"]*/
var ids = _.map(users, function (user) {
  return user.name.familyName;
});
```

```js
/*eslint lodash/prop-shorthand: [2, "never"]*/
var ids = _.map(users, 'name.familyName');
```

The following patterns are not considered warnings:

```js
/*eslint lodash/prop-shorthand: [2, "always"]*/
var ids = _.map(users, 'name.familyName');
```

```js
/*eslint lodash/prop-shorthand: [2, "never"]*/
var ids = _.map(users, function (user) {
  return user.name.familyName;
});
```

## When Not To Use It

If you do not want to enforce whether or not to use the `_.property` callback shorthand, then you can disable this rule.
