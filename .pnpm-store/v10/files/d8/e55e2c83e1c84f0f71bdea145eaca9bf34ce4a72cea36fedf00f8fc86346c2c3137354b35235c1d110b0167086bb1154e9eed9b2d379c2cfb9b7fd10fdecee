# logform

A mutable object-based log format designed for chaining & objectMode streams.

``` js
const { format } = require('logform');

const alignedWithColorsAndTime = format.combine(
  format.colorize(),
  format.timestamp(),
  format.align(),
  format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);
```

- [`info` Objects](#info-objects)
- [Understanding formats](#understanding-formats)
  - [Combining formats](#combining-formats)
  - [Filtering `info` objects](#filtering-info-objects)
- [Formats](#formats)
  - [Align](#align)
  - [CLI](#cli)
  - [Colorize](#colorize)
  - [Combine](#combine)
  - [Errors](#errors)
  - [JSON](#json)
  - [Label](#label)
  - [Logstash](#logstash)
  - [Metadata](#metadata)
  - [PadLevels](#padlevels)
  - [PrettyPrint](#prettyprint)
  - [Printf](#printf)
  - [Simple](#simple)
  - [Splat](#splat)
  - [Timestamp](#timestamp)
  - [Uncolorize](#uncolorize)

## `info` Objects

The `info` parameter provided to a given format represents a single log
message. The object itself is mutable. Every `info` must have at least the
`level` and `message` properties:

``` js
const info = {
  level: 'info',                 // Level of the logging message
  message: 'Hey! Log something?' // Descriptive message being logged.
}
```

Properties **besides level and message** are considered as "`meta`". i.e.:

``` js
const { level, message, ...meta } = info;
```

Several of the formats in `logform` itself add additional properties:

| Property    | Format added by | Description |
| ----------- | --------------- | ----------- |
| `splat`     | `splat()`       | String interpolation splat for `%d %s`-style messages. |
| `timestamp` | `timestamp()`   |  timestamp the message was received. |
| `label`     | `label()`       | Custom label associated with each message. |
| `ms`        | `ms()`          | Number of milliseconds since the previous log message. |

As a consumer you may add whatever properties you wish – _internal state is
maintained by `Symbol` properties:_

- `Symbol.for('level')` _**(READ-ONLY)**:_ equal to `level` property.
  **Is treated as immutable by all code.**
- `Symbol.for('message'):` complete string message set by "finalizing formats":
  - `json`
  - `logstash`
  - `printf`
  - `prettyPrint`
  - `simple`
- `Symbol.for('splat')`: additional string interpolation arguments. _Used
  exclusively by `splat()` format._

These Symbols are stored in another package: `triple-beam` so that all
consumers of `logform` can have the same Symbol reference. i.e.:

``` js
const { LEVEL, MESSAGE, SPLAT } = require('triple-beam');

console.log(LEVEL === Symbol.for('level'));
// true

console.log(MESSAGE === Symbol.for('message'));
// true

console.log(SPLAT === Symbol.for('splat'));
// true
```

## Understanding formats

Formats are prototypal objects (i.e. class instances) that define a single method: `transform(info, opts)` and return the mutated `info`

- `info`: an object representing the log message.
- `opts`: setting specific to the current instance of the format.

They are expected to return one of two things:

- **An `info` Object** representing the modified `info` argument. Object references need not be preserved if immutability is preferred. All current built-in formats consider `info` mutable, but [immutablejs] is being considered for future releases.
- **A falsey value** indicating that the `info` argument should be ignored by the caller. (See: [Filtering `info` Objects](#filtering-info-objects)) below.

`logform.format`  is designed to be as simple as possible. To define a new format simple pass it a `transform(info, opts)` function to get a new `Format`.

The named `Format` returned can be used to create as many copies of the given `Format` as desired:

``` js
const { format } = require('logform');

const volume = format((info, opts) => {
  if (opts.yell) {
    info.message = info.message.toUpperCase();
  } else if (opts.whisper) {
    info.message = info.message.toLowerCase();
  }

  return info;
});

// `volume` is now a function that returns instances of the format.
const scream = volume({ yell: true });
console.dir(scream.transform({
  level: 'info',
  message: `sorry for making you YELL in your head!`
}, scream.options));
// {
//   level: 'info'
//   message: 'SORRY FOR MAKING YOU YELL IN YOUR HEAD!'
// }

// `volume` can be used multiple times to create different formats.
const whisper = volume({ whisper: true });
console.dir(whisper.transform({
  level: 'info',
  message: `WHY ARE THEY MAKING US YELL SO MUCH!`
}), whisper.options);
// {
//   level: 'info'
//   message: 'why are they making us yell so much!'
// }
```

### Combining formats

Any number of formats may be combined into a single format using `format.combine`. Since `format.combine` takes no `opts`, as a convenience it returns pre-created instance of the combined format.

``` js
const { format } = require('logform');
const { combine, timestamp, label } = format;

const labelTimestamp = combine(
  label({ label: 'right meow!' }),
  timestamp()
);

const info = labelTimestamp.transform({
  level: 'info',
  message: 'What time is the testing at?'
});

console.dir(info);
// { level: 'info',
//   message: 'What time is the testing at?',
//   label: 'right meow!',
//   timestamp: '2017-09-30T03:57:26.875Z' }
```

### Filtering `info` Objects

If you wish to filter out a given `info` Object completely then simply return a falsey value.

``` js
const ignorePrivate = format((info, opts) => {
  if (info.private) { return false; }
  return info;
});

console.dir(ignorePrivate.transform({
  level: 'error',
  message: 'Public error to share'
}));
// { level: 'error', message: 'Public error to share' }

console.dir(ignorePrivate.transform({
  level: 'error',
  private: true,
  message: 'This is super secret - hide it.'
}));
// false
```

Use of `format.combine` will respect any falsey values return and stop evaluation of later formats in the series. For example:

``` js
const { format } = require('logform');
const { combine, timestamp, label } = format;

const willNeverThrow = format.combine(
  format(info => { return false })(), // Ignores everything
  format(info => { throw new Error('Never reached') })()
);

console.dir(willNeverThrow.transform({
  level: 'info',
  message: 'wow such testing'
}))
```

## Formats

### Align

The `align` format adds a `\t` delimiter before the message to align it in the same place.

```js
const { format } = require('logform');

const alignFormat = format.align();

const info = alignFormat.transform({
  level: 'info',
  message: 'my message'
});

console.log(info);
// { level: 'info', message: '\tmy message' }
```

This was previously exposed as `{ align: true }` in `winston < 3.0.0`.

### CLI

The `cli` format is a combination of the `colorize` and the `padLevels` formats. It turns a log  `info` object into the same format previously available in `winston.cli()` in `winston < 3.0.0`.

```js
const { format } = require('logform');
const LEVEL = Symbol.for('level');

const cliFormat = format.cli({ colors: { info: 'blue' }});

const info = cliFormat.transform({
  [LEVEL]: 'info',
  level: 'info',
  message: 'my message'
}, { all: true });

console.log(info);
// { level: '\u001b[34minfo\u001b[39m',
//   message: '\u001b[34m    my message\u001b[39m',
//   [Symbol(level)]: 'info',
//   [Symbol(message)]:
//    '\u001b[34minfo\u001b[39m:\u001b[34m    my message\u001b[39m' }
```

### Colorize

The `colorize` format adds different colors depending on the log level to the message and/or level.
It accepts the following options:

* **level**: If set to `true` the color will be applied to the `level`.
* **all**: If set to `true` the color will be applied to the `message` and `level`.
* **message**: If set to `true` the color will be applied to the `message`.
* **colors**: An object containing the colors for the log levels. For example: `{ info: 'blue', error: 'red' }`

```js
const { format } = require('logform');
const LEVEL = Symbol.for('level');

const colorizeFormat = format.colorize({ colors: { info: 'blue' }});

const info = colorizeFormat.transform({
  [LEVEL]: 'info',
  level: 'info',
  message: 'my message'
}, { all: true });

console.log(info);
// { level: '\u001b[34minfo\u001b[39m',
//   message: '\u001b[34mmy message\u001b[39m',
//   [Symbol(level)]: 'info' }
```

This was previously exposed as `{ colorize: true }` to transports in `winston < 3.0.0`.

### Combine

The `combine` Format allows to combine multiple formats:

```js
const { format } = require('logform');
const { combine, timestamp, json } = format;

const jsonWithTimestamp = combine(
  timestamp(),
  json()
);

const info = jsonWithTimestamp.transform({
  level: 'info',
  message: 'my message'
});

console.log(info);
// { level: 'info',
//   message: 'my message',
//   timestamp: '2018-10-02T15:03:14.230Z',
//   [Symbol(message)]:
//    '{"level":"info","message":"my message","timestamp":"2018-10-02T15:03:14.230Z"}' }
```

### Errors

The `errors` format allows you to pass in an instance of a JavaScript `Error`
directly to the logger. It allows you to specify whether not to include the
stack-trace.

```js
const { format } = require('logform');
const { errors } = format;

const errorsFormat = errors({ stack: true })

const info = errorsFormat.transform(new Error('Oh no!'));

console.log(info);
// Error: Oh no!
//     at repl:1:13
//     at ContextifyScript.Script.runInThisContext (vm.js:50:33)
//     at REPLServer.defaultEval (repl.js:240:29)
//     at bound (domain.js:301:14)
//     at REPLServer.runBound [as eval] (domain.js:314:12)
//     at REPLServer.onLine (repl.js:468:10)
//     at emitOne (events.js:121:20)
//     at REPLServer.emit (events.js:211:7)
//     at REPLServer.Interface._onLine (readline.js:282:10)
//     at REPLServer.Interface._line (readline.js:631:8)
```

It will also handle `{ message }` properties as `Error` instances:

```js
const { format } = require('logform');
const { errors } = format;

const errorsFormat = errors({ stack: true })

const info = errorsFormat.transform({
  message: new Error('Oh no!')
});

console.log(info);
// Error: Oh no!
//     at repl:1:13
//     at ContextifyScript.Script.runInThisContext (vm.js:50:33)
//     at REPLServer.defaultEval (repl.js:240:29)
//     at bound (domain.js:301:14)
//     at REPLServer.runBound [as eval] (domain.js:314:12)
//     at REPLServer.onLine (repl.js:468:10)
//     at emitOne (events.js:121:20)
//     at REPLServer.emit (events.js:211:7)
//     at REPLServer.Interface._onLine (readline.js:282:10)
//     at REPLServer.Interface._line (readline.js:631:8)
```

### JSON

The `json` format uses `safe-stable-stringify` to finalize the message.
It accepts the following options:

* **replacer**: A function that influences how the `info` is stringified.
* **space**: The number of white space used to format the json.

```js
const { format } = require('logform');

const jsonFormat = format.json();

const info = jsonFormat.transform({
  level: 'info',
  message: 'my message',
});
console.log(info);
// { level: 'info',
//   message: 'my message',
//   [Symbol(message)]: '{"level":"info","message":"my message"}' }
```

This was previously exposed as `{ json: true }` to transports in `winston < 3.0.0`.

### Label

The `label` format adds the specified `label` before the message or adds it to the `info` object.
It accepts the following options:

* **label**: A label to be added before the message.
* **message**: If set to `true` the `label` will be added to `info.message`. If set to `false` the `label` will be added as `info.label`.

```js
const { format } = require('logform');

const labelFormat = format.label();

const info = labelFormat.transform({
  level: 'info',
  message: 'my message'
}, { label: 'my label', message: true });

console.log(info);
// { level: 'info', message: '[my label] my message' }
```

This was previously exposed as `{ label: 'my label' }` to transports in `winston < 3.0.0`.

### Logstash

The `logstash` Format turns a log `info` object into pure JSON with the appropriate logstash options.

```js
const { format } = require('logform');
const { logstash, combine, timestamp } = format;

const logstashFormat = combine(
  timestamp(),
  logstash()
);

const info = logstashFormat.transform({
  level: 'info',
  message: 'my message'
});

console.log(info);
// { level: 'info',
//   [Symbol(message)]:
//    '{"@message":"my message","@timestamp":"2018-10-02T11:04:52.915Z","@fields":{"level":"info"}}' }
```

This was previously exposed as `{ logstash: true }` to transports in `winston < 3.0.0`.

### Metadata

The `metadata` format adds a metadata object to collect extraneous data, similar to the metadata object in winston 2.x.
It accepts the following options:

* **key**: The name of the key used for the metadata object. Defaults to `metadata`.
* **fillExcept**: An array of keys that should not be added to the metadata object.
* **fillWith**: An array of keys that will be added to the metadata object.

```js
const { format } = require('logform');

const metadataFormat = format.metadata();

const info = metadataFormat.transform({
  level: 'info',
  message: 'my message',
  meta: 42
});

console.log(info);
// { level: 'info', message: 'my message', metadata: { meta: 42 } }
```

### PadLevels

The `padLevels` format pads levels to be the same length.

```js
const { format } = require('logform');
const LEVEL = Symbol.for('level');

const padLevelsFormat = format.padLevels();

const info = padLevelsFormat.transform({
  [LEVEL]: 'info',
  message: 'my message'
});

console.log(info);
// { message: '    my message', [Symbol(level)]: 'info' }
```

This was previously exposed as `{ padLevels: true }` to transports in `winston < 3.0.0`.

### PrettyPrint

The `prettyPrint` format finalizes the message using `util.inspect`.
It accepts the following options:

* **depth**: A `number` that specifies the maximum depth of the `info` object being stringified by `util.inspect`. Defaults to `2`.
* **colorize**: Colorizes the message if set to `true`. Defaults to `false`.

The `prettyPrint` format should not be used in production because it may impact performance negatively and block the event loop.

> **NOTE:** the `LEVEL`, `MESSAGE`, and `SPLAT` symbols are stripped from the
> output message _by design._

This was previously exposed as `{ prettyPrint: true }` to transports in `winston < 3.0.0`.

```js
const { format } = require('logform');

const prettyPrintFormat = format.prettyPrint();

const info = prettyPrintFormat.transform({
  [LEVEL]: 'info',
  level: 'info',
  message: 'my message'
});

console.log(info);
// { level: 'info',
//   message: 'my message',
//   [Symbol(level)]: 'info',
//   [Symbol(message)]: '{ level: \'info\', message: \'my message\' }' }
```

### Printf

The `printf` format allows to create a custom logging format:

```js
const { format } = require('logform');

const myFormat = format.printf((info) => {
  return `${info.level} ${info.message}`;
})

const info = myFormat.transform({
  level: 'info',
  message: 'my message'
});

console.log(info);
// { level: 'info',
//   message: 'my message',
//   [Symbol(message)]: 'info my message' }
```

### Simple

The `simple` format finalizes the `info` object using the format: `level: message stringifiedRest`.
```js
const { format } = require('logform');
const MESSAGE = Symbol.for('message');

const simpleFormat = format.simple();

const info = simpleFormat.transform({
  level: 'info',
  message: 'my message',
  number: 123
});
console.log(info[MESSAGE]);
// info: my message {number:123}
```

### Splat

The `splat` format transforms the message by using `util.format` to complete any `info.message` provided it has string interpolation tokens.

```js
const { format } = require('logform');

const splatFormat = format.splat();

const info = splatFormat.transform({
  level: 'info',
  message: 'my message %s',
  splat: ['test']
});

console.log(info);
// { level: 'info', message: 'my message test', splat: [ 'test' ] }
```

Any additional splat parameters beyond those needed for the `%` tokens
(aka "metas") are assumed to be objects. Their enumerable properties are
merged into the `info`.

```js
const { format } = require('logform');

const splatFormat = format.splat();

const info = splatFormat.transform({
  level: 'info',
  message: 'my message %s',
  splat: ['test', { thisIsMeta: true }]
});

console.log(info);
// { level: 'info',
//   message: 'my message test',
//   thisIsMeta: true,
//   splat: [ 'test' ] }
```

This was previously exposed implicitly in `winston < 3.0.0`.

### Timestamp

The `timestamp` format adds a timestamp to the info.
It accepts the following options:

* **format**: Either the format as a string accepted by the [fecha](https://github.com/taylorhakes/fecha) module or a function that returns a formatted date. If no format is provided `new Date().toISOString()` will be used.
* **alias**: The name of an alias for the timestamp property, that will be added to the `info` object.

```js
const { format } = require('logform');

const timestampFormat = format.timestamp();

const info = timestampFormat.transform({
  level: 'info',
  message: 'my message'
});

console.log(info);
// { level: 'info',
//   message: 'my message',
//   timestamp: '2018-10-02T11:47:02.682Z' }
```

It was previously available in `winston < 3.0.0` as `{ timestamp: true }` and `{ timestamp: function:String }`.


### Uncolorize

The `uncolorize` format strips colors from `info` objects.
It accepts the following options:

* **level**: Disables the uncolorize format for `info.level` if set to `false`.
* **message**: Disables the uncolorize format for `info.message` if set to `false`.
* **raw**: Disables the uncolorize format for `info[MESSAGE]` if set to `false`.

This was previously exposed as `{ stripColors: true }` to transports in `winston < 3.0.0`.

## Tests

Tests are written with `mocha`, `assume`, and `nyc`. They can be run with `npm`:

```
npm test
```

##### LICENSE: MIT
##### AUTHOR: [Charlie Robbins](https://github.com/indexzero)
