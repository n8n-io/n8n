# Collection Return Statement

When using a Lodash collection method that isn't forEach, the iteratee should return a value, otherwise it could result in either unclear code or unexpected results.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

_.map(arr, function(x) { console.log(x); });

_.some(arr, function(x) { if (x.a) {f(x); });

_.every(collection, x => { f(x); });

```

The following patterns are not considered warnings:

```js

_.map(x => x + 1);

_.forEach(arr, function(a) { console.log(a); });
 
```
