var VueDemi = (function (VueDemi, Vue, VueCompositionAPI) {
  if (VueDemi.install) {
    return VueDemi
  }
  if (!Vue) {
    console.error('[vue-demi] no Vue instance found, please be sure to import `vue` before `vue-demi`.')
    return VueDemi
  }

  // Vue 2.7
  if (Vue.version.slice(0, 4) === '2.7.') {
    for (var key in Vue) {
      VueDemi[key] = Vue[key]
    }
    VueDemi.isVue2 = true
    VueDemi.isVue3 = false
    VueDemi.install = function () {}
    VueDemi.Vue = Vue
    VueDemi.Vue2 = Vue
    VueDemi.version = Vue.version
    VueDemi.warn = Vue.util.warn
    function createApp(rootComponent, rootProps) {
      var vm
      var provide = {}
      var app = {
        config: Vue.config,
        use: Vue.use.bind(Vue),
        mixin: Vue.mixin.bind(Vue),
        component: Vue.component.bind(Vue),
        provide: function (key, value) {
          provide[key] = value
          return this
        },
        directive: function (name, dir) {
          if (dir) {
            Vue.directive(name, dir)
            return app
          } else {
            return Vue.directive(name)
          }
        },
        mount: function (el, hydrating) {
          if (!vm) {
            vm = new Vue(Object.assign({ propsData: rootProps }, rootComponent, { provide: Object.assign(provide, rootComponent.provide) }))
            vm.$mount(el, hydrating)
            return vm
          } else {
            return vm
          }
        },
        unmount: function () {
          if (vm) {
            vm.$destroy()
            vm = undefined
          }
        },
      }
      return app
    }
    VueDemi.createApp = createApp
  }
  // Vue 2.6.x
  else if (Vue.version.slice(0, 2) === '2.') {
    if (VueCompositionAPI) {
      for (var key in VueCompositionAPI) {
        VueDemi[key] = VueCompositionAPI[key]
      }
      VueDemi.isVue2 = true
      VueDemi.isVue3 = false
      VueDemi.install = function () {}
      VueDemi.Vue = Vue
      VueDemi.Vue2 = Vue
      VueDemi.version = Vue.version
    } else {
      console.error('[vue-demi] no VueCompositionAPI instance found, please be sure to import `@vue/composition-api` before `vue-demi`.')
    }
  }
  // Vue 3
  else if (Vue.version.slice(0, 2) === '3.') {
    for (var key in Vue) {
      VueDemi[key] = Vue[key]
    }
    VueDemi.isVue2 = false
    VueDemi.isVue3 = true
    VueDemi.install = function () {}
    VueDemi.Vue = Vue
    VueDemi.Vue2 = undefined
    VueDemi.version = Vue.version
    VueDemi.set = function (target, key, val) {
      if (Array.isArray(target)) {
        target.length = Math.max(target.length, key)
        target.splice(key, 1, val)
        return val
      }
      target[key] = val
      return val
    }
    VueDemi.del = function (target, key) {
      if (Array.isArray(target)) {
        target.splice(key, 1)
        return
      }
      delete target[key]
    }
  } else {
    console.error('[vue-demi] Vue version ' + Vue.version + ' is unsupported.')
  }
  return VueDemi
})(
  (this.VueDemi = this.VueDemi || (typeof VueDemi !== 'undefined' ? VueDemi : {})),
  this.Vue || (typeof Vue !== 'undefined' ? Vue : undefined),
  this.VueCompositionAPI || (typeof VueCompositionAPI !== 'undefined' ? VueCompositionAPI : undefined)
);
;
;(function (exports, vueDemi) {
  'use strict';

  var __defProp$9 = Object.defineProperty;
  var __defProps$6 = Object.defineProperties;
  var __getOwnPropDescs$6 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$b = Object.getOwnPropertySymbols;
  var __hasOwnProp$b = Object.prototype.hasOwnProperty;
  var __propIsEnum$b = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$9 = (obj, key, value) => key in obj ? __defProp$9(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$9 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$b.call(b, prop))
        __defNormalProp$9(a, prop, b[prop]);
    if (__getOwnPropSymbols$b)
      for (var prop of __getOwnPropSymbols$b(b)) {
        if (__propIsEnum$b.call(b, prop))
          __defNormalProp$9(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$6 = (a, b) => __defProps$6(a, __getOwnPropDescs$6(b));
  function computedEager(fn, options) {
    var _a;
    const result = vueDemi.shallowRef();
    vueDemi.watchEffect(() => {
      result.value = fn();
    }, __spreadProps$6(__spreadValues$9({}, options), {
      flush: (_a = options == null ? void 0 : options.flush) != null ? _a : "sync"
    }));
    return vueDemi.readonly(result);
  }

  var _a;
  const isClient = typeof window !== "undefined";
  const isDef = (val) => typeof val !== "undefined";
  const assert = (condition, ...infos) => {
    if (!condition)
      console.warn(...infos);
  };
  const toString = Object.prototype.toString;
  const isBoolean = (val) => typeof val === "boolean";
  const isFunction = (val) => typeof val === "function";
  const isNumber = (val) => typeof val === "number";
  const isString = (val) => typeof val === "string";
  const isObject = (val) => toString.call(val) === "[object Object]";
  const isWindow = (val) => typeof window !== "undefined" && toString.call(val) === "[object Window]";
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
  const isIOS = isClient && ((_a = window == null ? void 0 : window.navigator) == null ? void 0 : _a.userAgent) && /iP(ad|hone|od)/.test(window.navigator.userAgent);
  const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);

  function resolveUnref(r) {
    return typeof r === "function" ? r() : vueDemi.unref(r);
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
    const filter = (invoke) => {
      const duration = resolveUnref(ms);
      const maxDuration = resolveUnref(options.maxWait);
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
        if (maxDuration && !maxTimer) {
          maxTimer = setTimeout(() => {
            if (timer)
              _clearTimeout(timer);
            maxTimer = null;
            resolve(invoke());
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
  function throttleFilter(ms, trailing = true, leading = true, rejectOnCancel = false) {
    let lastExec = 0;
    let timer;
    let isLeading = true;
    let lastRejector = noop;
    let lastValue;
    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = void 0;
        lastRejector();
        lastRejector = noop;
      }
    };
    const filter = (_invoke) => {
      const duration = resolveUnref(ms);
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
  function pausableFilter(extendFilter = bypassFilter) {
    const isActive = vueDemi.ref(true);
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
    return { isActive: vueDemi.readonly(isActive), pause, resume, eventFilter };
  }

  function __onlyVue3(name = "this function") {
    if (vueDemi.isVue3)
      return;
    throw new Error(`[VueUse] ${name} is only works on Vue 3.`);
  }
  function __onlyVue27Plus(name = "this function") {
    if (vueDemi.isVue3 || vueDemi.version.startsWith("2.7."))
      return;
    throw new Error(`[VueUse] ${name} is only works on Vue 2.7 or above.`);
  }
  const directiveHooks = {
    mounted: vueDemi.isVue3 ? "mounted" : "inserted",
    updated: vueDemi.isVue3 ? "updated" : "componentUpdated",
    unmounted: vueDemi.isVue3 ? "unmounted" : "unbind"
  };

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
    const value = ((_a = target.match(/^-?[0-9]+\.?[0-9]*/)) == null ? void 0 : _a[0]) || "";
    const unit = target.slice(value.length);
    const result = parseFloat(value) + delta;
    if (Number.isNaN(result))
      return target;
    return result + unit;
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

  function computedWithControl(source, fn) {
    let v = void 0;
    let track;
    let trigger;
    const dirty = vueDemi.ref(true);
    const update = () => {
      dirty.value = true;
      trigger();
    };
    vueDemi.watch(source, update, { flush: "sync" });
    const get = isFunction(fn) ? fn : fn.get;
    const set = isFunction(fn) ? void 0 : fn.set;
    const result = vueDemi.customRef((_track, _trigger) => {
      track = _track;
      trigger = _trigger;
      return {
        get() {
          if (dirty.value) {
            v = get();
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
    if (vueDemi.getCurrentScope()) {
      vueDemi.onScopeDispose(fn);
      return true;
    }
    return false;
  }

  function createEventHook() {
    const fns = [];
    const off = (fn) => {
      const index = fns.indexOf(fn);
      if (index !== -1)
        fns.splice(index, 1);
    };
    const on = (fn) => {
      fns.push(fn);
      const offFn = () => off(fn);
      tryOnScopeDispose(offFn);
      return {
        off: offFn
      };
    };
    const trigger = (param) => {
      fns.forEach((fn) => fn(param));
    };
    return {
      on,
      off,
      trigger
    };
  }

  function createGlobalState(stateFactory) {
    let initialized = false;
    let state;
    const scope = vueDemi.effectScope(true);
    return () => {
      if (!initialized) {
        state = scope.run(stateFactory);
        initialized = true;
      }
      return state;
    };
  }

  function createInjectionState(composable) {
    const key = Symbol("InjectionState");
    const useProvidingState = (...args) => {
      const state = composable(...args);
      vueDemi.provide(key, state);
      return state;
    };
    const useInjectedState = () => vueDemi.inject(key);
    return [useProvidingState, useInjectedState];
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
      if (!state) {
        scope = vueDemi.effectScope(true);
        state = scope.run(() => composable(...args));
      }
      tryOnScopeDispose(dispose);
      return state;
    };
  }

  function extendRef(ref, extend, { enumerable = false, unwrap = true } = {}) {
    __onlyVue27Plus();
    for (const [key, value] of Object.entries(extend)) {
      if (key === "value")
        continue;
      if (vueDemi.isRef(value) && unwrap) {
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
      return vueDemi.unref(obj);
    return vueDemi.unref(obj)[key];
  }

  function isDefined(v) {
    return vueDemi.unref(v) != null;
  }

  var __defProp$8 = Object.defineProperty;
  var __getOwnPropSymbols$a = Object.getOwnPropertySymbols;
  var __hasOwnProp$a = Object.prototype.hasOwnProperty;
  var __propIsEnum$a = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$8 = (obj, key, value) => key in obj ? __defProp$8(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$8 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$a.call(b, prop))
        __defNormalProp$8(a, prop, b[prop]);
    if (__getOwnPropSymbols$a)
      for (var prop of __getOwnPropSymbols$a(b)) {
        if (__propIsEnum$a.call(b, prop))
          __defNormalProp$8(a, prop, b[prop]);
      }
    return a;
  };
  function makeDestructurable(obj, arr) {
    if (typeof Symbol !== "undefined") {
      const clone = __spreadValues$8({}, obj);
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
    const unrefFn = (options == null ? void 0 : options.computedGetter) === false ? vueDemi.unref : resolveUnref;
    return function(...args) {
      return vueDemi.computed(() => fn.apply(this, args.map((i) => unrefFn(i))));
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
    return Object.fromEntries(keys.map((key) => {
      const value = obj[key];
      return [
        key,
        typeof value === "function" ? reactify(value.bind(obj), options) : value
      ];
    }));
  }

  function toReactive(objectRef) {
    if (!vueDemi.isRef(objectRef))
      return vueDemi.reactive(objectRef);
    const proxy = new Proxy({}, {
      get(_, p, receiver) {
        return vueDemi.unref(Reflect.get(objectRef.value, p, receiver));
      },
      set(_, p, value) {
        if (vueDemi.isRef(objectRef.value[p]) && !vueDemi.isRef(value))
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
    return vueDemi.reactive(proxy);
  }

  function reactiveComputed(fn) {
    return toReactive(vueDemi.computed(fn));
  }

  function reactiveOmit(obj, ...keys) {
    const flatKeys = keys.flat();
    return reactiveComputed(() => Object.fromEntries(Object.entries(vueDemi.toRefs(obj)).filter((e) => !flatKeys.includes(e[0]))));
  }

  function reactivePick(obj, ...keys) {
    const flatKeys = keys.flat();
    return vueDemi.reactive(Object.fromEntries(flatKeys.map((k) => [k, vueDemi.toRef(obj, k)])));
  }

  function refAutoReset(defaultValue, afterMs = 1e4) {
    return vueDemi.customRef((track, trigger) => {
      let value = defaultValue;
      let timer;
      const resetAfter = () => setTimeout(() => {
        value = defaultValue;
        trigger();
      }, resolveUnref(afterMs));
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
    return createFilterWrapper(debounceFilter(ms, options), fn);
  }

  function refDebounced(value, ms = 200, options = {}) {
    const debounced = vueDemi.ref(value.value);
    const updater = useDebounceFn(() => {
      debounced.value = value.value;
    }, ms, options);
    vueDemi.watch(value, () => updater());
    return debounced;
  }

  function refDefault(source, defaultValue) {
    return vueDemi.computed({
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
    return createFilterWrapper(throttleFilter(ms, trailing, leading, rejectOnCancel), fn);
  }

  function refThrottled(value, delay = 200, trailing = true, leading = true) {
    if (delay <= 0)
      return value;
    const throttled = vueDemi.ref(value.value);
    const updater = useThrottleFn(() => {
      throttled.value = value.value;
    }, delay, trailing, leading);
    vueDemi.watch(value, () => updater());
    return throttled;
  }

  function refWithControl(initial, options = {}) {
    let source = initial;
    let track;
    let trigger;
    const ref = vueDemi.customRef((_track, _trigger) => {
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
    return extendRef(ref, {
      get,
      set,
      untrackedGet,
      silentSet,
      peek,
      lay
    }, { enumerable: true });
  }
  const controlledRef = refWithControl;

  function resolveRef(r) {
    return typeof r === "function" ? vueDemi.computed(r) : vueDemi.ref(r);
  }

  function set(...args) {
    if (args.length === 2) {
      const [ref, value] = args;
      ref.value = value;
    }
    if (args.length === 3) {
      if (vueDemi.isVue2) {
        vueDemi.set(...args);
      } else {
        const [target, key, value] = args;
        target[key] = value;
      }
    }
  }

  function syncRef(left, right, options = {}) {
    var _a, _b;
    const {
      flush = "sync",
      deep = false,
      immediate = true,
      direction = "both",
      transform = {}
    } = options;
    let watchLeft;
    let watchRight;
    const transformLTR = (_a = transform.ltr) != null ? _a : (v) => v;
    const transformRTL = (_b = transform.rtl) != null ? _b : (v) => v;
    if (direction === "both" || direction === "ltr") {
      watchLeft = vueDemi.watch(left, (newValue) => right.value = transformLTR(newValue), { flush, deep, immediate });
    }
    if (direction === "both" || direction === "rtl") {
      watchRight = vueDemi.watch(right, (newValue) => left.value = transformRTL(newValue), { flush, deep, immediate });
    }
    return () => {
      watchLeft == null ? void 0 : watchLeft();
      watchRight == null ? void 0 : watchRight();
    };
  }

  function syncRefs(source, targets, options = {}) {
    const {
      flush = "sync",
      deep = false,
      immediate = true
    } = options;
    if (!Array.isArray(targets))
      targets = [targets];
    return vueDemi.watch(source, (newValue) => targets.forEach((target) => target.value = newValue), { flush, deep, immediate });
  }

  var __defProp$7 = Object.defineProperty;
  var __defProps$5 = Object.defineProperties;
  var __getOwnPropDescs$5 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$9 = Object.getOwnPropertySymbols;
  var __hasOwnProp$9 = Object.prototype.hasOwnProperty;
  var __propIsEnum$9 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$7 = (obj, key, value) => key in obj ? __defProp$7(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$7 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$9.call(b, prop))
        __defNormalProp$7(a, prop, b[prop]);
    if (__getOwnPropSymbols$9)
      for (var prop of __getOwnPropSymbols$9(b)) {
        if (__propIsEnum$9.call(b, prop))
          __defNormalProp$7(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$5 = (a, b) => __defProps$5(a, __getOwnPropDescs$5(b));
  function toRefs(objectRef) {
    if (!vueDemi.isRef(objectRef))
      return vueDemi.toRefs(objectRef);
    const result = Array.isArray(objectRef.value) ? new Array(objectRef.value.length) : {};
    for (const key in objectRef.value) {
      result[key] = vueDemi.customRef(() => ({
        get() {
          return objectRef.value[key];
        },
        set(v) {
          if (Array.isArray(objectRef.value)) {
            const copy = [...objectRef.value];
            copy[key] = v;
            objectRef.value = copy;
          } else {
            const newObject = __spreadProps$5(__spreadValues$7({}, objectRef.value), { [key]: v });
            Object.setPrototypeOf(newObject, objectRef.value);
            objectRef.value = newObject;
          }
        }
      }));
    }
    return result;
  }

  function tryOnBeforeMount(fn, sync = true) {
    if (vueDemi.getCurrentInstance())
      vueDemi.onBeforeMount(fn);
    else if (sync)
      fn();
    else
      vueDemi.nextTick(fn);
  }

  function tryOnBeforeUnmount(fn) {
    if (vueDemi.getCurrentInstance())
      vueDemi.onBeforeUnmount(fn);
  }

  function tryOnMounted(fn, sync = true) {
    if (vueDemi.getCurrentInstance())
      vueDemi.onMounted(fn);
    else if (sync)
      fn();
    else
      vueDemi.nextTick(fn);
  }

  function tryOnUnmounted(fn) {
    if (vueDemi.getCurrentInstance())
      vueDemi.onUnmounted(fn);
  }

  function createUntil(r, isNot = false) {
    function toMatch(condition, { flush = "sync", deep = false, timeout, throwOnTimeout } = {}) {
      let stop = null;
      const watcher = new Promise((resolve) => {
        stop = vueDemi.watch(r, (v) => {
          if (condition(v) !== isNot) {
            stop == null ? void 0 : stop();
            resolve(v);
          }
        }, {
          flush,
          deep,
          immediate: true
        });
      });
      const promises = [watcher];
      if (timeout != null) {
        promises.push(promiseTimeout(timeout, throwOnTimeout).then(() => resolveUnref(r)).finally(() => stop == null ? void 0 : stop()));
      }
      return Promise.race(promises);
    }
    function toBe(value, options) {
      if (!vueDemi.isRef(value))
        return toMatch((v) => v === value, options);
      const { flush = "sync", deep = false, timeout, throwOnTimeout } = options != null ? options : {};
      let stop = null;
      const watcher = new Promise((resolve) => {
        stop = vueDemi.watch([r, value], ([v1, v2]) => {
          if (isNot !== (v1 === v2)) {
            stop == null ? void 0 : stop();
            resolve(v1);
          }
        }, {
          flush,
          deep,
          immediate: true
        });
      });
      const promises = [watcher];
      if (timeout != null) {
        promises.push(promiseTimeout(timeout, throwOnTimeout).then(() => resolveUnref(r)).finally(() => {
          stop == null ? void 0 : stop();
          return resolveUnref(r);
        }));
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
        return array.includes(value) || array.includes(resolveUnref(value));
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
    if (Array.isArray(resolveUnref(r))) {
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

  function useArrayEvery(list, fn) {
    return vueDemi.computed(() => resolveUnref(list).every((element, index, array) => fn(resolveUnref(element), index, array)));
  }

  function useArrayFilter(list, fn) {
    return vueDemi.computed(() => resolveUnref(list).map((i) => resolveUnref(i)).filter(fn));
  }

  function useArrayFind(list, fn) {
    return vueDemi.computed(() => resolveUnref(resolveUnref(list).find((element, index, array) => fn(resolveUnref(element), index, array))));
  }

  function useArrayFindIndex(list, fn) {
    return vueDemi.computed(() => resolveUnref(list).findIndex((element, index, array) => fn(resolveUnref(element), index, array)));
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
    return vueDemi.computed(() => resolveUnref(!Array.prototype.findLast ? findLast(resolveUnref(list), (element, index, array) => fn(resolveUnref(element), index, array)) : resolveUnref(list).findLast((element, index, array) => fn(resolveUnref(element), index, array))));
  }

  function useArrayJoin(list, separator) {
    return vueDemi.computed(() => resolveUnref(list).map((i) => resolveUnref(i)).join(resolveUnref(separator)));
  }

  function useArrayMap(list, fn) {
    return vueDemi.computed(() => resolveUnref(list).map((i) => resolveUnref(i)).map(fn));
  }

  function useArrayReduce(list, reducer, ...args) {
    const reduceCallback = (sum, value, index) => reducer(resolveUnref(sum), resolveUnref(value), index);
    return vueDemi.computed(() => {
      const resolved = resolveUnref(list);
      return args.length ? resolved.reduce(reduceCallback, resolveUnref(args[0])) : resolved.reduce(reduceCallback);
    });
  }

  function useArraySome(list, fn) {
    return vueDemi.computed(() => resolveUnref(list).some((element, index, array) => fn(resolveUnref(element), index, array)));
  }

  function useArrayUnique(list) {
    return vueDemi.computed(() => [...new Set(resolveUnref(list).map((element) => resolveUnref(element)))]);
  }

  function useCounter(initialValue = 0, options = {}) {
    const count = vueDemi.ref(initialValue);
    const {
      max = Infinity,
      min = -Infinity
    } = options;
    const inc = (delta = 1) => count.value = Math.min(max, count.value + delta);
    const dec = (delta = 1) => count.value = Math.max(min, count.value - delta);
    const get = () => count.value;
    const set = (val) => count.value = Math.max(min, Math.min(max, val));
    const reset = (val = initialValue) => {
      initialValue = val;
      return set(val);
    };
    return { count, inc, dec, get, set, reset };
  }

  const REGEX_PARSE = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/;
  const REGEX_FORMAT = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a{1,2}|A{1,2}|m{1,2}|s{1,2}|Z{1,2}|SSS/g;
  const defaultMeridiem = (hours, minutes, isLowercase, hasPeriod) => {
    let m = hours < 12 ? "AM" : "PM";
    if (hasPeriod)
      m = m.split("").reduce((acc, curr) => acc += `${curr}.`, "");
    return isLowercase ? m.toLowerCase() : m;
  };
  const formatDate = (date, formatStr, options = {}) => {
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
    const matches = {
      YY: () => String(years).slice(-2),
      YYYY: () => years,
      M: () => month + 1,
      MM: () => `${month + 1}`.padStart(2, "0"),
      MMM: () => date.toLocaleDateString(options.locales, { month: "short" }),
      MMMM: () => date.toLocaleDateString(options.locales, { month: "long" }),
      D: () => String(days),
      DD: () => `${days}`.padStart(2, "0"),
      H: () => String(hours),
      HH: () => `${hours}`.padStart(2, "0"),
      h: () => `${hours % 12 || 12}`.padStart(1, "0"),
      hh: () => `${hours % 12 || 12}`.padStart(2, "0"),
      m: () => String(minutes),
      mm: () => `${minutes}`.padStart(2, "0"),
      s: () => String(seconds),
      ss: () => `${seconds}`.padStart(2, "0"),
      SSS: () => `${milliseconds}`.padStart(3, "0"),
      d: () => day,
      dd: () => date.toLocaleDateString(options.locales, { weekday: "narrow" }),
      ddd: () => date.toLocaleDateString(options.locales, { weekday: "short" }),
      dddd: () => date.toLocaleDateString(options.locales, { weekday: "long" }),
      A: () => meridiem(hours, minutes),
      AA: () => meridiem(hours, minutes, false, true),
      a: () => meridiem(hours, minutes, true),
      aa: () => meridiem(hours, minutes, true, true)
    };
    return formatStr.replace(REGEX_FORMAT, (match, $1) => $1 || matches[match]());
  };
  const normalizeDate = (date) => {
    if (date === null)
      return new Date(NaN);
    if (date === void 0)
      return new Date();
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
  };
  function useDateFormat(date, formatStr = "HH:mm:ss", options = {}) {
    return vueDemi.computed(() => formatDate(normalizeDate(resolveUnref(date)), resolveUnref(formatStr), options));
  }

  function useIntervalFn(cb, interval = 1e3, options = {}) {
    const {
      immediate = true,
      immediateCallback = false
    } = options;
    let timer = null;
    const isActive = vueDemi.ref(false);
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
      const intervalValue = resolveUnref(interval);
      if (intervalValue <= 0)
        return;
      isActive.value = true;
      if (immediateCallback)
        cb();
      clean();
      timer = setInterval(cb, intervalValue);
    }
    if (immediate && isClient)
      resume();
    if (vueDemi.isRef(interval) || isFunction(interval)) {
      const stopWatch = vueDemi.watch(interval, () => {
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

  var __defProp$6 = Object.defineProperty;
  var __getOwnPropSymbols$8 = Object.getOwnPropertySymbols;
  var __hasOwnProp$8 = Object.prototype.hasOwnProperty;
  var __propIsEnum$8 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$6 = (obj, key, value) => key in obj ? __defProp$6(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$6 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$8.call(b, prop))
        __defNormalProp$6(a, prop, b[prop]);
    if (__getOwnPropSymbols$8)
      for (var prop of __getOwnPropSymbols$8(b)) {
        if (__propIsEnum$8.call(b, prop))
          __defNormalProp$6(a, prop, b[prop]);
      }
    return a;
  };
  function useInterval(interval = 1e3, options = {}) {
    const {
      controls: exposeControls = false,
      immediate = true,
      callback
    } = options;
    const counter = vueDemi.ref(0);
    const update = () => counter.value += 1;
    const reset = () => {
      counter.value = 0;
    };
    const controls = useIntervalFn(callback ? () => {
      update();
      callback(counter.value);
    } : update, interval, { immediate });
    if (exposeControls) {
      return __spreadValues$6({
        counter,
        reset
      }, controls);
    } else {
      return counter;
    }
  }

  function useLastChanged(source, options = {}) {
    var _a;
    const ms = vueDemi.ref((_a = options.initialValue) != null ? _a : null);
    vueDemi.watch(source, () => ms.value = timestamp(), options);
    return ms;
  }

  function useTimeoutFn(cb, interval, options = {}) {
    const {
      immediate = true
    } = options;
    const isPending = vueDemi.ref(false);
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
      clear();
      isPending.value = true;
      timer = setTimeout(() => {
        isPending.value = false;
        timer = null;
        cb(...args);
      }, resolveUnref(interval));
    }
    if (immediate) {
      isPending.value = true;
      if (isClient)
        start();
    }
    tryOnScopeDispose(stop);
    return {
      isPending: vueDemi.readonly(isPending),
      start,
      stop
    };
  }

  var __defProp$5 = Object.defineProperty;
  var __getOwnPropSymbols$7 = Object.getOwnPropertySymbols;
  var __hasOwnProp$7 = Object.prototype.hasOwnProperty;
  var __propIsEnum$7 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$5 = (obj, key, value) => key in obj ? __defProp$5(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$5 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$7.call(b, prop))
        __defNormalProp$5(a, prop, b[prop]);
    if (__getOwnPropSymbols$7)
      for (var prop of __getOwnPropSymbols$7(b)) {
        if (__propIsEnum$7.call(b, prop))
          __defNormalProp$5(a, prop, b[prop]);
      }
    return a;
  };
  function useTimeout(interval = 1e3, options = {}) {
    const {
      controls: exposeControls = false,
      callback
    } = options;
    const controls = useTimeoutFn(callback != null ? callback : noop, interval, options);
    const ready = vueDemi.computed(() => !controls.isPending.value);
    if (exposeControls) {
      return __spreadValues$5({
        ready
      }, controls);
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
    return vueDemi.computed(() => {
      let resolved = resolveUnref(value);
      if (typeof resolved === "string")
        resolved = Number[method](resolved, radix);
      if (nanToZero && isNaN(resolved))
        resolved = 0;
      return resolved;
    });
  }

  function useToString(value) {
    return vueDemi.computed(() => `${resolveUnref(value)}`);
  }

  function useToggle(initialValue = false, options = {}) {
    const {
      truthyValue = true,
      falsyValue = false
    } = options;
    const valueIsRef = vueDemi.isRef(initialValue);
    const _value = vueDemi.ref(initialValue);
    function toggle(value) {
      if (arguments.length) {
        _value.value = value;
        return _value.value;
      } else {
        const truthy = resolveUnref(truthyValue);
        _value.value = _value.value === truthy ? resolveUnref(falsyValue) : truthy;
        return _value.value;
      }
    }
    if (valueIsRef)
      return toggle;
    else
      return [_value, toggle];
  }

  function watchArray(source, cb, options) {
    let oldList = (options == null ? void 0 : options.immediate) ? [] : [
      ...source instanceof Function ? source() : Array.isArray(source) ? source : vueDemi.unref(source)
    ];
    return vueDemi.watch(source, (newList, _, onCleanup) => {
      const oldListRemains = new Array(oldList.length);
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

  var __getOwnPropSymbols$6 = Object.getOwnPropertySymbols;
  var __hasOwnProp$6 = Object.prototype.hasOwnProperty;
  var __propIsEnum$6 = Object.prototype.propertyIsEnumerable;
  var __objRest$5 = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp$6.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols$6)
      for (var prop of __getOwnPropSymbols$6(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum$6.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  function watchWithFilter(source, cb, options = {}) {
    const _a = options, {
      eventFilter = bypassFilter
    } = _a, watchOptions = __objRest$5(_a, [
      "eventFilter"
    ]);
    return vueDemi.watch(source, createFilterWrapper(eventFilter, cb), watchOptions);
  }

  var __getOwnPropSymbols$5 = Object.getOwnPropertySymbols;
  var __hasOwnProp$5 = Object.prototype.hasOwnProperty;
  var __propIsEnum$5 = Object.prototype.propertyIsEnumerable;
  var __objRest$4 = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp$5.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols$5)
      for (var prop of __getOwnPropSymbols$5(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum$5.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  function watchAtMost(source, cb, options) {
    const _a = options, {
      count
    } = _a, watchOptions = __objRest$4(_a, [
      "count"
    ]);
    const current = vueDemi.ref(0);
    const stop = watchWithFilter(source, (...args) => {
      current.value += 1;
      if (current.value >= resolveUnref(count))
        vueDemi.nextTick(() => stop());
      cb(...args);
    }, watchOptions);
    return { count: current, stop };
  }

  var __defProp$4 = Object.defineProperty;
  var __defProps$4 = Object.defineProperties;
  var __getOwnPropDescs$4 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$4 = Object.getOwnPropertySymbols;
  var __hasOwnProp$4 = Object.prototype.hasOwnProperty;
  var __propIsEnum$4 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$4 = (obj, key, value) => key in obj ? __defProp$4(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$4 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$4.call(b, prop))
        __defNormalProp$4(a, prop, b[prop]);
    if (__getOwnPropSymbols$4)
      for (var prop of __getOwnPropSymbols$4(b)) {
        if (__propIsEnum$4.call(b, prop))
          __defNormalProp$4(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$4 = (a, b) => __defProps$4(a, __getOwnPropDescs$4(b));
  var __objRest$3 = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp$4.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols$4)
      for (var prop of __getOwnPropSymbols$4(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum$4.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  function watchDebounced(source, cb, options = {}) {
    const _a = options, {
      debounce = 0,
      maxWait = void 0
    } = _a, watchOptions = __objRest$3(_a, [
      "debounce",
      "maxWait"
    ]);
    return watchWithFilter(source, cb, __spreadProps$4(__spreadValues$4({}, watchOptions), {
      eventFilter: debounceFilter(debounce, { maxWait })
    }));
  }

  var __defProp$3 = Object.defineProperty;
  var __defProps$3 = Object.defineProperties;
  var __getOwnPropDescs$3 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$3 = Object.getOwnPropertySymbols;
  var __hasOwnProp$3 = Object.prototype.hasOwnProperty;
  var __propIsEnum$3 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$3 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$3.call(b, prop))
        __defNormalProp$3(a, prop, b[prop]);
    if (__getOwnPropSymbols$3)
      for (var prop of __getOwnPropSymbols$3(b)) {
        if (__propIsEnum$3.call(b, prop))
          __defNormalProp$3(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$3 = (a, b) => __defProps$3(a, __getOwnPropDescs$3(b));
  var __objRest$2 = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp$3.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols$3)
      for (var prop of __getOwnPropSymbols$3(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum$3.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  function watchIgnorable(source, cb, options = {}) {
    const _a = options, {
      eventFilter = bypassFilter
    } = _a, watchOptions = __objRest$2(_a, [
      "eventFilter"
    ]);
    const filteredCb = createFilterWrapper(eventFilter, cb);
    let ignoreUpdates;
    let ignorePrevAsyncUpdates;
    let stop;
    if (watchOptions.flush === "sync") {
      const ignore = vueDemi.ref(false);
      ignorePrevAsyncUpdates = () => {
      };
      ignoreUpdates = (updater) => {
        ignore.value = true;
        updater();
        ignore.value = false;
      };
      stop = vueDemi.watch(source, (...args) => {
        if (!ignore.value)
          filteredCb(...args);
      }, watchOptions);
    } else {
      const disposables = [];
      const ignoreCounter = vueDemi.ref(0);
      const syncCounter = vueDemi.ref(0);
      ignorePrevAsyncUpdates = () => {
        ignoreCounter.value = syncCounter.value;
      };
      disposables.push(vueDemi.watch(source, () => {
        syncCounter.value++;
      }, __spreadProps$3(__spreadValues$3({}, watchOptions), { flush: "sync" })));
      ignoreUpdates = (updater) => {
        const syncCounterPrev = syncCounter.value;
        updater();
        ignoreCounter.value += syncCounter.value - syncCounterPrev;
      };
      disposables.push(vueDemi.watch(source, (...args) => {
        const ignore = ignoreCounter.value > 0 && ignoreCounter.value === syncCounter.value;
        ignoreCounter.value = 0;
        syncCounter.value = 0;
        if (ignore)
          return;
        filteredCb(...args);
      }, watchOptions));
      stop = () => {
        disposables.forEach((fn) => fn());
      };
    }
    return { stop, ignoreUpdates, ignorePrevAsyncUpdates };
  }

  function watchOnce(source, cb, options) {
    const stop = vueDemi.watch(source, (...args) => {
      vueDemi.nextTick(() => stop());
      return cb(...args);
    }, options);
  }

  var __defProp$2 = Object.defineProperty;
  var __defProps$2 = Object.defineProperties;
  var __getOwnPropDescs$2 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$2 = Object.getOwnPropertySymbols;
  var __hasOwnProp$2 = Object.prototype.hasOwnProperty;
  var __propIsEnum$2 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$2 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$2.call(b, prop))
        __defNormalProp$2(a, prop, b[prop]);
    if (__getOwnPropSymbols$2)
      for (var prop of __getOwnPropSymbols$2(b)) {
        if (__propIsEnum$2.call(b, prop))
          __defNormalProp$2(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$2 = (a, b) => __defProps$2(a, __getOwnPropDescs$2(b));
  var __objRest$1 = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp$2.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols$2)
      for (var prop of __getOwnPropSymbols$2(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum$2.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  function watchPausable(source, cb, options = {}) {
    const _a = options, {
      eventFilter: filter
    } = _a, watchOptions = __objRest$1(_a, [
      "eventFilter"
    ]);
    const { eventFilter, pause, resume, isActive } = pausableFilter(filter);
    const stop = watchWithFilter(source, cb, __spreadProps$2(__spreadValues$2({}, watchOptions), {
      eventFilter
    }));
    return { stop, pause, resume, isActive };
  }

  var __defProp$1 = Object.defineProperty;
  var __defProps$1 = Object.defineProperties;
  var __getOwnPropDescs$1 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$1 = Object.getOwnPropertySymbols;
  var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
  var __propIsEnum$1 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$1 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$1.call(b, prop))
        __defNormalProp$1(a, prop, b[prop]);
    if (__getOwnPropSymbols$1)
      for (var prop of __getOwnPropSymbols$1(b)) {
        if (__propIsEnum$1.call(b, prop))
          __defNormalProp$1(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$1 = (a, b) => __defProps$1(a, __getOwnPropDescs$1(b));
  var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp$1.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols$1)
      for (var prop of __getOwnPropSymbols$1(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum$1.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  function watchThrottled(source, cb, options = {}) {
    const _a = options, {
      throttle = 0,
      trailing = true,
      leading = true
    } = _a, watchOptions = __objRest(_a, [
      "throttle",
      "trailing",
      "leading"
    ]);
    return watchWithFilter(source, cb, __spreadProps$1(__spreadValues$1({}, watchOptions), {
      eventFilter: throttleFilter(throttle, trailing, leading)
    }));
  }

  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
    return __spreadProps(__spreadValues({}, res), {
      trigger
    });
  }
  function getWatchSources(sources) {
    if (vueDemi.isReactive(sources))
      return sources;
    if (Array.isArray(sources))
      return sources.map((item) => getOneWatchSource(item));
    return getOneWatchSource(sources);
  }
  function getOneWatchSource(source) {
    return typeof source === "function" ? source() : vueDemi.unref(source);
  }
  function getOldValue(source) {
    return Array.isArray(source) ? source.map(() => void 0) : void 0;
  }

  function whenever(source, cb, options) {
    return vueDemi.watch(source, (v, ov, onInvalidate) => {
      if (v)
        cb(v, ov, onInvalidate);
    }, options);
  }

  exports.__onlyVue27Plus = __onlyVue27Plus;
  exports.__onlyVue3 = __onlyVue3;
  exports.assert = assert;
  exports.autoResetRef = refAutoReset;
  exports.bypassFilter = bypassFilter;
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
  exports.createSharedComposable = createSharedComposable;
  exports.createSingletonPromise = createSingletonPromise;
  exports.debounceFilter = debounceFilter;
  exports.debouncedRef = refDebounced;
  exports.debouncedWatch = watchDebounced;
  exports.directiveHooks = directiveHooks;
  exports.eagerComputed = computedEager;
  exports.extendRef = extendRef;
  exports.formatDate = formatDate;
  exports.get = get;
  exports.hasOwn = hasOwn;
  exports.identity = identity;
  exports.ignorableWatch = watchIgnorable;
  exports.increaseWithUnit = increaseWithUnit;
  exports.invoke = invoke;
  exports.isBoolean = isBoolean;
  exports.isClient = isClient;
  exports.isDef = isDef;
  exports.isDefined = isDefined;
  exports.isFunction = isFunction;
  exports.isIOS = isIOS;
  exports.isNumber = isNumber;
  exports.isObject = isObject;
  exports.isString = isString;
  exports.isWindow = isWindow;
  exports.makeDestructurable = makeDestructurable;
  exports.noop = noop;
  exports.normalizeDate = normalizeDate;
  exports.now = now;
  exports.objectPick = objectPick;
  exports.pausableFilter = pausableFilter;
  exports.pausableWatch = watchPausable;
  exports.promiseTimeout = promiseTimeout;
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
  exports.toReactive = toReactive;
  exports.toRefs = toRefs;
  exports.tryOnBeforeMount = tryOnBeforeMount;
  exports.tryOnBeforeUnmount = tryOnBeforeUnmount;
  exports.tryOnMounted = tryOnMounted;
  exports.tryOnScopeDispose = tryOnScopeDispose;
  exports.tryOnUnmounted = tryOnUnmounted;
  exports.until = until;
  exports.useArrayEvery = useArrayEvery;
  exports.useArrayFilter = useArrayFilter;
  exports.useArrayFind = useArrayFind;
  exports.useArrayFindIndex = useArrayFindIndex;
  exports.useArrayFindLast = useArrayFindLast;
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
  exports.watchIgnorable = watchIgnorable;
  exports.watchOnce = watchOnce;
  exports.watchPausable = watchPausable;
  exports.watchThrottled = watchThrottled;
  exports.watchTriggerable = watchTriggerable;
  exports.watchWithFilter = watchWithFilter;
  exports.whenever = whenever;

})(this.VueUse = this.VueUse || {}, VueDemi);
