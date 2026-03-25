# tzdb [![GitHub license](https://img.shields.io/github/license/vvo/tzdb?style=flat)](https://github.com/vvo/tzdb/blob/main/LICENSE) [![Tests](https://github.com/vvo/tzdb/workflows/CI/badge.svg)](https://github.com/vvo/tzdb/actions) [![npm version](https://badge.fury.io/js/%40vvo%2Ftzdb.svg)](https://www.npmjs.com/package/@vvo/tzdb) [![minizipped size](https://badgen.net/bundlephobia/minzip/@vvo/tzdb@latest)](https://bundlephobia.com/result?p=@vvo/tzdb@latest)

This is a list and npm package of:

- "simplified" [IANA time zones](https://www.iana.org/time-zones) with their alternative names like `Pacific Time` instead of `America/Los_Angeles`, along with major cities for each time zone.
- all existing raw IANA time zones names
- "raw" offsets along with current time offsets
- also includes [deprecated time zone names](https://data.iana.org/time-zones/data/backward) for compatibility

The data and npm packages are **automatically updated** whenever there are changes to https://www.geonames.org/ which is generated from IANA databases.

This is useful whenever you want to build a time zone select menu in your application.

## NPM package

Installation:

```bash
npm add @vvo/tzdb
```

Usage:

```js
import { getTimeZones, rawTimeZones, timeZonesNames, abbreviations } from "@vvo/tzdb";
```

## API

### getTimeZones()

```js
const timeZones = getTimeZones();

// You can also provide an optional parameter to include UTC in the result.
// This adds a time zone with the name "UTC" and a fixed offset of 0.
const timeZonesWithUtc = getTimeZones({ includeUtc: true });
```

This method returns an array of time zones objects:

```js
[
  // ...
  {
    name: "America/Los_Angeles",
    alternativeName: "Pacific Time",
    group: ["America/Los_Angeles"],
    continentCode: "NA",
    continentName: "North America",
    countryName: "United States",
    countryCode: "US",
    mainCities: ["Los Angeles", "San Diego", "San Jose", "San Francisco"],
    rawOffsetInMinutes: -480,
    abbreviation: "PST",
    rawFormat: "-08:00 Pacific Time - Los Angeles, San Diego, San Jose, San Francisco",
    currentTimeOffsetInMinutes: -420, // "current" time zone offset, this is why getTimeZones() is a method and not just an object: it works at runtime
    currentTimeFormat: "-07:00 Pacific Time - Los Angeles, San Diego",
  },
  // ...
];
```

When relevant, time zones are grouped. The rules for grouping are:

- if the time zones are in the same country
- if the DST or summer time offsets are the same
- if the non-DST, non-summer time offsets are the same
- then we group the time zones
- the "main" time zone name (`name` attribute), is always the one from the most populated city

Here's a grouping example:

```js
{
  name: "America/Dawson_Creek",
  alternativeName: "Mountain Time",
  group: ["America/Creston", "America/Dawson_Creek", "America/Fort_Nelson"],
  continentCode: "NA",
  continentName: "North America",
  countryName: "Canada",
  countryCode: "CA",
  mainCities: ["Fort St. John", "Creston", "Fort Nelson"],
  rawOffsetInMinutes: -420,
  abbreviation: "MST",
  rawFormat: "-07:00 Mountain Time - Fort St. John, Creston, Fort Nelson",
  currentTimeOffsetInMinutes: -420,
  currentTimeFormat: "-07:00 Mountain Time - Fort St. John, Creston"
}
```

### rawTimeZones

This is an array of time zone objects without the current time information:

```js
[
  // ...
  {
    name: "America/Los_Angeles",
    alternativeName: "Pacific Time",
    group: ["America/Los_Angeles"],
    continentCode: "NA",
    continentName: "North America",
    countryName: "United States",
    countryCode: "US",
    mainCities: ["Los Angeles", "San Diego", "San Jose", "San Francisco"],
    rawOffsetInMinutes: -480,
    abbreviation: "PST",
    rawFormat: "-08:00 Pacific Time - Los Angeles, San Diego, San Jose, San Francisco",
  },
  // ...
];
```

### timeZonesNames

This is an array of time zone names:

```js
[
  // ...
  "America/Juneau",
  "America/Kentucky/Louisville",
  "America/Kentucky/Monticello",
  "America/Kralendijk",
  "America/La_Paz",
  "America/Lima",
  "America/Los_Angeles",
  "America/Lower_Princes",
  "America/Maceio",
  "America/Managua",
  "America/Manaus",
  "America/Marigot",
  "America/Martinique",
  "America/Matamoros",
  // ...
];
```

### abbreviations

This is an object mapping timezone abbreviations to their full forms:

```js
{
  // ...
  "Australian Central Daylight Time": "ACDT",
  "Australian Central Standard Time": "ACST",
  "Australian Central Time": "ACT",
  "Australian Central Western Standard Time": "ACWST",
  "Australian Eastern Daylight Time": "AEDT",
  "Australian Eastern Standard Time": "AEST",
  "Australian Eastern Time": "AET",
  "Australian Western Daylight Time": "AWDT",
  "Australian Western Standard Time": "AWST",
  "Azerbaijan Summer Time": "AZST",
  "Azerbaijan Time": "AZT",
  "Azores Summer Time": "AZOST",
  "Azores Time": "AZOT",
  "Bangladesh Standard Time": "BST",
  "Bhutan Time": "BTT",
  "Bolivia Time": "BOT",
  // ...
};
```

**Caution:** Although abbreviations can be easy to lookup, they can be misleading. For example: CST can refer to Central Standard Time (-06.00 UTC), China Standard Time (+06.00 UTC) or Cuba Standard Time (-05.00 UTC). And abbreviation full forms don't directly map to any property in the time zone objects returned by `rawTimeZones` or `getTimeZones()`.

## Notes

- We provide two cities when grouping happens, ranked by population
- We provide alternative names ("Pacific Time" for "America/Los_Angeles") and remove "Standard", "Daylight" or "Summer" from them
- If you're using this to build a time zone selector and saving to a database then:
  - make sure to save the `name` attribute (`America/Los_Angeles`) in your database
  - when displaying the select with a default value from your database, either select the time zone name that matches, or if the time zone name is part of the group. Example:

```js
const value = timeZones.find((timeZone) => {
  return dbData.timeZone === timeZone.name || timeZone.group.includes(dbData.timeZone);
});
```
