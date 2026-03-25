# manage-path

Status:
[![npm version](https://img.shields.io/npm/v/manage-path.svg?style=flat-square)](https://www.npmjs.org/package/manage-path)
[![npm downloads](https://img.shields.io/npm/dm/manage-path.svg?style=flat-square)](http://npm-stat.com/charts.html?package=manage-path&from=2015-09-01)
[![Build Status](https://img.shields.io/travis/kentcdodds/node-manage-path.svg?style=flat-square)](https://travis-ci.org/kentcdodds/node-manage-path)
[![Code Coverage](https://img.shields.io/codecov/c/github/kentcdodds/node-manage-path.svg?style=flat-square)](https://codecov.io/github/kentcdodds/node-manage-path)

This micro-lib allows you to alter the `$PATH` in a cross-platform way.

## Main Usage

```javascript
var path = require('path')
var managePath = require('manage-path')
var alterPath = managePath(process.env)
alterPath.shift(path.join(process.cwd(), 'node_modules', '.bin') // add one path to the beginning
// process.env.PATH now starts with the `.bin` in your `node_modules` directory :-)
// unless you happen to be running on windows, in which case it *might* be process.env.Path :-)
// but you don't have to think about that...

alterPath.push('~/custombin', '/usr/other/bin') // add multiple paths to the end
alterPath.push(['~/foo/bar', '/bar/foo/bin']) // array-style multi-path add for ultimate flexibility :-)

// need to get the path value cross-platform?
alterPath.get() // <-- returns value of PATH or Path... depending :-)

// want to restore the path to what it was before you mucked with it?
// just call the function you get back:
alterPath.restore()
```

## options

These are options you pass as an object to `managePath`

### platform

Allows you to specify your own platform. Defaults to `process.platform`. Currently the only meaningful value is
`'win32'`. This option is mainly available for testing purposes.

# Other info

LICENSE -> MIT

Much of the original code for this came from [npm/npm](https://github.com/npm/npm)

