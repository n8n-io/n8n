2.2.0 / 2025-03-26
==================

* Remove `setImmediate` support check
* Restore `debug` dependency

2.1.0 / 2025-02-10
==================

* Updated `engines` field to Node@18 or higher
* Remove `Object.setPrototypeOf` polyfill
* Use `Array.flat` instead of `array-flatten` package
* Replace `methods` dependency with standard library
* deps: parseurl@^1.3.3
* deps: is-promise@^4.0.0
* Replace `utils-merge` dependency with `Object.assign`
* deps: Remove unused dep `after`

2.0.0 / 2024-09-09
==================

* Drop support for node <18
* deps: path-to-regexp@^8.0.0
  - Drop support for partial capture group `router.route('/user(s?)/:user/:op')` but still have optional non-capture `/user{s}/:user/:op`
  - `:name?` becomes `{:name}`
  - `:name*` becomes `*name`.
  - The splat change also changes splat from strings to an array of strings
  - Optional splats become `{*name}`
  - `:name+` becomes `*name` and thus equivalent to `*name` so I dropped those tests
  - Strings as regular expressions are fully removed, need to be converted to native regular expressions

2.0.0-beta.2 / 2024-03-20
=========================

This incorporates all changes after 1.3.5 up to 1.3.8.

  * Add support for returned, rejected Promises to `router.param`

2.0.0-beta.1 / 2020-03-29
=========================

This incorporates all changes after 1.3.3 up to 1.3.5.

  * Internalize private `router.process_params` method
  * Remove `debug` dependency
  * deps: array-flatten@3.0.0
  * deps: parseurl@~1.3.3
  * deps: path-to-regexp@3.2.0
    - Add new `?`, `*`, and `+` parameter modifiers.
    - Matching group expressions are only RegExp syntax.
      `(*)` is no longer valid and must be written as `(.*)`, for example.
    - Named matching groups no longer available by position in `req.params`.
      `/:foo(.*)` only captures as `req.params.foo` and not available as
      `req.params[0]`.
    - Regular expressions can only be used in a matching group.
      `/\\d+` is no longer valid and must be written as `/(\\d+)`.
    - Matching groups are now literal regular expressions.
      `:foo` named captures can no longer be included inside a capture group.
    - Special `*` path segment behavior removed.
      `/foo/*/bar` will match a literal `*` as the middle segment.
  * deps: setprototypeof@1.2.0

2.0.0-alpha.1 / 2018-07-27
==========================

  * Add basic support for returned, rejected Promises
    - Rejected Promises from middleware functions `next(error)`
  * Drop support for Node.js below 0.10
  * deps: debug@3.1.0
    - Add `DEBUG_HIDE_DATE` environment variable
    - Change timer to per-namespace instead of global
    - Change non-TTY date format
    - Remove `DEBUG_FD` environment variable support
    - Support 256 namespace colors

1.3.8 / 2023-02-24
==================

  * Fix routing requests without method

1.3.7 / 2022-04-28
==================

  * Fix hanging on large stack of sync routes

1.3.6 / 2021-11-15
==================

  * Fix handling very large stacks of sync middleware
  * deps: safe-buffer@5.2.1

1.3.5 / 2020-03-24
==================

  * Fix incorrect middleware execution with unanchored `RegExp`s
  * perf: use plain object for internal method map

1.3.4 / 2020-01-24
==================

  * deps: array-flatten@3.0.0
  * deps: parseurl@~1.3.3
  * deps: setprototypeof@1.2.0

1.3.3 / 2018-07-06
==================

  * Fix JSDoc for `Router` constructor

1.3.2 / 2017-09-24
==================

  * deps: debug@2.6.9
  * deps: parseurl@~1.3.2
    - perf: reduce overhead for full URLs
    - perf: unroll the "fast-path" `RegExp`
  * deps: setprototypeof@1.1.0
  * deps: utils-merge@1.0.1

1.3.1 / 2017-05-19
==================

  * deps: debug@2.6.8
    - Fix `DEBUG_MAX_ARRAY_LENGTH`
    - deps: ms@2.0.0

1.3.0 / 2017-02-25
==================

  * Add `next("router")` to exit from router
  * Fix case where `router.use` skipped requests routes did not
  * Use `%o` in path debug to tell types apart
  * deps: setprototypeof@1.0.3
  * perf: add fast match path for `*` route

1.2.0 / 2017-02-17
==================

  * Skip routing when `req.url` is not set
  * deps: debug@2.6.1
    - Allow colors in workers
    - Deprecated `DEBUG_FD` environment variable set to `3` or higher
    - Fix error when running under React Native
    - Use same color for same namespace
    - deps: ms@0.7.2

1.1.5 / 2017-01-28
==================

  * deps: array-flatten@2.1.1
  * deps: setprototypeof@1.0.2
    - Fix using fallback even when native method exists

1.1.4 / 2016-01-21
==================

  * deps: array-flatten@2.0.0
  * deps: methods@~1.1.2
    - perf: enable strict mode
  * deps: parseurl@~1.3.1
    - perf: enable strict mode

1.1.3 / 2015-08-02
==================

  * Fix infinite loop condition using `mergeParams: true`
  * Fix inner numeric indices incorrectly altering parent `req.params`
  * deps: array-flatten@1.1.1
    - perf: enable strict mode
  * deps: path-to-regexp@0.1.7
    - Fix regression with escaped round brackets and matching groups

1.1.2 / 2015-07-06
==================

  * Fix hiding platform issues with `decodeURIComponent`
    - Only `URIError`s are a 400
  * Fix using `*` before params in routes
  * Fix using capture groups before params in routes
  * deps: path-to-regexp@0.1.6
  * perf: enable strict mode
  * perf: remove argument reassignments in routing
  * perf: skip attempting to decode zero length string
  * perf: use plain for loops

1.1.1 / 2015-05-25
==================

  * Fix issue where `next('route')` in `router.param` would incorrectly skip values
  * deps: array-flatten@1.1.0
  * deps: debug@~2.2.0
    - deps: ms@0.7.1

1.1.0 / 2015-04-22
==================

  * Use `setprototypeof` instead of `__proto__`
  * deps: debug@~2.1.3
    - Fix high intensity foreground color for bold
    - deps: ms@0.7.0

1.0.0 / 2015-01-13
==================

  * Fix crash from error within `OPTIONS` response handler
  * deps: array-flatten@1.0.2
    - Remove redundant code path

1.0.0-beta.3 / 2015-01-11
=========================

  * Fix duplicate methods appearing in OPTIONS responses
  * Fix OPTIONS responses to include the HEAD method properly
  * Remove support for leading colon in `router.param(name, fn)`
  * Use `array-flatten` for flattening arrays
  * deps: debug@~2.1.1
  * deps: methods@~1.1.1

1.0.0-beta.2 / 2014-11-19
=========================

  * Match routes iteratively to prevent stack overflows

1.0.0-beta.1 / 2014-11-16
=========================

  * Initial release ported from Express 4.x
    - Altered to work without Express
