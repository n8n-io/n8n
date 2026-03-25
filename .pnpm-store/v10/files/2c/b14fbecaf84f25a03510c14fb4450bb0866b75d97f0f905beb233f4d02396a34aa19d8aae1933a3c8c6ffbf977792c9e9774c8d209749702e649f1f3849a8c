![Hookified](site/logo.svg)

# Event Emitting and Middleware Hooks

[![tests](https://github.com/jaredwray/hookified/actions/workflows/tests.yaml/badge.svg)](https://github.com/jaredwray/hookified/actions/workflows/tests.yaml)
[![GitHub license](https://img.shields.io/github/license/jaredwray/hookified)](https://github.com/jaredwray/hookified/blob/master/LICENSE)
[![codecov](https://codecov.io/gh/jaredwray/hookified/graph/badge.svg?token=nKkVklTFdA)](https://codecov.io/gh/jaredwray/hookified)
[![npm](https://img.shields.io/npm/dm/hookified)](https://npmjs.com/package/hookified)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/hookified/badge)](https://www.jsdelivr.com/package/npm/hookified)
[![npm](https://img.shields.io/npm/v/hookified)](https://npmjs.com/package/hookified)

# Features
- Simple replacement for EventEmitter
- Async / Sync Middleware Hooks for Your Methods 
- ESM / CJS with Types and Nodejs 20+
- Browser Support and Delivered via CDN
- Ability to throw errors in hooks
- Ability to pass in a logger (such as Pino) for errors
- No package dependencies and only 100KB in size
- Fast and Efficient with [Benchmarks](#benchmarks)
- Maintained on a regular basis!

# Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Using it in the Browser](#using-it-in-the-browser)
- [API - Hooks](#api---hooks)
  - [.throwHookErrors](#throwhookerrors)
  - [.logger](#logger)
  - [.onHook(eventName, handler)](#onhookeventname-handler)
  - [.onHookEntry(hookEntry)](#onhookentryhookentry)
  - [.addHook(eventName, handler)](#addhookeventname-handler)
  - [.onHooks(Array)](#onhooksarray)
  - [.onceHook(eventName, handler)](#oncehookeventname-handler)
  - [.prependHook(eventName, handler)](#prependhookeventname-handler)
  - [.prependOnceHook(eventName, handler)](#prependoncehookeventname-handler)
  - [.removeHook(eventName)](#removehookeventname)
  - [.removeHooks(Array)](#removehooksarray)
  - [.hook(eventName, ...args)](#hookeventname-args)
  - [.callHook(eventName, ...args)](#callhookeventname-args)
  - [.hooks](#hooks)
  - [.getHooks(eventName)](#gethookseventname)
  - [.clearHooks(eventName)](#clearhookeventname)
- [API - Events](#api---events)
  - [.throwOnEmitError](#throwonemitterror)
  - [.on(eventName, handler)](#oneventname-handler)
  - [.off(eventName, handler)](#offeventname-handler)
  - [.emit(eventName, ...args)](#emiteventname-args)
  - [.listeners(eventName)](#listenerseventname)
  - [.removeAllListeners(eventName)](#removealllistenerseventname)
  - [.setMaxListeners(maxListeners: number)](#setmaxlistenersmaxlisteners-number)
  - [.once(eventName, handler)](#oneventname-handler-1)
  - [.prependListener(eventName, handler)](#prependlistenereventname-handler)
  - [.prependOnceListener(eventName, handler)](#prependoncelistenereventname-handler)
  - [.eventNames()](#eventnames)
  - [.listenerCount(eventName?)](#listenercounteventname)
  - [.rawListeners(eventName?)](#rawlistenerseventname)
- [Development and Contribution](#development-and-contribution)
- [Benchmarks](#benchmarks)
- [License](#license)

# Installation
```bash
npm install hookified --save
```

# Usage
This was built because we constantly wanted hooks and events extended on libraires we are building such as [Keyv](https://keyv.org) and [Cacheable](https://cacheable.org). This is a simple way to add hooks and events to your classes.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodEmittingEvent() {
    this.emit('message', 'Hello World'); //using Emittery
  }

  //with hooks you can pass data in and if they are subscribed via onHook they can modify the data
  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}
```

You can even pass in multiple arguments to the hooks:

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    let data2 = { some: 'data2' };
    // do something
    await this.hook('before:myMethod2', data, data2);

    return data;
  }
}
```

# Using it in the Browser

```html
<script type="module">
  import { Hookified } from 'https://cdn.jsdelivr.net/npm/hookified/dist/browser/index.js';

  class MyClass extends Hookified {
    constructor() {
      super();
    }

    async myMethodEmittingEvent() {
      this.emit('message', 'Hello World'); //using Emittery
    }

    //with hooks you can pass data in and if they are subscribed via onHook they can modify the data
    async myMethodWithHooks() Promise<any> {
      let data = { some: 'data' };
      // do something
      await this.hook('before:myMethod2', data);

      return data;
    }
  }
</script>
```

if you are not using ESM modules, you can use the following:

```html
<script src="https://cdn.jsdelivr.net/npm/hookified/dist/browser/index.global.js"></script>
<script>
  class MyClass extends Hookified {
    constructor() {
      super();
    }

    async myMethodEmittingEvent() {
      this.emit('message', 'Hello World'); //using Emittery
    }

    //with hooks you can pass data in and if they are subscribed via onHook they can modify the data
    async myMethodWithHooks() Promise<any> {
      let data = { some: 'data' };
      // do something
      await this.hook('before:myMethod2', data);

      return data;
    }
  }
</script>
```

# API - Hooks

## .throwHookErrors

If set to true, errors thrown in hooks will be thrown. If set to false, errors will be only emitted.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super({ throwHookErrors: true });
  }
}

const myClass = new MyClass();

console.log(myClass.throwHookErrors); // true. because it is set in super

try {
  myClass.onHook('error-event', async () => {
    throw new Error('error');
  });

  await myClass.hook('error-event');
} catch (error) {
  console.log(error.message); // error
}

myClass.throwHookErrors = false;
console.log(myClass.throwHookErrors); // false
```

## .logger
If set, errors thrown in hooks will be logged to the logger. If not set, errors will be only emitted.

```javascript
import { Hookified } from 'hookified';
import pino from 'pino';

const logger = pino(); // create a logger instance that is compatible with Logger type

class MyClass extends Hookified {
  constructor() {
    super({ logger });
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();
myClass.onHook('before:myMethod2', async () => {
  throw new Error('error');
});

// when you call before:myMethod2 it will log the error to the logger
await myClass.hook('before:myMethod2');
```

## .onHook(eventName, handler)

Subscribe to a hook event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();
myClass.onHook('before:myMethod2', async (data) => {
  data.some = 'new data';
});
```

## .onHookEntry(hookEntry)

This allows you to create a hook with the `HookEntry` type which includes the event and handler. This is useful for creating hooks with a single object.

```javascript
import { Hookified, HookEntry } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();
myClass.onHookEntry({
  event: 'before:myMethod2',
  handler: async (data) => {
    data.some = 'new data';
  },
});
```

## .addHook(eventName, handler)

This is an alias for `.onHook(eventName, handler)` for backwards compatibility.

## .onHooks(Array)

Subscribe to multiple hook events at once

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    await this.hook('before:myMethodWithHooks', data);
    
    // do something here with the data
    data.some = 'new data';

    await this.hook('after:myMethodWithHooks', data);

    return data;
  }
}

const myClass = new MyClass();
const hooks = [
  {
    event: 'before:myMethodWithHooks',
    handler: async (data) => {
      data.some = 'new data1';
    },
  },
  {
    event: 'after:myMethodWithHooks',
    handler: async (data) => {
      data.some = 'new data2';
    },
  },
];
```

## .onceHook(eventName, handler)

Subscribe to a hook event once.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();

myClass.onHookOnce('before:myMethod2', async (data) => {
  data.some = 'new data';
});

myClass.myMethodWithHooks();

console.log(myClass.hooks.length); // 0
```

## .prependHook(eventName, handler)

Subscribe to a hook event before all other hooks.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();
myClass.onHook('before:myMethod2', async (data) => {
  data.some = 'new data';
});
myClass.preHook('before:myMethod2', async (data) => {
  data.some = 'will run before new data';
});
```

## .prependOnceHook(eventName, handler)

Subscribe to a hook event before all other hooks. After it is used once it will be removed.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();
myClass.onHook('before:myMethod2', async (data) => {
  data.some = 'new data';
});
myClass.preHook('before:myMethod2', async (data) => {
  data.some = 'will run before new data';
});
```

## .removeHook(eventName)

Unsubscribe from a hook event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();
const handler = async (data) => {
  data.some = 'new data';
};

myClass.onHook('before:myMethod2', handler);

myClass.removeHook('before:myMethod2', handler);
```

## .removeHooks(Array)
Unsubscribe from multiple hooks.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    await this.hook('before:myMethodWithHooks', data);
    
    // do something
    data.some = 'new data';
    await this.hook('after:myMethodWithHooks', data);

    return data;
  }
}

const myClass = new MyClass();

const hooks = [
  {
    event: 'before:myMethodWithHooks',
    handler: async (data) => {
      data.some = 'new data1';
    },
  },
  {
    event: 'after:myMethodWithHooks',
    handler: async (data) => {
      data.some = 'new data2';
    },
  },
];
myClass.onHooks(hooks);

// remove all hooks
myClass.removeHook(hooks);
```

## .hook(eventName, ...args)

Run a hook event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}
```

in this example we are passing multiple arguments to the hook:

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    let data2 = { some: 'data2' };
    // do something
    await this.hook('before:myMethod2', data, data2);

    return data;
  }
}

const myClass = new MyClass();

myClass.onHook('before:myMethod2', async (data, data2) => {
  data.some = 'new data';
  data2.some = 'new data2';
});

await myClass.myMethodWithHooks();
```

## .callHook(eventName, ...args)

This is an alias for `.hook(eventName, ...args)` for backwards compatibility.

## .hooks

Get all hooks.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();
myClass.onHook('before:myMethod2', async (data) => {
  data.some = 'new data';
});

console.log(myClass.hooks);
```

## .getHooks(eventName)

Get all hooks for an event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();
myClass.onHook('before:myMethod2', async (data) => {
  data.some = 'new data';
});

console.log(myClass.getHooks('before:myMethod2'));
```

## .clearHooks(eventName)

Clear all hooks for an event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}

const myClass = new MyClass();

myClass.onHook('before:myMethod2', async (data) => {
  data.some = 'new data';
});

myClass.clearHooks('before:myMethod2');
```

# API - Events

## .throwOnEmitError

If set to true, errors emitted as `error` will be thrown if there are no listeners. If set to false, errors will be only emitted.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}
```

## .on(eventName, handler)

Subscribe to an event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodEmittingEvent() {
    this.emit('message', 'Hello World');
  }
}

const myClass = new MyClass();

myClass.on('message', (message) => {
  console.log(message);
});
```

## .off(eventName, handler)

Unsubscribe from an event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodEmittingEvent() {
    this.emit('message', 'Hello World');
  }
}

const myClass = new MyClass();
myClass.on('message', (message) => {
  console.log(message);
});

myClass.off('message', (message) => {
  console.log(message);
});
```

## .emit(eventName, ...args)

Emit an event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodEmittingEvent() {
    this.emit('message', 'Hello World');
  }
}
```

## .listeners(eventName)

Get all listeners for an event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodEmittingEvent() {
    this.emit('message', 'Hello World');
  }
}

const myClass = new MyClass();

myClass.on('message', (message) => {
  console.log(message);
});

console.log(myClass.listeners('message'));
```

## .removeAllListeners(eventName)

Remove all listeners for an event.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodEmittingEvent() {
    this.emit('message', 'Hello World');
  }
}

const myClass = new MyClass();

myClass.on('message', (message) => {
  console.log(message);
});

myClass.removeAllListeners('message');
```

## .setMaxListeners(maxListeners: number)

Set the maximum number of listeners and will truncate if there are already too many.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodEmittingEvent() {
    this.emit('message', 'Hello World');
  }
}

const myClass = new MyClass();

myClass.setMaxListeners(1);

myClass.on('message', (message) => {
  console.log(message);
});

myClass.on('message', (message) => {
  console.log(message);
}); // this will not be added and console warning

console.log(myClass.listenerCount('message')); // 1
```

## .once(eventName, handler)

Subscribe to an event once.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }
}

const myClass = new MyClass();

myClass.once('message', (message) => {
  console.log(message);
});

myClass.emit('message', 'Hello World');

myClass.emit('message', 'Hello World'); // this will not be called
```

## .prependListener(eventName, handler)

Prepend a listener to an event. This will be called before any other listeners.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }
}

const myClass = new MyClass();

myClass.prependListener('message', (message) => {
  console.log(message);
});
```

## .prependOnceListener(eventName, handler)

Prepend a listener to an event once. This will be called before any other listeners.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }
}

const myClass = new MyClass();

myClass.prependOnceListener('message', (message) => {
  console.log(message);
});

myClass.emit('message', 'Hello World');
```

## .eventNames()

Get all event names.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }
}

const myClass = new MyClass();

myClass.on('message', (message) => {
  console.log(message);
});

console.log(myClass.eventNames());
```

## .listenerCount(eventName?)

Get the count of listeners for an event or all events if evenName not provided.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }
}

const myClass = new MyClass();

myClass.on('message', (message) => {
  console.log(message);
});

console.log(myClass.listenerCount('message')); // 1
```

## .rawListeners(eventName?)

Get all listeners for an event or all events if evenName not provided.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }
}

const myClass = new MyClass();

myClass.on('message', (message) => {
  console.log(message);
});

console.log(myClass.rawListeners('message'));
```

# Development and Contribution

Hookified is written in TypeScript and tests are written in `vitest`. To run the tests, use the following command:

To setup the environment and run the tests:

```bash
pnpm i && pnpm test
```

Note that we are using `pnpm` as our package manager. If you don't have it installed, you can install it globally with:

```bash
npm install -g pnpm
```

To contribute follow the [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

# Benchmarks

We are doing very simple benchmarking to see how this compares to other libraries using `tinybench`. This is not a full benchmark but just a simple way to see how it performs. Our goal is to be as close or better than the other libraries including native (EventEmitter).

## Hooks

|       name        |  summary  |  ops/sec  |  time/op  |  margin  |  samples  |
|-------------------|:---------:|----------:|----------:|:--------:|----------:|
|  Hookified 1.8.0  |    🥇     |       4M  |    299ns  |  ±2.42%  |       3M  |
|  Hookable 5.5.3   |   -73%    |     982K  |      1µs  |  ±2.92%  |     812K  |

## Emits

This shows how on par `hookified` is to the native `EventEmitter` and popular `eventemitter3`. These are simple emitting benchmarks to see how it performs.

|          name           |  summary  |  ops/sec  |  time/op  |  margin  |  samples  |
|-------------------------|:---------:|----------:|----------:|:--------:|----------:|
|  Hookified 1.8.0        |    🥇     |      10M  |    112ns  |  ±1.13%  |       9M  |
|  EventEmitter3 5.0.1    |   -1.3%   |      10M  |    114ns  |  ±1.84%  |       9M  |
|  EventEmitter v22.12.0  |   -1.5%   |       9M  |    114ns  |  ±1.18%  |       9M  |
|  Emittery 1.1.0         |   -92%    |     785K  |      1µs  |  ±0.45%  |     761K  |

_Note: the `EventEmitter` version is Nodejs versioning._

# License

[MIT & © Jared Wray](LICENSE)




