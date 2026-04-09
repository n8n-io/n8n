import { computed, customRef, effectScope, getCurrentInstance, getCurrentScope, hasInjectionContext, inject, isReactive, isRef, nextTick, onBeforeMount, onBeforeUnmount, onMounted, onScopeDispose, onUnmounted, provide, reactive, readonly, ref, shallowReadonly, shallowRef, toRef as toRef$1, toRefs as toRefs$1, toValue, unref, watch, watchEffect } from "vue";

//#region computedEager/index.ts
/**
*
* @deprecated This function will be removed in future version.
*
* Note: If you are using Vue 3.4+, you can straight use computed instead.
* Because in Vue 3.4+, if computed new value does not change,
* computed, effect, watch, watchEffect, render dependencies will not be triggered.
* refer: https://github.com/vuejs/core/pull/5912
*
* @param fn effect function
* @param options WatchOptionsBase
* @returns readonly shallowRef
*/
function computedEager(fn, options) {
	var _options$flush;
	const result = shallowRef();
	watchEffect(() => {
		result.value = fn();
	}, {
		...options,
		flush: (_options$flush = options === null || options === void 0 ? void 0 : options.flush) !== null && _options$flush !== void 0 ? _options$flush : "sync"
	});
	return readonly(result);
}
/** @deprecated use `computedEager` instead */
const eagerComputed = computedEager;

//#endregion
//#region computedWithControl/index.ts
/**
* Explicitly define the deps of computed.
*
* @param source
* @param fn
*/
function computedWithControl(source, fn, options = {}) {
	let v = void 0;
	let track;
	let trigger;
	let dirty = true;
	const update = () => {
		dirty = true;
		trigger();
	};
	watch(source, update, {
		flush: "sync",
		...options
	});
	const get$1 = typeof fn === "function" ? fn : fn.get;
	const set$1 = typeof fn === "function" ? void 0 : fn.set;
	const result = customRef((_track, _trigger) => {
		track = _track;
		trigger = _trigger;
		return {
			get() {
				if (dirty) {
					v = get$1(v);
					dirty = false;
				}
				track();
				return v;
			},
			set(v$1) {
				set$1 === null || set$1 === void 0 || set$1(v$1);
			}
		};
	});
	result.trigger = update;
	return result;
}
/** @deprecated use `computedWithControl` instead */
const controlledComputed = computedWithControl;

//#endregion
//#region tryOnScopeDispose/index.ts
/**
* Call onScopeDispose() if it's inside an effect scope lifecycle, if not, do nothing
*
* @param fn
*/
function tryOnScopeDispose(fn, failSilently) {
	if (getCurrentScope()) {
		onScopeDispose(fn, failSilently);
		return true;
	}
	return false;
}

//#endregion
//#region createEventHook/index.ts
/**
* Utility for creating event hooks
*
* @see https://vueuse.org/createEventHook
*
* @__NO_SIDE_EFFECTS__
*/
function createEventHook() {
	const fns = /* @__PURE__ */ new Set();
	const off = (fn) => {
		fns.delete(fn);
	};
	const clear = () => {
		fns.clear();
	};
	const on = (fn) => {
		fns.add(fn);
		const offFn = () => off(fn);
		tryOnScopeDispose(offFn);
		return { off: offFn };
	};
	const trigger = (...args) => {
		return Promise.all(Array.from(fns).map((fn) => fn(...args)));
	};
	return {
		on,
		off,
		trigger,
		clear
	};
}

//#endregion
//#region createGlobalState/index.ts
/**
* Keep states in the global scope to be reusable across Vue instances.
*
* @see https://vueuse.org/createGlobalState
* @param stateFactory A factory function to create the state
*
* @__NO_SIDE_EFFECTS__
*/
function createGlobalState(stateFactory) {
	let initialized = false;
	let state;
	const scope = effectScope(true);
	return ((...args) => {
		if (!initialized) {
			state = scope.run(() => stateFactory(...args));
			initialized = true;
		}
		return state;
	});
}

//#endregion
//#region provideLocal/map.ts
const localProvidedStateMap = /* @__PURE__ */ new WeakMap();

//#endregion
//#region injectLocal/index.ts
/**
* On the basis of `inject`, it is allowed to directly call inject to obtain the value after call provide in the same component.
*
* @example
* ```ts
* injectLocal('MyInjectionKey', 1)
* const injectedValue = injectLocal('MyInjectionKey') // injectedValue === 1
* ```
*
* @__NO_SIDE_EFFECTS__
*/
const injectLocal = (...args) => {
	var _getCurrentInstance;
	const key = args[0];
	const instance = (_getCurrentInstance = getCurrentInstance()) === null || _getCurrentInstance === void 0 ? void 0 : _getCurrentInstance.proxy;
	const owner = instance !== null && instance !== void 0 ? instance : getCurrentScope();
	if (owner == null && !hasInjectionContext()) throw new Error("injectLocal must be called in setup");
	if (owner && localProvidedStateMap.has(owner) && key in localProvidedStateMap.get(owner)) return localProvidedStateMap.get(owner)[key];
	return inject(...args);
};

//#endregion
//#region provideLocal/index.ts
/**
* On the basis of `provide`, it is allowed to directly call inject to obtain the value after call provide in the same component.
*
* @example
* ```ts
* provideLocal('MyInjectionKey', 1)
* const injectedValue = injectLocal('MyInjectionKey') // injectedValue === 1
* ```
*/
function provideLocal(key, value) {
	var _getCurrentInstance;
	const instance = (_getCurrentInstance = getCurrentInstance()) === null || _getCurrentInstance === void 0 ? void 0 : _getCurrentInstance.proxy;
	const owner = instance !== null && instance !== void 0 ? instance : getCurrentScope();
	if (owner == null) throw new Error("provideLocal must be called in setup");
	if (!localProvidedStateMap.has(owner)) localProvidedStateMap.set(owner, Object.create(null));
	const localProvidedState = localProvidedStateMap.get(owner);
	localProvidedState[key] = value;
	return provide(key, value);
}

//#endregion
//#region createInjectionState/index.ts
/**
* Create global state that can be injected into components.
*
* @see https://vueuse.org/createInjectionState
*
* @__NO_SIDE_EFFECTS__
*/
function createInjectionState(composable, options) {
	const key = (options === null || options === void 0 ? void 0 : options.injectionKey) || Symbol(composable.name || "InjectionState");
	const defaultValue = options === null || options === void 0 ? void 0 : options.defaultValue;
	const useProvidingState = (...args) => {
		const state = composable(...args);
		provideLocal(key, state);
		return state;
	};
	const useInjectedState = () => injectLocal(key, defaultValue);
	return [useProvidingState, useInjectedState];
}

//#endregion
//#region createRef/index.ts
/**
* Returns a `deepRef` or `shallowRef` depending on the `deep` param.
*
* @example createRef(1) // ShallowRef<number>
* @example createRef(1, false) // ShallowRef<number>
* @example createRef(1, true) // Ref<number>
* @example createRef("string") // ShallowRef<string>
* @example createRef<"A"|"B">("A", true) // Ref<"A"|"B">
*
* @param value
* @param deep
* @returns the `deepRef` or `shallowRef`
*
* @__NO_SIDE_EFFECTS__
*/
function createRef(value, deep) {
	if (deep === true) return ref(value);
	else return shallowRef(value);
}

//#endregion
//#region utils/is.ts
const isClient = typeof window !== "undefined" && typeof document !== "undefined";
const isWorker = typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;
const isDef = (val) => typeof val !== "undefined";
const notNullish = (val) => val != null;
const assert = (condition, ...infos) => {
	if (!condition) console.warn(...infos);
};
const toString = Object.prototype.toString;
const isObject = (val) => toString.call(val) === "[object Object]";
const now = () => Date.now();
const timestamp = () => +Date.now();
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const noop = () => {};
const rand = (min, max) => {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
const isIOS = /* @__PURE__ */ getIsIOS();
function getIsIOS() {
	var _window, _window2, _window3;
	return isClient && !!((_window = window) === null || _window === void 0 || (_window = _window.navigator) === null || _window === void 0 ? void 0 : _window.userAgent) && (/iP(?:ad|hone|od)/.test(window.navigator.userAgent) || ((_window2 = window) === null || _window2 === void 0 || (_window2 = _window2.navigator) === null || _window2 === void 0 ? void 0 : _window2.maxTouchPoints) > 2 && /iPad|Macintosh/.test((_window3 = window) === null || _window3 === void 0 ? void 0 : _window3.navigator.userAgent));
}

//#endregion
//#region toRef/index.ts
function toRef(...args) {
	if (args.length !== 1) return toRef$1(...args);
	const r = args[0];
	return typeof r === "function" ? readonly(customRef(() => ({
		get: r,
		set: noop
	}))) : ref(r);
}

//#endregion
//#region utils/filters.ts
/**
* @internal
*/
function createFilterWrapper(filter, fn) {
	function wrapper(...args) {
		return new Promise((resolve, reject) => {
			Promise.resolve(filter(() => fn.apply(this, args), {
				fn,
				thisArg: this,
				args
			})).then(resolve).catch(reject);
		});
	}
	return wrapper;
}
const bypassFilter = (invoke$1) => {
	return invoke$1();
};
/**
* Create an EventFilter that debounce the events
*/
function debounceFilter(ms, options = {}) {
	let timer;
	let maxTimer;
	let lastRejector = noop;
	const _clearTimeout = (timer$1) => {
		clearTimeout(timer$1);
		lastRejector();
		lastRejector = noop;
	};
	let lastInvoker;
	const filter = (invoke$1) => {
		const duration = toValue(ms);
		const maxDuration = toValue(options.maxWait);
		if (timer) _clearTimeout(timer);
		if (duration <= 0 || maxDuration !== void 0 && maxDuration <= 0) {
			if (maxTimer) {
				_clearTimeout(maxTimer);
				maxTimer = void 0;
			}
			return Promise.resolve(invoke$1());
		}
		return new Promise((resolve, reject) => {
			lastRejector = options.rejectOnCancel ? reject : resolve;
			lastInvoker = invoke$1;
			if (maxDuration && !maxTimer) maxTimer = setTimeout(() => {
				if (timer) _clearTimeout(timer);
				maxTimer = void 0;
				resolve(lastInvoker());
			}, maxDuration);
			timer = setTimeout(() => {
				if (maxTimer) _clearTimeout(maxTimer);
				maxTimer = void 0;
				resolve(invoke$1());
			}, duration);
		});
	};
	return filter;
}
function throttleFilter(...args) {
	let lastExec = 0;
	let timer;
	let isLeading = true;
	let lastRejector = noop;
	let lastValue;
	let ms;
	let trailing;
	let leading;
	let rejectOnCancel;
	if (!isRef(args[0]) && typeof args[0] === "object") ({delay: ms, trailing = true, leading = true, rejectOnCancel = false} = args[0]);
	else [ms, trailing = true, leading = true, rejectOnCancel = false] = args;
	const clear = () => {
		if (timer) {
			clearTimeout(timer);
			timer = void 0;
			lastRejector();
			lastRejector = noop;
		}
	};
	const filter = (_invoke) => {
		const duration = toValue(ms);
		const elapsed = Date.now() - lastExec;
		const invoke$1 = () => {
			return lastValue = _invoke();
		};
		clear();
		if (duration <= 0) {
			lastExec = Date.now();
			return invoke$1();
		}
		if (elapsed > duration) {
			lastExec = Date.now();
			if (leading || !isLeading) invoke$1();
		} else if (trailing) lastValue = new Promise((resolve, reject) => {
			lastRejector = rejectOnCancel ? reject : resolve;
			timer = setTimeout(() => {
				lastExec = Date.now();
				isLeading = true;
				resolve(invoke$1());
				clear();
			}, Math.max(0, duration - elapsed));
		});
		if (!leading && !timer) timer = setTimeout(() => isLeading = true, duration);
		isLeading = false;
		return lastValue;
	};
	return filter;
}
/**
* EventFilter that gives extra controls to pause and resume the filter
*
* @param extendFilter  Extra filter to apply when the PausableFilter is active, default to none
* @param options Options to configure the filter
*/
function pausableFilter(extendFilter = bypassFilter, options = {}) {
	const { initialState = "active" } = options;
	const isActive = toRef(initialState === "active");
	function pause() {
		isActive.value = false;
	}
	function resume() {
		isActive.value = true;
	}
	const eventFilter = (...args) => {
		if (isActive.value) extendFilter(...args);
	};
	return {
		isActive: readonly(isActive),
		pause,
		resume,
		eventFilter
	};
}

//#endregion
//#region utils/general.ts
function promiseTimeout(ms, throwOnTimeout = false, reason = "Timeout") {
	return new Promise((resolve, reject) => {
		if (throwOnTimeout) setTimeout(() => reject(reason), ms);
		else setTimeout(resolve, ms);
	});
}
function identity(arg) {
	return arg;
}
/**
* Create singleton promise function
*
* @example
* ```
* const promise = createSingletonPromise(async () => { ... })
*
* await promise()
* await promise() // all of them will be bind to a single promise instance
* await promise() // and be resolved together
* ```
*/
function createSingletonPromise(fn) {
	let _promise;
	function wrapper() {
		if (!_promise) _promise = fn();
		return _promise;
	}
	wrapper.reset = async () => {
		const _prev = _promise;
		_promise = void 0;
		if (_prev) await _prev;
	};
	return wrapper;
}
function invoke(fn) {
	return fn();
}
function containsProp(obj, ...props) {
	return props.some((k) => k in obj);
}
function increaseWithUnit(target, delta) {
	var _target$match;
	if (typeof target === "number") return target + delta;
	const value = ((_target$match = target.match(/^-?\d+\.?\d*/)) === null || _target$match === void 0 ? void 0 : _target$match[0]) || "";
	const unit = target.slice(value.length);
	const result = Number.parseFloat(value) + delta;
	if (Number.isNaN(result)) return target;
	return result + unit;
}
/**
* Get a px value for SSR use, do not rely on this method outside of SSR as REM unit is assumed at 16px, which might not be the case on the client
*/
function pxValue(px) {
	return px.endsWith("rem") ? Number.parseFloat(px) * 16 : Number.parseFloat(px);
}
/**
* Create a new subset object by giving keys
*/
function objectPick(obj, keys, omitUndefined = false) {
	return keys.reduce((n, k) => {
		if (k in obj) {
			if (!omitUndefined || obj[k] !== void 0) n[k] = obj[k];
		}
		return n;
	}, {});
}
/**
* Create a new subset object by omit giving keys
*/
function objectOmit(obj, keys, omitUndefined = false) {
	return Object.fromEntries(Object.entries(obj).filter(([key, value]) => {
		return (!omitUndefined || value !== void 0) && !keys.includes(key);
	}));
}
function objectEntries(obj) {
	return Object.entries(obj);
}
function toArray(value) {
	return Array.isArray(value) ? value : [value];
}

//#endregion
//#region utils/port.ts
function cacheStringFunction(fn) {
	const cache = Object.create(null);
	return ((str) => {
		return cache[str] || (cache[str] = fn(str));
	});
}
const hyphenateRE = /\B([A-Z])/g;
const hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, "-$1").toLowerCase());
const camelizeRE = /-(\w)/g;
const camelize = cacheStringFunction((str) => {
	return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
});

//#endregion
//#region utils/vue.ts
function getLifeCycleTarget(target) {
	return target || getCurrentInstance();
}

//#endregion
//#region createSharedComposable/index.ts
/**
* Make a composable function usable with multiple Vue instances.
*
* @see https://vueuse.org/createSharedComposable
*
* @__NO_SIDE_EFFECTS__
*/
function createSharedComposable(composable) {
	if (!isClient) return composable;
	let subscribers = 0;
	let state;
	let scope;
	const dispose = () => {
		subscribers -= 1;
		if (scope && subscribers <= 0) {
			scope.stop();
			state = void 0;
			scope = void 0;
		}
	};
	return ((...args) => {
		subscribers += 1;
		if (!scope) {
			scope = effectScope(true);
			state = scope.run(() => composable(...args));
		}
		tryOnScopeDispose(dispose);
		return state;
	});
}

//#endregion
//#region extendRef/index.ts
function extendRef(ref$1, extend, { enumerable = false, unwrap = true } = {}) {
	for (const [key, value] of Object.entries(extend)) {
		if (key === "value") continue;
		if (isRef(value) && unwrap) Object.defineProperty(ref$1, key, {
			get() {
				return value.value;
			},
			set(v) {
				value.value = v;
			},
			enumerable
		});
		else Object.defineProperty(ref$1, key, {
			value,
			enumerable
		});
	}
	return ref$1;
}

//#endregion
//#region get/index.ts
function get(obj, key) {
	if (key == null) return unref(obj);
	return unref(obj)[key];
}

//#endregion
//#region isDefined/index.ts
function isDefined(v) {
	return unref(v) != null;
}

//#endregion
//#region makeDestructurable/index.ts
/* @__NO_SIDE_EFFECTS__ */
function makeDestructurable(obj, arr) {
	if (typeof Symbol !== "undefined") {
		const clone = { ...obj };
		Object.defineProperty(clone, Symbol.iterator, {
			enumerable: false,
			value() {
				let index = 0;
				return { next: () => ({
					value: arr[index++],
					done: index > arr.length
				}) };
			}
		});
		return clone;
	} else return Object.assign([...arr], obj);
}

//#endregion
//#region reactify/index.ts
/**
* Converts plain function into a reactive function.
* The converted function accepts refs as it's arguments
* and returns a ComputedRef, with proper typing.
*
* @param fn - Source function
* @param options - Options
*
* @__NO_SIDE_EFFECTS__
*/
function reactify(fn, options) {
	const unrefFn = (options === null || options === void 0 ? void 0 : options.computedGetter) === false ? unref : toValue;
	return function(...args) {
		return computed(() => fn.apply(this, args.map((i) => unrefFn(i))));
	};
}
/** @deprecated use `reactify` instead */
const createReactiveFn = reactify;

//#endregion
//#region reactifyObject/index.ts
/**
* Apply `reactify` to an object
*
* @__NO_SIDE_EFFECTS__
*/
function reactifyObject(obj, optionsOrKeys = {}) {
	let keys = [];
	let options;
	if (Array.isArray(optionsOrKeys)) keys = optionsOrKeys;
	else {
		options = optionsOrKeys;
		const { includeOwnProperties = true } = optionsOrKeys;
		keys.push(...Object.keys(obj));
		if (includeOwnProperties) keys.push(...Object.getOwnPropertyNames(obj));
	}
	return Object.fromEntries(keys.map((key) => {
		const value = obj[key];
		return [key, typeof value === "function" ? reactify(value.bind(obj), options) : value];
	}));
}

//#endregion
//#region toReactive/index.ts
/**
* Converts ref to reactive.
*
* @see https://vueuse.org/toReactive
* @param objectRef A ref of object
*/
function toReactive(objectRef) {
	if (!isRef(objectRef)) return reactive(objectRef);
	return reactive(new Proxy({}, {
		get(_, p, receiver) {
			return unref(Reflect.get(objectRef.value, p, receiver));
		},
		set(_, p, value) {
			if (isRef(objectRef.value[p]) && !isRef(value)) objectRef.value[p].value = value;
			else objectRef.value[p] = value;
			return true;
		},
		deleteProperty(_, p) {
			return Reflect.deleteProperty(objectRef.value, p);
		},
		has(_, p) {
			return Reflect.has(objectRef.value, p);
		},
		ownKeys() {
			return Object.keys(objectRef.value);
		},
		getOwnPropertyDescriptor() {
			return {
				enumerable: true,
				configurable: true
			};
		}
	}));
}

//#endregion
//#region reactiveComputed/index.ts
/**
* Computed reactive object.
*/
function reactiveComputed(fn) {
	return toReactive(computed(fn));
}

//#endregion
//#region reactiveOmit/index.ts
/**
* Reactively omit fields from a reactive object
*
* @see https://vueuse.org/reactiveOmit
*/
function reactiveOmit(obj, ...keys) {
	const flatKeys = keys.flat();
	const predicate = flatKeys[0];
	return reactiveComputed(() => typeof predicate === "function" ? Object.fromEntries(Object.entries(toRefs$1(obj)).filter(([k, v]) => !predicate(toValue(v), k))) : Object.fromEntries(Object.entries(toRefs$1(obj)).filter((e) => !flatKeys.includes(e[0]))));
}

//#endregion
//#region reactivePick/index.ts
/**
* Reactively pick fields from a reactive object
*
* @see https://vueuse.org/reactivePick
*/
function reactivePick(obj, ...keys) {
	const flatKeys = keys.flat();
	const predicate = flatKeys[0];
	return reactiveComputed(() => typeof predicate === "function" ? Object.fromEntries(Object.entries(toRefs$1(obj)).filter(([k, v]) => predicate(toValue(v), k))) : Object.fromEntries(flatKeys.map((k) => [k, toRef(obj, k)])));
}

//#endregion
//#region refAutoReset/index.ts
/**
* Create a ref which will be reset to the default value after some time.
*
* @see https://vueuse.org/refAutoReset
* @param defaultValue The value which will be set.
* @param afterMs      A zero-or-greater delay in milliseconds.
*/
function refAutoReset(defaultValue, afterMs = 1e4) {
	return customRef((track, trigger) => {
		let value = toValue(defaultValue);
		let timer;
		const resetAfter = () => setTimeout(() => {
			value = toValue(defaultValue);
			trigger();
		}, toValue(afterMs));
		tryOnScopeDispose(() => {
			clearTimeout(timer);
		});
		return {
			get() {
				track();
				return value;
			},
			set(newValue) {
				value = newValue;
				trigger();
				clearTimeout(timer);
				timer = resetAfter();
			}
		};
	});
}
/** @deprecated use `refAutoReset` instead */
const autoResetRef = refAutoReset;

//#endregion
//#region useDebounceFn/index.ts
/**
* Debounce execution of a function.
*
* @see https://vueuse.org/useDebounceFn
* @param  fn          A function to be executed after delay milliseconds debounced.
* @param  ms          A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
* @param  options     Options
*
* @return A new, debounce, function.
*
* @__NO_SIDE_EFFECTS__
*/
function useDebounceFn(fn, ms = 200, options = {}) {
	return createFilterWrapper(debounceFilter(ms, options), fn);
}

//#endregion
//#region refDebounced/index.ts
/**
* Debounce updates of a ref.
*
* @return A new debounced ref.
*/
function refDebounced(value, ms = 200, options = {}) {
	const debounced = ref(toValue(value));
	const updater = useDebounceFn(() => {
		debounced.value = value.value;
	}, ms, options);
	watch(value, () => updater());
	return shallowReadonly(debounced);
}
/** @deprecated use `refDebounced` instead */
const debouncedRef = refDebounced;
/** @deprecated use `refDebounced` instead */
const useDebounce = refDebounced;

//#endregion
//#region refDefault/index.ts
/**
* Apply default value to a ref.
*
* @__NO_SIDE_EFFECTS__
*/
function refDefault(source, defaultValue) {
	return computed({
		get() {
			var _source$value;
			return (_source$value = source.value) !== null && _source$value !== void 0 ? _source$value : defaultValue;
		},
		set(value) {
			source.value = value;
		}
	});
}

//#endregion
//#region refManualReset/index.ts
/**
* Create a ref with manual reset functionality.
*
* @see https://vueuse.org/refManualReset
* @param defaultValue The value which will be set.
*/
function refManualReset(defaultValue) {
	let value = toValue(defaultValue);
	let trigger;
	const reset = () => {
		value = toValue(defaultValue);
		trigger();
	};
	const refValue = customRef((track, _trigger) => {
		trigger = _trigger;
		return {
			get() {
				track();
				return value;
			},
			set(newValue) {
				value = newValue;
				trigger();
			}
		};
	});
	refValue.reset = reset;
	return refValue;
}

//#endregion
//#region useThrottleFn/index.ts
/**
* Throttle execution of a function. Especially useful for rate limiting
* execution of handlers on events like resize and scroll.
*
* @param   fn             A function to be executed after delay milliseconds. The `this` context and all arguments are passed through, as-is,
*                                    to `callback` when the throttled-function is executed.
* @param   ms             A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
*                                    (default value: 200)
*
* @param [trailing] if true, call fn again after the time is up (default value: false)
*
* @param [leading] if true, call fn on the leading edge of the ms timeout (default value: true)
*
* @param [rejectOnCancel] if true, reject the last call if it's been cancel (default value: false)
*
* @return  A new, throttled, function.
*
* @__NO_SIDE_EFFECTS__
*/
function useThrottleFn(fn, ms = 200, trailing = false, leading = true, rejectOnCancel = false) {
	return createFilterWrapper(throttleFilter(ms, trailing, leading, rejectOnCancel), fn);
}

//#endregion
//#region refThrottled/index.ts
/**
* Throttle execution of a function. Especially useful for rate limiting
* execution of handlers on events like resize and scroll.
*
* @param value Ref value to be watched with throttle effect
* @param  delay  A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
* @param trailing if true, update the value again after the delay time is up
* @param leading if true, update the value on the leading edge of the ms timeout
*/
function refThrottled(value, delay = 200, trailing = true, leading = true) {
	if (delay <= 0) return value;
	const throttled = ref(toValue(value));
	const updater = useThrottleFn(() => {
		throttled.value = value.value;
	}, delay, trailing, leading);
	watch(value, () => updater());
	return throttled;
}
/** @deprecated use `refThrottled` instead */
const throttledRef = refThrottled;
/** @deprecated use `refThrottled` instead */
const useThrottle = refThrottled;

//#endregion
//#region refWithControl/index.ts
/**
* Fine-grained controls over ref and its reactivity.
*
* @__NO_SIDE_EFFECTS__
*/
function refWithControl(initial, options = {}) {
	let source = initial;
	let track;
	let trigger;
	const ref$1 = customRef((_track, _trigger) => {
		track = _track;
		trigger = _trigger;
		return {
			get() {
				return get$1();
			},
			set(v) {
				set$1(v);
			}
		};
	});
	function get$1(tracking = true) {
		if (tracking) track();
		return source;
	}
	function set$1(value, triggering = true) {
		var _options$onBeforeChan, _options$onChanged;
		if (value === source) return;
		const old = source;
		if (((_options$onBeforeChan = options.onBeforeChange) === null || _options$onBeforeChan === void 0 ? void 0 : _options$onBeforeChan.call(options, value, old)) === false) return;
		source = value;
		(_options$onChanged = options.onChanged) === null || _options$onChanged === void 0 || _options$onChanged.call(options, value, old);
		if (triggering) trigger();
	}
	/**
	* Get the value without tracked in the reactivity system
	*/
	const untrackedGet = () => get$1(false);
	/**
	* Set the value without triggering the reactivity system
	*/
	const silentSet = (v) => set$1(v, false);
	/**
	* Get the value without tracked in the reactivity system.
	*
	* Alias for `untrackedGet()`
	*/
	const peek = () => get$1(false);
	/**
	* Set the value without triggering the reactivity system
	*
	* Alias for `silentSet(v)`
	*/
	const lay = (v) => set$1(v, false);
	return extendRef(ref$1, {
		get: get$1,
		set: set$1,
		untrackedGet,
		silentSet,
		peek,
		lay
	}, { enumerable: true });
}
/** @deprecated use `refWithControl` instead */
const controlledRef = refWithControl;

//#endregion
//#region set/index.ts
/**
*  Shorthand for `ref.value = x`
*/
function set(...args) {
	if (args.length === 2) {
		const [ref$1, value] = args;
		ref$1.value = value;
	}
	if (args.length === 3) {
		const [target, key, value] = args;
		target[key] = value;
	}
}

//#endregion
//#region watchWithFilter/index.ts
function watchWithFilter(source, cb, options = {}) {
	const { eventFilter = bypassFilter,...watchOptions } = options;
	return watch(source, createFilterWrapper(eventFilter, cb), watchOptions);
}

//#endregion
//#region watchPausable/index.ts
/** @deprecated Use Vue's built-in `watch` instead. This function will be removed in future version. */
function watchPausable(source, cb, options = {}) {
	const { eventFilter: filter, initialState = "active",...watchOptions } = options;
	const { eventFilter, pause, resume, isActive } = pausableFilter(filter, { initialState });
	return {
		stop: watchWithFilter(source, cb, {
			...watchOptions,
			eventFilter
		}),
		pause,
		resume,
		isActive
	};
}
/** @deprecated Use Vue's built-in `watch` instead. This function will be removed in future version. */
const pausableWatch = watchPausable;

//#endregion
//#region syncRef/index.ts
/**
* Two-way refs synchronization.
* From the set theory perspective to restrict the option's type
* Check in the following order:
* 1. L = R
* 2. L ∩ R ≠ ∅
* 3. L ⊆ R
* 4. L ∩ R = ∅
*/
function syncRef(left, right, ...[options]) {
	const { flush = "sync", deep = false, immediate = true, direction = "both", transform = {} } = options || {};
	const watchers = [];
	const transformLTR = "ltr" in transform && transform.ltr || ((v) => v);
	const transformRTL = "rtl" in transform && transform.rtl || ((v) => v);
	if (direction === "both" || direction === "ltr") watchers.push(watchPausable(left, (newValue) => {
		watchers.forEach((w) => w.pause());
		right.value = transformLTR(newValue);
		watchers.forEach((w) => w.resume());
	}, {
		flush,
		deep,
		immediate
	}));
	if (direction === "both" || direction === "rtl") watchers.push(watchPausable(right, (newValue) => {
		watchers.forEach((w) => w.pause());
		left.value = transformRTL(newValue);
		watchers.forEach((w) => w.resume());
	}, {
		flush,
		deep,
		immediate
	}));
	const stop = () => {
		watchers.forEach((w) => w.stop());
	};
	return stop;
}

//#endregion
//#region syncRefs/index.ts
/**
* Keep target ref(s) in sync with the source ref
*
* @param source source ref
* @param targets
*/
function syncRefs(source, targets, options = {}) {
	const { flush = "sync", deep = false, immediate = true } = options;
	const targetsArray = toArray(targets);
	return watch(source, (newValue) => targetsArray.forEach((target) => target.value = newValue), {
		flush,
		deep,
		immediate
	});
}

//#endregion
//#region toRefs/index.ts
/**
* Extended `toRefs` that also accepts refs of an object.
*
* @see https://vueuse.org/toRefs
* @param objectRef A ref or normal object or array.
* @param options Options
*/
function toRefs(objectRef, options = {}) {
	if (!isRef(objectRef)) return toRefs$1(objectRef);
	const result = Array.isArray(objectRef.value) ? Array.from({ length: objectRef.value.length }) : {};
	for (const key in objectRef.value) result[key] = customRef(() => ({
		get() {
			return objectRef.value[key];
		},
		set(v) {
			var _toValue;
			if ((_toValue = toValue(options.replaceRef)) !== null && _toValue !== void 0 ? _toValue : true) if (Array.isArray(objectRef.value)) {
				const copy = [...objectRef.value];
				copy[key] = v;
				objectRef.value = copy;
			} else {
				const newObject = {
					...objectRef.value,
					[key]: v
				};
				Object.setPrototypeOf(newObject, Object.getPrototypeOf(objectRef.value));
				objectRef.value = newObject;
			}
			else objectRef.value[key] = v;
		}
	}));
	return result;
}

//#endregion
//#region tryOnBeforeMount/index.ts
/**
* Call onBeforeMount() if it's inside a component lifecycle, if not, just call the function
*
* @param fn
* @param sync if set to false, it will run in the nextTick() of Vue
* @param target
*/
function tryOnBeforeMount(fn, sync = true, target) {
	if (getLifeCycleTarget(target)) onBeforeMount(fn, target);
	else if (sync) fn();
	else nextTick(fn);
}

//#endregion
//#region tryOnBeforeUnmount/index.ts
/**
* Call onBeforeUnmount() if it's inside a component lifecycle, if not, do nothing
*
* @param fn
* @param target
*/
function tryOnBeforeUnmount(fn, target) {
	if (getLifeCycleTarget(target)) onBeforeUnmount(fn, target);
}

//#endregion
//#region tryOnMounted/index.ts
/**
* Call onMounted() if it's inside a component lifecycle, if not, just call the function
*
* @param fn
* @param sync if set to false, it will run in the nextTick() of Vue
* @param target
*/
function tryOnMounted(fn, sync = true, target) {
	if (getLifeCycleTarget(target)) onMounted(fn, target);
	else if (sync) fn();
	else nextTick(fn);
}

//#endregion
//#region tryOnUnmounted/index.ts
/**
* Call onUnmounted() if it's inside a component lifecycle, if not, do nothing
*
* @param fn
* @param target
*/
function tryOnUnmounted(fn, target) {
	if (getLifeCycleTarget(target)) onUnmounted(fn, target);
}

//#endregion
//#region until/index.ts
function createUntil(r, isNot = false) {
	function toMatch(condition, { flush = "sync", deep = false, timeout, throwOnTimeout } = {}) {
		let stop = null;
		const promises = [new Promise((resolve) => {
			stop = watch(r, (v) => {
				if (condition(v) !== isNot) {
					if (stop) stop();
					else nextTick(() => stop === null || stop === void 0 ? void 0 : stop());
					resolve(v);
				}
			}, {
				flush,
				deep,
				immediate: true
			});
		})];
		if (timeout != null) promises.push(promiseTimeout(timeout, throwOnTimeout).then(() => toValue(r)).finally(() => stop === null || stop === void 0 ? void 0 : stop()));
		return Promise.race(promises);
	}
	function toBe(value, options) {
		if (!isRef(value)) return toMatch((v) => v === value, options);
		const { flush = "sync", deep = false, timeout, throwOnTimeout } = options !== null && options !== void 0 ? options : {};
		let stop = null;
		const promises = [new Promise((resolve) => {
			stop = watch([r, value], ([v1, v2]) => {
				if (isNot !== (v1 === v2)) {
					if (stop) stop();
					else nextTick(() => stop === null || stop === void 0 ? void 0 : stop());
					resolve(v1);
				}
			}, {
				flush,
				deep,
				immediate: true
			});
		})];
		if (timeout != null) promises.push(promiseTimeout(timeout, throwOnTimeout).then(() => toValue(r)).finally(() => {
			stop === null || stop === void 0 || stop();
			return toValue(r);
		}));
		return Promise.race(promises);
	}
	function toBeTruthy(options) {
		return toMatch((v) => Boolean(v), options);
	}
	function toBeNull(options) {
		return toBe(null, options);
	}
	function toBeUndefined(options) {
		return toBe(void 0, options);
	}
	function toBeNaN(options) {
		return toMatch(Number.isNaN, options);
	}
	function toContains(value, options) {
		return toMatch((v) => {
			const array = Array.from(v);
			return array.includes(value) || array.includes(toValue(value));
		}, options);
	}
	function changed(options) {
		return changedTimes(1, options);
	}
	function changedTimes(n = 1, options) {
		let count = -1;
		return toMatch(() => {
			count += 1;
			return count >= n;
		}, options);
	}
	if (Array.isArray(toValue(r))) return {
		toMatch,
		toContains,
		changed,
		changedTimes,
		get not() {
			return createUntil(r, !isNot);
		}
	};
	else return {
		toMatch,
		toBe,
		toBeTruthy,
		toBeNull,
		toBeNaN,
		toBeUndefined,
		changed,
		changedTimes,
		get not() {
			return createUntil(r, !isNot);
		}
	};
}
function until(r) {
	return createUntil(r);
}

//#endregion
//#region useArrayDifference/index.ts
function defaultComparator(value, othVal) {
	return value === othVal;
}
/**
* Reactive get array difference of two array
* @see https://vueuse.org/useArrayDifference
* @returns - the difference of two array
* @param args
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayDifference(...args) {
	var _args$, _args$2;
	const list = args[0];
	const values = args[1];
	let compareFn = (_args$ = args[2]) !== null && _args$ !== void 0 ? _args$ : defaultComparator;
	const { symmetric = false } = (_args$2 = args[3]) !== null && _args$2 !== void 0 ? _args$2 : {};
	if (typeof compareFn === "string") {
		const key = compareFn;
		compareFn = (value, othVal) => value[key] === othVal[key];
	}
	const diff1 = computed(() => toValue(list).filter((x) => toValue(values).findIndex((y) => compareFn(x, y)) === -1));
	if (symmetric) {
		const diff2 = computed(() => toValue(values).filter((x) => toValue(list).findIndex((y) => compareFn(x, y)) === -1));
		return computed(() => symmetric ? [...toValue(diff1), ...toValue(diff2)] : toValue(diff1));
	} else return diff1;
}

//#endregion
//#region useArrayEvery/index.ts
/**
* Reactive `Array.every`
*
* @see https://vueuse.org/useArrayEvery
* @param list - the array was called upon.
* @param fn - a function to test each element.
*
* @returns **true** if the `fn` function returns a **truthy** value for every element from the array. Otherwise, **false**.
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayEvery(list, fn) {
	return computed(() => toValue(list).every((element, index, array) => fn(toValue(element), index, array)));
}

//#endregion
//#region useArrayFilter/index.ts
/**
* Reactive `Array.filter`
*
* @see https://vueuse.org/useArrayFilter
* @param list - the array was called upon.
* @param fn - a function that is called for every element of the given `list`. Each time `fn` executes, the returned value is added to the new array.
*
* @returns a shallow copy of a portion of the given array, filtered down to just the elements from the given array that pass the test implemented by the provided function. If no elements pass the test, an empty array will be returned.
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayFilter(list, fn) {
	return computed(() => toValue(list).map((i) => toValue(i)).filter(fn));
}

//#endregion
//#region useArrayFind/index.ts
/**
* Reactive `Array.find`
*
* @see https://vueuse.org/useArrayFind
* @param list - the array was called upon.
* @param fn - a function to test each element.
*
* @returns the first element in the array that satisfies the provided testing function. Otherwise, undefined is returned.
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayFind(list, fn) {
	return computed(() => toValue(toValue(list).find((element, index, array) => fn(toValue(element), index, array))));
}

//#endregion
//#region useArrayFindIndex/index.ts
/**
* Reactive `Array.findIndex`
*
* @see https://vueuse.org/useArrayFindIndex
* @param list - the array was called upon.
* @param fn - a function to test each element.
*
* @returns the index of the first element in the array that passes the test. Otherwise, "-1".
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayFindIndex(list, fn) {
	return computed(() => toValue(list).findIndex((element, index, array) => fn(toValue(element), index, array)));
}

//#endregion
//#region useArrayFindLast/index.ts
function findLast(arr, cb) {
	let index = arr.length;
	while (index-- > 0) if (cb(arr[index], index, arr)) return arr[index];
}
/**
* Reactive `Array.findLast`
*
* @see https://vueuse.org/useArrayFindLast
* @param list - the array was called upon.
* @param fn - a function to test each element.
*
* @returns the last element in the array that satisfies the provided testing function. Otherwise, undefined is returned.
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayFindLast(list, fn) {
	return computed(() => toValue(!Array.prototype.findLast ? findLast(toValue(list), (element, index, array) => fn(toValue(element), index, array)) : toValue(list).findLast((element, index, array) => fn(toValue(element), index, array))));
}

//#endregion
//#region useArrayIncludes/index.ts
function isArrayIncludesOptions(obj) {
	return isObject(obj) && containsProp(obj, "formIndex", "comparator");
}
/**
* Reactive `Array.includes`
*
* @see https://vueuse.org/useArrayIncludes
*
* @returns true if the `value` is found in the array. Otherwise, false.
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayIncludes(...args) {
	var _comparator;
	const list = args[0];
	const value = args[1];
	let comparator = args[2];
	let formIndex = 0;
	if (isArrayIncludesOptions(comparator)) {
		var _comparator$fromIndex;
		formIndex = (_comparator$fromIndex = comparator.fromIndex) !== null && _comparator$fromIndex !== void 0 ? _comparator$fromIndex : 0;
		comparator = comparator.comparator;
	}
	if (typeof comparator === "string") {
		const key = comparator;
		comparator = (element, value$1) => element[key] === toValue(value$1);
	}
	comparator = (_comparator = comparator) !== null && _comparator !== void 0 ? _comparator : ((element, value$1) => element === toValue(value$1));
	return computed(() => toValue(list).slice(formIndex).some((element, index, array) => comparator(toValue(element), toValue(value), index, toValue(array))));
}

//#endregion
//#region useArrayJoin/index.ts
/**
* Reactive `Array.join`
*
* @see https://vueuse.org/useArrayJoin
* @param list - the array was called upon.
* @param separator - a string to separate each pair of adjacent elements of the array. If omitted, the array elements are separated with a comma (",").
*
* @returns a string with all array elements joined. If arr.length is 0, the empty string is returned.
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayJoin(list, separator) {
	return computed(() => toValue(list).map((i) => toValue(i)).join(toValue(separator)));
}

//#endregion
//#region useArrayMap/index.ts
/**
* Reactive `Array.map`
*
* @see https://vueuse.org/useArrayMap
* @param list - the array was called upon.
* @param fn - a function that is called for every element of the given `list`. Each time `fn` executes, the returned value is added to the new array.
*
* @returns a new array with each element being the result of the callback function.
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayMap(list, fn) {
	return computed(() => toValue(list).map((i) => toValue(i)).map(fn));
}

//#endregion
//#region useArrayReduce/index.ts
/**
* Reactive `Array.reduce`
*
* @see https://vueuse.org/useArrayReduce
* @param list - the array was called upon.
* @param reducer - a "reducer" function.
* @param args
*
* @returns the value that results from running the "reducer" callback function to completion over the entire array.
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayReduce(list, reducer, ...args) {
	const reduceCallback = (sum, value, index) => reducer(toValue(sum), toValue(value), index);
	return computed(() => {
		const resolved = toValue(list);
		return args.length ? resolved.reduce(reduceCallback, typeof args[0] === "function" ? toValue(args[0]()) : toValue(args[0])) : resolved.reduce(reduceCallback);
	});
}

//#endregion
//#region useArraySome/index.ts
/**
* Reactive `Array.some`
*
* @see https://vueuse.org/useArraySome
* @param list - the array was called upon.
* @param fn - a function to test each element.
*
* @returns **true** if the `fn` function returns a **truthy** value for any element from the array. Otherwise, **false**.
*
* @__NO_SIDE_EFFECTS__
*/
function useArraySome(list, fn) {
	return computed(() => toValue(list).some((element, index, array) => fn(toValue(element), index, array)));
}

//#endregion
//#region useArrayUnique/index.ts
function uniq(array) {
	return Array.from(new Set(array));
}
function uniqueElementsBy(array, fn) {
	return array.reduce((acc, v) => {
		if (!acc.some((x) => fn(v, x, array))) acc.push(v);
		return acc;
	}, []);
}
/**
* reactive unique array
* @see https://vueuse.org/useArrayUnique
* @param list - the array was called upon.
* @param compareFn
* @returns A computed ref that returns a unique array of items.
*
* @__NO_SIDE_EFFECTS__
*/
function useArrayUnique(list, compareFn) {
	return computed(() => {
		const resolvedList = toValue(list).map((element) => toValue(element));
		return compareFn ? uniqueElementsBy(resolvedList, compareFn) : uniq(resolvedList);
	});
}

//#endregion
//#region useCounter/index.ts
/**
* Basic counter with utility functions.
*
* @see https://vueuse.org/useCounter
* @param [initialValue]
* @param options
*/
function useCounter(initialValue = 0, options = {}) {
	let _initialValue = unref(initialValue);
	const count = shallowRef(initialValue);
	const { max = Number.POSITIVE_INFINITY, min = Number.NEGATIVE_INFINITY } = options;
	const inc = (delta = 1) => count.value = Math.max(Math.min(max, count.value + delta), min);
	const dec = (delta = 1) => count.value = Math.min(Math.max(min, count.value - delta), max);
	const get$1 = () => count.value;
	const set$1 = (val) => count.value = Math.max(min, Math.min(max, val));
	const reset = (val = _initialValue) => {
		_initialValue = val;
		return set$1(val);
	};
	return {
		count: shallowReadonly(count),
		inc,
		dec,
		get: get$1,
		set: set$1,
		reset
	};
}

//#endregion
//#region useDateFormat/index.ts
const REGEX_PARSE = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[T\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/i;
const REGEX_FORMAT = /[YMDHhms]o|\[([^\]]+)\]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a{1,2}|A{1,2}|m{1,2}|s{1,2}|Z{1,2}|z{1,4}|SSS/g;
function defaultMeridiem(hours, minutes, isLowercase, hasPeriod) {
	let m = hours < 12 ? "AM" : "PM";
	if (hasPeriod) m = m.split("").reduce((acc, curr) => acc += `${curr}.`, "");
	return isLowercase ? m.toLowerCase() : m;
}
function formatOrdinal(num) {
	const suffixes = [
		"th",
		"st",
		"nd",
		"rd"
	];
	const v = num % 100;
	return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
function formatDate(date, formatStr, options = {}) {
	var _options$customMeridi;
	const years = date.getFullYear();
	const month = date.getMonth();
	const days = date.getDate();
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	const milliseconds = date.getMilliseconds();
	const day = date.getDay();
	const meridiem = (_options$customMeridi = options.customMeridiem) !== null && _options$customMeridi !== void 0 ? _options$customMeridi : defaultMeridiem;
	const stripTimeZone = (dateString) => {
		var _dateString$split$;
		return (_dateString$split$ = dateString.split(" ")[1]) !== null && _dateString$split$ !== void 0 ? _dateString$split$ : "";
	};
	const matches = {
		Yo: () => formatOrdinal(years),
		YY: () => String(years).slice(-2),
		YYYY: () => years,
		M: () => month + 1,
		Mo: () => formatOrdinal(month + 1),
		MM: () => `${month + 1}`.padStart(2, "0"),
		MMM: () => date.toLocaleDateString(toValue(options.locales), { month: "short" }),
		MMMM: () => date.toLocaleDateString(toValue(options.locales), { month: "long" }),
		D: () => String(days),
		Do: () => formatOrdinal(days),
		DD: () => `${days}`.padStart(2, "0"),
		H: () => String(hours),
		Ho: () => formatOrdinal(hours),
		HH: () => `${hours}`.padStart(2, "0"),
		h: () => `${hours % 12 || 12}`.padStart(1, "0"),
		ho: () => formatOrdinal(hours % 12 || 12),
		hh: () => `${hours % 12 || 12}`.padStart(2, "0"),
		m: () => String(minutes),
		mo: () => formatOrdinal(minutes),
		mm: () => `${minutes}`.padStart(2, "0"),
		s: () => String(seconds),
		so: () => formatOrdinal(seconds),
		ss: () => `${seconds}`.padStart(2, "0"),
		SSS: () => `${milliseconds}`.padStart(3, "0"),
		d: () => day,
		dd: () => date.toLocaleDateString(toValue(options.locales), { weekday: "narrow" }),
		ddd: () => date.toLocaleDateString(toValue(options.locales), { weekday: "short" }),
		dddd: () => date.toLocaleDateString(toValue(options.locales), { weekday: "long" }),
		A: () => meridiem(hours, minutes),
		AA: () => meridiem(hours, minutes, false, true),
		a: () => meridiem(hours, minutes, true),
		aa: () => meridiem(hours, minutes, true, true),
		z: () => stripTimeZone(date.toLocaleDateString(toValue(options.locales), { timeZoneName: "shortOffset" })),
		zz: () => stripTimeZone(date.toLocaleDateString(toValue(options.locales), { timeZoneName: "shortOffset" })),
		zzz: () => stripTimeZone(date.toLocaleDateString(toValue(options.locales), { timeZoneName: "shortOffset" })),
		zzzz: () => stripTimeZone(date.toLocaleDateString(toValue(options.locales), { timeZoneName: "longOffset" }))
	};
	return formatStr.replace(REGEX_FORMAT, (match, $1) => {
		var _ref, _matches$match;
		return (_ref = $1 !== null && $1 !== void 0 ? $1 : (_matches$match = matches[match]) === null || _matches$match === void 0 ? void 0 : _matches$match.call(matches)) !== null && _ref !== void 0 ? _ref : match;
	});
}
function normalizeDate(date) {
	if (date === null) return /* @__PURE__ */ new Date(NaN);
	if (date === void 0) return /* @__PURE__ */ new Date();
	if (date instanceof Date) return new Date(date);
	if (typeof date === "string" && !/Z$/i.test(date)) {
		const d = date.match(REGEX_PARSE);
		if (d) {
			const m = d[2] - 1 || 0;
			const ms = (d[7] || "0").substring(0, 3);
			return new Date(d[1], m, d[3] || 1, d[4] || 0, d[5] || 0, d[6] || 0, ms);
		}
	}
	return new Date(date);
}
/**
* Get the formatted date according to the string of tokens passed in.
*
* @see https://vueuse.org/useDateFormat
* @param date - The date to format, can either be a `Date` object, a timestamp, or a string
* @param formatStr - The combination of tokens to format the date
* @param options - UseDateFormatOptions
*
* @__NO_SIDE_EFFECTS__
*/
function useDateFormat(date, formatStr = "HH:mm:ss", options = {}) {
	return computed(() => formatDate(normalizeDate(toValue(date)), toValue(formatStr), options));
}

//#endregion
//#region useIntervalFn/index.ts
/**
* Wrapper for `setInterval` with controls
*
* @see https://vueuse.org/useIntervalFn
* @param cb
* @param interval
* @param options
*/
function useIntervalFn(cb, interval = 1e3, options = {}) {
	const { immediate = true, immediateCallback = false } = options;
	let timer = null;
	const isActive = shallowRef(false);
	function clean() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}
	function pause() {
		isActive.value = false;
		clean();
	}
	function resume() {
		const intervalValue = toValue(interval);
		if (intervalValue <= 0) return;
		isActive.value = true;
		if (immediateCallback) cb();
		clean();
		if (isActive.value) timer = setInterval(cb, intervalValue);
	}
	if (immediate && isClient) resume();
	if (isRef(interval) || typeof interval === "function") tryOnScopeDispose(watch(interval, () => {
		if (isActive.value && isClient) resume();
	}));
	tryOnScopeDispose(pause);
	return {
		isActive: shallowReadonly(isActive),
		pause,
		resume
	};
}

//#endregion
//#region useInterval/index.ts
function useInterval(interval = 1e3, options = {}) {
	const { controls: exposeControls = false, immediate = true, callback } = options;
	const counter = shallowRef(0);
	const update = () => counter.value += 1;
	const reset = () => {
		counter.value = 0;
	};
	const controls = useIntervalFn(callback ? () => {
		update();
		callback(counter.value);
	} : update, interval, { immediate });
	if (exposeControls) return {
		counter: shallowReadonly(counter),
		reset,
		...controls
	};
	else return shallowReadonly(counter);
}

//#endregion
//#region useLastChanged/index.ts
function useLastChanged(source, options = {}) {
	var _options$initialValue;
	const ms = shallowRef((_options$initialValue = options.initialValue) !== null && _options$initialValue !== void 0 ? _options$initialValue : null);
	watch(source, () => ms.value = timestamp(), options);
	return shallowReadonly(ms);
}

//#endregion
//#region useTimeoutFn/index.ts
/**
* Wrapper for `setTimeout` with controls.
*
* @param cb
* @param interval
* @param options
*/
function useTimeoutFn(cb, interval, options = {}) {
	const { immediate = true, immediateCallback = false } = options;
	const isPending = shallowRef(false);
	let timer;
	function clear() {
		if (timer) {
			clearTimeout(timer);
			timer = void 0;
		}
	}
	function stop() {
		isPending.value = false;
		clear();
	}
	function start(...args) {
		if (immediateCallback) cb();
		clear();
		isPending.value = true;
		timer = setTimeout(() => {
			isPending.value = false;
			timer = void 0;
			cb(...args);
		}, toValue(interval));
	}
	if (immediate) {
		isPending.value = true;
		if (isClient) start();
	}
	tryOnScopeDispose(stop);
	return {
		isPending: shallowReadonly(isPending),
		start,
		stop
	};
}

//#endregion
//#region useTimeout/index.ts
function useTimeout(interval = 1e3, options = {}) {
	const { controls: exposeControls = false, callback } = options;
	const controls = useTimeoutFn(callback !== null && callback !== void 0 ? callback : noop, interval, options);
	const ready = computed(() => !controls.isPending.value);
	if (exposeControls) return {
		ready,
		...controls
	};
	else return ready;
}

//#endregion
//#region useToNumber/index.ts
/**
* Reactively convert a string ref to number.
*
* @__NO_SIDE_EFFECTS__
*/
function useToNumber(value, options = {}) {
	const { method = "parseFloat", radix, nanToZero } = options;
	return computed(() => {
		let resolved = toValue(value);
		if (typeof method === "function") resolved = method(resolved);
		else if (typeof resolved === "string") resolved = Number[method](resolved, radix);
		if (nanToZero && Number.isNaN(resolved)) resolved = 0;
		return resolved;
	});
}

//#endregion
//#region useToString/index.ts
/**
* Reactively convert a ref to string.
*
* @see https://vueuse.org/useToString
*
* @__NO_SIDE_EFFECTS__
*/
function useToString(value) {
	return computed(() => `${toValue(value)}`);
}

//#endregion
//#region useToggle/index.ts
/**
* A boolean ref with a toggler
*
* @see https://vueuse.org/useToggle
* @param [initialValue]
* @param options
*
* @__NO_SIDE_EFFECTS__
*/
function useToggle(initialValue = false, options = {}) {
	const { truthyValue = true, falsyValue = false } = options;
	const valueIsRef = isRef(initialValue);
	const _value = shallowRef(initialValue);
	function toggle(value) {
		if (arguments.length) {
			_value.value = value;
			return _value.value;
		} else {
			const truthy = toValue(truthyValue);
			_value.value = _value.value === truthy ? toValue(falsyValue) : truthy;
			return _value.value;
		}
	}
	if (valueIsRef) return toggle;
	else return [_value, toggle];
}

//#endregion
//#region watchArray/index.ts
/**
* Watch for an array with additions and removals.
*
* @see https://vueuse.org/watchArray
*/
function watchArray(source, cb, options) {
	let oldList = (options === null || options === void 0 ? void 0 : options.immediate) ? [] : [...typeof source === "function" ? source() : Array.isArray(source) ? source : toValue(source)];
	return watch(source, (newList, _, onCleanup) => {
		const oldListRemains = Array.from({ length: oldList.length });
		const added = [];
		for (const obj of newList) {
			let found = false;
			for (let i = 0; i < oldList.length; i++) if (!oldListRemains[i] && obj === oldList[i]) {
				oldListRemains[i] = true;
				found = true;
				break;
			}
			if (!found) added.push(obj);
		}
		const removed = oldList.filter((_$1, i) => !oldListRemains[i]);
		cb(newList, oldList, added, removed, onCleanup);
		oldList = [...newList];
	}, options);
}

//#endregion
//#region watchAtMost/index.ts
function watchAtMost(source, cb, options) {
	const { count,...watchOptions } = options;
	const current = shallowRef(0);
	const { stop, resume, pause } = watchWithFilter(source, (...args) => {
		current.value += 1;
		if (current.value >= toValue(count)) nextTick(() => stop());
		cb(...args);
	}, watchOptions);
	return {
		count: current,
		stop,
		resume,
		pause
	};
}

//#endregion
//#region watchDebounced/index.ts
function watchDebounced(source, cb, options = {}) {
	const { debounce = 0, maxWait = void 0,...watchOptions } = options;
	return watchWithFilter(source, cb, {
		...watchOptions,
		eventFilter: debounceFilter(debounce, { maxWait })
	});
}
/** @deprecated use `watchDebounced` instead */
const debouncedWatch = watchDebounced;

//#endregion
//#region watchDeep/index.ts
/**
* Shorthand for watching value with {deep: true}
*
* @see https://vueuse.org/watchDeep
*/
function watchDeep(source, cb, options) {
	return watch(source, cb, {
		...options,
		deep: true
	});
}

//#endregion
//#region watchIgnorable/index.ts
function watchIgnorable(source, cb, options = {}) {
	const { eventFilter = bypassFilter,...watchOptions } = options;
	const filteredCb = createFilterWrapper(eventFilter, cb);
	let ignoreUpdates;
	let ignorePrevAsyncUpdates;
	let stop;
	if (watchOptions.flush === "sync") {
		let ignore = false;
		ignorePrevAsyncUpdates = () => {};
		ignoreUpdates = (updater) => {
			ignore = true;
			updater();
			ignore = false;
		};
		stop = watch(source, (...args) => {
			if (!ignore) filteredCb(...args);
		}, watchOptions);
	} else {
		const disposables = [];
		let ignoreCounter = 0;
		let syncCounter = 0;
		ignorePrevAsyncUpdates = () => {
			ignoreCounter = syncCounter;
		};
		disposables.push(watch(source, () => {
			syncCounter++;
		}, {
			...watchOptions,
			flush: "sync"
		}));
		ignoreUpdates = (updater) => {
			const syncCounterPrev = syncCounter;
			updater();
			ignoreCounter += syncCounter - syncCounterPrev;
		};
		disposables.push(watch(source, (...args) => {
			const ignore = ignoreCounter > 0 && ignoreCounter === syncCounter;
			ignoreCounter = 0;
			syncCounter = 0;
			if (ignore) return;
			filteredCb(...args);
		}, watchOptions));
		stop = () => {
			disposables.forEach((fn) => fn());
		};
	}
	return {
		stop,
		ignoreUpdates,
		ignorePrevAsyncUpdates
	};
}
/** @deprecated use `watchIgnorable` instead */
const ignorableWatch = watchIgnorable;

//#endregion
//#region watchImmediate/index.ts
/**
* Shorthand for watching value with {immediate: true}
*
* @see https://vueuse.org/watchImmediate
*/
function watchImmediate(source, cb, options) {
	return watch(source, cb, {
		...options,
		immediate: true
	});
}

//#endregion
//#region watchOnce/index.ts
/**
* Shorthand for watching value with { once: true }
*
* @see https://vueuse.org/watchOnce
*/
function watchOnce(source, cb, options) {
	return watch(source, cb, {
		...options,
		once: true
	});
}

//#endregion
//#region watchThrottled/index.ts
function watchThrottled(source, cb, options = {}) {
	const { throttle = 0, trailing = true, leading = true,...watchOptions } = options;
	return watchWithFilter(source, cb, {
		...watchOptions,
		eventFilter: throttleFilter(throttle, trailing, leading)
	});
}
/** @deprecated use `watchThrottled` instead */
const throttledWatch = watchThrottled;

//#endregion
//#region watchTriggerable/index.ts
function watchTriggerable(source, cb, options = {}) {
	let cleanupFn;
	function onEffect() {
		if (!cleanupFn) return;
		const fn = cleanupFn;
		cleanupFn = void 0;
		fn();
	}
	/** Register the function `cleanupFn` */
	function onCleanup(callback) {
		cleanupFn = callback;
	}
	const _cb = (value, oldValue) => {
		onEffect();
		return cb(value, oldValue, onCleanup);
	};
	const res = watchIgnorable(source, _cb, options);
	const { ignoreUpdates } = res;
	const trigger = () => {
		let res$1;
		ignoreUpdates(() => {
			res$1 = _cb(getWatchSources(source), getOldValue(source));
		});
		return res$1;
	};
	return {
		...res,
		trigger
	};
}
function getWatchSources(sources) {
	if (isReactive(sources)) return sources;
	if (Array.isArray(sources)) return sources.map((item) => toValue(item));
	return toValue(sources);
}
function getOldValue(source) {
	return Array.isArray(source) ? source.map(() => void 0) : void 0;
}

//#endregion
//#region whenever/index.ts
/**
* Shorthand for watching value to be truthy
*
* @see https://vueuse.org/whenever
*/
function whenever(source, cb, options) {
	const stop = watch(source, (v, ov, onInvalidate) => {
		if (v) {
			if (options === null || options === void 0 ? void 0 : options.once) nextTick(() => stop());
			cb(v, ov, onInvalidate);
		}
	}, {
		...options,
		once: false
	});
	return stop;
}

//#endregion
export { assert, autoResetRef, bypassFilter, camelize, clamp, computedEager, computedWithControl, containsProp, controlledComputed, controlledRef, createEventHook, createFilterWrapper, createGlobalState, createInjectionState, createReactiveFn, createRef, createSharedComposable, createSingletonPromise, debounceFilter, debouncedRef, debouncedWatch, eagerComputed, extendRef, formatDate, get, getLifeCycleTarget, hasOwn, hyphenate, identity, ignorableWatch, increaseWithUnit, injectLocal, invoke, isClient, isDef, isDefined, isIOS, isObject, isWorker, makeDestructurable, noop, normalizeDate, notNullish, now, objectEntries, objectOmit, objectPick, pausableFilter, pausableWatch, promiseTimeout, provideLocal, pxValue, rand, reactify, reactifyObject, reactiveComputed, reactiveOmit, reactivePick, refAutoReset, refDebounced, refDefault, refManualReset, refThrottled, refWithControl, set, syncRef, syncRefs, throttleFilter, throttledRef, throttledWatch, timestamp, toArray, toReactive, toRef, toRefs, tryOnBeforeMount, tryOnBeforeUnmount, tryOnMounted, tryOnScopeDispose, tryOnUnmounted, until, useArrayDifference, useArrayEvery, useArrayFilter, useArrayFind, useArrayFindIndex, useArrayFindLast, useArrayIncludes, useArrayJoin, useArrayMap, useArrayReduce, useArraySome, useArrayUnique, useCounter, useDateFormat, useDebounce, useDebounceFn, useInterval, useIntervalFn, useLastChanged, useThrottle, useThrottleFn, useTimeout, useTimeoutFn, useToNumber, useToString, useToggle, watchArray, watchAtMost, watchDebounced, watchDeep, watchIgnorable, watchImmediate, watchOnce, watchPausable, watchThrottled, watchTriggerable, watchWithFilter, whenever };