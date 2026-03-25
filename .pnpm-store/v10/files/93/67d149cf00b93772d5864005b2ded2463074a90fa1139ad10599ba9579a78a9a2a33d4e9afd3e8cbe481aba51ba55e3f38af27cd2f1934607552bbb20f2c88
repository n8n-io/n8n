# Prefer filter

When using _.forEach with a single `if` statement, you should probably use `_.filter` or `_.some` instead.

## Rule Details

This rule takes one argument, maximum path length (default is 3).

The following patterns are considered warnings:

```js
_(users).forEach(function(user) { 
  if (user.name.familyName) {
  // ...
  }
});

_(users).forEach(function(user) { 
  if (!user.active) {
  // ...
  }
});

_.forEach(users, function(user) { 
  if (user.name.givenName === 'Bob') {
  // ...
  }
});
```

The following patterns are not considered warnings:

```js
var x = _.filter(users, function(user) {
  return !user.active && user.name.givenName === 'Bob'
});

```
