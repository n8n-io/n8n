# Prefer _.times

When using `_.map` in which the iteratee does not have any arguments, it's better to use `_.times`.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

_.map(arr, function() { return 7});

_(a).map(() => 7).value();

_.map(Array(10), function() {return f(y)});

import f from 'lodash/map'; f(arr, () => 0)

```

The following patterns are not considered warnings:

```js

_.times(arr.length, _.constant(7));

_.map(arr, function(x) {return x * x;});
 
```


## When Not To Use It

If you do not want to enforce always using `times` when not using the arguments, you should not use this rule.
