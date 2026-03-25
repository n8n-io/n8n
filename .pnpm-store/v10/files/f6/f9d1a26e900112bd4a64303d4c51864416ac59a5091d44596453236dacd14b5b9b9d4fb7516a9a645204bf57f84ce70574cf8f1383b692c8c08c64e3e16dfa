# Changelog

## 8.1.0 - 2025-03-17

### Changed

- `Content-Security-Policy` gives a better error when a directive value, like `self`, should be quoted. See [#482](https://github.com/helmetjs/helmet/issues/482)

## 8.0.0 - 2024-09-28

### Changed

- **Breaking:** `Strict-Transport-Security` now has a max-age of 365 days, up from 180
- **Breaking:** `Content-Security-Policy` middleware now throws an error if a directive should have quotes but does not, such as `self` instead of `'self'`. See [#454](https://github.com/helmetjs/helmet/issues/454)
- **Breaking:** `Content-Security-Policy`'s `getDefaultDirectives` now returns a deep copy. This only affects users who were mutating the result
- **Breaking:** `Strict-Transport-Security` now throws an error when "includeSubDomains" option is misspelled. This was previously a warning

### Removed

- **Breaking:** Drop support for Node 16 and 17. Node 18+ is now required

## 7.2.0 - 2024-09-28

### Changed

- `Content-Security-Policy` middleware now warns if a directive should have quotes but does not, such as `self` instead of `'self'`. This will be an error in future versions. See [#454](https://github.com/helmetjs/helmet/issues/454)

## 7.1.0 - 2023-11-07

### Added

- `helmet.crossOriginEmbedderPolicy` now supports the `unsafe-none` directive. See [#477](https://github.com/helmetjs/helmet/pull/447)

## 7.0.0 - 2023-05-06

### Changed

- **Breaking:** `Cross-Origin-Embedder-Policy` middleware is now disabled by default. See [#411](https://github.com/helmetjs/helmet/issues/411)

### Removed

- **Breaking:** Drop support for Node 14 and 15. Node 16+ is now required
- **Breaking:** `Expect-CT` is no longer part of Helmet. If you still need it, you can use the [`expect-ct` package](https://www.npmjs.com/package/expect-ct). See [#378](https://github.com/helmetjs/helmet/issues/378)

## 6.2.0 - 2023-05-06

- Expose header names (e.g., `strictTransportSecurity` for the `Strict-Transport-Security` header, instead of `hsts`)
- Rework documentation

## 6.1.5 - 2023-04-11

### Fixed

- Fixed yet another issue with TypeScript exports. See [#420](https://github.com/helmetjs/helmet/pull/418)

## 6.1.4 - 2023-04-10

### Fixed

- Fix another issue with TypeScript default exports. See [#418](https://github.com/helmetjs/helmet/pull/418)

## 6.1.3 - 2023-04-10

### Fixed

- Fix issue with TypeScript default exports. See [#417](https://github.com/helmetjs/helmet/pull/417)

## 6.1.2 - 2023-04-09

### Fixed

- Retored `main` to package to help with some build tools

## 6.1.1 - 2023-04-08

### Fixed

- Fixed missing package metadata

## 6.1.0 - 2023-04-08

### Changed

- Improve support for various TypeScript setups, including "nodenext". See [#405](https://github.com/helmetjs/helmet/pull/405)

## 6.0.1 - 2022-11-29

### Fixed

- `crossOriginEmbedderPolicy` did not accept options at the top level. See [#390](https://github.com/helmetjs/helmet/issues/390)

## 6.0.0 - 2022-08-26

### Changed

- **Breaking:** `helmet.contentSecurityPolicy` no longer sets `block-all-mixed-content` directive by default
- **Breaking:** `helmet.expectCt` is no longer set by default. It can, however, be explicitly enabled. It will be removed in Helmet 7. See [#310](https://github.com/helmetjs/helmet/issues/310)
- **Breaking:** Increase TypeScript strictness around some arguments. Only affects TypeScript users, and may not require any code changes. See [#369](https://github.com/helmetjs/helmet/issues/369)
- `helmet.frameguard` no longer offers a specific error when trying to use `ALLOW-FROM`; it just says that it is unsupported. Only the error message has changed

### Removed

- **Breaking:** Dropped support for Node 12 and 13. Node 14+ is now required

## 5.1.1 - 2022-07-23

### Changed

- Fix TypeScript bug with some TypeScript configurations. See [#375](https://github.com/helmetjs/helmet/pull/375) and [#359](https://github.com/helmetjs/helmet/issues/359)

## 5.1.0 - 2022-05-17

### Added

- `Cross-Origin-Embedder-Policy`: support `credentialless` policy. See [#365](https://github.com/helmetjs/helmet/pull/365)
- Documented how to set both `Content-Security-Policy` and `Content-Security-Policy-Report-Only`

### Changed

- Cleaned up some documentation around `Origin-Agent-Cluster`

## 5.0.2 - 2022-01-22

### Changed

- Improve imports for CommonJS and ECMAScript modules. See [#345](https://github.com/helmetjs/helmet/pull/345)
- Fixed some documentation

## 5.0.1 - 2022-01-03

### Changed

- Fixed some documentation

### Removed

- Removed some unused internal code

## 5.0.0 - 2022-01-02

### Added

- ECMAScript module imports (i.e., `import helmet from "helmet"` and `import { frameguard } from "helmet"`). See [#320](https://github.com/helmetjs/helmet/issues/320)

### Changed

- **Breaking:** `helmet.contentSecurityPolicy`: `useDefaults` option now defaults to `true`
- **Breaking:** `helmet.contentSecurityPolicy`: `form-action` directive is now set to `'self'` by default
- **Breaking:** `helmet.crossOriginEmbedderPolicy` is enabled by default
- **Breaking:** `helmet.crossOriginOpenerPolicy` is enabled by default
- **Breaking:** `helmet.crossOriginResourcePolicy` is enabled by default
- **Breaking:** `helmet.originAgentCluster` is enabled by default
- `helmet.frameguard`: add TypeScript editor autocomplete. See [#322](https://github.com/helmetjs/helmet/pull/322)
- Top-level `helmet()` function is slightly faster

### Removed

- **Breaking:** Drop support for Node 10 and 11. Node 12+ is now required

## 4.6.0 - 2021-05-01

### Added

- `helmet.contentSecurityPolicy`: the `useDefaults` option, defaulting to `false`, lets you selectively override defaults more easily
- Explicitly define TypeScript types in `package.json`. See [#303](https://github.com/helmetjs/helmet/pull/303)

## 4.5.0 - 2021-04-17

### Added

- `helmet.crossOriginEmbedderPolicy`: a new middleware for the `Cross-Origin-Embedder-Policy` header, disabled by default
- `helmet.crossOriginOpenerPolicy`: a new middleware for the `Cross-Origin-Opener-Policy` header, disabled by default
- `helmet.crossOriginResourcePolicy`: a new middleware for the `Cross-Origin-Resource-Policy` header, disabled by default

### Changed

- `true` enables a middleware with default options. Previously, this would fail with an error if the middleware was already enabled by default.
- Log a warning when passing options to `originAgentCluster` at the top level

### Fixed

- Incorrect documentation

## 4.4.1 - 2021-01-18

### Changed

- Shrink the published package by about 2.5 kB

## 4.4.0 - 2021-01-17

### Added

- `helmet.originAgentCluster`: a new middleware for the `Origin-Agent-Cluster` header, disabled by default

## 4.3.1 - 2020-12-27

### Fixed

- `helmet.contentSecurityPolicy`: broken TypeScript types. See [#283](https://github.com/helmetjs/helmet/issues/283)

## 4.3.0 - 2020-12-27

### Added

- `helmet.contentSecurityPolicy`: setting the `default-src` to `helmet.contentSecurityPolicy.dangerouslyDisableDefaultSrc` disables it

### Changed

- `helmet.frameguard`: slightly improved error messages for non-strings

## 4.2.0 - 2020-11-01

### Added

- `helmet.contentSecurityPolicy`: get the default directives with `contentSecurityPolicy.getDefaultDirectives()`

### Changed

- `helmet()` now supports objects that don't have `Object.prototype` in their chain, such as `Object.create(null)`, as options
- `helmet.expectCt`: `max-age` is now first. See [#264](https://github.com/helmetjs/helmet/pull/264)

## 4.1.1 - 2020-09-10

### Changed

- Fixed a few errors in the README

## 4.1.0 - 2020-08-15

### Added

- `helmet.contentSecurityPolicy`:
  - Directive values can now include functions, as they could in Helmet 3. See [#243](https://github.com/helmetjs/helmet/issues/243)

### Changed

- Helmet should now play more nicely with TypeScript

### Removed

- The `HelmetOptions` interface is no longer exported. This only affects TypeScript users. If you need the functionality back, see [this comment](https://github.com/helmetjs/helmet/issues/235#issuecomment-674016883)

## 4.0.0 - 2020-08-02

See the [Helmet 4 upgrade guide](https://github.com/helmetjs/helmet/wiki/Helmet-4-upgrade-guide) for help upgrading from Helmet 3.

### Added

- `helmet.contentSecurityPolicy`:
  - If no `default-src` directive is supplied, an error is thrown
  - Directive lists can be any iterable, not just arrays

### Changed

- This package no longer has dependencies. This should have no effect on end users, other than speeding up installation time.
- `helmet.contentSecurityPolicy`:
  - There is now a default set of directives if none are supplied
  - Duplicate keys now throw an error. See [helmetjs/csp#73](https://github.com/helmetjs/csp/issues/73)
  - This middleware is more lenient, allowing more directive names or values
- `helmet.xssFilter` now disables the buggy XSS filter by default. See [#230](https://github.com/helmetjs/helmet/issues/230)

### Removed

- Dropped support for old Node versions. Node 10+ is now required
- `helmet.featurePolicy`. If you still need it, use the `feature-policy` package on npm.
- `helmet.hpkp`. If you still need it, use the `hpkp` package on npm.
- `helmet.noCache`. If you still need it, use the `nocache` package on npm.
- `helmet.contentSecurityPolicy`:
  - Removed browser sniffing (including the `browserSniff` and `disableAndroid` parameters). See [helmetjs/csp#97](https://github.com/helmetjs/csp/issues/97)
  - Removed conditional support. This includes directive functions and support for a function as the `reportOnly`. [Read this if you need help.](https://github.com/helmetjs/helmet/wiki/Conditionally-using-middleware)
  - Removed a lot of checks—you should be checking your CSP with a different tool
  - Removed support for legacy headers (and therefore the `setAllHeaders` parameter). [Read this if you need help.](https://github.com/helmetjs/helmet/wiki/Setting-legacy-Content-Security-Policy-headers-in-Helmet-4)
  - Removed the `loose` option
  - Removed support for functions as directive values. You must supply an iterable of strings
- `helmet.frameguard`:
  - Dropped support for the `ALLOW-FROM` action. [Read more here.](https://github.com/helmetjs/helmet/wiki/How-to-use-X%E2%80%93Frame%E2%80%93Options's-%60ALLOW%E2%80%93FROM%60-directive)
- `helmet.hidePoweredBy` no longer accepts arguments. See [this article](https://github.com/helmetjs/helmet/wiki/How-to-set-a-custom-X%E2%80%93Powered%E2%80%93By-header) to see how to replicate the removed behavior. See [#224](https://github.com/helmetjs/helmet/issues/224).
- `helmet.hsts`:
  - Dropped support for `includeSubdomains` with a lowercase D. See [#231](https://github.com/helmetjs/helmet/issues/231)
  - Dropped support for `setIf`. [Read this if you need help.](https://github.com/helmetjs/helmet/wiki/Conditionally-using-middleware) See [#232](https://github.com/helmetjs/helmet/issues/232)
- `helmet.xssFilter` no longer accepts options. Read ["How to disable blocking with X-XSS-Protection"](https://github.com/helmetjs/helmet/wiki/How-to-disable-blocking-with-X%E2%80%93XSS%E2%80%93Protection) and ["How to enable the `report` directive with X-XSS-Protection"](https://github.com/helmetjs/helmet/wiki/How-to-enable-the-%60report%60-directive-with-X%E2%80%93XSS%E2%80%93Protection) if you need the legacy behavior.

## 3.23.3 - 2020-06-26

### Changed

- `helmet.expectCt` is no longer a separate package. This should have no effect on end users.
- `helmet.frameguard` is no longer a separate package. This should have no effect on end users.

## 3.23.2 - 2020-06-23

### Changed

- `helmet.dnsPrefetchControl` is no longer a separate package. This should have no effect on end users.

## 3.23.1 - 2020-06-16

### Changed

- `helmet.ieNoOpen` is no longer a separate package. This should have no effect on end users.

## 3.23.0 - 2020-06-12

### Deprecated

- `helmet.featurePolicy` is deprecated. Use the `feature-policy` module instead.

## 3.22.1 - 2020-06-10

### Changed

- Rewrote internals in TypeScript. This should have no effect on end users.

## 3.22.0 - 2020-03-24

### Changed

- Updated `helmet-csp` to v2.10.0
  - Add support for the `allow-downloads` sandbox directive. See [helmet-csp#103](https://github.com/helmetjs/csp/pull/103)

### Deprecated

- `helmet.noCache` is deprecated. Use the `nocache` module instead. See [#215](https://github.com/helmetjs/helmet/issues/215)

## 3.21.3 - 2020-02-24

### Changed

- Updated `helmet-csp` to v2.9.5
  - Updated `bowser` subdependency from 2.7.0 to 2.9.0
  - Fixed an issue some people were having when importing the `bowser` subdependency. See [helmet-csp#96](https://github.com/helmetjs/csp/issues/96) and [#101](https://github.com/helmetjs/csp/pull/101)

## 3.21.2 - 2019-10-21

### Changed

- Updated `helmet-csp` to v2.9.4
  - Updated `bowser` subdependency from 2.6.1 to 2.7.0. See [helmet-csp#94](https://github.com/helmetjs/csp/pull/94)

## 3.21.1 - 2019-09-20

### Fixed

- Updated `helmet-csp` to v2.9.2
  - Fixed a bug where a request from Firefox 4 could delete `default-src` from future responses
  - Fixed tablet PC detection by updating `bowser` subdependency to latest version

## 3.21.0 - 2019-09-04

### Added

- Updated `x-xss-protection` to v1.3.0
  - Added `mode: null` to disable `mode=block`

### Changed

- Updated `helmet-csp` to v2.9.1
  - Updated `bowser` subdependency from 2.5.3 to 2.5.4. See [helmet-csp#88](https://github.com/helmetjs/csp/pull/88)

## 3.20.1 - 2019-08-28

### Changed

- Updated `helmet-csp` to v2.9.0

## 3.20.0 - 2019-07-24

### Changed

- Updated `helmet-csp` to v2.8.0

## 3.19.0 - 2019-07-17

### Changed

- Updated `dns-prefetch-control` to v0.2.0
- Updated `dont-sniff-mimetype` to v1.1.0
- Updated `helmet-crossdomain` to v0.4.0
- Updated `hide-powered-by` to v1.1.0
- Updated `x-xss-protection` to v1.2.0

## 3.18.0 - 2019-05-05

### Added

- `featurePolicy` has 19 new features: `ambientLightSensor`, `documentDomain`, `documentWrite`, `encryptedMedia`, `fontDisplayLateSwap`, `layoutAnimations`, `legacyImageFormats`, `loadingFrameDefaultEager`, `oversizedImages`, `pictureInPicture`, `serial`, `syncScript`, `unoptimizedImages`, `unoptimizedLosslessImages`, `unoptimizedLossyImages`, `unsizedMedia`, `verticalScroll`, `wakeLock`, and `xr`

### Changed

- Updated `expect-ct` to v0.2.0
- Updated `feature-policy` to v0.3.0
- Updated `frameguard` to v3.1.0
- Updated `nocache` to v2.1.0

## 3.17.0 - 2019-05-03

### Added

- `referrerPolicy` now supports multiple values

### Changed

- Updated `referrerPolicy` to v1.2.0

## 3.16.0 - 2019-03-10

### Added

- Add email to `bugs` field in `package.json`

### Changed

- Updated `hsts` to v2.2.0
- Updated `ienoopen` to v1.1.0
- Changelog is now in the [Keep A Changelog](https://keepachangelog.com/) format
- Dropped support for Node <4. See [the commit](https://github.com/helmetjs/helmet/commit/a49cec3ca58cce484d2d05e1f908549caa92ed03) for more information
- Updated Adam Baldwin's contact information

### Deprecated

- `helmet.hsts`'s `setIf` option has been deprecated and will be removed in `hsts@3`. See [helmetjs/hsts#22](https://github.com/helmetjs/hsts/issues/22) for more

* The `includeSubdomains` option (with a lowercase `d`) has been deprecated and will be removed in `hsts@3`. Use the uppercase-D `includeSubDomains` option instead. See [helmetjs/hsts#21](https://github.com/helmetjs/hsts/issues/21) for more

## 3.15.1 - 2019-02-10

### Deprecated

- The `hpkp` middleware has been deprecated. If you still need to use this module, install the standalone `hpkp` module from npm. See [#180](https://github.com/helmetjs/helmet/issues/180) for more.

## 3.15.0 - 2018-11-07

### Added

- `helmet.featurePolicy` now supports four new features

## 3.14.0 - 2018-10-09

### Added

- `helmet.featurePolicy` middleware

## 3.13.0 - 2018-07-22

### Added

- `helmet.permittedCrossDomainPolicies` middleware

## 3.12.2 - 2018-07-20

### Fixed

- Removed `lodash.reduce` dependency from `csp`

## 3.12.1 - 2018-05-16

### Fixed

- `expectCt` should use comma instead of semicolon as delimiter

## 3.12.0 - 2018-03-02

### Added

- `xssFilter` now supports `reportUri` option

## 3.11.0 - 2018-02-09

### Added

- Main Helmet middleware is now named to help with debugging

## 3.10.0 - 2018-01-23

### Added

- `csp` now supports `prefix-src` directive

### Fixed

- `csp` no longer loads JSON files internally, helping some module bundlers
- `false` should be able to disable a CSP directive

## 3.9.0 - 2017-10-13

### Added

- `csp` now supports `strict-dynamic` value
- `csp` now supports `require-sri-for` directive

### Changed

- Removed `connect` dependency

## 3.8.2 - 2017-09-27

### Changed

- Updated `connect` dependency to latest

## 3.8.1 - 2017-07-28

### Fixed

- `csp` does not automatically set `report-to` when setting `report-uri`

## 3.8.0 - 2017-07-21

### Changed

- `hsts` no longer cares whether it's HTTPS and always sets the header

## 3.7.0 - 2017-07-21

### Added

- `csp` now supports `report-to` directive

### Changed

- Throw an error when used incorrectly
- Add a few documentation files to `npmignore`

## 3.6.1 - 2017-05-21

### Changed

- Bump `connect` version

## 3.6.0 - 2017-05-04

### Added

- `expectCt` middleware for setting the `Expect-CT` header

## 3.5.0 - 2017-03-06

### Added

- `csp` now supports the `worker-src` directive

## 3.4.1 - 2017-02-24

### Changed

- Bump `connect` version

## 3.4.0 - 2017-01-13

### Added

- `csp` now supports more `sandbox` directives

## 3.3.0 - 2016-12-31

### Added

- `referrerPolicy` allows `strict-origin` and `strict-origin-when-cross-origin` directives

### Changed

- Bump `connect` version

## 3.2.0 - 2016-12-22

### Added

- `csp` now allows `manifest-src` directive

## 3.1.0 - 2016-11-03

### Added

- `csp` now allows `frame-src` directive

## 3.0.0 - 2016-10-28

### Changed

- `csp` will check your directives for common mistakes and throw errors if it finds them. This can be disabled with `loose: true`.
- Empty arrays are no longer allowed in `csp`. For source lists (like `script-src` or `object-src`), use the standard `scriptSrc: ["'none'"]`. The `sandbox` directive can be `sandbox: true` to block everything.
- `false` can disable a CSP directive. For example, `scriptSrc: false` is the same as not specifying it.
- In CSP, `reportOnly: true` no longer requires a `report-uri` to be set.
- `hsts`'s `maxAge` now defaults to 180 days (instead of 1 day)
- `hsts`'s `maxAge` parameter is seconds, not milliseconds
- `hsts` includes subdomains by default
- `domain` parameter in `frameguard` cannot be empty

### Removed

- `noEtag` option no longer present in `noCache`
- iOS Chrome `connect-src` workaround in CSP module

## 2.3.0 - 2016-09-30

### Added

- `hpkp` middleware now supports the `includeSubDomains` property with a capital D

### Fixed

- `hpkp` was setting `includeSubdomains` instead of `includeSubDomains`

## 2.2.0 - 2016-09-16

### Added

- `referrerPolicy` middleware

## 2.1.3 - 2016-09-07

### Changed

- Top-level aliases (like `helmet.xssFilter`) are no longer dynamically required

## 2.1.2 - 2016-07-27

### Deprecated

- `nocache`'s `noEtag` option is now deprecated

### Fixed

- `csp` now better handles Firefox on mobile

## 2.1.1 - 2016-06-10

### Changed

- Remove several dependencies from `helmet-csp`

### Fixed

- `frameguard` had a documentation error about its default value
- `frameguard` docs in main Helmet readme said `frameguard`, not `helmet.frameguard`

## 2.1.0 - 2016-05-18

### Added

- `csp` lets you dynamically set `reportOnly`

## 2.0.0 - 2016-04-29

### Added

- Pass configuration to enable/disable default middlewares

### Changed

- `dnsPrefetchControl` middleware is now enabled by default

### Removed

- No more module aliases. There is now just one way to include each middleware
- `frameguard` can no longer be initialized with strings; you must use an object

### Fixed

- Make `hpkp` lowercase in documentation
- Update `hpkp` spec URL in readmes
- Update `frameguard` header name in readme

## 1.3.0 - 2016-03-01

### Added

- `hpkp` has a `setIf` option to conditionally set the header

## 1.2.0 - 2016-02-29

### Added

- `csp` now has a `browserSniff` option to disable all user-agent sniffing

### Changed

- `frameguard` can now be initialized with options
- Add `npmignore` file to speed up installs slightly

## 1.1.0 - 2016-01-12

### Added

- Code of conduct
- `dnsPrefetchControl` middleware

### Fixed

- `csp` readme had syntax errors

## 1.0.2 - 2016-01-08

### Fixed

- `csp` wouldn't recognize `IE Mobile` browsers
- `csp` had some errors in its readme
- Main readme had a syntax error

## 1.0.1 - 2015-12-19

### Fixed

- `csp` with no User Agent would cause errors

## 1.0.0 - 2015-12-18

### Added

- `csp` module supports dynamically-generated values

### Changed

- `csp` directives are now under the `directives` key
- `hpkp`'s `Report-Only` header is now opt-in, not opt-out
- Tweak readmes of every sub-repo

### Removed

- `crossdomain` middleware
- `csp` no longer throws errors when some directives aren't quoted (`'self'`, for example)
- `maxage` option in the `hpkp` middleware
- `safari5` option from `csp` module

### Fixed

- Old Firefox Content-Security-Policy behavior for `unsafe-inline` and `unsafe-eval`
- Dynamic `csp` policies is no longer recursive

## 0.15.0 - 2015-11-26

### Changed

- `hpkp` allows a `report-uri` without the `Report-Only` header

## 0.14.0 - 2015-11-01

### Added

- `nocache` now sends the `Surrogate-Control` header

### Changed

- `nocache` no longer contains the `private` directive in the `Cache-Control` header

## 0.13.0 - 2015-10-23

### Added

- `xssFilter` now has a function name
- Added new CSP docs to readme

### Changed

- HSTS option renamed from `includeSubdomains` to `includeSubDomains`

## 0.11.0 - 2015-09-18

### Added

- `csp` now supports Microsoft Edge
- CSP Level 2 support

### Changed

- Updated `connect` to 3.4.0
- Updated `depd` to 1.1.0

### Fixed

- Added `license` key to `csp`'s `package.json`
- Empty `csp` directives now support every directive, not just `sandbox`

## 0.10.0 - 2015-07-08

### Added

- Add "Handling CSP violations" to `csp` readme
- Add license to `package.json`

### Changed

- `hpkp` had a link to the wrong place in its readme
- `hpkp` requires 2 or more pins

### Fixed

- `hpkp` might have miscalculated `maxAge` slightly wrong

## 0.9.0 - 2015-04-24

### Changed

- `nocache` adds `private` to its `Cache-Control` directive
- Added a description to `package.json`

## 0.8.0 - 2015-04-21

### Changed

- Removed hefty Lodash dependency from HSTS and CSP
- Updated string detection module in Frameguard
- Changed readme slightly to better reflect project's focus

### Deprecated

- Deprecated `crossdomain` middleware

### Removed

- `crossdomain` is no longer a default middleware

## 0.7.1 - 2015-03-23

### Changed

- Updated all outdated dependencies (insofar as possible)
- HSTS now uses Lodash like all the rest of the libraries

## 0.7.0 - 2015-03-05

### Added

- `hpkp` middleware

### Changed

- Travis CI should test 0.10 and 0.12
- Minor code cleanup

## 0.6.2 - 2015-03-01

### Changed

- Improved `xssFilter` performance
- Updated Lodash versions

## 0.6.1 - 2015-02-13

### Added

- "Other recommended modules" in README

### Changed

- Updated Lodash version

### Fixed

- `frameguard` middleware exported a function called `xframe`

## 0.6.0 - 2015-01-21

### Added

- You can disable `csp` for Android

### Fixed

- `csp` on Chrome Mobile on Android and iOS

## 0.5.4 - 2014-12-21

### Changed

- `nocache` should force revalidation

## 0.5.3 - 2014-12-08

### Changed

- `platform` version in CSP and X-XSS-Protection

### Fixed

- Updated bad wording in frameguard docs

## 0.5.2 - 2014-11-16

### Changed

- Updated Connect version

### Fixed

- Fixed minor `csp` bugfixes

## 0.5.1 - 2014-11-09

### Changed

- Updated URLs in `package.json` for new URL

### Fixed

- CSP would set all headers forever after receiving an unknown user agent

## 0.5.0 - 2014-10-28

### Added

- Most middlewares have some aliases now

### Changed

- `xframe` now called `frameguard` (though `xframe` still works)
- `frameguard` chooses sameorigin by default
- `frameguard` understands "SAME-ORIGIN" in addition to "SAMEORIGIN"
- `nocache` removed from default middleware stack
- Middleware split out into their own modules
- Documentation
- Updated supported Node version to at least 0.10.0
- Bumped Connect version

### Removed

- Deprecation warnings

### Fixed

- Readme link was broken

## 0.4.2 - 2014-10-16

### Added

- Support preload in HSTS header

## 0.4.1 - 2014-08-24

### Added

- Use [helmet-crossdomain](https://github.com/helmetjs/crossdomain) to test the waters
- 2 spaces instead of 4 throughout the code

## 0.4.0 - 2014-07-17

### Added

- `nocache` now sets the Expires and Pragma headers
- `nocache` now allows you to crush ETags

### Changed

- Improved the docs for nosniff
- Reverted HSTS behavior of requiring a specified max-age

### Fixed

- Allow HSTS to have a max-age of 0

## 0.3.2 - 2014-06-30

### Added

- All middleware functions are named
- Throw error with non-positive HSTS max-age

### Changed

- Added semicolons in README
- Make some Errors more specific

### Removed

- Removed all comment headers; refer to the readme

### Fixed

- `helmet()` was having issues
- Fixed Syntax errors in README

This changelog was created after the release of 0.3.1.
