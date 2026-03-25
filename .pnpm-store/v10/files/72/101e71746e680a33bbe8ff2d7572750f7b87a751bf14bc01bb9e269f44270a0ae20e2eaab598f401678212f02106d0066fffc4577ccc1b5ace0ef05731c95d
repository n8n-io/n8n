# Preferred Alias

Some Lodash methods have one or more aliases, which can lead to inconsistent code and decrease readability. 

## Rule Details

This rule takes one argument - an optional options object. This object can have one key:
- `ignoreMethods`: contains an array of method names that should not be reported on.

The following patterns are considered warnings:

```js
_.each(users, f);
```

The following patterns are not considered warnings:

```js
_.forEach(users, f);
```


## When Not To Use It

If you do not want to enforce preferred alias, then you can disable this rule.
