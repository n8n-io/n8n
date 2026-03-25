# Callback binding

In Lodash version 3, it was possible to pass an additional parameter to methods that require binding, `thisArg`.
However, in Lodash 4, this option was removed in favor of regular binding, and still using the old method could cause unexpected results.

## Rule Details

This rule takes no arguments. However, it is affected by the lodash `version` defined in the config's [shared settings for Lodash](/README.md#shared-rule-settings). 

### Lodash Version 4 (default)
In version 4, the following patterns are considered warnings:

```js
var r = _.filter(users, function (user) {
    return user.age > this.age;
}, this);

var r = _.reduce(numbers, multiply, 1, this);
```

The following patterns are not considered warnings:

```js
var r = _.filter(users, function (user) {
    return user.age > this.age;
}.bind(this));
```

### Lodash version 3

In version 3, the following patterns are considered warnings:
```js
var r = _.filter(users, function (user) {
    return user.age > this.age;
}, this);
```

The following patterns are not considered warnings:

```js
var r = _.filter(users, function (user) {
    return user.age > this.age;
}.bind(this));
```
