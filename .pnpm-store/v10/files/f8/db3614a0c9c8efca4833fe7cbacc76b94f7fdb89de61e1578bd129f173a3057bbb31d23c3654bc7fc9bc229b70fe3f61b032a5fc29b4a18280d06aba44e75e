# browser-resolve [![Build Status](https://travis-ci.org/browserify/browser-resolve.png?branch=master)](https://travis-ci.org/browserify/browser-resolve)

node.js resolve algorithm with [browser field](https://github.com/defunctzombie/package-browser-field-spec) support.

## api

### bresolve(id, opts={}, cb)

Resolve a module path and call `cb(err, path [, pkg])`

Options:

* `basedir` - directory to begin resolving from
* `browser` - the 'browser' property to use from package.json (defaults to 'browser')
* `filename` - the calling filename where the `require()` call originated (in the source)
* `modules` - object with module id/name -> path mappings to consult before doing manual resolution (use to provide core modules)
* `packageFilter` - transform the parsed `package.json` contents before looking at the `main` field
* `paths` - `require.paths` array to use if nothing is found on the normal `node_modules` recursive walk

Additionally, options supported by [node-resolve](https://github.com/browserify/resolve#resolveid-opts-cb) can be used.

### bresolve.sync(id, opts={})

Same as the async resolve, just uses sync methods.

Additionally, options supported by [node-resolve](https://github.com/browserify/resolve#resolvesyncid-opts-cb) can be used.

## basic usage

you can resolve files like `require.resolve()`:
``` js
var bresolve = require('browser-resolve');
bresolve('../', { filename: __filename }, function(err, path) {
    console.log(path);
});
```

```
$ node example/resolve.js
/home/substack/projects/browser-resolve/index.js
```

## core modules

By default, core modules (http, dgram, etc) will return their same name as the path. If you want to have specific paths returned, specify a `modules` property in the options object.

``` js
var shims = {
    http: '/your/path/to/http.js'
};

var bresolve = require('browser-resolve');
bresolve('http', { modules: shims }, function(err, path) {
    console.log(path);
});
```

```
$ node example/builtin.js
/home/substack/projects/browser-resolve/builtin/http.js
```

## browser field
browser-specific versions of modules

``` json
{
  "name": "custom",
  "version": "0.0.0",
  "browser": {
    "./main.js": "custom.js"
  }
}
```

``` js
var bresolve = require('browser-resolve');
var parent = { filename: __dirname + '/custom/file.js' };
bresolve('./main.js', parent, function(err, path) {
    console.log(path);
});
```

```
$ node example/custom.js
/home/substack/projects/browser-resolve/example/custom/custom.js
```

You can use different package.json properties for the resolution, if you want to allow packages to target different environments for example:

``` json
{
  "browser": { "./main.js": "custom.js" },
  "chromeapp": { "./main.js": "custom-chromeapp.js" }
}
```

``` js
var bresolve = require('browser-resolve');
var parent = { filename: __dirname + '/custom/file.js', browser: 'chromeapp' };
bresolve('./main.js', parent, function(err, path) {
    console.log(path);
});
```

```
$ node example/custom.js
/home/substack/projects/browser-resolve/example/custom/custom-chromeapp.js
```

## skip

You can skip over dependencies by setting a
[browser field](https://gist.github.com/defunctzombie/4339901)
value to `false`:

``` json
{
  "name": "skip",
  "version": "0.0.0",
  "browser": {
    "tar": false
  }
}
```

This is handy if you have code like:

``` js
var tar = require('tar');

exports.add = function (a, b) {
    return a + b;
};

exports.parse = function () {
    return tar.Parse();
};
```

so that `require('tar')` will just return `{}` in the browser because you don't
intend to support the `.parse()` export in a browser environment.

``` js
var bresolve = require('browser-resolve');
var parent = { filename: __dirname + '/skip/main.js' };
bresolve('tar', parent, function(err, path) {
    console.log(path);
});
```

```
$ node example/skip.js
/home/substack/projects/browser-resolve/empty.js
```

# license

MIT

# upgrade notes

Prior to v1.x this library provided shims for node core modules. These have since been removed. If you want to have alternative core modules provided, use the `modules` option when calling `bresolve()`.

This was done to allow package managers to choose which shims they want to use without browser-resolve being the central point of update.
