<img align="right" src="icon.png"></img>

# B.S. Logger [![Build Status](https://travis-ci.org/huafu/bs-logger.svg?branch=master)](https://travis-ci.org/huafu/bs-logger) [![Coverage Status](https://img.shields.io/coveralls/huafu/bs-logger/master.svg)](https://coveralls.io/github/huafu/bs-logger?branch=master) [![Beerpay](https://beerpay.io/huafu/bs-logger/badge.svg?style=beer-square)](https://beerpay.io/huafu/bs-logger)  [![Beerpay](https://beerpay.io/huafu/bs-logger/make-wish.svg?style=flat-square)](https://beerpay.io/huafu/bs-logger?focus=wish)

**Opinionated bare simple logger for NodeJS (with TypeScript typings)**.

BSLogger has been created after being disapointed not finding a matching logger on the internet. Not that others aren't good, they just did not fit what I was looking for.

Here is what I was looking for (and tried to implemented in BSLogger):
- light memory usage
- easily extendable (see `child` method)
- as few dependencies as possible
- ability to define all targets in a string (so that `ENV` vars can be used)
- when using file targets, not re-opening them
- reasonable defautls:
  - logs warnings and above to `stderr`
  - logs JSON to files
- no overhead if it's not going to log anywhere

## TL,DR:

Install:
```sh
npm install --save bs-logger
# or
yarn add bs-logger
```
Use:
```js
const { logger } = require('bs-logger');
//    or
// import logger from 'bs-logger';
//    or
// import { logger } from 'bs-logger';
//    as default exports the logger

logger('foo');
logger.debug('bar');
logger.warn({foo: 'bar'}, 'dummy', 'other'/*, ...*/);
```

More complex example:
```js
// env MY_LOG_TARGETS="debug.log:trace,stderr:warn%json"
import { createLogger } from 'bs-logger';
const logger = createLogger({
  context: {namespace: 'http'},
  targets: process.env.MY_LOG_TARGETS,
  translate: (m) => {
    if (process.env.NODE_ENV === 'production') {
      m.context = { ...m.context, secret: null };
    }
    return m;
  },
});
// [...]
logger.debug({secret: 'xyz'}, 'trying to login')
// will log into debug.log `trying to login` with secret in the context except in prod

const login = logger.wrap(function login() {
  // your login code
})
// [...]
login();
// will log `calling login` with the arguments in context
```

## Usage

### Creating a logger

#### Root logger

BSLogger exports a global logger lazyly created on first use, but it is advised to create your own using the `createLogger()` helper:

- If you are using it in a library wich is meant to be re-distributed:
  ```js
  import { createLogger, LogContexts } 'bs-logger';
  const logger = createLogger({ [LogContexts.package]: 'my-pacakge' });
  ```

- If you are using it in an application of your own:
  ```js
  import { createLogger, LogContexts } 'bs-logger';
  const logger = createLogger({ [LogContexts.application]: 'my-app' });
  ```

#### Child logger

Child loggers extends the context, targets and message translators from their parent. You create a child logger using the `child` method:

```js
const childLogger = logger.child({ [LogContexts.namespace]: 'http' })
// childLogger becomes a new logger
```

### Logging

Any helper to log within BSLogger is a function which has the same signature as `console.log()`, and also accepts an **optional** first argument being the context. A context is any `object`, with some specific (but optional) properties which we'll see later.

```ts
logMethod(message: string, ...args: any[]): void
  // or
logMethod(context: LogContext, message: string, ...args: any[]): void
```

#### Directly

You can log using any logger as a function directly (if the logger or its possible parent(s) has not been created with any log level in its context, no level will be attached):
```js
import { createLogger } from 'bs-logger'
const logger = createLogger()
// [...]
logger('my message');
```

#### Using level helpers

BSLogger is aware of 6 log levels (`trace`, `debug`, `info`, `warn`, `error` and `fatal`) but you can create your owns. A log level is basically a number. The higher it is, the more important will be the message. You can find log levels constants in `LogLevels` export:
```js
import { LogLevels } from 'bs-logger';

const traceLevelValue = LogLevels.trace;
const debugLevelValue = LogLevels.debug;
// etc.
```

For each log level listed above, a logger will have a helper method to directly log using this level:
```js
import { createLogger } from 'bs-logger'
const logger = createLogger()
// [...]
logger.trace('foo')
logger.debug('bar')
// etc.
```

Those helpers are the equivalent to
```js
logger({ [LogContexts.logLevel]: level }, 'foo')
```
...except that they'll be replaced with an empty function on the first call if their level will not be handled by any target.

### Wrapping functions

Each logger has a `wrap` method which you can use to wrap a function. If there is no matching log target, the `wrap` method will simply return your function, else it'll wrap it in another function of same signature. The wrapper will, before calling your function, log a message with received arguments in the context.

```ts
// With `F` being the type of your funciton:
logger.wrap(func: F): F
  // or
logger.wrap(message: string, func: F): F
  // or
logger.wrap(context: LogContext, messages: string, func: F): F
```

### Defining target(s)

Each root logger (created using `createLogger` helper) is attached to 0 or more "target". A target is responsible of writing a log entry somewhere. It is an object with the following properties:

- **minLevel** `string`: The minimum log level this target's strem writer will be called for
- **stream** `{ write: (str: string) => void }`: An object with a write function (like node's `stream.Writable`) which will be used to write log entries
- **format** `(msg: LogMessage) => string`: A formatter which will be used to transform a log entry (message object) into a string

#### Using targets

When using the global logger, or if no `targets` specified when creating a logger, calling log methods will output to STDERR anything which has log level higher or equal to `warn`. This can be modified as follow by defineing the `LOG_TARGETS` environment variable or passing the `targets` option to `createLogger`. The `targets` can be an array of `LogTarget` (see above) or a `string` defining a list of one or more targets separated by comma (`,`). A `string` target is composed as follow:
- The file path, absolute or relative to CWD. It can also be the specials `stdout` or `stderr` strings (case insensitive). When giving a path to a file, if it ends with the plus sign (`+`) the log data will be appended to the file instead of re-creating the file for each run.
- An optional minimum log level after a colon (`:`). It should be a `number` or the log level name (ie `trace`, `error`, ...).
- An optional formatter name after a percent sign (`%`). There are 2 included formatter: `json` (used for files by default) and `simple` (used for `stdout` and `stderr` by default). See below to define your own.

Examples:
- `debug.log%simple,stdout:fatal`
  - Log everything to `debug.log` file in CWD dir (re-creates the file for each run). Uses the `simple` formatter.
  - Log only messages with level >= `fatal` to the standard out.
- `errors.log+:error,debug.log:15`
  - Log only messages with level >= `error` to `errors.log` file (without re-creating the file at each run).
  - Log only messages with level >= 15 to `debug.log` file (re-creates the file for each run).

#### Custom formatters

A custom formatter is a function that takes a `LogMessage` object and returns a `string`. It can be registered giving it a name using the `registerLogFormatter` helper:

```js
import { registerLogFormatter, createLogger } from 'bs-logger';
registerLogFormatter('foo', m => `${m.sequence} ${new Date(m.tim).toLocaleString()} ${m.message}`);
const logger = createLogger({
  targets: 'stdout%foo', // specifying out formatter
  });
```

### Testing

The whole `testing` namespace has useful helpers for using BSLogger while unit testing your product.

In your tests you would usually prefer not having any logging to happen, or you would like to check what has been logged but without actually logging it to any target.

The `testing` namespace holds all testing utilities:
```js
import { testing } from 'bs-logger'
```

- If you use the root logger, here is how to disable its output:
```js
testing.setup()
```
and the `logger` (or `default`) export will become a `LoggerMock` instance (see below).

- If you create logger(s) using `createLogger`, when testing use the `testing.createLoggerMock` instead. It accepts the same first argument, with an extra second argument, optional, being the `LogTargetMock` to be used (see below).

#### LoggerMock

Loggers created using the `testing` namespace will have one and only one log target being a `LogTargetMock`, and that target will be set on the `target` extra property of the logger.

Here are the extra properties of `LogTargetMock` which you can then use for testing:

- **messages** `LogMessage[]`: all log message objects which would have normally be logged
  - **last** `LogMessage`: the last one being logged
  - **trace** `LogMessage[]`: all log message objects with `trace` level
    - **last** `LogMessage`: last one with `trace` level
  - **debug** `LogMessage[]`: all log message objects with `debug` level
    - **last** `LogMessage`: last one with `debug` level
  - ...
- **lines** `string[]`: all formatted log message lines which would have normally be logged
  - **last** `string`: the last one being logged
  - **trace** `string[]`: all formatted log message lines with `trace` level
    - **last** `string`: last one with `trace` level
  - **debug** `string[]`: all formatted log message lines with `debug` level
    - **last** `string`: last one with `debug` level
  - ...
- **clear** `() => void`: method to clear all log message objects and formatted lines
- **filteredMessages** `(level: number | null, untilLevel?: number) => LogMessage[]`: method to filter log message objects
- **filteredLins** `(level: number | null, untilLevel?: number) => string[]`: method to filter formatted log message lines

#### Example

Let's say you have a `logger.js` file in which you create the logger for your app:
```js
// file: logger.js
import { testing, createLogger, LogContexts } from 'bs-logger';

const factory = process.env.TEST ? testing.createLoggerMock : createLogger;

export default factory({ [LogContexts.application]: 'foo' });
```

In a test you could:
```js
import logger from './logger';
// in `fetch(url)` you'd use the logger like `logger.debug({url}, 'GET')` when the request is actually made
import fetch from './http';

test('it should cache request', () => {
  logger.target.clear();
  fetch('http://foo.bar/dummy.json');
  expect(logger.target.messages.length).toBe(1);
  fetch('http://foo.bar/dummy.json');
  expect(logger.target.messages.length).toBe(1);
  // you can also expect on the message:
  expect(logger.target.messages.last.message).toBe('GET')
  expect(logger.target.messages.last.context.url).toBe('http://foo.bar/dummy.json')
  // or (mock target formater prefix the message with `[level:xxx] ` when there is a level)
  expect(logger.target.lines.last).toBe('[level:20] GET')
  // or filtering with level:
  expect(logger.target.lines.debug.last).toBe('[level:20] GET')
});
```

## Installing

Add to your project with `npm`:

```bash
npm install --save bs-logger
```

or with `yarn`:

```bash
yarn add bs-logger
```

## Running the tests

You need to get a copy of the repository to run the tests:

```bash
git clone https://github.com/huafu/bs-logger.git
cd bs-logger
npm run test
```

## Built With

* [TypeScript](https://www.typescriptlang.org/)
* [ts-jest](https://github.com/kulshekhar/ts-jest)

## Contributing

Pull requests welcome!

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/huafu/bs-logger/tags).

## Authors

* **Huafu Gandon** - *Initial work* - [huafu](https://github.com/huafu)

See also the list of [contributors](https://github.com/huafu/bs-logger/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Support on Beerpay
Hey dude! Help me out for a couple of :beers:!

[![Beerpay](https://beerpay.io/huafu/bs-logger/badge.svg?style=beer-square)](https://beerpay.io/huafu/bs-logger)  [![Beerpay](https://beerpay.io/huafu/bs-logger/make-wish.svg?style=flat-square)](https://beerpay.io/huafu/bs-logger?focus=wish)
