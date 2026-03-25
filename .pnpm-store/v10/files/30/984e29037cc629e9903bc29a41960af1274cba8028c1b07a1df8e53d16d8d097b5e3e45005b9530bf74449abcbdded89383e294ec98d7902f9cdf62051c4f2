# Prefer noop

When defining an empty function (e.g. for callbacks) it can be more readable to use `_.noop` instead

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

functionWithCallback(function(){});

const emptyFunction = ()=> {};

```

The following patterns are not considered warnings:

```js

functionWithCallback(function(x){return x + 1});

const sqr = x => x * x;
 
```


## When Not To Use It

If you do not want to enforce using `_.noop`, you should not use this rule.
