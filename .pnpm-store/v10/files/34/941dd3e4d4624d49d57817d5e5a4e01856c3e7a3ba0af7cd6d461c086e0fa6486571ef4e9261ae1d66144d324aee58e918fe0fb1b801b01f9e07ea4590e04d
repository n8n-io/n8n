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
;(function (exports, shared, vueDemi) {
  'use strict';

  function computedAsync(evaluationCallback, initialState, optionsOrRef) {
    let options;
    if (vueDemi.isRef(optionsOrRef)) {
      options = {
        evaluating: optionsOrRef
      };
    } else {
      options = optionsOrRef || {};
    }
    const {
      lazy = false,
      evaluating = void 0,
      shallow = false,
      onError = shared.noop
    } = options;
    const started = vueDemi.ref(!lazy);
    const current = shallow ? vueDemi.shallowRef(initialState) : vueDemi.ref(initialState);
    let counter = 0;
    vueDemi.watchEffect(async (onInvalidate) => {
      if (!started.value)
        return;
      counter++;
      const counterAtBeginning = counter;
      let hasFinished = false;
      if (evaluating) {
        Promise.resolve().then(() => {
          evaluating.value = true;
        });
      }
      try {
        const result = await evaluationCallback((cancelCallback) => {
          onInvalidate(() => {
            if (evaluating)
              evaluating.value = false;
            if (!hasFinished)
              cancelCallback();
          });
        });
        if (counterAtBeginning === counter)
          current.value = result;
      } catch (e) {
        onError(e);
      } finally {
        if (evaluating && counterAtBeginning === counter)
          evaluating.value = false;
        hasFinished = true;
      }
    });
    if (lazy) {
      return vueDemi.computed(() => {
        started.value = true;
        return current.value;
      });
    } else {
      return current;
    }
  }

  function computedInject(key, options, defaultSource, treatDefaultAsFactory) {
    let source = vueDemi.inject(key);
    if (defaultSource)
      source = vueDemi.inject(key, defaultSource);
    if (treatDefaultAsFactory)
      source = vueDemi.inject(key, defaultSource, treatDefaultAsFactory);
    if (typeof options === "function") {
      return vueDemi.computed((ctx) => options(source, ctx));
    } else {
      return vueDemi.computed({
        get: (ctx) => options.get(source, ctx),
        set: options.set
      });
    }
  }

  const createUnrefFn = (fn) => {
    return function(...args) {
      return fn.apply(this, args.map((i) => vueDemi.unref(i)));
    };
  };

  function unrefElement(elRef) {
    var _a;
    const plain = shared.resolveUnref(elRef);
    return (_a = plain == null ? void 0 : plain.$el) != null ? _a : plain;
  }

  const defaultWindow = shared.isClient ? window : void 0;
  const defaultDocument = shared.isClient ? window.document : void 0;
  const defaultNavigator = shared.isClient ? window.navigator : void 0;
  const defaultLocation = shared.isClient ? window.location : void 0;

  function useEventListener(...args) {
    let target;
    let events;
    let listeners;
    let options;
    if (shared.isString(args[0]) || Array.isArray(args[0])) {
      [events, listeners, options] = args;
      target = defaultWindow;
    } else {
      [target, events, listeners, options] = args;
    }
    if (!target)
      return shared.noop;
    if (!Array.isArray(events))
      events = [events];
    if (!Array.isArray(listeners))
      listeners = [listeners];
    const cleanups = [];
    const cleanup = () => {
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    };
    const register = (el, event, listener, options2) => {
      el.addEventListener(event, listener, options2);
      return () => el.removeEventListener(event, listener, options2);
    };
    const stopWatch = vueDemi.watch(() => [unrefElement(target), shared.resolveUnref(options)], ([el, options2]) => {
      cleanup();
      if (!el)
        return;
      cleanups.push(...events.flatMap((event) => {
        return listeners.map((listener) => register(el, event, listener, options2));
      }));
    }, { immediate: true, flush: "post" });
    const stop = () => {
      stopWatch();
      cleanup();
    };
    shared.tryOnScopeDispose(stop);
    return stop;
  }

  let _iOSWorkaround = false;
  function onClickOutside(target, handler, options = {}) {
    const { window = defaultWindow, ignore = [], capture = true, detectIframe = false } = options;
    if (!window)
      return;
    if (shared.isIOS && !_iOSWorkaround) {
      _iOSWorkaround = true;
      Array.from(window.document.body.children).forEach((el) => el.addEventListener("click", shared.noop));
    }
    let shouldListen = true;
    const shouldIgnore = (event) => {
      return ignore.some((target2) => {
        if (typeof target2 === "string") {
          return Array.from(window.document.querySelectorAll(target2)).some((el) => el === event.target || event.composedPath().includes(el));
        } else {
          const el = unrefElement(target2);
          return el && (event.target === el || event.composedPath().includes(el));
        }
      });
    };
    const listener = (event) => {
      const el = unrefElement(target);
      if (!el || el === event.target || event.composedPath().includes(el))
        return;
      if (event.detail === 0)
        shouldListen = !shouldIgnore(event);
      if (!shouldListen) {
        shouldListen = true;
        return;
      }
      handler(event);
    };
    const cleanup = [
      useEventListener(window, "click", listener, { passive: true, capture }),
      useEventListener(window, "pointerdown", (e) => {
        const el = unrefElement(target);
        if (el)
          shouldListen = !e.composedPath().includes(el) && !shouldIgnore(e);
      }, { passive: true }),
      detectIframe && useEventListener(window, "blur", (event) => {
        var _a;
        const el = unrefElement(target);
        if (((_a = window.document.activeElement) == null ? void 0 : _a.tagName) === "IFRAME" && !(el == null ? void 0 : el.contains(window.document.activeElement)))
          handler(event);
      })
    ].filter(Boolean);
    const stop = () => cleanup.forEach((fn) => fn());
    return stop;
  }

  var __defProp$n = Object.defineProperty;
  var __defProps$9 = Object.defineProperties;
  var __getOwnPropDescs$9 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$p = Object.getOwnPropertySymbols;
  var __hasOwnProp$p = Object.prototype.hasOwnProperty;
  var __propIsEnum$p = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$n = (obj, key, value) => key in obj ? __defProp$n(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$n = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$p.call(b, prop))
        __defNormalProp$n(a, prop, b[prop]);
    if (__getOwnPropSymbols$p)
      for (var prop of __getOwnPropSymbols$p(b)) {
        if (__propIsEnum$p.call(b, prop))
          __defNormalProp$n(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$9 = (a, b) => __defProps$9(a, __getOwnPropDescs$9(b));
  const createKeyPredicate = (keyFilter) => {
    if (typeof keyFilter === "function")
      return keyFilter;
    else if (typeof keyFilter === "string")
      return (event) => event.key === keyFilter;
    else if (Array.isArray(keyFilter))
      return (event) => keyFilter.includes(event.key);
    return () => true;
  };
  function onKeyStroke(...args) {
    let key;
    let handler;
    let options = {};
    if (args.length === 3) {
      key = args[0];
      handler = args[1];
      options = args[2];
    } else if (args.length === 2) {
      if (typeof args[1] === "object") {
        key = true;
        handler = args[0];
        options = args[1];
      } else {
        key = args[0];
        handler = args[1];
      }
    } else {
      key = true;
      handler = args[0];
    }
    const { target = defaultWindow, eventName = "keydown", passive = false } = options;
    const predicate = createKeyPredicate(key);
    const listener = (e) => {
      if (predicate(e))
        handler(e);
    };
    return useEventListener(target, eventName, listener, passive);
  }
  function onKeyDown(key, handler, options = {}) {
    return onKeyStroke(key, handler, __spreadProps$9(__spreadValues$n({}, options), { eventName: "keydown" }));
  }
  function onKeyPressed(key, handler, options = {}) {
    return onKeyStroke(key, handler, __spreadProps$9(__spreadValues$n({}, options), { eventName: "keypress" }));
  }
  function onKeyUp(key, handler, options = {}) {
    return onKeyStroke(key, handler, __spreadProps$9(__spreadValues$n({}, options), { eventName: "keyup" }));
  }

  const DEFAULT_DELAY = 500;
  function onLongPress(target, handler, options) {
    var _a, _b;
    const elementRef = vueDemi.computed(() => unrefElement(target));
    let timeout;
    function clear() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = void 0;
      }
    }
    function onDown(ev) {
      var _a2, _b2, _c, _d;
      if (((_a2 = options == null ? void 0 : options.modifiers) == null ? void 0 : _a2.self) && ev.target !== elementRef.value)
        return;
      clear();
      if ((_b2 = options == null ? void 0 : options.modifiers) == null ? void 0 : _b2.prevent)
        ev.preventDefault();
      if ((_c = options == null ? void 0 : options.modifiers) == null ? void 0 : _c.stop)
        ev.stopPropagation();
      timeout = setTimeout(() => handler(ev), (_d = options == null ? void 0 : options.delay) != null ? _d : DEFAULT_DELAY);
    }
    const listenerOptions = {
      capture: (_a = options == null ? void 0 : options.modifiers) == null ? void 0 : _a.capture,
      once: (_b = options == null ? void 0 : options.modifiers) == null ? void 0 : _b.once
    };
    useEventListener(elementRef, "pointerdown", onDown, listenerOptions);
    useEventListener(elementRef, "pointerup", clear, listenerOptions);
    useEventListener(elementRef, "pointerleave", clear, listenerOptions);
  }

  const isFocusedElementEditable = () => {
    const { activeElement, body } = document;
    if (!activeElement)
      return false;
    if (activeElement === body)
      return false;
    switch (activeElement.tagName) {
      case "INPUT":
      case "TEXTAREA":
        return true;
    }
    return activeElement.hasAttribute("contenteditable");
  };
  const isTypedCharValid = ({
    keyCode,
    metaKey,
    ctrlKey,
    altKey
  }) => {
    if (metaKey || ctrlKey || altKey)
      return false;
    if (keyCode >= 48 && keyCode <= 57 || keyCode >= 96 && keyCode <= 105)
      return true;
    if (keyCode >= 65 && keyCode <= 90)
      return true;
    return false;
  };
  function onStartTyping(callback, options = {}) {
    const { document: document2 = defaultDocument } = options;
    const keydown = (event) => {
      !isFocusedElementEditable() && isTypedCharValid(event) && callback(event);
    };
    if (document2)
      useEventListener(document2, "keydown", keydown, { passive: true });
  }

  function templateRef(key, initialValue = null) {
    const instance = vueDemi.getCurrentInstance();
    let _trigger = () => {
    };
    const element = vueDemi.customRef((track, trigger) => {
      _trigger = trigger;
      return {
        get() {
          var _a, _b;
          track();
          return (_b = (_a = instance == null ? void 0 : instance.proxy) == null ? void 0 : _a.$refs[key]) != null ? _b : initialValue;
        },
        set() {
        }
      };
    });
    shared.tryOnMounted(_trigger);
    vueDemi.onUpdated(_trigger);
    return element;
  }

  function useActiveElement(options = {}) {
    var _a;
    const { window = defaultWindow } = options;
    const document = (_a = options.document) != null ? _a : window == null ? void 0 : window.document;
    const activeElement = shared.computedWithControl(() => null, () => document == null ? void 0 : document.activeElement);
    if (window) {
      useEventListener(window, "blur", (event) => {
        if (event.relatedTarget !== null)
          return;
        activeElement.trigger();
      }, true);
      useEventListener(window, "focus", activeElement.trigger, true);
    }
    return activeElement;
  }

  function useAsyncQueue(tasks, options = {}) {
    const {
      interrupt = true,
      onError = shared.noop,
      onFinished = shared.noop
    } = options;
    const promiseState = {
      pending: "pending",
      rejected: "rejected",
      fulfilled: "fulfilled"
    };
    const initialResult = Array.from(new Array(tasks.length), () => ({ state: promiseState.pending, data: null }));
    const result = vueDemi.reactive(initialResult);
    const activeIndex = vueDemi.ref(-1);
    if (!tasks || tasks.length === 0) {
      onFinished();
      return {
        activeIndex,
        result
      };
    }
    function updateResult(state, res) {
      activeIndex.value++;
      result[activeIndex.value].data = res;
      result[activeIndex.value].state = state;
    }
    tasks.reduce((prev, curr) => {
      return prev.then((prevRes) => {
        var _a;
        if (((_a = result[activeIndex.value]) == null ? void 0 : _a.state) === promiseState.rejected && interrupt) {
          onFinished();
          return;
        }
        return curr(prevRes).then((currentRes) => {
          updateResult(promiseState.fulfilled, currentRes);
          activeIndex.value === tasks.length - 1 && onFinished();
          return currentRes;
        });
      }).catch((e) => {
        updateResult(promiseState.rejected, e);
        onError();
        return e;
      });
    }, Promise.resolve());
    return {
      activeIndex,
      result
    };
  }

  function useAsyncState(promise, initialState, options) {
    const {
      immediate = true,
      delay = 0,
      onError = shared.noop,
      onSuccess = shared.noop,
      resetOnExecute = true,
      shallow = true,
      throwError
    } = options != null ? options : {};
    const state = shallow ? vueDemi.shallowRef(initialState) : vueDemi.ref(initialState);
    const isReady = vueDemi.ref(false);
    const isLoading = vueDemi.ref(false);
    const error = vueDemi.ref(void 0);
    async function execute(delay2 = 0, ...args) {
      if (resetOnExecute)
        state.value = initialState;
      error.value = void 0;
      isReady.value = false;
      isLoading.value = true;
      if (delay2 > 0)
        await shared.promiseTimeout(delay2);
      const _promise = typeof promise === "function" ? promise(...args) : promise;
      try {
        const data = await _promise;
        state.value = data;
        isReady.value = true;
        onSuccess(data);
      } catch (e) {
        error.value = e;
        onError(e);
        if (throwError)
          throw error;
      } finally {
        isLoading.value = false;
      }
      return state.value;
    }
    if (immediate)
      execute(delay);
    return {
      state,
      isReady,
      isLoading,
      error,
      execute
    };
  }

  const defaults = {
    array: (v) => JSON.stringify(v),
    object: (v) => JSON.stringify(v),
    set: (v) => JSON.stringify(Array.from(v)),
    map: (v) => JSON.stringify(Object.fromEntries(v)),
    null: () => ""
  };
  function getDefaultSerialization(target) {
    if (!target)
      return defaults.null;
    if (target instanceof Map)
      return defaults.map;
    else if (target instanceof Set)
      return defaults.set;
    else if (Array.isArray(target))
      return defaults.array;
    else
      return defaults.object;
  }

  function useBase64(target, options) {
    const base64 = vueDemi.ref("");
    const promise = vueDemi.ref();
    function execute() {
      if (!shared.isClient)
        return;
      promise.value = new Promise((resolve, reject) => {
        try {
          const _target = shared.resolveUnref(target);
          if (_target == null) {
            resolve("");
          } else if (typeof _target === "string") {
            resolve(blobToBase64(new Blob([_target], { type: "text/plain" })));
          } else if (_target instanceof Blob) {
            resolve(blobToBase64(_target));
          } else if (_target instanceof ArrayBuffer) {
            resolve(window.btoa(String.fromCharCode(...new Uint8Array(_target))));
          } else if (_target instanceof HTMLCanvasElement) {
            resolve(_target.toDataURL(options == null ? void 0 : options.type, options == null ? void 0 : options.quality));
          } else if (_target instanceof HTMLImageElement) {
            const img = _target.cloneNode(false);
            img.crossOrigin = "Anonymous";
            imgLoaded(img).then(() => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL(options == null ? void 0 : options.type, options == null ? void 0 : options.quality));
            }).catch(reject);
          } else if (typeof _target === "object") {
            const _serializeFn = (options == null ? void 0 : options.serializer) || getDefaultSerialization(_target);
            const serialized = _serializeFn(_target);
            return resolve(blobToBase64(new Blob([serialized], { type: "application/json" })));
          } else {
            reject(new Error("target is unsupported types"));
          }
        } catch (error) {
          reject(error);
        }
      });
      promise.value.then((res) => base64.value = res);
      return promise.value;
    }
    if (vueDemi.isRef(target) || shared.isFunction(target))
      vueDemi.watch(target, execute, { immediate: true });
    else
      execute();
    return {
      base64,
      promise,
      execute
    };
  }
  function imgLoaded(img) {
    return new Promise((resolve, reject) => {
      if (!img.complete) {
        img.onload = () => {
          resolve();
        };
        img.onerror = reject;
      } else {
        resolve();
      }
    });
  }
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = (e) => {
        resolve(e.target.result);
      };
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  function useSupported(callback, sync = false) {
    const isSupported = vueDemi.ref();
    const update = () => isSupported.value = Boolean(callback());
    update();
    shared.tryOnMounted(update, sync);
    return isSupported;
  }

  function useBattery({ navigator = defaultNavigator } = {}) {
    const events = ["chargingchange", "chargingtimechange", "dischargingtimechange", "levelchange"];
    const isSupported = useSupported(() => navigator && "getBattery" in navigator);
    const charging = vueDemi.ref(false);
    const chargingTime = vueDemi.ref(0);
    const dischargingTime = vueDemi.ref(0);
    const level = vueDemi.ref(1);
    let battery;
    function updateBatteryInfo() {
      charging.value = this.charging;
      chargingTime.value = this.chargingTime || 0;
      dischargingTime.value = this.dischargingTime || 0;
      level.value = this.level;
    }
    if (isSupported.value) {
      navigator.getBattery().then((_battery) => {
        battery = _battery;
        updateBatteryInfo.call(battery);
        for (const event of events)
          useEventListener(battery, event, updateBatteryInfo, { passive: true });
      });
    }
    return {
      isSupported,
      charging,
      chargingTime,
      dischargingTime,
      level
    };
  }

  function useBluetooth(options) {
    let {
      acceptAllDevices = false
    } = options || {};
    const {
      filters = void 0,
      optionalServices = void 0,
      navigator = defaultNavigator
    } = options || {};
    const isSupported = useSupported(() => navigator && "bluetooth" in navigator);
    const device = vueDemi.shallowRef(void 0);
    const error = vueDemi.shallowRef(null);
    vueDemi.watch(device, () => {
      connectToBluetoothGATTServer();
    });
    async function requestDevice() {
      if (!isSupported.value)
        return;
      error.value = null;
      if (filters && filters.length > 0)
        acceptAllDevices = false;
      try {
        device.value = await (navigator == null ? void 0 : navigator.bluetooth.requestDevice({
          acceptAllDevices,
          filters,
          optionalServices
        }));
      } catch (err) {
        error.value = err;
      }
    }
    const server = vueDemi.ref();
    const isConnected = vueDemi.computed(() => {
      var _a;
      return ((_a = server.value) == null ? void 0 : _a.connected) || false;
    });
    async function connectToBluetoothGATTServer() {
      error.value = null;
      if (device.value && device.value.gatt) {
        device.value.addEventListener("gattserverdisconnected", () => {
        });
        try {
          server.value = await device.value.gatt.connect();
        } catch (err) {
          error.value = err;
        }
      }
    }
    shared.tryOnMounted(() => {
      var _a;
      if (device.value)
        (_a = device.value.gatt) == null ? void 0 : _a.connect();
    });
    shared.tryOnScopeDispose(() => {
      var _a;
      if (device.value)
        (_a = device.value.gatt) == null ? void 0 : _a.disconnect();
    });
    return {
      isSupported,
      isConnected,
      device,
      requestDevice,
      server,
      error
    };
  }

  function useMediaQuery(query, options = {}) {
    const { window = defaultWindow } = options;
    const isSupported = useSupported(() => window && "matchMedia" in window && typeof window.matchMedia === "function");
    let mediaQuery;
    const matches = vueDemi.ref(false);
    const cleanup = () => {
      if (!mediaQuery)
        return;
      if ("removeEventListener" in mediaQuery)
        mediaQuery.removeEventListener("change", update);
      else
        mediaQuery.removeListener(update);
    };
    const update = () => {
      if (!isSupported.value)
        return;
      cleanup();
      mediaQuery = window.matchMedia(shared.resolveRef(query).value);
      matches.value = mediaQuery.matches;
      if ("addEventListener" in mediaQuery)
        mediaQuery.addEventListener("change", update);
      else
        mediaQuery.addListener(update);
    };
    vueDemi.watchEffect(update);
    shared.tryOnScopeDispose(() => cleanup());
    return matches;
  }

  const breakpointsTailwind = {
    "sm": 640,
    "md": 768,
    "lg": 1024,
    "xl": 1280,
    "2xl": 1536
  };
  const breakpointsBootstrapV5 = {
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
  };
  const breakpointsVuetify = {
    xs: 600,
    sm: 960,
    md: 1264,
    lg: 1904
  };
  const breakpointsAntDesign = {
    xs: 480,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1600
  };
  const breakpointsQuasar = {
    xs: 600,
    sm: 1024,
    md: 1440,
    lg: 1920
  };
  const breakpointsSematic = {
    mobileS: 320,
    mobileM: 375,
    mobileL: 425,
    tablet: 768,
    laptop: 1024,
    laptopL: 1440,
    desktop4K: 2560
  };
  const breakpointsMasterCss = {
    "3xs": 360,
    "2xs": 480,
    "xs": 600,
    "sm": 768,
    "md": 1024,
    "lg": 1280,
    "xl": 1440,
    "2xl": 1600,
    "3xl": 1920,
    "4xl": 2560
  };

  var __defProp$m = Object.defineProperty;
  var __getOwnPropSymbols$o = Object.getOwnPropertySymbols;
  var __hasOwnProp$o = Object.prototype.hasOwnProperty;
  var __propIsEnum$o = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$m = (obj, key, value) => key in obj ? __defProp$m(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$m = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$o.call(b, prop))
        __defNormalProp$m(a, prop, b[prop]);
    if (__getOwnPropSymbols$o)
      for (var prop of __getOwnPropSymbols$o(b)) {
        if (__propIsEnum$o.call(b, prop))
          __defNormalProp$m(a, prop, b[prop]);
      }
    return a;
  };
  function useBreakpoints(breakpoints, options = {}) {
    function getValue(k, delta) {
      let v = breakpoints[k];
      if (delta != null)
        v = shared.increaseWithUnit(v, delta);
      if (typeof v === "number")
        v = `${v}px`;
      return v;
    }
    const { window = defaultWindow } = options;
    function match(query) {
      if (!window)
        return false;
      return window.matchMedia(query).matches;
    }
    const greaterOrEqual = (k) => {
      return useMediaQuery(`(min-width: ${getValue(k)})`, options);
    };
    const shortcutMethods = Object.keys(breakpoints).reduce((shortcuts, k) => {
      Object.defineProperty(shortcuts, k, {
        get: () => greaterOrEqual(k),
        enumerable: true,
        configurable: true
      });
      return shortcuts;
    }, {});
    return __spreadValues$m({
      greater(k) {
        return useMediaQuery(`(min-width: ${getValue(k, 0.1)})`, options);
      },
      greaterOrEqual,
      smaller(k) {
        return useMediaQuery(`(max-width: ${getValue(k, -0.1)})`, options);
      },
      smallerOrEqual(k) {
        return useMediaQuery(`(max-width: ${getValue(k)})`, options);
      },
      between(a, b) {
        return useMediaQuery(`(min-width: ${getValue(a)}) and (max-width: ${getValue(b, -0.1)})`, options);
      },
      isGreater(k) {
        return match(`(min-width: ${getValue(k, 0.1)})`);
      },
      isGreaterOrEqual(k) {
        return match(`(min-width: ${getValue(k)})`);
      },
      isSmaller(k) {
        return match(`(max-width: ${getValue(k, -0.1)})`);
      },
      isSmallerOrEqual(k) {
        return match(`(max-width: ${getValue(k)})`);
      },
      isInBetween(a, b) {
        return match(`(min-width: ${getValue(a)}) and (max-width: ${getValue(b, -0.1)})`);
      }
    }, shortcutMethods);
  }

  const useBroadcastChannel = (options) => {
    const {
      name,
      window = defaultWindow
    } = options;
    const isSupported = useSupported(() => window && "BroadcastChannel" in window);
    const isClosed = vueDemi.ref(false);
    const channel = vueDemi.ref();
    const data = vueDemi.ref();
    const error = vueDemi.ref(null);
    const post = (data2) => {
      if (channel.value)
        channel.value.postMessage(data2);
    };
    const close = () => {
      if (channel.value)
        channel.value.close();
      isClosed.value = true;
    };
    if (isSupported.value) {
      shared.tryOnMounted(() => {
        error.value = null;
        channel.value = new BroadcastChannel(name);
        channel.value.addEventListener("message", (e) => {
          data.value = e.data;
        }, { passive: true });
        channel.value.addEventListener("messageerror", (e) => {
          error.value = e;
        }, { passive: true });
        channel.value.addEventListener("close", () => {
          isClosed.value = true;
        });
      });
    }
    shared.tryOnScopeDispose(() => {
      close();
    });
    return {
      isSupported,
      channel,
      data,
      post,
      close,
      error,
      isClosed
    };
  };

  function useBrowserLocation({ window = defaultWindow } = {}) {
    const buildState = (trigger) => {
      const { state: state2, length } = (window == null ? void 0 : window.history) || {};
      const { hash, host, hostname, href, origin, pathname, port, protocol, search } = (window == null ? void 0 : window.location) || {};
      return {
        trigger,
        state: state2,
        length,
        hash,
        host,
        hostname,
        href,
        origin,
        pathname,
        port,
        protocol,
        search
      };
    };
    const state = vueDemi.ref(buildState("load"));
    if (window) {
      useEventListener(window, "popstate", () => state.value = buildState("popstate"), { passive: true });
      useEventListener(window, "hashchange", () => state.value = buildState("hashchange"), { passive: true });
    }
    return state;
  }

  function useCached(refValue, comparator = (a, b) => a === b, watchOptions) {
    const cachedValue = vueDemi.ref(refValue.value);
    vueDemi.watch(() => refValue.value, (value) => {
      if (!comparator(value, cachedValue.value))
        cachedValue.value = value;
    }, watchOptions);
    return cachedValue;
  }

  function useClipboard(options = {}) {
    const {
      navigator = defaultNavigator,
      read = false,
      source,
      copiedDuring = 1500,
      legacy = false
    } = options;
    const events = ["copy", "cut"];
    const isClipboardApiSupported = useSupported(() => navigator && "clipboard" in navigator);
    const isSupported = vueDemi.computed(() => isClipboardApiSupported.value || legacy);
    const text = vueDemi.ref("");
    const copied = vueDemi.ref(false);
    const timeout = shared.useTimeoutFn(() => copied.value = false, copiedDuring);
    function updateText() {
      if (isClipboardApiSupported.value) {
        navigator.clipboard.readText().then((value) => {
          text.value = value;
        });
      } else {
        text.value = legacyRead();
      }
    }
    if (isSupported.value && read) {
      for (const event of events)
        useEventListener(event, updateText);
    }
    async function copy(value = shared.resolveUnref(source)) {
      if (isSupported.value && value != null) {
        if (isClipboardApiSupported.value)
          await navigator.clipboard.writeText(value);
        else
          legacyCopy(value);
        text.value = value;
        copied.value = true;
        timeout.start();
      }
    }
    function legacyCopy(value) {
      const ta = document.createElement("textarea");
      ta.value = value != null ? value : "";
      ta.style.position = "absolute";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    function legacyRead() {
      var _a, _b, _c;
      return (_c = (_b = (_a = document == null ? void 0 : document.getSelection) == null ? void 0 : _a.call(document)) == null ? void 0 : _b.toString()) != null ? _c : "";
    }
    return {
      isSupported,
      text,
      copied,
      copy
    };
  }

  var __defProp$l = Object.defineProperty;
  var __defProps$8 = Object.defineProperties;
  var __getOwnPropDescs$8 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$n = Object.getOwnPropertySymbols;
  var __hasOwnProp$n = Object.prototype.hasOwnProperty;
  var __propIsEnum$n = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$l = (obj, key, value) => key in obj ? __defProp$l(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$l = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$n.call(b, prop))
        __defNormalProp$l(a, prop, b[prop]);
    if (__getOwnPropSymbols$n)
      for (var prop of __getOwnPropSymbols$n(b)) {
        if (__propIsEnum$n.call(b, prop))
          __defNormalProp$l(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$8 = (a, b) => __defProps$8(a, __getOwnPropDescs$8(b));
  function cloneFnJSON(source) {
    return JSON.parse(JSON.stringify(source));
  }
  function useCloned(source, options = {}) {
    const cloned = vueDemi.ref({});
    const {
      manual,
      clone = cloneFnJSON,
      deep = true,
      immediate = true
    } = options;
    function sync() {
      cloned.value = clone(vueDemi.unref(source));
    }
    if (!manual && vueDemi.isRef(source)) {
      vueDemi.watch(source, sync, __spreadProps$8(__spreadValues$l({}, options), {
        deep,
        immediate
      }));
    } else {
      sync();
    }
    return { cloned, sync };
  }

  const _global = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  const globalKey = "__vueuse_ssr_handlers__";
  _global[globalKey] = _global[globalKey] || {};
  const handlers = _global[globalKey];
  function getSSRHandler(key, fallback) {
    return handlers[key] || fallback;
  }
  function setSSRHandler(key, fn) {
    handlers[key] = fn;
  }

  function guessSerializerType(rawInit) {
    return rawInit == null ? "any" : rawInit instanceof Set ? "set" : rawInit instanceof Map ? "map" : rawInit instanceof Date ? "date" : typeof rawInit === "boolean" ? "boolean" : typeof rawInit === "string" ? "string" : typeof rawInit === "object" ? "object" : !Number.isNaN(rawInit) ? "number" : "any";
  }

  var __defProp$k = Object.defineProperty;
  var __getOwnPropSymbols$m = Object.getOwnPropertySymbols;
  var __hasOwnProp$m = Object.prototype.hasOwnProperty;
  var __propIsEnum$m = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$k = (obj, key, value) => key in obj ? __defProp$k(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$k = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$m.call(b, prop))
        __defNormalProp$k(a, prop, b[prop]);
    if (__getOwnPropSymbols$m)
      for (var prop of __getOwnPropSymbols$m(b)) {
        if (__propIsEnum$m.call(b, prop))
          __defNormalProp$k(a, prop, b[prop]);
      }
    return a;
  };
  const StorageSerializers = {
    boolean: {
      read: (v) => v === "true",
      write: (v) => String(v)
    },
    object: {
      read: (v) => JSON.parse(v),
      write: (v) => JSON.stringify(v)
    },
    number: {
      read: (v) => Number.parseFloat(v),
      write: (v) => String(v)
    },
    any: {
      read: (v) => v,
      write: (v) => String(v)
    },
    string: {
      read: (v) => v,
      write: (v) => String(v)
    },
    map: {
      read: (v) => new Map(JSON.parse(v)),
      write: (v) => JSON.stringify(Array.from(v.entries()))
    },
    set: {
      read: (v) => new Set(JSON.parse(v)),
      write: (v) => JSON.stringify(Array.from(v))
    },
    date: {
      read: (v) => new Date(v),
      write: (v) => v.toISOString()
    }
  };
  const customStorageEventName = "vueuse-storage";
  function useStorage(key, defaults, storage, options = {}) {
    var _a;
    const {
      flush = "pre",
      deep = true,
      listenToStorageChanges = true,
      writeDefaults = true,
      mergeDefaults = false,
      shallow,
      window = defaultWindow,
      eventFilter,
      onError = (e) => {
        console.error(e);
      }
    } = options;
    const data = (shallow ? vueDemi.shallowRef : vueDemi.ref)(defaults);
    if (!storage) {
      try {
        storage = getSSRHandler("getDefaultStorage", () => {
          var _a2;
          return (_a2 = defaultWindow) == null ? void 0 : _a2.localStorage;
        })();
      } catch (e) {
        onError(e);
      }
    }
    if (!storage)
      return data;
    const rawInit = shared.resolveUnref(defaults);
    const type = guessSerializerType(rawInit);
    const serializer = (_a = options.serializer) != null ? _a : StorageSerializers[type];
    const { pause: pauseWatch, resume: resumeWatch } = shared.pausableWatch(data, () => write(data.value), { flush, deep, eventFilter });
    if (window && listenToStorageChanges) {
      useEventListener(window, "storage", update);
      useEventListener(window, customStorageEventName, updateFromCustomEvent);
    }
    update();
    return data;
    function write(v) {
      try {
        if (v == null) {
          storage.removeItem(key);
        } else {
          const serialized = serializer.write(v);
          const oldValue = storage.getItem(key);
          if (oldValue !== serialized) {
            storage.setItem(key, serialized);
            if (window) {
              window.dispatchEvent(new CustomEvent(customStorageEventName, {
                detail: {
                  key,
                  oldValue,
                  newValue: serialized,
                  storageArea: storage
                }
              }));
            }
          }
        }
      } catch (e) {
        onError(e);
      }
    }
    function read(event) {
      const rawValue = event ? event.newValue : storage.getItem(key);
      if (rawValue == null) {
        if (writeDefaults && rawInit !== null)
          storage.setItem(key, serializer.write(rawInit));
        return rawInit;
      } else if (!event && mergeDefaults) {
        const value = serializer.read(rawValue);
        if (shared.isFunction(mergeDefaults))
          return mergeDefaults(value, rawInit);
        else if (type === "object" && !Array.isArray(value))
          return __spreadValues$k(__spreadValues$k({}, rawInit), value);
        return value;
      } else if (typeof rawValue !== "string") {
        return rawValue;
      } else {
        return serializer.read(rawValue);
      }
    }
    function updateFromCustomEvent(event) {
      update(event.detail);
    }
    function update(event) {
      if (event && event.storageArea !== storage)
        return;
      if (event && event.key == null) {
        data.value = rawInit;
        return;
      }
      if (event && event.key !== key)
        return;
      pauseWatch();
      try {
        data.value = read(event);
      } catch (e) {
        onError(e);
      } finally {
        if (event)
          vueDemi.nextTick(resumeWatch);
        else
          resumeWatch();
      }
    }
  }

  function usePreferredDark(options) {
    return useMediaQuery("(prefers-color-scheme: dark)", options);
  }

  var __defProp$j = Object.defineProperty;
  var __getOwnPropSymbols$l = Object.getOwnPropertySymbols;
  var __hasOwnProp$l = Object.prototype.hasOwnProperty;
  var __propIsEnum$l = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$j = (obj, key, value) => key in obj ? __defProp$j(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$j = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$l.call(b, prop))
        __defNormalProp$j(a, prop, b[prop]);
    if (__getOwnPropSymbols$l)
      for (var prop of __getOwnPropSymbols$l(b)) {
        if (__propIsEnum$l.call(b, prop))
          __defNormalProp$j(a, prop, b[prop]);
      }
    return a;
  };
  function useColorMode(options = {}) {
    const {
      selector = "html",
      attribute = "class",
      initialValue = "auto",
      window = defaultWindow,
      storage,
      storageKey = "vueuse-color-scheme",
      listenToStorageChanges = true,
      storageRef,
      emitAuto
    } = options;
    const modes = __spreadValues$j({
      auto: "",
      light: "light",
      dark: "dark"
    }, options.modes || {});
    const preferredDark = usePreferredDark({ window });
    const preferredMode = vueDemi.computed(() => preferredDark.value ? "dark" : "light");
    const store = storageRef || (storageKey == null ? vueDemi.ref(initialValue) : useStorage(storageKey, initialValue, storage, { window, listenToStorageChanges }));
    const state = vueDemi.computed({
      get() {
        return store.value === "auto" && !emitAuto ? preferredMode.value : store.value;
      },
      set(v) {
        store.value = v;
      }
    });
    const updateHTMLAttrs = getSSRHandler("updateHTMLAttrs", (selector2, attribute2, value) => {
      const el = window == null ? void 0 : window.document.querySelector(selector2);
      if (!el)
        return;
      if (attribute2 === "class") {
        const current = value.split(/\s/g);
        Object.values(modes).flatMap((i) => (i || "").split(/\s/g)).filter(Boolean).forEach((v) => {
          if (current.includes(v))
            el.classList.add(v);
          else
            el.classList.remove(v);
        });
      } else {
        el.setAttribute(attribute2, value);
      }
    });
    function defaultOnChanged(mode) {
      var _a;
      const resolvedMode = mode === "auto" ? preferredMode.value : mode;
      updateHTMLAttrs(selector, attribute, (_a = modes[resolvedMode]) != null ? _a : resolvedMode);
    }
    function onChanged(mode) {
      if (options.onChanged)
        options.onChanged(mode, defaultOnChanged);
      else
        defaultOnChanged(mode);
    }
    vueDemi.watch(state, onChanged, { flush: "post", immediate: true });
    if (emitAuto)
      vueDemi.watch(preferredMode, () => onChanged(state.value), { flush: "post" });
    shared.tryOnMounted(() => onChanged(state.value));
    return state;
  }

  function useConfirmDialog(revealed = vueDemi.ref(false)) {
    const confirmHook = shared.createEventHook();
    const cancelHook = shared.createEventHook();
    const revealHook = shared.createEventHook();
    let _resolve = shared.noop;
    const reveal = (data) => {
      revealHook.trigger(data);
      revealed.value = true;
      return new Promise((resolve) => {
        _resolve = resolve;
      });
    };
    const confirm = (data) => {
      revealed.value = false;
      confirmHook.trigger(data);
      _resolve({ data, isCanceled: false });
    };
    const cancel = (data) => {
      revealed.value = false;
      cancelHook.trigger(data);
      _resolve({ data, isCanceled: true });
    };
    return {
      isRevealed: vueDemi.computed(() => revealed.value),
      reveal,
      confirm,
      cancel,
      onReveal: revealHook.on,
      onConfirm: confirmHook.on,
      onCancel: cancelHook.on
    };
  }

  function useCssVar(prop, target, { window = defaultWindow, initialValue = "" } = {}) {
    const variable = vueDemi.ref(initialValue);
    const elRef = vueDemi.computed(() => {
      var _a;
      return unrefElement(target) || ((_a = window == null ? void 0 : window.document) == null ? void 0 : _a.documentElement);
    });
    vueDemi.watch([elRef, () => shared.resolveUnref(prop)], ([el, prop2]) => {
      var _a;
      if (el && window) {
        const value = (_a = window.getComputedStyle(el).getPropertyValue(prop2)) == null ? void 0 : _a.trim();
        variable.value = value || initialValue;
      }
    }, { immediate: true });
    vueDemi.watch(variable, (val) => {
      var _a;
      if ((_a = elRef.value) == null ? void 0 : _a.style)
        elRef.value.style.setProperty(shared.resolveUnref(prop), val);
    });
    return variable;
  }

  function useCurrentElement() {
    const vm = vueDemi.getCurrentInstance();
    const currentElement = shared.computedWithControl(() => null, () => vm.proxy.$el);
    vueDemi.onUpdated(currentElement.trigger);
    vueDemi.onMounted(currentElement.trigger);
    return currentElement;
  }

  function useCycleList(list, options) {
    var _a;
    const state = vueDemi.shallowRef((_a = options == null ? void 0 : options.initialValue) != null ? _a : list[0]);
    const index = vueDemi.computed({
      get() {
        var _a2;
        let index2 = (options == null ? void 0 : options.getIndexOf) ? options.getIndexOf(state.value, list) : list.indexOf(state.value);
        if (index2 < 0)
          index2 = (_a2 = options == null ? void 0 : options.fallbackIndex) != null ? _a2 : 0;
        return index2;
      },
      set(v) {
        set(v);
      }
    });
    function set(i) {
      const length = list.length;
      const index2 = (i % length + length) % length;
      const value = list[index2];
      state.value = value;
      return value;
    }
    function shift(delta = 1) {
      return set(index.value + delta);
    }
    function next(n = 1) {
      return shift(n);
    }
    function prev(n = 1) {
      return shift(-n);
    }
    return {
      state,
      index,
      next,
      prev
    };
  }

  var __defProp$i = Object.defineProperty;
  var __defProps$7 = Object.defineProperties;
  var __getOwnPropDescs$7 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$k = Object.getOwnPropertySymbols;
  var __hasOwnProp$k = Object.prototype.hasOwnProperty;
  var __propIsEnum$k = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$i = (obj, key, value) => key in obj ? __defProp$i(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$i = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$k.call(b, prop))
        __defNormalProp$i(a, prop, b[prop]);
    if (__getOwnPropSymbols$k)
      for (var prop of __getOwnPropSymbols$k(b)) {
        if (__propIsEnum$k.call(b, prop))
          __defNormalProp$i(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$7 = (a, b) => __defProps$7(a, __getOwnPropDescs$7(b));
  function useDark(options = {}) {
    const {
      valueDark = "dark",
      valueLight = "",
      window = defaultWindow
    } = options;
    const mode = useColorMode(__spreadProps$7(__spreadValues$i({}, options), {
      onChanged: (mode2, defaultHandler) => {
        var _a;
        if (options.onChanged)
          (_a = options.onChanged) == null ? void 0 : _a.call(options, mode2 === "dark");
        else
          defaultHandler(mode2);
      },
      modes: {
        dark: valueDark,
        light: valueLight
      }
    }));
    const preferredDark = usePreferredDark({ window });
    const isDark = vueDemi.computed({
      get() {
        return mode.value === "dark";
      },
      set(v) {
        if (v === preferredDark.value)
          mode.value = "auto";
        else
          mode.value = v ? "dark" : "light";
      }
    });
    return isDark;
  }

  const fnBypass = (v) => v;
  const fnSetSource = (source, value) => source.value = value;
  function defaultDump(clone) {
    return clone ? shared.isFunction(clone) ? clone : cloneFnJSON : fnBypass;
  }
  function defaultParse(clone) {
    return clone ? shared.isFunction(clone) ? clone : cloneFnJSON : fnBypass;
  }
  function useManualRefHistory(source, options = {}) {
    const {
      clone = false,
      dump = defaultDump(clone),
      parse = defaultParse(clone),
      setSource = fnSetSource
    } = options;
    function _createHistoryRecord() {
      return vueDemi.markRaw({
        snapshot: dump(source.value),
        timestamp: shared.timestamp()
      });
    }
    const last = vueDemi.ref(_createHistoryRecord());
    const undoStack = vueDemi.ref([]);
    const redoStack = vueDemi.ref([]);
    const _setSource = (record) => {
      setSource(source, parse(record.snapshot));
      last.value = record;
    };
    const commit = () => {
      undoStack.value.unshift(last.value);
      last.value = _createHistoryRecord();
      if (options.capacity && undoStack.value.length > options.capacity)
        undoStack.value.splice(options.capacity, Infinity);
      if (redoStack.value.length)
        redoStack.value.splice(0, redoStack.value.length);
    };
    const clear = () => {
      undoStack.value.splice(0, undoStack.value.length);
      redoStack.value.splice(0, redoStack.value.length);
    };
    const undo = () => {
      const state = undoStack.value.shift();
      if (state) {
        redoStack.value.unshift(last.value);
        _setSource(state);
      }
    };
    const redo = () => {
      const state = redoStack.value.shift();
      if (state) {
        undoStack.value.unshift(last.value);
        _setSource(state);
      }
    };
    const reset = () => {
      _setSource(last.value);
    };
    const history = vueDemi.computed(() => [last.value, ...undoStack.value]);
    const canUndo = vueDemi.computed(() => undoStack.value.length > 0);
    const canRedo = vueDemi.computed(() => redoStack.value.length > 0);
    return {
      source,
      undoStack,
      redoStack,
      last,
      history,
      canUndo,
      canRedo,
      clear,
      commit,
      reset,
      undo,
      redo
    };
  }

  var __defProp$h = Object.defineProperty;
  var __defProps$6 = Object.defineProperties;
  var __getOwnPropDescs$6 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$j = Object.getOwnPropertySymbols;
  var __hasOwnProp$j = Object.prototype.hasOwnProperty;
  var __propIsEnum$j = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$h = (obj, key, value) => key in obj ? __defProp$h(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$h = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$j.call(b, prop))
        __defNormalProp$h(a, prop, b[prop]);
    if (__getOwnPropSymbols$j)
      for (var prop of __getOwnPropSymbols$j(b)) {
        if (__propIsEnum$j.call(b, prop))
          __defNormalProp$h(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$6 = (a, b) => __defProps$6(a, __getOwnPropDescs$6(b));
  function useRefHistory(source, options = {}) {
    const {
      deep = false,
      flush = "pre",
      eventFilter
    } = options;
    const {
      eventFilter: composedFilter,
      pause,
      resume: resumeTracking,
      isActive: isTracking
    } = shared.pausableFilter(eventFilter);
    const {
      ignoreUpdates,
      ignorePrevAsyncUpdates,
      stop
    } = shared.watchIgnorable(source, commit, { deep, flush, eventFilter: composedFilter });
    function setSource(source2, value) {
      ignorePrevAsyncUpdates();
      ignoreUpdates(() => {
        source2.value = value;
      });
    }
    const manualHistory = useManualRefHistory(source, __spreadProps$6(__spreadValues$h({}, options), { clone: options.clone || deep, setSource }));
    const { clear, commit: manualCommit } = manualHistory;
    function commit() {
      ignorePrevAsyncUpdates();
      manualCommit();
    }
    function resume(commitNow) {
      resumeTracking();
      if (commitNow)
        commit();
    }
    function batch(fn) {
      let canceled = false;
      const cancel = () => canceled = true;
      ignoreUpdates(() => {
        fn(cancel);
      });
      if (!canceled)
        commit();
    }
    function dispose() {
      stop();
      clear();
    }
    return __spreadProps$6(__spreadValues$h({}, manualHistory), {
      isTracking,
      pause,
      resume,
      commit,
      batch,
      dispose
    });
  }

  var __defProp$g = Object.defineProperty;
  var __defProps$5 = Object.defineProperties;
  var __getOwnPropDescs$5 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$i = Object.getOwnPropertySymbols;
  var __hasOwnProp$i = Object.prototype.hasOwnProperty;
  var __propIsEnum$i = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$g = (obj, key, value) => key in obj ? __defProp$g(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$g = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$i.call(b, prop))
        __defNormalProp$g(a, prop, b[prop]);
    if (__getOwnPropSymbols$i)
      for (var prop of __getOwnPropSymbols$i(b)) {
        if (__propIsEnum$i.call(b, prop))
          __defNormalProp$g(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$5 = (a, b) => __defProps$5(a, __getOwnPropDescs$5(b));
  function useDebouncedRefHistory(source, options = {}) {
    const filter = options.debounce ? shared.debounceFilter(options.debounce) : void 0;
    const history = useRefHistory(source, __spreadProps$5(__spreadValues$g({}, options), { eventFilter: filter }));
    return __spreadValues$g({}, history);
  }

  function useDeviceMotion(options = {}) {
    const {
      window = defaultWindow,
      eventFilter = shared.bypassFilter
    } = options;
    const acceleration = vueDemi.ref({ x: null, y: null, z: null });
    const rotationRate = vueDemi.ref({ alpha: null, beta: null, gamma: null });
    const interval = vueDemi.ref(0);
    const accelerationIncludingGravity = vueDemi.ref({
      x: null,
      y: null,
      z: null
    });
    if (window) {
      const onDeviceMotion = shared.createFilterWrapper(eventFilter, (event) => {
        acceleration.value = event.acceleration;
        accelerationIncludingGravity.value = event.accelerationIncludingGravity;
        rotationRate.value = event.rotationRate;
        interval.value = event.interval;
      });
      useEventListener(window, "devicemotion", onDeviceMotion);
    }
    return {
      acceleration,
      accelerationIncludingGravity,
      rotationRate,
      interval
    };
  }

  function useDeviceOrientation(options = {}) {
    const { window = defaultWindow } = options;
    const isSupported = useSupported(() => window && "DeviceOrientationEvent" in window);
    const isAbsolute = vueDemi.ref(false);
    const alpha = vueDemi.ref(null);
    const beta = vueDemi.ref(null);
    const gamma = vueDemi.ref(null);
    if (window && isSupported.value) {
      useEventListener(window, "deviceorientation", (event) => {
        isAbsolute.value = event.absolute;
        alpha.value = event.alpha;
        beta.value = event.beta;
        gamma.value = event.gamma;
      });
    }
    return {
      isSupported,
      isAbsolute,
      alpha,
      beta,
      gamma
    };
  }

  function useDevicePixelRatio({
    window = defaultWindow
  } = {}) {
    const pixelRatio = vueDemi.ref(1);
    if (window) {
      let observe = function() {
        pixelRatio.value = window.devicePixelRatio;
        cleanup();
        media = window.matchMedia(`(resolution: ${pixelRatio.value}dppx)`);
        media.addEventListener("change", observe, { once: true });
      }, cleanup = function() {
        media == null ? void 0 : media.removeEventListener("change", observe);
      };
      let media;
      observe();
      shared.tryOnScopeDispose(cleanup);
    }
    return { pixelRatio };
  }

  function usePermission(permissionDesc, options = {}) {
    const {
      controls = false,
      navigator = defaultNavigator
    } = options;
    const isSupported = useSupported(() => navigator && "permissions" in navigator);
    let permissionStatus;
    const desc = typeof permissionDesc === "string" ? { name: permissionDesc } : permissionDesc;
    const state = vueDemi.ref();
    const onChange = () => {
      if (permissionStatus)
        state.value = permissionStatus.state;
    };
    const query = shared.createSingletonPromise(async () => {
      if (!isSupported.value)
        return;
      if (!permissionStatus) {
        try {
          permissionStatus = await navigator.permissions.query(desc);
          useEventListener(permissionStatus, "change", onChange);
          onChange();
        } catch (e) {
          state.value = "prompt";
        }
      }
      return permissionStatus;
    });
    query();
    if (controls) {
      return {
        state,
        isSupported,
        query
      };
    } else {
      return state;
    }
  }

  function useDevicesList(options = {}) {
    const {
      navigator = defaultNavigator,
      requestPermissions = false,
      constraints = { audio: true, video: true },
      onUpdated
    } = options;
    const devices = vueDemi.ref([]);
    const videoInputs = vueDemi.computed(() => devices.value.filter((i) => i.kind === "videoinput"));
    const audioInputs = vueDemi.computed(() => devices.value.filter((i) => i.kind === "audioinput"));
    const audioOutputs = vueDemi.computed(() => devices.value.filter((i) => i.kind === "audiooutput"));
    const isSupported = useSupported(() => navigator && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
    const permissionGranted = vueDemi.ref(false);
    async function update() {
      if (!isSupported.value)
        return;
      devices.value = await navigator.mediaDevices.enumerateDevices();
      onUpdated == null ? void 0 : onUpdated(devices.value);
    }
    async function ensurePermissions() {
      if (!isSupported.value)
        return false;
      if (permissionGranted.value)
        return true;
      const { state, query } = usePermission("camera", { controls: true });
      await query();
      if (state.value !== "granted") {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach((t) => t.stop());
        update();
        permissionGranted.value = true;
      } else {
        permissionGranted.value = true;
      }
      return permissionGranted.value;
    }
    if (isSupported.value) {
      if (requestPermissions)
        ensurePermissions();
      useEventListener(navigator.mediaDevices, "devicechange", update);
      update();
    }
    return {
      devices,
      ensurePermissions,
      permissionGranted,
      videoInputs,
      audioInputs,
      audioOutputs,
      isSupported
    };
  }

  function useDisplayMedia(options = {}) {
    var _a;
    const enabled = vueDemi.ref((_a = options.enabled) != null ? _a : false);
    const video = options.video;
    const audio = options.audio;
    const { navigator = defaultNavigator } = options;
    const isSupported = useSupported(() => {
      var _a2;
      return (_a2 = navigator == null ? void 0 : navigator.mediaDevices) == null ? void 0 : _a2.getDisplayMedia;
    });
    const constraint = { audio, video };
    const stream = vueDemi.shallowRef();
    async function _start() {
      if (!isSupported.value || stream.value)
        return;
      stream.value = await navigator.mediaDevices.getDisplayMedia(constraint);
      return stream.value;
    }
    async function _stop() {
      var _a2;
      (_a2 = stream.value) == null ? void 0 : _a2.getTracks().forEach((t) => t.stop());
      stream.value = void 0;
    }
    function stop() {
      _stop();
      enabled.value = false;
    }
    async function start() {
      await _start();
      if (stream.value)
        enabled.value = true;
      return stream.value;
    }
    vueDemi.watch(enabled, (v) => {
      if (v)
        _start();
      else
        _stop();
    }, { immediate: true });
    return {
      isSupported,
      stream,
      start,
      stop,
      enabled
    };
  }

  function useDocumentVisibility({ document = defaultDocument } = {}) {
    if (!document)
      return vueDemi.ref("visible");
    const visibility = vueDemi.ref(document.visibilityState);
    useEventListener(document, "visibilitychange", () => {
      visibility.value = document.visibilityState;
    });
    return visibility;
  }

  var __defProp$f = Object.defineProperty;
  var __defProps$4 = Object.defineProperties;
  var __getOwnPropDescs$4 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$h = Object.getOwnPropertySymbols;
  var __hasOwnProp$h = Object.prototype.hasOwnProperty;
  var __propIsEnum$h = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$f = (obj, key, value) => key in obj ? __defProp$f(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$f = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$h.call(b, prop))
        __defNormalProp$f(a, prop, b[prop]);
    if (__getOwnPropSymbols$h)
      for (var prop of __getOwnPropSymbols$h(b)) {
        if (__propIsEnum$h.call(b, prop))
          __defNormalProp$f(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$4 = (a, b) => __defProps$4(a, __getOwnPropDescs$4(b));
  function useDraggable(target, options = {}) {
    var _a, _b, _c;
    const draggingElement = (_a = options.draggingElement) != null ? _a : defaultWindow;
    const draggingHandle = (_b = options.handle) != null ? _b : target;
    const position = vueDemi.ref((_c = shared.resolveUnref(options.initialValue)) != null ? _c : { x: 0, y: 0 });
    const pressedDelta = vueDemi.ref();
    const filterEvent = (e) => {
      if (options.pointerTypes)
        return options.pointerTypes.includes(e.pointerType);
      return true;
    };
    const handleEvent = (e) => {
      if (shared.resolveUnref(options.preventDefault))
        e.preventDefault();
      if (shared.resolveUnref(options.stopPropagation))
        e.stopPropagation();
    };
    const start = (e) => {
      var _a2;
      if (!filterEvent(e))
        return;
      if (shared.resolveUnref(options.exact) && e.target !== shared.resolveUnref(target))
        return;
      const rect = shared.resolveUnref(target).getBoundingClientRect();
      const pos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      if (((_a2 = options.onStart) == null ? void 0 : _a2.call(options, pos, e)) === false)
        return;
      pressedDelta.value = pos;
      handleEvent(e);
    };
    const move = (e) => {
      var _a2;
      if (!filterEvent(e))
        return;
      if (!pressedDelta.value)
        return;
      position.value = {
        x: e.clientX - pressedDelta.value.x,
        y: e.clientY - pressedDelta.value.y
      };
      (_a2 = options.onMove) == null ? void 0 : _a2.call(options, position.value, e);
      handleEvent(e);
    };
    const end = (e) => {
      var _a2;
      if (!filterEvent(e))
        return;
      if (!pressedDelta.value)
        return;
      pressedDelta.value = void 0;
      (_a2 = options.onEnd) == null ? void 0 : _a2.call(options, position.value, e);
      handleEvent(e);
    };
    if (shared.isClient) {
      useEventListener(draggingHandle, "pointerdown", start, true);
      useEventListener(draggingElement, "pointermove", move, true);
      useEventListener(draggingElement, "pointerup", end, true);
    }
    return __spreadProps$4(__spreadValues$f({}, shared.toRefs(position)), {
      position,
      isDragging: vueDemi.computed(() => !!pressedDelta.value),
      style: vueDemi.computed(() => `left:${position.value.x}px;top:${position.value.y}px;`)
    });
  }

  function useDropZone(target, onDrop) {
    const isOverDropZone = vueDemi.ref(false);
    let counter = 0;
    if (shared.isClient) {
      useEventListener(target, "dragenter", (event) => {
        event.preventDefault();
        counter += 1;
        isOverDropZone.value = true;
      });
      useEventListener(target, "dragover", (event) => {
        event.preventDefault();
      });
      useEventListener(target, "dragleave", (event) => {
        event.preventDefault();
        counter -= 1;
        if (counter === 0)
          isOverDropZone.value = false;
      });
      useEventListener(target, "drop", (event) => {
        var _a, _b;
        event.preventDefault();
        counter = 0;
        isOverDropZone.value = false;
        const files = Array.from((_b = (_a = event.dataTransfer) == null ? void 0 : _a.files) != null ? _b : []);
        onDrop == null ? void 0 : onDrop(files.length === 0 ? null : files);
      });
    }
    return {
      isOverDropZone
    };
  }

  var __getOwnPropSymbols$g = Object.getOwnPropertySymbols;
  var __hasOwnProp$g = Object.prototype.hasOwnProperty;
  var __propIsEnum$g = Object.prototype.propertyIsEnumerable;
  var __objRest$2 = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp$g.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols$g)
      for (var prop of __getOwnPropSymbols$g(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum$g.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  function useResizeObserver(target, callback, options = {}) {
    const _a = options, { window = defaultWindow } = _a, observerOptions = __objRest$2(_a, ["window"]);
    let observer;
    const isSupported = useSupported(() => window && "ResizeObserver" in window);
    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = void 0;
      }
    };
    const stopWatch = vueDemi.watch(() => unrefElement(target), (el) => {
      cleanup();
      if (isSupported.value && window && el) {
        observer = new ResizeObserver(callback);
        observer.observe(el, observerOptions);
      }
    }, { immediate: true, flush: "post" });
    const stop = () => {
      cleanup();
      stopWatch();
    };
    shared.tryOnScopeDispose(stop);
    return {
      isSupported,
      stop
    };
  }

  function useElementBounding(target, options = {}) {
    const {
      reset = true,
      windowResize = true,
      windowScroll = true,
      immediate = true
    } = options;
    const height = vueDemi.ref(0);
    const bottom = vueDemi.ref(0);
    const left = vueDemi.ref(0);
    const right = vueDemi.ref(0);
    const top = vueDemi.ref(0);
    const width = vueDemi.ref(0);
    const x = vueDemi.ref(0);
    const y = vueDemi.ref(0);
    function update() {
      const el = unrefElement(target);
      if (!el) {
        if (reset) {
          height.value = 0;
          bottom.value = 0;
          left.value = 0;
          right.value = 0;
          top.value = 0;
          width.value = 0;
          x.value = 0;
          y.value = 0;
        }
        return;
      }
      const rect = el.getBoundingClientRect();
      height.value = rect.height;
      bottom.value = rect.bottom;
      left.value = rect.left;
      right.value = rect.right;
      top.value = rect.top;
      width.value = rect.width;
      x.value = rect.x;
      y.value = rect.y;
    }
    useResizeObserver(target, update);
    vueDemi.watch(() => unrefElement(target), (ele) => !ele && update());
    if (windowScroll)
      useEventListener("scroll", update, { capture: true, passive: true });
    if (windowResize)
      useEventListener("resize", update, { passive: true });
    shared.tryOnMounted(() => {
      if (immediate)
        update();
    });
    return {
      height,
      bottom,
      left,
      right,
      top,
      width,
      x,
      y,
      update
    };
  }

  function useRafFn(fn, options = {}) {
    const {
      immediate = true,
      window = defaultWindow
    } = options;
    const isActive = vueDemi.ref(false);
    let previousFrameTimestamp = 0;
    let rafId = null;
    function loop(timestamp) {
      if (!isActive.value || !window)
        return;
      const delta = timestamp - previousFrameTimestamp;
      fn({ delta, timestamp });
      previousFrameTimestamp = timestamp;
      rafId = window.requestAnimationFrame(loop);
    }
    function resume() {
      if (!isActive.value && window) {
        isActive.value = true;
        rafId = window.requestAnimationFrame(loop);
      }
    }
    function pause() {
      isActive.value = false;
      if (rafId != null && window) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
    if (immediate)
      resume();
    shared.tryOnScopeDispose(pause);
    return {
      isActive: vueDemi.readonly(isActive),
      pause,
      resume
    };
  }

  var __defProp$e = Object.defineProperty;
  var __getOwnPropSymbols$f = Object.getOwnPropertySymbols;
  var __hasOwnProp$f = Object.prototype.hasOwnProperty;
  var __propIsEnum$f = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$e = (obj, key, value) => key in obj ? __defProp$e(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$e = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$f.call(b, prop))
        __defNormalProp$e(a, prop, b[prop]);
    if (__getOwnPropSymbols$f)
      for (var prop of __getOwnPropSymbols$f(b)) {
        if (__propIsEnum$f.call(b, prop))
          __defNormalProp$e(a, prop, b[prop]);
      }
    return a;
  };
  function useElementByPoint(options) {
    const element = vueDemi.ref(null);
    const { x, y, document = defaultDocument } = options;
    const controls = useRafFn(() => {
      element.value = (document == null ? void 0 : document.elementFromPoint(shared.resolveUnref(x), shared.resolveUnref(y))) || null;
    });
    return __spreadValues$e({
      element
    }, controls);
  }

  function useElementHover(el, options = {}) {
    const delayEnter = options ? options.delayEnter : 0;
    const delayLeave = options ? options.delayLeave : 0;
    const isHovered = vueDemi.ref(false);
    let timer;
    const toggle = (entering) => {
      const delay = entering ? delayEnter : delayLeave;
      if (timer) {
        clearTimeout(timer);
        timer = void 0;
      }
      if (delay)
        timer = setTimeout(() => isHovered.value = entering, delay);
      else
        isHovered.value = entering;
    };
    if (!window)
      return isHovered;
    useEventListener(el, "mouseenter", () => toggle(true), { passive: true });
    useEventListener(el, "mouseleave", () => toggle(false), { passive: true });
    return isHovered;
  }

  function useElementSize(target, initialSize = { width: 0, height: 0 }, options = {}) {
    const { window = defaultWindow, box = "content-box" } = options;
    const isSVG = vueDemi.computed(() => {
      var _a, _b;
      return (_b = (_a = unrefElement(target)) == null ? void 0 : _a.namespaceURI) == null ? void 0 : _b.includes("svg");
    });
    const width = vueDemi.ref(initialSize.width);
    const height = vueDemi.ref(initialSize.height);
    useResizeObserver(target, ([entry]) => {
      const boxSize = box === "border-box" ? entry.borderBoxSize : box === "content-box" ? entry.contentBoxSize : entry.devicePixelContentBoxSize;
      if (window && isSVG.value) {
        const $elem = unrefElement(target);
        if ($elem) {
          const styles = window.getComputedStyle($elem);
          width.value = parseFloat(styles.width);
          height.value = parseFloat(styles.height);
        }
      } else {
        if (boxSize) {
          const formatBoxSize = Array.isArray(boxSize) ? boxSize : [boxSize];
          width.value = formatBoxSize.reduce((acc, { inlineSize }) => acc + inlineSize, 0);
          height.value = formatBoxSize.reduce((acc, { blockSize }) => acc + blockSize, 0);
        } else {
          width.value = entry.contentRect.width;
          height.value = entry.contentRect.height;
        }
      }
    }, options);
    vueDemi.watch(() => unrefElement(target), (ele) => {
      width.value = ele ? initialSize.width : 0;
      height.value = ele ? initialSize.height : 0;
    });
    return {
      width,
      height
    };
  }

  function useElementVisibility(element, { window = defaultWindow, scrollTarget } = {}) {
    const elementIsVisible = vueDemi.ref(false);
    const testBounding = () => {
      if (!window)
        return;
      const document = window.document;
      const el = unrefElement(element);
      if (!el) {
        elementIsVisible.value = false;
      } else {
        const rect = el.getBoundingClientRect();
        elementIsVisible.value = rect.top <= (window.innerHeight || document.documentElement.clientHeight) && rect.left <= (window.innerWidth || document.documentElement.clientWidth) && rect.bottom >= 0 && rect.right >= 0;
      }
    };
    vueDemi.watch(() => unrefElement(element), () => testBounding(), { immediate: true, flush: "post" });
    if (window) {
      useEventListener(scrollTarget || window, "scroll", testBounding, {
        capture: false,
        passive: true
      });
    }
    return elementIsVisible;
  }

  const events = new Map();

  function useEventBus(key) {
    const scope = vueDemi.getCurrentScope();
    function on(listener) {
      var _a;
      const listeners = events.get(key) || [];
      listeners.push(listener);
      events.set(key, listeners);
      const _off = () => off(listener);
      (_a = scope == null ? void 0 : scope.cleanups) == null ? void 0 : _a.push(_off);
      return _off;
    }
    function once(listener) {
      function _listener(...args) {
        off(_listener);
        listener(...args);
      }
      return on(_listener);
    }
    function off(listener) {
      const listeners = events.get(key);
      if (!listeners)
        return;
      const index = listeners.indexOf(listener);
      if (index > -1)
        listeners.splice(index, 1);
      if (!listeners.length)
        events.delete(key);
    }
    function reset() {
      events.delete(key);
    }
    function emit(event, payload) {
      var _a;
      (_a = events.get(key)) == null ? void 0 : _a.forEach((v) => v(event, payload));
    }
    return { on, once, off, emit, reset };
  }

  function useEventSource(url, events = [], options = {}) {
    const event = vueDemi.ref(null);
    const data = vueDemi.ref(null);
    const status = vueDemi.ref("CONNECTING");
    const eventSource = vueDemi.ref(null);
    const error = vueDemi.ref(null);
    const {
      withCredentials = false
    } = options;
    const close = () => {
      if (eventSource.value) {
        eventSource.value.close();
        eventSource.value = null;
        status.value = "CLOSED";
      }
    };
    const es = new EventSource(url, { withCredentials });
    eventSource.value = es;
    es.onopen = () => {
      status.value = "OPEN";
      error.value = null;
    };
    es.onerror = (e) => {
      status.value = "CLOSED";
      error.value = e;
    };
    es.onmessage = (e) => {
      event.value = null;
      data.value = e.data;
    };
    for (const event_name of events) {
      useEventListener(es, event_name, (e) => {
        event.value = event_name;
        data.value = e.data || null;
      });
    }
    shared.tryOnScopeDispose(() => {
      close();
    });
    return {
      eventSource,
      event,
      data,
      status,
      error,
      close
    };
  }

  function useEyeDropper(options = {}) {
    const { initialValue = "" } = options;
    const isSupported = useSupported(() => typeof window !== "undefined" && "EyeDropper" in window);
    const sRGBHex = vueDemi.ref(initialValue);
    async function open(openOptions) {
      if (!isSupported.value)
        return;
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open(openOptions);
      sRGBHex.value = result.sRGBHex;
      return result;
    }
    return { isSupported, sRGBHex, open };
  }

  function useFavicon(newIcon = null, options = {}) {
    const {
      baseUrl = "",
      rel = "icon",
      document = defaultDocument
    } = options;
    const favicon = shared.resolveRef(newIcon);
    const applyIcon = (icon) => {
      document == null ? void 0 : document.head.querySelectorAll(`link[rel*="${rel}"]`).forEach((el) => el.href = `${baseUrl}${icon}`);
    };
    vueDemi.watch(favicon, (i, o) => {
      if (shared.isString(i) && i !== o)
        applyIcon(i);
    }, { immediate: true });
    return favicon;
  }

  var __defProp$d = Object.defineProperty;
  var __defProps$3 = Object.defineProperties;
  var __getOwnPropDescs$3 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$e = Object.getOwnPropertySymbols;
  var __hasOwnProp$e = Object.prototype.hasOwnProperty;
  var __propIsEnum$e = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$d = (obj, key, value) => key in obj ? __defProp$d(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$d = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$e.call(b, prop))
        __defNormalProp$d(a, prop, b[prop]);
    if (__getOwnPropSymbols$e)
      for (var prop of __getOwnPropSymbols$e(b)) {
        if (__propIsEnum$e.call(b, prop))
          __defNormalProp$d(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$3 = (a, b) => __defProps$3(a, __getOwnPropDescs$3(b));
  const payloadMapping = {
    json: "application/json",
    text: "text/plain"
  };
  function isFetchOptions(obj) {
    return obj && shared.containsProp(obj, "immediate", "refetch", "initialData", "timeout", "beforeFetch", "afterFetch", "onFetchError", "fetch");
  }
  function isAbsoluteURL(url) {
    return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
  }
  function headersToObject(headers) {
    if (typeof Headers !== "undefined" && headers instanceof Headers)
      return Object.fromEntries([...headers.entries()]);
    return headers;
  }
  function combineCallbacks(combination, ...callbacks) {
    if (combination === "overwrite") {
      return async (ctx) => {
        const callback = callbacks[callbacks.length - 1];
        if (callback !== void 0)
          await callback(ctx);
        return ctx;
      };
    } else {
      return async (ctx) => {
        await callbacks.reduce((prevCallback, callback) => prevCallback.then(async () => {
          if (callback)
            ctx = __spreadValues$d(__spreadValues$d({}, ctx), await callback(ctx));
        }), Promise.resolve());
        return ctx;
      };
    }
  }
  function createFetch(config = {}) {
    const _combination = config.combination || "chain";
    const _options = config.options || {};
    const _fetchOptions = config.fetchOptions || {};
    function useFactoryFetch(url, ...args) {
      const computedUrl = vueDemi.computed(() => {
        const baseUrl = shared.resolveUnref(config.baseUrl);
        const targetUrl = shared.resolveUnref(url);
        return baseUrl && !isAbsoluteURL(targetUrl) ? joinPaths(baseUrl, targetUrl) : targetUrl;
      });
      let options = _options;
      let fetchOptions = _fetchOptions;
      if (args.length > 0) {
        if (isFetchOptions(args[0])) {
          options = __spreadProps$3(__spreadValues$d(__spreadValues$d({}, options), args[0]), {
            beforeFetch: combineCallbacks(_combination, _options.beforeFetch, args[0].beforeFetch),
            afterFetch: combineCallbacks(_combination, _options.afterFetch, args[0].afterFetch),
            onFetchError: combineCallbacks(_combination, _options.onFetchError, args[0].onFetchError)
          });
        } else {
          fetchOptions = __spreadProps$3(__spreadValues$d(__spreadValues$d({}, fetchOptions), args[0]), {
            headers: __spreadValues$d(__spreadValues$d({}, headersToObject(fetchOptions.headers) || {}), headersToObject(args[0].headers) || {})
          });
        }
      }
      if (args.length > 1 && isFetchOptions(args[1])) {
        options = __spreadProps$3(__spreadValues$d(__spreadValues$d({}, options), args[1]), {
          beforeFetch: combineCallbacks(_combination, _options.beforeFetch, args[1].beforeFetch),
          afterFetch: combineCallbacks(_combination, _options.afterFetch, args[1].afterFetch),
          onFetchError: combineCallbacks(_combination, _options.onFetchError, args[1].onFetchError)
        });
      }
      return useFetch(computedUrl, fetchOptions, options);
    }
    return useFactoryFetch;
  }
  function useFetch(url, ...args) {
    var _a;
    const supportsAbort = typeof AbortController === "function";
    let fetchOptions = {};
    let options = { immediate: true, refetch: false, timeout: 0 };
    const config = {
      method: "GET",
      type: "text",
      payload: void 0
    };
    if (args.length > 0) {
      if (isFetchOptions(args[0]))
        options = __spreadValues$d(__spreadValues$d({}, options), args[0]);
      else
        fetchOptions = args[0];
    }
    if (args.length > 1) {
      if (isFetchOptions(args[1]))
        options = __spreadValues$d(__spreadValues$d({}, options), args[1]);
    }
    const {
      fetch = (_a = defaultWindow) == null ? void 0 : _a.fetch,
      initialData,
      timeout
    } = options;
    const responseEvent = shared.createEventHook();
    const errorEvent = shared.createEventHook();
    const finallyEvent = shared.createEventHook();
    const isFinished = vueDemi.ref(false);
    const isFetching = vueDemi.ref(false);
    const aborted = vueDemi.ref(false);
    const statusCode = vueDemi.ref(null);
    const response = vueDemi.shallowRef(null);
    const error = vueDemi.shallowRef(null);
    const data = vueDemi.shallowRef(initialData);
    const canAbort = vueDemi.computed(() => supportsAbort && isFetching.value);
    let controller;
    let timer;
    const abort = () => {
      if (supportsAbort && controller) {
        controller.abort();
        controller = void 0;
      }
    };
    const loading = (isLoading) => {
      isFetching.value = isLoading;
      isFinished.value = !isLoading;
    };
    if (timeout)
      timer = shared.useTimeoutFn(abort, timeout, { immediate: false });
    const execute = async (throwOnFailed = false) => {
      var _a2;
      loading(true);
      error.value = null;
      statusCode.value = null;
      aborted.value = false;
      if (supportsAbort) {
        abort();
        controller = new AbortController();
        controller.signal.onabort = () => aborted.value = true;
        fetchOptions = __spreadProps$3(__spreadValues$d({}, fetchOptions), {
          signal: controller.signal
        });
      }
      const defaultFetchOptions = {
        method: config.method,
        headers: {}
      };
      if (config.payload) {
        const headers = headersToObject(defaultFetchOptions.headers);
        if (config.payloadType)
          headers["Content-Type"] = (_a2 = payloadMapping[config.payloadType]) != null ? _a2 : config.payloadType;
        const payload = shared.resolveUnref(config.payload);
        defaultFetchOptions.body = config.payloadType === "json" ? JSON.stringify(payload) : payload;
      }
      let isCanceled = false;
      const context = {
        url: shared.resolveUnref(url),
        options: __spreadValues$d(__spreadValues$d({}, defaultFetchOptions), fetchOptions),
        cancel: () => {
          isCanceled = true;
        }
      };
      if (options.beforeFetch)
        Object.assign(context, await options.beforeFetch(context));
      if (isCanceled || !fetch) {
        loading(false);
        return Promise.resolve(null);
      }
      let responseData = null;
      if (timer)
        timer.start();
      return new Promise((resolve, reject) => {
        var _a3;
        fetch(context.url, __spreadProps$3(__spreadValues$d(__spreadValues$d({}, defaultFetchOptions), context.options), {
          headers: __spreadValues$d(__spreadValues$d({}, headersToObject(defaultFetchOptions.headers)), headersToObject((_a3 = context.options) == null ? void 0 : _a3.headers))
        })).then(async (fetchResponse) => {
          response.value = fetchResponse;
          statusCode.value = fetchResponse.status;
          responseData = await fetchResponse[config.type]();
          if (options.afterFetch && statusCode.value >= 200 && statusCode.value < 300)
            ({ data: responseData } = await options.afterFetch({ data: responseData, response: fetchResponse }));
          data.value = responseData;
          if (!fetchResponse.ok)
            throw new Error(fetchResponse.statusText);
          responseEvent.trigger(fetchResponse);
          return resolve(fetchResponse);
        }).catch(async (fetchError) => {
          let errorData = fetchError.message || fetchError.name;
          if (options.onFetchError)
            ({ data: responseData, error: errorData } = await options.onFetchError({ data: responseData, error: fetchError, response: response.value }));
          data.value = responseData;
          error.value = errorData;
          errorEvent.trigger(fetchError);
          if (throwOnFailed)
            return reject(fetchError);
          return resolve(null);
        }).finally(() => {
          loading(false);
          if (timer)
            timer.stop();
          finallyEvent.trigger(null);
        });
      });
    };
    const refetch = shared.resolveRef(options.refetch);
    vueDemi.watch([
      refetch,
      shared.resolveRef(url)
    ], ([refetch2]) => refetch2 && execute(), { deep: true });
    const shell = {
      isFinished,
      statusCode,
      response,
      error,
      data,
      isFetching,
      canAbort,
      aborted,
      abort,
      execute,
      onFetchResponse: responseEvent.on,
      onFetchError: errorEvent.on,
      onFetchFinally: finallyEvent.on,
      get: setMethod("GET"),
      put: setMethod("PUT"),
      post: setMethod("POST"),
      delete: setMethod("DELETE"),
      patch: setMethod("PATCH"),
      head: setMethod("HEAD"),
      options: setMethod("OPTIONS"),
      json: setType("json"),
      text: setType("text"),
      blob: setType("blob"),
      arrayBuffer: setType("arrayBuffer"),
      formData: setType("formData")
    };
    function setMethod(method) {
      return (payload, payloadType) => {
        if (!isFetching.value) {
          config.method = method;
          config.payload = payload;
          config.payloadType = payloadType;
          if (vueDemi.isRef(config.payload)) {
            vueDemi.watch([
              refetch,
              shared.resolveRef(config.payload)
            ], ([refetch2]) => refetch2 && execute(), { deep: true });
          }
          const rawPayload = shared.resolveUnref(config.payload);
          if (!payloadType && rawPayload && Object.getPrototypeOf(rawPayload) === Object.prototype && !(rawPayload instanceof FormData))
            config.payloadType = "json";
          return __spreadProps$3(__spreadValues$d({}, shell), {
            then(onFulfilled, onRejected) {
              return waitUntilFinished().then(onFulfilled, onRejected);
            }
          });
        }
        return void 0;
      };
    }
    function waitUntilFinished() {
      return new Promise((resolve, reject) => {
        shared.until(isFinished).toBe(true).then(() => resolve(shell)).catch((error2) => reject(error2));
      });
    }
    function setType(type) {
      return () => {
        if (!isFetching.value) {
          config.type = type;
          return __spreadProps$3(__spreadValues$d({}, shell), {
            then(onFulfilled, onRejected) {
              return waitUntilFinished().then(onFulfilled, onRejected);
            }
          });
        }
        return void 0;
      };
    }
    if (options.immediate)
      setTimeout(execute, 0);
    return __spreadProps$3(__spreadValues$d({}, shell), {
      then(onFulfilled, onRejected) {
        return waitUntilFinished().then(onFulfilled, onRejected);
      }
    });
  }
  function joinPaths(start, end) {
    if (!start.endsWith("/") && !end.startsWith("/"))
      return `${start}/${end}`;
    return `${start}${end}`;
  }

  var __defProp$c = Object.defineProperty;
  var __getOwnPropSymbols$d = Object.getOwnPropertySymbols;
  var __hasOwnProp$d = Object.prototype.hasOwnProperty;
  var __propIsEnum$d = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$c = (obj, key, value) => key in obj ? __defProp$c(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$c = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$d.call(b, prop))
        __defNormalProp$c(a, prop, b[prop]);
    if (__getOwnPropSymbols$d)
      for (var prop of __getOwnPropSymbols$d(b)) {
        if (__propIsEnum$d.call(b, prop))
          __defNormalProp$c(a, prop, b[prop]);
      }
    return a;
  };
  const DEFAULT_OPTIONS = {
    multiple: true,
    accept: "*"
  };
  function useFileDialog(options = {}) {
    const {
      document = defaultDocument
    } = options;
    const files = vueDemi.ref(null);
    let input;
    if (document) {
      input = document.createElement("input");
      input.type = "file";
      input.onchange = (event) => {
        const result = event.target;
        files.value = result.files;
      };
    }
    const open = (localOptions) => {
      if (!input)
        return;
      const _options = __spreadValues$c(__spreadValues$c(__spreadValues$c({}, DEFAULT_OPTIONS), options), localOptions);
      input.multiple = _options.multiple;
      input.accept = _options.accept;
      if (shared.hasOwn(_options, "capture"))
        input.capture = _options.capture;
      input.click();
    };
    const reset = () => {
      files.value = null;
      if (input)
        input.value = "";
    };
    return {
      files: vueDemi.readonly(files),
      open,
      reset
    };
  }

  var __defProp$b = Object.defineProperty;
  var __getOwnPropSymbols$c = Object.getOwnPropertySymbols;
  var __hasOwnProp$c = Object.prototype.hasOwnProperty;
  var __propIsEnum$c = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$b = (obj, key, value) => key in obj ? __defProp$b(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$b = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$c.call(b, prop))
        __defNormalProp$b(a, prop, b[prop]);
    if (__getOwnPropSymbols$c)
      for (var prop of __getOwnPropSymbols$c(b)) {
        if (__propIsEnum$c.call(b, prop))
          __defNormalProp$b(a, prop, b[prop]);
      }
    return a;
  };
  function useFileSystemAccess(options = {}) {
    const {
      window: _window = defaultWindow,
      dataType = "Text"
    } = vueDemi.unref(options);
    const window = _window;
    const isSupported = useSupported(() => window && "showSaveFilePicker" in window && "showOpenFilePicker" in window);
    const fileHandle = vueDemi.ref();
    const data = vueDemi.ref();
    const file = vueDemi.ref();
    const fileName = vueDemi.computed(() => {
      var _a, _b;
      return (_b = (_a = file.value) == null ? void 0 : _a.name) != null ? _b : "";
    });
    const fileMIME = vueDemi.computed(() => {
      var _a, _b;
      return (_b = (_a = file.value) == null ? void 0 : _a.type) != null ? _b : "";
    });
    const fileSize = vueDemi.computed(() => {
      var _a, _b;
      return (_b = (_a = file.value) == null ? void 0 : _a.size) != null ? _b : 0;
    });
    const fileLastModified = vueDemi.computed(() => {
      var _a, _b;
      return (_b = (_a = file.value) == null ? void 0 : _a.lastModified) != null ? _b : 0;
    });
    async function open(_options = {}) {
      if (!isSupported.value)
        return;
      const [handle] = await window.showOpenFilePicker(__spreadValues$b(__spreadValues$b({}, vueDemi.unref(options)), _options));
      fileHandle.value = handle;
      await updateFile();
      await updateData();
    }
    async function create(_options = {}) {
      if (!isSupported.value)
        return;
      fileHandle.value = await window.showSaveFilePicker(__spreadValues$b(__spreadValues$b({}, vueDemi.unref(options)), _options));
      data.value = void 0;
      await updateFile();
      await updateData();
    }
    async function save(_options = {}) {
      if (!isSupported.value)
        return;
      if (!fileHandle.value)
        return saveAs(_options);
      if (data.value) {
        const writableStream = await fileHandle.value.createWritable();
        await writableStream.write(data.value);
        await writableStream.close();
      }
      await updateFile();
    }
    async function saveAs(_options = {}) {
      if (!isSupported.value)
        return;
      fileHandle.value = await window.showSaveFilePicker(__spreadValues$b(__spreadValues$b({}, vueDemi.unref(options)), _options));
      if (data.value) {
        const writableStream = await fileHandle.value.createWritable();
        await writableStream.write(data.value);
        await writableStream.close();
      }
      await updateFile();
    }
    async function updateFile() {
      var _a;
      file.value = await ((_a = fileHandle.value) == null ? void 0 : _a.getFile());
    }
    async function updateData() {
      var _a, _b;
      if (vueDemi.unref(dataType) === "Text")
        data.value = await ((_a = file.value) == null ? void 0 : _a.text());
      if (vueDemi.unref(dataType) === "ArrayBuffer")
        data.value = await ((_b = file.value) == null ? void 0 : _b.arrayBuffer());
      if (vueDemi.unref(dataType) === "Blob")
        data.value = file.value;
    }
    vueDemi.watch(() => vueDemi.unref(dataType), updateData);
    return {
      isSupported,
      data,
      file,
      fileName,
      fileMIME,
      fileSize,
      fileLastModified,
      open,
      create,
      save,
      saveAs,
      updateData
    };
  }

  function useFocus(target, options = {}) {
    const { initialValue = false } = options;
    const innerFocused = vueDemi.ref(false);
    const targetElement = vueDemi.computed(() => unrefElement(target));
    useEventListener(targetElement, "focus", () => innerFocused.value = true);
    useEventListener(targetElement, "blur", () => innerFocused.value = false);
    const focused = vueDemi.computed({
      get: () => innerFocused.value,
      set(value) {
        var _a, _b;
        if (!value && innerFocused.value)
          (_a = targetElement.value) == null ? void 0 : _a.blur();
        else if (value && !innerFocused.value)
          (_b = targetElement.value) == null ? void 0 : _b.focus();
      }
    });
    vueDemi.watch(targetElement, () => {
      focused.value = initialValue;
    }, { immediate: true, flush: "post" });
    return { focused };
  }

  function useFocusWithin(target, options = {}) {
    const activeElement = useActiveElement(options);
    const targetElement = vueDemi.computed(() => unrefElement(target));
    const focused = vueDemi.computed(() => targetElement.value && activeElement.value ? targetElement.value.contains(activeElement.value) : false);
    return { focused };
  }

  function useFps(options) {
    var _a;
    const fps = vueDemi.ref(0);
    if (typeof performance === "undefined")
      return fps;
    const every = (_a = options == null ? void 0 : options.every) != null ? _a : 10;
    let last = performance.now();
    let ticks = 0;
    useRafFn(() => {
      ticks += 1;
      if (ticks >= every) {
        const now = performance.now();
        const diff = now - last;
        fps.value = Math.round(1e3 / (diff / ticks));
        last = now;
        ticks = 0;
      }
    });
    return fps;
  }

  const functionsMap = [
    [
      "requestFullscreen",
      "exitFullscreen",
      "fullscreenElement",
      "fullscreenEnabled",
      "fullscreenchange",
      "fullscreenerror"
    ],
    [
      "webkitRequestFullscreen",
      "webkitExitFullscreen",
      "webkitFullscreenElement",
      "webkitFullscreenEnabled",
      "webkitfullscreenchange",
      "webkitfullscreenerror"
    ],
    [
      "webkitRequestFullScreen",
      "webkitCancelFullScreen",
      "webkitCurrentFullScreenElement",
      "webkitCancelFullScreen",
      "webkitfullscreenchange",
      "webkitfullscreenerror"
    ],
    [
      "mozRequestFullScreen",
      "mozCancelFullScreen",
      "mozFullScreenElement",
      "mozFullScreenEnabled",
      "mozfullscreenchange",
      "mozfullscreenerror"
    ],
    [
      "msRequestFullscreen",
      "msExitFullscreen",
      "msFullscreenElement",
      "msFullscreenEnabled",
      "MSFullscreenChange",
      "MSFullscreenError"
    ]
  ];
  function useFullscreen(target, options = {}) {
    const { document = defaultDocument, autoExit = false } = options;
    const targetRef = target || (document == null ? void 0 : document.querySelector("html"));
    const isFullscreen = vueDemi.ref(false);
    let map = functionsMap[0];
    const isSupported = useSupported(() => {
      if (!document) {
        return false;
      } else {
        for (const m of functionsMap) {
          if (m[1] in document) {
            map = m;
            return true;
          }
        }
      }
      return false;
    });
    const [REQUEST, EXIT, ELEMENT, , EVENT] = map;
    async function exit() {
      if (!isSupported.value)
        return;
      if (document == null ? void 0 : document[ELEMENT])
        await document[EXIT]();
      isFullscreen.value = false;
    }
    async function enter() {
      if (!isSupported.value)
        return;
      await exit();
      const target2 = unrefElement(targetRef);
      if (target2) {
        await target2[REQUEST]();
        isFullscreen.value = true;
      }
    }
    async function toggle() {
      if (isFullscreen.value)
        await exit();
      else
        await enter();
    }
    if (document) {
      useEventListener(document, EVENT, () => {
        isFullscreen.value = !!(document == null ? void 0 : document[ELEMENT]);
      }, false);
    }
    if (autoExit)
      shared.tryOnScopeDispose(exit);
    return {
      isSupported,
      isFullscreen,
      enter,
      exit,
      toggle
    };
  }

  function mapGamepadToXbox360Controller(gamepad) {
    return vueDemi.computed(() => {
      if (gamepad.value) {
        return {
          buttons: {
            a: gamepad.value.buttons[0],
            b: gamepad.value.buttons[1],
            x: gamepad.value.buttons[2],
            y: gamepad.value.buttons[3]
          },
          bumper: {
            left: gamepad.value.buttons[4],
            right: gamepad.value.buttons[5]
          },
          triggers: {
            left: gamepad.value.buttons[6],
            right: gamepad.value.buttons[7]
          },
          stick: {
            left: {
              horizontal: gamepad.value.axes[0],
              vertical: gamepad.value.axes[1],
              button: gamepad.value.buttons[10]
            },
            right: {
              horizontal: gamepad.value.axes[2],
              vertical: gamepad.value.axes[3],
              button: gamepad.value.buttons[11]
            }
          },
          dpad: {
            up: gamepad.value.buttons[12],
            down: gamepad.value.buttons[13],
            left: gamepad.value.buttons[14],
            right: gamepad.value.buttons[15]
          },
          back: gamepad.value.buttons[8],
          start: gamepad.value.buttons[9]
        };
      }
      return null;
    });
  }
  function useGamepad(options = {}) {
    const {
      navigator = defaultNavigator
    } = options;
    const isSupported = useSupported(() => navigator && "getGamepads" in navigator);
    const gamepads = vueDemi.ref([]);
    const onConnectedHook = shared.createEventHook();
    const onDisconnectedHook = shared.createEventHook();
    const stateFromGamepad = (gamepad) => {
      const hapticActuators = [];
      const vibrationActuator = "vibrationActuator" in gamepad ? gamepad.vibrationActuator : null;
      if (vibrationActuator)
        hapticActuators.push(vibrationActuator);
      if (gamepad.hapticActuators)
        hapticActuators.push(...gamepad.hapticActuators);
      return {
        id: gamepad.id,
        hapticActuators,
        index: gamepad.index,
        mapping: gamepad.mapping,
        connected: gamepad.connected,
        timestamp: gamepad.timestamp,
        axes: gamepad.axes.map((axes) => axes),
        buttons: gamepad.buttons.map((button) => ({ pressed: button.pressed, touched: button.touched, value: button.value }))
      };
    };
    const updateGamepadState = () => {
      const _gamepads = (navigator == null ? void 0 : navigator.getGamepads()) || [];
      for (let i = 0; i < _gamepads.length; ++i) {
        const gamepad = _gamepads[i];
        if (gamepad) {
          const index = gamepads.value.findIndex(({ index: index2 }) => index2 === gamepad.index);
          if (index > -1)
            gamepads.value[index] = stateFromGamepad(gamepad);
        }
      }
    };
    const { isActive, pause, resume } = useRafFn(updateGamepadState);
    const onGamepadConnected = (gamepad) => {
      if (!gamepads.value.some(({ index }) => index === gamepad.index)) {
        gamepads.value.push(stateFromGamepad(gamepad));
        onConnectedHook.trigger(gamepad.index);
      }
      resume();
    };
    const onGamepadDisconnected = (gamepad) => {
      gamepads.value = gamepads.value.filter((x) => x.index !== gamepad.index);
      onDisconnectedHook.trigger(gamepad.index);
    };
    useEventListener("gamepadconnected", (e) => onGamepadConnected(e.gamepad));
    useEventListener("gamepaddisconnected", (e) => onGamepadDisconnected(e.gamepad));
    shared.tryOnMounted(() => {
      const _gamepads = (navigator == null ? void 0 : navigator.getGamepads()) || [];
      if (_gamepads) {
        for (let i = 0; i < _gamepads.length; ++i) {
          const gamepad = _gamepads[i];
          if (gamepad)
            onGamepadConnected(gamepad);
        }
      }
    });
    pause();
    return {
      isSupported,
      onConnected: onConnectedHook.on,
      onDisconnected: onDisconnectedHook.on,
      gamepads,
      pause,
      resume,
      isActive
    };
  }

  function useGeolocation(options = {}) {
    const {
      enableHighAccuracy = true,
      maximumAge = 3e4,
      timeout = 27e3,
      navigator = defaultNavigator,
      immediate = true
    } = options;
    const isSupported = useSupported(() => navigator && "geolocation" in navigator);
    const locatedAt = vueDemi.ref(null);
    const error = vueDemi.ref(null);
    const coords = vueDemi.ref({
      accuracy: 0,
      latitude: Infinity,
      longitude: Infinity,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    });
    function updatePosition(position) {
      locatedAt.value = position.timestamp;
      coords.value = position.coords;
      error.value = null;
    }
    let watcher;
    function resume() {
      if (isSupported.value) {
        watcher = navigator.geolocation.watchPosition(updatePosition, (err) => error.value = err, {
          enableHighAccuracy,
          maximumAge,
          timeout
        });
      }
    }
    if (immediate)
      resume();
    function pause() {
      if (watcher && navigator)
        navigator.geolocation.clearWatch(watcher);
    }
    shared.tryOnScopeDispose(() => {
      pause();
    });
    return {
      isSupported,
      coords,
      locatedAt,
      error,
      resume,
      pause
    };
  }

  const defaultEvents$1 = ["mousemove", "mousedown", "resize", "keydown", "touchstart", "wheel"];
  const oneMinute = 6e4;
  function useIdle(timeout = oneMinute, options = {}) {
    const {
      initialState = false,
      listenForVisibilityChange = true,
      events = defaultEvents$1,
      window = defaultWindow,
      eventFilter = shared.throttleFilter(50)
    } = options;
    const idle = vueDemi.ref(initialState);
    const lastActive = vueDemi.ref(shared.timestamp());
    let timer;
    const onEvent = shared.createFilterWrapper(eventFilter, () => {
      idle.value = false;
      lastActive.value = shared.timestamp();
      clearTimeout(timer);
      timer = setTimeout(() => idle.value = true, timeout);
    });
    if (window) {
      const document = window.document;
      for (const event of events)
        useEventListener(window, event, onEvent, { passive: true });
      if (listenForVisibilityChange) {
        useEventListener(document, "visibilitychange", () => {
          if (!document.hidden)
            onEvent();
        });
      }
    }
    timer = setTimeout(() => idle.value = true, timeout);
    return { idle, lastActive };
  }

  var __defProp$a = Object.defineProperty;
  var __getOwnPropSymbols$b = Object.getOwnPropertySymbols;
  var __hasOwnProp$b = Object.prototype.hasOwnProperty;
  var __propIsEnum$b = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$a = (obj, key, value) => key in obj ? __defProp$a(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$a = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$b.call(b, prop))
        __defNormalProp$a(a, prop, b[prop]);
    if (__getOwnPropSymbols$b)
      for (var prop of __getOwnPropSymbols$b(b)) {
        if (__propIsEnum$b.call(b, prop))
          __defNormalProp$a(a, prop, b[prop]);
      }
    return a;
  };
  async function loadImage(options) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const { src, srcset, sizes } = options;
      img.src = src;
      if (srcset)
        img.srcset = srcset;
      if (sizes)
        img.sizes = sizes;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }
  const useImage = (options, asyncStateOptions = {}) => {
    const state = useAsyncState(() => loadImage(shared.resolveUnref(options)), void 0, __spreadValues$a({
      resetOnExecute: true
    }, asyncStateOptions));
    vueDemi.watch(() => shared.resolveUnref(options), () => state.execute(asyncStateOptions.delay), { deep: true });
    return state;
  };

  const ARRIVED_STATE_THRESHOLD_PIXELS = 1;
  function useScroll(element, options = {}) {
    const {
      throttle = 0,
      idle = 200,
      onStop = shared.noop,
      onScroll = shared.noop,
      offset = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      },
      eventListenerOptions = {
        capture: false,
        passive: true
      },
      behavior = "auto"
    } = options;
    const internalX = vueDemi.ref(0);
    const internalY = vueDemi.ref(0);
    const x = vueDemi.computed({
      get() {
        return internalX.value;
      },
      set(x2) {
        scrollTo(x2, void 0);
      }
    });
    const y = vueDemi.computed({
      get() {
        return internalY.value;
      },
      set(y2) {
        scrollTo(void 0, y2);
      }
    });
    function scrollTo(_x, _y) {
      var _a, _b, _c;
      const _element = shared.resolveUnref(element);
      if (!_element)
        return;
      (_c = _element instanceof Document ? document.body : _element) == null ? void 0 : _c.scrollTo({
        top: (_a = shared.resolveUnref(_y)) != null ? _a : y.value,
        left: (_b = shared.resolveUnref(_x)) != null ? _b : x.value,
        behavior: shared.resolveUnref(behavior)
      });
    }
    const isScrolling = vueDemi.ref(false);
    const arrivedState = vueDemi.reactive({
      left: true,
      right: false,
      top: true,
      bottom: false
    });
    const directions = vueDemi.reactive({
      left: false,
      right: false,
      top: false,
      bottom: false
    });
    const onScrollEnd = (e) => {
      if (!isScrolling.value)
        return;
      isScrolling.value = false;
      directions.left = false;
      directions.right = false;
      directions.top = false;
      directions.bottom = false;
      onStop(e);
    };
    const onScrollEndDebounced = shared.useDebounceFn(onScrollEnd, throttle + idle);
    const onScrollHandler = (e) => {
      const eventTarget = e.target === document ? e.target.documentElement : e.target;
      const scrollLeft = eventTarget.scrollLeft;
      directions.left = scrollLeft < internalX.value;
      directions.right = scrollLeft > internalY.value;
      arrivedState.left = scrollLeft <= 0 + (offset.left || 0);
      arrivedState.right = scrollLeft + eventTarget.clientWidth >= eventTarget.scrollWidth - (offset.right || 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
      internalX.value = scrollLeft;
      let scrollTop = eventTarget.scrollTop;
      if (e.target === document && !scrollTop)
        scrollTop = document.body.scrollTop;
      directions.top = scrollTop < internalY.value;
      directions.bottom = scrollTop > internalY.value;
      arrivedState.top = scrollTop <= 0 + (offset.top || 0);
      arrivedState.bottom = scrollTop + eventTarget.clientHeight >= eventTarget.scrollHeight - (offset.bottom || 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
      internalY.value = scrollTop;
      isScrolling.value = true;
      onScrollEndDebounced(e);
      onScroll(e);
    };
    useEventListener(element, "scroll", throttle ? shared.useThrottleFn(onScrollHandler, throttle, true, false) : onScrollHandler, eventListenerOptions);
    useEventListener(element, "scrollend", onScrollEnd, eventListenerOptions);
    return {
      x,
      y,
      isScrolling,
      arrivedState,
      directions
    };
  }

  var __defProp$9 = Object.defineProperty;
  var __defProps$2 = Object.defineProperties;
  var __getOwnPropDescs$2 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$a = Object.getOwnPropertySymbols;
  var __hasOwnProp$a = Object.prototype.hasOwnProperty;
  var __propIsEnum$a = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$9 = (obj, key, value) => key in obj ? __defProp$9(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$9 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$a.call(b, prop))
        __defNormalProp$9(a, prop, b[prop]);
    if (__getOwnPropSymbols$a)
      for (var prop of __getOwnPropSymbols$a(b)) {
        if (__propIsEnum$a.call(b, prop))
          __defNormalProp$9(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$2 = (a, b) => __defProps$2(a, __getOwnPropDescs$2(b));
  function useInfiniteScroll(element, onLoadMore, options = {}) {
    var _a, _b;
    const direction = (_a = options.direction) != null ? _a : "bottom";
    const state = vueDemi.reactive(useScroll(element, __spreadProps$2(__spreadValues$9({}, options), {
      offset: __spreadValues$9({
        [direction]: (_b = options.distance) != null ? _b : 0
      }, options.offset)
    })));
    vueDemi.watch(() => state.arrivedState[direction], async (v) => {
      var _a2, _b2;
      if (v) {
        const elem = shared.resolveUnref(element);
        const previous = {
          height: (_a2 = elem == null ? void 0 : elem.scrollHeight) != null ? _a2 : 0,
          width: (_b2 = elem == null ? void 0 : elem.scrollWidth) != null ? _b2 : 0
        };
        await onLoadMore(state);
        if (options.preserveScrollPosition && elem) {
          vueDemi.nextTick(() => {
            elem.scrollTo({
              top: elem.scrollHeight - previous.height,
              left: elem.scrollWidth - previous.width
            });
          });
        }
      }
    });
  }

  function useIntersectionObserver(target, callback, options = {}) {
    const {
      root,
      rootMargin = "0px",
      threshold = 0.1,
      window = defaultWindow
    } = options;
    const isSupported = useSupported(() => window && "IntersectionObserver" in window);
    let cleanup = shared.noop;
    const stopWatch = isSupported.value ? vueDemi.watch(() => ({
      el: unrefElement(target),
      root: unrefElement(root)
    }), ({ el, root: root2 }) => {
      cleanup();
      if (!el)
        return;
      const observer = new IntersectionObserver(callback, {
        root: root2,
        rootMargin,
        threshold
      });
      observer.observe(el);
      cleanup = () => {
        observer.disconnect();
        cleanup = shared.noop;
      };
    }, { immediate: true, flush: "post" }) : shared.noop;
    const stop = () => {
      cleanup();
      stopWatch();
    };
    shared.tryOnScopeDispose(stop);
    return {
      isSupported,
      stop
    };
  }

  const defaultEvents = ["mousedown", "mouseup", "keydown", "keyup"];
  function useKeyModifier(modifier, options = {}) {
    const {
      events = defaultEvents,
      document = defaultDocument,
      initial = null
    } = options;
    const state = vueDemi.ref(initial);
    if (document) {
      events.forEach((listenerEvent) => {
        useEventListener(document, listenerEvent, (evt) => {
          if (typeof evt.getModifierState === "function")
            state.value = evt.getModifierState(modifier);
        });
      });
    }
    return state;
  }

  function useLocalStorage(key, initialValue, options = {}) {
    const { window = defaultWindow } = options;
    return useStorage(key, initialValue, window == null ? void 0 : window.localStorage, options);
  }

  const DefaultMagicKeysAliasMap = {
    ctrl: "control",
    command: "meta",
    cmd: "meta",
    option: "alt",
    up: "arrowup",
    down: "arrowdown",
    left: "arrowleft",
    right: "arrowright"
  };

  function useMagicKeys(options = {}) {
    const {
      reactive: useReactive = false,
      target = defaultWindow,
      aliasMap = DefaultMagicKeysAliasMap,
      passive = true,
      onEventFired = shared.noop
    } = options;
    const current = vueDemi.reactive(new Set());
    const obj = {
      toJSON() {
        return {};
      },
      current
    };
    const refs = useReactive ? vueDemi.reactive(obj) : obj;
    const metaDeps = new Set();
    const usedKeys = new Set();
    function setRefs(key, value) {
      if (key in refs) {
        if (useReactive)
          refs[key] = value;
        else
          refs[key].value = value;
      }
    }
    function reset() {
      current.clear();
      for (const key of usedKeys)
        setRefs(key, false);
    }
    function updateRefs(e, value) {
      var _a, _b;
      const key = (_a = e.key) == null ? void 0 : _a.toLowerCase();
      const code = (_b = e.code) == null ? void 0 : _b.toLowerCase();
      const values = [code, key].filter(Boolean);
      if (key) {
        if (value)
          current.add(key);
        else
          current.delete(key);
      }
      for (const key2 of values) {
        usedKeys.add(key2);
        setRefs(key2, value);
      }
      if (key === "meta" && !value) {
        metaDeps.forEach((key2) => {
          current.delete(key2);
          setRefs(key2, false);
        });
        metaDeps.clear();
      } else if (typeof e.getModifierState === "function" && e.getModifierState("Meta") && value) {
        [...current, ...values].forEach((key2) => metaDeps.add(key2));
      }
    }
    useEventListener(target, "keydown", (e) => {
      updateRefs(e, true);
      return onEventFired(e);
    }, { passive });
    useEventListener(target, "keyup", (e) => {
      updateRefs(e, false);
      return onEventFired(e);
    }, { passive });
    useEventListener("blur", reset, { passive: true });
    useEventListener("focus", reset, { passive: true });
    const proxy = new Proxy(refs, {
      get(target2, prop, rec) {
        if (typeof prop !== "string")
          return Reflect.get(target2, prop, rec);
        prop = prop.toLowerCase();
        if (prop in aliasMap)
          prop = aliasMap[prop];
        if (!(prop in refs)) {
          if (/[+_-]/.test(prop)) {
            const keys = prop.split(/[+_-]/g).map((i) => i.trim());
            refs[prop] = vueDemi.computed(() => keys.every((key) => vueDemi.unref(proxy[key])));
          } else {
            refs[prop] = vueDemi.ref(false);
          }
        }
        const r = Reflect.get(target2, prop, rec);
        return useReactive ? vueDemi.unref(r) : r;
      }
    });
    return proxy;
  }

  var __defProp$8 = Object.defineProperty;
  var __getOwnPropSymbols$9 = Object.getOwnPropertySymbols;
  var __hasOwnProp$9 = Object.prototype.hasOwnProperty;
  var __propIsEnum$9 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$8 = (obj, key, value) => key in obj ? __defProp$8(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$8 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$9.call(b, prop))
        __defNormalProp$8(a, prop, b[prop]);
    if (__getOwnPropSymbols$9)
      for (var prop of __getOwnPropSymbols$9(b)) {
        if (__propIsEnum$9.call(b, prop))
          __defNormalProp$8(a, prop, b[prop]);
      }
    return a;
  };
  function usingElRef(source, cb) {
    if (shared.resolveUnref(source))
      cb(shared.resolveUnref(source));
  }
  function timeRangeToArray(timeRanges) {
    let ranges = [];
    for (let i = 0; i < timeRanges.length; ++i)
      ranges = [...ranges, [timeRanges.start(i), timeRanges.end(i)]];
    return ranges;
  }
  function tracksToArray(tracks) {
    return Array.from(tracks).map(({ label, kind, language, mode, activeCues, cues, inBandMetadataTrackDispatchType }, id) => ({ id, label, kind, language, mode, activeCues, cues, inBandMetadataTrackDispatchType }));
  }
  const defaultOptions = {
    src: "",
    tracks: []
  };
  function useMediaControls(target, options = {}) {
    options = __spreadValues$8(__spreadValues$8({}, defaultOptions), options);
    const {
      document = defaultDocument
    } = options;
    const currentTime = vueDemi.ref(0);
    const duration = vueDemi.ref(0);
    const seeking = vueDemi.ref(false);
    const volume = vueDemi.ref(1);
    const waiting = vueDemi.ref(false);
    const ended = vueDemi.ref(false);
    const playing = vueDemi.ref(false);
    const rate = vueDemi.ref(1);
    const stalled = vueDemi.ref(false);
    const buffered = vueDemi.ref([]);
    const tracks = vueDemi.ref([]);
    const selectedTrack = vueDemi.ref(-1);
    const isPictureInPicture = vueDemi.ref(false);
    const muted = vueDemi.ref(false);
    const supportsPictureInPicture = document && "pictureInPictureEnabled" in document;
    const sourceErrorEvent = shared.createEventHook();
    const disableTrack = (track) => {
      usingElRef(target, (el) => {
        if (track) {
          const id = shared.isNumber(track) ? track : track.id;
          el.textTracks[id].mode = "disabled";
        } else {
          for (let i = 0; i < el.textTracks.length; ++i)
            el.textTracks[i].mode = "disabled";
        }
        selectedTrack.value = -1;
      });
    };
    const enableTrack = (track, disableTracks = true) => {
      usingElRef(target, (el) => {
        const id = shared.isNumber(track) ? track : track.id;
        if (disableTracks)
          disableTrack();
        el.textTracks[id].mode = "showing";
        selectedTrack.value = id;
      });
    };
    const togglePictureInPicture = () => {
      return new Promise((resolve, reject) => {
        usingElRef(target, async (el) => {
          if (supportsPictureInPicture) {
            if (!isPictureInPicture.value) {
              el.requestPictureInPicture().then(resolve).catch(reject);
            } else {
              document.exitPictureInPicture().then(resolve).catch(reject);
            }
          }
        });
      });
    };
    vueDemi.watchEffect(() => {
      if (!document)
        return;
      const el = shared.resolveUnref(target);
      if (!el)
        return;
      const src = shared.resolveUnref(options.src);
      let sources = [];
      if (!src)
        return;
      if (shared.isString(src))
        sources = [{ src }];
      else if (Array.isArray(src))
        sources = src;
      else if (shared.isObject(src))
        sources = [src];
      el.querySelectorAll("source").forEach((e) => {
        e.removeEventListener("error", sourceErrorEvent.trigger);
        e.remove();
      });
      sources.forEach(({ src: src2, type }) => {
        const source = document.createElement("source");
        source.setAttribute("src", src2);
        source.setAttribute("type", type || "");
        source.addEventListener("error", sourceErrorEvent.trigger);
        el.appendChild(source);
      });
      el.load();
    });
    shared.tryOnScopeDispose(() => {
      const el = shared.resolveUnref(target);
      if (!el)
        return;
      el.querySelectorAll("source").forEach((e) => e.removeEventListener("error", sourceErrorEvent.trigger));
    });
    vueDemi.watch(volume, (vol) => {
      const el = shared.resolveUnref(target);
      if (!el)
        return;
      el.volume = vol;
    });
    vueDemi.watch(muted, (mute) => {
      const el = shared.resolveUnref(target);
      if (!el)
        return;
      el.muted = mute;
    });
    vueDemi.watch(rate, (rate2) => {
      const el = shared.resolveUnref(target);
      if (!el)
        return;
      el.playbackRate = rate2;
    });
    vueDemi.watchEffect(() => {
      if (!document)
        return;
      const textTracks = shared.resolveUnref(options.tracks);
      const el = shared.resolveUnref(target);
      if (!textTracks || !textTracks.length || !el)
        return;
      el.querySelectorAll("track").forEach((e) => e.remove());
      textTracks.forEach(({ default: isDefault, kind, label, src, srcLang }, i) => {
        const track = document.createElement("track");
        track.default = isDefault || false;
        track.kind = kind;
        track.label = label;
        track.src = src;
        track.srclang = srcLang;
        if (track.default)
          selectedTrack.value = i;
        el.appendChild(track);
      });
    });
    const { ignoreUpdates: ignoreCurrentTimeUpdates } = shared.watchIgnorable(currentTime, (time) => {
      const el = shared.resolveUnref(target);
      if (!el)
        return;
      el.currentTime = time;
    });
    const { ignoreUpdates: ignorePlayingUpdates } = shared.watchIgnorable(playing, (isPlaying) => {
      const el = shared.resolveUnref(target);
      if (!el)
        return;
      isPlaying ? el.play() : el.pause();
    });
    useEventListener(target, "timeupdate", () => ignoreCurrentTimeUpdates(() => currentTime.value = shared.resolveUnref(target).currentTime));
    useEventListener(target, "durationchange", () => duration.value = shared.resolveUnref(target).duration);
    useEventListener(target, "progress", () => buffered.value = timeRangeToArray(shared.resolveUnref(target).buffered));
    useEventListener(target, "seeking", () => seeking.value = true);
    useEventListener(target, "seeked", () => seeking.value = false);
    useEventListener(target, "waiting", () => waiting.value = true);
    useEventListener(target, "playing", () => {
      waiting.value = false;
      ended.value = false;
    });
    useEventListener(target, "ratechange", () => rate.value = shared.resolveUnref(target).playbackRate);
    useEventListener(target, "stalled", () => stalled.value = true);
    useEventListener(target, "ended", () => ended.value = true);
    useEventListener(target, "pause", () => ignorePlayingUpdates(() => playing.value = false));
    useEventListener(target, "play", () => ignorePlayingUpdates(() => playing.value = true));
    useEventListener(target, "enterpictureinpicture", () => isPictureInPicture.value = true);
    useEventListener(target, "leavepictureinpicture", () => isPictureInPicture.value = false);
    useEventListener(target, "volumechange", () => {
      const el = shared.resolveUnref(target);
      if (!el)
        return;
      volume.value = el.volume;
      muted.value = el.muted;
    });
    const listeners = [];
    const stop = vueDemi.watch([target], () => {
      const el = shared.resolveUnref(target);
      if (!el)
        return;
      stop();
      listeners[0] = useEventListener(el.textTracks, "addtrack", () => tracks.value = tracksToArray(el.textTracks));
      listeners[1] = useEventListener(el.textTracks, "removetrack", () => tracks.value = tracksToArray(el.textTracks));
      listeners[2] = useEventListener(el.textTracks, "change", () => tracks.value = tracksToArray(el.textTracks));
    });
    shared.tryOnScopeDispose(() => listeners.forEach((listener) => listener()));
    return {
      currentTime,
      duration,
      waiting,
      seeking,
      ended,
      stalled,
      buffered,
      playing,
      rate,
      volume,
      muted,
      tracks,
      selectedTrack,
      enableTrack,
      disableTrack,
      supportsPictureInPicture,
      togglePictureInPicture,
      isPictureInPicture,
      onSourceError: sourceErrorEvent.on
    };
  }

  const getMapVue2Compat = () => {
    const data = vueDemi.reactive({});
    return {
      get: (key) => data[key],
      set: (key, value) => vueDemi.set(data, key, value),
      has: (key) => shared.hasOwn(data, key),
      delete: (key) => vueDemi.del(data, key),
      clear: () => {
        Object.keys(data).forEach((key) => {
          vueDemi.del(data, key);
        });
      }
    };
  };
  function useMemoize(resolver, options) {
    const initCache = () => {
      if (options == null ? void 0 : options.cache)
        return vueDemi.reactive(options.cache);
      if (vueDemi.isVue2)
        return getMapVue2Compat();
      return vueDemi.reactive(new Map());
    };
    const cache = initCache();
    const generateKey = (...args) => (options == null ? void 0 : options.getKey) ? options.getKey(...args) : JSON.stringify(args);
    const _loadData = (key, ...args) => {
      cache.set(key, resolver(...args));
      return cache.get(key);
    };
    const loadData = (...args) => _loadData(generateKey(...args), ...args);
    const deleteData = (...args) => {
      cache.delete(generateKey(...args));
    };
    const clearData = () => {
      cache.clear();
    };
    const memoized = (...args) => {
      const key = generateKey(...args);
      if (cache.has(key))
        return cache.get(key);
      return _loadData(key, ...args);
    };
    memoized.load = loadData;
    memoized.delete = deleteData;
    memoized.clear = clearData;
    memoized.generateKey = generateKey;
    memoized.cache = cache;
    return memoized;
  }

  function useMemory(options = {}) {
    const memory = vueDemi.ref();
    const isSupported = useSupported(() => typeof performance !== "undefined" && "memory" in performance);
    if (isSupported.value) {
      const { interval = 1e3 } = options;
      shared.useIntervalFn(() => {
        memory.value = performance.memory;
      }, interval, { immediate: options.immediate, immediateCallback: options.immediateCallback });
    }
    return { isSupported, memory };
  }

  function useMounted() {
    const isMounted = vueDemi.ref(false);
    vueDemi.onMounted(() => {
      isMounted.value = true;
    });
    return isMounted;
  }

  function useMouse(options = {}) {
    const {
      type = "page",
      touch = true,
      resetOnTouchEnds = false,
      initialValue = { x: 0, y: 0 },
      window = defaultWindow,
      eventFilter
    } = options;
    const x = vueDemi.ref(initialValue.x);
    const y = vueDemi.ref(initialValue.y);
    const sourceType = vueDemi.ref(null);
    const mouseHandler = (event) => {
      if (type === "page") {
        x.value = event.pageX;
        y.value = event.pageY;
      } else if (type === "client") {
        x.value = event.clientX;
        y.value = event.clientY;
      } else if (type === "movement") {
        x.value = event.movementX;
        y.value = event.movementY;
      }
      sourceType.value = "mouse";
    };
    const reset = () => {
      x.value = initialValue.x;
      y.value = initialValue.y;
    };
    const touchHandler = (event) => {
      if (event.touches.length > 0) {
        const touch2 = event.touches[0];
        if (type === "page") {
          x.value = touch2.pageX;
          y.value = touch2.pageY;
        } else if (type === "client") {
          x.value = touch2.clientX;
          y.value = touch2.clientY;
        }
        sourceType.value = "touch";
      }
    };
    const mouseHandlerWrapper = (event) => {
      return eventFilter === void 0 ? mouseHandler(event) : eventFilter(() => mouseHandler(event), {});
    };
    const touchHandlerWrapper = (event) => {
      return eventFilter === void 0 ? touchHandler(event) : eventFilter(() => touchHandler(event), {});
    };
    if (window) {
      useEventListener(window, "mousemove", mouseHandlerWrapper, { passive: true });
      useEventListener(window, "dragover", mouseHandlerWrapper, { passive: true });
      if (touch && type !== "movement") {
        useEventListener(window, "touchstart", touchHandlerWrapper, { passive: true });
        useEventListener(window, "touchmove", touchHandlerWrapper, { passive: true });
        if (resetOnTouchEnds)
          useEventListener(window, "touchend", reset, { passive: true });
      }
    }
    return {
      x,
      y,
      sourceType
    };
  }

  function useMouseInElement(target, options = {}) {
    const {
      handleOutside = true,
      window = defaultWindow
    } = options;
    const { x, y, sourceType } = useMouse(options);
    const targetRef = vueDemi.ref(target != null ? target : window == null ? void 0 : window.document.body);
    const elementX = vueDemi.ref(0);
    const elementY = vueDemi.ref(0);
    const elementPositionX = vueDemi.ref(0);
    const elementPositionY = vueDemi.ref(0);
    const elementHeight = vueDemi.ref(0);
    const elementWidth = vueDemi.ref(0);
    const isOutside = vueDemi.ref(true);
    let stop = () => {
    };
    if (window) {
      stop = vueDemi.watch([targetRef, x, y], () => {
        const el = unrefElement(targetRef);
        if (!el)
          return;
        const {
          left,
          top,
          width,
          height
        } = el.getBoundingClientRect();
        elementPositionX.value = left + window.pageXOffset;
        elementPositionY.value = top + window.pageYOffset;
        elementHeight.value = height;
        elementWidth.value = width;
        const elX = x.value - elementPositionX.value;
        const elY = y.value - elementPositionY.value;
        isOutside.value = width === 0 || height === 0 || elX < 0 || elY < 0 || elX > width || elY > height;
        if (handleOutside || !isOutside.value) {
          elementX.value = elX;
          elementY.value = elY;
        }
      }, { immediate: true });
      useEventListener(document, "mouseleave", () => {
        isOutside.value = true;
      });
    }
    return {
      x,
      y,
      sourceType,
      elementX,
      elementY,
      elementPositionX,
      elementPositionY,
      elementHeight,
      elementWidth,
      isOutside,
      stop
    };
  }

  function useMousePressed(options = {}) {
    const {
      touch = true,
      drag = true,
      initialValue = false,
      window = defaultWindow
    } = options;
    const pressed = vueDemi.ref(initialValue);
    const sourceType = vueDemi.ref(null);
    if (!window) {
      return {
        pressed,
        sourceType
      };
    }
    const onPressed = (srcType) => () => {
      pressed.value = true;
      sourceType.value = srcType;
    };
    const onReleased = () => {
      pressed.value = false;
      sourceType.value = null;
    };
    const target = vueDemi.computed(() => unrefElement(options.target) || window);
    useEventListener(target, "mousedown", onPressed("mouse"), { passive: true });
    useEventListener(window, "mouseleave", onReleased, { passive: true });
    useEventListener(window, "mouseup", onReleased, { passive: true });
    if (drag) {
      useEventListener(target, "dragstart", onPressed("mouse"), { passive: true });
      useEventListener(window, "drop", onReleased, { passive: true });
      useEventListener(window, "dragend", onReleased, { passive: true });
    }
    if (touch) {
      useEventListener(target, "touchstart", onPressed("touch"), { passive: true });
      useEventListener(window, "touchend", onReleased, { passive: true });
      useEventListener(window, "touchcancel", onReleased, { passive: true });
    }
    return {
      pressed,
      sourceType
    };
  }

  var __getOwnPropSymbols$8 = Object.getOwnPropertySymbols;
  var __hasOwnProp$8 = Object.prototype.hasOwnProperty;
  var __propIsEnum$8 = Object.prototype.propertyIsEnumerable;
  var __objRest$1 = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp$8.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols$8)
      for (var prop of __getOwnPropSymbols$8(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum$8.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  function useMutationObserver(target, callback, options = {}) {
    const _a = options, { window = defaultWindow } = _a, mutationOptions = __objRest$1(_a, ["window"]);
    let observer;
    const isSupported = useSupported(() => window && "MutationObserver" in window);
    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = void 0;
      }
    };
    const stopWatch = vueDemi.watch(() => unrefElement(target), (el) => {
      cleanup();
      if (isSupported.value && window && el) {
        observer = new MutationObserver(callback);
        observer.observe(el, mutationOptions);
      }
    }, { immediate: true });
    const stop = () => {
      cleanup();
      stopWatch();
    };
    shared.tryOnScopeDispose(stop);
    return {
      isSupported,
      stop
    };
  }

  const useNavigatorLanguage = (options = {}) => {
    const { window = defaultWindow } = options;
    const navigator = window == null ? void 0 : window.navigator;
    const isSupported = useSupported(() => navigator && "language" in navigator);
    const language = vueDemi.ref(navigator == null ? void 0 : navigator.language);
    useEventListener(window, "languagechange", () => {
      if (navigator)
        language.value = navigator.language;
    });
    return {
      isSupported,
      language
    };
  };

  function useNetwork(options = {}) {
    const { window = defaultWindow } = options;
    const navigator = window == null ? void 0 : window.navigator;
    const isSupported = useSupported(() => navigator && "connection" in navigator);
    const isOnline = vueDemi.ref(true);
    const saveData = vueDemi.ref(false);
    const offlineAt = vueDemi.ref(void 0);
    const onlineAt = vueDemi.ref(void 0);
    const downlink = vueDemi.ref(void 0);
    const downlinkMax = vueDemi.ref(void 0);
    const rtt = vueDemi.ref(void 0);
    const effectiveType = vueDemi.ref(void 0);
    const type = vueDemi.ref("unknown");
    const connection = isSupported.value && navigator.connection;
    function updateNetworkInformation() {
      if (!navigator)
        return;
      isOnline.value = navigator.onLine;
      offlineAt.value = isOnline.value ? void 0 : Date.now();
      onlineAt.value = isOnline.value ? Date.now() : void 0;
      if (connection) {
        downlink.value = connection.downlink;
        downlinkMax.value = connection.downlinkMax;
        effectiveType.value = connection.effectiveType;
        rtt.value = connection.rtt;
        saveData.value = connection.saveData;
        type.value = connection.type;
      }
    }
    if (window) {
      useEventListener(window, "offline", () => {
        isOnline.value = false;
        offlineAt.value = Date.now();
      });
      useEventListener(window, "online", () => {
        isOnline.value = true;
        onlineAt.value = Date.now();
      });
    }
    if (connection)
      useEventListener(connection, "change", updateNetworkInformation, false);
    updateNetworkInformation();
    return {
      isSupported,
      isOnline,
      saveData,
      offlineAt,
      onlineAt,
      downlink,
      downlinkMax,
      effectiveType,
      rtt,
      type
    };
  }

  var __defProp$7 = Object.defineProperty;
  var __getOwnPropSymbols$7 = Object.getOwnPropertySymbols;
  var __hasOwnProp$7 = Object.prototype.hasOwnProperty;
  var __propIsEnum$7 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$7 = (obj, key, value) => key in obj ? __defProp$7(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$7 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$7.call(b, prop))
        __defNormalProp$7(a, prop, b[prop]);
    if (__getOwnPropSymbols$7)
      for (var prop of __getOwnPropSymbols$7(b)) {
        if (__propIsEnum$7.call(b, prop))
          __defNormalProp$7(a, prop, b[prop]);
      }
    return a;
  };
  function useNow(options = {}) {
    const {
      controls: exposeControls = false,
      interval = "requestAnimationFrame"
    } = options;
    const now = vueDemi.ref(new Date());
    const update = () => now.value = new Date();
    const controls = interval === "requestAnimationFrame" ? useRafFn(update, { immediate: true }) : shared.useIntervalFn(update, interval, { immediate: true });
    if (exposeControls) {
      return __spreadValues$7({
        now
      }, controls);
    } else {
      return now;
    }
  }

  function useObjectUrl(object) {
    const url = vueDemi.ref();
    const release = () => {
      if (url.value)
        URL.revokeObjectURL(url.value);
      url.value = void 0;
    };
    vueDemi.watch(() => vueDemi.unref(object), (newObject) => {
      release();
      if (newObject)
        url.value = URL.createObjectURL(newObject);
    }, { immediate: true });
    shared.tryOnScopeDispose(release);
    return vueDemi.readonly(url);
  }

  function useClamp(value, min, max) {
    if (shared.isFunction(value) || vueDemi.isReadonly(value))
      return vueDemi.computed(() => shared.clamp(shared.resolveUnref(value), shared.resolveUnref(min), shared.resolveUnref(max)));
    const _value = vueDemi.ref(value);
    return vueDemi.computed({
      get() {
        return _value.value = shared.clamp(_value.value, shared.resolveUnref(min), shared.resolveUnref(max));
      },
      set(value2) {
        _value.value = shared.clamp(value2, shared.resolveUnref(min), shared.resolveUnref(max));
      }
    });
  }

  function useOffsetPagination(options) {
    const {
      total = Infinity,
      pageSize = 10,
      page = 1,
      onPageChange = shared.noop,
      onPageSizeChange = shared.noop,
      onPageCountChange = shared.noop
    } = options;
    const currentPageSize = useClamp(pageSize, 1, Infinity);
    const pageCount = vueDemi.computed(() => Math.max(1, Math.ceil(vueDemi.unref(total) / vueDemi.unref(currentPageSize))));
    const currentPage = useClamp(page, 1, pageCount);
    const isFirstPage = vueDemi.computed(() => currentPage.value === 1);
    const isLastPage = vueDemi.computed(() => currentPage.value === pageCount.value);
    if (vueDemi.isRef(page))
      shared.syncRef(page, currentPage);
    if (vueDemi.isRef(pageSize))
      shared.syncRef(pageSize, currentPageSize);
    function prev() {
      currentPage.value--;
    }
    function next() {
      currentPage.value++;
    }
    const returnValue = {
      currentPage,
      currentPageSize,
      pageCount,
      isFirstPage,
      isLastPage,
      prev,
      next
    };
    vueDemi.watch(currentPage, () => {
      onPageChange(vueDemi.reactive(returnValue));
    });
    vueDemi.watch(currentPageSize, () => {
      onPageSizeChange(vueDemi.reactive(returnValue));
    });
    vueDemi.watch(pageCount, () => {
      onPageCountChange(vueDemi.reactive(returnValue));
    });
    return returnValue;
  }

  function useOnline(options = {}) {
    const { isOnline } = useNetwork(options);
    return isOnline;
  }

  function usePageLeave(options = {}) {
    const { window = defaultWindow } = options;
    const isLeft = vueDemi.ref(false);
    const handler = (event) => {
      if (!window)
        return;
      event = event || window.event;
      const from = event.relatedTarget || event.toElement;
      isLeft.value = !from;
    };
    if (window) {
      useEventListener(window, "mouseout", handler, { passive: true });
      useEventListener(window.document, "mouseleave", handler, { passive: true });
      useEventListener(window.document, "mouseenter", handler, { passive: true });
    }
    return isLeft;
  }

  function useParallax(target, options = {}) {
    const {
      deviceOrientationTiltAdjust = (i) => i,
      deviceOrientationRollAdjust = (i) => i,
      mouseTiltAdjust = (i) => i,
      mouseRollAdjust = (i) => i,
      window = defaultWindow
    } = options;
    const orientation = vueDemi.reactive(useDeviceOrientation({ window }));
    const {
      elementX: x,
      elementY: y,
      elementWidth: width,
      elementHeight: height
    } = useMouseInElement(target, { handleOutside: false, window });
    const source = vueDemi.computed(() => {
      if (orientation.isSupported && (orientation.alpha != null && orientation.alpha !== 0 || orientation.gamma != null && orientation.gamma !== 0))
        return "deviceOrientation";
      return "mouse";
    });
    const roll = vueDemi.computed(() => {
      if (source.value === "deviceOrientation") {
        const value = -orientation.beta / 90;
        return deviceOrientationRollAdjust(value);
      } else {
        const value = -(y.value - height.value / 2) / height.value;
        return mouseRollAdjust(value);
      }
    });
    const tilt = vueDemi.computed(() => {
      if (source.value === "deviceOrientation") {
        const value = orientation.gamma / 90;
        return deviceOrientationTiltAdjust(value);
      } else {
        const value = (x.value - width.value / 2) / width.value;
        return mouseTiltAdjust(value);
      }
    });
    return { roll, tilt, source };
  }

  var __defProp$6 = Object.defineProperty;
  var __defProps$1 = Object.defineProperties;
  var __getOwnPropDescs$1 = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols$6 = Object.getOwnPropertySymbols;
  var __hasOwnProp$6 = Object.prototype.hasOwnProperty;
  var __propIsEnum$6 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$6 = (obj, key, value) => key in obj ? __defProp$6(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$6 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$6.call(b, prop))
        __defNormalProp$6(a, prop, b[prop]);
    if (__getOwnPropSymbols$6)
      for (var prop of __getOwnPropSymbols$6(b)) {
        if (__propIsEnum$6.call(b, prop))
          __defNormalProp$6(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps$1 = (a, b) => __defProps$1(a, __getOwnPropDescs$1(b));
  const defaultState = {
    x: 0,
    y: 0,
    pointerId: 0,
    pressure: 0,
    tiltX: 0,
    tiltY: 0,
    width: 0,
    height: 0,
    twist: 0,
    pointerType: null
  };
  const keys = /* @__PURE__ */ Object.keys(defaultState);
  function usePointer(options = {}) {
    const {
      target = defaultWindow
    } = options;
    const isInside = vueDemi.ref(false);
    const state = vueDemi.ref(options.initialValue || {});
    Object.assign(state.value, defaultState, state.value);
    const handler = (event) => {
      isInside.value = true;
      if (options.pointerTypes && !options.pointerTypes.includes(event.pointerType))
        return;
      state.value = shared.objectPick(event, keys, false);
    };
    if (target) {
      useEventListener(target, "pointerdown", handler, { passive: true });
      useEventListener(target, "pointermove", handler, { passive: true });
      useEventListener(target, "pointerleave", () => isInside.value = false, { passive: true });
    }
    return __spreadProps$1(__spreadValues$6({}, shared.toRefs(state)), {
      isInside
    });
  }

  function usePointerLock(target, options = {}) {
    const { document = defaultDocument, pointerLockOptions } = options;
    const isSupported = useSupported(() => document && "pointerLockElement" in document);
    const element = vueDemi.ref();
    const triggerElement = vueDemi.ref();
    let targetElement;
    if (isSupported.value) {
      useEventListener(document, "pointerlockchange", () => {
        var _a;
        const currentElement = (_a = document.pointerLockElement) != null ? _a : element.value;
        if (targetElement && currentElement === targetElement) {
          element.value = document.pointerLockElement;
          if (!element.value)
            targetElement = triggerElement.value = null;
        }
      });
      useEventListener(document, "pointerlockerror", () => {
        var _a;
        const currentElement = (_a = document.pointerLockElement) != null ? _a : element.value;
        if (targetElement && currentElement === targetElement) {
          const action = document.pointerLockElement ? "release" : "acquire";
          throw new Error(`Failed to ${action} pointer lock.`);
        }
      });
    }
    async function lock(e, options2) {
      var _a;
      if (!isSupported.value)
        throw new Error("Pointer Lock API is not supported by your browser.");
      triggerElement.value = e instanceof Event ? e.currentTarget : null;
      targetElement = e instanceof Event ? (_a = unrefElement(target)) != null ? _a : triggerElement.value : unrefElement(e);
      if (!targetElement)
        throw new Error("Target element undefined.");
      targetElement.requestPointerLock(options2 != null ? options2 : pointerLockOptions);
      return await shared.until(element).toBe(targetElement);
    }
    async function unlock() {
      if (!element.value)
        return false;
      document.exitPointerLock();
      await shared.until(element).toBeNull();
      return true;
    }
    return {
      isSupported,
      element,
      triggerElement,
      lock,
      unlock
    };
  }

  exports.SwipeDirection = void 0;
  (function(SwipeDirection2) {
    SwipeDirection2["UP"] = "UP";
    SwipeDirection2["RIGHT"] = "RIGHT";
    SwipeDirection2["DOWN"] = "DOWN";
    SwipeDirection2["LEFT"] = "LEFT";
    SwipeDirection2["NONE"] = "NONE";
  })(exports.SwipeDirection || (exports.SwipeDirection = {}));
  function useSwipe(target, options = {}) {
    const {
      threshold = 50,
      onSwipe,
      onSwipeEnd,
      onSwipeStart,
      passive = true,
      window = defaultWindow
    } = options;
    const coordsStart = vueDemi.reactive({ x: 0, y: 0 });
    const coordsEnd = vueDemi.reactive({ x: 0, y: 0 });
    const diffX = vueDemi.computed(() => coordsStart.x - coordsEnd.x);
    const diffY = vueDemi.computed(() => coordsStart.y - coordsEnd.y);
    const { max, abs } = Math;
    const isThresholdExceeded = vueDemi.computed(() => max(abs(diffX.value), abs(diffY.value)) >= threshold);
    const isSwiping = vueDemi.ref(false);
    const direction = vueDemi.computed(() => {
      if (!isThresholdExceeded.value)
        return exports.SwipeDirection.NONE;
      if (abs(diffX.value) > abs(diffY.value)) {
        return diffX.value > 0 ? exports.SwipeDirection.LEFT : exports.SwipeDirection.RIGHT;
      } else {
        return diffY.value > 0 ? exports.SwipeDirection.UP : exports.SwipeDirection.DOWN;
      }
    });
    const getTouchEventCoords = (e) => [e.touches[0].clientX, e.touches[0].clientY];
    const updateCoordsStart = (x, y) => {
      coordsStart.x = x;
      coordsStart.y = y;
    };
    const updateCoordsEnd = (x, y) => {
      coordsEnd.x = x;
      coordsEnd.y = y;
    };
    let listenerOptions;
    const isPassiveEventSupported = checkPassiveEventSupport(window == null ? void 0 : window.document);
    if (!passive)
      listenerOptions = isPassiveEventSupported ? { passive: false, capture: true } : { capture: true };
    else
      listenerOptions = isPassiveEventSupported ? { passive: true } : { capture: false };
    const onTouchEnd = (e) => {
      if (isSwiping.value)
        onSwipeEnd == null ? void 0 : onSwipeEnd(e, direction.value);
      isSwiping.value = false;
    };
    const stops = [
      useEventListener(target, "touchstart", (e) => {
        if (listenerOptions.capture && !listenerOptions.passive)
          e.preventDefault();
        const [x, y] = getTouchEventCoords(e);
        updateCoordsStart(x, y);
        updateCoordsEnd(x, y);
        onSwipeStart == null ? void 0 : onSwipeStart(e);
      }, listenerOptions),
      useEventListener(target, "touchmove", (e) => {
        const [x, y] = getTouchEventCoords(e);
        updateCoordsEnd(x, y);
        if (!isSwiping.value && isThresholdExceeded.value)
          isSwiping.value = true;
        if (isSwiping.value)
          onSwipe == null ? void 0 : onSwipe(e);
      }, listenerOptions),
      useEventListener(target, "touchend", onTouchEnd, listenerOptions),
      useEventListener(target, "touchcancel", onTouchEnd, listenerOptions)
    ];
    const stop = () => stops.forEach((s) => s());
    return {
      isPassiveEventSupported,
      isSwiping,
      direction,
      coordsStart,
      coordsEnd,
      lengthX: diffX,
      lengthY: diffY,
      stop
    };
  }
  function checkPassiveEventSupport(document) {
    if (!document)
      return false;
    let supportsPassive = false;
    const optionsBlock = {
      get passive() {
        supportsPassive = true;
        return false;
      }
    };
    document.addEventListener("x", shared.noop, optionsBlock);
    document.removeEventListener("x", shared.noop);
    return supportsPassive;
  }

  function usePointerSwipe(target, options = {}) {
    const targetRef = shared.resolveRef(target);
    const {
      threshold = 50,
      onSwipe,
      onSwipeEnd,
      onSwipeStart
    } = options;
    const posStart = vueDemi.reactive({ x: 0, y: 0 });
    const updatePosStart = (x, y) => {
      posStart.x = x;
      posStart.y = y;
    };
    const posEnd = vueDemi.reactive({ x: 0, y: 0 });
    const updatePosEnd = (x, y) => {
      posEnd.x = x;
      posEnd.y = y;
    };
    const distanceX = vueDemi.computed(() => posStart.x - posEnd.x);
    const distanceY = vueDemi.computed(() => posStart.y - posEnd.y);
    const { max, abs } = Math;
    const isThresholdExceeded = vueDemi.computed(() => max(abs(distanceX.value), abs(distanceY.value)) >= threshold);
    const isSwiping = vueDemi.ref(false);
    const isPointerDown = vueDemi.ref(false);
    const direction = vueDemi.computed(() => {
      if (!isThresholdExceeded.value)
        return exports.SwipeDirection.NONE;
      if (abs(distanceX.value) > abs(distanceY.value)) {
        return distanceX.value > 0 ? exports.SwipeDirection.LEFT : exports.SwipeDirection.RIGHT;
      } else {
        return distanceY.value > 0 ? exports.SwipeDirection.UP : exports.SwipeDirection.DOWN;
      }
    });
    const eventIsAllowed = (e) => {
      var _a, _b, _c;
      const isReleasingButton = e.buttons === 0;
      const isPrimaryButton = e.buttons === 1;
      return (_c = (_b = (_a = options.pointerTypes) == null ? void 0 : _a.includes(e.pointerType)) != null ? _b : isReleasingButton || isPrimaryButton) != null ? _c : true;
    };
    const stops = [
      useEventListener(target, "pointerdown", (e) => {
        var _a, _b;
        if (!eventIsAllowed(e))
          return;
        isPointerDown.value = true;
        (_b = (_a = targetRef.value) == null ? void 0 : _a.style) == null ? void 0 : _b.setProperty("touch-action", "none");
        const eventTarget = e.target;
        eventTarget == null ? void 0 : eventTarget.setPointerCapture(e.pointerId);
        const { clientX: x, clientY: y } = e;
        updatePosStart(x, y);
        updatePosEnd(x, y);
        onSwipeStart == null ? void 0 : onSwipeStart(e);
      }),
      useEventListener(target, "pointermove", (e) => {
        if (!eventIsAllowed(e))
          return;
        if (!isPointerDown.value)
          return;
        const { clientX: x, clientY: y } = e;
        updatePosEnd(x, y);
        if (!isSwiping.value && isThresholdExceeded.value)
          isSwiping.value = true;
        if (isSwiping.value)
          onSwipe == null ? void 0 : onSwipe(e);
      }),
      useEventListener(target, "pointerup", (e) => {
        var _a, _b;
        if (!eventIsAllowed(e))
          return;
        if (isSwiping.value)
          onSwipeEnd == null ? void 0 : onSwipeEnd(e, direction.value);
        isPointerDown.value = false;
        isSwiping.value = false;
        (_b = (_a = targetRef.value) == null ? void 0 : _a.style) == null ? void 0 : _b.setProperty("touch-action", "initial");
      })
    ];
    const stop = () => stops.forEach((s) => s());
    return {
      isSwiping: vueDemi.readonly(isSwiping),
      direction: vueDemi.readonly(direction),
      posStart: vueDemi.readonly(posStart),
      posEnd: vueDemi.readonly(posEnd),
      distanceX,
      distanceY,
      stop
    };
  }

  function usePreferredColorScheme(options) {
    const isLight = useMediaQuery("(prefers-color-scheme: light)", options);
    const isDark = useMediaQuery("(prefers-color-scheme: dark)", options);
    return vueDemi.computed(() => {
      if (isDark.value)
        return "dark";
      if (isLight.value)
        return "light";
      return "no-preference";
    });
  }

  function usePreferredContrast(options) {
    const isMore = useMediaQuery("(prefers-contrast: more)", options);
    const isLess = useMediaQuery("(prefers-contrast: less)", options);
    const isCustom = useMediaQuery("(prefers-contrast: custom)", options);
    return vueDemi.computed(() => {
      if (isMore.value)
        return "more";
      if (isLess.value)
        return "less";
      if (isCustom.value)
        return "custom";
      return "no-preference";
    });
  }

  function usePreferredLanguages(options = {}) {
    const { window = defaultWindow } = options;
    if (!window)
      return vueDemi.ref(["en"]);
    const navigator = window.navigator;
    const value = vueDemi.ref(navigator.languages);
    useEventListener(window, "languagechange", () => {
      value.value = navigator.languages;
    });
    return value;
  }

  function usePreferredReducedMotion(options) {
    const isReduced = useMediaQuery("(prefers-reduced-motion: reduce)", options);
    return vueDemi.computed(() => {
      if (isReduced.value)
        return "reduce";
      return "no-preference";
    });
  }

  function usePrevious(value, initialValue) {
    const previous = vueDemi.shallowRef(initialValue);
    vueDemi.watch(shared.resolveRef(value), (_, oldValue) => {
      previous.value = oldValue;
    }, { flush: "sync" });
    return vueDemi.readonly(previous);
  }

  const useScreenOrientation = (options = {}) => {
    const {
      window = defaultWindow
    } = options;
    const isSupported = useSupported(() => window && "screen" in window && "orientation" in window.screen);
    const screenOrientation = isSupported.value ? window.screen.orientation : {};
    const orientation = vueDemi.ref(screenOrientation.type);
    const angle = vueDemi.ref(screenOrientation.angle || 0);
    if (isSupported.value) {
      useEventListener(window, "orientationchange", () => {
        orientation.value = screenOrientation.type;
        angle.value = screenOrientation.angle;
      });
    }
    const lockOrientation = (type) => {
      if (!isSupported.value)
        return Promise.reject(new Error("Not supported"));
      return screenOrientation.lock(type);
    };
    const unlockOrientation = () => {
      if (isSupported.value)
        screenOrientation.unlock();
    };
    return {
      isSupported,
      orientation,
      angle,
      lockOrientation,
      unlockOrientation
    };
  };

  const topVarName = "--vueuse-safe-area-top";
  const rightVarName = "--vueuse-safe-area-right";
  const bottomVarName = "--vueuse-safe-area-bottom";
  const leftVarName = "--vueuse-safe-area-left";
  function useScreenSafeArea() {
    const top = vueDemi.ref("");
    const right = vueDemi.ref("");
    const bottom = vueDemi.ref("");
    const left = vueDemi.ref("");
    if (shared.isClient) {
      const topCssVar = useCssVar(topVarName);
      const rightCssVar = useCssVar(rightVarName);
      const bottomCssVar = useCssVar(bottomVarName);
      const leftCssVar = useCssVar(leftVarName);
      topCssVar.value = "env(safe-area-inset-top, 0px)";
      rightCssVar.value = "env(safe-area-inset-right, 0px)";
      bottomCssVar.value = "env(safe-area-inset-bottom, 0px)";
      leftCssVar.value = "env(safe-area-inset-left, 0px)";
      update();
      useEventListener("resize", shared.useDebounceFn(update));
    }
    function update() {
      top.value = getValue(topVarName);
      right.value = getValue(rightVarName);
      bottom.value = getValue(bottomVarName);
      left.value = getValue(leftVarName);
    }
    return {
      top,
      right,
      bottom,
      left,
      update
    };
  }
  function getValue(position) {
    return getComputedStyle(document.documentElement).getPropertyValue(position);
  }

  function useScriptTag(src, onLoaded = shared.noop, options = {}) {
    const {
      immediate = true,
      manual = false,
      type = "text/javascript",
      async = true,
      crossOrigin,
      referrerPolicy,
      noModule,
      defer,
      document = defaultDocument,
      attrs = {}
    } = options;
    const scriptTag = vueDemi.ref(null);
    let _promise = null;
    const loadScript = (waitForScriptLoad) => new Promise((resolve, reject) => {
      const resolveWithElement = (el2) => {
        scriptTag.value = el2;
        resolve(el2);
        return el2;
      };
      if (!document) {
        resolve(false);
        return;
      }
      let shouldAppend = false;
      let el = document.querySelector(`script[src="${shared.resolveUnref(src)}"]`);
      if (!el) {
        el = document.createElement("script");
        el.type = type;
        el.async = async;
        el.src = shared.resolveUnref(src);
        if (defer)
          el.defer = defer;
        if (crossOrigin)
          el.crossOrigin = crossOrigin;
        if (noModule)
          el.noModule = noModule;
        if (referrerPolicy)
          el.referrerPolicy = referrerPolicy;
        Object.entries(attrs).forEach(([name, value]) => el == null ? void 0 : el.setAttribute(name, value));
        shouldAppend = true;
      } else if (el.hasAttribute("data-loaded")) {
        resolveWithElement(el);
      }
      el.addEventListener("error", (event) => reject(event));
      el.addEventListener("abort", (event) => reject(event));
      el.addEventListener("load", () => {
        el.setAttribute("data-loaded", "true");
        onLoaded(el);
        resolveWithElement(el);
      });
      if (shouldAppend)
        el = document.head.appendChild(el);
      if (!waitForScriptLoad)
        resolveWithElement(el);
    });
    const load = (waitForScriptLoad = true) => {
      if (!_promise)
        _promise = loadScript(waitForScriptLoad);
      return _promise;
    };
    const unload = () => {
      if (!document)
        return;
      _promise = null;
      if (scriptTag.value)
        scriptTag.value = null;
      const el = document.querySelector(`script[src="${shared.resolveUnref(src)}"]`);
      if (el)
        document.head.removeChild(el);
    };
    if (immediate && !manual)
      shared.tryOnMounted(load);
    if (!manual)
      shared.tryOnUnmounted(unload);
    return { scriptTag, load, unload };
  }

  function checkOverflowScroll(ele) {
    const style = window.getComputedStyle(ele);
    if (style.overflowX === "scroll" || style.overflowY === "scroll" || style.overflowX === "auto" && ele.clientHeight < ele.scrollHeight || style.overflowY === "auto" && ele.clientWidth < ele.scrollWidth) {
      return true;
    } else {
      const parent = ele.parentNode;
      if (!parent || parent.tagName === "BODY")
        return false;
      return checkOverflowScroll(parent);
    }
  }
  function preventDefault(rawEvent) {
    const e = rawEvent || window.event;
    const _target = e.target;
    if (checkOverflowScroll(_target))
      return false;
    if (e.touches.length > 1)
      return true;
    if (e.preventDefault)
      e.preventDefault();
    return false;
  }
  function useScrollLock(element, initialState = false) {
    const isLocked = vueDemi.ref(initialState);
    let stopTouchMoveListener = null;
    let initialOverflow;
    vueDemi.watch(shared.resolveRef(element), (el) => {
      if (el) {
        const ele = el;
        initialOverflow = ele.style.overflow;
        if (isLocked.value)
          ele.style.overflow = "hidden";
      }
    }, {
      immediate: true
    });
    const lock = () => {
      const ele = shared.resolveUnref(element);
      if (!ele || isLocked.value)
        return;
      if (shared.isIOS) {
        stopTouchMoveListener = useEventListener(ele, "touchmove", (e) => {
          preventDefault(e);
        }, { passive: false });
      }
      ele.style.overflow = "hidden";
      isLocked.value = true;
    };
    const unlock = () => {
      const ele = shared.resolveUnref(element);
      if (!ele || !isLocked.value)
        return;
      shared.isIOS && (stopTouchMoveListener == null ? void 0 : stopTouchMoveListener());
      ele.style.overflow = initialOverflow;
      isLocked.value = false;
    };
    shared.tryOnScopeDispose(unlock);
    return vueDemi.computed({
      get() {
        return isLocked.value;
      },
      set(v) {
        if (v)
          lock();
        else
          unlock();
      }
    });
  }

  function useSessionStorage(key, initialValue, options = {}) {
    const { window = defaultWindow } = options;
    return useStorage(key, initialValue, window == null ? void 0 : window.sessionStorage, options);
  }

  var __defProp$5 = Object.defineProperty;
  var __getOwnPropSymbols$5 = Object.getOwnPropertySymbols;
  var __hasOwnProp$5 = Object.prototype.hasOwnProperty;
  var __propIsEnum$5 = Object.prototype.propertyIsEnumerable;
  var __defNormalProp$5 = (obj, key, value) => key in obj ? __defProp$5(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues$5 = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp$5.call(b, prop))
        __defNormalProp$5(a, prop, b[prop]);
    if (__getOwnPropSymbols$5)
      for (var prop of __getOwnPropSymbols$5(b)) {
        if (__propIsEnum$5.call(b, prop))
          __defNormalProp$5(a, prop, b[prop]);
      }
    return a;
  };
  function useShare(shareOptions = {}, options = {}) {
    const { navigator = defaultNavigator } = options;
    const _navigator = navigator;
    const isSupported = useSupported(() => _navigator && "canShare" in _navigator);
    const share = async (overrideOptions = {}) => {
      if (isSupported.value) {
        const data = __spreadValues$5(__spreadValues$5({}, shared.resolveUnref(shareOptions)), shared.resolveUnref(overrideOptions));
        let granted = true;
        if (data.files && _navigator.canShare)
          granted = _navigator.canShare({ files: data.files });
        if (granted)
          return _navigator.share(data);
      }
    };
    return {
      isSupported,
      share
    };
  }

  const defaultSortFn = (source, compareFn) => source.sort(compareFn);
  const defaultCompare = (a, b) => a - b;
  function useSorted(...args) {
    var _a, _b, _c, _d;
    const [source] = args;
    let compareFn = defaultCompare;
    let options = {};
    if (args.length === 2) {
      if (typeof args[1] === "object") {
        options = args[1];
        compareFn = (_a = options.compareFn) != null ? _a : defaultCompare;
      } else {
        compareFn = (_b = args[1]) != null ? _b : defaultCompare;
      }
    } else if (args.length > 2) {
      compareFn = (_c = args[1]) != null ? _c : defaultCompare;
      options = (_d = args[2]) != null ? _d : {};
    }
    const {
      dirty = false,
      sortFn = defaultSortFn
    } = options;
    if (!dirty)
      return vueDemi.computed(() => sortFn([...vueDemi.unref(source)], compareFn));
    vueDemi.watchEffect(() => {
      const result = sortFn(vueDemi.unref(source), compareFn);
      if (vueDemi.isRef(source))
        source.value = result;
      else
        source.splice(0, source.length, ...result);
    });
    return source;
  }

  function useSpeechRecognition(options = {}) {
    const {
      interimResults = true,
      continuous = true,
      window = defaultWindow
    } = options;
    const lang = shared.resolveRef(options.lang || "en-US");
    const isListening = vueDemi.ref(false);
    const isFinal = vueDemi.ref(false);
    const result = vueDemi.ref("");
    const error = vueDemi.shallowRef(void 0);
    const toggle = (value = !isListening.value) => {
      isListening.value = value;
    };
    const start = () => {
      isListening.value = true;
    };
    const stop = () => {
      isListening.value = false;
    };
    const SpeechRecognition = window && (window.SpeechRecognition || window.webkitSpeechRecognition);
    const isSupported = useSupported(() => SpeechRecognition);
    let recognition;
    if (isSupported.value) {
      recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = vueDemi.unref(lang);
      recognition.onstart = () => {
        isFinal.value = false;
      };
      vueDemi.watch(lang, (lang2) => {
        if (recognition && !isListening.value)
          recognition.lang = lang2;
      });
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map((result2) => {
          isFinal.value = result2.isFinal;
          return result2[0];
        }).map((result2) => result2.transcript).join("");
        result.value = transcript;
        error.value = void 0;
      };
      recognition.onerror = (event) => {
        error.value = event;
      };
      recognition.onend = () => {
        isListening.value = false;
        recognition.lang = vueDemi.unref(lang);
      };
      vueDemi.watch(isListening, () => {
        if (isListening.value)
          recognition.start();
        else
          recognition.stop();
      });
    }
    shared.tryOnScopeDispose(() => {
      isListening.value = false;
    });
    return {
      isSupported,
      isListening,
      isFinal,
      recognition,
      result,
      error,
      toggle,
      start,
      stop
    };
  }

  function useSpeechSynthesis(text, options = {}) {
    const {
      pitch = 1,
      rate = 1,
      volume = 1,
      window = defaultWindow
    } = options;
    const synth = window && window.speechSynthesis;
    const isSupported = useSupported(() => synth);
    const isPlaying = vueDemi.ref(false);
    const status = vueDemi.ref("init");
    const spokenText = shared.resolveRef(text || "");
    const lang = shared.resolveRef(options.lang || "en-US");
    const error = vueDemi.shallowRef(void 0);
    const toggle = (value = !isPlaying.value) => {
      isPlaying.value = value;
    };
    const bindEventsForUtterance = (utterance2) => {
      utterance2.lang = vueDemi.unref(lang);
      utterance2.voice = vueDemi.unref(options.voice) || null;
      utterance2.pitch = pitch;
      utterance2.rate = rate;
      utterance2.volume = volume;
      utterance2.onstart = () => {
        isPlaying.value = true;
        status.value = "play";
      };
      utterance2.onpause = () => {
        isPlaying.value = false;
        status.value = "pause";
      };
      utterance2.onresume = () => {
        isPlaying.value = true;
        status.value = "play";
      };
      utterance2.onend = () => {
        isPlaying.value = false;
        status.value = "end";
      };
      utterance2.onerror = (event) => {
        error.value = event;
      };
    };
    const utterance = vueDemi.computed(() => {
      isPlaying.value = false;
      status.value = "init";
      const newUtterance = new SpeechSynthesisUtterance(spokenText.value);
      bindEventsForUtterance(newUtterance);
      return newUtterance;
    });
    const speak = () => {
      synth.cancel();
      utterance && synth.speak(utterance.value);
    };
    const stop = () => {
      synth.cancel();
      isPlaying.value = false;
    };
    if (isSupported.value) {
      bindEventsForUtterance(utterance.value);
      vueDemi.watch(lang, (lang2) => {
        if (utterance.value && !isPlaying.value)
          utterance.value.lang = lang2;
      });
      if (options.voice) {
        vueDemi.watch(options.voice, () => {
          synth.cancel();
        });
      }
      vueDemi.watch(isPlaying, () => {
        if (isPlaying.value)
          synth.resume();
        else
          synth.pause();
      });
    }
    shared.tryOnScopeDispose(() => {
      isPlaying.value = false;
    });
    return {
      isSupported,
      isPlaying,
      status,
      utterance,
      error,
      stop,
      toggle,
      speak
    };
  }

  function useStepper(steps, initialStep) {
    const stepsRef = vueDemi.ref(steps);
    const stepNames = vueDemi.computed(() => Array.isArray(stepsRef.value) ? stepsRef.value : Object.keys(stepsRef.value));
    const index = vueDemi.ref(stepNames.value.indexOf(initialStep != null ? initialStep : stepNames.value[0]));
    const current = vueDemi.computed(() => at(index.value));
    const isFirst = vueDemi.computed(() => index.value === 0);
    const isLast = vueDemi.computed(() => index.value === stepNames.value.length - 1);
    const next = vueDemi.computed(() => stepNames.value[index.value + 1]);
    const previous = vueDemi.computed(() => stepNames.value[index.value - 1]);
    function at(index2) {
      if (Array.isArray(stepsRef.value))
        return stepsRef.value[index2];
      return stepsRef.value[stepNames.value[index2]];
    }
    function get(step) {
      if (!stepNames.value.includes(step))
        return;
      return at(stepNames.value.indexOf(step));
    }
    function goTo(step) {
      if (stepNames.value.includes(step))
        index.value = stepNames.value.indexOf(step);
    }
    function goToNext() {
      if (isLast.value)
        return;
      index.value++;
    }
    function goToPrevious() {
      if (isFirst.value)
        return;
      index.value--;
    }
    function goBackTo(step) {
      if (isAfter(step))
        goTo(step);
    }
    function isNext(step) {
      return stepNames.value.indexOf(step) === index.value + 1;
    }
    function isPrevious(step) {
      return stepNames.value.indexOf(step) === index.value - 1;
    }
    function isCurrent(step) {
      return stepNames.value.indexOf(step) === index.value;
    }
    function isBefore(step) {
      return index.value < stepNames.value.indexOf(step);
    }
    function isAfter(step) {
      return index.value > stepNames.value.indexOf(step);
    }
    return {
      steps: stepsRef,
      stepNames,
      index,
      current,
      next,
      previous,
      isFirst,
      isLast,
      at,
      get,
      goTo,
      goToNext,
      goToPrevious,
      goBackTo,
      isNext,
      isPrevious,
      isCurrent,
      isBefore,
      isAfter
    };
  }

  var __defProp$4 = Object.defineProperty;
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
  function useStorageAsync(key, initialValue, storage, options = {}) {
    var _a;
    const {
      flush = "pre",
      deep = true,
      listenToStorageChanges = true,
      writeDefaults = true,
      mergeDefaults = false,
      shallow,
      window = defaultWindow,
      eventFilter,
      onError = (e) => {
        console.error(e);
      }
    } = options;
    const rawInit = shared.resolveUnref(initialValue);
    const type = guessSerializerType(rawInit);
    const data = (shallow ? vueDemi.shallowRef : vueDemi.ref)(initialValue);
    const serializer = (_a = options.serializer) != null ? _a : StorageSerializers[type];
    if (!storage) {
      try {
        storage = getSSRHandler("getDefaultStorage", () => {
          var _a2;
          return (_a2 = defaultWindow) == null ? void 0 : _a2.localStorage;
        })();
      } catch (e) {
        onError(e);
      }
    }
    async function read(event) {
      if (!storage || event && event.key !== key)
        return;
      try {
        const rawValue = event ? event.newValue : await storage.getItem(key);
        if (rawValue == null) {
          data.value = rawInit;
          if (writeDefaults && rawInit !== null)
            await storage.setItem(key, await serializer.write(rawInit));
        } else if (mergeDefaults) {
          const value = await serializer.read(rawValue);
          if (shared.isFunction(mergeDefaults))
            data.value = mergeDefaults(value, rawInit);
          else if (type === "object" && !Array.isArray(value))
            data.value = __spreadValues$4(__spreadValues$4({}, rawInit), value);
          else
            data.value = value;
        } else {
          data.value = await serializer.read(rawValue);
        }
      } catch (e) {
        onError(e);
      }
    }
    read();
    if (window && listenToStorageChanges)
      useEventListener(window, "storage", (e) => setTimeout(() => read(e), 0));
    if (storage) {
      shared.watchWithFilter(data, async () => {
        try {
          if (data.value == null)
            await storage.removeItem(key);
          else
            await storage.setItem(key, await serializer.write(data.value));
        } catch (e) {
          onError(e);
        }
      }, {
        flush,
        deep,
        eventFilter
      });
    }
    return data;
  }

  let _id = 0;
  function useStyleTag(css, options = {}) {
    const isLoaded = vueDemi.ref(false);
    const {
      document = defaultDocument,
      immediate = true,
      manual = false,
      id = `vueuse_styletag_${++_id}`
    } = options;
    const cssRef = vueDemi.ref(css);
    let stop = () => {
    };
    const load = () => {
      if (!document)
        return;
      const el = document.getElementById(id) || document.createElement("style");
      if (!el.isConnected) {
        el.type = "text/css";
        el.id = id;
        if (options.media)
          el.media = options.media;
        document.head.appendChild(el);
      }
      if (isLoaded.value)
        return;
      stop = vueDemi.watch(cssRef, (value) => {
        el.textContent = value;
      }, { immediate: true });
      isLoaded.value = true;
    };
    const unload = () => {
      if (!document || !isLoaded.value)
        return;
      stop();
      document.head.removeChild(document.getElementById(id));
      isLoaded.value = false;
    };
    if (immediate && !manual)
      shared.tryOnMounted(load);
    if (!manual)
      shared.tryOnScopeDispose(unload);
    return {
      id,
      css: cssRef,
      unload,
      load,
      isLoaded: vueDemi.readonly(isLoaded)
    };
  }

  function useTemplateRefsList() {
    const refs = vueDemi.ref([]);
    refs.value.set = (el) => {
      if (el)
        refs.value.push(el);
    };
    vueDemi.onBeforeUpdate(() => {
      refs.value.length = 0;
    });
    return refs;
  }

  function useTextDirection(options = {}) {
    const {
      document = defaultDocument,
      selector = "html",
      observe = false,
      initialValue = "ltr"
    } = options;
    function getValue() {
      var _a, _b;
      return (_b = (_a = document == null ? void 0 : document.querySelector(selector)) == null ? void 0 : _a.getAttribute("dir")) != null ? _b : initialValue;
    }
    const dir = vueDemi.ref(getValue());
    shared.tryOnMounted(() => dir.value = getValue());
    if (observe && document) {
      useMutationObserver(document.querySelector(selector), () => dir.value = getValue(), { attributes: true });
    }
    return vueDemi.computed({
      get() {
        return dir.value;
      },
      set(v) {
        var _a, _b;
        dir.value = v;
        if (!document)
          return;
        if (dir.value)
          (_a = document.querySelector(selector)) == null ? void 0 : _a.setAttribute("dir", dir.value);
        else
          (_b = document.querySelector(selector)) == null ? void 0 : _b.removeAttribute("dir");
      }
    });
  }

  function getRangesFromSelection(selection) {
    var _a;
    const rangeCount = (_a = selection.rangeCount) != null ? _a : 0;
    const ranges = new Array(rangeCount);
    for (let i = 0; i < rangeCount; i++) {
      const range = selection.getRangeAt(i);
      ranges[i] = range;
    }
    return ranges;
  }
  function useTextSelection(options = {}) {
    const {
      window = defaultWindow
    } = options;
    const selection = vueDemi.ref(null);
    const text = vueDemi.computed(() => {
      var _a, _b;
      return (_b = (_a = selection.value) == null ? void 0 : _a.toString()) != null ? _b : "";
    });
    const ranges = vueDemi.computed(() => selection.value ? getRangesFromSelection(selection.value) : []);
    const rects = vueDemi.computed(() => ranges.value.map((range) => range.getBoundingClientRect()));
    function onSelectionChange() {
      selection.value = null;
      if (window)
        selection.value = window.getSelection();
    }
    if (window)
      useEventListener(window.document, "selectionchange", onSelectionChange);
    return {
      text,
      rects,
      ranges,
      selection
    };
  }

  function useTextareaAutosize(options) {
    const textarea = vueDemi.ref(options == null ? void 0 : options.element);
    const input = vueDemi.ref(options == null ? void 0 : options.input);
    function triggerResize() {
      var _a, _b;
      if (!textarea.value)
        return;
      textarea.value.style.height = "1px";
      textarea.value.style.height = `${(_a = textarea.value) == null ? void 0 : _a.scrollHeight}px`;
      (_b = options == null ? void 0 : options.onResize) == null ? void 0 : _b.call(options);
    }
    vueDemi.watch([input, textarea], triggerResize, { immediate: true });
    useResizeObserver(textarea, () => triggerResize());
    if (options == null ? void 0 : options.watch)
      vueDemi.watch(options.watch, triggerResize, { immediate: true, deep: true });
    return {
      textarea,
      input,
      triggerResize
    };
  }

  var __defProp$3 = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  function useThrottledRefHistory(source, options = {}) {
    const { throttle = 200, trailing = true } = options;
    const filter = shared.throttleFilter(throttle, trailing);
    const history = useRefHistory(source, __spreadProps(__spreadValues$3({}, options), { eventFilter: filter }));
    return __spreadValues$3({}, history);
  }

  var __defProp$2 = Object.defineProperty;
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
  var __objRest = (source, exclude) => {
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
  const DEFAULT_UNITS = [
    { max: 6e4, value: 1e3, name: "second" },
    { max: 276e4, value: 6e4, name: "minute" },
    { max: 72e6, value: 36e5, name: "hour" },
    { max: 5184e5, value: 864e5, name: "day" },
    { max: 24192e5, value: 6048e5, name: "week" },
    { max: 28512e6, value: 2592e6, name: "month" },
    { max: Infinity, value: 31536e6, name: "year" }
  ];
  const DEFAULT_MESSAGES = {
    justNow: "just now",
    past: (n) => n.match(/\d/) ? `${n} ago` : n,
    future: (n) => n.match(/\d/) ? `in ${n}` : n,
    month: (n, past) => n === 1 ? past ? "last month" : "next month" : `${n} month${n > 1 ? "s" : ""}`,
    year: (n, past) => n === 1 ? past ? "last year" : "next year" : `${n} year${n > 1 ? "s" : ""}`,
    day: (n, past) => n === 1 ? past ? "yesterday" : "tomorrow" : `${n} day${n > 1 ? "s" : ""}`,
    week: (n, past) => n === 1 ? past ? "last week" : "next week" : `${n} week${n > 1 ? "s" : ""}`,
    hour: (n) => `${n} hour${n > 1 ? "s" : ""}`,
    minute: (n) => `${n} minute${n > 1 ? "s" : ""}`,
    second: (n) => `${n} second${n > 1 ? "s" : ""}`,
    invalid: ""
  };
  const DEFAULT_FORMATTER = (date) => date.toISOString().slice(0, 10);
  function useTimeAgo(time, options = {}) {
    const {
      controls: exposeControls = false,
      updateInterval = 3e4
    } = options;
    const _a = useNow({ interval: updateInterval, controls: true }), { now } = _a, controls = __objRest(_a, ["now"]);
    const timeAgo = vueDemi.computed(() => formatTimeAgo(new Date(shared.resolveUnref(time)), options, vueDemi.unref(now.value)));
    if (exposeControls) {
      return __spreadValues$2({
        timeAgo
      }, controls);
    } else {
      return timeAgo;
    }
  }
  function formatTimeAgo(from, options = {}, now = Date.now()) {
    var _a;
    const {
      max,
      messages = DEFAULT_MESSAGES,
      fullDateFormatter = DEFAULT_FORMATTER,
      units = DEFAULT_UNITS,
      showSecond = false,
      rounding = "round"
    } = options;
    const roundFn = typeof rounding === "number" ? (n) => +n.toFixed(rounding) : Math[rounding];
    const diff = +now - +from;
    const absDiff = Math.abs(diff);
    function getValue(diff2, unit) {
      return roundFn(Math.abs(diff2) / unit.value);
    }
    function format(diff2, unit) {
      const val = getValue(diff2, unit);
      const past = diff2 > 0;
      const str = applyFormat(unit.name, val, past);
      return applyFormat(past ? "past" : "future", str, past);
    }
    function applyFormat(name, val, isPast) {
      const formatter = messages[name];
      if (typeof formatter === "function")
        return formatter(val, isPast);
      return formatter.replace("{0}", val.toString());
    }
    if (absDiff < 6e4 && !showSecond)
      return messages.justNow;
    if (typeof max === "number" && absDiff > max)
      return fullDateFormatter(new Date(from));
    if (typeof max === "string") {
      const unitMax = (_a = units.find((i) => i.name === max)) == null ? void 0 : _a.max;
      if (unitMax && absDiff > unitMax)
        return fullDateFormatter(new Date(from));
    }
    for (const [idx, unit] of units.entries()) {
      const val = getValue(diff, unit);
      if (val <= 0 && units[idx - 1])
        return format(diff, units[idx - 1]);
      if (absDiff < unit.max)
        return format(diff, unit);
    }
    return messages.invalid;
  }

  function useTimeoutPoll(fn, interval, timeoutPollOptions) {
    const { start } = shared.useTimeoutFn(loop, interval);
    const isActive = vueDemi.ref(false);
    async function loop() {
      if (!isActive.value)
        return;
      await fn();
      start();
    }
    function resume() {
      if (!isActive.value) {
        isActive.value = true;
        loop();
      }
    }
    function pause() {
      isActive.value = false;
    }
    if (timeoutPollOptions == null ? void 0 : timeoutPollOptions.immediate)
      resume();
    shared.tryOnScopeDispose(pause);
    return {
      isActive,
      pause,
      resume
    };
  }

  var __defProp$1 = Object.defineProperty;
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
  function useTimestamp(options = {}) {
    const {
      controls: exposeControls = false,
      offset = 0,
      immediate = true,
      interval = "requestAnimationFrame",
      callback
    } = options;
    const ts = vueDemi.ref(shared.timestamp() + offset);
    const update = () => ts.value = shared.timestamp() + offset;
    const cb = callback ? () => {
      update();
      callback(ts.value);
    } : update;
    const controls = interval === "requestAnimationFrame" ? useRafFn(cb, { immediate }) : shared.useIntervalFn(cb, interval, { immediate });
    if (exposeControls) {
      return __spreadValues$1({
        timestamp: ts
      }, controls);
    } else {
      return ts;
    }
  }

  function useTitle(newTitle = null, options = {}) {
    var _a, _b;
    const {
      document = defaultDocument
    } = options;
    const title = shared.resolveRef((_a = newTitle != null ? newTitle : document == null ? void 0 : document.title) != null ? _a : null);
    const isReadonly = newTitle && shared.isFunction(newTitle);
    function format(t) {
      if (!("titleTemplate" in options))
        return t;
      const template = options.titleTemplate || "%s";
      return shared.isFunction(template) ? template(t) : vueDemi.unref(template).replace(/%s/g, t);
    }
    vueDemi.watch(title, (t, o) => {
      if (t !== o && document)
        document.title = format(shared.isString(t) ? t : "");
    }, { immediate: true });
    if (options.observe && !options.titleTemplate && document && !isReadonly) {
      useMutationObserver((_b = document.head) == null ? void 0 : _b.querySelector("title"), () => {
        if (document && document.title !== title.value)
          title.value = format(document.title);
      }, { childList: true });
    }
    return title;
  }

  var __defProp = Object.defineProperty;
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
  const _TransitionPresets = {
    easeInSine: [0.12, 0, 0.39, 0],
    easeOutSine: [0.61, 1, 0.88, 1],
    easeInOutSine: [0.37, 0, 0.63, 1],
    easeInQuad: [0.11, 0, 0.5, 0],
    easeOutQuad: [0.5, 1, 0.89, 1],
    easeInOutQuad: [0.45, 0, 0.55, 1],
    easeInCubic: [0.32, 0, 0.67, 0],
    easeOutCubic: [0.33, 1, 0.68, 1],
    easeInOutCubic: [0.65, 0, 0.35, 1],
    easeInQuart: [0.5, 0, 0.75, 0],
    easeOutQuart: [0.25, 1, 0.5, 1],
    easeInOutQuart: [0.76, 0, 0.24, 1],
    easeInQuint: [0.64, 0, 0.78, 0],
    easeOutQuint: [0.22, 1, 0.36, 1],
    easeInOutQuint: [0.83, 0, 0.17, 1],
    easeInExpo: [0.7, 0, 0.84, 0],
    easeOutExpo: [0.16, 1, 0.3, 1],
    easeInOutExpo: [0.87, 0, 0.13, 1],
    easeInCirc: [0.55, 0, 1, 0.45],
    easeOutCirc: [0, 0.55, 0.45, 1],
    easeInOutCirc: [0.85, 0, 0.15, 1],
    easeInBack: [0.36, 0, 0.66, -0.56],
    easeOutBack: [0.34, 1.56, 0.64, 1],
    easeInOutBack: [0.68, -0.6, 0.32, 1.6]
  };
  const TransitionPresets = __spreadValues({
    linear: shared.identity
  }, _TransitionPresets);
  function createEasingFunction([p0, p1, p2, p3]) {
    const a = (a1, a2) => 1 - 3 * a2 + 3 * a1;
    const b = (a1, a2) => 3 * a2 - 6 * a1;
    const c = (a1) => 3 * a1;
    const calcBezier = (t, a1, a2) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
    const getSlope = (t, a1, a2) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);
    const getTforX = (x) => {
      let aGuessT = x;
      for (let i = 0; i < 4; ++i) {
        const currentSlope = getSlope(aGuessT, p0, p2);
        if (currentSlope === 0)
          return aGuessT;
        const currentX = calcBezier(aGuessT, p0, p2) - x;
        aGuessT -= currentX / currentSlope;
      }
      return aGuessT;
    };
    return (x) => p0 === p1 && p2 === p3 ? x : calcBezier(getTforX(x), p1, p3);
  }
  function useTransition(source, options = {}) {
    const {
      delay = 0,
      disabled = false,
      duration = 1e3,
      onFinished = shared.noop,
      onStarted = shared.noop,
      transition = shared.identity
    } = options;
    const currentTransition = vueDemi.computed(() => {
      const t = vueDemi.unref(transition);
      return shared.isFunction(t) ? t : createEasingFunction(t);
    });
    const sourceValue = vueDemi.computed(() => {
      const s = vueDemi.unref(source);
      return shared.isNumber(s) ? s : s.map(vueDemi.unref);
    });
    const sourceVector = vueDemi.computed(() => shared.isNumber(sourceValue.value) ? [sourceValue.value] : sourceValue.value);
    const outputVector = vueDemi.ref(sourceVector.value.slice(0));
    let currentDuration;
    let diffVector;
    let endAt;
    let startAt;
    let startVector;
    const { resume, pause } = useRafFn(() => {
      const now = Date.now();
      const progress = shared.clamp(1 - (endAt - now) / currentDuration, 0, 1);
      outputVector.value = startVector.map((val, i) => {
        var _a;
        return val + ((_a = diffVector[i]) != null ? _a : 0) * currentTransition.value(progress);
      });
      if (progress >= 1) {
        pause();
        onFinished();
      }
    }, { immediate: false });
    const start = () => {
      pause();
      currentDuration = vueDemi.unref(duration);
      diffVector = outputVector.value.map((n, i) => {
        var _a, _b;
        return ((_a = sourceVector.value[i]) != null ? _a : 0) - ((_b = outputVector.value[i]) != null ? _b : 0);
      });
      startVector = outputVector.value.slice(0);
      startAt = Date.now();
      endAt = startAt + currentDuration;
      resume();
      onStarted();
    };
    const timeout = shared.useTimeoutFn(start, delay, { immediate: false });
    vueDemi.watch(sourceVector, () => {
      if (vueDemi.unref(disabled))
        return;
      if (vueDemi.unref(delay) <= 0)
        start();
      else
        timeout.start();
    }, { deep: true });
    vueDemi.watch(() => vueDemi.unref(disabled), (v) => {
      if (v) {
        outputVector.value = sourceVector.value.slice(0);
        pause();
      }
    });
    return vueDemi.computed(() => {
      const targetVector = vueDemi.unref(disabled) ? sourceVector : outputVector;
      return shared.isNumber(sourceValue.value) ? targetVector.value[0] : targetVector.value;
    });
  }

  function useUrlSearchParams(mode = "history", options = {}) {
    const {
      initialValue = {},
      removeNullishValues = true,
      removeFalsyValues = false,
      write: enableWrite = true,
      window = defaultWindow
    } = options;
    if (!window)
      return vueDemi.reactive(initialValue);
    const state = vueDemi.reactive({});
    function getRawParams() {
      if (mode === "history") {
        return window.location.search || "";
      } else if (mode === "hash") {
        const hash = window.location.hash || "";
        const index = hash.indexOf("?");
        return index > 0 ? hash.slice(index) : "";
      } else {
        return (window.location.hash || "").replace(/^#/, "");
      }
    }
    function constructQuery(params) {
      const stringified = params.toString();
      if (mode === "history")
        return `${stringified ? `?${stringified}` : ""}${window.location.hash || ""}`;
      if (mode === "hash-params")
        return `${window.location.search || ""}${stringified ? `#${stringified}` : ""}`;
      const hash = window.location.hash || "#";
      const index = hash.indexOf("?");
      if (index > 0)
        return `${hash.slice(0, index)}${stringified ? `?${stringified}` : ""}`;
      return `${hash}${stringified ? `?${stringified}` : ""}`;
    }
    function read() {
      return new URLSearchParams(getRawParams());
    }
    function updateState(params) {
      const unusedKeys = new Set(Object.keys(state));
      for (const key of params.keys()) {
        const paramsForKey = params.getAll(key);
        state[key] = paramsForKey.length > 1 ? paramsForKey : params.get(key) || "";
        unusedKeys.delete(key);
      }
      Array.from(unusedKeys).forEach((key) => delete state[key]);
    }
    const { pause, resume } = shared.pausableWatch(state, () => {
      const params = new URLSearchParams("");
      Object.keys(state).forEach((key) => {
        const mapEntry = state[key];
        if (Array.isArray(mapEntry))
          mapEntry.forEach((value) => params.append(key, value));
        else if (removeNullishValues && mapEntry == null)
          params.delete(key);
        else if (removeFalsyValues && !mapEntry)
          params.delete(key);
        else
          params.set(key, mapEntry);
      });
      write(params);
    }, { deep: true });
    function write(params, shouldUpdate) {
      pause();
      if (shouldUpdate)
        updateState(params);
      window.history.replaceState(window.history.state, window.document.title, window.location.pathname + constructQuery(params));
      resume();
    }
    function onChanged() {
      if (!enableWrite)
        return;
      write(read(), true);
    }
    useEventListener(window, "popstate", onChanged, false);
    if (mode !== "history")
      useEventListener(window, "hashchange", onChanged, false);
    const initial = read();
    if (initial.keys().next().value)
      updateState(initial);
    else
      Object.assign(state, initialValue);
    return state;
  }

  function useUserMedia(options = {}) {
    var _a, _b;
    const enabled = vueDemi.ref((_a = options.enabled) != null ? _a : false);
    const autoSwitch = vueDemi.ref((_b = options.autoSwitch) != null ? _b : true);
    const videoDeviceId = vueDemi.ref(options.videoDeviceId);
    const audioDeviceId = vueDemi.ref(options.audioDeviceId);
    const { navigator = defaultNavigator } = options;
    const isSupported = useSupported(() => {
      var _a2;
      return (_a2 = navigator == null ? void 0 : navigator.mediaDevices) == null ? void 0 : _a2.getUserMedia;
    });
    const stream = vueDemi.shallowRef();
    function getDeviceOptions(device) {
      if (device.value === "none" || device.value === false)
        return false;
      if (device.value == null)
        return true;
      return {
        deviceId: device.value
      };
    }
    async function _start() {
      if (!isSupported.value || stream.value)
        return;
      stream.value = await navigator.mediaDevices.getUserMedia({
        video: getDeviceOptions(videoDeviceId),
        audio: getDeviceOptions(audioDeviceId)
      });
      return stream.value;
    }
    async function _stop() {
      var _a2;
      (_a2 = stream.value) == null ? void 0 : _a2.getTracks().forEach((t) => t.stop());
      stream.value = void 0;
    }
    function stop() {
      _stop();
      enabled.value = false;
    }
    async function start() {
      await _start();
      if (stream.value)
        enabled.value = true;
      return stream.value;
    }
    async function restart() {
      _stop();
      return await start();
    }
    vueDemi.watch(enabled, (v) => {
      if (v)
        _start();
      else
        _stop();
    }, { immediate: true });
    vueDemi.watch([videoDeviceId, audioDeviceId], () => {
      if (autoSwitch.value && stream.value)
        restart();
    }, { immediate: true });
    return {
      isSupported,
      stream,
      start,
      stop,
      restart,
      videoDeviceId,
      audioDeviceId,
      enabled,
      autoSwitch
    };
  }

  function useVModel(props, key, emit, options = {}) {
    var _a, _b, _c, _d, _e;
    const {
      clone = false,
      passive = false,
      eventName,
      deep = false,
      defaultValue
    } = options;
    const vm = vueDemi.getCurrentInstance();
    const _emit = emit || (vm == null ? void 0 : vm.emit) || ((_a = vm == null ? void 0 : vm.$emit) == null ? void 0 : _a.bind(vm)) || ((_c = (_b = vm == null ? void 0 : vm.proxy) == null ? void 0 : _b.$emit) == null ? void 0 : _c.bind(vm == null ? void 0 : vm.proxy));
    let event = eventName;
    if (!key) {
      if (vueDemi.isVue2) {
        const modelOptions = (_e = (_d = vm == null ? void 0 : vm.proxy) == null ? void 0 : _d.$options) == null ? void 0 : _e.model;
        key = (modelOptions == null ? void 0 : modelOptions.value) || "value";
        if (!eventName)
          event = (modelOptions == null ? void 0 : modelOptions.event) || "input";
      } else {
        key = "modelValue";
      }
    }
    event = eventName || event || `update:${key.toString()}`;
    const cloneFn = (val) => !clone ? val : shared.isFunction(clone) ? clone(val) : cloneFnJSON(val);
    const getValue = () => shared.isDef(props[key]) ? cloneFn(props[key]) : defaultValue;
    if (passive) {
      const initialValue = getValue();
      const proxy = vueDemi.ref(initialValue);
      vueDemi.watch(() => props[key], (v) => proxy.value = cloneFn(v));
      vueDemi.watch(proxy, (v) => {
        if (v !== props[key] || deep)
          _emit(event, v);
      }, { deep });
      return proxy;
    } else {
      return vueDemi.computed({
        get() {
          return getValue();
        },
        set(value) {
          _emit(event, value);
        }
      });
    }
  }

  function useVModels(props, emit, options = {}) {
    const ret = {};
    for (const key in props)
      ret[key] = useVModel(props, key, emit, options);
    return ret;
  }

  function useVibrate(options) {
    const {
      pattern = [],
      interval = 0,
      navigator = defaultNavigator
    } = options || {};
    const isSupported = useSupported(() => typeof navigator !== "undefined" && "vibrate" in navigator);
    const patternRef = shared.resolveRef(pattern);
    let intervalControls;
    const vibrate = (pattern2 = patternRef.value) => {
      if (isSupported.value)
        navigator.vibrate(pattern2);
    };
    const stop = () => {
      if (isSupported.value)
        navigator.vibrate(0);
      intervalControls == null ? void 0 : intervalControls.pause();
    };
    if (interval > 0) {
      intervalControls = shared.useIntervalFn(vibrate, interval, {
        immediate: false,
        immediateCallback: false
      });
    }
    return {
      isSupported,
      pattern,
      intervalControls,
      vibrate,
      stop
    };
  }

  function useVirtualList(list, options) {
    const { containerStyle, wrapperProps, scrollTo, calculateRange, currentList, containerRef } = "itemHeight" in options ? useVerticalVirtualList(options, list) : useHorizontalVirtualList(options, list);
    return {
      list: currentList,
      scrollTo,
      containerProps: {
        ref: containerRef,
        onScroll: () => {
          calculateRange();
        },
        style: containerStyle
      },
      wrapperProps
    };
  }
  function useVirtualListResources(list) {
    const containerRef = vueDemi.ref(null);
    const size = useElementSize(containerRef);
    const currentList = vueDemi.ref([]);
    const source = vueDemi.shallowRef(list);
    const state = vueDemi.ref({ start: 0, end: 10 });
    return { state, source, currentList, size, containerRef };
  }
  function createGetViewCapacity(state, source, itemSize) {
    return (containerSize) => {
      if (typeof itemSize === "number")
        return Math.ceil(containerSize / itemSize);
      const { start = 0 } = state.value;
      let sum = 0;
      let capacity = 0;
      for (let i = start; i < source.value.length; i++) {
        const size = itemSize(i);
        sum += size;
        capacity = i;
        if (sum > containerSize)
          break;
      }
      return capacity - start;
    };
  }
  function createGetOffset(source, itemSize) {
    return (scrollDirection) => {
      if (typeof itemSize === "number")
        return Math.floor(scrollDirection / itemSize) + 1;
      let sum = 0;
      let offset = 0;
      for (let i = 0; i < source.value.length; i++) {
        const size = itemSize(i);
        sum += size;
        if (sum >= scrollDirection) {
          offset = i;
          break;
        }
      }
      return offset + 1;
    };
  }
  function createCalculateRange(type, overscan, getOffset, getViewCapacity, { containerRef, state, currentList, source }) {
    return () => {
      const element = containerRef.value;
      if (element) {
        const offset = getOffset(type === "vertical" ? element.scrollTop : element.scrollLeft);
        const viewCapacity = getViewCapacity(type === "vertical" ? element.clientHeight : element.clientWidth);
        const from = offset - overscan;
        const to = offset + viewCapacity + overscan;
        state.value = {
          start: from < 0 ? 0 : from,
          end: to > source.value.length ? source.value.length : to
        };
        currentList.value = source.value.slice(state.value.start, state.value.end).map((ele, index) => ({
          data: ele,
          index: index + state.value.start
        }));
      }
    };
  }
  function createGetDistance(itemSize, source) {
    return (index) => {
      if (typeof itemSize === "number") {
        const size2 = index * itemSize;
        return size2;
      }
      const size = source.value.slice(0, index).reduce((sum, _, i) => sum + itemSize(i), 0);
      return size;
    };
  }
  function useWatchForSizes(size, list, calculateRange) {
    vueDemi.watch([size.width, size.height, list], () => {
      calculateRange();
    });
  }
  function createComputedTotalSize(itemSize, source) {
    return vueDemi.computed(() => {
      if (typeof itemSize === "number")
        return source.value.length * itemSize;
      return source.value.reduce((sum, _, index) => sum + itemSize(index), 0);
    });
  }
  const scrollToDictionaryForElementScrollKey = {
    horizontal: "scrollLeft",
    vertical: "scrollTop"
  };
  function createScrollTo(type, calculateRange, getDistance, containerRef) {
    return (index) => {
      if (containerRef.value) {
        containerRef.value[scrollToDictionaryForElementScrollKey[type]] = getDistance(index);
        calculateRange();
      }
    };
  }
  function useHorizontalVirtualList(options, list) {
    const resources = useVirtualListResources(list);
    const { state, source, currentList, size, containerRef } = resources;
    const containerStyle = { overflowX: "auto" };
    const { itemWidth, overscan = 5 } = options;
    const getViewCapacity = createGetViewCapacity(state, source, itemWidth);
    const getOffset = createGetOffset(source, itemWidth);
    const calculateRange = createCalculateRange("horizontal", overscan, getOffset, getViewCapacity, resources);
    const getDistanceLeft = createGetDistance(itemWidth, source);
    const offsetLeft = vueDemi.computed(() => getDistanceLeft(state.value.start));
    const totalWidth = createComputedTotalSize(itemWidth, source);
    useWatchForSizes(size, list, calculateRange);
    const scrollTo = createScrollTo("horizontal", calculateRange, getDistanceLeft, containerRef);
    const wrapperProps = vueDemi.computed(() => {
      return {
        style: {
          height: "100%",
          width: `${totalWidth.value - offsetLeft.value}px`,
          marginLeft: `${offsetLeft.value}px`,
          display: "flex"
        }
      };
    });
    return {
      scrollTo,
      calculateRange,
      wrapperProps,
      containerStyle,
      currentList,
      containerRef
    };
  }
  function useVerticalVirtualList(options, list) {
    const resources = useVirtualListResources(list);
    const { state, source, currentList, size, containerRef } = resources;
    const containerStyle = { overflowY: "auto" };
    const { itemHeight, overscan = 5 } = options;
    const getViewCapacity = createGetViewCapacity(state, source, itemHeight);
    const getOffset = createGetOffset(source, itemHeight);
    const calculateRange = createCalculateRange("vertical", overscan, getOffset, getViewCapacity, resources);
    const getDistanceTop = createGetDistance(itemHeight, source);
    const offsetTop = vueDemi.computed(() => getDistanceTop(state.value.start));
    const totalHeight = createComputedTotalSize(itemHeight, source);
    useWatchForSizes(size, list, calculateRange);
    const scrollTo = createScrollTo("vertical", calculateRange, getDistanceTop, containerRef);
    const wrapperProps = vueDemi.computed(() => {
      return {
        style: {
          width: "100%",
          height: `${totalHeight.value - offsetTop.value}px`,
          marginTop: `${offsetTop.value}px`
        }
      };
    });
    return {
      calculateRange,
      scrollTo,
      containerStyle,
      wrapperProps,
      currentList,
      containerRef
    };
  }

  const useWakeLock = (options = {}) => {
    const {
      navigator = defaultNavigator,
      document = defaultDocument
    } = options;
    let wakeLock;
    const isSupported = useSupported(() => navigator && "wakeLock" in navigator);
    const isActive = vueDemi.ref(false);
    async function onVisibilityChange() {
      if (!isSupported.value || !wakeLock)
        return;
      if (document && document.visibilityState === "visible")
        wakeLock = await navigator.wakeLock.request("screen");
      isActive.value = !wakeLock.released;
    }
    if (document)
      useEventListener(document, "visibilitychange", onVisibilityChange, { passive: true });
    async function request(type) {
      if (!isSupported.value)
        return;
      wakeLock = await navigator.wakeLock.request(type);
      isActive.value = !wakeLock.released;
    }
    async function release() {
      if (!isSupported.value || !wakeLock)
        return;
      await wakeLock.release();
      isActive.value = !wakeLock.released;
      wakeLock = null;
    }
    return {
      isSupported,
      isActive,
      request,
      release
    };
  };

  const useWebNotification = (defaultOptions = {}) => {
    const {
      window = defaultWindow
    } = defaultOptions;
    const isSupported = useSupported(() => !!window && "Notification" in window);
    const notification = vueDemi.ref(null);
    const requestPermission = async () => {
      if (!isSupported.value)
        return;
      if ("permission" in Notification && Notification.permission !== "denied")
        await Notification.requestPermission();
    };
    const onClick = shared.createEventHook();
    const onShow = shared.createEventHook();
    const onError = shared.createEventHook();
    const onClose = shared.createEventHook();
    const show = async (overrides) => {
      if (!isSupported.value)
        return;
      await requestPermission();
      const options = Object.assign({}, defaultOptions, overrides);
      notification.value = new Notification(options.title || "", options);
      notification.value.onclick = (event) => onClick.trigger(event);
      notification.value.onshow = (event) => onShow.trigger(event);
      notification.value.onerror = (event) => onError.trigger(event);
      notification.value.onclose = (event) => onClose.trigger(event);
      return notification.value;
    };
    const close = () => {
      if (notification.value)
        notification.value.close();
      notification.value = null;
    };
    shared.tryOnMounted(async () => {
      if (isSupported.value)
        await requestPermission();
    });
    shared.tryOnScopeDispose(close);
    if (isSupported.value && window) {
      const document = window.document;
      useEventListener(document, "visibilitychange", (e) => {
        e.preventDefault();
        if (document.visibilityState === "visible") {
          close();
        }
      });
    }
    return {
      isSupported,
      notification,
      show,
      close,
      onClick,
      onShow,
      onError,
      onClose
    };
  };

  const DEFAULT_PING_MESSAGE = "ping";
  function resolveNestedOptions(options) {
    if (options === true)
      return {};
    return options;
  }
  function useWebSocket(url, options = {}) {
    const {
      onConnected,
      onDisconnected,
      onError,
      onMessage,
      immediate = true,
      autoClose = true,
      protocols = []
    } = options;
    const data = vueDemi.ref(null);
    const status = vueDemi.ref("CLOSED");
    const wsRef = vueDemi.ref();
    const urlRef = shared.resolveRef(url);
    let heartbeatPause;
    let heartbeatResume;
    let explicitlyClosed = false;
    let retried = 0;
    let bufferedData = [];
    let pongTimeoutWait;
    const close = (code = 1e3, reason) => {
      if (!wsRef.value)
        return;
      explicitlyClosed = true;
      heartbeatPause == null ? void 0 : heartbeatPause();
      wsRef.value.close(code, reason);
    };
    const _sendBuffer = () => {
      if (bufferedData.length && wsRef.value && status.value === "OPEN") {
        for (const buffer of bufferedData)
          wsRef.value.send(buffer);
        bufferedData = [];
      }
    };
    const resetHeartbeat = () => {
      clearTimeout(pongTimeoutWait);
      pongTimeoutWait = void 0;
    };
    const send = (data2, useBuffer = true) => {
      if (!wsRef.value || status.value !== "OPEN") {
        if (useBuffer)
          bufferedData.push(data2);
        return false;
      }
      _sendBuffer();
      wsRef.value.send(data2);
      return true;
    };
    const _init = () => {
      if (explicitlyClosed || typeof urlRef.value === "undefined")
        return;
      const ws = new WebSocket(urlRef.value, protocols);
      wsRef.value = ws;
      status.value = "CONNECTING";
      ws.onopen = () => {
        status.value = "OPEN";
        onConnected == null ? void 0 : onConnected(ws);
        heartbeatResume == null ? void 0 : heartbeatResume();
        _sendBuffer();
      };
      ws.onclose = (ev) => {
        status.value = "CLOSED";
        wsRef.value = void 0;
        onDisconnected == null ? void 0 : onDisconnected(ws, ev);
        if (!explicitlyClosed && options.autoReconnect) {
          const {
            retries = -1,
            delay = 1e3,
            onFailed
          } = resolveNestedOptions(options.autoReconnect);
          retried += 1;
          if (typeof retries === "number" && (retries < 0 || retried < retries))
            setTimeout(_init, delay);
          else if (typeof retries === "function" && retries())
            setTimeout(_init, delay);
          else
            onFailed == null ? void 0 : onFailed();
        }
      };
      ws.onerror = (e) => {
        onError == null ? void 0 : onError(ws, e);
      };
      ws.onmessage = (e) => {
        if (options.heartbeat) {
          resetHeartbeat();
          const {
            message = DEFAULT_PING_MESSAGE
          } = resolveNestedOptions(options.heartbeat);
          if (e.data === message)
            return;
        }
        data.value = e.data;
        onMessage == null ? void 0 : onMessage(ws, e);
      };
    };
    if (options.heartbeat) {
      const {
        message = DEFAULT_PING_MESSAGE,
        interval = 1e3,
        pongTimeout = 1e3
      } = resolveNestedOptions(options.heartbeat);
      const { pause, resume } = shared.useIntervalFn(() => {
        send(message, false);
        if (pongTimeoutWait != null)
          return;
        pongTimeoutWait = setTimeout(() => {
          close();
        }, pongTimeout);
      }, interval, { immediate: false });
      heartbeatPause = pause;
      heartbeatResume = resume;
    }
    if (autoClose) {
      useEventListener(window, "beforeunload", () => close());
      shared.tryOnScopeDispose(close);
    }
    const open = () => {
      close();
      explicitlyClosed = false;
      retried = 0;
      _init();
    };
    if (immediate)
      vueDemi.watch(urlRef, open, { immediate: true });
    return {
      data,
      status,
      close,
      send,
      open,
      ws: wsRef
    };
  }

  function useWebWorker(arg0, workerOptions, options) {
    const {
      window = defaultWindow
    } = options != null ? options : {};
    const data = vueDemi.ref(null);
    const worker = vueDemi.shallowRef();
    const post = function post2(val) {
      if (!worker.value)
        return;
      worker.value.postMessage(val);
    };
    const terminate = function terminate2() {
      if (!worker.value)
        return;
      worker.value.terminate();
    };
    if (window) {
      if (shared.isString(arg0))
        worker.value = new Worker(arg0, workerOptions);
      else if (shared.isFunction(arg0))
        worker.value = arg0();
      else
        worker.value = arg0;
      worker.value.onmessage = (e) => {
        data.value = e.data;
      };
      shared.tryOnScopeDispose(() => {
        if (worker.value)
          worker.value.terminate();
      });
    }
    return {
      data,
      post,
      terminate,
      worker
    };
  }

  const jobRunner = (userFunc) => (e) => {
    const userFuncArgs = e.data[0];
    return Promise.resolve(userFunc.apply(void 0, userFuncArgs)).then((result) => {
      postMessage(["SUCCESS", result]);
    }).catch((error) => {
      postMessage(["ERROR", error]);
    });
  };

  const depsParser = (deps) => {
    if (deps.length === 0)
      return "";
    const depsString = deps.map((dep) => `'${dep}'`).toString();
    return `importScripts(${depsString})`;
  };

  const createWorkerBlobUrl = (fn, deps) => {
    const blobCode = `${depsParser(deps)}; onmessage=(${jobRunner})(${fn})`;
    const blob = new Blob([blobCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    return url;
  };

  const useWebWorkerFn = (fn, options = {}) => {
    const {
      dependencies = [],
      timeout,
      window = defaultWindow
    } = options;
    const worker = vueDemi.ref();
    const workerStatus = vueDemi.ref("PENDING");
    const promise = vueDemi.ref({});
    const timeoutId = vueDemi.ref();
    const workerTerminate = (status = "PENDING") => {
      if (worker.value && worker.value._url && window) {
        worker.value.terminate();
        URL.revokeObjectURL(worker.value._url);
        promise.value = {};
        worker.value = void 0;
        window.clearTimeout(timeoutId.value);
        workerStatus.value = status;
      }
    };
    workerTerminate();
    shared.tryOnScopeDispose(workerTerminate);
    const generateWorker = () => {
      const blobUrl = createWorkerBlobUrl(fn, dependencies);
      const newWorker = new Worker(blobUrl);
      newWorker._url = blobUrl;
      newWorker.onmessage = (e) => {
        const { resolve = () => {
        }, reject = () => {
        } } = promise.value;
        const [status, result] = e.data;
        switch (status) {
          case "SUCCESS":
            resolve(result);
            workerTerminate(status);
            break;
          default:
            reject(result);
            workerTerminate("ERROR");
            break;
        }
      };
      newWorker.onerror = (e) => {
        const { reject = () => {
        } } = promise.value;
        reject(e);
        workerTerminate("ERROR");
      };
      if (timeout) {
        timeoutId.value = setTimeout(() => workerTerminate("TIMEOUT_EXPIRED"), timeout);
      }
      return newWorker;
    };
    const callWorker = (...fnArgs) => new Promise((resolve, reject) => {
      promise.value = {
        resolve,
        reject
      };
      worker.value && worker.value.postMessage([[...fnArgs]]);
      workerStatus.value = "RUNNING";
    });
    const workerFn = (...fnArgs) => {
      if (workerStatus.value === "RUNNING") {
        console.error("[useWebWorkerFn] You can only run one instance of the worker at a time.");
        return Promise.reject();
      }
      worker.value = generateWorker();
      return callWorker(...fnArgs);
    };
    return {
      workerFn,
      workerStatus,
      workerTerminate
    };
  };

  function useWindowFocus({ window = defaultWindow } = {}) {
    if (!window)
      return vueDemi.ref(false);
    const focused = vueDemi.ref(window.document.hasFocus());
    useEventListener(window, "blur", () => {
      focused.value = false;
    });
    useEventListener(window, "focus", () => {
      focused.value = true;
    });
    return focused;
  }

  function useWindowScroll({ window = defaultWindow } = {}) {
    if (!window) {
      return {
        x: vueDemi.ref(0),
        y: vueDemi.ref(0)
      };
    }
    const x = vueDemi.ref(window.scrollX);
    const y = vueDemi.ref(window.scrollY);
    useEventListener(window, "scroll", () => {
      x.value = window.scrollX;
      y.value = window.scrollY;
    }, {
      capture: false,
      passive: true
    });
    return { x, y };
  }

  function useWindowSize(options = {}) {
    const {
      window = defaultWindow,
      initialWidth = Infinity,
      initialHeight = Infinity,
      listenOrientation = true,
      includeScrollbar = true
    } = options;
    const width = vueDemi.ref(initialWidth);
    const height = vueDemi.ref(initialHeight);
    const update = () => {
      if (window) {
        if (includeScrollbar) {
          width.value = window.innerWidth;
          height.value = window.innerHeight;
        } else {
          width.value = window.document.documentElement.clientWidth;
          height.value = window.document.documentElement.clientHeight;
        }
      }
    };
    update();
    shared.tryOnMounted(update);
    useEventListener("resize", update, { passive: true });
    if (listenOrientation)
      useEventListener("orientationchange", update, { passive: true });
    return { width, height };
  }

  exports.DefaultMagicKeysAliasMap = DefaultMagicKeysAliasMap;
  exports.StorageSerializers = StorageSerializers;
  exports.TransitionPresets = TransitionPresets;
  exports.asyncComputed = computedAsync;
  exports.breakpointsAntDesign = breakpointsAntDesign;
  exports.breakpointsBootstrapV5 = breakpointsBootstrapV5;
  exports.breakpointsMasterCss = breakpointsMasterCss;
  exports.breakpointsQuasar = breakpointsQuasar;
  exports.breakpointsSematic = breakpointsSematic;
  exports.breakpointsTailwind = breakpointsTailwind;
  exports.breakpointsVuetify = breakpointsVuetify;
  exports.cloneFnJSON = cloneFnJSON;
  exports.computedAsync = computedAsync;
  exports.computedInject = computedInject;
  exports.createFetch = createFetch;
  exports.createUnrefFn = createUnrefFn;
  exports.customStorageEventName = customStorageEventName;
  exports.defaultDocument = defaultDocument;
  exports.defaultLocation = defaultLocation;
  exports.defaultNavigator = defaultNavigator;
  exports.defaultWindow = defaultWindow;
  exports.formatTimeAgo = formatTimeAgo;
  exports.getSSRHandler = getSSRHandler;
  exports.mapGamepadToXbox360Controller = mapGamepadToXbox360Controller;
  exports.onClickOutside = onClickOutside;
  exports.onKeyDown = onKeyDown;
  exports.onKeyPressed = onKeyPressed;
  exports.onKeyStroke = onKeyStroke;
  exports.onKeyUp = onKeyUp;
  exports.onLongPress = onLongPress;
  exports.onStartTyping = onStartTyping;
  exports.setSSRHandler = setSSRHandler;
  exports.templateRef = templateRef;
  exports.unrefElement = unrefElement;
  exports.useActiveElement = useActiveElement;
  exports.useAsyncQueue = useAsyncQueue;
  exports.useAsyncState = useAsyncState;
  exports.useBase64 = useBase64;
  exports.useBattery = useBattery;
  exports.useBluetooth = useBluetooth;
  exports.useBreakpoints = useBreakpoints;
  exports.useBroadcastChannel = useBroadcastChannel;
  exports.useBrowserLocation = useBrowserLocation;
  exports.useCached = useCached;
  exports.useClipboard = useClipboard;
  exports.useCloned = useCloned;
  exports.useColorMode = useColorMode;
  exports.useConfirmDialog = useConfirmDialog;
  exports.useCssVar = useCssVar;
  exports.useCurrentElement = useCurrentElement;
  exports.useCycleList = useCycleList;
  exports.useDark = useDark;
  exports.useDebouncedRefHistory = useDebouncedRefHistory;
  exports.useDeviceMotion = useDeviceMotion;
  exports.useDeviceOrientation = useDeviceOrientation;
  exports.useDevicePixelRatio = useDevicePixelRatio;
  exports.useDevicesList = useDevicesList;
  exports.useDisplayMedia = useDisplayMedia;
  exports.useDocumentVisibility = useDocumentVisibility;
  exports.useDraggable = useDraggable;
  exports.useDropZone = useDropZone;
  exports.useElementBounding = useElementBounding;
  exports.useElementByPoint = useElementByPoint;
  exports.useElementHover = useElementHover;
  exports.useElementSize = useElementSize;
  exports.useElementVisibility = useElementVisibility;
  exports.useEventBus = useEventBus;
  exports.useEventListener = useEventListener;
  exports.useEventSource = useEventSource;
  exports.useEyeDropper = useEyeDropper;
  exports.useFavicon = useFavicon;
  exports.useFetch = useFetch;
  exports.useFileDialog = useFileDialog;
  exports.useFileSystemAccess = useFileSystemAccess;
  exports.useFocus = useFocus;
  exports.useFocusWithin = useFocusWithin;
  exports.useFps = useFps;
  exports.useFullscreen = useFullscreen;
  exports.useGamepad = useGamepad;
  exports.useGeolocation = useGeolocation;
  exports.useIdle = useIdle;
  exports.useImage = useImage;
  exports.useInfiniteScroll = useInfiniteScroll;
  exports.useIntersectionObserver = useIntersectionObserver;
  exports.useKeyModifier = useKeyModifier;
  exports.useLocalStorage = useLocalStorage;
  exports.useMagicKeys = useMagicKeys;
  exports.useManualRefHistory = useManualRefHistory;
  exports.useMediaControls = useMediaControls;
  exports.useMediaQuery = useMediaQuery;
  exports.useMemoize = useMemoize;
  exports.useMemory = useMemory;
  exports.useMounted = useMounted;
  exports.useMouse = useMouse;
  exports.useMouseInElement = useMouseInElement;
  exports.useMousePressed = useMousePressed;
  exports.useMutationObserver = useMutationObserver;
  exports.useNavigatorLanguage = useNavigatorLanguage;
  exports.useNetwork = useNetwork;
  exports.useNow = useNow;
  exports.useObjectUrl = useObjectUrl;
  exports.useOffsetPagination = useOffsetPagination;
  exports.useOnline = useOnline;
  exports.usePageLeave = usePageLeave;
  exports.useParallax = useParallax;
  exports.usePermission = usePermission;
  exports.usePointer = usePointer;
  exports.usePointerLock = usePointerLock;
  exports.usePointerSwipe = usePointerSwipe;
  exports.usePreferredColorScheme = usePreferredColorScheme;
  exports.usePreferredContrast = usePreferredContrast;
  exports.usePreferredDark = usePreferredDark;
  exports.usePreferredLanguages = usePreferredLanguages;
  exports.usePreferredReducedMotion = usePreferredReducedMotion;
  exports.usePrevious = usePrevious;
  exports.useRafFn = useRafFn;
  exports.useRefHistory = useRefHistory;
  exports.useResizeObserver = useResizeObserver;
  exports.useScreenOrientation = useScreenOrientation;
  exports.useScreenSafeArea = useScreenSafeArea;
  exports.useScriptTag = useScriptTag;
  exports.useScroll = useScroll;
  exports.useScrollLock = useScrollLock;
  exports.useSessionStorage = useSessionStorage;
  exports.useShare = useShare;
  exports.useSorted = useSorted;
  exports.useSpeechRecognition = useSpeechRecognition;
  exports.useSpeechSynthesis = useSpeechSynthesis;
  exports.useStepper = useStepper;
  exports.useStorage = useStorage;
  exports.useStorageAsync = useStorageAsync;
  exports.useStyleTag = useStyleTag;
  exports.useSupported = useSupported;
  exports.useSwipe = useSwipe;
  exports.useTemplateRefsList = useTemplateRefsList;
  exports.useTextDirection = useTextDirection;
  exports.useTextSelection = useTextSelection;
  exports.useTextareaAutosize = useTextareaAutosize;
  exports.useThrottledRefHistory = useThrottledRefHistory;
  exports.useTimeAgo = useTimeAgo;
  exports.useTimeoutPoll = useTimeoutPoll;
  exports.useTimestamp = useTimestamp;
  exports.useTitle = useTitle;
  exports.useTransition = useTransition;
  exports.useUrlSearchParams = useUrlSearchParams;
  exports.useUserMedia = useUserMedia;
  exports.useVModel = useVModel;
  exports.useVModels = useVModels;
  exports.useVibrate = useVibrate;
  exports.useVirtualList = useVirtualList;
  exports.useWakeLock = useWakeLock;
  exports.useWebNotification = useWebNotification;
  exports.useWebSocket = useWebSocket;
  exports.useWebWorker = useWebWorker;
  exports.useWebWorkerFn = useWebWorkerFn;
  exports.useWindowFocus = useWindowFocus;
  exports.useWindowScroll = useWindowScroll;
  exports.useWindowSize = useWindowSize;
  Object.keys(shared).forEach(function (k) {
    if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
      enumerable: true,
      get: function () { return shared[k]; }
    });
  });

})(this.VueUse = this.VueUse || {}, VueUse, VueDemi);
