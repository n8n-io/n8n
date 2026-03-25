# `@sinonjs/fake-timers`

[![codecov](https://codecov.io/gh/sinonjs/fake-timers/branch/main/graph/badge.svg)](https://codecov.io/gh/sinonjs/fake-timers)
<a href="CODE_OF_CONDUCT.md"><img src="https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg" alt="Contributor Covenant" /></a>

JavaScript implementation of the timer APIs; `setTimeout`, `clearTimeout`, `setImmediate`, `clearImmediate`, `setInterval`, `clearInterval`, `requestAnimationFrame`, `cancelAnimationFrame`, `requestIdleCallback`, and `cancelIdleCallback`, along with a clock instance that controls the flow of time. FakeTimers also provides a `Date` implementation that gets its time from the clock.

In addition in browser environment `@sinonjs/fake-timers` provides a `performance` implementation that gets its time from the clock. In Node environments FakeTimers provides a `nextTick` implementation that is synchronized with the clock - and a `process.hrtime` shim that works with the clock.

`@sinonjs/fake-timers` can be used to simulate passing time in automated tests and other
situations where you want the scheduling semantics, but don't want to actually
wait.

`@sinonjs/fake-timers` is extracted from [Sinon.JS](https://github.com/sinonjs/sinon.js) and targets the [same runtimes](https://sinonjs.org/releases/latest/#supported-runtimes).

## Autocomplete, IntelliSense and TypeScript definitions

Version 7 introduced JSDoc to the codebase. This should provide autocomplete and type suggestions in supporting IDEs. If you need more elaborate type support, TypeScript definitions for the Sinon projects are independently maintained by the Definitely Types community:

```
npm install -D @types/sinonjs__fake-timers
```

## Installation

`@sinonjs/fake-timers` can be used in both Node and browser environments. Installation is as easy as

```sh
npm install @sinonjs/fake-timers
```

If you want to use `@sinonjs/fake-timers` in a browser you can either build your own bundle or use [Skypack](https://www.skypack.dev).

## Usage

To use `@sinonjs/fake-timers`, create a new clock, schedule events on it using the timer
functions and pass time using the `tick` method.

```js
// In the browser distribution, a global `FakeTimers` is already available
var FakeTimers = require("@sinonjs/fake-timers");
var clock = FakeTimers.createClock();

clock.setTimeout(function () {
    console.log(
        "The poblano is a mild chili pepper originating in the state of Puebla, Mexico."
    );
}, 15);

// ...

clock.tick(15);
```

Upon executing the last line, an interesting fact about the
[Poblano](https://en.wikipedia.org/wiki/Poblano) will be printed synchronously to
the screen. If you want to simulate asynchronous behavior, please see the `async` function variants (eg `clock.tick(time)` vs `await clock.tickAsync(time)`).

The `next`, `runAll`, `runToFrame`, and `runToLast` methods are available to advance the clock. See the
API Reference for more details.

### Faking the native timers

When using `@sinonjs/fake-timers` to test timers, you will most likely want to replace the native
timers such that calling `setTimeout` actually schedules a callback with your
clock instance, not the browser's internals.

Calling `install` with no arguments achieves this. You can call `uninstall`
later to restore things as they were again.

```js
// In the browser distribution, a global `FakeTimers` is already available
var FakeTimers = require("@sinonjs/fake-timers");

var clock = FakeTimers.install();
// Equivalent to
// var clock = FakeTimers.install(typeof global !== "undefined" ? global : window);

setTimeout(fn, 15); // Schedules with clock.setTimeout

clock.uninstall();
// setTimeout is restored to the native implementation
```

To hijack timers in another context pass it to the `install` method.

```js
var FakeTimers = require("@sinonjs/fake-timers");
var context = {
    setTimeout: setTimeout, // By default context.setTimeout uses the global setTimeout
};
var clock = FakeTimers.withGlobal(context).install();

context.setTimeout(fn, 15); // Schedules with clock.setTimeout

clock.uninstall();
// context.setTimeout is restored to the original implementation
```

Usually you want to install the timers onto the global object, so call `install`
without arguments.

#### Automatically incrementing mocked time

FakeTimers supports the possibility to attach the faked timers to any change
in the real system time. This means that there is no need to `tick()` the
clock in a situation where you won't know **when** to call `tick()`.

Please note that this is achieved using the original setImmediate() API at a certain
configurable interval `config.advanceTimeDelta` (default: 20ms). Meaning time would
be incremented every 20ms, not in real time.

An example would be:

```js
var FakeTimers = require("@sinonjs/fake-timers");
var clock = FakeTimers.install({
    shouldAdvanceTime: true,
    advanceTimeDelta: 40,
});

setTimeout(() => {
    console.log("this just timed out"); //executed after 40ms
}, 30);

setImmediate(() => {
    console.log("not so immediate"); //executed after 40ms
});

setTimeout(() => {
    console.log("this timed out after"); //executed after 80ms
    clock.uninstall();
}, 50);
```

## API Reference

### `var clock = FakeTimers.createClock([now[, loopLimit]])`

Creates a clock. The default
[epoch](https://en.wikipedia.org/wiki/Epoch_%28reference_date%29) is `0`.

The `now` argument may be a number (in milliseconds) or a Date object.

The `loopLimit` argument sets the maximum number of timers that will be run when calling `runAll()` before assuming that we have an infinite loop and throwing an error. The default is `1000`.

### `var clock = FakeTimers.install([config])`

Installs FakeTimers using the specified config (otherwise with epoch `0` on the global scope). The following configuration options are available

| Parameter                        | Type        | Default                                                                                                                                                                                                                        | Description                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.now`                     | Number/Date | 0                                                                                                                                                                                                                              | installs FakeTimers with the specified unix epoch                                                                                                                                                                                                                                            |
| `config.toFake`                  | String[]    | ["setTimeout", "clearTimeout", "setImmediate", "clearImmediate","setInterval", "clearInterval", "Date", "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "hrtime", "performance"] | an array with explicit function names (or objects, in the case of "performance") to hijack. _When not set, FakeTimers will automatically fake all methods **except** `nextTick`_ e.g., `FakeTimers.install({ toFake: ["setTimeout","nextTick"]})` will fake only `setTimeout` and `nextTick` |
| `config.loopLimit`               | Number      | 1000                                                                                                                                                                                                                           | the maximum number of timers that will be run when calling runAll()                                                                                                                                                                                                                          |
| `config.shouldAdvanceTime`       | Boolean     | false                                                                                                                                                                                                                          | tells FakeTimers to increment mocked time automatically based on the real system time shift (e.g. the mocked time will be incremented by 20ms for every 20ms change in the real system time)                                                                                                 |
| `config.advanceTimeDelta`        | Number      | 20                                                                                                                                                                                                                             | relevant only when using with `shouldAdvanceTime: true`. increment mocked time by `advanceTimeDelta` ms every `advanceTimeDelta` ms change in the real system time.                                                                                                                          |
| `config.shouldClearNativeTimers` | Boolean     | false                                                                                                                                                                                                                          | tells FakeTimers to clear 'native' (i.e. not fake) timers by delegating to their respective handlers. These are not cleared by default, leading to potentially unexpected behavior if timers existed prior to installing FakeTimers.                                                         |

### `var id = clock.setTimeout(callback, timeout)`

Schedules the callback to be fired once `timeout` milliseconds have ticked by.

In Node.js `setTimeout` returns a timer object. FakeTimers will do the same, however
its `ref()` and `unref()` methods have no effect.

In browsers a timer ID is returned.

### `clock.clearTimeout(id)`

Clears the timer given the ID or timer object, as long as it was created using
`setTimeout`.

### `var id = clock.setInterval(callback, timeout)`

Schedules the callback to be fired every time `timeout` milliseconds have ticked
by.

In Node.js `setInterval` returns a timer object. FakeTimers will do the same, however
its `ref()` and `unref()` methods have no effect.

In browsers a timer ID is returned.

### `clock.clearInterval(id)`

Clears the timer given the ID or timer object, as long as it was created using
`setInterval`.

### `var id = clock.setImmediate(callback)`

Schedules the callback to be fired once `0` milliseconds have ticked by. Note
that you'll still have to call `clock.tick()` for the callback to fire. If
called during a tick the callback won't fire until `1` millisecond has ticked
by.

In Node.js `setImmediate` returns a timer object. FakeTimers will do the same,
however its `ref()` and `unref()` methods have no effect.

In browsers a timer ID is returned.

### `clock.clearImmediate(id)`

Clears the timer given the ID or timer object, as long as it was created using
`setImmediate`.

### `clock.requestAnimationFrame(callback)`

Schedules the callback to be fired on the next animation frame, which runs every
16 ticks. Returns an `id` which can be used to cancel the callback. This is
available in both browser & node environments.

### `clock.cancelAnimationFrame(id)`

Cancels the callback scheduled by the provided id.

### `clock.requestIdleCallback(callback[, timeout])`

Queued the callback to be fired during idle periods to perform background and low priority work on the main event loop. Callbacks which have a timeout option will be fired no later than time in milliseconds. Returns an `id` which can be used to cancel the callback.

### `clock.cancelIdleCallback(id)`

Cancels the callback scheduled by the provided id.

### `clock.countTimers()`

Returns the number of waiting timers. This can be used to assert that a test
finishes without leaking any timers.

### `clock.hrtime(prevTime?)`

Only available in Node.js, mimicks process.hrtime().

### `clock.nextTick(callback)`

Only available in Node.js, mimics `process.nextTick` to enable completely synchronous testing flows.

### `clock.performance.now()`

Only available in browser environments, mimicks performance.now().

### `clock.tick(time)` / `await clock.tickAsync(time)`

Advance the clock, firing callbacks if necessary. `time` may be the number of
milliseconds to advance the clock by or a human-readable string. Valid string
formats are `"08"` for eight seconds, `"01:00"` for one minute and `"02:34:10"`
for two hours, 34 minutes and ten seconds.

The `tickAsync()` will also break the event loop, allowing any scheduled promise
callbacks to execute _before_ running the timers.

### `clock.next()` / `await clock.nextAsync()`

Advances the clock to the the moment of the first scheduled timer, firing it.

The `nextAsync()` will also break the event loop, allowing any scheduled promise
callbacks to execute _before_ running the timers.

### `clock.jump(time)`

Advance the clock by jumping forward in time, firing callbacks at most once.
`time` takes the same formats as [`clock.tick`](#clockticktime--await-clocktickasynctime).

This can be used to simulate the JS engine (such as a browser) being put to sleep and resumed later, skipping intermediary timers.

### `clock.reset()`

Removes all timers and ticks without firing them, and sets `now` to `config.now`
that was provided to `FakeTimers.install` or to `0` if `config.now` was not provided.
Useful to reset the state of the clock without having to `uninstall` and `install` it.

### `clock.runAll()` / `await clock.runAllAsync()`

This runs all pending timers until there are none remaining. If new timers are added while it is executing they will be run as well.

This makes it easier to run asynchronous tests to completion without worrying about the number of timers they use, or the delays in those timers.

It runs a maximum of `loopLimit` times after which it assumes there is an infinite loop of timers and throws an error.

The `runAllAsync()` will also break the event loop, allowing any scheduled promise
callbacks to execute _before_ running the timers.

### `clock.runMicrotasks()`

This runs all pending microtasks scheduled with `nextTick` but none of the timers and is mostly useful for libraries using FakeTimers underneath and for running `nextTick` items without any timers.

### `clock.runToFrame()`

Advances the clock to the next frame, firing all scheduled animation frame callbacks,
if any, for that frame as well as any other timers scheduled along the way.

### `clock.runToLast()` / `await clock.runToLastAsync()`

This takes note of the last scheduled timer when it is run, and advances the
clock to that time firing callbacks as necessary.

If new timers are added while it is executing they will be run only if they
would occur before this time.

This is useful when you want to run a test to completion, but the test recursively
sets timers that would cause `runAll` to trigger an infinite loop warning.

The `runToLastAsync()` will also break the event loop, allowing any scheduled promise
callbacks to execute _before_ running the timers.

### `clock.setSystemTime([now])`

This simulates a user changing the system clock while your program is running.
It affects the current time but it does not in itself cause e.g. timers to fire;
they will fire exactly as they would have done without the call to
setSystemTime().

### `clock.uninstall()`

Restores the original methods of the native timers or the methods on the object
that was passed to `FakeTimers.withGlobal`

### `Date`

Implements the `Date` object but using the clock to provide the correct time.

### `Performance`

Implements the `now` method of the [`Performance`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now) object but using the clock to provide the correct time. Only available in environments that support the Performance object (browsers mostly).

### `FakeTimers.withGlobal`

In order to support creating clocks based on separate or sandboxed environments (such as JSDOM), FakeTimers exports a factory method which takes single argument `global`, which it inspects to figure out what to mock and what features to support. When invoking this function with a global, you will get back an object with `timers`, `createClock` and `install` - same as the regular FakeTimers exports only based on the passed in global instead of the global environment.

## Running tests

FakeTimers has a comprehensive test suite. If you're thinking of contributing bug
fixes or suggesting new features, you need to make sure you have not broken any
tests. You are also expected to add tests for any new behavior.

### On node:

```sh
npm test
```

Or, if you prefer more verbose output:

```
$(npm bin)/mocha ./test/fake-timers-test.js
```

### In the browser

[Mochify](https://github.com/mantoni/mochify.js) is used to run the tests in
PhantomJS. Make sure you have `phantomjs` installed. Then:

```sh
npm test-headless
```

## License

BSD 3-clause "New" or "Revised" License (see LICENSE file)
