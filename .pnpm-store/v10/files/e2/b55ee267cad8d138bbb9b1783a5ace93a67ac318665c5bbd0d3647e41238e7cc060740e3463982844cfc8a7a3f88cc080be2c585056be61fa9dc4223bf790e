[![Build status](https://github.com/DirtyHairy/async-mutex/workflows/Build%20and%20Tests/badge.svg)](https://github.com/DirtyHairy/async-mutex/actions?query=workflow%3A%22Build+and+Tests%22)
[![NPM version](https://badge.fury.io/js/async-mutex.svg)](https://badge.fury.io/js/async-mutex)
[![Coverage Status](https://coveralls.io/repos/github/DirtyHairy/async-mutex/badge.svg?branch=master)](https://coveralls.io/github/DirtyHairy/async-mutex?branch=master)

# What is it?

This package implements primitives for synchronizing asynchronous operations in
Javascript.

## Mutex

The term "mutex" usually refers to a data structure used to synchronize
concurrent processes running on different threads. For example, before accessing
a non-threadsafe resource, a thread will lock the mutex. This is guaranteed
to block the thread until no other thread holds a lock on the mutex and thus
enforces exclusive access to the resource. Once the operation is complete, the
thread releases the lock, allowing other threads to acquire a lock and access the
resource.

While Javascript is strictly single-threaded, the asynchronous nature of its
execution model allows for race conditions that require similar synchronization
primitives. Consider for example a library communicating with a web worker that
needs to exchange several subsequent messages with the worker in order to achieve
a task. As these messages are exchanged in an asynchronous manner, it is perfectly
possible that the library is called again during this process. Depending on the
way state is handled during the async process, this will lead to race conditions
that are hard to fix and even harder to track down.

This library solves the problem by applying the concept of mutexes to Javascript.
Locking the mutex will return a promise that resolves once the mutex becomes
available. Once the async process is complete (usually taking multiple
spins of the event loop), a callback supplied to the caller should be called in order
to release the mutex, allowing the next scheduled worker to execute.

# Semaphore

Imagine a situation where you need to control access to several instances of
a shared resource. For example, you might want to distribute images between several
worker processes that perform transformations, or you might want to create a web
crawler that performs a defined number of requests in parallel.

A semaphore is a data structure that is initialized with an arbitrary integer value and that
can be locked multiple times.
As long as the semaphore value is positive, locking it will return the current value
and the locking process will continue execution immediately; the semaphore will
be decremented upon locking. Releasing the lock will increment the semaphore again.

Once the semaphore has reached zero, the next process that attempts to acquire a lock
will be suspended until another process releases its lock and this increments the semaphore
again.

This library provides a semaphore implementation for Javascript that is similar to the
mutex implementation described above.

# How to use it?

## Installation

You can install the library into your project via npm

    npm install async-mutex

The library is written in TypeScript and will work in any environment that
supports ES5, ES6 promises and `Array.isArray`. On ancient browsers,
a shim can be used (e.g. [core-js](https://github.com/zloirock/core-js)).
No external typings are required for using this library with
TypeScript (version >= 2).

Starting with Node 12.16 and 13.7, native ES6 style imports are supported.

**WARNING:** Node 13 versions < 13.2.0 fail to import this package correctly.
Node 12 and earlier are fine, as are newer versions of Node 13.

## Importing

**CommonJS:**
```javascript
var Mutex = require('async-mutex').Mutex;
var Semaphore = require('async-mutex').Semaphore;
var withTimeout = require('async-mutex').withTimeout;
```

**ES6:**
```javascript
import {Mutex, Semaphore, withTimeout} from 'async-mutex';
```

**TypeScript:**
```typescript
import {Mutex, MutexInterface, Semaphore, SemaphoreInterface, withTimeout} from 'async-mutex';
```

With the latest version of Node, native ES6 style imports are supported.

##  Mutex API

### Creating

```typescript
const mutex = new Mutex();
```

Create a new mutex.

### Synchronized code execution

Promise style:
```typescript
mutex
    .runExclusive(() => {
        // ...
    })
    .then((result) => {
        // ...
    });
```

async/await:
```typescript
await mutex.runExclusive(async () => {
    // ...
});
```

`runExclusive` schedules the supplied callback to be run once the mutex is unlocked.
The function may return a promise. Once the promise is resolved or rejected (or immediately after
execution if an immediate value was returned),
the mutex is released. `runExclusive` returns a promise that adopts the state of the function result.

The mutex is released and the result rejected if an exception occurs during execution
of the callback.

### Manual locking / releasing

Promise style:
```typescript
mutex
    .acquire()
    .then(function(release) {
        // ...

        release();
    });
```

async/await:
```typescript
const release = await mutex.acquire();
try {
    // ...
} finally {
    release();
}
```

`acquire` returns an (ES6) promise that will resolve as soon as the mutex is
available. The promise resolves with a function `release` that
must be called once the mutex should be released again. The `release` callback
is idempotent.

**IMPORTANT:** Failure to call `release` will hold the mutex locked and will
likely deadlock the application. Make sure to call `release` under all circumstances
and handle exceptions accordingly.

### Unscoped release

As an alternative to calling the `release` callback returned by `acquire`, the mutex
can be released by calling `release` directly on it:

```typescript
mutex.release();
```

### Checking whether the mutex is locked

```typescript
mutex.isLocked();
```

### Cancelling pending locks

Pending locks can be cancelled by calling `cancel()` on the mutex. This will reject
all pending locks with `E_CANCELED`:

Promise style:
```typescript
import {E_CANCELED} from 'async-mutex';

mutex
    .runExclusive(() => {
        // ...
    })
    .then(() => {
        // ...
    })
    .catch(e => {
        if (e === E_CANCELED) {
            // ...
        }
    });
```

async/await:
```typescript
import {E_CANCELED} from 'async-mutex';

try {
    await mutex.runExclusive(() => {
        // ...
    });
} catch (e) {
    if (e === E_CANCELED) {
        // ...
    }
}
```

This works with `acquire`, too:
if `acquire` is used for locking, the resulting promise will reject with `E_CANCELED`.

The error that is thrown can be customized by passing a different error to the `Mutex`
constructor:

```typescript
const mutex = new Mutex(new Error('fancy custom error'));
```

Note that while all pending locks are cancelled, a currently held lock will not be
revoked. In consequence, the mutex may not be available even after `cancel()` has been called.

### Waiting until the mutex is available

You can wait until the mutex is available without locking it by calling `waitForUnlock()`.
This will return a promise that resolve once the mutex can be acquired again. This operation
will not lock the mutex, and there is no guarantee that the mutex will still be available
once an async barrier has been encountered.

Promise style:
```typescript
mutex
    .waitForUnlock()
    .then(() => {
        // ...
    });
```

Async/await:
```typescript
await mutex.waitForUnlock();
// ...
```


##  Semaphore API

### Creating

```typescript
const semaphore = new Semaphore(initialValue);
```

Creates a new semaphore. `initialValue` is an arbitrary integer that defines the
initial value of the semaphore.

### Synchronized code execution

Promise style:
```typescript
semaphore
    .runExclusive(function(value) {
        // ...
    })
    .then(function(result) {
        // ...
    });
```

async/await:
```typescript
await semaphore.runExclusive(async (value) => {
    // ...
});
```

`runExclusive` schedules the supplied callback to be run once the semaphore is available.
The callback will receive the current value of the semaphore as its argument.
The function may return a promise. Once the promise is resolved or rejected (or immediately after
execution if an immediate value was returned),
the semaphore is released. `runExclusive` returns a promise that adopts the state of the function result.

The semaphore is released and the result rejected if an exception occurs during execution
of the callback.

`runExclusive` accepts a first optional argument `weight`. Specifying a `weight` will decrement the
semaphore by the specified value, and the callback will only be invoked once the semaphore's
value greater or equal to `weight`.

`runExclusive` accepts a second optional argument `priority`. Specifying a greater value for `priority`
tells the scheduler to run this task before other tasks. `priority` can be any real number. The default
is zero.

### Manual locking / releasing

Promise style:
```typescript
semaphore
    .acquire()
    .then(function([value, release]) {
        // ...

        release();
    });
```

async/await:
```typescript
const [value, release] = await semaphore.acquire();
try {
    // ...
} finally {
    release();
}
```

`acquire` returns an (ES6) promise that will resolve as soon as the semaphore is
available. The promise resolves to an array with the
first entry being the current value of the semaphore, and the second value a
function that must be called to release the semaphore once the critical operation
has completed. The `release` callback is idempotent.

**IMPORTANT:** Failure to call `release` will hold the semaphore locked and will
likely deadlock the application. Make sure to call `release` under all circumstances
and handle exceptions accordingly.

`acquire` accepts a first optional argument `weight`. Specifying a `weight` will decrement the
semaphore by the specified value, and the semaphore will only be acquired once its
value is greater or equal to `weight`.

`acquire` accepts a second optional argument `priority`. Specifying a greater value for `priority`
tells the scheduler to release the semaphore to the caller before other callers. `priority` can be
any real number. The default is zero.

### Unscoped release

As an alternative to calling the `release` callback returned by `acquire`, the semaphore
can be released by calling `release` directly on it:

```typescript
semaphore.release();
```

`release` accepts an optional argument `weight` and increments the semaphore accordingly.

**IMPORTANT:** Releasing a previously acquired semaphore with the releaser that was
returned by acquire will automatically increment the semaphore by the correct weight. If
you release by calling the unscoped `release` you have to supply the correct weight
yourself!

### Getting the semaphore value

```typescript
semaphore.getValue()
```

### Checking whether the semaphore is locked

```typescript
semaphore.isLocked();
```

The semaphore is considered to be locked if its value is either zero or negative.

### Setting the semaphore value

The value of a semaphore can be set directly to a desired value. A positive value will
cause the semaphore to schedule any pending waiters accordingly.

```typescript
semaphore.setValue();
```

### Cancelling pending locks

Pending locks can be cancelled by calling `cancel()` on the semaphore. This will reject
all pending locks with `E_CANCELED`:

Promise style:
```typescript
import {E_CANCELED} from 'async-mutex';

semaphore
    .runExclusive(() => {
        // ...
    })
    .then(() => {
        // ...
    })
    .catch(e => {
        if (e === E_CANCELED) {
            // ...
        }
    });
```

async/await:
```typescript
import {E_CANCELED} from 'async-mutex';

try {
    await semaphore.runExclusive(() => {
        // ...
    });
} catch (e) {
    if (e === E_CANCELED) {
        // ...
    }
}
```

This works with `acquire`, too:
if `acquire` is used for locking, the resulting promise will reject with `E_CANCELED`.

The error that is thrown can be customized by passing a different error to the `Semaphore`
constructor:

```typescript
const semaphore = new Semaphore(2, new Error('fancy custom error'));
```

Note that while all pending locks are cancelled, any currently held locks will not be
revoked. In consequence, the semaphore may not be available even after `cancel()` has been called.

### Waiting until the semaphore is available

You can wait until the semaphore is available without locking it by calling `waitForUnlock()`.
This will return a promise that resolve once the semaphore can be acquired again. This operation
will not lock the semaphore, and there is no guarantee that the semaphore will still be available
once an async barrier has been encountered.

Promise style:
```typescript
semaphore
    .waitForUnlock()
    .then(() => {
        // ...
    });
```

Async/await:
```typescript
await semaphore.waitForUnlock();
// ...
```

`waitForUnlock` accepts optional arguments `weight` and `priority`. The promise will resolve as soon
as it is possible to `acquire` the semaphore with the given weight and priority. Scheduled tasks with
the greatest `priority` values execute first.


## Limiting the time waiting for a mutex or semaphore to become available

Sometimes it is desirable to limit the time a program waits for a mutex or
semaphore to become available. The `withTimeout` decorator can be applied
to both semaphores and mutexes and changes the behavior of `acquire` and
`runExclusive` accordingly.

```typescript
import {withTimeout, E_TIMEOUT} from 'async-mutex';

const mutexWithTimeout = withTimeout(new Mutex(), 100);
const semaphoreWithTimeout = withTimeout(new Semaphore(5), 100);
```

The API of the decorated mutex or semaphore is unchanged.

The second argument of `withTimeout` is the timeout in milliseconds. After the
timeout is exceeded, the promise returned by `acquire` and `runExclusive` will
reject with `E_TIMEOUT`. The latter will not run the provided callback in case
of an timeout.

The third argument of `withTimeout` is optional and can be used to
customize the error with which the promise is rejected.

```typescript
const mutexWithTimeout = withTimeout(new Mutex(), 100, new Error('new fancy error'));
const semaphoreWithTimeout = withTimeout(new Semaphore(5), 100, new Error('new fancy error'));
```

### Failing early if the mutex or semaphore is not available

A shortcut exists for the case where you do not want to wait for a lock to
be available at all. The `tryAcquire` decorator can be applied to both mutexes
and semaphores and changes the behavior of `acquire` and `runExclusive` to
immediately throw `E_ALREADY_LOCKED` if the mutex is not available.

Promise style:
```typescript
import {tryAcquire, E_ALREADY_LOCKED} from 'async-mutex';

tryAcquire(semaphoreOrMutex)
    .runExclusive(() => {
        // ...
    })
    .then(() => {
        // ...
    })
    .catch(e => {
        if (e === E_ALREADY_LOCKED) {
            // ...
        }
    });
```

async/await:
```typescript
import {tryAcquire, E_ALREADY_LOCKED} from 'async-mutex';

try {
    await tryAcquire(semaphoreOrMutex).runExclusive(() => {
        // ...
    });
} catch (e) {
    if (e === E_ALREADY_LOCKED) {
        // ...
    }
}
```

Again, the error can be customized by providing a custom error as second argument to
`tryAcquire`.

```typescript
tryAcquire(semaphoreOrMutex, new Error('new fancy error'))
    .runExclusive(() => {
        // ...
    });
```
# License

Feel free to use this library under the conditions of the MIT license.
