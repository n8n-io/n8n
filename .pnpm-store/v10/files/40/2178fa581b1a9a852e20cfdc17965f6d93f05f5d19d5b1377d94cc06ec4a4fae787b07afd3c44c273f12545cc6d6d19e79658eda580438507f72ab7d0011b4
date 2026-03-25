# json-pointer

[![Build Status](https://travis-ci.org/manuelstofer/json-pointer.svg?branch=master)](https://travis-ci.org/manuelstofer/json-pointer)
[![npm version](https://badge.fury.io/js/json-pointer.svg)](https://www.npmjs.com/package/json-pointer)
[![Coverage Status](https://coveralls.io/repos/github/manuelstofer/json-pointer/badge.svg?branch=master&service=github)](https://coveralls.io/github/manuelstofer/json-pointer?branch=master)

Some utilities for JSON pointers described by RFC 6901

Provides some additional stuff i needed but is not included in [node-jsonpointer](https://github.com/janl/node-jsonpointer)


## Installation

[node.js](http://nodejs.org)

```bash
$ npm install json-pointer
```


## API

```Javascript
var pointer = require('json-pointer');
```


### .get(object, pointer)

Looks up a JSON pointer in an object.

Array of reference tokens, e.g. returned by api.parse, can be passed as a pointer to .get, .set and .remove methods.

```Javascript
var obj = {
    example: {
        bla: 'hello'
    }
};
pointer.get(obj, '/example/bla');
```


### .set(object, pointer, value)

Sets a new value on object at the location described by pointer.

```Javascript
var obj = {};
pointer.set(obj, '/example/bla', 'hello');
```


### .remove(object, pointer)

Removes an attribute of object referenced by pointer.

```Javascript
var obj = {
    example: 'hello'
};
pointer.remove(obj, '/example');
// obj -> {}
```


### .dict(object)

Creates a dictionary object (pointer -> value).

```Javascript
var obj = {
    hello: {bla: 'example'}
};
pointer.dict(obj);

// Returns:
// {
//    '/hello/bla': 'example'
// }
```


### .walk(object, iterator)

Just like:

```Javascript
each(pointer.dict(obj), iterator);
```


### .has(object, pointer)

Tests if an object has a value for a JSON pointer.

```Javascript
var obj = {
    bla: 'hello'
};

pointer.has(obj, '/bla');               // -> true
pointer.has(obj, '/non/existing');      // -> false
```


### .escape(str)

Escapes a reference token.

```Javascript
pointer.escape('hello~bla');            // -> 'hello~0bla'
pointer.escape('hello/bla');            // -> 'hello~1bla'
```


### .unescape(str)

Unescape a reference token.

```Javascript
pointer.unescape('hello~0bla');         // -> 'hello~bla'
pointer.unescape('hello~1bla');         // -> 'hello/bla'
```


### .parse(str)

Converts a JSON pointer into an array of reference tokens.

```Javascript
pointer.parse('/hello/bla');            // -> ['hello', 'bla']
```


### .compile(array)

Builds a json pointer from an array of reference tokens.

```Javascript
pointer.compile(['hello', 'bla']);      // -> '/hello/bla'
```


### pointer(object, [pointer, [value]])

Convenience wrapper around the api.

```Javascript
pointer(object)                 // bind object
pointer(object, pointer)        // get
pointer(object, pointer, value) // set
```

The wrapper supports chainable object oriented style.

```Javascript
var obj = {anything: 'bla'};
var objPointer = pointer(obj);
objPointer.set('/example', 'bla').dict();
```
