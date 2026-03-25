# `v8-module-cache` Changelog

## 2021-03-05, Version 2.3.0

* Fix use require.main instead of module.parent [#34](https://github.com/zertosh/v8-compile-cache/pull/34).

## 2020-10-28, Version 2.2.0

* Added `V8_COMPILE_CACHE_CACHE_DIR` option [#23](https://github.com/zertosh/v8-compile-cache/pull/23).

## 2020-05-30, Version 2.1.1

* Stop using process.umask() [#28](https://github.com/zertosh/v8-compile-cache/pull/28).

## 2019-08-04, Version 2.1.0

* Fix Electron by calling the module wrapper with `Buffer` [#10](https://github.com/zertosh/v8-compile-cache/pull/10).

## 2019-05-10, Version 2.0.3

* Add `LICENSE` file [#19](https://github.com/zertosh/v8-compile-cache/pull/19).
* Add "repository" to `package.json` (see [eea336e](https://github.com/zertosh/v8-compile-cache/commit/eea336eaa8360f9ded9342b8aa928e56ac6a7529)).
* Support `require.resolve.paths` (added in Node v8.9.0) [#20](https://github.com/zertosh/v8-compile-cache/pull/20)/[#22](https://github.com/zertosh/v8-compile-cache/pull/22).

## 2018-08-06, Version 2.0.2

* Re-publish.

## 2018-08-06, Version 2.0.1

* Support `require.resolve` options (added in Node v8.9.0).

## 2018-04-30, Version 2.0.0

* Use `Buffer.alloc` instead of `new Buffer()`.
* Drop support for Node 5.x.

## 2018-01-23, Version 1.1.2

* Instead of checking for `process.versions.v8`, check that `script.cachedDataProduced` is `true` (rather than `null`/`undefined`) for support to be considered existent.

## 2018-01-23, Version 1.1.1

* Check for the existence of `process.versions.v8` before attaching hook (see [f8b0388](https://github.com/zertosh/v8-compile-cache/commit/f8b038848be94bc2c905880dd50447c73393f364)).

## 2017-03-27, Version 1.1.0

* Safer cache directory creation (see [bcb3b12](https://github.com/zertosh/v8-compile-cache/commit/bcb3b12c819ab0927ec4408e70f612a6d50a9617)).
  - The cache is now suffixed with the user's uid on POSIX systems (i.e. `/path/to/tmp/v8-compile-cache-1234`).

## 2017-02-21, Version 1.0.0

* Initial release.
