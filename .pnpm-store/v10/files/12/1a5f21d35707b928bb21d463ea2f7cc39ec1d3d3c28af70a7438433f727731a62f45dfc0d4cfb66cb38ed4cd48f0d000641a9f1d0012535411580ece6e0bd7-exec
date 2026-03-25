# 13.2.3 / 2018-07-30

* `.only.keys` throws when no `Object.prototype.should`

# 13.2.2 / 2018-07-26

* Updates for TS definition

# 13.2.1 / 2018-01-12

* Fix `.size` to work with should/as-function

# 13.2.0 / 2017-12-27

* Update type adaptors to allow to use Set as iterable everywhere

# 13.1.3 / 2017-10-28

* Fix weird bug in `.containDeep` when given object is string (see \#157)

# 13.1.2 / 2017-10-10

* Revert default export in TS definition (added in 13.1.0)

# 13.1.1 / 2017-10-07

* Added missing return type for `.rejectedWith` in typescript definition

# 13.1.0 / 2017-09-20

* Added `.resolved` as alias to `.fulfilled`
* Added `.resolvedWith` as alias to `.fulfilledWith`
* All zero argument assertion will throw `TypeError` if any arg passed
* Fix default export for TS definition

# 13.0.1 / 2017-09-06

* Add missing UMD bundle for browser

# 13.0.0 / 2017-09-05

* Removed `.enumerable` and `.enumerables`
* Fixed `.match`ing on `Date`s
* Added TypeScript definitions

# 12.0.0 / 2017-08-28

* Update `should-equal` to 2.x
* Update entry points to do the same thing (global should entry)

# 11.2.1 / 2017-03-09

* Fix `.match(regex)` for not supported cases

# 11.2.0 / 2017-01-27

* Added `.only` modifier for `.keys` to check also size
* Soft deprecate `.enumerable(s)`

# 11.1.2 / 2016-12-10

* Added workaround for runtimes where error's stack populated eagerly

# 11.1.1 / 2016-10-10

* Update modules

# 11.1.0 / 2016-08-14

* Update modules

# 11.0.0 / 2016-08-10

* Extracted parts from code for traversing different data types in similar ways.
  This allows for easily extending the library to almost any collection class.
  Now should.js supports `Set`/`Map`/`WeakSet`/`WeakMap` everywhere.
* `.empty()` now uses new type adaptors
* Breaking change in `.keys()`/`.key()`: now only checks for passed keys (also uses type adaptors) - it can check for keys in `Map`/`Set` e.g
* Added `.value(key, value)` to assert if key-value object has such `value` with this `key`
* Added `.size()` to get size of collection; also works with type adaptors
* `.containEql` uses type adaptors and can check something contained within a collection or sub-part of a key-value object

# 10.0.0 / 2016-07-18

* Possible breaking change/bugfix in should-format when in objects used keys that looks like a numbers

# 9.0.2 / 2016-06-10

* Small test fixes for function expressions without names in Chrome

# 9.0.1 / 2016-06-09

* Fix browser global export

# 9.0.0 / 2016-05-30

* Set should.config values to be more obvious. Pls check breaking changes page for exact values.
* Add support for SIMD data types.
* Fixed minor bugs in .eql
* Allow to show all equality check fails in .eql

# 8.4.0 / 2016-05-21

* Add support for Symbols in .eql

# 8.3.2 / 2016-05-18

* Fix for `should-equal` to do not call .toString when checking circular usage

# 8.3.1 / 2016-04-15

* Fix browser script to again be UMD bundle

# 8.3.0 / 2016-03-23

* .true() and .false() can accept optional message to be used in assertion Error
* Add more useful messages to promise assertions

# 8.2.2 / 2016-02-09

* Fix bug with .match when called primitive to match object
* Various linting issues

# 8.2.1 / 2016-01-27

* Fix bug with new option, thanks @VinGarcia

# 8.2.0 / 2016-01-24

* Add option to should.equal to treat -0 and +0 as equals

# 8.1.1 / 2016-01-10

* Fix browser build to do not loose window.Should

# 8.1.0 / 2016-01-10

* Add .Date() assertion to test if given object is Date instance

# 8.0.2 / 2015-12-18

* Update should-format to fix bug in formatting arrow functions

# 8.0.1 / 2015-12-11

* Fix throwing TypeError in .match

# 8.0.0 / 2015-12-08

* Move should-promised to main repo
* Expose window.should as should function and not a getter

# 7.1.1 / 2015-10-20

* Update format package to fix node 0.12 Symbol formatting

# 7.1.0 / 2015-08-28

* Added .aboveOrEqual and .belowOrEqual for numbers (<= and >=)
* Added .oneOf and .equalOneOf to check equality of one of values
* Added 'browser' field to package.json

# 7.0.4 / 2015-08-14

* Missing doc for .deepEqual
* Fix .match and dependent assertions to check property in object-object matching

# 7.0.3 / 2015-08-09

* Add alias .deepEqual for .eql

# 7.0.2 / 2015-07-09

* Bug in browser script and build

# 7.0.1 / 2015-06-18

* Fixes in should-type for dom nodes, host object and promises

# 7.0.0 / 2015-06-18

* Added support to `.eql` es6 set, map and symbol (`should-type`, `should-format`, `should-equal`)
* **Breaking Change** More accurate work with types (dom nodes, typed-arrays).
* **Breaking Change** Change result of should-type to be more accurate and consistent.
* Fixed should-equal options checks
* Fixed should-format typed arrays (more then 8 bits)
* Added aliases: .matchEach => .matchSome, .matchAny => .matchEvery (to be similar to array methods). See #65.
* **Breaking Change (possibly)** .matchEach and .matchAny now uses internally .match. See #65.
* **Breaking Change** No more getter assertions. No all assertions are functions.
* **Breaking Change** No more proxy returning, to check property names.
* **Breaking Change** `should-format` now looks more like chrome developer tools inspections.

# 6.0.3 / 2015-05-18

* Replace rest of usage after 6.0.2

# 6.0.2 / 2015-05-18

* Replace in all internal assertions `should` usage to non getter form

# 6.0.1 / 2015-04-15

* Remove dummy debug messages

# 6.0.0 / 2015-04-15

* From .containDeep\* removed .indexOf checks for strings, now it is just equality checks (see #55)
* Fix for .not.throws for generators

# 5.2.0 / 2015-03-12

* Added `.matchAny`, like `.matchEach` but with `some` semantics

# 5.1.0 / 2015-03-05

* Initial support of es6 generators, iterables, iterators and symbols
* .throwError now support generator functions
* Fix bug in .propertyByPath

# 5.0.1 / 2015-02-21

* Export utils via should.util

# 5.0.0 / 2015-02-10

* Remove old .eql implementation
* Refactor nested errors
* Added separate reporting message for false negative results like 10.should.not.equal(10)
* Make error.message lazy fix old performance bottlenecks for constructing messages for big objects
* Added .propertyWithDescriptor

# 4.6.5 / 2015-02-05

* Fix performance degradation on large objects

# 4.6.4 / 2015-02-05

* Fix end cases for .containDeep and .containDeepOrdered

# 4.6.3 / 2015-02-01

* Added small check for .noConflict
* Fix end cases for .containDeep and .containDeepOrdered

# 4.6.2 / 2015-01-28

* Make assertion properties configurable

# 4.6.1 / 2015-01-18

* Bump deps
* Set showDiff only if the same types

# 4.6.0 / 2015-01-13

* Wrap everywhere returned assertion with Proxy if available.

# 4.5.2 / 2015-01-13

* Fixed null properties in .containDeep and .containDeepOrdered

# 4.5.1 / 2015-01-13

* Fixed leaked \_eql

# 4.5.0 / 2015-01-11

* Added config flag .useOldDeepEqual to use old .eql implementation

# 4.4.4 / 2015-01-08

* Added .enumerables

# 4.4.3 / 2015-01-08

* Bump dependencies to get more accurate format of promise
* Added a lot of jsdocs

# 4.4.2 / 2014-12-27

* Remove breaking change with should-equal that check also object prototypes. Instead document how get both behaviours in .eql docs.

# 4.4.1 / 2014-12-13

* bump deps

# 4.4.0 / 2014-12-12

* assert methods reimplemented via assertion, deepEqual done via should-equal. To avoid possible confusion between should.deepEqual and a.should.eql(b)
* Possible fix for error tests

# 4.3.1 / 2014-12-08

* `.throw()` check if given object is a function

# 4.3.0 / 2014-11-10

* Remove node's version of .eql
* Added reason why .eql failed

# 4.2.1 / 2014-11-07

* Move inspection from .formattedObj to be in .getMessage - to make inspection as late as possible.

# 4.2.0 / 2014-11-06

* Remove node util.inspect and use instead own inspection module with type detection and browser types compatibility

# 4.1.0 / 2014-10-19

* As inspect function was moved to repo, refine how it show Dates (added millis via custom format)
* Added warnings for potential shoot in the leg: eql non strict and should unwrapping primitive wrappers
* Added possibility to disable any warnings via environment variable SHOULDJS_WARN and should.warn = false
* Added new deep equality check function
* Nested assertions can contribute to parent assertions own messages

# 4.0.4 / 2014-06-09

* Make all assertions enumerable in Assertion.prototype

# 4.0.3 / 2014-06-09

* Fix wrong/strange behaviour of .containDeep with equal keys. Now it check to contain element once.
* Added util.formatProp to format properties more accurate

# 4.0.1 / 2014-06-04

* Missing name in browser script

# 4.0.0 / 2014-05-29

* Breaking change: Move non core assertions out
* Added casting in properties assertions to String for all property names
* Added .propertyByPath assertion
* Breaking change: Remove deprecated .includeEql and .include
* Breaking change: .containDeep now do not check order for 2 arrays case
* Added .containDeepOrdered for old .containDeep
* Added support of array-like objects
* Added to .throw matching by error properties with .match

# 3.3.2 / 2014-05-23

* Fix for should.format

# 3.3.1 / 2014-04-16

* Added aliases for es reserved words
* Fix bug with ownProperty alias
* Fix bug with not function alias

# 3.3.0 / 2014-04-07

* Added .enumerable(name, val)

# 3.2.0 / 2014-03-29

* Added first version of .any modifier that affect assertions with multiple parameters
* .header now have more nice message
* assertion can now override how to show object

# 3.1.4 / 2014-03-18

* .Error now do not throw assertion error for custom errors.

# 3.1.3 / 2014-02-25

* Fix TypeError in .containEql

# 3.1.2 / 2014-01-28

* Fix for adding .inspect for JQuery object only in case when it is exist

# 3.1.1 / 2014-01-28

* Fix for HTMLElement in DOM less environments

# 3.1.0 / 2014-01-23

* Added jquery based browser extension

# 3.0.1 / 2014-01-17

* Fix: .lengthOf()

# 3.0.0 / 2014-01-17

* Split everything to smaller files
* Added huge extension to .match and .matchEach. Thanks @alsotang for initial code and idea.
* Added .containDeep and .containEql
* Separate build for browser and node.js
* Basic plugin system
* Breaking change: .Object now do not fail on arrays
* Breaking change: Additional messages now replaces generated and do not added
* Breaking change: .keys now check as is - no keys in args means no keys in object
* Deprecated: assert extension
* Deprecated: .include and .includeEql
* Now all assertions define only positive cases, should.js take care about negations and chains

# 2.1.1 / 2013-12-05

* Move date formatting out of should.inspect

# 2.1.0 / 2013-11-11

* Override .inspect for Date's to convert them to ISOString

# 2.0.2 / 2013-10-21

* Add '#of' as getter for chaining.
* Exclude browser script for .npmignore.

# 2.0.1 / 2013-10-10

* Fix wrong path in .npmignore.

# 2.0.0 / 2013-10-10

* breaking change: #a now getter like #an. Was replaced with #type(str)
* breaking change: #empty does not check length for objects. Now it check if object do not have own properties.
* #properties check if object have some properties
* util.inspect now exposed as should.inspect
* assertions for NaN, Infinity, Array, Object, String, Boolean, Number, Error, Function
* #equal got alias #exactly

# 1.3.0 / 2013-09-13

* fix doc for .keys. Closes #108.
* add #endWith()
* add .startWith (#119)

# 1.2.2 / 2013-02-19

* fix should.be.instanceOf() failure on Date

# 1.2.1 / 2012-11-02

* add .showDiff
* Make instanceOf and throwError be aliased like others [alFReD-NSH]
* Fix should[.not].exist not having stack trace #84 [alFReD-NSH]

# 1.2.0 / 2012-09-21

* Added #approximately(value, delta, description) for doing assertions on results of operations with numbers. [titarenko]

# 1.1.1 / 2012-09-19

* add .type for eql()s assert

# 1.1.0 / 2012-07-30

* add enclosing of failure message functions. Closes #81
* add mocha .actual / .expected string support for all assertion values

# 0.7.0 / 2012-07-17

* add `.throw(Constructor)` support [snakamura]

# 0.6.3 / 2012-04-26

* Added object inclusion support back

# 0.6.2 / 2012-04-26

* Added homepage to package.json
* Fixed .equal() with dates. Closes #63

# 0.6.1 / 2012-04-10

* package: add "repository" section [TooTallNate]
* use valueOf() to get the reference the object [TooTallNate]

# 0.6.0 / 2012-03-01

* Added `err.actual` and `err.expected` for .{eql,equal}()
* Added 'return this;' to 'get json' and 'get html' in order to provide chaining for should.be.json and should.be.html

# 0.5.1 / 2012-01-13

* Added better `.json`
* Added better `.html`

# 0.5.0 / 2012-01-12

* Added string matching to `.throw()` [serby]
* Added regexp matching to `.throw()` [serby]
* Added `.includeEql()` [RubenVerborgh]
* Added `.should.be.html`
* Added `.should.be.json`
* Added optional description args to most matchers [Mike Swift]

# 0.4.2 / 2011-12-17

* Fixed .header() for realzzz

# 0.4.1 / 2011-12-16

* Fixed: chain .header() to retain negation

# 0.4.0 / 2011-12-16

* Added `.should.throw()`
* Added `.include()` support for strings
* Added `.include()` support for arrays
* Removed `keys()` `.include` modifier support
* Removed `.object()`
* Removed `.string()`
* Removed `.contain()`
* Removed `.respondTo()` rubyism
* expresso -> mocha

# 0.3.2 / 2011-10-24

* Fixed tests for 0.5.x
* Fixed sys warning

# 0.3.1 / 2011-08-22

* configurable

# 0.3.0 / 2011-08-20

* Added assertion for inclusion of an object: `foo.should.include.object({ foo: 'bar' })`

# 0.2.1 / 2011-05-13

* Fixed .status(code). Closes #18

# 0.2.0 / 2011-04-17

* Added `res.should.have.status(code)` method
* Added `res.should.have.header(field, val)` method

# 0.1.0 / 2011-04-06

* Added `should.exist(obj)` [aseemk]
* Added `should.not.exist(obj)` [aseemk]

# 0.0.4 / 2010-11-24

* Added `.ok` to assert truthfulness
* Added `.arguments`
* Fixed double required bug. [thanks dominictarr]

# 0.0.3 / 2010-11-19

* Added `true` / `false` assertions

# 0.0.2 / 2010-11-19

* Added chaining support

# 0.0.1 / 2010-11-19

* Initial release
