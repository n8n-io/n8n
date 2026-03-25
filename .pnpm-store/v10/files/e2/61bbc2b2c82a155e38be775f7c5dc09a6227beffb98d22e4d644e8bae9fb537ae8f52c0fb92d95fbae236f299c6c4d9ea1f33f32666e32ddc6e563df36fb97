# Prototypes

The functions in this folder are to be use for keeping cached references to the built-in prototypes, so that people can't inadvertently break the library by making mistakes in userland.

See https://github.com/sinonjs/sinon/pull/1523

## Without cached references

```js
// in userland, the library user needs to replace the filter method on
// Array.prototype
var array = [1, 2, 3];
sinon.replace(array, "filter", sinon.fake.returns(2));

// in a sinon module, the library author needs to use the filter method
var someArray = ["a", "b", 42, "c"];
var answer = filter(someArray, function (v) {
    return v === 42;
});

console.log(answer);
// => 2
```

## With cached references

```js
// in userland, the library user needs to replace the filter method on
// Array.prototype
var array = [1, 2, 3];
sinon.replace(array, "filter", sinon.fake.returns(2));

// in a sinon module, the library author needs to use the filter method
// get a reference to the original Array.prototype.filter
var filter = require("@sinonjs/commons").prototypes.array.filter;
var someArray = ["a", "b", 42, "c"];
var answer = filter(someArray, function (v) {
    return v === 42;
});

console.log(answer);
// => 42
```
