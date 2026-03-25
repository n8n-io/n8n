# Chain Style

There are two ways to create a lodash chain: implicit chaining and explicit chaining with the `_.chain` method.

To use implicit chaining, you can call `_(value)` on your value and, and then finish the chain with the `.value()` method or with any method that returns a single value (e.g. `.first()`, `.max()`)
For example:
```js
var maxFiltered = _(arr).filter(someFilter).max(someCallback);
```
In order to keep the value wrapped in the chain after any single-value method, chaining needs to be explicit, with the `_.chain()` method.
For example:
```js
var mergedFilteredMax = _.chain(arr).filter(someFilter).max(someCallback).assign(obj).value();
```

For more information, check out the [Lodash documentation for chaining](https://lodash.com/docs#_). 

## Rule Details

This rule takes one argument, the preferred style: `implicit`, `explicit` or `as-needed`. (default is `as-needed`).

The following patterns are considered problems:

```js
/*eslint lodash/chain-style: [2, "as-needed"]*/

_.chain(val).map(f).filter(g).value(); // Unnecessary explicit chaining

_.chain(val).map(f).join(c).value(); // Unnecessary explicit chaining, the chain-breaking method join() is last in the chain.

```

```js
/*eslint lodash/chain-style: [2, "implicit"]*/

_.chain(val).map(f).filter(g).value(); // Do not use explicit chaining

_.chain(val).map(f).first().assign(obj).value(); // Do not use explicit chaining

```

```js
/*eslint lodash/chain-style: [2, "explicit"]*/

_(val).map(f).filter(g).value(); // Do not use implicit chaining


```



The following patterns are not considered warnings:

```js
/*eslint lodash/chain-style: [2, "as-needed"]*/

_(val).map(f).filter(g).value(); 

_.chain(val).map(f).first().assign(obj).value();

```

```js
/*eslint lodash/chain-style: [2, "implicit"]*/

_(val).map(f).filter(g).value();

```

```js
/*eslint lodash/chain-style: [2, "explicit"]*/

_.chain(val).map(f).filter(g).value(); 

```

## When Not To Use It

If you do not want to enforce a specific chain style, then you can disable this rule.
