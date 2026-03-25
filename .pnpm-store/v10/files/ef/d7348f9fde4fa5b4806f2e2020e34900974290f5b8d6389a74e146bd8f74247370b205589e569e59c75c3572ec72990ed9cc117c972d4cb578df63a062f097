# Prefer lodash chain

When chaining methods, it's often better to use only Lodash methods or wrappers.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js
var userNames = _.filter(users, {active: true}).map(function (user) { 
  return user.name.givenName; 
});

var userNames = _(users).map("name.givenName").value().reduce(function (res, cur) { 
  return res + " " + cur; 
});
```

The following patterns are not considered warnings:

```js
var userNames = users.map(function(user) {
  return user.name; 
});
 
var userNames = _(users).filter({active: true}).map("name").value();
```


## When Not To Use It

If you do not want to enforce using chains composed of Lodash functions, you should not use this rule.
