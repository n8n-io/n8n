# Prefer _.matches

When writing an expression like `a.foo === 1 && a.bar === 2 && a.baz === 3`, it can be more readable to use _.matches.

## Rule Details

This rule takes one argument - the minimal length of the condition (default is 3).

The following patterns are considered warnings:

```js

if (a.foo === 1 && a.bar === 2 && a.baz === 3) {
  //...
}

var bool = a.b === value1 && a.c === value2 && a.d === value3

```

The following patterns are not considered warnings:

```js

var bool = a.b === val1 && a.c === val2 //when length is 3

if (_.matches(a, {foo:1, bar:2, baz:3}) {
  //...
}
 
```


## When Not To Use It

If you do not want to enforce using `matches`, you should not use this rule.
