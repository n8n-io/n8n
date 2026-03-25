# Consistent Composition Method

Lodash has two ways to compose functions: left to right (`_.flow`) or right to left (`_.flowRight`).
Composing functions right to left has syntax that is in the same order as chaining, e.g.
```js
var composed = _.flow(_.compact, _.last);
var x = composed(a);
// is similar to
var x = _(a).compact().last();
```

While Composing function left to right is similar to actual function application, e.g.
```js
var composed = _.flowRight(_.last, _.compact);
var x = composed(a);
// is similar to
var x = _.last(_.compact(a));
```

This rule enforces a consistent style.

## Rule Details

This rule takes a single argument - the method used to compose functions: `flow`, `pipe`, `flowRight` or `compose` (default is `flow`).
The rule will not warn on using a different function in the same direction (e.g. `pipe` if the `flow` option is selected).

The following patterns are considered warnings:

```js
/*eslint lodash/consistent-compose: [2, "flow"] */
var x = _.flowRight(y, z);
var f = _.compose(g, h);

/*eslint lodash/consistent-compose: [2, "flowRight"] */
var x = _.flow(z, y);
var f = _.pipe(h, g);
```

The following patterns are not considered warnings:

```js
/*eslint lodash/consistent-compose: [2, "flow"] */
var x = _.flow(z, y);
var f = _.pipe(h, g);

/*eslint lodash/consistent-compose: [2, "flowRight"] */
var x = _.flowRight(y, z);
var f = _.compose(g, h);
```
