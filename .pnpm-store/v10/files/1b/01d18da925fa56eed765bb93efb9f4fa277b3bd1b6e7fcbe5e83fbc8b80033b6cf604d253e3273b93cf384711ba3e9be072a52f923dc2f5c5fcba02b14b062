[![Build Status](https://travis-ci.org/fengari-lua/fengari-interop.svg?branch=master)](https://travis-ci.org/fengari-lua/fengari-interop)
[![npm](https://img.shields.io/npm/v/fengari-interop.svg)](https://npmjs.com/package/fengari-interop)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![#fengari on libera.chat](https://img.shields.io/badge/chat-%23fengari-brightgreen)](https://web.libera.chat/?channels=#fengari)


# JS library for Fengari

[Fengari](https://github.com/fengari-lua/fengari) is a lua VM written in Javascript.
It's implementation makes use of the JS garbage collector, which means it is fully capable of cross language interop.

## Features

  - Call any JS function from Lua
  - Give Lua tables/functions/userdata to Javascript


## `js` library

```lua
js = require "js"
```

### `null`

A userdata representing JavaScript [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null)


### `global`

A reference to the JavaScript global context. In the browser, this is usually equivalent to the `window` object. In node.js it's equal to [`global`](https://nodejs.org/api/globals.html#globals_global).


### `new(constructor, ...)`

Invokes the JavaScript [`new` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new) on `constructor` passing the arguments specified.

Returns the created object.


### `of(iterable)`

Returns a iterating function and an iterator state that behave like a JavaScript [for...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) loop.
Suitable for use as a lua iterator. e.g.

```lua
for f in js.of(js.global:Array(10,20,30)) do
	print(f)
end
```

*Note: this function only exists if the JavaScript runtime supports [Symbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)*


### `createproxy(x[, type])`

*Note: Only available if your JS environment has the `Proxy` constructor*

Creates a JavaScript [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) object. The proxy supports configuring traps by setting them as metamethods on your object.

`type` may be `"function"` (the default) `"arrow_function"` or `"object"`:

  - `"function"`:
      - `typeof p === "function"`
      - Can be used as a constructor
  - `"arrow_function"`:
      - `typeof p === "function"`
      - Can **not** be used as a constructor
  - `"object"`:
      - `typeof p === "object"`
      - Can **not** be used as a constructor

Note that JavaScript coerces all types except Symbols to strings before using them as a key in an indexing operation.


### `tonumber(x)`

Coerces the value `x` to a number using JavaScript coercion rules.


### `tostring(x)`

Coerces the value `x` to a string using JavaScript coercion rules.


### `instanceof(x, y)`

Returns if the value `x` is an instance of the class `y` via use of the JavaScript [`instanceof` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)


### `typeof(x)`

Returns what JavaScript sees as the type of `x`. Uses the JavaScript [`typeof` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)


## JavaScript API

### `push(L, value)`

Pushes an arbitrary JavaScript object `value` as the most suitable lua type onto the lua stack `L`.
Performs deduplication so that the same JavaScript objects are pushed as the same lua objects.


### `pushjs(L, value)`

Pushes an arbitrary JavaScript object `value` as a userdata onto the lua stack `L`.
Rarely used; see `push(L, value)` instead.


### `checkjs(L, idx)`

If the value on the lua stack `L` at index `idx` is a JavaScript userdata object (as pushed by `push` or `pushjs`) then return it.
Otherwise throw an error.


### `testjs(L, idx)`

If the value on the lua stack `L` at index `idx` is a JavaScript userdata object (as pushed by `push` or `pushjs`) then return it.
Otherwise returns `undefined`.


### `tojs(L, idx)`

Returns the object on the lua stack `L` at index `idx` as the most suitable javascript type.

  - `nil` is returned as `undefined`
  - booleans are returned as booleans
  - numbers are returned as numbers
  - strings are returned as JavaScript strings
    (Note: this *can* throw an error if the lua string is not represenable as a JavaScript string)
  - JavaScript userdata object (as pushed by `push` or `pushjs`) returns the pushed JavaScript object
  - Other objects are returned wrapped in a JavaScript function object with methods:
      - `apply(this, [args...])`: calls the lua object. Returns only the first return value
      - `invoke(this, [args...])`: calls the lua object. Returns results as an array
      - `get(key)`: indexes the lua object
      - `has(key)`: checks if indexing the lua object results in `nil`
      - `set(key, value)`
      - `delete(key)`: sets the key to `nil`
      - `toString()`
    JavaScript arguments to these methods are passed in via `push()` and results are returned via `tojs()`.
    Calling the function is equivalent to calling the lua function wrapped.


### `luaopen_js`

The entrypoint for loading the [js library](#js-library) into a fengari `lua_State`.
Usually passed to `luaL_requiref`.


## Symbols

If the JavaScript environment supports [Symbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol), then some runtime-wide symbols can be used to customise behaviour:

### `__pairs`

The `__pairs` Symbol can be used to describe how to iterate over a JavaScript object. Use `Symbol.for("__pairs")` to get the symbol. It should be used as a key on your objects, where the value is a function returning an object with three properties: `"iter"`, `"state"` and `"first"`.

`"iter"` should be a function that follows the standard [Lua generic for protocol](http://www.lua.org/manual/5.3/manual.html#3.3.5), that is, it gets called with your *state* (as `this`) and the previous value produced; it should return an array of values or `undefined` if done.

e.g. to make `pairs` on a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) return entries in the map via the [iterator symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator):

```js
Map.prototype[Symbol.for("__pairs")] = function() {
	return {
		iter: function(last) {
			var v = this.next();
			if (v.done) return;
			return v.value;
		},
		state: this[Symbol.iterator]()
	};
};
```

If there is no `__pairs` Symbol attached to an object, an iterator over [`Object.keys`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys) is returned.


### `__len`

The `__len` Symbol can be used to describe how to get the length (used by the lua `#` operator) of a JavaScript object.
Use `Symbol.for("__len")` to get the symbol. It should be used as a key on your objects, where the value is a function returning the length of your objects (passed as `this`).

e.g. to have the lua `#` operator applied to a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) return the [`size`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/size) field:

```js
Map.prototype[Symbol.for("__len")] = function() {
	return this.size;
};
```

If there is no `__len` Symbol attached to an object, the value of the `.length` property is returned.
