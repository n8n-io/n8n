# read-cache [![Build Status](https://travis-ci.org/TrySound/read-cache.svg?branch=master)](https://travis-ci.org/TrySound/read-cache)

Reads and caches the entire contents of a file until it is modified.


## Install

```
$ npm i read-cache
```


## Usage

```js
// foo.js
var readCache = require('read-cache');

readCache('foo.js').then(function (contents) {
	console.log(contents);
});
```


## API

### readCache(path[, encoding])

Returns a promise that resolves with the file's contents.

### readCache.sync(path[, encoding])

Returns the content of the file.

### readCache.get(path[, encoding])

Returns the content of cached file or null.

### readCache.clear()

Clears the contents of the cache.


## License

MIT © [Bogdan Chadkin](mailto:trysound@yandex.ru)
