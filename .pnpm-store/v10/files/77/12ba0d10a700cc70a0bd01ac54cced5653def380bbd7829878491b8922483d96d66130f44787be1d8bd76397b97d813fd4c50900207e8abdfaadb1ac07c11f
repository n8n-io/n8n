[type-definitions]: https://github.com/jestjs/jest/blob/main/packages/jest-types/src/Circus.ts

<h1 align="center">
  <img src="https://jestjs.io/img/jest.png" height="150" width="150"/>
  <img src="https://jestjs.io/img/circus.png" height="150" width="150"/>
  <p align="center">jest-circus</p>
  <p align="center">The next-gen test runner for Jest</p>
</h1>

## Overview

Circus is a flux-based test runner for Jest that is fast, maintainable, and simple to extend.

Circus allows you to bind to events via an optional event handler on any [custom environment](https://jestjs.io/docs/configuration#testenvironment-string). See the [type definitions][type-definitions] for more information on the events and state data currently available.

```js
import {Event, State} from 'jest-circus';
import {TestEnvironment as NodeEnvironment} from 'jest-environment-node';

class MyCustomEnvironment extends NodeEnvironment {
  //...

  async handleTestEvent(event: Event, state: State) {
    if (event.name === 'test_start') {
      // ...
    }
  }
}
```

Mutating event or state data is currently unsupported and may cause unexpected behavior or break in a future release without warning. New events, event data, and/or state data will not be considered a breaking change and may be added in any minor release.

Note, that `jest-circus` test runner would pause until a promise returned from `handleTestEvent` gets fulfilled. **However, there are a few events that do not conform to this rule, namely**: `start_describe_definition`, `finish_describe_definition`, `add_hook`, `add_test` or `error` (for the up-to-date list you can look at [SyncEvent type in the types definitions][type-definitions]). That is caused by backward compatibility reasons and `process.on('unhandledRejection', callback)` signature, but that usually should not be a problem for most of the use cases.

## Installation

> Note: As of Jest 27, `jest-circus` is the default test runner, so you do not have to install it to use it.

Install `jest-circus` using yarn:

```bash
yarn add --dev jest-circus
```

Or via npm:

```bash
npm install --save-dev jest-circus
```

## Configure

Configure Jest to use `jest-circus` via the [`testRunner`](https://jestjs.io/docs/configuration#testrunner-string) option:

```json
{
  "testRunner": "jest-circus/runner"
}
```

Or via CLI:

```bash
jest --testRunner='jest-circus/runner'
```
