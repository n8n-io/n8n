<p align="center">
  <img src="logo.svg" alt="cron for Node.js logo" height="150">
  <br />
  <b>cron</b> is a robust tool for running jobs (functions or commands) on schedules defined using the cron syntax.
  <br />
  Perfect for tasks like data backups, notifications, and many more!
</p>

# Cron for Node.js

[![Version](https://img.shields.io/npm/v/cron?label=version&logo=npm)](https://www.npmjs.com/package/cron)
[![Monthly Downloads](https://img.shields.io/npm/dm/cron?logo=npm)](https://www.npmjs.com/package/cron)
[![Build Status](https://img.shields.io/github/actions/workflow/status/kelektiv/node-cron/release.yml?logo=github)](https://github.com/kelektiv/node-cron/actions/workflows/release.yml)
[![CodeQL Status](https://img.shields.io/github/actions/workflow/status/kelektiv/node-cron/codeql.yml?logo=github&label=CodeQL)](https://github.com/kelektiv/node-cron/actions/workflows/codeql.yml)
[![Coverage](https://img.shields.io/codecov/c/gh/kelektiv/node-cron?logo=codecov)](https://app.codecov.io/gh/kelektiv/node-cron)
[![Renovate](https://img.shields.io/badge/renovate-enabled-dark_green)](https://github.com/kelektiv/node-cron/issues/718)
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/kelektiv/node-cron?label=openssf%20scorecard)](https://securityscorecards.dev/viewer/?uri=github.com/kelektiv/node-cron)
[![Discord](https://img.shields.io/discord/1075597081017851934?logo=discord)](https://discord.gg/yyKns29zch)

## 🌟 Features

- execute a function whenever your scheduled job triggers
- execute a job external to the javascript process (like a system command) using `child_process`
- use a Date or Luxon DateTime object instead of cron syntax as the trigger for your callback
- use an additional slot for seconds (leaving it off will default to 0 and match the Unix behavior)

## 🚀 Installation

```bash
npm install cron
```

## Table of Contents

1. [Features](#-features)
2. [Installation](#-installation)
3. [Migrating](#-migrating)
4. [Basic Usage](#-basic-usage)
5. [Cron Patterns](#-cron-patterns)
   - [Cron Syntax Overview](#-cron-patterns)
   - [Supported Ranges](#supported-ranges)
6. [API](#-api)
   - [Standalone Functions](#standalone-functions)
   - [CronJob Class](#cronjob-class)
   - [CronTime Class](#crontime-class)
7. [Gotchas](#-gotchas)
8. [Community](#-community)
   - [Join the Community](#-community)
9. [Contributing](#-contributing)
   - [General Contribution](#-contributing)
   - [Submitting Bugs/Issues](#-submitting-bugsissues)
10. [Acknowledgements](#-acknowledgements)
11. [License](#-license)

## ⬆ Migrating

v4 dropped Node v16 and renamed the `job.running` property:

<details>
  <summary>Migrating from v3 to v4</summary>

### Dropped Node version

Node v16 is no longer supported. Upgrade your Node installation to Node v18 or above

### Property renamed and now read-only

You can no longer set the `running` property (now `isActive`). It is read-only. To start or stop a cron job, use `job.start()` and `job.stop()`.

</details>

v3 introduced TypeScript and tighter Unix cron pattern alignment:

<details>
  <summary>Migrating from v2 to v3</summary>

### Month & day-of-week indexing changes

- **Month Indexing:** Changed from `0-11` to `1-12`. So you need to increment all numeric months by 1.

- **Day-of-Week Indexing:** Support added for `7` as Sunday.

### Adjustments in `CronJob`

- The constructor no longer accepts an object as its first and only params. Use `CronJob.from(argsObject)` instead.
- Callbacks are now called in the order they were registered.
- `nextDates(count?: number)` now always returns an array (empty if no argument is provided). Use `nextDate()` instead for a single date.

### Removed methods

- removed `job()` method in favor of `new CronJob(...args)` / `CronJob.from(argsObject)`

- removed `time()` method in favor of `new CronTime()`

</details>

## 🛠 Basic Usage

```javascript
import { CronJob } from 'cron';

const job = new CronJob(
	'* * * * * *', // cronTime
	function () {
		console.log('You will see this message every second');
	}, // onTick
	null, // onComplete
	true, // start
	'America/Los_Angeles' // timeZone
);
// job.start() is optional here because of the fourth parameter set to true.
```

```javascript
// equivalent job using the "from" static method, providing parameters as an object
const job = CronJob.from({
	cronTime: '* * * * * *',
	onTick: function () {
		console.log('You will see this message every second');
	},
	start: true,
	timeZone: 'America/Los_Angeles'
});
```

> **Note:** In the first example above, the fourth parameter to `CronJob()` starts the job automatically. If not provided or set to falsy, you must explicitly start the job using `job.start()`.

For more advanced examples, check the [examples directory](https://github.com/kelektiv/node-cron/tree/main/examples).

## ⏰ Cron Patterns

Cron patterns are the backbone of this library. Familiarize yourself with the syntax:

```
- `*` Asterisks: Any value
- `1-3,5` Ranges: Ranges and individual values
- `*/2` Steps: Every two units
```

Detailed patterns and explanations are available at [crontab.org](http://crontab.org). The examples in the link have five fields, and 1 minute as the finest granularity, but our cron scheduling supports an enhanced format with six fields, allowing for second-level precision. Tools like [crontab.guru](https://crontab.guru/) can help in constructing patterns but remember to account for the seconds field.

### Supported Ranges

Here's a quick reference to the UNIX Cron format this library uses, plus an added second field:

```
field          allowed values
-----          --------------
second         0-59
minute         0-59
hour           0-23
day of month   1-31
month          1-12 (or names, see below)
day of week    0-7 (0 or 7 is Sunday, or use names)
```

> Names can also be used for the 'month' and 'day of week' fields. Use the first three letters of the particular day or month (case does not matter). Ranges and lists of names are allowed.  
> Examples: "mon,wed,fri", "jan-mar".

## 📖 API

### Standalone Functions

- `sendAt`: Indicates when a `CronTime` will execute (returns a Luxon `DateTime` object).

  ```javascript
  import * as cron from 'cron';

  const dt = cron.sendAt('0 0 * * *');
  console.log(`The job would run at: ${dt.toISO()}`);
  ```

- `timeout`: Indicates the number of milliseconds in the future at which a `CronTime` will execute (returns a number).

  ```javascript
  import * as cron from 'cron';

  const timeout = cron.timeout('0 0 * * *');
  console.log(`The job would run in ${timeout}ms`);
  ```

- `validateCronExpression`: Validates if a given cron expression is valid (returns an object with `valid` and `error` properties).

  ```javascript
  import * as cron from 'cron';

  const validation = cron.validateCronExpression('0 0 * * *');
  console.log(`Is the cron expression valid? ${validation.valid}`);
  if (!validation.valid) {
  	console.error(`Validation error: ${validation.error}`);
  }
  ```

### CronJob Class

#### Constructor

`constructor(cronTime, onTick, onComplete, start, timeZone, context, runOnInit, utcOffset, unrefTimeout, waitForCompletion, errorHandler, name, threshold)`:

- `cronTime`: [REQUIRED] - The time to fire off your job. Can be cron syntax, a JS [`Date`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date) object or a Luxon [`DateTime`](https://moment.github.io/luxon/api-docs/index.html#datetime) object.

- `onTick`: [REQUIRED] - Function to execute at the specified time. If an `onComplete` callback was provided, `onTick` will receive it as an argument.

- `onComplete`: [OPTIONAL] - Invoked when the job is halted with `job.stop()`. It might also be triggered by `onTick` post its run.

- `start`: [OPTIONAL] - Determines if the job should commence before constructor exit. Default is `false`.

- `timeZone`: [OPTIONAL] - Sets the execution time zone. Default is local time. Check valid formats in the [Luxon documentation](https://github.com/moment/luxon/blob/master/docs/zones.md#specifying-a-zone).

- `context`: [OPTIONAL] - Execution context for the onTick method.

- `runOnInit`: [OPTIONAL] - Instantly triggers the `onTick` function post initialization. Default is `false`.

- `utcOffset`: [OPTIONAL] - Specifies time zone offset in minutes. Cannot co-exist with `timeZone`.

- `unrefTimeout`: [OPTIONAL] - Useful for controlling event loop behavior. More details [here](https://nodejs.org/api/timers.html#timers_timeout_unref).

- `waitForCompletion`: [OPTIONAL] - If `true`, no additional instances of the `onTick` callback function will run until the current onTick callback has completed. Any new scheduled executions that occur while the current callback is running will be skipped entirely. Default is `false`.

- `errorHandler`: [OPTIONAL] - Function to handle any exceptions that occur in the `onTick` method.

- `name`: [OPTIONAL] - Name of the job. Useful for identifying jobs in logs.

- `threshold`: [OPTIONAL] - Threshold in ms to control whether to execute or skip missed execution deadlines caused by slow or busy hardware. Execution delays within threshold will be executed immediately, and otherwise will be skipped. In both cases a warning will be printed to the console with the job name and cron expression. See [issue #962](https://github.com/kelektiv/node-cron/issues/962) for more information. Default is `250`.

#### Methods

- `from` (static): Create a new CronJob object providing arguments as an object. See argument names and descriptions above.

- `start`: Initiates the job.

- `stop`: Halts the job.

- `setTime`: Modifies the time for the `CronJob`. Parameter must be a `CronTime`.

- `lastDate`: Provides the last execution date.

- `nextDate`: Indicates the subsequent date that will activate an `onTick`.

- `nextDates(count)`: Supplies an array of upcoming dates that will initiate an `onTick`.

- `fireOnTick`: Allows modification of the `onTick` calling behavior.

- `addCallback`: Permits addition of `onTick` callbacks.

#### Properties

- `isActive`: [READ-ONLY] Indicates if a job is active (checking to see if the callback needs to be called).

- `isCallbackRunning`: [READ-ONLY] Indicates if a callback is currently executing.

  ```javascript
  const job = new CronJob('* * * * * *', async () => {
  	console.log(job.isCallbackRunning); // true during callback execution
  	await someAsyncTask();
  	console.log(job.isCallbackRunning); // still true until callback completes
  });

  console.log(job.isCallbackRunning); // false
  job.start();
  console.log(job.isActive); // true
  console.log(job.isCallbackRunning); // false
  ```

### CronTime Class

#### Constructor

`constructor(time, zone, utcOffset)`:

- `time`: [REQUIRED] - The time to initiate your job. Accepts cron syntax or a JS [Date](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date) object.

- `zone`: [OPTIONAL] - Equivalent to `timeZone` from `CronJob` parameters.

- `utcOffset`: [OPTIONAL] - Analogous to `utcOffset` from `CronJob` parameters.

## 💢 Gotchas

- Both JS `Date` and Luxon `DateTime` objects don't guarantee millisecond precision due to computation delays. This module excludes millisecond precision for standard cron syntax but allows execution date specification through JS `Date` or Luxon `DateTime` objects. However, specifying a precise future execution time, such as adding a millisecond to the current time, may not always work due to these computation delays. It's observed that delays less than 4-5 ms might lead to inconsistencies. While we could limit all date granularity to seconds, we've chosen to allow greater precision but advise users of potential issues.

- Using arrow functions for `onTick` binds them to the parent's `this` context. As a result, they won't have access to the cronjob's `this` context. You can read a little more in issue [#47 (comment)](https://github.com/kelektiv/node-cron/issues/47#issuecomment-459762775).

## 🤝 Community

Join the [Discord server](https://discord.gg/yyKns29zch)! Here you can discuss issues and get help in a more casual forum than GitHub.

## 🌍 Contributing

This project is looking for help! If you're interested in helping with the project, please take a look at our [contributing documentation](https://github.com/kelektiv/node-cron/blob/main/CONTRIBUTING.md).

### 🐛 Submitting Bugs/Issues

Please have a look at our [contributing documentation](https://github.com/kelektiv/node-cron/blob/main/CONTRIBUTING.md), it contains all the information you need to know before submitting an issue.

## 🙏 Acknowledgements

This is a community effort project. In the truest sense, this project started as an open source project from [cron.js](http://github.com/padolsey/cron.js) and grew into something else. Other people have contributed code, time, and oversight to the project. At this point there are too many to name here so we'll just say thanks.

Special thanks to [Hiroki Horiuchi](https://github.com/horiuchi), [Lundarl Gholoi](https://github.com/winup) and [koooge](https://github.com/koooge) for their work on the [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) typings before they were imported in v2.4.0.

## ⚖ License

MIT
