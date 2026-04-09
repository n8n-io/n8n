<p align="center">
	<img src="assets/logo.png" width="250"><br>
<p>

<p align="center">
	<a href="https://npmjs.com/package/alien-signals"><img src="https://badgen.net/npm/v/alien-signals" alt="npm package"></a>
</p>

# alien-signals

This project explores a push-pull based signal algorithm. Its current implementation is similar to or related to certain other frontend projects:

- Propagation algorithm of Vue 3
- Preact’s double-linked-list approach (https://preactjs.com/blog/signal-boosting/)
- Inner effects scheduling of Svelte
- Graph-coloring approach of Reactively (https://milomg.dev/2022-12-01/reactivity)

We impose some constraints (such as not using Array/Set/Map and disallowing function recursion) to ensure performance. We found that under these conditions, maintaining algorithmic simplicity offers more significant improvements than complex scheduling strategies.

Even though Vue 3.4 is already optimized, alien-signals is still noticeably faster. (I wrote code for both, and since they share similar algorithms, they’re quite comparable.)

<img width="1210" alt="Image" src="https://github.com/user-attachments/assets/88448f6d-4034-4389-89aa-9edf3da77254" />

> Benchmark repo: https://github.com/transitive-bullshit/js-reactivity-benchmark

## Background

I spent considerable time [optimizing Vue 3.4’s reactivity system](https://github.com/vuejs/core/pull/5912), gaining experience along the way. Since Vue 3.5 [switched to a pull-based algorithm similar to Preact](https://github.com/vuejs/core/pull/10397), I decided to continue researching a push-pull based implementation in a separate project. Our end goal is to implement fully incremental AST parsing and virtual code generation in Vue language tools, based on alien-signals.

## Derived Projects

- [YanqingXu/alien-signals-in-lua](https://github.com/YanqingXu/alien-signals-in-lua): Lua implementation of alien-signals
- [medz/alien-signals-dart](https://github.com/medz/alien-signals-dart): Dart implementation of alien-signals
- [delaneyj/alien-signals-go](https://github.com/delaneyj/alien-signals-go): Go implementation of alien-signals
- [Rajaniraiyn/react-alien-signals](https://github.com/Rajaniraiyn/react-alien-signals): React bindings for the alien-signals API
- [CCherry07/alien-deepsignals](https://github.com/CCherry07/alien-deepsignals): Use alien-signals with the interface of a plain JavaScript object
- [hunghg255/reactjs-signal](https://github.com/hunghg255/reactjs-signal): Share Store State with Signal Pattern
- [gn8-ai/universe-alien-signals](https://github.com/gn8-ai/universe-alien-signals): Enables simple use of the Alien Signals state management system in modern frontend frameworks

## Adoption

- [vuejs/core](https://github.com/vuejs/core): The core algorithm has been ported to 3.6 or higher (PR：https://github.com/vuejs/core/pull/12349)
- [vuejs/language-tools](https://github.com/vuejs/language-tools): Used in the language-core package for virtual code generation

## Usage

#### Basic APIs

```ts
import { signal, computed, effect } from 'alien-signals';

const count = signal(1);
const doubleCount = computed(() => count() * 2);

effect(() => {
  console.log(`Count is: ${count()}`);
}); // Console: Count is: 1

console.log(doubleCount()); // 2

count(2); // Console: Count is: 2

console.log(doubleCount()); // 4
```

#### Effect Scope

```ts
import { signal, effect, effectScope } from 'alien-signals';

const count = signal(1);

const stopScope = effectScope(() => {
  effect(() => {
    console.log(`Count in scope: ${count()}`);
  }); // Console: Count in scope: 1
});

count(2); // Console: Count in scope: 2

stopScope();

count(3); // No console output
```

#### Creating Your Own Surface API

You can reuse alien-signals’ core algorithm via `createReactiveSystem()` to build your own signal API. For implementation examples, see:

- [Starter template](https://github.com/johnsoncodehk/alien-signals-starter) (implements  `.get()` & `.set()` methods like the [Signals proposal](https://github.com/tc39/proposal-signals))
- [stackblitz/alien-signals/src/index.ts](https://github.com/stackblitz/alien-signals/blob/master/src/index.ts)
- [proposal-signals/signal-polyfill#44](https://github.com/proposal-signals/signal-polyfill/pull/44)


## About `propagate` and `checkDirty` functions

In order to eliminate recursive calls and improve performance, we record the last link node of the previous loop in `propagate` and `checkDirty` functions, and implement the rollback logic to return to this node.

This results in code that is difficult to understand, and you don't necessarily get the same performance improvements in other languages, so we record the original implementation without eliminating recursive calls here for reference.

#### `propagate`

```ts
function propagate(link: Link, targetFlag = SubscriberFlags.Dirty): void {
	do {
		const sub = link.sub;
		const subFlags = sub.flags;

		let shouldNotify = false;

		if (!(subFlags & (SubscriberFlags.Tracking | SubscriberFlags.Recursed | SubscriberFlags.Propagated))) {
			sub.flags = subFlags | targetFlag | SubscriberFlags.Notified;
			shouldNotify = true;
		} else if ((subFlags & SubscriberFlags.Recursed) && !(subFlags & SubscriberFlags.Tracking)) {
			sub.flags = (subFlags & ~SubscriberFlags.Recursed) | targetFlag | SubscriberFlags.Notified;
			shouldNotify = true;
		} else if (!(subFlags & SubscriberFlags.Propagated) && isValidLink(current, sub)) {
			sub.flags = subFlags | SubscriberFlags.Recursed | targetFlag | SubscriberFlags.Notified;
			shouldNotify = (sub as Dependency).subs !== undefined;
		}

		if (shouldNotify) {
			const subSubs = (sub as Dependency).subs;
			if (subSubs !== undefined) {
				propagate(
					subSubs,
					subFlags & SubscriberFlags.Effect
						? SubscriberFlags.PendingEffect
						: SubscriberFlags.PendingComputed
				);
			}
			if (subFlags & SubscriberFlags.Effect) {
				if (queuedEffectsTail !== undefined) {
					queuedEffectsTail = queuedEffectsTail.linked = { target: sub, linked: undefined };
				} else {
					queuedEffectsTail = queuedEffects = { target: sub, linked: undefined };
				}
			}
		} else if (!(subFlags & (SubscriberFlags.Tracking | targetFlag))) {
			sub.flags = subFlags | targetFlag | SubscriberFlags.Notified;
			if ((subFlags & (SubscriberFlags.Effect | SubscriberFlags.Notified)) === SubscriberFlags.Effect) {
				if (queuedEffectsTail !== undefined) {
					queuedEffectsTail = queuedEffectsTail.linked = { target: sub, linked: undefined };
				} else {
					queuedEffectsTail = queuedEffects = { target: sub, linked: undefined };
				}
			}
		} else if (
			!(subFlags & targetFlag)
			&& (subFlags & SubscriberFlags.Propagated)
			&& isValidLink(link, sub)
		) {
			sub.flags = subFlags | targetFlag;
		}

		link = link.nextSub!;
	} while (link !== undefined);
}
```

#### `checkDirty`

```ts
function checkDirty(link: Link): boolean {
	do {
		const dep = link.dep;
		if ('flags' in dep) {
			const depFlags = dep.flags;
			if ((depFlags & (SubscriberFlags.Computed | SubscriberFlags.Dirty)) === (SubscriberFlags.Computed | SubscriberFlags.Dirty)) {
				if (updateComputed(dep)) {
					const subs = dep.subs!;
					if (subs.nextSub !== undefined) {
						shallowPropagate(subs);
					}
					return true;
				}
			} else if ((depFlags & (SubscriberFlags.Computed | SubscriberFlags.PendingComputed)) === (SubscriberFlags.Computed | SubscriberFlags.PendingComputed)) {
				if (checkDirty(dep.deps!)) {
					if (updateComputed(dep)) {
						const subs = dep.subs!;
						if (subs.nextSub !== undefined) {
							shallowPropagate(subs);
						}
						return true;
					}
				} else {
					dep.flags = depFlags & ~SubscriberFlags.PendingComputed;
				}
			}
		}
		link = link.nextDep!;
	} while (link !== undefined);

	return false;
}
```
