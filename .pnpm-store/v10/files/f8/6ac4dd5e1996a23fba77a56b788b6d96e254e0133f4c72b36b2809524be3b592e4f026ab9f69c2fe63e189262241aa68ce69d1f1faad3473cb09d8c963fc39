Changelog
=========

### Later version 

For later versions check the global [`CHANGELOG.md`](../../CHANGELOG.md) file in the root folder.

### 5.1.0

* [#578](https://github.com/js-joda/js-joda/pull/578) Cleanup typings ([@StrayAlien](https://github.com/StrayAlien))

### 5.0.0

* [#574](https://github.com/js-joda/js-joda/pull/574) Reverting babel targets for UMD ([@pithu](https://github.com/pithu))
* [#548](https://github.com/js-joda/js-joda/pull/548) Disallowing implicit conversion of Temporal/TemporalAmount to numeric values ([@InExtremaRes](https://github.com/InExtremaRes))

### 4.3.0

* [#567](https://github.com/js-joda/js-joda/pull/567) Remove generated distributions files from git ([@pithu](https://github.com/pithu))
* [#564](https://github.com/js-joda/js-joda/pull/564) Fix travis for PR's from forks ([@pithu](https://github.com/pithu))

### 4.2.1

* [#559](https://github.com/js-joda/js-joda/pull/559) Fix references to deprecated single repos ([@pithu](https://github.com/pithu))

### 4.2.0

* Upgrade dependencies #555 by @pithu
* Change @babel/preset-env targets, fix IE11 issues #555 by @pithu
* Improve documentation  #556 by @pithu

### 4.1.0

* Remove edge case handling for Temporal.minus #542 by @pithu
* Improve docu #550 by @pithu

### 4.0.0 

Even this is a major release, there are no real breaking changes.
The release contains typescript definition cleanup and some 
"private" methods have been prefixed with "_". These methods are intended for internal use only.

If you used the threeten API in the intended way, there shouldn't be any breaking changes. 
If you used internal methods before, there is an replacement eg instead of `minusAmountUnit` use `minus`.

* cleanup TS Typings in #456 by @InExtremaRes
* cleanup private methods and Temporal class in #460 by @InExtremaRes
* remove TS definitions from core, moved to locale TS definitions in #389 by @InExtremaRes
* make .equals a type predicate in the TS typings in #457 by @InExtremaRes
* add some ISO formatters in #455 by @akonior
* several dependabot updates

### 3.2.0

* add typescript definitions for OffsetDateTime and OffsetTime #448 by jonfreedman
 
### 3.1.0

* Fix bitwise or #439 by @pithu
* Tests for TS declaration run with ts-node #423 by InExtremaRes
* dependabot Bump elliptic from 6.5.2 to 6.5.3
* dependabot Bump lodash from 4.17.15 to 4.17.19
* dependabot Bump npm-registry-fetch from 4.0.2 to 4.0.5

### 3.0.0

This is a major release because of these following minor/ breaking cleanups:

* Renamed method getDisplayName to displayName for
   * WeekFields 
   * DayOfWeek
   * Month
   * IsoFields
* Removed duplicate function YearMonth.with(number, number)
   * YearMonth.with(year, month), use YearMonth.of() instead
   * YearMonth.withYearMonth(year, month), use YearMonth.of() instead

All updates:

 * Implement OffsetTime and OffsetDateTim #416 by exoego
 * TS types reorganized and documentation added #418 by InExtremaRes
 * Fix isBrowserTest check #419 by pithu
 * Duration#(minus|plus) should accept TemporalUnit, not just ChronoUnit #417 by exoego
 * TS types refactor part 1 #415 by InExtremaRes
 * Remove YearMonth#with that takes (number, number) #412 by InExtremaRes
 * Fixes and cleanups to TemporalFields and TemporalUnits #408 by InExtremaRes
 * Switch to travis-ci.com #409 by pithu
 * Error base name changed to "JsJodaException" and exceptions exposed in TS #407 by InExtremaRes
 * Some fixes to TS declarations #404 by InExtremaRes
 * remove android saucelabs test setup #403 by pithu
 * Fix TS declarations of some TemporalAdjuster implementations (like DayOfWeak) #402 by InExtremaRes
 * Fixed types of DateTimeFormatterBuilder.prototype.toFormatter to allow zero arguments  #388 by InExtremaRes
 * Add missing types for Clock.offset() #387 by InExtremaRes  
 * Added missing nanoAdjustment to Duration.ofSeconds static method #383 by jseter
 * changed bitwise or to logical or #379 by bowersj 
 * Add Typescript for IsoChronology.INSTANCE #373 by cranberyxl 
 * Remove `withTemporalAdjuster` and others non-public methods from TS declaration #363 by InExtremaRes

### 2.0.0

This is a major release because some 'internal' methods were hidden from the typescript definitions
and were renamed in the javascript code. 
Resolve those conflicts by using the 'public shorthand' methods, like instead of using `with*()` use `with(...)`. 

 * Improve of the TS declarations #353 from InExtremaRes
 * Add missing methods to `Temporal` interface #361 from thrucker
 * LocalDateTime.of requires at least 3 arguments #356
 
### 1.12.0

 * Cleanup documentation and configuration
 * Upgrade dependencies
 * Add ISO formatters definitions #358 akonior/iso-formetters
 * Improve TS declarations with no breaking change #357 InExtremaRes/ts-declarations
 * Fixes to docu and LocalDateTime.of() according to the typescript changes #359
 
### 1.11.0
 
 * Added ts defs for new methods in DayOfWeek and Month #301
 * add method params for #appendValue and #appendValueReduced #288 
 * add type definition for ChronoUnit.NANOS #296
 * Add ZoneRulesProvider TypeScript definition #317 
 * Add type definition for Instant.atZone #313 

### 1.10.1

 * implement methods on DayOfWeek and Month #300
 * Adding private constructors and abstract modifiers to TypeScript definitions #298

### 1.9.3

 * fix typescript definitions: add `ZoneId#id()` #265
 * fix typescript definitions: Fix DateTimeFormatter.withLocale() #277
 * Remove unreachable code #278
 * add package-lock for dev dependencies

### 1.9.2

#### public API

 * implement atZone in Instant
 * Add DateTimeParseException to typings file

### 1.9.1

#### dependency updates

 * revert babel to previous version

### 1.9.0

#### public API

 * add OffsetClock and add withZone and equals to other Clock impls

#### bugfixes

 * fix error when parsing dates from string with e.g. WeekOfWeekbasedYear fields
 * fix call to `substring` in generating error message when parsing  

#### dependency updates

### 1.8.2 

#### public API

 * add ESM module to pkg.module build with rollup

#### dev setup

 * Migrate from webpack to rollup

#### etc

 * Remove usage of module.exports
 
#### dependency updates
 
### 1.7.0 1.7.1 1.8.0 1.8.1

 * issues with build artifacts, dont use it.
 
### 1.6.3

#### public API

 * improve typescript definition (see PR #196)
 
#### dependency updates

### etc

 * Remove usage of call on constructors

### 1.6.2

#### public API

 * improve typescript definition (see PR #188)

#### internal API

 * add `DateTimeBuilder` to internal API

#### dependency updates

### 1.6.1

#### dependency updates

#### bugs

 * fix issue #166, bug from upstream project, parse zoned date time during overlap

### 1.6.0

#### public API

 * update API: export all public classes/interfaces
 * add `IsoChronology#date(temporal)` function
 * add export of "internal" APIs needed e.g. for plugins, these should *not* be used by users of the `js-joda` library.
   Since we do not consider these a public APIs, they may change without warning!
   These internal APIs are exported as the `_` object

### 1.5.5

#### bugs

 * fix Period.ofDays() if called with none number string values
 
#### public API

 * improve typescript definition

### 1.5.4

#### public API

 * fail if temporals ar created with float values 
 * fix typescript definition and esdoc 

#### dependency updates

### 1.5.2

#### public API

 * fix LocalDate.now in typescript definition and esdoc 
 * fix LocalTime static properties in typescript definition

### 1.5.1

#### public API

 * Add `use` function to typescript definition
 * Add `convert` function to typescript definition

### 1.5.0

#### public API

* Add toJSON methods where missing and useful
* Remove protected class DateTimeBuilder from esdoc and typescript definition

#### lint

* add linter rules `no-var`, `prefer-const`

#### dependency updates

### 1.4.0

#### public API

 * Remove private constructors, functions and classes from  typescript definition (see #134)

### 1.3.1

#### public API

 * Add `DateTimeFormatter.withResolverStyle` function

#### etc
 
 * Fix DateTimeFormatterBuilder.constructor esdoc/ typescript definition
 * Fix esdoc/ typescript definition for ZoneId
 * Remove private functions, classses and constructors from esdoc
 * unify the format pattern esdoc in `DateTimeFormatter.ofPattern` 
   and `DateTimeFormatterBuilder.appendPattern`, and add `u` Symbol to documentation
 
### 1.3.0

#### public API

 * export zone/ZoneOffsetTransition

### 1.2.0

#### iana tzdb

 * Complete parsing of ZoneRegions

#### etc

 * Fix bower.json
 * Fix LocalTime.parse esdoc/ typescript definition

#### dependency updates

### 1.1.17

#### Bugfixes

 * Improve LocalDateTime.toInstant error handling
 * Improve validation of LocalDate parameter values when passed as Strings
 
#### iana tzdb

 * First quick approach for parsing ZoneRegions
 
### 1.1.14

#### Add more classes to public export

 * add all error classes
 * add zone/ZoneRules
 
#### code cleanup

 * fix lint issues
 * fix ESDoc tags
 * Replace var by let/ const declaration

#### dependency updates

### 1.1.13

#### Add ZoneRulesProvider stub

Add the ZoneRulesProvider. This should be the last step to enable js-joda for an external @js-joda/timezone plugin.

#### Provide a way to extend js-joda

[Implement a use function](https://github.com/js-joda/js-joda/pull/100#issuecomment-252425196)

### Bugfixes

 * Fix SystemDefaultZoneRules transition (fix a bug in convert and LocalDate.startOfDay)

### 1.1.12 

#### Implement daylight saving transition functionality

Complete / implement methods/ interfaces
- LocalDate.atStartOfDayWithZone
- ZonedDateTime.ofLocal
- ZonedDateTime.ofStrict
- ZonedDateTime.withEarlierOffsetAtOverlap
- ZonedDateTime.withLaterOffsetAtOverlap
- ZonedDateTime.until
- ZoneRules
- Pseudo zones for testing purpose

Increased test coverage for zone related classes

#### Test Coverage and more threetenbp Features

increased Test Coverage by adding/extending more tests from threetenbp 
but also adding own tests that increase the coverage. 

This also led to missing features implemented, e.g. more Fields in `DateTimeBuilder` being handled

#### Bugfixes

fixes found by extended Tests in
- `Duration`
- `DateTimeBuilder`
- `DateTimeFormatterBuilder`
- `YearMonth`

#### dependency updates

### 1.1.11

#### Typescript typings

make typescript definitions to be module definitions (see PR #86)

#### ESDoc Updates

fixed some warnings in esdoc build regarding signature mismatches (see PR #87)

#### Bugfixes

#### dependency updates

### 1.1.9

#### Typescript typings

added initial typescript typings (`.d.ts`) provided by [@spencerwi](https://github.com/spencerwi) and test based on the code from [CheatSheet](CheatSheet.md) to verify the typings 

#### Bugfixes

#### dependency updates
 * several dev dependency updates
  
### 1.1.8

last release without a CHANGELOG.md 
