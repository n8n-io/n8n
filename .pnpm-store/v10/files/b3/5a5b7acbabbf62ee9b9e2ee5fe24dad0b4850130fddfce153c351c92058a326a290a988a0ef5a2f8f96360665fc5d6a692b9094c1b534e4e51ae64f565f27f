# Prefer find

When using _.filter and accessing the first or last result, you should probably use `_.find` or `_.findLast`, respectively.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js
const x = _.filter(a, f)[0];
```

```js
const x = _.head(_.filter(a, f));
```

```js
const x = _(a)
            .filter(f)
            .head()
```

```js
const x = _.last(_.filter(a, f));
```

```js
const x = _.head(_.reject(a, f));
```
The following patterns are not considered warnings:

```js
const x = _.filter(a, f);
```

```js
const x = _.filter(a, f)[3];
```

```js
const x = _.find(a, f);
```