# mobx-react-lite

[![CircleCI](https://circleci.com/gh/mobxjs/mobx-react-lite.svg?style=svg)](https://circleci.com/gh/mobxjs/mobx-react-lite)
[![Coverage Status](https://coveralls.io/repos/github/mobxjs/mobx-react-lite/badge.svg)](https://coveralls.io/github/mobxjs/mobx-react-lite)
[![NPM downloads](https://img.shields.io/npm/dm/mobx-react-lite.svg?style=flat)](https://npmjs.com/package/mobx-react-lite)[![Minzipped size](https://img.shields.io/bundlephobia/minzip/mobx-react-lite.svg)](https://bundlephobia.com/result?p=mobx-react-lite)
[![Discuss on Github](https://img.shields.io/badge/discuss%20on-GitHub-orange)](https://github.com/mobxjs/mobx/discussions)
[![View changelog](https://img.shields.io/badge/changelogs.xyz-Explore%20Changelog-brightgreen)](https://changelogs.xyz/mobx-react-lite)

This is a lighter version of [mobx-react](https://github.com/mobxjs/mobx-react) which supports React **functional components only** and as such makes the library slightly faster and smaller (_only 1.5kB gzipped_). Note however that it is possible to use `<Observer>` inside the render of class components.
Unlike `mobx-react`, it doesn't `Provider`/`inject`, as `useContext` can be used instead.

## Compatibility table (major versions)

| mobx | mobx-react-lite | Browser                                        |
| ---- | --------------- | ---------------------------------------------- |
| 6    | 3               | Modern browsers (IE 11+ in compatibility mode) |
| 5    | 2               | Modern browsers                                |
| 4    | 2               | IE 11+, RN w/o Proxy support                   |

`mobx-react-lite` requires React 16.8 or higher.

## User Guide 👉 https://mobx.js.org/react-integration.html

---

## API reference ⚒

### **`observer<P>(baseComponent: FunctionComponent<P>): FunctionComponent<P>`**

The observer converts a component into a reactive component, which tracks which observables are used automatically and re-renders the component when one of these values changes.
Can only be used for function components. For class component support see the `mobx-react` package.

### **`<Observer>{renderFn}</Observer>`**

Is a React component, which applies observer to an anonymous region in your component. `<Observer>` can be used both inside class and function components.

### **`useLocalObservable<T>(initializer: () => T, annotations?: AnnotationsMap<T>): T`**

Creates an observable object with the given properties, methods and computed values.

Note that computed values cannot directly depend on non-observable values, but only on observable values, so it might be needed to sync properties into the observable using `useEffect` (see the example below at `useAsObservableSource`).

`useLocalObservable` is a short-hand for:

`const [state] = useState(() => observable(initializer(), annotations, { autoBind: true }))`

### **`enableStaticRendering(enable: true)`**

Call `enableStaticRendering(true)` when running in an SSR environment, in which `observer` wrapped components should never re-render, but cleanup after the first rendering automatically. Use `isUsingStaticRendering()` to inspect the current setting.

---

## Deprecated APIs

### **`useObserver<T>(fn: () => T, baseComponentName = "observed", options?: IUseObserverOptions): T`** (deprecated)

_This API is deprecated in 3.\*. It is often used wrong (e.g. to select data rather than for rendering, and `<Observer>` better decouples the rendering from the component updates_

```ts
interface IUseObserverOptions {
    // optional custom hook that should make a component re-render (or not) upon changes
    // Supported in 2.x only
    useForceUpdate: () => () => void
}
```

It allows you to use an observer like behaviour, but still allowing you to optimize the component in any way you want (e.g. using memo with a custom areEqual, using forwardRef, etc.) and to declare exactly the part that is observed (the render phase).

### **`useLocalStore<T, S>(initializer: () => T, source?: S): T`** (deprecated)

_This API is deprecated in 3.\*. Use `useLocalObservable` instead. They do roughly the same, but `useLocalObservable` accepts an set of annotations as second argument, rather than a `source` object. Using `source` is not recommended, see the deprecation message at `useAsObservableSource` for details_

Local observable state can be introduced by using the useLocalStore hook, that runs its initializer function once to create an observable store and keeps it around for a lifetime of a component.

The annotations are similar to the annotations that are passed in to MobX's [`observable`](https://mobx.js.org/observable.html#available-annotations) API, and can be used to override the automatic member inference of specific fields.

### **`useAsObservableSource<T>(source: T): T`** (deprecated)

The useAsObservableSource hook can be used to turn any set of values into an observable object that has a stable reference (the same object is returned every time from the hook).

_This API is deprecated in 3.\* as it relies on observables to be updated during rendering which is an anti-pattern. Instead, use `useEffect` to synchronize non-observable values with values. Example:_

```javascript
// Before:
function Measurement({ unit }) {
    const observableProps = useAsObservableSource({ unit })
    const state = useLocalStore(() => ({
        length: 0,
        get lengthWithUnit() {
            // lengthWithUnit can only depend on observables, hence the above conversion with `useAsObservableSource`
            return observableProps.unit === "inch"
                ? `${this.length / 2.54} inch`
                : `${this.length} cm`
        }
    }))

    return <h1>{state.lengthWithUnit}</h1>
}

// After:
function Measurement({ unit }) {
    const state = useLocalObservable(() => ({
        unit, // the initial unit
        length: 0,
        get lengthWithUnit() {
            // lengthWithUnit can only depend on observables, hence the above conversion with `useAsObservableSource`
            return this.unit === "inch" ? `${this.length / 2.54} inch` : `${this.length} cm`
        }
    }))

    useEffect(() => {
        // sync the unit from 'props' into the observable 'state'
        state.unit = unit
    }, [unit])

    return <h1>{state.lengthWithUnit}</h1>
}
```

Note that, at your own risk, it is also possible to not use `useEffect`, but do `state.unit = unit` instead in the rendering.
This is closer to the old behavior, but React will warn correctly about this if this would affect the rendering of other components.

## Observer batching (deprecated)

_Note: configuring observer batching is only needed when using `mobx-react-lite` 2.0.* or 2.1.*. From 2.2 onward it will be configured automatically based on the availability of react-dom / react-native packages_

[Check out the elaborate explanation](https://github.com/mobxjs/mobx-react/pull/787#issuecomment-573599793).

In short without observer batching the React doesn't guarantee the order component rendering in some cases. We highly recommend that you configure batching to avoid these random surprises.

Import one of these before any React rendering is happening, typically `index.js/ts`. For Jest tests you can utilize [setupFilesAfterEnv](https://jestjs.io/docs/en/configuration#setupfilesafterenv-array).

**React DOM:**

> import 'mobx-react-lite/batchingForReactDom'

**React Native:**

> import 'mobx-react-lite/batchingForReactNative'

### Opt-out

To opt-out from batching in some specific cases, simply import the following to silence the warning.

> import 'mobx-react-lite/batchingOptOut'

### Custom batched updates

Above imports are for a convenience to utilize standard versions of batching. If you for some reason have customized version of batched updates, you can do the following instead.

```js
import { observerBatching } from "mobx-react-lite"
observerBatching(customBatchedUpdates)
```

## Testing

Running the full test suite now requires node 14+
But the library itself does not have this limitation

In order to avoid memory leaks due to aborted renders from React
fiber handling or React `StrictMode`, on environments that does not support [FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry), this library needs to
run timers to tidy up the remains of the aborted renders.

This can cause issues with test frameworks such as Jest
which require that timers be cleaned up before the tests
can exit.

### **`clearTimers()`**

Call `clearTimers()` in the `afterEach` of your tests to ensure
that `mobx-react-lite` cleans up immediately and allows tests
to exit.
