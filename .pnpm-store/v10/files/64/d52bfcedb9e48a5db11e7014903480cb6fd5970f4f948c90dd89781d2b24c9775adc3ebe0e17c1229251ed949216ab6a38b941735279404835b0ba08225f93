<p align="center"><img src="https://cdn.rawgit.com/jstransformers/jstransformer/2bb6dc6c410e8683a17a4af5f1b73bcbee95aada/logo.svg" width="300px" height="299px" /></p>
<h1 align="center">JSTransformer</h1>
<p align="center">Normalize the API of any jstransformer</p>

<p align="center"><a href="https://travis-ci.org/jstransformers/jstransformer"><img src="https://img.shields.io/travis/jstransformers/jstransformer/master.svg" alt="Build Status"></a>
<a href="https://david-dm.org/jstransformers/jstransformer"><img src="https://img.shields.io/david/jstransformers/jstransformer.svg" alt="Dependency Status"></a>
<a href="https://david-dm.org/jstransformers/jstransformer#info=devDependencies"><img src="https://img.shields.io/david/dev/jstransformers/jstransformer.svg" alt="Developers' Dependency Status"></a>
<a href="https://coveralls.io/r/jstransformers/jstransformer?branch=master"><img src="https://img.shields.io/coveralls/jstransformers/jstransformer/master.svg" alt="Coverage Status"></a>
<a href="https://www.npmjs.org/package/jstransformer"><img src="https://img.shields.io/npm/v/jstransformer.svg" alt="NPM version"></a></p>

## Installation

    npm install jstransformer

## Usage

```js
var transformer = require('jstransformer');
var marked = transformer(require('jstransformer-marked'));

var options = {};
var res = marked.render('Some **markdown**', options);
// => {body: 'Some <strong>markdown</strong>', dependencies: []}
```

This gives the same API regardless of the jstransformer passed in.

## API

A transformer, once normalised using this module, will implement the following methods.  Note that if the underlying transformer cannot be used to implement the functionality, it may ultimately just throw an error.

### Returned object from `.render*`

```js
{body: String, dependencies: Array.<String>}
```

 - `body` represents the result as a string
 - `dependencies` is an array of files that were read in as part of the render process (or an empty array if there were no dependencies)

### `.render`

```js
transformer.render(str, options, locals);
=> {body: String, dependencies: Array.<String>}
```

_requires the underlying transform to implement `.render` or `.compile`_

Transform a string and return an object.

### `.renderAsync`

```js
transformer.renderAsync(str[, options], locals, callback);
```

```js
transformer.renderAsync(str[, options], locals);
=> Promise({body: String, dependencies: Array.<String>})
```

_requires the underlying transform to implement `.renderAsync` or `.render`_

Transform a string asynchronously. If a callback is provided, it is called as `callback(err, data)`, otherwise a Promise is returned.

### `.renderFile`

```js
transformer.renderFile(filename, options, locals)
=> {body: String, dependencies: Array.<String>}
```

_requires the underlying transform to implement `.renderFile`, `.render`, `.compileFile`, or `.compile`_

Transform a file and return an object.

### `.renderFileAsync`

```js
transformer.renderFileAsync(filename[, options], locals, callback);
```

```js
transformer.renderFileAsync(filename[, options], locals);
=> Promise({body: String, dependencies: Array.<String>})
```

_requires the underlying transform to implement `.renderFileAsync`, `.renderFile`, `.renderAsync`, `.render`, `.compileFileAsync`, `.compileFile`, `.compileAsync`, or `.compileFile`_

Transform a file asynchronously. If a callback is provided, it is called as `callback(err, data)`, otherwise a Promise is returned.

### `.inputFormats`

```js
var formats = transformer.inputFormats;
=> ['md', 'markdown']
```

Returns an array of strings representing potential input formats for the transform. If not provided directly by the transform, results in an array containing the name of the transform.

### `.outputFormat`

```js
var md = require('jstransformer')(require('jstransformer-markdown'))
var outputFormat = md.outputFormat
=> 'html'
```

Returns a string representing the default output format the transform would be expected to return when calling `.render()`.

## License

MIT
