# Chaining

Lodash allows using its methods in two ways: either importing the entirety of the Lodash library, or importing single methods to be used.
When importing the entire `_` object, Lodash enables a special syntax called chaining to sequence calls to lodash methods, 
which evaluates them lazily.

## Rule Details

This rule allows users to enforce a specific style:
- `always`: Always use chaining over a certain length
- `never`: Always use composition over a certain length
- `implicit`: Only report on composition if it can be replaced with an implict chain.
 
## Options
This rule takes two arguments. The first is the mode: `always`,  `never` or `implicit` (default is `never`).

### never
When the rule is set to `never`, any use of `_()` or `_.chain()` is prohibited.

The following patterns are considered warnings for the `never` option:
 
```js
var visibleIds = _(users)
    .filter('visible')
    .map('id')
    .value();
    
var x = _.chain(obj)
  .get(prop)
  .map(f)
  .value();
```

The following patterns are not considered warnings for the `never` option:

```js
    var visibleIds = _.map(_.filter(users, 'visible'), 'id');
```
    
```js 
    import map from "lodash/map"
    import filter from "lodash/filter"
    var visibleIds = map(filter(users, 'visible'), 'id');
```

### always
When the rule is set to `always`, the rule takes a second argument, `depth` (default is 3).
The rule reports on any nesting of Lodash functions over the specified `depth`, and on any attempt to chain a single method: 

The following patterns are considered warnings, when depth is 2:

```js
var visibleIds = _.map(_.filter(users, 'visible'), 'id');


var ids = _(users).map('id').value()
```
The following patterns are not considered warnings:
```js
var visibleIds = _(users)
    .filter('visible')
    .map('id')
    .value();
    
var visibleIds = _.map(_.filter(users, 'visible'), 'id'); //when rule options are [2, 'always', 3]
```