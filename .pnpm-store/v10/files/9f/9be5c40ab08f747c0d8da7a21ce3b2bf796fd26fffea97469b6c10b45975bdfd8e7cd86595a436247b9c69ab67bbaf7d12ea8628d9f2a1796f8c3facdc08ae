[![NPM](https://nodei.co/npm/app-module-path.png?downloads=true)](https://nodei.co/npm/app-module-path/)

app-module-path
=====================

This simple module enables you to add additional directories to the Node.js module search path (for top-level app modules only). This allows application-level modules to be required as if they were installed into the `node_modules` directory.

## Installation

`npm install app-module-path --save`

## Usage
```javascript
// ***IMPORTANT**: The following line should be added to the very
//                 beginning of your main script!
require('app-module-path').addPath(baseDir);
```

__IMPORTANT:__
The search path should be modified before any modules are loaded!

__Example:__

In your `my-app/index.js` (or `my-app/server.js`) file:
```javascript
// Add the root project directory to the app module search path:
require('app-module-path').addPath(__dirname);
```

Given the following example directory structure:

- **my-app/**
    - **src/** - Source code and application modules directory
        - **foo/** - A module directory
            - index.js
        - **bar/** - Another module directory
            - index.js
    - **node_modules/** - Installed modules
        - **installed-baz/** - An installed module
            - index.js
    - index.js - Main script

The following will work for any modules under the `src` directory:
```javascript
// All of the following lines will work in "src/foo/index.js" and "src/bar/index.js":
var foo = require('src/foo'); // Works
var bar = require('src/bar'); // Works
var baz = require('installed-baz'); // Works
```

Lastly, by design, installed modules (i.e. modules under the `node_modules` directory) will not be able to require application-level modules so the following will ___not___ work:

```javascript
// All of the following lines will *not* work in "node_modules/installed-baz/index.js"!
var foo = require('src/foo'); // Fails
var bar = require('src/bar'); // Fails
```

## Alternate Usage (`app-module-path/register`)

This module supports an alternate method of adding a path to the Node.js module search path that requires less code. Requiring or importing the `app-module-path/register` module will result in the directory of the calling module being added to the Node.js module search path as shown below:

## Explicitly enabling a directory/package

By default, `app-module-path` will not attempt to resolve app modules from a directory that is found to be within a `node_modules` directory. This behavior can be changed by explicitly enabling `app-module-path` to work for descendent modules of a specific directory. For example:

```javascript
var packageDir = path.dirname(require.resolve('installed-module-allowed'));
require('../').enableForDir(packageDir);
```


### ES5

```javascript
require('app-module-path/register');

// Is equivalent to:
require('app-module-path').addPath(__dirname);
```

### ES6

```javascript
import "app-module-path/register";

// Is equivalent to:
import { addPath } from 'app-module-path';
addPath(__dirname);
```

## Alternative Usage (`app-module-path/cwd`)

Additionally, requiring or importing `app-module-path/cwd` will result in the current working directory of the Node.js process being added to the module search path as shown below:

### ES5

```javascript
require('app-module-path/cwd');

// Is equivalent to:
require('app-module-path').addPath(process.cwd());
```

### ES6

```javascript
import "app-module-path/cwd";

// Is equivalent to:
import { addPath } from 'app-module-path';
addPath(process.cwd());
```

## Additional Notes

* __Search path order:__
    * App module paths will be added to the end of the default module search path. That is, if a module with the same name exists in both a `node_modules` directory and an application module directory then the module in the `node_modules` directory will be loaded since it is found first.
    *This behavior is new in v2.x. In v1.x, this search order was reversed*

* __Node.js compatibility:__
    * This module depends on overriding/wrapping a built-in Node.js method, and it is possible (but unlikely) that this behavior could be broken in a future release of Node.js (at which point a workaround would need to be used)
    * This module will _not_ change or break modules installed into the `node_modules` directory.
* __Recommendations:__
    * Since this module changes the Node.js convention of how non-relative modules are resolved, it is recommended (but not required) to put all app modules in a common directory below the application root (such as `my-app/src` or `my-app/app_modules`) and then to add the application root to the search path. The require calls would then be something like `require('src/foo')` or `require('app_modules/foo')`. The common prefix makes it more clear that the module can be found in the application's modules directory and not in the `node_modules` directory.


## Contribute
Pull requests, bug reports and feature requests welcome.

## License

BSD-2-Clause
