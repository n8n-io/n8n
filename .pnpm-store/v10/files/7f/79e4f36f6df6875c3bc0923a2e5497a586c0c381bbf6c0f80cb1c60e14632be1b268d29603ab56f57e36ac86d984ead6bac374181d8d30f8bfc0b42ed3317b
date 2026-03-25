# fake-indexeddb ![Build Status](https://github.com/dumbmatter/fakeIndexedDB/actions/workflows/test.yml/badge.svg)

This is a pure JS in-memory implementation of [the IndexedDB API](https://w3c.github.io/IndexedDB/). Its main utility is for testing IndexedDB-dependent code in Node.js.

## Installation

```sh
npm install --save-dev fake-indexeddb
```

## Use

Functionally, it works exactly like IndexedDB except data is not persisted to disk.

The easiest way to use it is to import `fake-indexeddb/auto`, which will put all the IndexedDB variables in the global scope. (Both `import` and `require` are supported, use whichever you like, but the examples here are all `import`.)

```js
import "fake-indexeddb/auto";

var request = indexedDB.open("test", 3);
request.onupgradeneeded = function () {
    var db = request.result;
    var store = db.createObjectStore("books", {keyPath: "isbn"});
    store.createIndex("by_title", "title", {unique: true});

    store.put({title: "Quarry Memories", author: "Fred", isbn: 123456});
    store.put({title: "Water Buffaloes", author: "Fred", isbn: 234567});
    store.put({title: "Bedrock Nights", author: "Barney", isbn: 345678});
}
request.onsuccess = function (event) {
    var db = event.target.result;

    var tx = db.transaction("books");

    tx.objectStore("books").index("by_title").get("Quarry Memories").addEventListener("success", function (event) {
        console.log("From index:", event.target.result);
    });
    tx.objectStore("books").openCursor(IDBKeyRange.lowerBound(200000)).onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
            console.log("From cursor:", cursor.value);
            cursor.continue();
        }
    };
    tx.oncomplete = function () {
        console.log("All done!");
    };
};
```

Alternatively, you can explicitly import individual IndexedDB variables:

```js
import {
    indexedDB,
    IDBCursor,
    IDBCursorWithValue,
    IDBDatabase,
    IDBFactory,
    IDBIndex,
    IDBKeyRange,
    IDBObjectStore,
    IDBOpenDBRequest,
    IDBRequest,
    IDBTransaction,
    IDBVersionChangeEvent,
} from "fake-indexeddb";

// The rest is the same as above.
```

Like any imported variable, you can rename it if you want, for instance if you don't want to conflict with built-in IndexedDB variables:

```js
import {
    indexedDB as fakeIndexedDB,
} from "fake-indexeddb";
```

### TypeScript

As of version 4, fake-indexeddb includes TypeScript types. As you can see in types.d.ts, it's just using TypeScript's built-in IndexedDB types, rather than generating types from the fake-indexeddb code base. The reason I did this is for compatibility with your application code that may already be using TypeScript's IndexedDB types, so if I used something different for fake-indexeddb, it could lead to spurious type errors. In theory this could lead to other errors if there are differences between Typescript's IndexedDB types and fake-indexeddb's API, but currently I'm not aware of any difference. See [issue #23](https://github.com/dumbmatter/fakeIndexedDB/issues/23) for more discussion.

### Dexie and other IndexedDB API wrappers

If you import `fake-indexeddb/auto` before importing `dexie`, it should work:

```js
import "fake-indexeddb/auto";
import Dexie from "dexie";

const db = new Dexie("MyDatabase");
```

The same likely holds true for other IndexedDB API wrappers like idb.

Alternatively, if you don't want to modify the global scope, then you need to explicitly pass the objects to Dexie:

```js
import Dexie from "dexie";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";

const db = new Dexie("MyDatabase", { indexedDB: indexedDB, IDBKeyRange: IDBKeyRange });
```

### Jest

To use fake-indexeddb in a single Jest test suite, require `fake-indexeddb/auto` at the beginning of the test
file, as described above.

To use it on all Jest tests without having to include it in each file, add the auto setup script to the `setupFiles` in your Jest config:

```json
{
    "setupFiles": [
        "fake-indexeddb/auto"
    ]
}
```

### jsdom (often used with Jest)

As of version 5, fake-indexeddb no longer includes a `structuredClone` polyfill. This mostly affects old environments like unsupported versions of Node.js, but [it also affects jsdom](https://github.com/dumbmatter/fakeIndexedDB/issues/88), which is often used with Jest and other testing frameworks.

There are a few ways you could work around this. You could include your own `structuredClone` polyfill by installing core-js and importing its polyfill before you use fake-indexeddb:

```js
import "core-js/stable/structured-clone";
import "fake-indexeddb/auto";
```

Or, [you could manually include the Node.js `structuredClone` implementation in a jsdom environment](https://github.com/jsdom/jsdom/issues/3363#issuecomment-1467894943):

```js
// FixJSDOMEnvironment.ts

import JSDOMEnvironment from 'jest-environment-jsdom';

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class FixJSDOMEnvironment extends JSDOMEnvironment {
  constructor(...args: ConstructorParameters<typeof JSDOMEnvironment>) {
    super(...args);

    // FIXME https://github.com/jsdom/jsdom/issues/3363
    this.global.structuredClone = structuredClone;
  }
}
```

```js
// jest.config.js

/** @type {import('jest').Config} */
const config = {
  testEnvironment: './FixJSDOMEnvironment.ts',
};

module.exports = config;
```

Hopefully a future version of jsdom will no longer require these workarounds.

### Wiping/resetting the indexedDB for a fresh state

If you are keeping your tests completely isolated you might want to "reset" the state of the mocked indexedDB. You can do this by creating a new instance of `IDBFactory`, which lets you have a totally fresh start.

```js
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

// Whenever you want a fresh indexedDB
indexedDB = new IDBFactory();
```

### With PhantomJS and other really old environments

PhantomJS (and other really old environments) are missing tons of modern JavaScript features. In fact, that may be why you use fake-indexeddb in such an environment! Prior to v3.0.0, fake-indexeddb imported core-js and automatically applied its polyfills. However, since most fake-indexeddb users are not using really old environments, I got rid of that runtime dependency in v3.0.0. To work around that, you can import core-js yourself before you import fake-indexeddb, like:

```js
import "core-js/stable";
import "fake-indexeddb/auto";
```

## Quality

Here's a comparison of fake-indexeddb and real browser IndexedDB implementations on [the W3C IndexedDB test suite](https://github.com/w3c/web-platform-tests/tree/master/IndexedDB) as of March 18, 2019:

| Implementation       | Percentage of files that pass completely |
| -------------------- | ---------------------------------------- |
| Chrome 73            | 99%                                      |
| Firefox 65           | 97%                                      |
| Safari 12            | 92%                                      |
| fake-indexeddb 3.0.0 | 87%                                      |
| Edge 18              | 61%                                      |

For browsers, I ran http://w3c-test.org/tools/runner/index.html and counted the passes. For fake-indexeddb, I ran `npm run test-w3c`.

87% is pretty good, right? Especially considering that fake-indexeddb runs in Node.js where failure is guaranteed for tests involving browser APIs like Web Workers. There are definitley still some weak points of fake-indexeddb, most of which are described in `src/test/web-platform-tests/run-all.js`. Your app will probably run fine, though.

## Potential applications:

1. Use as a mock database in unit tests.

2. Use the same API in Node.js and in the browser.

3. Support IndexedDB in old or crappy browsers.

4. Somehow use it within a caching layer on top of IndexedDB in the browser, since IndexedDB can be kind of slow.

5. Abstract the core database functions out, so what is left is a shell that allows the IndexedDB API to easily sit on top of many different backends.

6. Serve as a playground for experimenting with IndexedDB.

## License

Apache 2.0
