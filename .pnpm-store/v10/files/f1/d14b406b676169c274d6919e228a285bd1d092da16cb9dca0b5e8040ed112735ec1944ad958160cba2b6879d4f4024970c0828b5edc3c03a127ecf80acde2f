# Prefer thru

When starting a chain with an initial value that contains a function call on a single argument, it could improve readability to move that function to the chain itself with `thru`.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

_(f(x)).map(g).reduce(h);

_.chain(f1(f2(x).split(''))).map(f).reduce(g).value();

```

The following patterns are not considered warnings:

```js

_(str).thru(f).map(h).reduce(g);
 
```


## When Not To Use It

If you do not want to enforce using `thru`, you should not use this rule.
