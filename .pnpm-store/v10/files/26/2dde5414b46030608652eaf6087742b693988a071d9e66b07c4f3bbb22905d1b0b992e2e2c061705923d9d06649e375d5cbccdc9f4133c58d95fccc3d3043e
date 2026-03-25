1.4.7 / 2024-10-08
==========

  * deps: cookie@0.7.2
    - Fix object assignment of `hasOwnProperty`
  * deps: cookie@0.7.1
    - Allow leading dot for domain
      - Although not permitted in the spec, some users expect this to work and user agents ignore the leading dot according to spec
    - Add fast path for `serialize` without options, use `obj.hasOwnProperty` when parsing
  * deps: cookie@0.7.0
    - perf: parse cookies ~10% faster
    - fix: narrow the validation of cookies to match RFC6265
    - fix: add `main` to `package.json` for rspack
  * deps: cookie@0.6.0
    - Add `partitioned` option
  * deps: cookie@0.5.0
    - Add `priority` option
    - Fix `expires` option to reject invalid dates
    - pref: improve default decode speed
    - pref: remove slow string split in parse
  * deps: cookie@0.4.2
    - pref: read value only when assigning in parse
    - pref: remove unnecessary regexp in parse

1.4.6 / 2021-11-16
==================

  * deps: cookie@0.4.1

1.4.5 / 2020-03-14
==================

  * deps: cookie@0.4.0

1.4.4 / 2019-02-12
==================

  * perf: normalize `secret` argument only once

1.4.3 / 2016-05-26
==================

  * deps: cookie@0.3.1
    - perf: use for loop in parse

1.4.2 / 2016-05-20
==================

  * deps: cookie@0.2.4
    - perf: enable strict mode
    - perf: use for loop in parse
    - perf: use string concatenation for serialization

1.4.1 / 2016-01-11
==================

  * deps: cookie@0.2.3
  * perf: enable strict mode

1.4.0 / 2015-09-18
==================

  * Accept array of secrets in addition to a single secret
  * Fix `JSONCookie` to return `undefined` for non-string arguments
  * Fix `signedCookie` to return `undefined` for non-string arguments
  * deps: cookie@0.2.2

1.3.5 / 2015-05-19
==================

  * deps: cookie@0.1.3
    - Slight optimizations

1.3.4 / 2015-02-15
==================

  * deps: cookie-signature@1.0.6

1.3.3 / 2014-09-05
==================

  * deps: cookie-signature@1.0.5

1.3.2 / 2014-06-26
==================

  * deps: cookie-signature@1.0.4
    - fix for timing attacks

1.3.1 / 2014-06-17
==================

  * actually export `signedCookie`

1.3.0 / 2014-06-17
==================

  * add `signedCookie` export for single cookie unsigning

1.2.0 / 2014-06-17
==================

  * export parsing functions
  * `req.cookies` and `req.signedCookies` are now plain objects
  * slightly faster parsing of many cookies

1.1.0 / 2014-05-12
==================

  * Support for NodeJS version 0.8
  * deps: cookie@0.1.2
    - Fix for maxAge == 0
    - made compat with expires field
    - tweak maxAge NaN error message

1.0.1 / 2014-02-20
==================

  * add missing dependencies

1.0.0 / 2014-02-15
==================

  * Genesis from `connect`
