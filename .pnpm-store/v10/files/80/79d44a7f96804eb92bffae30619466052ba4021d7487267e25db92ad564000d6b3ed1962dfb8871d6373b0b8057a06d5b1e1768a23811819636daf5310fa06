# rrule.js

**Library for working with recurrence rules for calendar dates.**

[![NPM version][npm-image]][npm-url]
[![Build Status][ci-image]][ci-url]
[![js-standard-style][js-standard-image]][js-standard-url]
[![Downloads][downloads-image]][downloads-url]
[![Gitter][gitter-image]][gitter-url]
[![codecov.io](http://codecov.io/github/jkbrzt/rrule/coverage.svg?branch=master)](http://codecov.io/github/jkbrzt/rrule?branch=master)

rrule.js supports recurrence rules as defined in the [iCalendar
RFC](https://tools.ietf.org/html/rfc5545), with a few important
[differences](#differences-from-icalendar-rfc). It is a partial port of the
`rrule` module from the excellent
[python-dateutil](http://labix.org/python-dateutil/) library. On top of
that, it supports parsing and serialization of recurrence rules from and
to natural language.

---

### Quick Start

- [Demo app](http://jkbrzt.github.io/rrule/)
- # For contributors and maintainers: the code for the demo app is only on `gh-pages` branch

#### Client Side

```bash
$ yarn add rrule
```

#### Server Side

Includes optional TypeScript types

```bash
$ yarn add rrule
# or
$ npm install rrule
```

#### Usage

**RRule:**

```es6
import { datetime, RRule, RRuleSet, rrulestr } from 'rrule'

// Create a rule:
const rule = new RRule({
  freq: RRule.WEEKLY,
  interval: 5,
  byweekday: [RRule.MO, RRule.FR],
  dtstart: datetime(2012, 2, 1, 10, 30),
  until: datetime(2012, 12, 31)
})

// Get all occurrence dates (Date instances):
rule.all()
[ '2012-02-03T10:30:00.000Z',
  '2012-03-05T10:30:00.000Z',
  '2012-03-09T10:30:00.000Z',
  '2012-04-09T10:30:00.000Z',
  '2012-04-13T10:30:00.000Z',
  '2012-05-14T10:30:00.000Z',
  '2012-05-18T10:30:00.000Z',

 /* … */]

// Get a slice:
rule.between(datetime(2012, 8, 1), datetime(2012, 9, 1))
['2012-08-27T10:30:00.000Z',
 '2012-08-31T10:30:00.000Z']

// Get an iCalendar RRULE string representation:
// The output can be used with RRule.fromString().
rule.toString()
"DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;INTERVAL=5;UNTIL=20130130T230000Z;BYDAY=MO,FR"

// Get a human-friendly text representation:
// The output can be used with RRule.fromText().
rule.toText()
"every 5 weeks on Monday, Friday until January 31, 2013"
```

**RRuleSet:**

```js
const rruleSet = new RRuleSet()

// Add a rrule to rruleSet
rruleSet.rrule(
  new RRule({
    freq: RRule.MONTHLY,
    count: 5,
    dtstart: datetime(2012, 2, 1, 10, 30),
  })
)

// Add a date to rruleSet
rruleSet.rdate(datetime(2012, 7, 1, 10, 30))

// Add another date to rruleSet
rruleSet.rdate(datetime(2012, 7, 2, 10, 30))

// Add a exclusion rrule to rruleSet
rruleSet.exrule(
  new RRule({
    freq: RRule.MONTHLY,
    count: 2,
    dtstart: datetime(2012, 3, 1, 10, 30),
  })
)

// Add a exclusion date to rruleSet
rruleSet.exdate(datetime(2012, 5, 1, 10, 30))

// Get all occurrence dates (Date instances):
rruleSet.all()[
  ('2012-02-01T10:30:00.000Z',
  '2012-05-01T10:30:00.000Z',
  '2012-07-01T10:30:00.000Z',
  '2012-07-02T10:30:00.000Z')
]

// Get a slice:
rruleSet.between(datetime(2012, 2, 1), datetime(2012, 6, 2))[
  ('2012-05-01T10:30:00.000Z', '2012-07-01T10:30:00.000Z')
]

// To string
rruleSet.valueOf()[
  ('DTSTART:20120201T023000Z',
  'RRULE:FREQ=MONTHLY;COUNT=5',
  'RDATE:20120701T023000Z,20120702T023000Z',
  'EXRULE:FREQ=MONTHLY;COUNT=2',
  'EXDATE:20120601T023000Z')
]

// To string
rruleSet.toString()
;('["DTSTART:20120201T023000Z","RRULE:FREQ=MONTHLY;COUNT=5","RDATE:20120701T023000Z,20120702T023000Z","EXRULE:FREQ=MONTHLY;COUNT=2","EXDATE:20120601T023000Z"]')
```

**rrulestr:**

```js
// Parse a RRule string, return a RRule object
rrulestr('DTSTART:20120201T023000Z\nRRULE:FREQ=MONTHLY;COUNT=5')

// Parse a RRule string, return a RRuleSet object
rrulestr('DTSTART:20120201T023000Z\nRRULE:FREQ=MONTHLY;COUNT=5', {
  forceset: true,
})

// Parse a RRuleSet string, return a RRuleSet object
rrulestr(
  'DTSTART:20120201T023000Z\nRRULE:FREQ=MONTHLY;COUNT=5\nRDATE:20120701T023000Z,20120702T023000Z\nEXRULE:FREQ=MONTHLY;COUNT=2\nEXDATE:20120601T023000Z'
)
```

### Important: Use UTC dates

Dates in JavaScript are tricky. `RRule` tries to support as much flexibility as possible without adding any large required 3rd party dependencies, but that means we also have some special rules.

By default, `RRule` deals in ["floating" times or UTC timezones](https://tools.ietf.org/html/rfc5545#section-3.2.19). If you want results in a specific timezone, `RRule` also provides [timezone support](#timezone-support). Either way, JavaScript's built-in "timezone" offset tends to just get in the way, so this library simply doesn't use it at all. All times are returned with zero offset, as though it didn't exist in JavaScript.

**THE BOTTOM LINE: Returned "UTC" dates are always meant to be interpreted as dates in your local timezone. This may mean you have to do additional conversion to get the "correct" local time with offset applied.**

For this reason, it is highly recommended to use timestamps in UTC eg. `new Date(Date.UTC(...))`. Returned dates will likewise be in UTC (except on Chrome, which always returns dates with a timezone offset). It's recommended to use the provided `datetime()` helper, which
creates dates in the correct format using a 1-based month.

For example:

```ts
// local machine zone is America/Los_Angeles
const rule = RRule.fromString(
  "DTSTART;TZID=America/Denver:20181101T190000;\n"
  + "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,TH;INTERVAL=1;COUNT=3"
)
rule.all()

[ 2018-11-01T18:00:00.000Z,
  2018-11-05T18:00:00.000Z,
  2018-11-07T18:00:00.000Z ]
// Even though the given offset is `Z` (UTC), these are local times, not UTC times.
// Each of these this is the correct local Pacific time of each recurrence in
// America/Los_Angeles when it is 19:00 in America/Denver, including the DST shift.

// You can get the local components by using the getUTC* methods eg:
date.getUTCDate() // --> 1
date.getUTCHours() // --> 18
```

If you want to get the same times in true UTC, you may do so (e.g., using [Luxon](https://moment.github.io/luxon/#/)):

```ts
rule.all().map(date =>
DateTime.fromJSDate(date)
  .toUTC()
  .setZone('local', { keepLocalTime: true })
  .toJSDate()
)

[ 2018-11-02T01:00:00.000Z,
  2018-11-06T02:00:00.000Z,
  2018-11-08T02:00:00.000Z ]
// These times are in true UTC; you can see the hours shift
```

For more examples see
[python-dateutil](http://labix.org/python-dateutil/) documentation.

---

### Timezone Support

Rrule also supports use of the `TZID` parameter in the
[RFC](https://tools.ietf.org/html/rfc5545#section-3.2.19) using the
[Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl).
Support matrix for the Intl API applies. If you need to support additional environments,
please consider using a [polyfill](https://formatjs.io/docs/polyfills/).

Example with `TZID`:

```js
new RRule({
  dtstart: datetime(2018, 2, 1, 10, 30),
  count: 1,
  tzid: 'Asia/Tokyo',
}).all()[
  // assuming the system timezone is set to America/Los_Angeles, you get:
  '2018-01-31T17:30:00.000Z'
]
// which is the time in Los Angeles when it's 2018-02-01T10:30:00 in Tokyo.
```

Whether or not you use the `TZID` param, make sure to only use JS `Date` objects that are
represented in UTC to avoid unexpected timezone offsets being applied, for example:

```js
// WRONG: Will produce dates with TZ offsets added
new RRule({
  freq: RRule.MONTHLY,
  dtstart: new Date(2018, 1, 1, 10, 30),
  until: new Date(2018, 2, 31),
}).all()[('2018-02-01T18:30:00.000Z', '2018-03-01T18:30:00.000Z')]

// RIGHT: Will produce dates with recurrences at the correct time
new RRule({
  freq: RRule.MONTHLY,
  dtstart: datetime(2018, 2, 1, 10, 30),
  until: datetime(2018, 3, 31),
}).all()[('2018-02-01T10:30:00.000Z', '2018-03-01T10:30:00.000Z')]
```

### API

#### `RRule` Constructor

```javascript
new RRule(options[, noCache=false])
```

The `options` argument mostly corresponds to the properties defined for `RRULE` in the
iCalendar RFC. Only `freq` is required.

<table>
    <!-- why, markdown... -->
    <thead>
    <tr>
        <th>Option</th>
        <th>Description</th>
    </tr>
    </thead>
    <tbody>
    <tr>
        <td><code>freq</code></td>
        <td>
            <p>(required) One of the following constants:</p>
            <ul>
                <li><code>RRule.YEARLY</code></li>
                <li><code>RRule.MONTHLY</code></li>
                <li><code>RRule.WEEKLY</code></li>
                <li><code>RRule.DAILY</code></li>
                <li><code>RRule.HOURLY</code></li>
                <li><code>RRule.MINUTELY</code></li>
                <li><code>RRule.SECONDLY</code></li>
            </ul>
        </td>
    </tr>
    <tr>
        <td><code>dtstart</code></td>
        <td>The recurrence start. Besides being the base for the
            recurrence, missing parameters in the final recurrence
            instances will also be extracted from this date. If not
            given, <code>new Date</code> will be used instead.
            **IMPORTANT:** See the discussion under <a href="#timezone-support">timezone support</a>
        </td>
    </tr>
    <tr>
        <td><code>interval</code></td>
        <td>The interval between each freq iteration. For example,
            when using <code>RRule.YEARLY</code>, an interval of <code>2</code> means
            once every
            two years, but with <code>RRule.HOURLY</code>, it means once every two
            hours.
            The default interval is <code>1</code>.
        </td>
    </tr>
    <tr>
        <td><code>wkst</code></td>
        <td>The week start day. Must be one of the <code>RRule.MO</code>,
            <code>RRule.TU</code>, <code>RRule.WE</code> constants, or an integer,
            specifying
            the first day of the week. This will affect recurrences based
            on weekly periods. The default week start is <code>RRule.MO</code>.
        </td>
    </tr>
    <tr>
        <td><code>count</code></td>
        <td>How many occurrences will be generated.</td>
    </tr>
    <tr>
        <td><code>until</code></td>
        <td>If given, this must be a <code>Date</code> instance, that will specify
            the limit of the recurrence. If a recurrence instance happens
            to be the same as the <code>Date</code> instance given in the
            <code>until</code>
            argument, this will be the last occurrence.
        </td>
    </tr>
    <tr>
      <td><code>tzid</code></td>
      <td>If given, this must be a IANA string recognized by the Intl API. See
      discussion under <a href="#timezone-support">Timezone support</a>.
      </td>
    </tr>
    <tr>
        <td><code>bysetpos</code></td>
        <td>If given, it must be either an integer, or an array of
            integers, positive or negative. Each given integer will specify
            an occurrence number, corresponding to the nth occurrence of
            the rule inside the frequency period. For example, a
            <code>bysetpos</code> of <code>-1</code> if combined with a <code>RRule.MONTHLY</code>
            frequency, and a byweekday of (<code>RRule.MO</code>, <code>RRule.TU</code>,
            <code>RRule.WE</code>, <code>RRule.TH</code>, <code>RRule.FR</code>), will result in
            the last
            work day of every month.
        </td>
    </tr>
    <tr>
        <td><code>bymonth</code></td>
        <td>If given, it must be either an integer, or an array of
            integers, meaning the months to apply the recurrence to.
        </td>
    </tr>
    <tr>
        <td><code>bymonthday</code></td>
        <td>If given, it must be either an integer, or an array of
            integers, meaning the month days to apply the recurrence to.
        </td>
    </tr>
    <tr>
        <td><code>byyearday</code></td>
        <td>If given, it must be either an integer, or an array of
            integers, meaning the year days to apply the recurrence to.
        </td>
    </tr>
    <tr>
        <td><code>byweekno</code></td>
        <td>If given, it must be either an integer, or an array of
            integers, meaning the week numbers to apply the recurrence to.
            Week numbers have the meaning described in ISO8601, that is,
            the first week of the year is that containing at least four
            days of the new year.
        </td>
    </tr>
    <tr>
        <td><code>byweekday</code></td>
        <td>If given, it must be either an integer (<code>0 == RRule.MO</code>), an
            array of integers, one of the weekday constants
            (<code>RRule.MO</code>,
            <code>RRule.TU</code>, etc), or an array of these constants. When
            given,
            these variables will define the weekdays where the recurrence
            will be applied. It's also possible to use an argument n for
            the weekday instances, which will mean the nth occurrence of
            this weekday in the period. For example, with
            <code>RRule.MONTHLY</code>,
            or with <code>RRule.YEARLY</code> and <code>BYMONTH</code>, using
            <code>RRule.FR.nth(+1)</code> or <code>RRule.FR.nth(-1)</code> in <code>byweekday</code>
            will specify the first or last friday of the month where the
            recurrence happens.
            Notice
            that the RFC documentation, this is specified as <code>BYDAY</code>,
            but was renamed to avoid the ambiguity of that argument.
        </td>
    </tr>
    <tr>
        <td><code>byhour</code></td>
        <td>If given, it must be either an integer, or an array of
            integers, meaning the hours to apply the recurrence to.
        </td>
    </tr>
    <tr>
        <td><code>byminute</code></td>
        <td>If given, it must be either an integer, or an array of
            integers, meaning the minutes to apply the recurrence to.
        </td>
    </tr>
    <tr>
        <td><code>bysecond</code></td>
        <td>If given, it must be either an integer, or an array of
            integers, meaning the seconds to apply the recurrence to.
        </td>
    </tr>
    <tr>
        <td><code>byeaster</code></td>
        <td>This is an extension to the RFC specification which the Python
            implementation provides.
            <strong>Not implemented in the JavaScript version.</strong>
        </td>
    </tr>
    </tbody>
</table>

`noCache`: Set to `true` to disable caching of results. If you will use the
same rrule instance multiple times, enabling caching will improve the
performance considerably. Enabled by default.

See also [python-dateutil](http://labix.org/python-dateutil/)
documentation.

---

#### Instance properties

<dl>
    <dt><code>rule.options</code></dt>
    <dd>Processed options applied to the rule. Includes default options
    (such us <code>wkstart</code>). Currently,
    <code>rule.options.byweekday</code> isn't equal
    to <code>rule.origOptions.byweekday</code> (which is an inconsistency).
    </dd>
    <dt><code>rule.origOptions</code></dt>
    <dd>The original <code>options</code> argument passed to
    the constructor.</dd>
</dl>

---

#### Occurrence Retrieval Methods

##### `RRule.prototype.all([iterator])`

Returns all dates matching the rule. It is a replacement for the
iterator protocol this class implements in the Python version.

As rules without `until` or `count` represent infinite date series, you
can optionally pass `iterator`, which is a function that is called for
each date matched by the rule. It gets two parameters `date` (the `Date`
instance being added), and `i` (zero-indexed position of `date` in the
result). Dates are being added to the result as long as the iterator
returns `true`. If a `false`-y value is returned, `date` isn't added to
the result and the iteration is interrupted (possibly prematurely).

```javascript
rule.all()[
  ('2012-02-01T10:30:00.000Z',
  '2012-05-01T10:30:00.000Z',
  '2012-07-01T10:30:00.000Z',
  '2012-07-02T10:30:00.000Z')
]

rule.all(function (date, i) {
  return i < 2
})[('2012-02-01T10:30:00.000Z', '2012-05-01T10:30:00.000Z')]
```

##### `RRule.prototype.between(after, before, inc=false [, iterator])`

Returns all the occurrences of the rrule between `after` and `before`.
The `inc` keyword defines what happens if `after` and/or `before` are
themselves occurrences. With `inc == true`, they will be included in the
list, if they are found in the recurrence set.

Optional `iterator` has the same function as it has with
`RRule.prototype.all()`.

```javascript
rule.between(datetime(2012, 8, 1), datetime(2012, 9, 1))[
  ('2012-08-27T10:30:00.000Z', '2012-08-31T10:30:00.000Z')
]
```

##### `RRule.prototype.before(dt, inc=false)`

Returns the last recurrence before the given `Date` instance. The `inc`
argument defines what happens if `dt` is an occurrence. With
`inc == true`, if `dt` itself is an occurrence, it will be returned.

##### `RRule.prototype.after(dt, inc=false)`

Returns the first recurrence
after the given `Date` instance. The `inc` argument defines what happens
if `dt` is an occurrence. With `inc == true`, if `dt` itself is an
occurrence, it will be returned.

See also [python-dateutil](http://labix.org/python-dateutil/)
documentation.

---

#### iCalendar RFC String Methods

##### `RRule.prototype.toString()`

Returns a string representation of the rule as per the iCalendar RFC.
Only properties explicitly specified in `options` are included:

```javascript
rule.toString()
;('DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;INTERVAL=5;UNTIL=20130130T230000Z;BYDAY=MO,FR')

rule.toString() == RRule.optionsToString(rule.origOptions)
true
```

##### `RRule.optionsToString(options)`

Converts `options` to iCalendar RFC `RRULE` string:

```javascript
// Get full a string representation of all options,
// including the default and inferred ones.
RRule.optionsToString(rule.options)
;('DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;INTERVAL=5;WKST=0;UNTIL=20130130T230000Z;BYDAY=MO,FR;BYHOUR=10;BYMINUTE=30;BYSECOND=0')

// Cherry-pick only some options from an rrule:
RRule.optionsToString({
  freq: rule.options.freq,
  dtstart: rule.options.dtstart,
})
;('DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;')
```

##### `RRule.fromString(rfcString)`

Constructs an `RRule` instance from a complete `rfcString`:

```javascript
var rule = RRule.fromString('DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;')

// This is equivalent
var rule = new RRule(
  RRule.parseString('DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY')
)
```

##### `RRule.parseString(rfcString)`

Only parse RFC string and return `options`.

```javascript
var options = RRule.parseString('FREQ=DAILY;INTERVAL=6')
options.dtstart = datetime(2000, 2, 1)
var rule = new RRule(options)
```

---

#### Natural Language Text Methods

These methods provide an incomplete support for text→`RRule` and
`RRule`→text conversion. You should test them with your input to see
whether the result is acceptable.

##### `RRule.prototype.toText([gettext, [language]])`

Returns a textual representation of `rule`. The `gettext` callback, if
provided, will be called for each text token and its return value used
instead. The optional `language` argument is a language definition to be
used (defaults to `rrule/nlp.js:ENGLISH`).

```javascript
var rule = new RRule({
  freq: RRule.WEEKLY,
  count: 23,
})
rule.toText()
;('every week for 23 times')
```

##### `RRule.prototype.isFullyConvertibleToText()`

Provides a hint on whether all the options the rule has are convertible
to text.

##### `RRule.fromText(text[, language])`

Constructs an `RRule` instance from `text`.

```javascript
rule = RRule.fromText('every day for 3 times')
```

##### `RRule.parseText(text[, language])`

Parse `text` into `options`:

```javascript
options = RRule.parseText('every day for 3 times')
// {freq: 3, count: "3"}
options.dtstart = datetime(2000, 2, 1)
var rule = new RRule(options)
```

---

#### `RRuleSet` Constructor

```javascript
new RRuleSet([(noCache = false)])
```

The `RRuleSet` instance allows more complex recurrence setups, mixing multiple
rules, dates, exclusion rules, and exclusion dates.

Default `noCache` argument is `false`, caching of results will be enabled,
improving performance of multiple queries considerably.

##### `RRuleSet.prototype.rrule(rrule)`

Include the given `rrule` instance in the recurrence set generation.

##### `RRuleSet.prototype.rdate(dt)`

Include the given datetime instance `dt` in the recurrence set generation.

##### `RRuleSet.prototype.exrule(rrule)`

Include the given `rrule` instance in the recurrence set exclusion list. Dates
which are part of the given recurrence rules will not be generated, even if
some inclusive rrule or rdate matches them. **NOTE:** `EXRULE` has been (deprecated
in RFC 5545)[https://icalendar.org/iCalendar-RFC-5545/a-3-deprecated-features.html]
and does not support a `DTSTART` property.

##### `RRuleSet.prototype.exdate(dt)`

Include the given datetime instance `dt` in the recurrence set exclusion list. Dates
included that way will not be generated, even if some inclusive `rrule` or
`rdate` matches them.

##### `RRuleSet.prototype.tzid(tz?)`

Sets or overrides the timezone identifier. Useful if there are no rrules in this
`RRuleSet` and thus no `DTSTART`.

##### `RRuleSet.prototype.all([iterator])`

Same as `RRule.prototype.all`.

##### `RRuleSet.prototype.between(after, before, inc=false [, iterator])`

Same as `RRule.prototype.between`.

##### `RRuleSet.prototype.before(dt, inc=false)`

Same as `RRule.prototype.before`.

##### `RRuleSet.prototype.after(dt, inc=false)`

Same as `RRule.prototype.after`.

##### `RRuleSet.prototype.rrules()`

Get list of included rrules in this recurrence set.

##### `RRuleSet.prototype.exrules()`

Get list of excluded rrules in this recurrence set.

##### `RRuleSet.prototype.rdates()`

Get list of included datetimes in this recurrence set.

##### `RRuleSet.prototype.exdates()`

Get list of excluded datetimes in this recurrence set.

---

#### `rrulestr` Function

```js
rrulestr(rruleStr[, options])
```

The `rrulestr` function is a parser for RFC-like syntaxes. The string passed
as parameter may be a multiple line string, a single line string, or just the
`RRULE` property value.

Additionally, it accepts the following keyword arguments:

<dl>

<dt><code>cache</code></dt>
<dd>
If <code>true</code>, the <code>rruleset</code> or <code>rrule</code> created instance 
will cache its results.
Default is not to cache.
</dd>

<dt><code>dtstart</code></dt>
<dd>
If given, it must be a datetime instance that will be used when no 
<code>DTSTART</code> property is found in the parsed string. 
If it is not given, and the property is not found, 
<code>datetime.now()</code> will be used instead.
</dd>

<dt><code>unfold</code></dt>
<dd>
If set to <code>true</code>, lines will be unfolded following the RFC specification. 
It defaults to <code>false</code>, meaning that spaces before every line will be stripped.
</dd>

<dt><code>forceset</code></dt>
<dd>
If set to <code>true</code>, an <code>rruleset</code> instance will be returned, 
even if only a single rule is found. 
The default is to return an <code>rrule</code> if possible, and 
an <code>rruleset</code> if necessary.
</dd>

<dt><code>compatible</code></dt>
<dd>
If set to <code>true</code>, the parser will operate in RFC-compatible mode. 
Right now it means that unfold will be turned on, and if a <code>DTSTART</code> is found, 
it will be considered the first recurrence instance, as documented in the RFC.
</dd>

<dt><code>tzid</code></dt>
<dd>
If given, it must be a string that will be used when no <code>TZID</code> 
property is found in the parsed string. 
If it is not given, and the property is not found, <code>'UTC'</code> will 
be used by default.
</dd>

</dl>

---

### Differences From iCalendar RFC

- `RRule` has no `byday` keyword. The equivalent keyword has been replaced by
  the `byweekday` keyword, to remove the ambiguity present in the original
  keyword.
- Unlike documented in the RFC, the starting datetime, `dtstart`, is
  not the first recurrence instance, unless it does fit in the specified rules.
  This is in part due to this project being a port of
  [python-dateutil](https://labix.org/python-dateutil#head-a65103993a21b717f6702063f3717e6e75b4ba66),
  which has the same non-compliant functionality. Note that you can get the
  original behavior by using a `RRuleSet` and adding the `dtstart` as an `rdate`.

```javascript
var rruleSet = new RRuleSet()
var start = datetime(2012, 2, 1, 10, 30)

// Add a rrule to rruleSet
rruleSet.rrule(
  new RRule({
    freq: RRule.MONTHLY,
    count: 5,
    dtstart: start,
  })
)

// Add a date to rruleSet
rruleSet.rdate(start)
```

- Unlike documented in the RFC, every keyword is valid on every frequency. (The
  RFC documents that `byweekno` is only valid on yearly frequencies, for example.)

### Development

rrule.js is implemented in Typescript. It uses [JavaScript Standard Style](https://github.com/feross/standard) coding style.

To run the code, checkout this repository and run:

```
$ yarn
```

To run the tests, run:

```
$ yarn test
```

To build files for distribution, run:

```
$ yarn build
```

#### Authors

- [Jakub Roztocil](http://roztocil.co)
  ([@jkbrzt](http://twitter.com/jkbrzt))
- Lars Schöning ([@lyschoening](http://twitter.com/lyschoening))
- David Golightly ([@davigoli](http://twitter.com/davigoli))

Python `dateutil` is written by [Gustavo
Niemeyer](http://niemeyer.net).

See [LICENCE](https://github.com/jkbrzt/rrule/blob/master/LICENCE) for
more details.

[npm-url]: https://npmjs.org/package/rrule
[npm-image]: http://img.shields.io/npm/v/rrule.svg
[ci-url]: https://github.com/jkbrzt/rrule/actions
[ci-image]: https://github.com/jkbrzt/rrule/workflows/Node%20CI/badge.svg
[downloads-url]: https://npmjs.org/package/rrule
[downloads-image]: http://img.shields.io/npm/dm/rrule.svg?style=flat-square
[js-standard-url]: https://github.com/feross/standard
[js-standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat
[gitter-url]: https://gitter.im/rrule-js/Lobby
[gitter-image]: https://img.shields.io/gitter/room/nwjs/nw.js.svg

#### Related projects

- https://rrules.com — RESTful API to get back occurrences of RRULEs that conform to RFC 5545.
