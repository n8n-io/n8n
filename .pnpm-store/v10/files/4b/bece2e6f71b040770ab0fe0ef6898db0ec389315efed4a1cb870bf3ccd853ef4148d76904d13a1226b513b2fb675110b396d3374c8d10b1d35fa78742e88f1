# Prefer wrapper method

When starting a chain with an initial value that contains a call to an array or string method, it could be better to move that method to the chain itself.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

_(str.split(' ')).map(f).reduce(g);

_.chain(str.split(' ')).map(f).reduce(g).value();

```

The following patterns are not considered warnings:

```js

_(str).split(' ').map(f).reduce(g);
 
_.chain(str).split(' ').map(f).reduce(g).value();
```


## When Not To Use It

If you do not want to enforce using wrapper methods, you should not use this rule.
