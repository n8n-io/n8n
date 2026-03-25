# App Root Path Module

[![Build Status][build-status-img]][build-status] [![Dependency Status][david-dm-img]][david-dm] [![Code Coverage Status][codecov-img]][codecov]

> **Please Note:** Due to the very limited scope of this module, I do not anticipate needing to make very many changes to it.  Expect long stretches of zero updates—that does not mean that the module is outdated.

This simple module helps you access your application's root path from anywhere in the application without resorting to relative paths like `require("../../path")`.

## Installation

``` bash
$ npm i -S app-root-path
```

## Usage

To simply access the app's root path, use the module as though it were a string:

``` js
var appRoot = require('app-root-path');
var myModule = require(appRoot + '/lib/my-module.js');
```

> _Side note: the module actually returns an object, but that object implements the `toString` method, so you can use it as though it were a string.  There are a few edge cases where this might not be the case (most notably `console.log`), but they shouldn't affect actual use of the module, where you're almost always concatenating with an additional string._

A helper function is also provided:

``` js
var reqlib = require('app-root-path').require;
var myModule = reqlib('/lib/my-module.js');
```

It's a little hacky, but you can also put this method on your application's `global` object to use it everywhere in your project:

``` js
// In app.js
global.reqlib = require('app-root-path').require;

// In lib/module/component/subcomponent.js
var myModule = reqlib('/lib/my-module.js');
```

Finally, you can also just resolve a module path:

``` js
var myModulePath = require('app-root-path').resolve('/lib/my-module.js');
```

You can explicitly set the path, using the environmental variable `APP_ROOT_PATH` or by calling `require('app-root-path').setPath('/my/app/is/here')`

## How It Works (under the hood)

> No need to read this unless you're curious—or you run into a (very unlikely) case where the module does not work as expected.

This module uses two different methods to determine the app's root path, depending on the circumstances.

### Primary Method

If the module is located inside your project's directory, somewhere within the `node_modules` directory (whether directly, or inside a submodule), we effectively do (the actual code takes cross-platform path names/etc into consideration):

``` js
path.resolve(__dirname).split('/node_modules')[0];
```

This will take a path like `/var/www/node_modules/submodule/node_modules/app-root-path` and return `/var/www`.  In nearly all cases, this is just what you need.

### Secondary Method (for edge cases)

The node module loader will also look in a few other places for modules (for example, ones that you install globally with `npm install -g`).  These can be in one of: 

  - `$HOME/.node_modules`
  - `$HOME/.node_libraries`
  - `$PREFIX/lib/node`

Or, anywhere in the `NODE_PATH` environmental variable ([see documentation](http://nodejs.org/api/modules.html#modules_loading_from_the_global_folders)).

In these cases, we fall back to an alternate trick:

``` js
path.dirname(require.main.filename);
```

When a file is run directly from Node, `require.main` is set to that file's `module`.  Each module has a `filename` property that refers to the filename of that module, so by fetching the directory name for that file, we at least get the directory of file passed to `node`.  In some cases (process managers and test suites, for example) this doesn't actually give the correct directory, though, so this method is only used as a fallback.

### Edge-Case: Global CLIs

If your module is installed as a global CLI, for example in `/usr/local/lib/node_modules/yourmodule`, then
`require.main.filename` will report `/usr/local/lib/node_modules/yourmodule/bin`, which is probably not what
you want. `app-root-path` is aware of this edge-case and will strip the `/bin` automatically.

## Change Log

### 3.1.0
  - Added TypeScript types
  - Added fallback for when `require.main` is missing (ESM imports)

### 3.0.0
  - Improved Yarn Plug'n'Play support
  - Fixed bug when used with webpack

### 2.2.1
  - Better handling of webpack

### 2.2.0
  - Added support for Yarn Plug'n'Play
  - Adjusted browser-shim to address webpack warnings
  - Bumped minimum Node version to 6

### 2.0.1
  - Minor tweaks to how electron-specific logic runs. Should help with packagers that try to resolve all `require()` statements during packaging.

### 2.0.0
  - Removed official support for node < 4.0
  - Removed support for passing `module.require` to `appRootPath.require` (which has been deprecated for a while)
  - Implemented [semantic-release](https://github.com/semantic-release/semantic-release) from here on out
  - Added browserify-compatible shim

### 1.3.0
  - Updated [electron](https://github.com/atom/electron) to match changes in version 1.0 of that project

### 1.2.1
  - Had to bump package version because 1.2.0 got published to npm as @beta

### 1.2.0
  - Special logic to resolve correctly when in an [electron](https://github.com/atom/electron) renderer process

### 1.1.0
  - Special logic to handle an edge case when used in a globally-installed CLI project
  - Fixed a bug where `setPath()` did not update `require('app-root-path').path`
  - Moved some logic outside of the `resolve()` function so that it's not called multiple times

### 1.0.0
  - No changes.  Just updated the version to signify a locked API (see [semver](http://semver.org/)).

### 0.1.1
  - Added Windows support (and, theoretically, other operating systems that have a directory separator that's not "/")

### 0.1.0
  - Completely rewrote the path resolution method to account for most possible scenarios.  This shouldn't cause and backwards compatibility issues, but always test your code.
  - Removed the need to pass a modules's `require()` method to the `appRootPath.require()` function.  Which it's true that each module has its own `require()` method, in practice it doesn't matter, and it's **much** simpler this way.
  - Added tests

## Development Nodes

When using [semantic-release](https://github.com/semantic-release/semantic-release), the preferred method 
for commits is:

  - `git add …`
  - `git cz` (see [commitizen](https://github.com/commitizen/cz-cli))
  - `git push`

This helps ensure that commits match the expected format.  Commits to `master` will cause releases.

[build-status]: https://travis-ci.org/inxilpro/node-app-root-path
[build-status-img]: https://travis-ci.org/inxilpro/node-app-root-path.svg
[david-dm-img]: https://david-dm.org/inxilpro/node-app-root-path.svg
[david-dm]: https://david-dm.org/inxilpro/node-app-root-path
[codecov-img]: https://codecov.io/gh/inxilpro/node-app-root-path/branch/master/graph/badge.svg
[codecov]: https://codecov.io/gh/inxilpro/node-app-root-path
