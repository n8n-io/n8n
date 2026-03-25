# @internationalized/date

The `@internationalized/date` package provides objects and functions for representing and manipulating dates and times in a locale-aware manner.

## Features

* **Typed objects** – Includes immutable objects to represent dates, times, calendars, and more.
* **International calendars** – Support for 13 calendar systems used around the world, including Gregorian, Buddhist, Islamic, Persian, and more.
* **Manipulation** – Add and subtract durations, set and cycle fields, and more.
* **Conversion** – Convert between calendar systems, time zones, string representations, and object types.
* **Queries** – Compare dates and times for ordering or full/partial equality. Determine locale-specific metadata such as day of week, weekend/weekday, etc.
* **Time zone aware** – The [ZonedDateTime](https://react-spectrum.adobe.com/internationalized/date/ZonedDateTime.html) object supports time zone aware date and time manipulation.
* **Predictable** – The API is designed to resolve ambiguity in all operations explicitly, including time zone conversions, arithmetic involving daylight saving time, locale-specific queries, and more.
* **Small bundle size** – The entire library including all calendars and functions is 8 kB minified and compressed with Brotli.
* **Tree shakeable** – Only include the functions and calendar systems you need. For example, if you only use the Gregorian calendar and builtin `CalendarDate` methods, it's just 2.8 kB.

## Introduction

Dates and times are represented in many different ways by cultures around the world. This includes differences in calendar systems, time zones, daylight saving time rules, date and time formatting, weekday and weekend rules, and much more. When building applications that support users around the world, it is important to handle these aspects correctly for each locale. The `@internationalized/date` package provides a library of objects and functions to perform date and time related manipulation, queries, and conversions that work across locales and calendars.

By default, JavaScript represents dates and times using the [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) object. However, `Date` has _many_ problems, including a very difficult to use API, lack of all internationalization support, and more. The [Temporal](https://tc39.es/proposal-temporal/docs/index.html) proposal will eventually address this in the language, and `@internationalized/date` is heavily inspired by it. We hope to back the objects in this package with it once it is implemented in browsers.

## Package structure

The `@internationalized/date` package includes the following object types:

* [Calendar](https://react-spectrum.adobe.com/internationalized/date/Calendar.html) – An interface which provides calendar conversion and metadata like number of days in month, and number of months in year. Many implementations are provided to support the most commonly used calendar systems.
* [CalendarDate](https://react-spectrum.adobe.com/internationalized/date/CalendarDate.html) – An immutable object that stores a date associated with a specific calendar system, without any time components.
* [CalendarDateTime](https://react-spectrum.adobe.com/internationalized/date/CalendarDateTime.html) – An immutable object that represents a date and time without a time zone, in a specific calendar system.
* [ZonedDateTime](https://react-spectrum.adobe.com/internationalized/date/ZonedDateTime.html) – An immutable object that represents a date and time in a specific time zone and calendar system.
* [Time](https://react-spectrum.adobe.com/internationalized/date/Time.html) – An immutable object that stores a clock time without any date components.

Each object includes methods to allow basic manipulation and conversion functionality, such as adding and subtracting durations, and formatting as an ISO 8601 string. Additional less commonly used functions can be imported from the `@internationalized/date` package, and passed a date object as a parameter. This includes functions to parse ISO 8601 strings, query properties such as day of week, convert between time zones and much more. See the documentation for each of the objects to learn more about the supported methods and functions.

This example constructs a `CalendarDate` object, manipulates it to get the start of the next week, and converts it to a string representation.

```tsx
import {CalendarDate, startOfWeek} from '@internationalized/date';

let date = new CalendarDate(2022, 2, 3);
date = date.add({weeks: 1});
date = startOfWeek(date, 'en-US');
date.toString(); // 2022-02-06
```
