'use strict';

var vue = require('vue');

function computedEager(fn, options) {
  var _a;
  const result = vue.shallowRef();
  vue.watchEffect(() => {
    result.value = fn();
  }, {
    ...options,
    flush: (_a = options == null ? void 0 : options.flush) != null ? _a : "sync"
  });
  return vue.readonly(result);
}

function computedWithControl(source, fn) {
  let v = void 0;
  let track;
  let trigger;
  const dirty = vue.shallowRef(true);
  const update = () => {
    dirty.value = true;
    trigger();
  };
  vue.watch(source, update, { flush: "sync" });
  const get = typeof fn === "function" ? fn : fn.get;
  const set = typeof fn === "function" ? void 0 : fn.set;
  const result = vue.customRef((_track, _trigger) => {
    track = _track;
    trigger = _trigger;
    return {
      get() {
        if (dirty.value) {
          v = get(v);
          dirty.value = false;
        }
        track();
        return v;
      },
      set(v2) {
        set == null ? void 0 : set(v2);
      }
    };
  });
  if (Object.isExtensible(result))
    result.trigger = update;
  return result;
}

function tryOnScopeDispose(fn) {
  if (vue.getCurrentScope()) {
    vue.onScopeDispose(fn);
    return true;
  }
  return false;
}

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
    return {
      off: offFn
    };
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

function createGlobalState(stateFactory) {
  let initialized = false;
  let state;
  const scope = vue.effectScope(true);
  return (...args) => {
    if (!initialized) {
      state = scope.run(() => stateFactory(...args));
      initialized = true;
    }
    return state;
  };
}

const localProvidedStateMap = /* @__PURE__ */ new WeakMap();

const injectLocal = (...args) => {
  var _a;
  const key = args[0];
  const instance = (_a = vue.getCurrentInstance()) == null ? void 0 : _a.proxy;
  if (instance == null && !vue.hasInjectionContext())
    throw new Error("injectLocal must be called in setup");
  if (instance && localProvidedStateMap.has(instance) && key in localProvidedStateMap.get(instance))
    return localProvidedStateMap.get(instance)[key];
  return vue.inject(...args);
};

const provideLocal = (key, value) => {
  var _a;
  const instance = (_a = vue.getCurrentInstance()) == null ? void 0 : _a.proxy;
  if (instance == null)
    throw new Error("provideLocal must be called in setup");
  if (!localProvidedStateMap.has(instance))
    localProvidedStateMap.set(instance, /* @__PURE__ */ Object.create(null));
  const localProvidedState = localProvidedStateMap.get(instance);
  localProvidedState[key] = value;
  vue.provide(key, value);
};

function createInjectionState(composable, options) {
  const key = (options == null ? void 0 : options.injectionKey) || Symbol(composable.name || "InjectionState");
  const defaultValue = options == null ? void 0 : options.defaultValue;
  const useProvidingState = (...args) => {
    const state = composable(...args);
    provideLocal(key, state);
    return state;
  };
  const useInjectedState = () => injectLocal(key, defaultValue);
  return [useProvidingState, useInjectedState];
}

function createRef(value, deep) {
  if (deep === true) {
    return vue.ref(value);
  } else {
    return vue.shallowRef(value);
  }
}

function createSharedComposable(composable) {
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
  return (...args) => {
    subscribers += 1;
    if (!scope) {
      scope = vue.effectScope(true);
      state = scope.run(() => composable(...args));
    }
    tryOnScopeDispose(dispose);
    return state;
  };
}

function extendRef(ref, extend, { enumerable = false, unwrap = true } = {}) {
  for (const [key, value] of Object.entries(extend)) {
    if (key === "value")
      continue;
    if (vue.isRef(value) && unwrap) {
      Object.defineProperty(ref, key, {
        get() {
          return value.value;
        },
        set(v) {
          value.value = v;
        },
        enumerable
      });
    } else {
      Object.defineProperty(ref, key, { value, enumerable });
    }
  }
  return ref;
}

function get(obj, key) {
  if (key == null)
    return vue.unref(obj);
  return vue.unref(obj)[key];
}

function isDefined(v) {
  return vue.unref(v) != null;
}

function makeDestructurable(obj, arr) {
  if (typeof Symbol !== "undefined") {
    const clone = { ...obj };
    Object.defineProperty(clone, Symbol.iterator, {
      enumerable: false,
      value() {
        let index = 0;
        return {
          next: () => ({
            value: arr[index++],
            done: index > arr.length
          })
        };
      }
    });
    return clone;
  } else {
    return Object.assign([...arr], obj);
  }
}

function reactify(fn, options) {
  const unrefFn = (options == null ? void 0 : options.computedGetter) === false ? vue.unref : vue.toValue;
  return function(...args) {
    return vue.computed(() => fn.apply(this, args.map((i) => unrefFn(i))));
  };
}

function reactifyObject(obj, optionsOrKeys = {}) {
  let keys = [];
  let options;
  if (Array.isArray(optionsOrKeys)) {
    keys = optionsOrKeys;
  } else {
    options = optionsOrKeys;
    const { includeOwnProperties = true } = optionsOrKeys;
    keys.push(...Object.keys(obj));
    if (includeOwnProperties)
      keys.push(...Object.getOwnPropertyNames(obj));
  }
  return Object.fromEntries(
    keys.map((key) => {
      const value = obj[key];
      return [
        key,
        typeof value === "function" ? reactify(value.bind(obj), options) : value
      ];
    })
  );
}

function toReactive(objectRef) {
  if (!vue.isRef(objectRef))
    return vue.reactive(objectRef);
  const proxy = new Proxy({}, {
    get(_, p, receiver) {
      return vue.unref(Reflect.get(objectRef.value, p, receiver));
    },
    set(_, p, value) {
      if (vue.isRef(objectRef.value[p]) && !vue.isRef(value))
        objectRef.value[p].value = value;
      else
        objectRef.value[p] = value;
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
  });
  return vue.reactive(proxy);
}

function reactiveComputed(fn) {
  return toReactive(vue.computed(fn));
}

function reactiveOmit(obj, ...keys) {
  const flatKeys = keys.flat();
  const predicate = flatKeys[0];
  return reactiveComputed(() => typeof predicate === "function" ? Object.fromEntries(Object.entries(vue.toRefs(obj)).filter(([k, v]) => !predicate(vue.toValue(v), k))) : Object.fromEntries(Object.entries(vue.toRefs(obj)).filter((e) => !flatKeys.includes(e[0]))));
}

const isClient = typeof window !== "undefined" && typeof document !== "undefined";
const isWorker = typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;
const isDef = (val) => typeof val !== "undefined";
const notNullish = (val) => val != null;
const assert = (condition, ...infos) => {
  if (!condition)
    console.warn(...infos);
};
const toString = Object.prototype.toString;
const isObject = (val) => toString.call(val) === "[object Object]";
const now = () => Date.now();
const timestamp = () => +Date.now();
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const noop = () => {
};
const rand = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
const isIOS = /* @__PURE__ */ getIsIOS();
function getIsIOS() {
  var _a, _b;
  return isClient && ((_a = window == null ? void 0 : window.navigator) == null ? void 0 : _a.userAgent) && (/iP(?:ad|hone|od)/.test(window.navigator.userAgent) || ((_b = window == null ? void 0 : window.navigator) == null ? void 0 : _b.maxTouchPoints) > 2 && /iPad|Macintosh/.test(window == null ? void 0 : window.navigator.userAgent));
}

function createFilterWrapper(filter, fn) {
  function wrapper(...args) {
    return new Promise((resolve, reject) => {
      Promise.resolve(filter(() => fn.apply(this, args), { fn, thisArg: this, args })).then(resolve).catch(reject);
    });
  }
  return wrapper;
}
const bypassFilter = (invoke) => {
  return invoke();
};
function debounceFilter(ms, options = {}) {
  let timer;
  let maxTimer;
  let lastRejector = noop;
  const _clearTimeout = (timer2) => {
    clearTimeout(timer2);
    lastRejector();
    lastRejector = noop;
  };
  let lastInvoker;
  const filter = (invoke) => {
    const duration = vue.toValue(ms);
    const maxDuration = vue.toValue(options.maxWait);
    if (timer)
      _clearTimeout(timer);
    if (duration <= 0 || maxDuration !== void 0 && maxDuration <= 0) {
      if (maxTimer) {
        _clearTimeout(maxTimer);
        maxTimer = null;
      }
      return Promise.resolve(invoke());
    }
    return new Promise((resolve, reject) => {
      lastRejector = options.rejectOnCancel ? reject : resolve;
      lastInvoker = invoke;
      if (maxDuration && !maxTimer) {
        maxTimer = setTimeout(() => {
          if (timer)
            _clearTimeout(timer);
          maxTimer = null;
          resolve(lastInvoker());
        }, maxDuration);
      }
      timer = setTimeout(() => {
        if (maxTimer)
          _clearTimeout(maxTimer);
        maxTimer = null;
        resolve(invoke());
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
  if (!vue.isRef(args[0]) && typeof args[0] === "object")
    ({ delay: ms, trailing = true, leading = true, rejectOnCancel = false } = args[0]);
  else
    [ms, trailing = true, leading = true, rejectOnCancel = false] = args;
  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = void 0;
      lastRejector();
      lastRejector = noop;
    }
  };
  const filter = (_invoke) => {
    const duration = vue.toValue(ms);
    const elapsed = Date.now() - lastExec;
    const invoke = () => {
      return lastValue = _invoke();
    };
    clear();
    if (duration <= 0) {
      lastExec = Date.now();
      return invoke();
    }
    if (elapsed > duration && (leading || !isLeading)) {
      lastExec = Date.now();
      invoke();
    } else if (trailing) {
      lastValue = new Promise((resolve, reject) => {
        lastRejector = rejectOnCancel ? reject : resolve;
        timer = setTimeout(() => {
          lastExec = Date.now();
          isLeading = true;
          resolve(invoke());
          clear();
        }, Math.max(0, duration - elapsed));
      });
    }
    if (!leading && !timer)
      timer = setTimeout(() => isLeading = true, duration);
    isLeading = false;
    return lastValue;
  };
  return filter;
}
function pausableFilter(extendFilter = bypassFilter, options = {}) {
  const {
    initialState = "active"
  } = options;
  const isActive = toRef(initialState === "active");
  function pause() {
    isActive.value = false;
  }
  function resume() {
    isActive.value = true;
  }
  const eventFilter = (...args) => {
    if (isActive.value)
      extendFilter(...args);
  };
  return { isActive: vue.readonly(isActive), pause, resume, eventFilter };
}

function cacheStringFunction(fn) {
  const cache = /* @__PURE__ */ Object.create(null);
  return (str) => {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
}
const hyphenateRE = /\B([A-Z])/g;
const hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, "-$1").toLowerCase());
const camelizeRE = /-(\w)/g;
const camelize = cacheStringFunction((str) => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
});

function promiseTimeout(ms, throwOnTimeout = false, reason = "Timeout") {
  return new Promise((resolve, reject) => {
    if (throwOnTimeout)
      setTimeout(() => reject(reason), ms);
    else
      setTimeout(resolve, ms);
  });
}
function identity(arg) {
  return arg;
}
function createSingletonPromise(fn) {
  let _promise;
  function wrapper() {
    if (!_promise)
      _promise = fn();
    return _promise;
  }
  wrapper.reset = async () => {
    const _prev = _promise;
    _promise = void 0;
    if (_prev)
      await _prev;
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
  var _a;
  if (typeof target === "number")
    return target + delta;
  const value = ((_a = target.match(/^-?\d+\.?\d*/)) == null ? void 0 : _a[0]) || "";
  const unit = target.slice(value.length);
  const result = Number.parseFloat(value) + delta;
  if (Number.isNaN(result))
    return target;
  return result + unit;
}
function pxValue(px) {
  return px.endsWith("rem") ? Number.parseFloat(px) * 16 : Number.parseFloat(px);
}
function objectPick(obj, keys, omitUndefined = false) {
  return keys.reduce((n, k) => {
    if (k in obj) {
      if (!omitUndefined || obj[k] !== void 0)
        n[k] = obj[k];
    }
    return n;
  }, {});
}
function objectOmit(obj, keys, omitUndefined = false) {
  return Object.fromEntries(Object.entries(obj).filter(([key, value]) => {
    return (!omitUndefined || value !== void 0) && !keys.includes(key);
  }));
}
function objectEntries(obj) {
  return Object.entries(obj);
}
function getLifeCycleTarget(target) {
  return target || vue.getCurrentInstance();
}
function toArray(value) {
  return Array.isArray(value) ? value : [value];
}

function toRef(...args) {
  if (args.length !== 1)
    return vue.toRef(...args);
  const r = args[0];
  return typeof r === "function" ? vue.readonly(vue.customRef(() => ({ get: r, set: noop }))) : vue.ref(r);
}
const resolveRef = toRef;

function reactivePick(obj, ...keys) {
  const flatKeys = keys.flat();
  const predicate = flatKeys[0];
  return reactiveComputed(() => typeof predicate === "function" ? Object.fromEntries(Object.entries(vue.toRefs(obj)).filter(([k, v]) => predicate(vue.toValue(v), k))) : Object.fromEntries(flatKeys.map((k) => [k, toRef(obj, k)])));
}

function refAutoReset(defaultValue, afterMs = 1e4) {
  return vue.customRef((track, trigger) => {
    let value = vue.toValue(defaultValue);
    let timer;
    const resetAfter = () => setTimeout(() => {
      value = vue.toValue(defaultValue);
      trigger();
    }, vue.toValue(afterMs));
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

function useDebounceFn(fn, ms = 200, options = {}) {
  return createFilterWrapper(
    debounceFilter(ms, options),
    fn
  );
}

function refDebounced(value, ms = 200, options = {}) {
  const debounced = vue.ref(value.value);
  const updater = useDebounceFn(() => {
    debounced.value = value.value;
  }, ms, options);
  vue.watch(value, () => updater());
  return debounced;
}

function refDefault(source, defaultValue) {
  return vue.computed({
    get() {
      var _a;
      return (_a = source.value) != null ? _a : defaultValue;
    },
    set(value) {
      source.value = value;
    }
  });
}

function useThrottleFn(fn, ms = 200, trailing = false, leading = true, rejectOnCancel = false) {
  return createFilterWrapper(
    throttleFilter(ms, trailing, leading, rejectOnCancel),
    fn
  );
}

function refThrottled(value, delay = 200, trailing = true, leading = true) {
  if (delay <= 0)
    return value;
  const throttled = vue.ref(value.value);
  const updater = useThrottleFn(() => {
    throttled.value = value.value;
  }, delay, trailing, leading);
  vue.watch(value, () => updater());
  return throttled;
}

function refWithControl(initial, options = {}) {
  let source = initial;
  let track;
  let trigger;
  const ref = vue.customRef((_track, _trigger) => {
    track = _track;
    trigger = _trigger;
    return {
      get() {
        return get();
      },
      set(v) {
        set(v);
      }
    };
  });
  function get(tracking = true) {
    if (tracking)
      track();
    return source;
  }
  function set(value, triggering = true) {
    var _a, _b;
    if (value === source)
      return;
    const old = source;
    if (((_a = options.onBeforeChange) == null ? void 0 : _a.call(options, value, old)) === false)
      return;
    source = value;
    (_b = options.onChanged) == null ? void 0 : _b.call(options, value, old);
    if (triggering)
      trigger();
  }
  const untrackedGet = () => get(false);
  const silentSet = (v) => set(v, false);
  const peek = () => get(false);
  const lay = (v) => set(v, false);
  return extendRef(
    ref,
    {
      get,
      set,
      untrackedGet,
      silentSet,
      peek,
      lay
    },
    { enumerable: true }
  );
}
const controlledRef = refWithControl;

function set(...args) {
  if (args.length === 2) {
    const [ref, value] = args;
    ref.value = value;
  }
  if (args.length === 3) {
    const [target, key, value] = args;
    target[key] = value;
  }
}

function watchWithFilter(source, cb, options = {}) {
  const {
    eventFilter = bypassFilter,
    ...watchOptions
  } = options;
  return vue.watch(
    source,
    createFilterWrapper(
      eventFilter,
      cb
    ),
    watchOptions
  );
}

function watchPausable(source, cb, options = {}) {
  const {
    eventFilter: filter,
    initialState = "active",
    ...watchOptions
  } = options;
  const { eventFilter, pause, resume, isActive } = pausableFilter(filter, { initialState });
  const stop = watchWithFilter(
    source,
    cb,
    {
      ...watchOptions,
      eventFilter
    }
  );
  return { stop, pause, resume, isActive };
}

function syncRef(left, right, ...[options]) {
  const {
    flush = "sync",
    deep = false,
    immediate = true,
    direction = "both",
    transform = {}
  } = options || {};
  const watchers = [];
  const transformLTR = "ltr" in transform && transform.ltr || ((v) => v);
  const transformRTL = "rtl" in transform && transform.rtl || ((v) => v);
  if (direction === "both" || direction === "ltr") {
    watchers.push(watchPausable(
      left,
      (newValue) => {
        watchers.forEach((w) => w.pause());
        right.value = transformLTR(newValue);
        watchers.forEach((w) => w.resume());
      },
      { flush, deep, immediate }
    ));
  }
  if (direction === "both" || direction === "rtl") {
    watchers.push(watchPausable(
      right,
      (newValue) => {
        watchers.forEach((w) => w.pause());
        left.value = transformRTL(newValue);
        watchers.forEach((w) => w.resume());
      },
      { flush, deep, immediate }
    ));
  }
  const stop = () => {
    watchers.forEach((w) => w.stop());
  };
  return stop;
}

function syncRefs(source, targets, options = {}) {
  const {
    flush = "sync",
    deep = false,
    immediate = true
  } = options;
  const targetsArray = toArray(targets);
  return vue.watch(
    source,
    (newValue) => targetsArray.forEach((target) => target.value = newValue),
    { flush, deep, immediate }
  );
}

function toRefs(objectRef, options = {}) {
  if (!vue.isRef(objectRef))
    return vue.toRefs(objectRef);
  const result = Array.isArray(objectRef.value) ? Array.from({ length: objectRef.value.length }) : {};
  for (const key in objectRef.value) {
    result[key] = vue.customRef(() => ({
      get() {
        return objectRef.value[key];
      },
      set(v) {
        var _a;
        const replaceRef = (_a = vue.toValue(options.replaceRef)) != null ? _a : true;
        if (replaceRef) {
          if (Array.isArray(objectRef.value)) {
            const copy = [...objectRef.value];
            copy[key] = v;
            objectRef.value = copy;
          } else {
            const newObject = { ...objectRef.value, [key]: v };
            Object.setPrototypeOf(newObject, Object.getPrototypeOf(objectRef.value));
            objectRef.value = newObject;
          }
        } else {
          objectRef.value[key] = v;
        }
      }
    }));
  }
  return result;
}

const toValue = vue.toValue;
const resolveUnref = vue.toValue;

function tryOnBeforeMount(fn, sync = true, target) {
  const instance = getLifeCycleTarget(target);
  if (instance)
    vue.onBeforeMount(fn, target);
  else if (sync)
    fn();
  else
    vue.nextTick(fn);
}

function tryOnBeforeUnmount(fn, target) {
  const instance = getLifeCycleTarget(target);
  if (instance)
    vue.onBeforeUnmount(fn, target);
}

function tryOnMounted(fn, sync = true, target) {
  const instance = getLifeCycleTarget();
  if (instance)
    vue.onMounted(fn, target);
  else if (sync)
    fn();
  else
    vue.nextTick(fn);
}

function tryOnUnmounted(fn, target) {
  const instance = getLifeCycleTarget(target);
  if (instance)
    vue.onUnmounted(fn, target);
}

function createUntil(r, isNot = false) {
  function toMatch(condition, { flush = "sync", deep = false, timeout, throwOnTimeout } = {}) {
    let stop = null;
    const watcher = new Promise((resolve) => {
      stop = vue.watch(
        r,
        (v) => {
          if (condition(v) !== isNot) {
            if (stop)
              stop();
            else
              vue.nextTick(() => stop == null ? void 0 : stop());
            resolve(v);
          }
        },
        {
          flush,
          deep,
          immediate: true
        }
      );
    });
    const promises = [watcher];
    if (timeout != null) {
      promises.push(
        promiseTimeout(timeout, throwOnTimeout).then(() => vue.toValue(r)).finally(() => stop == null ? void 0 : stop())
      );
    }
    return Promise.race(promises);
  }
  function toBe(value, options) {
    if (!vue.isRef(value))
      return toMatch((v) => v === value, options);
    const { flush = "sync", deep = false, timeout, throwOnTimeout } = options != null ? options : {};
    let stop = null;
    const watcher = new Promise((resolve) => {
      stop = vue.watch(
        [r, value],
        ([v1, v2]) => {
          if (isNot !== (v1 === v2)) {
            if (stop)
              stop();
            else
              vue.nextTick(() => stop == null ? void 0 : stop());
            resolve(v1);
          }
        },
        {
          flush,
          deep,
          immediate: true
        }
      );
    });
    const promises = [watcher];
    if (timeout != null) {
      promises.push(
        promiseTimeout(timeout, throwOnTimeout).then(() => vue.toValue(r)).finally(() => {
          stop == null ? void 0 : stop();
          return vue.toValue(r);
        })
      );
    }
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
      return array.includes(value) || array.includes(vue.toValue(value));
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
  if (Array.isArray(vue.toValue(r))) {
    const instance = {
      toMatch,
      toContains,
      changed,
      changedTimes,
      get not() {
        return createUntil(r, !isNot);
      }
    };
    return instance;
  } else {
    const instance = {
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
    return instance;
  }
}
function until(r) {
  return createUntil(r);
}

function defaultComparator(value, othVal) {
  return value === othVal;
}
function useArrayDifference(...args) {
  var _a, _b;
  const list = args[0];
  const values = args[1];
  let compareFn = (_a = args[2]) != null ? _a : defaultComparator;
  const {
    symmetric = false
  } = (_b = args[3]) != null ? _b : {};
  if (typeof compareFn === "string") {
    const key = compareFn;
    compareFn = (value, othVal) => value[key] === othVal[key];
  }
  const diff1 = vue.computed(() => vue.toValue(list).filter((x) => vue.toValue(values).findIndex((y) => compareFn(x, y)) === -1));
  if (symmetric) {
    const diff2 = vue.computed(() => vue.toValue(values).filter((x) => vue.toValue(list).findIndex((y) => compareFn(x, y)) === -1));
    return vue.computed(() => symmetric ? [...vue.toValue(diff1), ...vue.toValue(diff2)] : vue.toValue(diff1));
  } else {
    return diff1;
  }
}

function useArrayEvery(list, fn) {
  return vue.computed(() => vue.toValue(list).every((element, index, array) => fn(vue.toValue(element), index, array)));
}

function useArrayFilter(list, fn) {
  return vue.computed(() => vue.toValue(list).map((i) => vue.toValue(i)).filter(fn));
}

function useArrayFind(list, fn) {
  return vue.computed(() => vue.toValue(
    vue.toValue(list).find((element, index, array) => fn(vue.toValue(element), index, array))
  ));
}

function useArrayFindIndex(list, fn) {
  return vue.computed(() => vue.toValue(list).findIndex((element, index, array) => fn(vue.toValue(element), index, array)));
}

function findLast(arr, cb) {
  let index = arr.length;
  while (index-- > 0) {
    if (cb(arr[index], index, arr))
      return arr[index];
  }
  return void 0;
}
function useArrayFindLast(list, fn) {
  return vue.computed(() => vue.toValue(
    !Array.prototype.findLast ? findLast(vue.toValue(list), (element, index, array) => fn(vue.toValue(element), index, array)) : vue.toValue(list).findLast((element, index, array) => fn(vue.toValue(element), index, array))
  ));
}

function isArrayIncludesOptions(obj) {
  return isObject(obj) && containsProp(obj, "formIndex", "comparator");
}
function useArrayIncludes(...args) {
  var _a;
  const list = args[0];
  const value = args[1];
  let comparator = args[2];
  let formIndex = 0;
  if (isArrayIncludesOptions(comparator)) {
    formIndex = (_a = comparator.fromIndex) != null ? _a : 0;
    comparator = comparator.comparator;
  }
  if (typeof comparator === "string") {
    const key = comparator;
    comparator = (element, value2) => element[key] === vue.toValue(value2);
  }
  comparator = comparator != null ? comparator : (element, value2) => element === vue.toValue(value2);
  return vue.computed(() => vue.toValue(list).slice(formIndex).some((element, index, array) => comparator(
    vue.toValue(element),
    vue.toValue(value),
    index,
    vue.toValue(array)
  )));
}

function useArrayJoin(list, separator) {
  return vue.computed(() => vue.toValue(list).map((i) => vue.toValue(i)).join(vue.toValue(separator)));
}

function useArrayMap(list, fn) {
  return vue.computed(() => vue.toValue(list).map((i) => vue.toValue(i)).map(fn));
}

function useArrayReduce(list, reducer, ...args) {
  const reduceCallback = (sum, value, index) => reducer(vue.toValue(sum), vue.toValue(value), index);
  return vue.computed(() => {
    const resolved = vue.toValue(list);
    return args.length ? resolved.reduce(reduceCallback, typeof args[0] === "function" ? vue.toValue(args[0]()) : vue.toValue(args[0])) : resolved.reduce(reduceCallback);
  });
}

function useArraySome(list, fn) {
  return vue.computed(() => vue.toValue(list).some((element, index, array) => fn(vue.toValue(element), index, array)));
}

function uniq(array) {
  return Array.from(new Set(array));
}
function uniqueElementsBy(array, fn) {
  return array.reduce((acc, v) => {
    if (!acc.some((x) => fn(v, x, array)))
      acc.push(v);
    return acc;
  }, []);
}
function useArrayUnique(list, compareFn) {
  return vue.computed(() => {
    const resolvedList = vue.toValue(list).map((element) => vue.toValue(element));
    return compareFn ? uniqueElementsBy(resolvedList, compareFn) : uniq(resolvedList);
  });
}

function useCounter(initialValue = 0, options = {}) {
  let _initialValue = vue.unref(initialValue);
  const count = vue.shallowRef(initialValue);
  const {
    max = Number.POSITIVE_INFINITY,
    min = Number.NEGATIVE_INFINITY
  } = options;
  const inc = (delta = 1) => count.value = Math.max(Math.min(max, count.value + delta), min);
  const dec = (delta = 1) => count.value = Math.min(Math.max(min, count.value - delta), max);
  const get = () => count.value;
  const set = (val) => count.value = Math.max(min, Math.min(max, val));
  const reset = (val = _initialValue) => {
    _initialValue = val;
    return set(val);
  };
  return { count, inc, dec, get, set, reset };
}

const REGEX_PARSE = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[T\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/i;
const REGEX_FORMAT = /[YMDHhms]o|\[([^\]]+)\]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a{1,2}|A{1,2}|m{1,2}|s{1,2}|Z{1,2}|z{1,4}|SSS/g;
function defaultMeridiem(hours, minutes, isLowercase, hasPeriod) {
  let m = hours < 12 ? "AM" : "PM";
  if (hasPeriod)
    m = m.split("").reduce((acc, curr) => acc += `${curr}.`, "");
  return isLowercase ? m.toLowerCase() : m;
}
function formatOrdinal(num) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
function formatDate(date, formatStr, options = {}) {
  var _a;
  const years = date.getFullYear();
  const month = date.getMonth();
  const days = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  const day = date.getDay();
  const meridiem = (_a = options.customMeridiem) != null ? _a : defaultMeridiem;
  const stripTimeZone = (dateString) => {
    var _a2;
    return (_a2 = dateString.split(" ")[1]) != null ? _a2 : "";
  };
  const matches = {
    Yo: () => formatOrdinal(years),
    YY: () => String(years).slice(-2),
    YYYY: () => years,
    M: () => month + 1,
    Mo: () => formatOrdinal(month + 1),
    MM: () => `${month + 1}`.padStart(2, "0"),
    MMM: () => date.toLocaleDateString(vue.toValue(options.locales), { month: "short" }),
    MMMM: () => date.toLocaleDateString(vue.toValue(options.locales), { month: "long" }),
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
    dd: () => date.toLocaleDateString(vue.toValue(options.locales), { weekday: "narrow" }),
    ddd: () => date.toLocaleDateString(vue.toValue(options.locales), { weekday: "short" }),
    dddd: () => date.toLocaleDateString(vue.toValue(options.locales), { weekday: "long" }),
    A: () => meridiem(hours, minutes),
    AA: () => meridiem(hours, minutes, false, true),
    a: () => meridiem(hours, minutes, true),
    aa: () => meridiem(hours, minutes, true, true),
    z: () => stripTimeZone(date.toLocaleDateString(vue.toValue(options.locales), { timeZoneName: "shortOffset" })),
    zz: () => stripTimeZone(date.toLocaleDateString(vue.toValue(options.locales), { timeZoneName: "shortOffset" })),
    zzz: () => stripTimeZone(date.toLocaleDateString(vue.toValue(options.locales), { timeZoneName: "shortOffset" })),
    zzzz: () => stripTimeZone(date.toLocaleDateString(vue.toValue(options.locales), { timeZoneName: "longOffset" }))
  };
  return formatStr.replace(REGEX_FORMAT, (match, $1) => {
    var _a2, _b;
    return (_b = $1 != null ? $1 : (_a2 = matches[match]) == null ? void 0 : _a2.call(matches)) != null ? _b : match;
  });
}
function normalizeDate(date) {
  if (date === null)
    return new Date(Number.NaN);
  if (date === void 0)
    return /* @__PURE__ */ new Date();
  if (date instanceof Date)
    return new Date(date);
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
function useDateFormat(date, formatStr = "HH:mm:ss", options = {}) {
  return vue.computed(() => formatDate(normalizeDate(vue.toValue(date)), vue.toValue(formatStr), options));
}

function useIntervalFn(cb, interval = 1e3, options = {}) {
  const {
    immediate = true,
    immediateCallback = false
  } = options;
  let timer = null;
  const isActive = vue.shallowRef(false);
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
    const intervalValue = vue.toValue(interval);
    if (intervalValue <= 0)
      return;
    isActive.value = true;
    if (immediateCallback)
      cb();
    clean();
    if (isActive.value)
      timer = setInterval(cb, intervalValue);
  }
  if (immediate && isClient)
    resume();
  if (vue.isRef(interval) || typeof interval === "function") {
    const stopWatch = vue.watch(interval, () => {
      if (isActive.value && isClient)
        resume();
    });
    tryOnScopeDispose(stopWatch);
  }
  tryOnScopeDispose(pause);
  return {
    isActive,
    pause,
    resume
  };
}

function useInterval(interval = 1e3, options = {}) {
  const {
    controls: exposeControls = false,
    immediate = true,
    callback
  } = options;
  const counter = vue.shallowRef(0);
  const update = () => counter.value += 1;
  const reset = () => {
    counter.value = 0;
  };
  const controls = useIntervalFn(
    callback ? () => {
      update();
      callback(counter.value);
    } : update,
    interval,
    { immediate }
  );
  if (exposeControls) {
    return {
      counter,
      reset,
      ...controls
    };
  } else {
    return counter;
  }
}

function useLastChanged(source, options = {}) {
  var _a;
  const ms = vue.shallowRef((_a = options.initialValue) != null ? _a : null);
  vue.watch(
    source,
    () => ms.value = timestamp(),
    options
  );
  return ms;
}

function useTimeoutFn(cb, interval, options = {}) {
  const {
    immediate = true,
    immediateCallback = false
  } = options;
  const isPending = vue.shallowRef(false);
  let timer = null;
  function clear() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
  function stop() {
    isPending.value = false;
    clear();
  }
  function start(...args) {
    if (immediateCallback)
      cb();
    clear();
    isPending.value = true;
    timer = setTimeout(() => {
      isPending.value = false;
      timer = null;
      cb(...args);
    }, vue.toValue(interval));
  }
  if (immediate) {
    isPending.value = true;
    if (isClient)
      start();
  }
  tryOnScopeDispose(stop);
  return {
    isPending: vue.readonly(isPending),
    start,
    stop
  };
}

function useTimeout(interval = 1e3, options = {}) {
  const {
    controls: exposeControls = false,
    callback
  } = options;
  const controls = useTimeoutFn(
    callback != null ? callback : noop,
    interval,
    options
  );
  const ready = vue.computed(() => !controls.isPending.value);
  if (exposeControls) {
    return {
      ready,
      ...controls
    };
  } else {
    return ready;
  }
}

function useToNumber(value, options = {}) {
  const {
    method = "parseFloat",
    radix,
    nanToZero
  } = options;
  return vue.computed(() => {
    let resolved = vue.toValue(value);
    if (typeof method === "function")
      resolved = method(resolved);
    else if (typeof resolved === "string")
      resolved = Number[method](resolved, radix);
    if (nanToZero && Number.isNaN(resolved))
      resolved = 0;
    return resolved;
  });
}

function useToString(value) {
  return vue.computed(() => `${vue.toValue(value)}`);
}

function useToggle(initialValue = false, options = {}) {
  const {
    truthyValue = true,
    falsyValue = false
  } = options;
  const valueIsRef = vue.isRef(initialValue);
  const _value = vue.shallowRef(initialValue);
  function toggle(value) {
    if (arguments.length) {
      _value.value = value;
      return _value.value;
    } else {
      const truthy = vue.toValue(truthyValue);
      _value.value = _value.value === truthy ? vue.toValue(falsyValue) : truthy;
      return _value.value;
    }
  }
  if (valueIsRef)
    return toggle;
  else
    return [_value, toggle];
}

function watchArray(source, cb, options) {
  let oldList = (options == null ? void 0 : options.immediate) ? [] : [...typeof source === "function" ? source() : Array.isArray(source) ? source : vue.toValue(source)];
  return vue.watch(source, (newList, _, onCleanup) => {
    const oldListRemains = Array.from({ length: oldList.length });
    const added = [];
    for (const obj of newList) {
      let found = false;
      for (let i = 0; i < oldList.length; i++) {
        if (!oldListRemains[i] && obj === oldList[i]) {
          oldListRemains[i] = true;
          found = true;
          break;
        }
      }
      if (!found)
        added.push(obj);
    }
    const removed = oldList.filter((_2, i) => !oldListRemains[i]);
    cb(newList, oldList, added, removed, onCleanup);
    oldList = [...newList];
  }, options);
}

function watchAtMost(source, cb, options) {
  const {
    count,
    ...watchOptions
  } = options;
  const current = vue.shallowRef(0);
  const stop = watchWithFilter(
    source,
    (...args) => {
      current.value += 1;
      if (current.value >= vue.toValue(count))
        vue.nextTick(() => stop());
      cb(...args);
    },
    watchOptions
  );
  return { count: current, stop };
}

function watchDebounced(source, cb, options = {}) {
  const {
    debounce = 0,
    maxWait = void 0,
    ...watchOptions
  } = options;
  return watchWithFilter(
    source,
    cb,
    {
      ...watchOptions,
      eventFilter: debounceFilter(debounce, { maxWait })
    }
  );
}

function watchDeep(source, cb, options) {
  return vue.watch(
    source,
    cb,
    {
      ...options,
      deep: true
    }
  );
}

function watchIgnorable(source, cb, options = {}) {
  const {
    eventFilter = bypassFilter,
    ...watchOptions
  } = options;
  const filteredCb = createFilterWrapper(
    eventFilter,
    cb
  );
  let ignoreUpdates;
  let ignorePrevAsyncUpdates;
  let stop;
  if (watchOptions.flush === "sync") {
    const ignore = vue.shallowRef(false);
    ignorePrevAsyncUpdates = () => {
    };
    ignoreUpdates = (updater) => {
      ignore.value = true;
      updater();
      ignore.value = false;
    };
    stop = vue.watch(
      source,
      (...args) => {
        if (!ignore.value)
          filteredCb(...args);
      },
      watchOptions
    );
  } else {
    const disposables = [];
    const ignoreCounter = vue.shallowRef(0);
    const syncCounter = vue.shallowRef(0);
    ignorePrevAsyncUpdates = () => {
      ignoreCounter.value = syncCounter.value;
    };
    disposables.push(
      vue.watch(
        source,
        () => {
          syncCounter.value++;
        },
        { ...watchOptions, flush: "sync" }
      )
    );
    ignoreUpdates = (updater) => {
      const syncCounterPrev = syncCounter.value;
      updater();
      ignoreCounter.value += syncCounter.value - syncCounterPrev;
    };
    disposables.push(
      vue.watch(
        source,
        (...args) => {
          const ignore = ignoreCounter.value > 0 && ignoreCounter.value === syncCounter.value;
          ignoreCounter.value = 0;
          syncCounter.value = 0;
          if (ignore)
            return;
          filteredCb(...args);
        },
        watchOptions
      )
    );
    stop = () => {
      disposables.forEach((fn) => fn());
    };
  }
  return { stop, ignoreUpdates, ignorePrevAsyncUpdates };
}

function watchImmediate(source, cb, options) {
  return vue.watch(
    source,
    cb,
    {
      ...options,
      immediate: true
    }
  );
}

function watchOnce(source, cb, options) {
  const stop = vue.watch(source, (...args) => {
    vue.nextTick(() => stop());
    return cb(...args);
  }, options);
  return stop;
}

function watchThrottled(source, cb, options = {}) {
  const {
    throttle = 0,
    trailing = true,
    leading = true,
    ...watchOptions
  } = options;
  return watchWithFilter(
    source,
    cb,
    {
      ...watchOptions,
      eventFilter: throttleFilter(throttle, trailing, leading)
    }
  );
}

function watchTriggerable(source, cb, options = {}) {
  let cleanupFn;
  function onEffect() {
    if (!cleanupFn)
      return;
    const fn = cleanupFn;
    cleanupFn = void 0;
    fn();
  }
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
    let res2;
    ignoreUpdates(() => {
      res2 = _cb(getWatchSources(source), getOldValue(source));
    });
    return res2;
  };
  return {
    ...res,
    trigger
  };
}
function getWatchSources(sources) {
  if (vue.isReactive(sources))
    return sources;
  if (Array.isArray(sources))
    return sources.map((item) => vue.toValue(item));
  return vue.toValue(sources);
}
function getOldValue(source) {
  return Array.isArray(source) ? source.map(() => void 0) : void 0;
}

function whenever(source, cb, options) {
  const stop = vue.watch(
    source,
    (v, ov, onInvalidate) => {
      if (v) {
        if (options == null ? void 0 : options.once)
          vue.nextTick(() => stop());
        cb(v, ov, onInvalidate);
      }
    },
    {
      ...options,
      once: false
    }
  );
  return stop;
}

exports.assert = assert;
exports.autoResetRef = refAutoReset;
exports.bypassFilter = bypassFilter;
exports.camelize = camelize;
exports.clamp = clamp;
exports.computedEager = computedEager;
exports.computedWithControl = computedWithControl;
exports.containsProp = containsProp;
exports.controlledComputed = computedWithControl;
exports.controlledRef = controlledRef;
exports.createEventHook = createEventHook;
exports.createFilterWrapper = createFilterWrapper;
exports.createGlobalState = createGlobalState;
exports.createInjectionState = createInjectionState;
exports.createReactiveFn = reactify;
exports.createRef = createRef;
exports.createSharedComposable = createSharedComposable;
exports.createSingletonPromise = createSingletonPromise;
exports.debounceFilter = debounceFilter;
exports.debouncedRef = refDebounced;
exports.debouncedWatch = watchDebounced;
exports.eagerComputed = computedEager;
exports.extendRef = extendRef;
exports.formatDate = formatDate;
exports.get = get;
exports.getLifeCycleTarget = getLifeCycleTarget;
exports.hasOwn = hasOwn;
exports.hyphenate = hyphenate;
exports.identity = identity;
exports.ignorableWatch = watchIgnorable;
exports.increaseWithUnit = increaseWithUnit;
exports.injectLocal = injectLocal;
exports.invoke = invoke;
exports.isClient = isClient;
exports.isDef = isDef;
exports.isDefined = isDefined;
exports.isIOS = isIOS;
exports.isObject = isObject;
exports.isWorker = isWorker;
exports.makeDestructurable = makeDestructurable;
exports.noop = noop;
exports.normalizeDate = normalizeDate;
exports.notNullish = notNullish;
exports.now = now;
exports.objectEntries = objectEntries;
exports.objectOmit = objectOmit;
exports.objectPick = objectPick;
exports.pausableFilter = pausableFilter;
exports.pausableWatch = watchPausable;
exports.promiseTimeout = promiseTimeout;
exports.provideLocal = provideLocal;
exports.pxValue = pxValue;
exports.rand = rand;
exports.reactify = reactify;
exports.reactifyObject = reactifyObject;
exports.reactiveComputed = reactiveComputed;
exports.reactiveOmit = reactiveOmit;
exports.reactivePick = reactivePick;
exports.refAutoReset = refAutoReset;
exports.refDebounced = refDebounced;
exports.refDefault = refDefault;
exports.refThrottled = refThrottled;
exports.refWithControl = refWithControl;
exports.resolveRef = resolveRef;
exports.resolveUnref = resolveUnref;
exports.set = set;
exports.syncRef = syncRef;
exports.syncRefs = syncRefs;
exports.throttleFilter = throttleFilter;
exports.throttledRef = refThrottled;
exports.throttledWatch = watchThrottled;
exports.timestamp = timestamp;
exports.toArray = toArray;
exports.toReactive = toReactive;
exports.toRef = toRef;
exports.toRefs = toRefs;
exports.toValue = toValue;
exports.tryOnBeforeMount = tryOnBeforeMount;
exports.tryOnBeforeUnmount = tryOnBeforeUnmount;
exports.tryOnMounted = tryOnMounted;
exports.tryOnScopeDispose = tryOnScopeDispose;
exports.tryOnUnmounted = tryOnUnmounted;
exports.until = until;
exports.useArrayDifference = useArrayDifference;
exports.useArrayEvery = useArrayEvery;
exports.useArrayFilter = useArrayFilter;
exports.useArrayFind = useArrayFind;
exports.useArrayFindIndex = useArrayFindIndex;
exports.useArrayFindLast = useArrayFindLast;
exports.useArrayIncludes = useArrayIncludes;
exports.useArrayJoin = useArrayJoin;
exports.useArrayMap = useArrayMap;
exports.useArrayReduce = useArrayReduce;
exports.useArraySome = useArraySome;
exports.useArrayUnique = useArrayUnique;
exports.useCounter = useCounter;
exports.useDateFormat = useDateFormat;
exports.useDebounce = refDebounced;
exports.useDebounceFn = useDebounceFn;
exports.useInterval = useInterval;
exports.useIntervalFn = useIntervalFn;
exports.useLastChanged = useLastChanged;
exports.useThrottle = refThrottled;
exports.useThrottleFn = useThrottleFn;
exports.useTimeout = useTimeout;
exports.useTimeoutFn = useTimeoutFn;
exports.useToNumber = useToNumber;
exports.useToString = useToString;
exports.useToggle = useToggle;
exports.watchArray = watchArray;
exports.watchAtMost = watchAtMost;
exports.watchDebounced = watchDebounced;
exports.watchDeep = watchDeep;
exports.watchIgnorable = watchIgnorable;
exports.watchImmediate = watchImmediate;
exports.watchOnce = watchOnce;
exports.watchPausable = watchPausable;
exports.watchThrottled = watchThrottled;
exports.watchTriggerable = watchTriggerable;
exports.watchWithFilter = watchWithFilter;
exports.whenever = whenever;
