# Humanize Duration

[![npm version](https://badge.fury.io/js/humanize-duration.svg)](https://npmjs.org/package/humanize-duration)

I have the time in milliseconds and I want it to become "30 minutes" or "3 days, 1 hour". Enter Humanize Duration!

**This library is actively maintained but no new features will be added.**

## Installation

This package is available as _humanize-duration_ on [npm](https://www.npmjs.com/package/humanize-duration) and Bower. You can also include the JavaScript file in the browser.

```sh
npm install humanize-duration
```

## Basic usage

With `require` (like in Node or with common build systems):

```js
const humanizeDuration = require("humanize-duration");
humanizeDuration(12000);
// => "12 seconds"
```

With a `<script>` tag:

```html
<script src="humanize-duration.js"></script>
<script>
  humanizeDuration(12000);
</script>
```

By default, Humanize Duration will humanize down to the second, and will return a decimal for the smallest unit. It will humanize in English by default.

```js
humanizeDuration(3000);
// => "3 seconds"

humanizeDuration(2250);
// => "2.25 seconds"

humanizeDuration(97320000);
// => "1 day, 3 hours, 2 minutes"
```

## Options

You can change the settings by passing options as the second argument.

### language

Language for unit display. Accepts an [ISO 639-1 code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) from one of the [supported languages](#supported-languages).

Default: `"en"`.

```js
humanizeDuration(3000, { language: "es" });
// => "3 segundos"

humanizeDuration(5000, { language: "ko" });
// => "5 초"
```

### fallbacks

Array of fallback languages, if the provided language cannot be found. Like `language`, accepts an [ISO 639-1 code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) from one of the [supported languages](#supported-languages). It works from left to right, choosing the first language that's found.

Default: `[]`.

```js
humanizeDuration(3000, {
  language: "bad language",
  fallbacks: ["en"],
});
// => "3 seconds"

humanizeDuration(3000, {
  language: "bad language",
  fallbacks: ["another bad language", "es"],
});
// => "3 segundos"
```

### units

Array of possible units to use. Units are `y`, `mo`, `w`, `d`, `h`, `m`, `s`, and `ms`.

Units are skipped if their count is zero. For example, if you pass a duration of `1000` and units `["h", "m", "s"]`, the output will be "1 second".

Must be in descending order of unit size. For example, `["h", "m"]` is valid but `["m", "h"]` is not.

Default: `["y", "mo", "w", "d", "h", "m", "s"]`

```js
humanizeDuration(69000, { units: ["h", "m", "s", "ms"] });
// => "1 minute, 9 seconds"

humanizeDuration(3600000, { units: ["h"] });
// => "1 hour"

humanizeDuration(3600000, { units: ["m"] });
// => "60 minutes"

humanizeDuration(3600000, { units: ["d", "h"] });
// => "1 hour"
```

### largest

Integer representing the maximum number of units to use.

Default: `Infinity`

```js
humanizeDuration(1000000000000);
// => "31 years, 8 months, 1 week, 19 hours, 46 minutes, 40 seconds"

humanizeDuration(1000000000000, { largest: 2 });
// => "31 years, 8 months"
```

### round

A boolean that, if `true`, rounds the smallest unit.

Default: `false`

```js
humanizeDuration(1200);
// => "1.2 seconds"

humanizeDuration(1200, { round: true });
// => "1 second"

humanizeDuration(1600, { round: true });
// => "2 seconds"
```

### delimiter

String to display between units.

Default: `", "` in most languages, `" ﻭ "` for Arabic

```js
humanizeDuration(22140000);
// => "6 hours, 9 minutes"

humanizeDuration(22140000, { delimiter: " and " });
// => "6 hours and 9 minutes"
```

### spacer

String to display between the count and the word.

Default: `" "`

```js
humanizeDuration(260040000);
// => "3 days, 14 minutes"

humanizeDuration(260040000, { spacer: " whole " });
// => "3 whole days, 14 whole minutes"
```

### decimal

String to display between the integer and decimal parts of a count, if relevant.

Default depends on the language.

```js
humanizeDuration(1200);
// => "1.2 seconds"

humanizeDuration(1200, { decimal: " point " });
// => "1 point 2 seconds"
```

### conjunction

String to include before the final unit.

You can also set `serialComma` to `false` to eliminate the final comma.

Default: `""`

```js
humanizeDuration(22140000, { conjunction: " and " });
// => "6 hours and 9 minutes"

humanizeDuration(22141000, { conjunction: " and " });
// => "6 hours, 9 minutes, and 1 second"

humanizeDuration(22140000, { conjunction: " and ", serialComma: false });
// => "6 hours and 9 minutes"

humanizeDuration(22141000, { conjunction: " and ", serialComma: false });
// => "6 hours, 9 minutes and 1 second"
```

### maxDecimalPoints

Integer that defines the maximum number of decimal points to show, if relevant. If `undefined`, the count will be converted to a string using [`Number.prototype.toString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toString).

This does not round any numbers. See [the `round` option](#round).

Default: `undefined`

```js
humanizeDuration(8123.456789);
// => "8.123456789 seconds"

humanizeDuration(8123.456789, { maxDecimalPoints: 3 });
// => "8.123 seconds"

humanizeDuration(8100, { maxDecimalPoints: 99 });
// => "8.1 seconds"

humanizeDuration(8000, { maxDecimalPoints: 99 });
// => "8 seconds"

humanizeDuration(7999, { maxDecimalPoints: 2 });
// => "7.99 seconds"
```

### digitReplacements

Array of ten strings to which will replace the numerals 0-9. Useful if a language uses different numerals.

Default: `undefined` for most languages, `["۰", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]` for Arabic

```js
humanizeDuration(1234);
// => "1.234 seconds"

humanizeDuration(1234, {
  digitReplacements: [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ],
});
// => "One.TwoThreeFour seconds"
```

### unitMeasures

_Use this option with care. It is an advanced feature._

Object used to customize the value used to calculate each unit of time. Most useful when you want to update the length of years or months, which have ambiguous lengths.

Default: `{ y: 31557600000, mo: 2629800000, w: 604800000, d: 86400000, h: 3600000, m: 60000, s: 1000, ms: 1 }`

```js
humanizeDuration(2629800000);
// => "1 month"

humanizeDuration(2629800000, {
  unitMeasures: {
    y: 31557600000,
    mo: 30 * 86400000,
    w: 604800000,
    d: 86400000,
    h: 3600000,
    m: 60000,
    s: 1000,
    ms: 1,
  },
});
// => "1 month, 10 hours, 30 minutes"
```

## Humanizers

If you find yourself setting same options over and over again, you can create a _humanizer_ that changes the defaults, which you can still override later.

```js
const spanishHumanizer = humanizeDuration.humanizer({
  language: "es",
  units: ["y", "mo", "d"],
});

spanishHumanizer(71177400000);
// => "2 años, 3 meses, 2 días"

spanishHumanizer(71177400000, { units: ["d", "h"] });
// => "823 días, 19.5 horas"
```

You can also add new languages to humanizers. For example:

```js
const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: "shortEn",
  languages: {
    shortEn: {
      y: () => "y",
      mo: () => "mo",
      w: () => "w",
      d: () => "d",
      h: () => "h",
      m: () => "m",
      s: () => "s",
      ms: () => "ms",
    },
  },
});

shortEnglishHumanizer(15600000);
// => "4 h, 20 m"
```

You can also add languages after initializing:

```js
const humanizer = humanizeDuration.humanizer();

humanizer.languages.shortEn = {
  y: () => "y",
  // ...
```

Internally, the main `humanizeDuration` function is just a wrapper around a humanizer.

## Supported languages

Humanize Duration supports the following languages:

| Language             | Code      |
| -------------------- | --------- |
| Afrikaans            | `af`      |
| Albanian             | `sq`      |
| Amharic              | `am`      |
| Arabic               | `ar`      |
| Basque               | `eu`      |
| Bengali              | `bn`      |
| Bulgarian            | `bg`      |
| Catalan              | `ca`      |
| Central Kurdish      | `ckb`     |
| Chinese, simplified  | `zh_CN`   |
| Chinese, traditional | `zh_TW`   |
| Croatian             | `hr`      |
| Czech                | `cs`      |
| Danish               | `da`      |
| Dutch                | `nl`      |
| English              | `en`      |
| Esperanto            | `eo`      |
| Estonian             | `et`      |
| Faroese              | `fo`      |
| Farsi/Persian        | `fa`      |
| Finnish              | `fi`      |
| French               | `fr`      |
| German               | `de`      |
| Greek                | `el`      |
| Hebrew               | `he`      |
| Hindi                | `hi`      |
| Hungarian            | `hu`      |
| Icelandic            | `is`      |
| Indonesian           | `id`      |
| Italian              | `it`      |
| Japanese             | `ja`      |
| Kannada              | `kn`      |
| Khmer                | `km`      |
| Korean               | `ko`      |
| Kurdish              | `ku`      |
| Lao                  | `lo`      |
| Latvian              | `lv`      |
| Lithuanian           | `lt`      |
| Macedonian           | `mk`      |
| Mongolian            | `mn`      |
| Malay                | `ms`      |
| Marathi              | `mr`      |
| Norwegian            | `no`      |
| Polish               | `pl`      |
| Portuguese           | `pt`      |
| Romanian             | `ro`      |
| Russian              | `ru`      |
| Serbian (Cyrillic)   | `sr`      |
| Serbian (Latin)      | `sr_Latn` |
| Slovak               | `sk`      |
| Slovenian            | `sl`      |
| Spanish              | `es`      |
| Swahili              | `sw`      |
| Swedish              | `sv`      |
| Tamil                | `ta`      |
| Telugu               | `te`      |
| Thai                 | `th`      |
| Turkish              | `tr`      |
| Ukrainian            | `uk`      |
| Urdu                 | `ur`      |
| Uzbek                | `uz`      |
| Uzbek (Cyrillic)     | `uz_CYR`  |
| Vietnamese           | `vi`      |
| Welsh                | `cy`      |

For a list of supported languages, you can use the `getSupportedLanguages` function. The results may not be in the same order every time.

```js
humanizeDuration.getSupportedLanguages();
// => ["af", "ar", "bg", "bn", "ca", ...]
```

This function won't return any new languages you define; it will only return the defaults supported by the library.

## Credits

Lovingly made by [Evan Hahn](https://evanhahn.com/) with help from:

- [Martin Prins](https://github.com/magarcia) for language support
- [Filipi Siqueira](https://github.com/filipi777) for Portuguese support
- [Peter Rekdal Sunde](https://github.com/peters) for Norwegian support
- [Michał Janiec](https://github.com/mjjaniec) for Polish support
- [Eileen Li](https://github.com/eileen3) for Chinese support
- [Tommy Brunn](https://github.com/Nevon) for Swedish support
- [Giovanni Pellerano](https://github.com/evilaliv3) for Italian support
- [Rahma Sghaier](https://twitter.com/sghaierrahma) for Arabic support
- [Evgenios Kastanias](https://github.com/evgenios) for Greek support
- [Oleksii Mylotskyi](https://github.com/spalax) for Ukrainian support
- [Patrik Simek](https://github.com/patriksimek) for Czech support
- [Toni Helminen](https://github.com/tonihelminen) for Finnish support
- [Vidmantas Drasutis](https://github.com/Drasius2) for Lithuanian support
- [Manh Tuan](https://github.com/J2TeaM) for Vietnamese support
- [Leonard Lee](https://github.com/sheeeng) for Indonesian & Malay support
- [Jesse Jackson](https://github.com/jsejcksn) for documentation help
- [Óli Tómas Freysson](https://github.com/olitomas) for Icelandic support
- [Saeed Ganji](https://github.com/shahabganji) for Farsi/Persian support
- [Caner Elci](https://github.com/canerelci) for Bulgarian support
- [Matej Kolesár](https://github.com/rasel-sk) for Slovak support
- [Abdul Jalil](https://github.com/abduljalilm94) for Urdu support
- [Wasuwat Limsuparhat](https://github.com/rappad) for Thai support
- Malikoun for Lao support
- [Villu Orav](https://github.com/villu164) for Estonian support
- [Harijs Deksnis](https://github.com/arcanous) for Latvian support
- [Nirmala Thapa(Subit)](https://github.com/nirmalathapa) for Faroese support
- [Fahad Kassim](https://github.com/fadsel) for Swahili support
- [Prayag Roy Choudhury](https://github.com/BeardyGod) for updating Mocha
- [Aryan Rawlani](https://github.com/aryanrawlani28) for Hindi support
- [Kristijan Jesenski](https://github.com/kjesenski) for Slovenian support
- [Michal Karzel](https://github.com/Misioka) for improving Arabic support
- [Mikias Menjeta](https://github.com/OMikiasO) for Amharic support

Licensed under the permissive [Unlicense](https://unlicense.org/). Enjoy!

## Related modules

- [pretty-ms](https://github.com/sindresorhus/pretty-ms)
- [angularjs-humanize-duration](https://github.com/sebastianhaas/angularjs-humanize-duration)
- [millisec](https://github.com/sungwoncho/millisec)
- [HumanizeDuration.ts](https://github.com/Nightapes/HumanizeDuration.ts), a TypeScript version of this module
- [aurelia-time](https://github.com/shahabganji/aurelia-time)
- [@visulima/humanizer](https://github.com/visulima/visulima/tree/main/packages/humanizer) is a fork that adds `timeAdverb`, an abbreviated format, and more
- [Fork that adds a `timeAdverb` option](https://github.com/cmldk/HumanizeDuration.js)
- [Fork that provides the duration in an abbreviated format](https://github.com/rasa/HumanizeDuration.js), ex: `1d 2h 3m 4s`
