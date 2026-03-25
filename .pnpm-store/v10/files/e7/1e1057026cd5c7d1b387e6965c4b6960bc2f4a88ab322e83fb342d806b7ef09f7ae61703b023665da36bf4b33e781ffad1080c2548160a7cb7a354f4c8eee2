# Collection Method Value

When using a lodash collection method, the expression should be used (e.g. assigning to a variable or check in a condition), unless it's a method meant for side effects (e.g. `forEach` or `forOwn`) which should NOT be used.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

x = _.forEach(arr, g)

x = _.chain(arr).map(f).forEach(g).value()

_.map(arr, f)

_.chain(arr).find(p).map(f).value()

```

The following patterns are not considered warnings:

```js

x = _.map(arr, f)

_.forEach(arr, g)

if (_.some(arr, h)) {
  i()
}

x = _(arr).filter(p).map(q).value()


_(arr).filter(p).forEach(g)
 
```
