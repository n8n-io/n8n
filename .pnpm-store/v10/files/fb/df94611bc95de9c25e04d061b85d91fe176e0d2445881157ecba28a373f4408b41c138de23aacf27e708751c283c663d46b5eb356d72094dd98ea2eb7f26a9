# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## 2.0.12 - 2020-10-27

### Fixed

* Remove `.DS_Store` from published package
* Upgrade `connect` dev dependency

## 2.0.11 - 2019-08-10

### Fixed

* License metadata in `package.json` now in standard SPDX format

## 2.0.10 - 2018-04-18

### Fixed

* Guard `global` usage in scope to avoid reference errors

## 2.0.9 - 2018-04-17

### Fixed

* Guard `self` usage in scope to avoid Webpack reference errors

## 2.0.8 - 2018-04-17

### Fixed

* Worker support now explicitly references `self` and `window` rather then using
  `this` implicitly to fix issues in Webpack builds.

## 2.0.7 - 2018-04-16

### Fixed

* Support `setTimeout` / `setInterval` in workers

## 2.0.6 - 2018-01-24

### Fixed

* Use `typeof` to search globals more carefully.

## 2.0.5 - 2018-01-23

### Fixed

* Try harder to retrieve `setImmediate` and `clearImmediate` in esoteric
  environments.

## 2.0.4 - 2017-08-14

### Fixed

* Revert `setImmediate` and `clearImmediate` changes from 2.0.3 because they
  appear to break Webpack.

## 2.0.3 - 2017-07-31

### Fixed

* `setImmediate` and `clearImmediate` are indirected through the `global` module
  for better coverage of esoteric environments.

## 2.0.2 - 2016-10-19

### Added

* `.npmignore` now excludes example scripts, reducing package size

## 2.0.1 - 2016-06-21

### Fixed
* `clearTimeout` and `clearInterval` no longer throws when passed null or
  undefined instead of the timeout token.

## 2.0.0 - 2016-03-28

### Changed
* `setImmediate` and `clearImmediate` now use the `setimmediate` module which
  has better cross-browser coverage.  In particular, it resolves a crash in
  Safari.  The `setimmediate` module adds these methods to the global
  immediately, so a major version bump seems safest.

## 1.4.2 - 2015-12-08

### Added
* Metadata used by `jspm` in `package.json`

## 1.4.1 - 2015-05-10

### Changed
* Update `process` dependency

## 1.4.0 - 2015-02-23

### Added
* Link to `timers-browserify-full`, which offers a larger, but much more exact,
  version of Node's `timers` library

### Changed
* `setTimeout` and `setInterval` return objects with the same API as the Node
  implementation, instead of just IDs

### Fixed
* `active` implementation actually has an effect, as in Node
* Replaced usages of `apply` that break in IE 8

## 1.3.0 - 2015-02-04

### Changed
* Prefer native versions of `setImmediate` and `clearImmediate` if they exist

## 1.2.0 - 2015-01-02

### Changed
* Update `process` dependency

## 1.1.0 - 2014-08-26

### Added
* `clearImmediate` available to undo `setImmediate`

## 1.0.3 - 2014-06-30

### Fixed
* Resume returning opaque IDs from `setTimeout` and `setInterval`

## 1.0.2 - 2014-06-30

### Fixed
* Pass `window` explicitly to `setTimeout` and others to resolve an error in
  Chrome

## 1.0.1 - 2013-12-28

### Changed
* Replaced `setimmediate` dependency with `process` for the `nextTick` shim

## 1.0.0 - 2013-12-10

### Added
* Guard against undefined globals like `setTimeout` in some environments

## 0.0.0 - 2012-05-30

### Added
* Basic functionality for initial release
