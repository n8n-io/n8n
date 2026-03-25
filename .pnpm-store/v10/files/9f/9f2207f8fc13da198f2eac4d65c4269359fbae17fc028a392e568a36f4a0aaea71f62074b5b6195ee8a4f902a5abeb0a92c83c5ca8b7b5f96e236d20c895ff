# TS-ICS

[![neuvernetzung-logo](https://raw.githubusercontent.com/Neuvernetzung/ts-ics/master/public/Header.png)](https://neuvernetzung.de)

This package can parse and create Ics files and provides TypeScript types for easy handling.

## Motivation

Many of the Ics packages provide good functionality, however none of these are type safe. This package can parse Ics strings with Zod. Also, many packages are not actively maintained.

## Installation

`npm i ts-ics`

## Parsing

### Parse Ics Calendar

```ts
import { parseIcsCalendar, icsCalendarToObject, type VCalendar } from "ts-ics";

const calendarParsed: VCalendar = parseIcsCalendar(icsCalendarString);

// or if you only want to convert it, but not parse it

const calendar: VCalendar = icsCalendarToObject(icsCalendarString);
```

### Parse Ics Event

```ts
import { parseIcsEvent, icsEventToObject, type VEvent } from "ts-ics";

const eventParsed: VEvent = parseIcsEvent(icsEventString);

// or if you only want to convert it, but not parse it

const event: VEvent = icsEventToObject(icsEventString);
```

## Generating

### Generate Ics Calendar

```ts
import { generateIcsCalendar, type VCalendar } from "ts-ics";

const calendar: VCalendar = {...}

const icsCalendarString = generateIcsCalendar(calendar);
```

### Generate Ics Event

```ts
import { generateIcsEvent, type VEvent } from "ts-ics";

const event: VEvent = {...}

const icsEventString = generateIcsEvent(event);
```

## RRule

### Extending by RRule

```ts
import { extendByRecurrenceRule } from "ts-ics";

const start = new Date(Date.UTC(2023, 9, 5));
const ruleString = "FREQ=DAILY;BYMINUTE=15,16,17,18,19;BYSECOND=0,20,40";

const rule = parseIcsRecurrenceRule(ruleString);

const dates = extendByRecurrenceRule(rule, {
  start,
  end: addDays(start, 1),
});
```

## More

Parse and generate functions are available for every other Ics Type like:

- VAlarm
- VTimezone
- ...

## License

MIT - [License](https://github.com/Neuvernetzung/ts-ics/blob/master/LICENSE)

## Thanks

Thanks to [iCalendar.org](https://icalendar.org/) for the ics documentation and the many examples which are used for testing purposes.
