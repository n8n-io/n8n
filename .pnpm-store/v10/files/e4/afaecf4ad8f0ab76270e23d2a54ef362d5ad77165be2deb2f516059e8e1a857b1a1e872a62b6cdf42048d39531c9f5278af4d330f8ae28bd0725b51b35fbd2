# Google Logging Tools

## About
This package defines an ad-hoc debug logger utility that can be used as a lightweight alternative to "printf debugging" via `console.log`, and provides more, and more structured information. It is based largely on the ideas of the Node `util.debuglog` function, and the `debug` npm package.

## Contracts
These are logging utilities meant primarily for use as an "adhoc debug logger" inside Google libraries. It's possible to use this outside of that context, but it is currently not supported. (You're on your own.)

Additionally, everything about the debug logging is not intended to be a stable interface - you can't rely on messages to remain the same, or to continue to exist from one version to the next. For now, it is meant to be a tool for local usage by users, to get the equivalent of "printf debugging" output. In the future, it may tie into more things (OpenTelemetry Logging, etc). Structured log output is possible for vacuuming into Cloud Logging.

This npm package itself is intended to follow semver standards for its own interfaces, but no guarantees are made for supported time windows, etc.

## Usage
The user interface for this logging is very similar to Node's built-in logging. The primary unit of logging is called a "system", and some libraries may have sub-units called "subsystems". You separate the system and subsystem with a colon, like "pubsub:leasing" or similar. Wildcards may be used (e.g. "pubsub:*"), and multiple of these system/system:subsystem pairs may be listed out, separated by commas. For generated GAPIC libraries, the "system" will generally be the part of the package name specific to the library (e.g. `@google-cloud/translate` will be `translate`).

The environment variable for activating logging is `GOOGLE_SDK_NODE_LOGGING`. So you could run your application similarly to this:

```
GOOGLE_SDK_NODE_LOGGING=translate node yourApp.js
```

Or even enable everything, though you might end up with a firehose if you have multiple libraries as dependencies:

```
GOOGLE_SDK_NODE_LOGGING=* node yourApp.js
```

## Logging
Logging functions are created by calling the `log()` function. You pass a system or system:subsystem identifier, and a function is returned. This function may be called directly:

```
const logger = log('test');
logger({other:{metadata: 'foo'}}, 'format string %j', {formatted: 'parameter'});
```

You may also call shorthands that set the `severity` metadata field, and use defaults for the metadata object generally:

```
logger.debug('format string %s', 'string');
logger.info('format string %s', 'string');
logger.warn('format string %s', 'string');
logger.error('format string %s', 'string');
```

Finally, the logger function may be used to create a "sub-log", i.e. adding a sub-system to a system:

```
const sublogger = logger.sublog('specific');
logger.info('big one');
sublogger.info('specific!');
```

This will output two logs, filed under `test` and `test:specific`, respectively.

## Backends
Additionally, there is a concept of a logging backend. You can manually set where you want logs to go, by default, and how you want them processed. The `setBackend()` function lets you set a backend manually. `undefined` (reset to defaults) and `null` (disable logging) are also possible options.

The package provides several built-in options:

* `getNodeBackend()` This is the default that comes with setting the environment variable. It detects the possibility of coloration in the terminal and formats outputs using `util.format()`.
* `getDebugBackend(debugpkg)` This interfaces with the `debug` npm package. You'd essentially do something like `setBackend(getDebugBackend(require('debug')))`.
* `getStructuredBackend(upstream?)`. This converts log output into structured log JSON objects, suitable for feeding into Cloud Logging. An optional `upstream` parameter lets you funnel the output through another backend instead of `console.log`.

## Hooking logs
The log objects you receive from calling `log()` can be hooked as event emitters, like so:

```
loggingFunc.on('log', (fields: LogFields, args: unknown[]) => {
  // Process logs as you like.
});
```

This will not prevent normal log output, and system/system:subsystem identifiers will be cached to make sure that all logs of the same name will output to the same event handlers.
