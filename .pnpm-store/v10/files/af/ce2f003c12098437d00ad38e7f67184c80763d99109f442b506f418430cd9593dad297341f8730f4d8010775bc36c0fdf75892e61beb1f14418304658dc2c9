# Comlink

Comlink makes [WebWorkers][webworker] enjoyable. Comlink is a **tiny library (1.1kB)**, that removes the mental barrier of thinking about `postMessage` and hides the fact that you are working with workers.

At a more abstract level it is an RPC implementation for `postMessage` and [ES6 Proxies][es6 proxy].

```
$ npm install --save comlink
```

![Comlink in action](https://user-images.githubusercontent.com/234957/54164510-cdab2d80-4454-11e9-92d0-7356aa6c5746.png)

## Browsers support & bundle size

![Chrome 56+](https://img.shields.io/badge/Chrome-56+-green.svg?style=flat-square)
![Edge 15+](https://img.shields.io/badge/Edge-15+-green.svg?style=flat-square)
![Firefox 52+](https://img.shields.io/badge/Firefox-52+-green.svg?style=flat-square)
![Opera 43+](https://img.shields.io/badge/Opera-43+-green.svg?style=flat-square)
![Safari 10.1+](https://img.shields.io/badge/Safari-10.1+-green.svg?style=flat-square)
![Samsung Internet 6.0+](https://img.shields.io/badge/Samsung_Internet-6.0+-green.svg?style=flat-square)

Browsers without [ES6 Proxy] support can use the [proxy-polyfill].

**Size**: ~2.5k, ~1.2k gzip’d, ~1.1k brotli’d

## Introduction

On mobile phones, and especially on low-end mobile phones, it is important to keep the main thread as idle as possible so it can respond to user interactions quickly and provide a jank-free experience. **The UI thread ought to be for UI work only**. WebWorkers are a web API that allow you to run code in a separate thread. To communicate with another thread, WebWorkers offer the `postMessage` API. You can send JavaScript objects as messages using `myWorker.postMessage(someObject)`, triggering a `message` event inside the worker.

Comlink turns this messaged-based API into a something more developer-friendly by providing an RPC implementation: Values from one thread can be used within the other thread (and vice versa) just like local values.

## Examples

### [Running a simple function](./docs/examples/01-simple-example)

**main.js**

```javascript
import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";
async function init() {
  const worker = new Worker("worker.js");
  // WebWorkers use `postMessage` and therefore work with Comlink.
  const obj = Comlink.wrap(worker);
  alert(`Counter: ${await obj.counter}`);
  await obj.inc();
  alert(`Counter: ${await obj.counter}`);
}
init();
```

**worker.js**

```javascript
importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");
// importScripts("../../../dist/umd/comlink.js");

const obj = {
  counter: 0,
  inc() {
    this.counter++;
  },
};

Comlink.expose(obj);
```

### [Callbacks](./docs/examples/02-callback-example)

**main.js**

```javascript
import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";
// import * as Comlink from "../../../dist/esm/comlink.mjs";
function callback(value) {
  alert(`Result: ${value}`);
}
async function init() {
  const remoteFunction = Comlink.wrap(new Worker("worker.js"));
  await remoteFunction(Comlink.proxy(callback));
}
init();
```

**worker.js**

```javascript
importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");
// importScripts("../../../dist/umd/comlink.js");

async function remoteFunction(cb) {
  await cb("A string from a worker");
}

Comlink.expose(remoteFunction);
```

### [`SharedWorker`](./docs/examples/07-sharedworker-example)

When using Comlink with a [`SharedWorker`](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) you have to:

1. Use the [`port`](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker/port) property, of the `SharedWorker` instance, when calling `Comlink.wrap`.
2. Call `Comlink.expose` within the [`onconnect`](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorkerGlobalScope/onconnect) callback of the shared worker.

**Pro tip:** You can access DevTools for any shared worker currently running in Chrome by going to: **chrome://inspect/#workers**

**main.js**

```javascript
import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";
async function init() {
  const worker = new SharedWorker("worker.js");
  /**
   * SharedWorkers communicate via the `postMessage` function in their `port` property.
   * Therefore you must use the SharedWorker's `port` property when calling `Comlink.wrap`.
   */
  const obj = Comlink.wrap(worker.port);
  alert(`Counter: ${await obj.counter}`);
  await obj.inc();
  alert(`Counter: ${await obj.counter}`);
}
init();
```

**worker.js**

```javascript
importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");
// importScripts("../../../dist/umd/comlink.js");

const obj = {
  counter: 0,
  inc() {
    this.counter++;
  },
};

/**
 * When a connection is made into this shared worker, expose `obj`
 * via the connection `port`.
 */
onconnect = function (event) {
  const port = event.ports[0];

  Comlink.expose(obj, port);
};

// Single line alternative:
// onconnect = (e) => Comlink.expose(obj, e.ports[0]);
```

**For additional examples, please see the [docs/examples](./docs/examples) directory in the project.**

## API

### `Comlink.wrap(endpoint)` and `Comlink.expose(value, endpoint?, allowedOrigins?)`

Comlink’s goal is to make _exposed_ values from one thread available in the other. `expose` exposes `value` on `endpoint`, where `endpoint` is a [`postMessage`-like interface][endpoint] and `allowedOrigins` is an array of
RegExp or strings defining which origins should be allowed access (defaults to special case of `['*']` for all origins).

`wrap` wraps the _other_ end of the message channel and returns a proxy. The proxy will have all properties and functions of the exposed value, but access and invocations are inherently asynchronous. This means that a function that returns a number will now return _a promise_ for a number. **As a rule of thumb: If you are using the proxy, put `await` in front of it.** Exceptions will be caught and re-thrown on the other side.

### `Comlink.transfer(value, transferables)` and `Comlink.proxy(value)`

By default, every function parameter, return value and object property value is copied, in the sense of [structured cloning]. Structured cloning can be thought of as deep copying, but has some limitations. See [this table][structured clone table] for details.

If you want a value to be transferred rather than copied — provided the value is or contains a [`Transferable`][transferable] — you can wrap the value in a `transfer()` call and provide a list of transferable values:

```js
const data = new Uint8Array([1, 2, 3, 4, 5]);
await myProxy.someFunction(Comlink.transfer(data, [data.buffer]));
```

Lastly, you can use `Comlink.proxy(value)`. When using this Comlink will neither copy nor transfer the value, but instead send a proxy. Both threads now work on the same value. This is useful for callbacks, for example, as functions are neither structured cloneable nor transferable.

```js
myProxy.onready = Comlink.proxy((data) => {
  /* ... */
});
```

### Transfer handlers and event listeners

It is common that you want to use Comlink to add an event listener, where the event source is on another thread:

```js
button.addEventListener("click", myProxy.onClick.bind(myProxy));
```

While this won’t throw immediately, `onClick` will never actually be called. This is because [`Event`][event] is neither structured cloneable nor transferable. As a workaround, Comlink offers transfer handlers.

Each function parameter and return value is given to _all_ registered transfer handlers. If one of the event handler signals that it can process the value by returning `true` from `canHandle()`, it is now responsible for serializing the value to structured cloneable data and for deserializing the value. A transfer handler has be set up on _both sides_ of the message channel. Here’s an example transfer handler for events:

```js
Comlink.transferHandlers.set("EVENT", {
  canHandle: (obj) => obj instanceof Event,
  serialize: (ev) => {
    return [
      {
        target: {
          id: ev.target.id,
          classList: [...ev.target.classList],
        },
      },
      [],
    ];
  },
  deserialize: (obj) => obj,
});
```

Note that this particular transfer handler won’t create an actual `Event`, but just an object that has the `event.target.id` and `event.target.classList` property. Often, this is enough. If not, the transfer handler can be easily augmented to provide all necessary data.

### `Comlink.releaseProxy`

Every proxy created by Comlink has the `[releaseProxy]()` method.
Calling it will detach the proxy and the exposed object from the message channel, allowing both ends to be garbage collected.

```js
const proxy = Comlink.wrap(port);
// ... use the proxy ...
proxy[Comlink.releaseProxy]();
```

If the browser supports the [WeakRef proposal], `[releaseProxy]()` will be called automatically when the proxy created by `wrap()` gets garbage collected.

### `Comlink.finalizer`

If an exposed object has a property `[Comlink.finalizer]`, the property will be invoked as a function when the proxy is being released. This can happen either through a manual invocation of `[releaseProxy]()` or automatically during garbage collection if the runtime supports the [WeakRef proposal] (see `Comlink.releaseProxy` above). Note that when the finalizer function is invoked, the endpoint is closed and no more communication can happen.

### `Comlink.createEndpoint`

Every proxy created by Comlink has the `[createEndpoint]()` method.
Calling it will return a new `MessagePort`, that has been hooked up to the same object as the proxy that `[createEndpoint]()` has been called on.

```js
const port = myProxy[Comlink.createEndpoint]();
const newProxy = Comlink.wrap(port);
```

### `Comlink.windowEndpoint(window, context = self, targetOrigin = "*")`

Windows and Web Workers have a slightly different variants of `postMessage`. If you want to use Comlink to communicate with an iframe or another window, you need to wrap it with `windowEndpoint()`.

`window` is the window that should be communicate with. `context` is the `EventTarget` on which messages _from_ the `window` can be received (often `self`). `targetOrigin` is passed through to `postMessage` and allows to filter messages by origin. For details, see the documentation for [`Window.postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

For a usage example, take a look at the non-worker examples in the `docs` folder.

## TypeScript

Comlink does provide TypeScript types. When you `expose()` something of type `T`, the corresponding `wrap()` call will return something of type `Comlink.Remote<T>`. While this type has been battle-tested over some time now, it is implemented on a best-effort basis. There are some nuances that are incredibly hard if not impossible to encode correctly in TypeScript’s type system. It _may_ sometimes be necessary to force a certain type using `as unknown as <type>`.

## Node

Comlink works with Node’s [`worker_threads`][worker_threads] module. Take a look at the example in the `docs` folder.

[webworker]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
[umd]: https://github.com/umdjs/umd
[transferable]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
[messageport]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
[examples]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples
[dist]: https://github.com/GoogleChromeLabs/comlink/tree/master/dist
[delivrjs]: https://cdn.jsdelivr.net/
[es6 proxy]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
[proxy-polyfill]: https://github.com/GoogleChrome/proxy-polyfill
[endpoint]: src/protocol.ts
[structured cloning]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
[structured clone table]: structured-clone-table.md
[event]: https://developer.mozilla.org/en-US/docs/Web/API/Event
[worker_threads]: https://nodejs.org/api/worker_threads.html
[weakref proposal]: https://github.com/tc39/proposal-weakrefs

## Additional Resources

- [Simplify Web Worker code with Comlink](https://davidea.st/articles/comlink-simple-web-worker)

---

License Apache-2.0
