# JSON Pointer for Node.js

This is an implementation of [JSON Pointer](https://tools.ietf.org/html/rfc6901).

## CLI

Looking to filter JSON from the command line? Check out [jsonpointer-cli](https://github.com/joeyespo/jsonpointer-cli).

## Usage
```javascript
var jsonpointer = require('jsonpointer');
var obj = { foo: 1, bar: { baz: 2}, qux: [3, 4, 5]};

jsonpointer.get(obj, '/foo');     // returns 1
jsonpointer.get(obj, '/bar/baz'); // returns 2
jsonpointer.get(obj, '/qux/0');   // returns 3
jsonpointer.get(obj, '/qux/1');   // returns 4
jsonpointer.get(obj, '/qux/2');   // returns 5
jsonpointer.get(obj, '/quo');     // returns undefined

jsonpointer.set(obj, '/foo', 6);  // sets obj.foo = 6;
jsonpointer.set(obj, '/qux/-', 6) // sets obj.qux = [3, 4, 5, 6]

var pointer = jsonpointer.compile('/foo')
pointer.get(obj)    // returns 1
pointer.set(obj, 1) // sets obj.foo = 1
```

## Testing

    $ npm test
    All tests pass.
    $

[![Node.js CI](https://github.com/janl/node-jsonpointer/actions/workflows/node.js.yml/badge.svg)](https://github.com/janl/node-jsonpointer/actions/workflows/node.js.yml)

## Author

(c) 2011-2021 Jan Lehnardt <jan@apache.org> & Marc Bachmann <https://github.com/marcbachmann>

Thanks to all contributors.

## License

MIT License.
