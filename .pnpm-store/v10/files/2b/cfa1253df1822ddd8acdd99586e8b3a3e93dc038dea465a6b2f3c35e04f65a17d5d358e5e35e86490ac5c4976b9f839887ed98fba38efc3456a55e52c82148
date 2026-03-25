# `diagnostics`

Diagnostics in the evolution of debug pattern that is used in the Node.js core,  
this extremely small but powerful technique can best be compared as feature
flags for loggers. The created debug logger is disabled by default but can be
enabled without changing a line of code, using flags.

- Allows debugging in multiple JavaScript environments such as Node.js, browsers
  and React-Native.
- Separated development and production builds to minimize impact on your
  application when bundled.
- Allows for customization of logger, messages, and much more.

![Output Example](example.png)

## Installation

The module is released in the public npm registry and can be installed by
running:

```
npm install --save @dabh/diagnostics
```

## Usage

- [Introduction](#introduction)
- [Advanced usage](#advanced-usage)
  - [Production and development builds](#production-and-development-builds)
    - [WebPack](#webpack)
    - [Node.js](#nodejs)
- [API](#api)
  - [.enabled](#enabled)
  - [.namespace](#namespace)
  - [.dev/prod](#devprod)
  - [set](#set)
  - [modify](#modify)
  - [use](#use)
- [Modifiers](#modifiers)
  - [namespace](#namespace-1)
- [Adapters](#adapters)
  - [process.env](#process-env)
  - [hash](#hash)
  - [localStorage](#localstorage)
  - [AsyncStorage](#asyncstorage)
- [Loggers](#loggers)

### Introduction

To create a new logger simply `require` the `@dabh/diagnostics` module and call
the returned function. It accepts 2 arguments:

1. `namespace` **Required** This is the namespace of your logger so we know if we need to
   enable your logger when a debug flag is used. Generally you use the name of
   your library or application as first root namespace. For example if you're
   building a parser in a library (example) you would set namespace
   `example:parser`.
2. `options` An object with additional configuration for the logger.
   following keys are recognized:
   - `force` Force the logger to be enabled.
   - `colors` Colors are enabled by default for the logs, but you can set this
     option to `false` to disable it.

```js
const debug = require('@dabh/diagnostics')('foo:bar:baz');
const debug = require('@dabh/diagnostics')('foo:bar:baz', { options });

debug('this is a log message %s', 'that will only show up when enabled');
debug('that is pretty neat', { log: 'more', data: 1337 });
```

Unlike `console.log` statements that add and remove during your development
lifecycle you create meaningful log statements that will give you insight in
the library or application that you're developing.

The created debugger uses different "adapters" to extract the debug flag
out of the JavaScript environment. To learn more about enabling the debug flag
in your specific environment click on one of the enabled adapters below.

- **browser**: [localStorage](#localstorage), [hash](#hash)
- **node.js**: [environment variables](#processenv)
- **react-native**: [AsyncStorage](#asyncstorage)

Please note that the returned logger is fully configured out of the box, you
do not need to set any of the adapters/modifiers your self, they are there
for when you want more advanced control over the process. But if you want to
learn more about that, read the next section.

### Advanced usage

There are 2 specific usage patterns for `diagnostic`, library developers who
implement it as part of their modules and applications developers who either
use it in their application or are searching for ways to consume the messages.

With the simple log interface as discussed in the [introduction](#introduction)
section we make it easy for developers to add it as part of their libraries
and applications, and with powerful [API](#api) we allow infinite customization
by allowing custom adapters, loggers and modifiers to ensure that this library
maintains relevant. These methods not only allow introduction of new loggers,
but allow you think outside the box. For example you can maintain a history
of past log messages, and output those when an uncaught exception happens in
your application so you have additional context

```js
const diagnostics = require('@dabh/diagnostics');

let index = 0;
const limit = 200;
const history = new Array(limit);

//
// Force all `diagnostic` loggers to be enabled.
//
diagnostics.force = process.env.NODE_ENV === 'prod';
diagnostics.set(function customLogger(meta, message) {
  history[index]= { meta, message, now: Date.now() };
  if (index++ === limit) index = 0;

  //
  // We're running a development build, so output.
  //
  if (meta.dev) console.log.apply(console, message);
});

process.on('uncaughtException', async function (err) {
  await saveErrorToDisk(err, history);
  process.exit(1);
});
```

The small snippet above will maintain a 200 limited FIFO (First In First Out)
queue of all debug messages that can be referenced when your application crashes

#### Production and development builds

When you `require` the `@dabh/diagnostics` module you will be given a logger that is
optimized for `development` so it can provide the best developer experience
possible.

The development logger enables all the [adapters](#adapters) for your
JavaScript environment, adds a logger that outputs the messages to `console.log`
and registers our message modifiers so log messages will be prefixed with the
supplied namespace so you know where the log messages originates from.

The development logger does not have any adapter, modifier and logger enabled
by default. This ensures that your log messages never accidentally show up in
production. However this does not mean that it's not possible to get debug
messages in production. You can `force` the debugger to be enabled, and
supply a [custom logger](#loggers).

```js
const diagnostics = require('@dabh/diagnostics');
const debug = debug('foo:bar', { force: true });

//
// Or enable _every_ diagnostic instance:
//
diagnostics.force = true;
```

##### WebPack

WebPack has the concept of [mode](https://webpack.js.org/concepts/mode/#usage)'s
which creates different

```js
module.exports = {
  mode: 'development' // 'production'
}
```

When you are building your app using the WebPack CLI you can use the `--mode`
flag:

```
webpack --mode=production app.js -o /dist/bundle.js
```

##### Node.js

When you are running your app using `Node.js` you should the `NODE_ENV`
environment variable to `production` to ensure that you libraries that you
import are optimized for production.

```
NODE_ENV=production node app.js
```

### API

The returned logger exposes some addition properties that can be used used in
your application or library:

#### .enabled

The returned logger will have a `.enabled` property assigned to it. This boolean
can be used to check if the logger was enabled:

```js
const debug = require('@dabh/diagnostics')('foo:bar');

if (debug.enabled) {
  //
  // Do something special
  //
}
```

This property is exposed as:

- Property on the logger.
- Property on the meta/options object.

#### .namespace

This is the namespace that you originally provided to the function.

```js
const debug = require('@dabh/diagnostics')('foo:bar');

console.log(debug.namespace); // foo:bar
```

This property is exposed as:

- Property on the logger.
- Property on the meta/options object.

#### .dev/prod

There are different builds available of `diagnostics`, when you create a
production build of your application using `NODE_ENV=production` you will be
given an optimized, smaller build of `diagnostics` to reduce your bundle size.
The `dev` and `prod` booleans on the returned logger indicate if you have a
production or development version of the logger.

```js
const debug = require('@dabh/diagnostics')('foo:bar');

if (debug.prod) {
  // do stuff
}
```

This property is exposed as:

- Property on the logger.
- Property on the meta/options object.

#### set

Sets a new logger as default for  **all** `diagnostic` instances. The passed
argument should be a function that write the log messages to where ever you
want. It receives 2 arguments:

1. `meta` An object with all the options that was provided to the original
   logger that wants to write the log message as well as properties of the
   debugger such as `prod`, `dev`, `namespace`, `enabled`. See [API](#api) for
   all exposed properties.
2. `args` An array of the log messages that needs to be written.

```js
const debug = require('@dabh/diagnostics')('foo:more:namespaces');

debug.use(function logger(meta, args) {
  console.log(meta);
  console.debug(...args);
});
```

This method is exposed as:

- Method on the logger.
- Method on the meta/options object.
- Method on `diagnostics` module.

#### modify

The modify method allows you add a new message modifier to **all** `diagnostic`
instances. The passed argument should be a function that returns the passed
message after modification. The function receives 2 arguments:

1. `message`, Array, the log message.
2. `options`, Object, the options that were passed into the logger when it was
   initially created.

```js
const debug = require('@dabh/diagnostics')('example:modifiers');

debug.modify(function (message, options) {
  return messages;
});
```

This method is exposed as:

- Method on the logger.
- Method on the meta/options object.
- Method on `diagnostics` module.

See [modifiers](#modifiers) for more information.

#### use

Adds a new `adapter` to **all** `diagnostic` instances. The passed argument
should be a function returns a boolean that indicates if the passed in
`namespace` is allowed to write log messages.

```js
const diagnostics = require('@dabh/diagnostics');
const debug = diagnostics('foo:bar');

debug.use(function (namespace) {
  return namespace === 'foo:bar';
});
```

This method is exposed as:

- Method on the logger.
- Method on the meta/options object.
- Method on `diagnostics` module.

See [adapters](#adapters) for more information.

### Modifiers

To be as flexible as possible when it comes to transforming messages we've
come up with the concept of `modifiers` which can enhance the debug messages.
This allows you to introduce functionality or details that you find important
for debug messages, and doesn't require us to add additional bloat to the
`diagnostic` core.

For example, you want the messages to be prefixed with the date-time of when
the log message occured:

```js
const diagnostics = require('@dabh/diagnostics');

diagnostics.modify(function datetime(args, options) {
  args.unshift(new Date());
  return args;
});
```

Now all messages will be prefixed with date that is outputted by `new Date()`.
The following modifiers are shipped with `diagnostics` and are enabled in
**development** mode only:

- [namespace](#namespace)

#### namespace

This modifier is enabled for all debug instances and prefixes the messages
with the name of namespace under which it is logged. The namespace is colored
using the `colorspace` module which groups similar namespaces under the same
colorspace. You can have multiple namespaces for the debuggers where each
namespace should be separated by a `:`

```
foo
foo:bar
foo:bar:baz
```

For console based output the `namespace-ansi` is used.

### Adapters

Adapters allows `diagnostics` to pull the `DEBUG` and `DIAGNOSTICS` environment
variables from different sources. Not every JavaScript environment has a
`process.env` that we can leverage. Adapters allows us to have different
adapters for different environments. It means you can write your own custom
adapter if needed as well.

The `adapter` function should be passed a function as argument, this function
will receive the `namespace` of a logger as argument and it should return a
boolean that indicates if that logger should be enabled or not.

```js
const debug = require('@dabh/diagnostics')('example:namespace');

debug.adapter(require('@dabh/diagnostics/adapters/localstorage'));
```

The modifiers are only enabled for `development`. The following adapters are
available are available:

#### process.env

This adapter is enabled for `node.js`.

Uses the `DEBUG` or `DIAGNOSTICS` (both are recognized) environment variables to
pass in debug flag:

**UNIX/Linux/Mac**
```
DEBUG=foo* node index.js
```

Using environment variables on Windows is a bit different, and also depends on
toolchain you are using:

**Windows**
```
set DEBUG=foo* & node index.js
```

**Powershell**
```
$env:DEBUG='foo*';node index.js
```

#### hash

This adapter is enabled for `browsers`.

This adapter uses the `window.location.hash` of as source for the environment
variables. It assumes that hash is formatted using the same syntax as query
strings:

```js
http://example.com/foo/bar#debug=foo*
```

It triggers on both the `debug=` and `diagnostics=` names.

#### localStorage

This adapter is enabled for `browsers`.

This adapter uses the `localStorage` of the browser to store the debug flags.
You can set the debug flag your self in your application code, but you can
also open browser WebInspector and enable it through the console.

```js
localStorage.setItem('debug', 'foo*');
```

It triggers on both the `debug` and `diagnostics` storage items. (Please note
that these keys should be entered in lowercase)

#### AsyncStorage

This adapter is enabled for `react-native`.

This adapter uses the `AsyncStorage` API that is exposed by the `react-native`
library to store and read the `debug` or `diagnostics` storage items.

```js
import { AsyncStorage } from 'react-native';

AsyncStorage.setItem('debug', 'foo*');
```

Unlike other adapters, this is the only adapter that is `async` so that means
that we're not able to instantly determine if a created logger should be
enabled or disabled. So when a logger is created in `react-native` we initially
assume it's disabled, any message that send during period will be queued
internally.

Once we've received the data from the `AsyncStorage` API we will determine
if the logger should be enabled, flush the queued messages if needed and set
all `enabled` properties accordingly on the returned logger.

### Loggers

By default it will log all messages to `console.log` in when the logger is
enabled using the debug flag that is set using one of the adapters.

## License

[MIT](LICENSE)
