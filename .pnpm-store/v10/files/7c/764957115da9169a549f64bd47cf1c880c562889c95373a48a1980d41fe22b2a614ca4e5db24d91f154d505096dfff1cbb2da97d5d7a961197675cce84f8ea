# No Extra Args

While some Lodash functions, like `_.assign`, can receive any number of arguments, some functions (e.g. `_.uniq`) have a fixed number of arguments, 
and superfluous arguments can be a result of a migration error. 
For example, in Lodash v4, `_.uniq` was split into `_.uniqBy` and `_.uniqWith`, and sending extra arguments to `_.uniq` is probably an error.

## Rule Details

This rule takes no arguments. However, it is affected by the lodash `version` defined in the config's [shared settings for Lodash](/README.md#shared-rule-settings).

The following patterns are considered warnings:

```js

var x = _.uniq(arr, 'property');

```

The following patterns are not considered warnings:

```js

var x = _.uniqBy(arr, 'property');
 
```