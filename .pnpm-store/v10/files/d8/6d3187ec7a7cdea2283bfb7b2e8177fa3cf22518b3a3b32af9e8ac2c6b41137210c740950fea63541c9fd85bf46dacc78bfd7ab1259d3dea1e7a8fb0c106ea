# No Commit

Using `_.prototype.commit()` at the end of the chain executes the chain but doesn't unwrap the value.
In most cases, this means that `_.prototype.value()` would be preferable. 

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

_(a).map(f).filter(g).commit();

```

The following patterns are not considered warnings:

```js

_(a).map(f).filter(g).value();
 
```


## When Not To Use It

If you do not want to disallow using `commit`, you should not use this rule.