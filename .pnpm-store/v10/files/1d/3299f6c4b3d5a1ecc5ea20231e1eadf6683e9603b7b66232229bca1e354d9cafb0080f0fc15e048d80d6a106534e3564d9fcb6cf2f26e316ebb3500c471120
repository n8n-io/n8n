# Prefer [`_.flatMap`] over consecutive [`_.map`] and [`_.flatten`]

When using [`_.map`] and [`_.flatten`], it can be more concise to use [`_.flatMap`] instead.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js
_(a).map(f).flatten().value();

t = _.flatten(_.map(a, f));
```

The following patterns are not considered warnings:

```js
t = _.map(a, f);

t = _.flatMap(a, f);
```

## When Not To Use It

**This rule is only relevant for Lodash 4. If you don't use Lodash 4, you should not use this rule.**

If you do not want to enforce using [`_.flatMap`], and prefer [`_.map`] and [`_.flatten`] instead, you should not use this rule.

[`_.flatMap`]: https://lodash.com/docs#flatMap
[`_.flatten`]: https://lodash.com/docs#flatten
[`_.map`]: https://lodash.com/docs#map
