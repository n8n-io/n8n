# Prefer reject

In some cases, using `_.filter` with a negative condition could be made shorter or clearer when using `_.reject`, especially when replacing would allow using a Lodash shorthand.
This rule warns in those cases, when negating a property of the first parameter.

## Rule Details

This rule takes one argument, maximum path length for properties of the first parameter (default is 3).

The following patterns are considered warnings:

```js
_.filter(users, function(user) {
  return user.name.givenName !== 'Bob';
}); //Can be _.reject(users, ['user.name', 'Bob'])

_.filter(users, function(user) {
  return !user.isSomething;
}); // Can be _.reject(user, 'isSomething')
```

The following patterns are not considered warnings:

```js
_.filter(users, function(user) {
  return !user.active && isSomething;
});

_.filter(users, function(user) {
  return !f(user);     // The function f could take multiple arguments, e.g. parseInt 
}); 

_.filter(users, function(user) {
    return !user.some.very.long.path // This exceeds the maximum path length
})
```


## When Not To Use It

If you do not want to enforce using `_.reject`, you should not use this rule.
