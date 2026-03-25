# Prefer _.startsWith

To check that a string starts with a substring or an array starts with an item, it's better to use `_.startsWith` than comparing the index to zero.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

var x = a.indexOf(b) === 0;

if (str.indexOf('@@') !== 0) {}

```

The following patterns are not considered warnings:

```js

var x = a.indexOf(b);

if (str.indexOf('@@') > 0) {}
 
```


## When Not To Use It

If you do not want to use Lodash to check that an array or a string starts with an item, do not use this rule. 
