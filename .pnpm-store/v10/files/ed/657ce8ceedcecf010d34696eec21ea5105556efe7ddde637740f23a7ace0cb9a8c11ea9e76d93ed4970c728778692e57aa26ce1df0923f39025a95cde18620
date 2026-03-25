# Path Style

There are two ways to define a `path` argument: as an array of strings, or as a single string with accessors (`. / []`).

For example,
```js
const x = {
  a: 1,
  b: {
    c: [2, 3, {d: 4}]
  }
}
```
You can `get` the value `4` by using `_.get(x, ['b', 'c', 2, 'd'])` (array syntax) or by using `_.get(x, 'b.c[2].d')` (string syntax).

For more information, check out the [Lodash documentation for `_.property`](https://lodash.com/docs#property).

## Rule Details

This rule takes one argument, the preferred style: `array`, `string` or `as-needed`. (default is `as-needed`, where `as-needed` means arrays for paths with variables).

The following patterns are considered problems:

```js
/*eslint lodash/path-style: [2, "as-needed"]*/

val = _.get(x, ['a', 'b']) // Use a string for simple paths

thingExists = _.has(x, `a.${x}`); // Use an array for paths with variables

thingExists = _.has(x, 'a.' + x) // Use an array for paths with variables

```

```js
/*eslint lodash/path-style: [2, "string"]*/

var hasABIn = _.hasIn(x, ['a', 'b']); // Use a string for paths

var val = _.get(x, ['a', x]); // Use a string for paths
```

```js
/*eslint lodash/path-style: [2, "array"]*/

_.set(x, 'a.b', val); // Use an array for paths

var getA = _.property('a'); // Use an array for paths

```

The following patterns are not considered warnings:

```js
/*eslint lodash/path-style: [2, "string"]*/

_.set(x, 'a.b', val);

var getA = _.property('a');

```

```js
/*eslint lodash/path-style: [2, "as-needed"]*/

val = _.get(x, ['a', 'b']);

hasA = _.has(x, 'a');

```

```js
/*eslint lodash/path-style: [2, "array"]*/

var hasABIn = _.hasIn(x, ['a', 'b']);

var val = _.get(x, ['a']);

```

## When Not To Use It

If you do not want to enforce a specific path style, then you can disable this rule.
