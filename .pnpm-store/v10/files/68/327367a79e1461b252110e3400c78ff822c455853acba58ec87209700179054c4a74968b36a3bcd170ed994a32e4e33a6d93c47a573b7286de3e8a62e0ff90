# timeago.js

> **timeago.js** is a nano library(less than `2 kb`)  used to format datetime with `*** time ago` statement. eg: '3 hours ago'.

 - i18n supported.
 - Time `ago` and time `in` supported.
 - Real-time render supported.
 - Node and browser supported.
 - Well tested.

[Official website](https://timeago.org/). React version here: [timeago-react](https://github.com/hustcc/timeago-react). Python version here: [timeago](https://github.com/hustcc/timeago).

[![npm Version](https://img.shields.io/npm/v/timeago.js.svg)](https://www.npmjs.com/package/timeago.js)
[![unpkg](https://img.shields.io/npm/v/timeago.js?label=cdn)](https://unpkg.com/browse/timeago.js/)
[![Build Status](https://github.com/hustcc/timeago.js/workflows/build/badge.svg)](https://github.com/hustcc/timeago.js/actions)
[![Coverage Status](https://coveralls.io/repos/github/hustcc/timeago.js/badge.svg?branch=master)](https://coveralls.io/github/hustcc/timeago.js?branch=master)
[![Dist gzip](https://img.badgesize.io/https://unpkg.com/timeago.js/dist/timeago.min.js?compression=gzip)](https://unpkg.com/timeago.js/dist/timeago.min.js)
[![npm Download](https://img.shields.io/npm/dm/timeago.js.svg)](https://www.npmjs.com/package/timeago.js)
[![npm License](https://img.shields.io/npm/l/timeago.js.svg)](https://www.npmjs.com/package/timeago.js)


Such as

```plain
just now
12 seconds ago
2 hours ago
3 days ago
3 weeks ago
2 years ago

in 12 seconds
in 3 minutes
in 24 days
in 6 months
```


## Usage

 - install

```bash
npm install timeago.js
```

 - import

```ts
import { format, render, cancel, register } from 'timeago.js';
```

or import with `script` tag in html file and access global variable `timeago`.

```html
<script src="dist/timeago.min.js"></script>
```

 - example

```ts
// format the time with locale
format('2016-06-12', 'en_US');
```


## API

There only 4 API below.

 - **format**

> `format(date[, locale = 'en_US', opts])`, format a Date instance / timestamp / date string to string.

```ts
import { format } from 'timeago.js';

// format timestamp
format(1544666010224);

// format date instance
format(new Date(1544666010224));

// format date string
format('2018-12-12');

// format with locale
format(1544666010224, 'zh_CN');

// format with locale and relative date
format(1544666010224, 'zh_CN', { relativeDate: '2018-11-11' });

// e.g.
format(Date.now() - 11 * 1000 * 60 * 60); // returns '11 hours ago'
``` 

The default locale is `en_US`, and the library contains `en_US` and `zh_CN` build-in.

 - **render** & **cancel**
   
> `render(dom[, locale = 'en_US', opts])`  
> `cancel([dom])`

> Make a dom with `datetime` attribute automatic rendering and cancel.

HTML code:

```html
<div class="timeago" datetime="2016-06-30 09:20:00"></div>
```

Javascript code:

```ts
import { render, cancel } from 'timeago.js';

const nodes = document.querySelectorAll('.timeago');

// use render method to render nodes in real time
render(nodes, 'zh_CN');

// render with opts
// render(nodes, 'en_US', { minInterval: 3 });

// cancel all real-time render task
cancel();

// or cancel for the specific one
cancel(nodes[0])
```

The 3rd parameter `opts` contains:

```ts
export type Opts = {
  /** the relative date */
  readonly relativeDate?: TDate;
  /** the realtime min update interval */
  readonly minInterval?: number;
};
``` 

> The DOM object should have the attribute `datetime` with date formatted string.

 - **register**

> `register(locale, localeFunc)`, register a new locale, build-in locale contains: `en_US`, `zh_CN`, [all locales here](src/lang).

You can register your own language with `register` API.

```ts
const localeFunc = (number: number, index: number, totalSec: number): [string, string] => {
  // number: the timeago / timein number;
  // index: the index of array below;
  // totalSec: total seconds between date to be formatted and today's date;
  return [
    ['just now', 'right now'],
    ['%s seconds ago', 'in %s seconds'],
    ['1 minute ago', 'in 1 minute'],
    ['%s minutes ago', 'in %s minutes'],
    ['1 hour ago', 'in 1 hour'],
    ['%s hours ago', 'in %s hours'],
    ['1 day ago', 'in 1 day'],
    ['%s days ago', 'in %s days'],
    ['1 week ago', 'in 1 week'],
    ['%s weeks ago', 'in %s weeks'],
    ['1 month ago', 'in 1 month'],
    ['%s months ago', 'in %s months'],
    ['1 year ago', 'in 1 year'],
    ['%s years ago', 'in %s years']
  ][index];
};
// register your locale with timeago
register('my-locale', localeFunc);

// use it
format('2016-06-12', 'my-locale');
```


## Contributions

1. The website is based on [rmm5t/jquery-timeago](https://github.com/rmm5t/jquery-timeago) which is a nice and featured project but it depends on jQuery.
2. **locale translations**: The library needs more locale translations. You can:

 - Open an issue to write the locale translations, or submit a pull request. How to ? see [locales translation](src/lang/).
 - Please **test** the locale by exec `npm test`. How to write test cases, see [locales test cases](__tests__/lang/).


## LICENSE

MIT@[hustcc](https://github.com/hustcc)
