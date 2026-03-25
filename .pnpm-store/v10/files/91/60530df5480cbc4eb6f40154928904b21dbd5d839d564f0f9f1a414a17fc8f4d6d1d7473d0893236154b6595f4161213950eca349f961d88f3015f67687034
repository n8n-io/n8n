# simple-swizzle [![Travis-CI.org Build Status](https://img.shields.io/travis/Qix-/node-simple-swizzle.svg?style=flat-square)](https://travis-ci.org/Qix-/node-simple-swizzle) [![Coveralls.io Coverage Rating](https://img.shields.io/coveralls/Qix-/node-simple-swizzle.svg?style=flat-square)](https://coveralls.io/r/Qix-/node-simple-swizzle)

> [Swizzle](https://en.wikipedia.org/wiki/Swizzling_(computer_graphics)) your function arguments; pass in mixed arrays/values and get a clean array

## Usage

```js
var swizzle = require('simple-swizzle');

function myFunc() {
	var args = swizzle(arguments);
	// ...
	return args;
}

myFunc(1, [2, 3], 4); // [1, 2, 3, 4]
myFunc(1, 2, 3, 4);   // [1, 2, 3, 4]
myFunc([1, 2, 3, 4]); // [1, 2, 3, 4]
```

Functions can also be wrapped to automatically swizzle arguments and be passed
the resulting array.

```js
var swizzle = require('simple-swizzle');

var swizzledFn = swizzle.wrap(function (args) {
	// ...
	return args;
});

swizzledFn(1, [2, 3], 4); // [1, 2, 3, 4]
swizzledFn(1, 2, 3, 4);   // [1, 2, 3, 4]
swizzledFn([1, 2, 3, 4]); // [1, 2, 3, 4]
```

## License
Licensed under the [MIT License](http://opensource.org/licenses/MIT).
You can find a copy of it in [LICENSE](LICENSE).
