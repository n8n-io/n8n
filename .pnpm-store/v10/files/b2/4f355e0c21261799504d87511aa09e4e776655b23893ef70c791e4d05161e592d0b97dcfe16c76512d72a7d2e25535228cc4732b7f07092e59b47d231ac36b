
# Iterate

This JavaScript package exports an iterator operator that accepts arrays and any
object that implements iterate.

```
$ npm install --save pop-iterate
```

The iterate operator accepts an array, or object that implements iterate, and
returns an iterator, as described by the [iterator protocol][Iterator], with
some extensions.
The iterations have an index property with the index corresponding to the value.

[Iterator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/The_Iterator_protocol

```js
var iterator = iterate([1, 2, 3]);
expect(iterator.next()).toEqual({value: 1, done: false, index: 0});
expect(iterator.next()).toEqual({value: 2, done: false, index: 1});
expect(iterator.next()).toEqual({value: 3, done: false, index: 2});
expect(iterator.next()).toEqual({done: true});
```

Iterating on an array, the iterate method accepts optional start, stop, and step
arguments.

```js
var array = [1, 2, 3, 4, 5, 6, 7, 8];
var iterator = iterate(array, 1, 6, 2);
expect(iterator.next()).toEqual({value: 2, done: false, index: 1});
expect(iterator.next()).toEqual({value: 4, done: false, index: 3});
expect(iterator.next()).toEqual({value: 6, done: false, index: 5});
expect(iterator.next()).toEqual({done: true});
```

The iterate operator also iterates the owned properties of an object.

```js
var object = {a: 10, b: 20, c: 30};
var iterator = iterate(object);
expect(iterator.next()).toEqual({value: 10, done: false, index: "a"});
expect(iterator.next()).toEqual({value: 20, done: false, index: "b"});
expect(iterator.next()).toEqual({value: 30, done: false, index: "c"});
expect(iterator.next()).toEqual({done: true});
```

## Polymorphic operator

A well-planned system of objects is beautiful: a system where every meaningful
method for an object has been anticipated in the design.
Inevitably, another layer of architecture introduces a new concept and with it
the temptation to monkey-patch, dunk-punch, or otherwise cover-up the omission.
But reaching backward in time, up through the layers of architecture doesn't
always compose well, when different levels introduce concepts of the same name
but distinct behavior.

A polymorphic operator is a function that accepts as its first argument an
object and varies its behavior depending on its type.
Such an operator has the benefit of covering for the types from higher layers of
architecture, but defers to the eponymous method name of types yet to be
defined.

The iterate operator works for arrays and objects.
Any other object can be iterable by implementing the `iterate` method, and the
iterate operator will defer to it.

```js
function Collection() {}
Collection.prototype.iterate = function (start, stop, step) {
};
```

This package also exports the individual parts form which it makes iterators.

```js
var Iteration = require("pop-iterate/iteration");
var ArrayIterator = require("pop-iterate/array-iterator");
var ObjectIterator = require("pop-iterate/object-iterator");
```

