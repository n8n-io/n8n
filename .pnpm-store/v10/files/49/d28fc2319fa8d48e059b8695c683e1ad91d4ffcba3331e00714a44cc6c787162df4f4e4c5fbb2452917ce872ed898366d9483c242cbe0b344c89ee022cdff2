# before-after-hook

> asynchronous hooks for internal functionality

[![npm downloads](https://img.shields.io/npm/dw/before-after-hook.svg)](https://www.npmjs.com/package/before-after-hook)
[![Test](https://github.com/gr2m/before-after-hook/actions/workflows/test.yml/badge.svg)](https://github.com/gr2m/before-after-hook/actions/workflows/test.yml)

## Usage

### Singular hook

```js
// instantiate singular hook API
const hook = new Hook.Singular();

// Create a hook
function getData(options) {
  return hook(fetchFromDatabase, options)
    .then(handleData)
    .catch(handleGetError);
}

// register before/error/after hooks.
// The methods can be async or return a promise
hook.before(beforeHook);
hook.error(errorHook);
hook.after(afterHook);

getData({ id: 123 });
```

### Hook collection

```js
// instantiate hook collection API
const hookCollection = new Hook.Collection();

// Create a hook
function getData(options) {
  return hookCollection("get", fetchFromDatabase, options)
    .then(handleData)
    .catch(handleGetError);
}

// register before/error/after hooks.
// The methods can be async or return a promise
hookCollection.before("get", beforeHook);
hookCollection.error("get", errorHook);
hookCollection.after("get", afterHook);

getData({ id: 123 });
```

### Hook.Singular vs Hook.Collection

There's no fundamental difference between the `Hook.Singular` and `Hook.Collection` hooks except for the fact that a hook from a collection requires you to pass along the name. Therefore the following explanation applies to both code snippets as described above.

The methods are executed in the following order

1. `beforeHook`
2. `fetchFromDatabase`
3. `afterHook`
4. `handleData`

`beforeHook` can mutate `options` before it’s passed to `fetchFromDatabase`.

If an error is thrown in `beforeHook` or `fetchFromDatabase` then `errorHook` is
called next.

If `afterHook` throws an error then `handleGetError` is called instead
of `handleData`.

If `errorHook` throws an error then `handleGetError` is called next, otherwise
`afterHook` and `handleData`.

You can also use `hook.wrap` to achieve the same thing as shown above (collection example):

```js
hookCollection.wrap("get", async (getData, options) => {
  await beforeHook(options);

  try {
    const result = getData(options);
  } catch (error) {
    await errorHook(error, options);
  }

  await afterHook(result, options);
});
```

## Install

```
npm install before-after-hook
```

Or download [the latest `before-after-hook.min.js`](https://github.com/gr2m/before-after-hook/releases/latest).

## API

- [Singular Hook Constructor](#singular-hook-api)
- [Hook Collection Constructor](#hook-collection-api)

## Singular hook API

- [Singular constructor](#singular-constructor)
- [hook.api](#singular-api)
- [hook()](#singular-api)
- [hook.before()](#singular-api)
- [hook.error()](#singular-api)
- [hook.after()](#singular-api)
- [hook.wrap()](#singular-api)
- [hook.remove()](#singular-api)

### Singular constructor

The `Hook.Singular` constructor has no options and returns a `hook` instance with the
methods below:

```js
const hook = new Hook.Singular();
```

Using the singular hook is recommended for [TypeScript](#typescript)

### Singular API

The singular hook is a reference to a single hook. This means that there's no need to pass along any identifier (such as a `name` as can be seen in the [Hook.Collection API](#hookcollectionapi)).

The API of a singular hook is exactly the same as a collection hook and we therefore suggest you read the [Hook.Collection API](#hookcollectionapi) and leave out any use of the `name` argument. Just skip it like described in this example:

```js
const hook = new Hook.Singular();

// good
hook.before(beforeHook);
hook.after(afterHook);
hook(fetchFromDatabase, options);

// bad
hook.before("get", beforeHook);
hook.after("get", afterHook);
hook("get", fetchFromDatabase, options);
```

## Hook collection API

- [Collection constructor](#collection-constructor)
- [hookCollection.api](#hookcollectionapi)
- [hookCollection()](#hookcollection)
- [hookCollection.before()](#hookcollectionbefore)
- [hookCollection.error()](#hookcollectionerror)
- [hookCollection.after()](#hookcollectionafter)
- [hookCollection.wrap()](#hookcollectionwrap)
- [hookCollection.remove()](#hookcollectionremove)

### Collection constructor

The `Hook.Collection` constructor has no options and returns a `hookCollection` instance with the
methods below

```js
const hookCollection = new Hook.Collection();
```

### hookCollection.api

Use the `api` property to return the public API:

- [hookCollection.before()](#hookcollectionbefore)
- [hookCollection.after()](#hookcollectionafter)
- [hookCollection.error()](#hookcollectionerror)
- [hookCollection.wrap()](#hookcollectionwrap)
- [hookCollection.remove()](#hookcollectionremove)

That way you don’t need to expose the [hookCollection()](#hookcollection) method to consumers of your library

### hookCollection()

Invoke before and after hooks. Returns a promise.

```js
hookCollection(nameOrNames, method /*, options */);
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>name</code></th>
    <td>String or Array of Strings</td>
    <td>Hook name, for example <code>'save'</code>. Or an array of names, see example below.</td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>method</code></th>
    <td>Function</td>
    <td>Callback to be executed after all before hooks finished execution successfully. <code>options</code> is passed as first argument</td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>options</code></th>
    <td>Object</td>
    <td>Will be passed to all before hooks as reference, so they can mutate it</td>
    <td>No, defaults to empty object (<code>{}</code>)</td>
  </tr>
</table>

Resolves with whatever `method` returns or resolves with.
Rejects with error that is thrown or rejected with by

1. Any of the before hooks, whichever rejects / throws first
2. `method`
3. Any of the after hooks, whichever rejects / throws first

Simple Example

```js
hookCollection(
  "save",
  function (record) {
    return store.save(record);
  },
  record
);
// shorter:  hookCollection('save', store.save, record)

hookCollection.before("save", function addTimestamps(record) {
  const now = new Date().toISOString();
  if (record.createdAt) {
    record.updatedAt = now;
  } else {
    record.createdAt = now;
  }
});
```

Example defining multiple hooks at once.

```js
hookCollection(
  ["add", "save"],
  function (record) {
    return store.save(record);
  },
  record
);

hookCollection.before("add", function addTimestamps(record) {
  if (!record.type) {
    throw new Error("type property is required");
  }
});

hookCollection.before("save", function addTimestamps(record) {
  if (!record.type) {
    throw new Error("type property is required");
  }
});
```

Defining multiple hooks is helpful if you have similar methods for which you want to define separate hooks, but also an additional hook that gets called for all at once. The example above is equal to this:

```js
hookCollection(
  "add",
  function (record) {
    return hookCollection(
      "save",
      function (record) {
        return store.save(record);
      },
      record
    );
  },
  record
);
```

### hookCollection.before()

Add before hook for given name.

```js
hookCollection.before(name, method);
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>name</code></th>
    <td>String</td>
    <td>Hook name, for example <code>'save'</code></td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>method</code></th>
    <td>Function</td>
    <td>
      Executed before the wrapped method. Called with the hook’s
      <code>options</code> argument. Before hooks can mutate the passed options
      before they are passed to the wrapped method.
    </td>
    <td>Yes</td>
  </tr>
</table>

Example

```js
hookCollection.before("save", function validate(record) {
  if (!record.name) {
    throw new Error("name property is required");
  }
});
```

### hookCollection.error()

Add error hook for given name.

```js
hookCollection.error(name, method);
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>name</code></th>
    <td>String</td>
    <td>Hook name, for example <code>'save'</code></td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>method</code></th>
    <td>Function</td>
    <td>
      Executed when an error occurred in either the wrapped method or a
      <code>before</code> hook. Called with the thrown <code>error</code>
      and the hook’s <code>options</code> argument. The first <code>method</code>
      which does not throw an error will set the result that the after hook
      methods will receive.
    </td>
    <td>Yes</td>
  </tr>
</table>

Example

```js
hookCollection.error("save", function (error, options) {
  if (error.ignore) return;
  throw error;
});
```

### hookCollection.after()

Add after hook for given name.

```js
hookCollection.after(name, method);
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>name</code></th>
    <td>String</td>
    <td>Hook name, for example <code>'save'</code></td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>method</code></th>
    <td>Function</td>
    <td>
    Executed after wrapped method. Called with what the wrapped method
    resolves with the hook’s <code>options</code> argument.
    </td>
    <td>Yes</td>
  </tr>
</table>

Example

```js
hookCollection.after("save", function (result, options) {
  if (result.updatedAt) {
    app.emit("update", result);
  } else {
    app.emit("create", result);
  }
});
```

### hookCollection.wrap()

Add wrap hook for given name.

```js
hookCollection.wrap(name, method);
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>name</code></th>
    <td>String</td>
    <td>Hook name, for example <code>'save'</code></td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>method</code></th>
    <td>Function</td>
    <td>
      Receives both the wrapped method and the passed options as arguments so it can add logic before and after the wrapped method, it can handle errors and even replace the wrapped method altogether
    </td>
    <td>Yes</td>
  </tr>
</table>

Example

```js
hookCollection.wrap("save", async function (saveInDatabase, options) {
  if (!record.name) {
    throw new Error("name property is required");
  }

  try {
    const result = await saveInDatabase(options);

    if (result.updatedAt) {
      app.emit("update", result);
    } else {
      app.emit("create", result);
    }

    return result;
  } catch (error) {
    if (error.ignore) return;
    throw error;
  }
});
```

See also: [Test mock example](examples/test-mock-example.md)

### hookCollection.remove()

Removes hook for given name.

```js
hookCollection.remove(name, hookMethod);
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>name</code></th>
    <td>String</td>
    <td>Hook name, for example <code>'save'</code></td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>beforeHookMethod</code></th>
    <td>Function</td>
    <td>
      Same function that was previously passed to <code>hookCollection.before()</code>, <code>hookCollection.error()</code>, <code>hookCollection.after()</code> or <code>hookCollection.wrap()</code>
    </td>
    <td>Yes</td>
  </tr>
</table>

Example

```js
hookCollection.remove("save", validateRecord);
```

## TypeScript

This library contains type definitions for TypeScript.

### Type support for `Singular`:

```ts
import { Hook } from "before-after-hook";

type TOptions = { foo: string }; // type for options
type TResult = { bar: number }; // type for result
type TError = Error; // type for error

const hook = new Hook.Singular<TOptions, TResult, TError>();

hook.before((options) => {
  // `options.foo` has `string` type

  // not allowed
  options.foo = 42;

  // allowed
  options.foo = "Forty-Two";
});

const hookedMethod = hook(
  (options) => {
    // `options.foo` has `string` type

    // not allowed, because it does not satisfy the `R` type
    return { foo: 42 };

    // allowed
    return { bar: 42 };
  },
  { foo: "Forty-Two" }
);
```

You can choose not to pass the types for options, result or error. So, these are completely valid:

```ts
const hook = new Hook.Singular<O, R>();
const hook = new Hook.Singular<O>();
const hook = new Hook.Singular();
```

In these cases, the omitted types will implicitly be `any`.

### Type support for `Collection`:

`Collection` also has strict type support. You can use it like this:

```ts
import { Hook } from "before-after-hook";

type HooksType = {
  add: {
    Options: { type: string };
    Result: { id: number };
    Error: Error;
  };
  save: {
    Options: { type: string };
    Result: { id: number };
  };
  read: {
    Options: { id: number; foo: number };
  };
  destroy: {
    Options: { id: number; foo: string };
  };
};

const hooks = new Hook.Collection<HooksType>();

hooks.before("destroy", (options) => {
  // `options.id` has `number` type
});

hooks.error("add", (err, options) => {
  // `options.type` has `string` type
  // `err` is `instanceof Error`
});

hooks.error("save", (err, options) => {
  // `options.type` has `string` type
  // `err` has type `any`
});

hooks.after("save", (result, options) => {
  // `options.type` has `string` type
  // `result.id` has `number` type
});
```

You can choose not to pass the types altogether. In that case, everything will implicitly be `any`:

```ts
const hook = new Hook.Collection();
```

Alternative imports:

```ts
import { Singular, Collection } from "before-after-hook";

const hook = new Singular();
const hooks = new Collection();
```

## Upgrading to 1.4

Since version 1.4 the `Hook` constructor has been deprecated in favor of returning `Hook.Singular` in an upcoming breaking release.

Version 1.4 is still 100% backwards-compatible, but if you want to continue using hook collections, we recommend using the `Hook.Collection` constructor instead before the next release.

For even more details, check out [the PR](https://github.com/gr2m/before-after-hook/pull/52).

## See also

If `before-after-hook` is not for you, have a look at one of these alternatives:

- https://github.com/keystonejs/grappling-hook
- https://github.com/sebelga/promised-hooks
- https://github.com/bnoguchi/hooks-js
- https://github.com/cb1kenobi/hook-emitter

## License

[Apache 2.0](LICENSE)
