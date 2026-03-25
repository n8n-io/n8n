# Immutable date and time library for JavaScript

[![npm version](https://badge.fury.io/js/%40js-joda%2Fcore.svg)](https://badge.fury.io/js/%40js-joda%2Fcore)
[![GH Actions Build Status](https://github.com/js-joda/js-joda/actions/workflows/tests.yaml/badge.svg?branch=main)](https://github.com/js-joda/js-joda/actions)
[![Sauce Test Status](https://saucelabs.com/buildstatus/js-joda)](https://saucelabs.com/u/js-joda)
[![Coverage Status](https://coveralls.io/repos/js-joda/js-joda/badge.svg?branch=main&service=github)](https://coveralls.io/github/js-joda/js-joda?branch=main)
[![Downloads/Month](https://img.shields.io/npm/dm/%40js-joda%2Fcore.svg)](https://img.shields.io/npm/dm/%40js-joda%2Fcore.svg)

[![Sauce Browser Matrix](https://saucelabs.com/browser-matrix/js-joda.svg?branch=main&42)](https://saucelabs.com/u/js-joda)

## Introduction

**js-joda** is an **immutable date and time library** for JavaScript. It provides a **simple, domain-driven and clean API** based on the ISO calendar system, which is the de facto world calendar following the proleptic Gregorian rules.

- js-joda has a lightweight footprint, only **43 kB minified and compressed**, no third party dependencies.

- js-joda is **fast**. It is about 2 to 10 times faster than other JavaScript date libraries.

- js-joda comes with built-in parsers/ formatters for ISO 8601 as specified in RFC 3339, that can be easily customized.

- js-joda supports **ECMAScript 5** browsers down to IE11.

- js-joda is a **port of the threeten** backport, which is the base for JSR-310 implementation of the Java SE 8 java.time package. Threeten is inspired by **Joda-Time**, having similar concepts and the same author.

- js-joda is **robust and stable**. We ported more then 1700 test-cases with a lots of test-permutations from the threetenbp project. We run the automated karma test-suite against Firefox, Chrome, Node and phantomjs.

## Why yet another JavaScript date and time library?

- Popular JavaScript date libraries like [moment](https://momentjs.com/) or [date-utils](https://github.com/continuouscalendar/dateutils) are **wrappers** around the native JavaScript `Date` object, providing syntactic sugar. The native `Date` object always consist of a date, time and a timezone part. In contrast, js-joda is a **standalone** date and time implementation.

- The API has a **domain-driven design** with classes for each of the different use cases, like `LocalDate`, `ZonedDateTime` or `Period`. For example, `LocalDate` allows you to handle dates without times (like birthdays or holidays) in a clean and error-safe way, especially if these dates are persisted to an external server.

- js-joda is **immutable**. Immutability aligns well with pure functions and with the architecture of frameworks like React and Flux.

## The ThreeTen domain models

### Dates and Times

- **LocalDate** represents a date without a time and timezone in the ISO-8601 calendar system, such as 2007-12-24.

- **LocalTime** represents a time without timezone in the ISO-8601 calendar system such as '11:55:00'.

- **LocalDateTime** is a description of the date (LocalDate), as used for birthdays, combined with the local time (LocalTime) as seen on a wall clock.

- **ZonedDateTime** is a date-time with a timezone in the ISO-8601 calendar system, such as 2007-12-24T16:15:30+01:00 UTC+01:00.

- **Instant** is an instantaneous point on the time-line measured from the epoch of _1970-01-01T00:00:00Z_ in epoch-seconds and nanosecond-of-second.

### Duration and Period

- **Duration** is a time-based amount of time, such as '34.5 seconds'.

- **Period** is a date-based amount of time in the ISO-8601 calendar system, such as '2 years, 3 months and 4 days'.

### Additional value types

- **Year** represents a year in the ISO-8601 calendar system, such as '2016'.

- **YearMonth** represents a year and a month in the ISO-8601 calendar system, such as '2016-01'.

- **Month** represents a month-of-year in the ISO-8601 calendar system, such as 'July'.

- **MonthDay** represents a month-day in the ISO-8601 calendar system, such as '--12-03'. Could be used to represent e.g. Birthdays.

- **DayOfWeek** represents a day-of-week in the ISO-8601 calendar system, such as 'Tuesday'.

## Getting started

### Node

Install joda using npm

```
npm install @js-joda/core
```

Then require it to any module

```js
var LocalDate = require('@js-joda/core').LocalDate;

var d = LocalDate.parse('2012-12-24').atStartOfDay().plusMonths(2); // 2013-02-24T00:00:00
```

### Browser

To use js-joda from a browser, download either `dist/js-joda.min.js` or `dist/js-joda.js` (with sourcemaps for development). Then add it as a script tag to your page

```html
<script src="js-joda.min.js"></script>
<script>
    var LocalDate = JSJoda.LocalDate;
    var d = LocalDate.parse('2012-12-24').atStartOfDay().plusMonths(2); // 2013-02-24T00:00:00
</script>
```

## js-joda packages

js-joda consist of four packages:

|  package name | description  |  path |
|---|---|---|
| `@js-joda/core` | Implementation of the ThreeTen Classes and API | [/packages/core](//github.com/js-joda/js-joda/tree/main/packages/core) |
| `@js-joda/timezone` | Implementation of timezone calculation based on the iana Time Zone Database | [/packages/timezone](//github.com/js-joda/js-joda/tree/main/packages/timezone) |
| `@js-joda/locale` | Implementation of locale specific functionality for js-joda, especially for formatting and parsing locale specific dates | [/packages/locale](//github.com/js-joda/js-joda/tree/main/packages/locale) |
| `@js-joda/extra` | Implementation of the ThreeTen-Extra Classes and API |[/packages/extra](//github.com/js-joda/js-joda/tree/main/packages/extra) |

The [@js-joda/examples](//github.com/js-joda/js-joda/tree/main/packages/examples) package is for testing the different build artifacts in different context, like webpack, browser node, etc.

## Documentation

- [js-joda Quick start guide](//js-joda.github.io/js-joda/manual/getting-started.html) Quick start guide and examples
- [API](//js-joda.github.io/js-joda/identifiers.html) ESDoc generated API documentation

## Contributing

Contributions are always welcome. Before contributing please read the [code of conduct](http://contributor-covenant.org/version/1/4/) &
search the issue tracker. We use GitHub issues. Your issue may have already been discussed or fixed. To contribute, fork js-joda, commit your changes, & send a pull request.

By contributing to js-joda, you agree that your contributions will be licensed under its BSD license.

Note that only pull requests and issues that match the threeten backport API will be considered. Additional requested features will be rejected.

## License

- `js-joda` is released under the [BSD 3-clause license](//github.com/js-joda/js-joda/blob/main/LICENSE).

- `js-joda` uses the ThreeTen-Backport implementation (http://www.threeten.org/threetenbp/) as a reference base for implementation. This allows us to release js-joda under the BSD License while the OpenJDK java.time implementation is under GNU GPL+linking exception. The API of the ThreeTen-Backport is mostly identical to the official Java SE 8 API from the view of our JavaScript port.

- Our implementation reference base ThreeTen-Backport (http://www.threeten.org/threetenbp/) is also released under the BSD 3-clause license

- `OpenJDK` is under GNU GPL+linking exception.

- The author of `Joda-Time` and the lead architect of the JSR-310 is Stephen Colebourne.

The API of this project (as far as possible with JavaScript), a lot of implementation details and documentation
are just copied but never equalled.

## Roadmap

### Milestone 1: Core domains (reached with version v1.0.0)

- Support for the domain models `LocalDate`, `LocalDateTime`, `ZonedDateTime`, `Instant`, `Duration` and `Period` converting to and from ISO8601.
- `ZonedDateTime` (without support for loading iana timezone databases) currently supports only fixed offsets like UTC or UTC+02:00 and the system default time zone.

### Milestone 2: IANA timezone support (reached with version v1.2.0)

- Add IANA timezone database support to js-joda. Implement handling of daylight saving transitions, mainly in `ZonedDateTime`.
- For access to the IANA timezone database, the plugin [@js-joda/timezone](//github.com/js-joda/js-joda/tree/main/packages/timezone) is required. It provides an implementation of the [ZoneRulesProvider](//js-joda.github.io/js-joda/class/packages/core/src/zone/ZoneRulesProvider.js~ZoneRulesProvider.html) and contains the iana timezone database.

### Milestone 3: Locale support (reached with v2.0.0 of @js-joda/locale)

- Add locale support.
- Extend pattern parser/ formatter for text with locale support.

see the plugin [@js-joda/locale](//github.com/js-joda/js-joda/tree/main/packages/locale)

### Future Milestones

- Reduce library size by removing redundant code, especially by refactoring code for formatting/ parsing dates.
- Increase test coverage (ongoing task)
- Cleanup documentation (ongoing task)
