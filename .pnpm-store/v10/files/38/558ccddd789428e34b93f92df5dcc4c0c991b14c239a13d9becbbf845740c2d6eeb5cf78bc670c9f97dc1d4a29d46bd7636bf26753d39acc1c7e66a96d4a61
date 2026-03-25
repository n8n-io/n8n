# alien-signals

Project Status: **Preview**

The goal of `alien-signals` is to create a Signal library with the lowest overhead.

We have set the following scheduling logic constraints:

1. Based on Push-Pull
2. No dynamic objects
3. No use of Array/Set/Map
4. No recursion calls
5. Class properties must be fewer than 10 (https://v8.dev/blog/fast-properties)

Experimental results have shown that with these constraints, it is possible to achieve excellent performance for a Signal library without using sophisticated scheduling strategies. The overall performance of `alien-signals` is approximately 400% that of Vue 3.4's reactivity system.

For more detailed performance comparisons, please visit: https://github.com/transitive-bullshit/js-reactivity-benchmark

## Motivation

To achieve high-performance code generation in https://github.com/vuejs/language-tools, I needed to write some on-demand computed logic using Signals, but I couldn't find a low-cost Signal library that satisfied me.

In the past, I accumulated some knowledge of reactivity systems in https://github.com/vuejs/core/pull/5912, so I attempted to develop `alien-signals` with the goal of creating a Signal library with minimal memory usage and excellent performance.

Since Vue 3.5 switched to a Pull reactivity system in https://github.com/vuejs/core/pull/10397, I continued to research the Push-Pull reactivity system here. It is worth mentioning that I was inspired by the doubly-linked concept, but `alien-signals` does not use a similar implementation.

## Usage

### Basic

```ts
import { signal, computed, effect } from 'alien-signals';

const count = signal(1);
const doubleCount = computed(() => count.get() * 2);

effect(() => {
  console.log(`Count is: ${count.get()}`);
}); // Console: Count is: 1

console.log(doubleCount.get()); // 2

count.set(2); // Console: Count is: 2

console.log(doubleCount.get()); // 4
```

### Effect Scope

```ts
import { signal, effectScope } from 'alien-signals';

const count = signal(1);
const scope = effectScope();

scope.run(() => {
  effect(() => {
    console.log(`Count in scope: ${count.get()}`);
  }); // Console: Count in scope: 1

  count.set(2); // Console: Count in scope: 2
});

scope.stop();

count.set(3); // No console output
```

## Roadmap

| Version | Savings                                                                                       |
|---------|-----------------------------------------------------------------------------------------------|
| 0.3     | Correctly schedule child effect scopes                                                        |
| 0.2     | Correctly schedule computed side effects                                                      |
| 0.1     | Correctly schedule inner effect callbacks                                                     |
| 0.0     | Add APIs: `signal()`, `computed()`, `effect()`, `effectScope()`, `startBatch()`, `endBatch()` |
