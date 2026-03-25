# Collection Ordering
Lodash has two methods for sorting a collection by a specific order: `sortBy` and `orderBy`.
Both methods accept one or several iteratees, but `orderBy` also accepts an optional parameter whether the order is ascending or descending.
This means that ordering any array by ascending order can be done in several different ways:

```js
var users = [
  { 'user': 'fred',   'age': 48 },
  { 'user': 'barney', 'age': 34 },
  { 'user': 'fred',   'age': 40 },
  { 'user': 'barney', 'age': 36 }
]

_.sortBy(users, 'age')
_.orderBy(users, 'age')
_.orderBy(users, ['age'], ['asc'])
_.orderBy(users, 'age', 'asc')
```

## Rule Details

This rule takes one argument: an options object with two fields:

- `method`: Which method should be used for ordering. Accepts `sortBy`, `orderBy` or `orderByExplicit` (default is `sortBy`):
  - `sortBy`: Prefer the `sortBy` method, if no ordering is descending.
  - `orderBy`: Prefer the `orderBy` method, omitting the orders if all are ascending.
  - `orderByExplicit`: Prefer the `orderBy` method, and always declare the ordering.
- `useArray`: When to wrap the iteratees and orders in arrays. Accepts `always` or `as-needed`, and not enforced when the key is omitted (omitted by default).
  - `always`: Wrap the iteratees and ordering in arrays, even if there is a single iteratee or ordering.
  - `as-needed`: Wrap the iteratees and ordering in arrays only if there is more than one.


### When `method` is `sortBy`

The following patterns are considered errors when the `method` option is `sortBy`:

```js
_.orderBy(arr, [f])

_.orderBy(arr, ["name"])

_.orderBy(arr, [f], ["asc"])
```

The following patterns are *not* considered warnings:

```js
_.sortBy(arr, [f])

_.sortBy(arr, ['name'])

_.orderBy(arr, ['name'], ['desc'])
```

### When `method` is `orderBy`

The following patterns are considered errors when the `method` option is `orderBy`:

```js
_.sortBy(arr, [f])

_.orderBy(arr, [f], ['asc'])
```

The following patterns are *not* considered warnings:

```js
_.orderBy(arr, [f])

_.orderBy(arr, [f], ['desc'])
```

### When `method` is `orderByExplicit`

The following patterns are considered errors when the `method` option is `orderByExplicit`:

```js
_.sortBy(arr, [f])

_.orderBy(arr, [f])
```

The following patterns are *not* considered warnings:

```js
_.orderBy(arr, [f], ['asc'])

_.orderBy(arr, [f], ['desc'])
```

### When `useArray` is `always`

The following patterns are considered errors when the `useArray` option is `always`:

```js
_.sortBy(arr, f)

_.orderBy(arr, f)

_.orderBy(arr, f, 'desc')
```

The following patterns are *not* considered warnings:

```js
_.sortBy(arr, [f])

_.sortBy(arr, ['name'])

_.orderBy(arr, ['name'], ['desc'])
```

### When `useArray` is `as-needed`

The following patterns are considered errors when the `useArray` option is `as-needed`:

```js
_.sortBy(arr, [f])

_.sortBy(arr, ['name'])

_.orderBy(arr, ['name'], ['desc'])
```

The following patterns are *not* considered warnings:

```js
_.sortBy(arr, f)

_.orderBy(arr, f)

_.orderBy(arr, f, 'desc')

_.orderBy(arr, [f, g], ['asc', 'desc'])
```