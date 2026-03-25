# No Unbound This

Using `this` in collection function callbacks only works if the callbacks are bound. Otherwise, `this` becomes the global object, which is a cause of a possible error.
However, this is not true for arrow functions, since they do not create their own scope.

## Rule Details

This rule takes no arguments.

The following patterns are considered warnings:

```js

var y = _.map(x, function (t) {return this.f(t)})

var y = _.map(x, function (t) {return this.a + this.b})

```

The following patterns are not considered warnings:

```js

var y = _.map(x, function(t) {
    return this.f(t)
}.bind(this))

var y = _.map(x, t => this.f(t))
        
var y = _.invokeMap(x, prop)

var y = _.map(x, prop)

var y = _.map(x, function(t) { 
    function f(i) {
        this.g(i)
    } 
    return f.apply(z, t)
})
 
```

## When Not To Use It
##### This rule is only relevant for Lodash 4. If you don't use Lodash 4, you should not use this rule.