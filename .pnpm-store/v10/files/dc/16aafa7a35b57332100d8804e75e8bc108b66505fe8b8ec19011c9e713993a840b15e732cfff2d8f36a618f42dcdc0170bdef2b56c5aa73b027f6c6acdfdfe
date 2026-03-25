# caching-transform [![Build Status](https://travis-ci.org/istanbuljs/caching-transform.svg?branch=master)](https://travis-ci.org/istanbuljs/caching-transform) [![Coverage Status](https://coveralls.io/repos/github/istanbuljs/caching-transform/badge.svg?branch=master)](https://coveralls.io/github/istanbuljs/caching-transform?branch=master)

> Wraps a transform and provides caching.

Caching transform results can greatly improve performance. `nyc` saw [dramatic performance increases](https://github.com/bcoe/nyc/pull/101#issuecomment-165716069) when we implemented caching.


## Install

```
$ npm install caching-transform
```


## Usage

```js
const cachingTransform = require('caching-transform');

const transform = cachingTransform({
	cacheDir: '/path/to/cache/directory',
	salt: 'hash-salt',
	transform: (input, metadata, hash) => {
		// ... Expensive operations ...
		return transformedResult;
	}
});

transform('some input for transpilation')
// => fetch from the cache,
//    or run the transform and save to the cache if not found there
```


## API

### cachingTransform(options)

Returns a transform callback that takes two arguments:

 - `input` a string to be transformed
 - `metadata` an arbitrary data object

Both arguments are passed to the wrapped transform. Results are cached in the cache directory using an `sha256` hash of `input` and an optional `salt` value. If a cache entry already exist for `input`, the wrapped transform function will never be called.

#### options

##### salt

Type: `string` `Buffer`<br>
Default: `''`

A value that uniquely identifies your transform:

```js
const pkg = require('my-transform/package.json');
const salt = pkg.name + ':' + pkg.version;
```

Including the version in the salt ensures existing cache entries will be automatically invalidated when you bump the version of your transform. If your transform relies on additional dependencies, and the transform output might change as those dependencies update, then your salt should incorporate the versions of those dependencies as well.

##### transform

Type: `Function(input: string|Buffer, metadata: *, hash: string): string|Buffer`

 - `input`: The value to be transformed. It is passed through from the wrapper.
 - `metadata`: An arbitrary data object passed through from the wrapper. A typical value might be a string filename.
 - `hash`: The salted hash of `input`. Useful if you intend to create additional cache entries beyond the transform result (i.e. `nyc` also creates cache entries for source-map data). This value is not available if the cache is disabled, if you still need it, the default can be computed via [`hasha([input, salt])`](https://www.npmjs.com/package/hasha).

The transform function will return a `string` (or Buffer if `encoding === 'buffer'`) containing the result of transforming `input`.

##### factory

Type: `Function(cacheDir: string): transformFunction`

If the `transform` function is expensive to create, and it is reasonable to expect that it may never be called during the life of the process, you may supply a `factory` function that will be used to create the `transform` function the first time it is needed.

A typical usage would be to prevent eagerly `require`ing expensive dependencies like Babel:

```js
function factory() {
	// Using the factory function, you can avoid loading Babel until you are sure it is needed.
	const babel = require('babel-core');

	return (code, metadata) => {
		return babel.transform(code, {filename: metadata.filename, plugins: [/* ... */]});
	};
}
```

##### cacheDir

*Required unless caching is disabled*<br>
Type: `string`

The directory where cached transform results will be stored. The directory is automatically created with [`mkdirp`](https://www.npmjs.com/package/mkdirp). You can set `options.createCacheDir = false` if you are certain the directory already exists.

##### ext

Type: `string`<br>
Default: `''`

An extension that will be appended to the salted hash to create the filename inside your cache directory. It is not required, but recommended if you know the file type. Appending the extension allows you to easily inspect the contents of the cache directory with your file browser.

##### shouldTransform

Type: `Function(input: string|Buffer, additionalData: *)`<br>
Default: Always transform

A function that examines `input` and `metadata` to determine whether the transform should be applied. Returning `false` means the transform will not be applied and `input` will be returned unmodified.

##### disableCache

Type: `boolean`<br>
Default: `false`

If `true`, the cache is ignored and the transform is used every time regardless of cache contents.

##### hashData

Type: `Function(input: string|Buffer, metadata: *): string|Buffer|Array[string|Buffer]`

Provide additional data that should be included in the hash.

One potential use is including the `metadata` in the hash by coercing it to a hashable string or buffer:

```js
function hashData(input, metadata) {
	return JSON.stringify(metadata);
}
```

(Note that `metadata` is not taken into account otherwise.)

##### filenamePrefix

Type: `Function(metadata: *): string`

Provide a filename to prefix the cache entry.  The return value may not contain any path separators.

```js
function filenamePrefix(metadata) {
	return path.parse(metadata.filename || '').name + '-';
}
```

##### onHash

Type: `Function(input: string|Buffer, metadata: *, hash: string)`

Function that is called after input is hashed.

##### encoding

Type: `string`<br>
Default: `'utf8'`

The encoding to use when writing to / reading from the filesystem. If set it to `buffer`, then buffers will be returned from the cache instead of strings.


## License

MIT © [James Talmage](https://github.com/jamestalmage)
