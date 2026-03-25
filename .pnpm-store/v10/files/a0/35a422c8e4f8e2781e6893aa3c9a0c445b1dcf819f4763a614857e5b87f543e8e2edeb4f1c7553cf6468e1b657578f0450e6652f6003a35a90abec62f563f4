# test-exclude

The file include/exclude logic used by [nyc] and [babel-plugin-istanbul].

[![Build Status](https://travis-ci.org/istanbuljs/test-exclude.svg)](https://travis-ci.org/istanbuljs/test-exclude)
[![Coverage Status](https://coveralls.io/repos/github/istanbuljs/test-exclude/badge.svg?branch=master)](https://coveralls.io/github/istanbuljs/test-exclude?branch=master)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)
[![Greenkeeper badge](https://badges.greenkeeper.io/istanbuljs/test-exclude.svg)](https://greenkeeper.io/)

## Usage

```js
const TestExclude = require('test-exclude');
const exclude = new TestExclude();
if (exclude().shouldInstrument('./foo.js')) {
    // let's instrument this file for test coverage!
}
```

### TestExclude(options)

The test-exclude constructor accepts an options object.  The defaults are taken from
[@istanbuljs/schema].

#### options.cwd

This is the base directory by which all comparisons are performed.  Files outside `cwd`
are not included.

Default: `process.cwd()`

#### options.exclude

Array of path globs to be ignored.  Note this list does not include `node_modules` which
is added separately.  See [@istanbuljs/schema/default-excludes.js] for default list.

#### options.excludeNodeModules

By default `node_modules` is excluded.  Setting this option `true` allows `node_modules`
to be included.

#### options.include

Array of path globs that can be included.  By default this is unrestricted giving a result
similar to `['**']` but more optimized.

#### options.extension

Array of extensions that can be included.  This ensures that nyc only attempts to process
files which it might understand.  Note use of some formats may require adding parser
plugins to your nyc or babel configuration.

Default: `['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx']`

### TestExclude#shouldInstrument(filename): boolean

Test if `filename` matches the rules of this test-exclude instance.

```js
const exclude = new TestExclude();
exclude.shouldInstrument('index.js'); // true
exclude.shouldInstrument('test.js'); // false
exclude.shouldInstrument('README.md'); // false
exclude.shouldInstrument('node_modules/test-exclude/index.js'); // false
```

In this example code:
* `index.js` is true because it matches the default `options.extension` list
  and is not part of the default `options.exclude` list.
* `test.js` is excluded because it matches the default `options.exclude` list.
* `README.md` is not matched by the default `options.extension`
* `node_modules/test-exclude/index.js` is excluded because `options.excludeNodeModules`
  is true by default.

### TestExculde#globSync(cwd = options.cwd): Array[string]

This synchronously retrieves a list of files within `cwd` which should be instrumented.
Note that setting `cwd` to a parent of `options.cwd` is ineffective, this argument can
only be used to further restrict the result.

### TestExclude#glob(cwd = options.cwd): Promise<Array[string]>

This function does the same as `TestExclude#globSync` but does so asynchronously.  The
Promise resolves to an Array of strings.


## `test-exclude` for enterprise

Available as part of the Tidelift Subscription.

The maintainers of `test-exclude` and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-test-exclude?utm_source=npm-test-exclude&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)

[nyc]: https://github.com/istanbuljs/nyc
[babel-plugin-istanbul]: https://github.com/istanbuljs/babel-plugin-istanbul
[@istanbuljs/schema]: https://github.com/istanbuljs/schema
[@istanbuljs/schema/default-excludes.js]: https://github.com/istanbuljs/schema/blob/master/default-exclude.js
