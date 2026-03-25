# Prefer Lodash typecheck

Getting the specific type of a variable or expression can be done with `typeof` or `instanceof`. However, it's often more expressive to use the Lodash equivalent function

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

if (typeof a === 'number') {
  // ...
}

var isNotString = typeof b !== 'string';

var isArray = a instanceof Array;

```

The following patterns are not considered warnings:

```js

var areSameType = typeof a === typeof b;
 
var isCar = truck instanceof Car; 

```


## When Not To Use It

If you do not want to enforce using Lodash methods for type checks, you should not use this rule.
