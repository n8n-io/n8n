import { defineComponent, ref, h, watch, computed, reactive, shallowRef, nextTick, getCurrentInstance, onMounted, isVue2, watchEffect, toRefs } from 'vue-demi';
import { onClickOutside as onClickOutside$1, useActiveElement, useBattery, useBrowserLocation, useClipboard, useDark, useDeviceMotion, useDeviceOrientation, useDevicePixelRatio, useDevicesList, useDocumentVisibility, useStorage as useStorage$1, isClient as isClient$1, useDraggable, useElementBounding, useElementSize as useElementSize$1, useElementVisibility as useElementVisibility$1, useEyeDropper, useFullscreen, useGeolocation, useIdle, useMouse, useMouseInElement, useMousePressed, useNetwork, useNow, useObjectUrl, useOffsetPagination, useOnline, usePageLeave, usePointer, usePointerLock, usePreferredColorScheme, usePreferredContrast, usePreferredDark as usePreferredDark$1, usePreferredLanguages, usePreferredReducedMotion, useTimeAgo, useTimestamp, useVirtualList, useWindowFocus, useWindowSize } from '@vueuse/core';
import { toValue, isClient, noop, isObject, tryOnScopeDispose, isIOS, directiveHooks, pausableWatch, tryOnMounted, toRef, useToggle, notNullish, promiseTimeout, until, useDebounceFn, useThrottleFn } from '@vueuse/shared';

const OnClickOutside = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "OnClickOutside",
  props: ["as", "options"],
  emits: ["trigger"],
  setup(props, { slots, emit }) {
    const target = ref();
    onClickOutside$1(target, (e) => {
      emit("trigger", e);
    }, props.options);
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target }, slots.default());
    };
  }
});

function unrefElement(elRef) {
  var _a;
  const plain = toValue(elRef);
  return (_a = plain == null ? void 0 : plain.$el) != null ? _a : plain;
}

const defaultWindow = isClient ? window : void 0;

function useEventListener(...args) {
  let target;
  let events;
  let listeners;
  let options;
  if (typeof args[0] === "string" || Array.isArray(args[0])) {
    [events, listeners, options] = args;
    target = defaultWindow;
  } else {
    [target, events, listeners, options] = args;
  }
  if (!target)
    return noop;
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
  const stopWatch = watch(
    () => [unrefElement(target), toValue(options)],
    ([el, options2]) => {
      cleanup();
      if (!el)
        return;
      const optionsClone = isObject(options2) ? { ...options2 } : options2;
      cleanups.push(
        ...events.flatMap((event) => {
          return listeners.map((listener) => register(el, event, listener, optionsClone));
        })
      );
    },
    { immediate: true, flush: "post" }
  );
  const stop = () => {
    stopWatch();
    cleanup();
  };
  tryOnScopeDispose(stop);
  return stop;
}

let _iOSWorkaround = false;
function onClickOutside(target, handler, options = {}) {
  const { window = defaultWindow, ignore = [], capture = true, detectIframe = false } = options;
  if (!window)
    return noop;
  if (isIOS && !_iOSWorkaround) {
    _iOSWorkaround = true;
    Array.from(window.document.body.children).forEach((el) => el.addEventListener("click", noop));
    window.document.documentElement.addEventListener("click", noop);
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
      shouldListen = !shouldIgnore(e) && !!(el && !e.composedPath().includes(el));
    }, { passive: true }),
    detectIframe && useEventListener(window, "blur", (event) => {
      setTimeout(() => {
        var _a;
        const el = unrefElement(target);
        if (((_a = window.document.activeElement) == null ? void 0 : _a.tagName) === "IFRAME" && !(el == null ? void 0 : el.contains(window.document.activeElement))) {
          handler(event);
        }
      }, 0);
    })
  ].filter(Boolean);
  const stop = () => cleanup.forEach((fn) => fn());
  return stop;
}

const vOnClickOutside = {
  [directiveHooks.mounted](el, binding) {
    const capture = !binding.modifiers.bubble;
    if (typeof binding.value === "function") {
      el.__onClickOutside_stop = onClickOutside(el, binding.value, { capture });
    } else {
      const [handler, options] = binding.value;
      el.__onClickOutside_stop = onClickOutside(el, handler, Object.assign({ capture }, options));
    }
  },
  [directiveHooks.unmounted](el) {
    el.__onClickOutside_stop();
  }
};

function createKeyPredicate(keyFilter) {
  if (typeof keyFilter === "function")
    return keyFilter;
  else if (typeof keyFilter === "string")
    return (event) => event.key === keyFilter;
  else if (Array.isArray(keyFilter))
    return (event) => keyFilter.includes(event.key);
  return () => true;
}
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
  const {
    target = defaultWindow,
    eventName = "keydown",
    passive = false,
    dedupe = false
  } = options;
  const predicate = createKeyPredicate(key);
  const listener = (e) => {
    if (e.repeat && toValue(dedupe))
      return;
    if (predicate(e))
      handler(e);
  };
  return useEventListener(target, eventName, listener, passive);
}

const vOnKeyStroke = {
  [directiveHooks.mounted](el, binding) {
    var _a, _b;
    const keys = (_b = (_a = binding.arg) == null ? void 0 : _a.split(",")) != null ? _b : true;
    if (typeof binding.value === "function") {
      onKeyStroke(keys, binding.value, {
        target: el
      });
    } else {
      const [handler, options] = binding.value;
      onKeyStroke(keys, handler, {
        target: el,
        ...options
      });
    }
  }
};

const DEFAULT_DELAY = 500;
const DEFAULT_THRESHOLD = 10;
function onLongPress(target, handler, options) {
  var _a, _b;
  const elementRef = computed(() => unrefElement(target));
  let timeout;
  let posStart;
  let startTimestamp;
  let hasLongPressed = false;
  function clear() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = void 0;
    }
    posStart = void 0;
    startTimestamp = void 0;
    hasLongPressed = false;
  }
  function onRelease(ev) {
    var _a2, _b2, _c;
    const [_startTimestamp, _posStart, _hasLongPressed] = [startTimestamp, posStart, hasLongPressed];
    clear();
    if (!(options == null ? void 0 : options.onMouseUp) || !_posStart || !_startTimestamp)
      return;
    if (((_a2 = options == null ? void 0 : options.modifiers) == null ? void 0 : _a2.self) && ev.target !== elementRef.value)
      return;
    if ((_b2 = options == null ? void 0 : options.modifiers) == null ? void 0 : _b2.prevent)
      ev.preventDefault();
    if ((_c = options == null ? void 0 : options.modifiers) == null ? void 0 : _c.stop)
      ev.stopPropagation();
    const dx = ev.x - _posStart.x;
    const dy = ev.y - _posStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    options.onMouseUp(ev.timeStamp - _startTimestamp, distance, _hasLongPressed);
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
    posStart = {
      x: ev.x,
      y: ev.y
    };
    startTimestamp = ev.timeStamp;
    timeout = setTimeout(
      () => {
        hasLongPressed = true;
        handler(ev);
      },
      (_d = options == null ? void 0 : options.delay) != null ? _d : DEFAULT_DELAY
    );
  }
  function onMove(ev) {
    var _a2, _b2, _c, _d;
    if (((_a2 = options == null ? void 0 : options.modifiers) == null ? void 0 : _a2.self) && ev.target !== elementRef.value)
      return;
    if (!posStart || (options == null ? void 0 : options.distanceThreshold) === false)
      return;
    if ((_b2 = options == null ? void 0 : options.modifiers) == null ? void 0 : _b2.prevent)
      ev.preventDefault();
    if ((_c = options == null ? void 0 : options.modifiers) == null ? void 0 : _c.stop)
      ev.stopPropagation();
    const dx = ev.x - posStart.x;
    const dy = ev.y - posStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance >= ((_d = options == null ? void 0 : options.distanceThreshold) != null ? _d : DEFAULT_THRESHOLD))
      clear();
  }
  const listenerOptions = {
    capture: (_a = options == null ? void 0 : options.modifiers) == null ? void 0 : _a.capture,
    once: (_b = options == null ? void 0 : options.modifiers) == null ? void 0 : _b.once
  };
  const cleanup = [
    useEventListener(elementRef, "pointerdown", onDown, listenerOptions),
    useEventListener(elementRef, "pointermove", onMove, listenerOptions),
    useEventListener(elementRef, ["pointerup", "pointerleave"], onRelease, listenerOptions)
  ];
  const stop = () => cleanup.forEach((fn) => fn());
  return stop;
}

const OnLongPress = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "OnLongPress",
  props: ["as", "options"],
  emits: ["trigger"],
  setup(props, { slots, emit }) {
    const target = ref();
    onLongPress(
      target,
      (e) => {
        emit("trigger", e);
      },
      props.options
    );
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target }, slots.default());
    };
  }
});

const vOnLongPress = {
  [directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function")
      onLongPress(el, binding.value, { modifiers: binding.modifiers });
    else
      onLongPress(el, ...binding.value);
  }
};

const UseActiveElement = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseActiveElement",
  setup(props, { slots }) {
    const data = reactive({
      element: useActiveElement()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseBattery = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseBattery",
  setup(props, { slots }) {
    const data = reactive(useBattery(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseBrowserLocation = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseBrowserLocation",
  setup(props, { slots }) {
    const data = reactive(useBrowserLocation());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseClipboard = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseClipboard",
  props: [
    "source",
    "read",
    "navigator",
    "copiedDuring",
    "legacy"
  ],
  setup(props, { slots }) {
    const data = reactive(useClipboard(props));
    return () => {
      var _a;
      return (_a = slots.default) == null ? void 0 : _a.call(slots, data);
    };
  }
});

const _global = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
const globalKey = "__vueuse_ssr_handlers__";
const handlers = /* @__PURE__ */ getHandlers();
function getHandlers() {
  if (!(globalKey in _global))
    _global[globalKey] = _global[globalKey] || {};
  return _global[globalKey];
}
function getSSRHandler(key, fallback) {
  return handlers[key] || fallback;
}

function guessSerializerType(rawInit) {
  return rawInit == null ? "any" : rawInit instanceof Set ? "set" : rawInit instanceof Map ? "map" : rawInit instanceof Date ? "date" : typeof rawInit === "boolean" ? "boolean" : typeof rawInit === "string" ? "string" : typeof rawInit === "object" ? "object" : !Number.isNaN(rawInit) ? "number" : "any";
}

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
    },
    initOnMounted
  } = options;
  const data = (shallow ? shallowRef : ref)(typeof defaults === "function" ? defaults() : defaults);
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
  const rawInit = toValue(defaults);
  const type = guessSerializerType(rawInit);
  const serializer = (_a = options.serializer) != null ? _a : StorageSerializers[type];
  const { pause: pauseWatch, resume: resumeWatch } = pausableWatch(
    data,
    () => write(data.value),
    { flush, deep, eventFilter }
  );
  if (window && listenToStorageChanges) {
    tryOnMounted(() => {
      useEventListener(window, "storage", update);
      useEventListener(window, customStorageEventName, updateFromCustomEvent);
      if (initOnMounted)
        update();
    });
  }
  if (!initOnMounted)
    update();
  function dispatchWriteEvent(oldValue, newValue) {
    if (window) {
      window.dispatchEvent(new CustomEvent(customStorageEventName, {
        detail: {
          key,
          oldValue,
          newValue,
          storageArea: storage
        }
      }));
    }
  }
  function write(v) {
    try {
      const oldValue = storage.getItem(key);
      if (v == null) {
        dispatchWriteEvent(oldValue, null);
        storage.removeItem(key);
      } else {
        const serialized = serializer.write(v);
        if (oldValue !== serialized) {
          storage.setItem(key, serialized);
          dispatchWriteEvent(oldValue, serialized);
        }
      }
    } catch (e) {
      onError(e);
    }
  }
  function read(event) {
    const rawValue = event ? event.newValue : storage.getItem(key);
    if (rawValue == null) {
      if (writeDefaults && rawInit != null)
        storage.setItem(key, serializer.write(rawInit));
      return rawInit;
    } else if (!event && mergeDefaults) {
      const value = serializer.read(rawValue);
      if (typeof mergeDefaults === "function")
        return mergeDefaults(value, rawInit);
      else if (type === "object" && !Array.isArray(value))
        return { ...rawInit, ...value };
      return value;
    } else if (typeof rawValue !== "string") {
      return rawValue;
    } else {
      return serializer.read(rawValue);
    }
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
      if ((event == null ? void 0 : event.newValue) !== serializer.write(data.value))
        data.value = read(event);
    } catch (e) {
      onError(e);
    } finally {
      if (event)
        nextTick(resumeWatch);
      else
        resumeWatch();
    }
  }
  function updateFromCustomEvent(event) {
    update(event.detail);
  }
  return data;
}

function useMounted() {
  const isMounted = ref(false);
  const instance = getCurrentInstance();
  if (instance) {
    onMounted(() => {
      isMounted.value = true;
    }, isVue2 ? void 0 : instance);
  }
  return isMounted;
}

function useSupported(callback) {
  const isMounted = useMounted();
  return computed(() => {
    isMounted.value;
    return Boolean(callback());
  });
}

function useMediaQuery(query, options = {}) {
  const { window = defaultWindow } = options;
  const isSupported = useSupported(() => window && "matchMedia" in window && typeof window.matchMedia === "function");
  let mediaQuery;
  const matches = ref(false);
  const handler = (event) => {
    matches.value = event.matches;
  };
  const cleanup = () => {
    if (!mediaQuery)
      return;
    if ("removeEventListener" in mediaQuery)
      mediaQuery.removeEventListener("change", handler);
    else
      mediaQuery.removeListener(handler);
  };
  const stopWatch = watchEffect(() => {
    if (!isSupported.value)
      return;
    cleanup();
    mediaQuery = window.matchMedia(toValue(query));
    if ("addEventListener" in mediaQuery)
      mediaQuery.addEventListener("change", handler);
    else
      mediaQuery.addListener(handler);
    matches.value = mediaQuery.matches;
  });
  tryOnScopeDispose(() => {
    stopWatch();
    cleanup();
    mediaQuery = void 0;
  });
  return matches;
}

function usePreferredDark(options) {
  return useMediaQuery("(prefers-color-scheme: dark)", options);
}

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
    emitAuto,
    disableTransition = true
  } = options;
  const modes = {
    auto: "",
    light: "light",
    dark: "dark",
    ...options.modes || {}
  };
  const preferredDark = usePreferredDark({ window });
  const system = computed(() => preferredDark.value ? "dark" : "light");
  const store = storageRef || (storageKey == null ? toRef(initialValue) : useStorage(storageKey, initialValue, storage, { window, listenToStorageChanges }));
  const state = computed(() => store.value === "auto" ? system.value : store.value);
  const updateHTMLAttrs = getSSRHandler(
    "updateHTMLAttrs",
    (selector2, attribute2, value) => {
      const el = typeof selector2 === "string" ? window == null ? void 0 : window.document.querySelector(selector2) : unrefElement(selector2);
      if (!el)
        return;
      let style;
      if (disableTransition) {
        style = window.document.createElement("style");
        const styleString = "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}";
        style.appendChild(document.createTextNode(styleString));
        window.document.head.appendChild(style);
      }
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
      if (disableTransition) {
        window.getComputedStyle(style).opacity;
        document.head.removeChild(style);
      }
    }
  );
  function defaultOnChanged(mode) {
    var _a;
    updateHTMLAttrs(selector, attribute, (_a = modes[mode]) != null ? _a : mode);
  }
  function onChanged(mode) {
    if (options.onChanged)
      options.onChanged(mode, defaultOnChanged);
    else
      defaultOnChanged(mode);
  }
  watch(state, onChanged, { flush: "post", immediate: true });
  tryOnMounted(() => onChanged(state.value));
  const auto = computed({
    get() {
      return emitAuto ? store.value : state.value;
    },
    set(v) {
      store.value = v;
    }
  });
  try {
    return Object.assign(auto, { store, system, state });
  } catch (e) {
    return auto;
  }
}

const UseColorMode = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseColorMode",
  props: ["selector", "attribute", "modes", "onChanged", "storageKey", "storage", "emitAuto"],
  setup(props, { slots }) {
    const mode = useColorMode(props);
    const data = reactive({
      mode,
      system: mode.system,
      store: mode.store
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDark = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseDark",
  props: ["selector", "attribute", "valueDark", "valueLight", "onChanged", "storageKey", "storage"],
  setup(props, { slots }) {
    const isDark = useDark(props);
    const data = reactive({
      isDark,
      toggleDark: useToggle(isDark)
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDeviceMotion = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseDeviceMotion",
  setup(props, { slots }) {
    const data = reactive(useDeviceMotion());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDeviceOrientation = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseDeviceOrientation",
  setup(props, { slots }) {
    const data = reactive(useDeviceOrientation());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDevicePixelRatio = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseDevicePixelRatio",
  setup(props, { slots }) {
    const data = reactive({
      pixelRatio: useDevicePixelRatio()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDevicesList = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseDevicesList",
  props: ["onUpdated", "requestPermissions", "constraints"],
  setup(props, { slots }) {
    const data = reactive(useDevicesList(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDocumentVisibility = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseDocumentVisibility",
  setup(props, { slots }) {
    const data = reactive({
      visibility: useDocumentVisibility()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDraggable = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseDraggable",
  props: [
    "storageKey",
    "storageType",
    "initialValue",
    "exact",
    "preventDefault",
    "stopPropagation",
    "pointerTypes",
    "as",
    "handle",
    "axis",
    "onStart",
    "onMove",
    "onEnd",
    "disabled"
  ],
  setup(props, { slots }) {
    const target = ref();
    const handle = computed(() => {
      var _a;
      return (_a = props.handle) != null ? _a : target.value;
    });
    const disabled = computed(() => !!props.disabled);
    const storageValue = props.storageKey && useStorage$1(
      props.storageKey,
      toValue(props.initialValue) || { x: 0, y: 0 },
      isClient$1 ? props.storageType === "session" ? sessionStorage : localStorage : void 0
    );
    const initialValue = storageValue || props.initialValue || { x: 0, y: 0 };
    const onEnd = (position, event) => {
      var _a;
      (_a = props.onEnd) == null ? void 0 : _a.call(props, position, event);
      if (!storageValue)
        return;
      storageValue.value.x = position.x;
      storageValue.value.y = position.y;
    };
    const data = reactive(useDraggable(target, {
      ...props,
      handle,
      initialValue,
      onEnd,
      disabled
    }));
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target, style: `touch-action:none;${data.style}` }, slots.default(data));
    };
  }
});

const UseElementBounding = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseElementBounding",
  props: ["box", "as"],
  setup(props, { slots }) {
    const target = ref();
    const data = reactive(useElementBounding(target));
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

function useElementHover(el, options = {}) {
  const {
    delayEnter = 0,
    delayLeave = 0,
    window = defaultWindow
  } = options;
  const isHovered = ref(false);
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

const vElementHover = {
  [directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function") {
      const isHovered = useElementHover(el);
      watch(isHovered, (v) => binding.value(v));
    }
  }
};

const UseElementSize = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseElementSize",
  props: ["width", "height", "box", "as"],
  setup(props, { slots }) {
    const target = ref();
    const data = reactive(useElementSize$1(target, { width: props.width, height: props.height }, { box: props.box }));
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

function useResizeObserver(target, callback, options = {}) {
  const { window = defaultWindow, ...observerOptions } = options;
  let observer;
  const isSupported = useSupported(() => window && "ResizeObserver" in window);
  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = void 0;
    }
  };
  const targets = computed(() => Array.isArray(target) ? target.map((el) => unrefElement(el)) : [unrefElement(target)]);
  const stopWatch = watch(
    targets,
    (els) => {
      cleanup();
      if (isSupported.value && window) {
        observer = new ResizeObserver(callback);
        for (const _el of els)
          _el && observer.observe(_el, observerOptions);
      }
    },
    { immediate: true, flush: "post" }
  );
  const stop = () => {
    cleanup();
    stopWatch();
  };
  tryOnScopeDispose(stop);
  return {
    isSupported,
    stop
  };
}

function useElementSize(target, initialSize = { width: 0, height: 0 }, options = {}) {
  const { window = defaultWindow, box = "content-box" } = options;
  const isSVG = computed(() => {
    var _a, _b;
    return (_b = (_a = unrefElement(target)) == null ? void 0 : _a.namespaceURI) == null ? void 0 : _b.includes("svg");
  });
  const width = ref(initialSize.width);
  const height = ref(initialSize.height);
  const { stop: stop1 } = useResizeObserver(
    target,
    ([entry]) => {
      const boxSize = box === "border-box" ? entry.borderBoxSize : box === "content-box" ? entry.contentBoxSize : entry.devicePixelContentBoxSize;
      if (window && isSVG.value) {
        const $elem = unrefElement(target);
        if ($elem) {
          const rect = $elem.getBoundingClientRect();
          width.value = rect.width;
          height.value = rect.height;
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
    },
    options
  );
  tryOnMounted(() => {
    const ele = unrefElement(target);
    if (ele) {
      width.value = "offsetWidth" in ele ? ele.offsetWidth : initialSize.width;
      height.value = "offsetHeight" in ele ? ele.offsetHeight : initialSize.height;
    }
  });
  const stop2 = watch(
    () => unrefElement(target),
    (ele) => {
      width.value = ele ? initialSize.width : 0;
      height.value = ele ? initialSize.height : 0;
    }
  );
  function stop() {
    stop1();
    stop2();
  }
  return {
    width,
    height,
    stop
  };
}

const vElementSize = {
  [directiveHooks.mounted](el, binding) {
    var _a;
    const handler = typeof binding.value === "function" ? binding.value : (_a = binding.value) == null ? void 0 : _a[0];
    const options = typeof binding.value === "function" ? [] : binding.value.slice(1);
    const { width, height } = useElementSize(el, ...options);
    watch([width, height], ([width2, height2]) => handler({ width: width2, height: height2 }));
  }
};

const UseElementVisibility = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseElementVisibility",
  props: ["as"],
  setup(props, { slots }) {
    const target = ref();
    const data = reactive({
      isVisible: useElementVisibility$1(target)
    });
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

function useIntersectionObserver(target, callback, options = {}) {
  const {
    root,
    rootMargin = "0px",
    threshold = 0.1,
    window = defaultWindow,
    immediate = true
  } = options;
  const isSupported = useSupported(() => window && "IntersectionObserver" in window);
  const targets = computed(() => {
    const _target = toValue(target);
    return (Array.isArray(_target) ? _target : [_target]).map(unrefElement).filter(notNullish);
  });
  let cleanup = noop;
  const isActive = ref(immediate);
  const stopWatch = isSupported.value ? watch(
    () => [targets.value, unrefElement(root), isActive.value],
    ([targets2, root2]) => {
      cleanup();
      if (!isActive.value)
        return;
      if (!targets2.length)
        return;
      const observer = new IntersectionObserver(
        callback,
        {
          root: unrefElement(root2),
          rootMargin,
          threshold
        }
      );
      targets2.forEach((el) => el && observer.observe(el));
      cleanup = () => {
        observer.disconnect();
        cleanup = noop;
      };
    },
    { immediate, flush: "post" }
  ) : noop;
  const stop = () => {
    cleanup();
    stopWatch();
    isActive.value = false;
  };
  tryOnScopeDispose(stop);
  return {
    isSupported,
    isActive,
    pause() {
      cleanup();
      isActive.value = false;
    },
    resume() {
      isActive.value = true;
    },
    stop
  };
}

function useElementVisibility(element, options = {}) {
  const { window = defaultWindow, scrollTarget, threshold = 0 } = options;
  const elementIsVisible = ref(false);
  useIntersectionObserver(
    element,
    (intersectionObserverEntries) => {
      let isIntersecting = elementIsVisible.value;
      let latestTime = 0;
      for (const entry of intersectionObserverEntries) {
        if (entry.time >= latestTime) {
          latestTime = entry.time;
          isIntersecting = entry.isIntersecting;
        }
      }
      elementIsVisible.value = isIntersecting;
    },
    {
      root: scrollTarget,
      window,
      threshold
    }
  );
  return elementIsVisible;
}

const vElementVisibility = {
  [directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function") {
      const handler = binding.value;
      const isVisible = useElementVisibility(el);
      watch(isVisible, (v) => handler(v), { immediate: true });
    } else {
      const [handler, options] = binding.value;
      const isVisible = useElementVisibility(el, options);
      watch(isVisible, (v) => handler(v), { immediate: true });
    }
  }
};

const UseEyeDropper = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseEyeDropper",
  props: {
    sRGBHex: String
  },
  setup(props, { slots }) {
    const data = reactive(useEyeDropper());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseFullscreen = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseFullscreen",
  props: ["as"],
  setup(props, { slots }) {
    const target = ref();
    const data = reactive(useFullscreen(target));
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

const UseGeolocation = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseGeolocation",
  props: ["enableHighAccuracy", "maximumAge", "timeout", "navigator"],
  setup(props, { slots }) {
    const data = reactive(useGeolocation(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseIdle = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseIdle",
  props: ["timeout", "events", "listenForVisibilityChange", "initialState"],
  setup(props, { slots }) {
    const data = reactive(useIdle(props.timeout, props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

function useAsyncState(promise, initialState, options) {
  const {
    immediate = true,
    delay = 0,
    onError = noop,
    onSuccess = noop,
    resetOnExecute = true,
    shallow = true,
    throwError
  } = options != null ? options : {};
  const state = shallow ? shallowRef(initialState) : ref(initialState);
  const isReady = ref(false);
  const isLoading = ref(false);
  const error = shallowRef(void 0);
  async function execute(delay2 = 0, ...args) {
    if (resetOnExecute)
      state.value = initialState;
    error.value = void 0;
    isReady.value = false;
    isLoading.value = true;
    if (delay2 > 0)
      await promiseTimeout(delay2);
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
        throw e;
    } finally {
      isLoading.value = false;
    }
    return state.value;
  }
  if (immediate)
    execute(delay);
  const shell = {
    state,
    isReady,
    isLoading,
    error,
    execute
  };
  function waitUntilIsLoaded() {
    return new Promise((resolve, reject) => {
      until(isLoading).toBe(false).then(() => resolve(shell)).catch(reject);
    });
  }
  return {
    ...shell,
    then(onFulfilled, onRejected) {
      return waitUntilIsLoaded().then(onFulfilled, onRejected);
    }
  };
}

async function loadImage(options) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const { src, srcset, sizes, class: clazz, loading, crossorigin, referrerPolicy } = options;
    img.src = src;
    if (srcset)
      img.srcset = srcset;
    if (sizes)
      img.sizes = sizes;
    if (clazz)
      img.className = clazz;
    if (loading)
      img.loading = loading;
    if (crossorigin)
      img.crossOrigin = crossorigin;
    if (referrerPolicy)
      img.referrerPolicy = referrerPolicy;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}
function useImage(options, asyncStateOptions = {}) {
  const state = useAsyncState(
    () => loadImage(toValue(options)),
    void 0,
    {
      resetOnExecute: true,
      ...asyncStateOptions
    }
  );
  watch(
    () => toValue(options),
    () => state.execute(asyncStateOptions.delay),
    { deep: true }
  );
  return state;
}

const UseImage = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseImage",
  props: [
    "src",
    "srcset",
    "sizes",
    "as",
    "alt",
    "class",
    "loading",
    "crossorigin",
    "referrerPolicy"
  ],
  setup(props, { slots }) {
    const data = reactive(useImage(props));
    return () => {
      if (data.isLoading && slots.loading)
        return slots.loading(data);
      else if (data.error && slots.error)
        return slots.error(data.error);
      if (slots.default)
        return slots.default(data);
      return h(props.as || "img", props);
    };
  }
});

const ARRIVED_STATE_THRESHOLD_PIXELS = 1;
function useScroll(element, options = {}) {
  const {
    throttle = 0,
    idle = 200,
    onStop = noop,
    onScroll = noop,
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
    behavior = "auto",
    window = defaultWindow,
    onError = (e) => {
      console.error(e);
    }
  } = options;
  const internalX = ref(0);
  const internalY = ref(0);
  const x = computed({
    get() {
      return internalX.value;
    },
    set(x2) {
      scrollTo(x2, void 0);
    }
  });
  const y = computed({
    get() {
      return internalY.value;
    },
    set(y2) {
      scrollTo(void 0, y2);
    }
  });
  function scrollTo(_x, _y) {
    var _a, _b, _c, _d;
    if (!window)
      return;
    const _element = toValue(element);
    if (!_element)
      return;
    (_c = _element instanceof Document ? window.document.body : _element) == null ? void 0 : _c.scrollTo({
      top: (_a = toValue(_y)) != null ? _a : y.value,
      left: (_b = toValue(_x)) != null ? _b : x.value,
      behavior: toValue(behavior)
    });
    const scrollContainer = ((_d = _element == null ? void 0 : _element.document) == null ? void 0 : _d.documentElement) || (_element == null ? void 0 : _element.documentElement) || _element;
    if (x != null)
      internalX.value = scrollContainer.scrollLeft;
    if (y != null)
      internalY.value = scrollContainer.scrollTop;
  }
  const isScrolling = ref(false);
  const arrivedState = reactive({
    left: true,
    right: false,
    top: true,
    bottom: false
  });
  const directions = reactive({
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
  const onScrollEndDebounced = useDebounceFn(onScrollEnd, throttle + idle);
  const setArrivedState = (target) => {
    var _a;
    if (!window)
      return;
    const el = ((_a = target == null ? void 0 : target.document) == null ? void 0 : _a.documentElement) || (target == null ? void 0 : target.documentElement) || unrefElement(target);
    const { display, flexDirection } = getComputedStyle(el);
    const scrollLeft = el.scrollLeft;
    directions.left = scrollLeft < internalX.value;
    directions.right = scrollLeft > internalX.value;
    const left = Math.abs(scrollLeft) <= (offset.left || 0);
    const right = Math.abs(scrollLeft) + el.clientWidth >= el.scrollWidth - (offset.right || 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
    if (display === "flex" && flexDirection === "row-reverse") {
      arrivedState.left = right;
      arrivedState.right = left;
    } else {
      arrivedState.left = left;
      arrivedState.right = right;
    }
    internalX.value = scrollLeft;
    let scrollTop = el.scrollTop;
    if (target === window.document && !scrollTop)
      scrollTop = window.document.body.scrollTop;
    directions.top = scrollTop < internalY.value;
    directions.bottom = scrollTop > internalY.value;
    const top = Math.abs(scrollTop) <= (offset.top || 0);
    const bottom = Math.abs(scrollTop) + el.clientHeight >= el.scrollHeight - (offset.bottom || 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
    if (display === "flex" && flexDirection === "column-reverse") {
      arrivedState.top = bottom;
      arrivedState.bottom = top;
    } else {
      arrivedState.top = top;
      arrivedState.bottom = bottom;
    }
    internalY.value = scrollTop;
  };
  const onScrollHandler = (e) => {
    var _a;
    if (!window)
      return;
    const eventTarget = (_a = e.target.documentElement) != null ? _a : e.target;
    setArrivedState(eventTarget);
    isScrolling.value = true;
    onScrollEndDebounced(e);
    onScroll(e);
  };
  useEventListener(
    element,
    "scroll",
    throttle ? useThrottleFn(onScrollHandler, throttle, true, false) : onScrollHandler,
    eventListenerOptions
  );
  tryOnMounted(() => {
    try {
      const _element = toValue(element);
      if (!_element)
        return;
      setArrivedState(_element);
    } catch (e) {
      onError(e);
    }
  });
  useEventListener(
    element,
    "scrollend",
    onScrollEnd,
    eventListenerOptions
  );
  return {
    x,
    y,
    isScrolling,
    arrivedState,
    directions,
    measure() {
      const _element = toValue(element);
      if (window && _element)
        setArrivedState(_element);
    }
  };
}

function resolveElement(el) {
  if (typeof Window !== "undefined" && el instanceof Window)
    return el.document.documentElement;
  if (typeof Document !== "undefined" && el instanceof Document)
    return el.documentElement;
  return el;
}

function useInfiniteScroll(element, onLoadMore, options = {}) {
  var _a;
  const {
    direction = "bottom",
    interval = 100,
    canLoadMore = () => true
  } = options;
  const state = reactive(useScroll(
    element,
    {
      ...options,
      offset: {
        [direction]: (_a = options.distance) != null ? _a : 0,
        ...options.offset
      }
    }
  ));
  const promise = ref();
  const isLoading = computed(() => !!promise.value);
  const observedElement = computed(() => {
    return resolveElement(toValue(element));
  });
  const isElementVisible = useElementVisibility(observedElement);
  function checkAndLoad() {
    state.measure();
    if (!observedElement.value || !isElementVisible.value || !canLoadMore(observedElement.value))
      return;
    const { scrollHeight, clientHeight, scrollWidth, clientWidth } = observedElement.value;
    const isNarrower = direction === "bottom" || direction === "top" ? scrollHeight <= clientHeight : scrollWidth <= clientWidth;
    if (state.arrivedState[direction] || isNarrower) {
      if (!promise.value) {
        promise.value = Promise.all([
          onLoadMore(state),
          new Promise((resolve) => setTimeout(resolve, interval))
        ]).finally(() => {
          promise.value = null;
          nextTick(() => checkAndLoad());
        });
      }
    }
  }
  watch(
    () => [state.arrivedState[direction], isElementVisible.value],
    checkAndLoad,
    { immediate: true }
  );
  return {
    isLoading
  };
}

const vInfiniteScroll = {
  [directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function")
      useInfiniteScroll(el, binding.value);
    else
      useInfiniteScroll(el, ...binding.value);
  }
};

const vIntersectionObserver = {
  [directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function")
      useIntersectionObserver(el, binding.value);
    else
      useIntersectionObserver(el, ...binding.value);
  }
};

const UseMouse = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseMouse",
  props: ["touch", "resetOnTouchEnds", "initialValue"],
  setup(props, { slots }) {
    const data = reactive(useMouse(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseMouseInElement = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseMouseElement",
  props: ["handleOutside", "as"],
  setup(props, { slots }) {
    const target = ref();
    const data = reactive(useMouseInElement(target, props));
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

const UseMousePressed = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseMousePressed",
  props: ["touch", "initialValue", "as"],
  setup(props, { slots }) {
    const target = ref();
    const data = reactive(useMousePressed({ ...props, target }));
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

const UseNetwork = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseNetwork",
  setup(props, { slots }) {
    const data = reactive(useNetwork());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseNow = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseNow",
  props: ["interval"],
  setup(props, { slots }) {
    const data = reactive(useNow({ ...props, controls: true }));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseObjectUrl = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseObjectUrl",
  props: [
    "object"
  ],
  setup(props, { slots }) {
    const object = toRef(props, "object");
    const url = useObjectUrl(object);
    return () => {
      if (slots.default && url.value)
        return slots.default(url);
    };
  }
});

const UseOffsetPagination = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseOffsetPagination",
  props: [
    "total",
    "page",
    "pageSize",
    "onPageChange",
    "onPageSizeChange",
    "onPageCountChange"
  ],
  emits: [
    "page-change",
    "page-size-change",
    "page-count-change"
  ],
  setup(props, { slots, emit }) {
    const data = reactive(useOffsetPagination({
      ...props,
      onPageChange(...args) {
        var _a;
        (_a = props.onPageChange) == null ? void 0 : _a.call(props, ...args);
        emit("page-change", ...args);
      },
      onPageSizeChange(...args) {
        var _a;
        (_a = props.onPageSizeChange) == null ? void 0 : _a.call(props, ...args);
        emit("page-size-change", ...args);
      },
      onPageCountChange(...args) {
        var _a;
        (_a = props.onPageCountChange) == null ? void 0 : _a.call(props, ...args);
        emit("page-count-change", ...args);
      }
    }));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseOnline = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseOnline",
  setup(props, { slots }) {
    const data = reactive({
      isOnline: useOnline()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePageLeave = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UsePageLeave",
  setup(props, { slots }) {
    const data = reactive({
      isLeft: usePageLeave()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePointer = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UsePointer",
  props: [
    "pointerTypes",
    "initialValue",
    "target"
  ],
  setup(props, { slots }) {
    const el = ref(null);
    const data = reactive(usePointer({
      ...props,
      target: props.target === "self" ? el : defaultWindow
    }));
    return () => {
      if (slots.default)
        return slots.default(data, { ref: el });
    };
  }
});

const UsePointerLock = /* #__PURE__ */ defineComponent({
  name: "UsePointerLock",
  props: ["as"],
  setup(props, { slots }) {
    const target = ref();
    const data = reactive(usePointerLock(target));
    return () => {
      if (slots.default)
        return h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

const UsePreferredColorScheme = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UsePreferredColorScheme",
  setup(props, { slots }) {
    const data = reactive({
      colorScheme: usePreferredColorScheme()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePreferredContrast = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UsePreferredContrast",
  setup(props, { slots }) {
    const data = reactive({
      contrast: usePreferredContrast()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePreferredDark = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UsePreferredDark",
  setup(props, { slots }) {
    const data = reactive({
      prefersDark: usePreferredDark$1()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePreferredLanguages = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UsePreferredLanguages",
  setup(props, { slots }) {
    const data = reactive({
      languages: usePreferredLanguages()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePreferredReducedMotion = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UsePreferredReducedMotion",
  setup(props, { slots }) {
    const data = reactive({
      motion: usePreferredReducedMotion()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

function useMutationObserver(target, callback, options = {}) {
  const { window = defaultWindow, ...mutationOptions } = options;
  let observer;
  const isSupported = useSupported(() => window && "MutationObserver" in window);
  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = void 0;
    }
  };
  const targets = computed(() => {
    const value = toValue(target);
    const items = (Array.isArray(value) ? value : [value]).map(unrefElement).filter(notNullish);
    return new Set(items);
  });
  const stopWatch = watch(
    () => targets.value,
    (targets2) => {
      cleanup();
      if (isSupported.value && targets2.size) {
        observer = new MutationObserver(callback);
        targets2.forEach((el) => observer.observe(el, mutationOptions));
      }
    },
    { immediate: true, flush: "post" }
  );
  const takeRecords = () => {
    return observer == null ? void 0 : observer.takeRecords();
  };
  const stop = () => {
    cleanup();
    stopWatch();
  };
  tryOnScopeDispose(stop);
  return {
    isSupported,
    stop,
    takeRecords
  };
}

function useCssVar(prop, target, options = {}) {
  const { window = defaultWindow, initialValue = "", observe = false } = options;
  const variable = ref(initialValue);
  const elRef = computed(() => {
    var _a;
    return unrefElement(target) || ((_a = window == null ? void 0 : window.document) == null ? void 0 : _a.documentElement);
  });
  function updateCssVar() {
    var _a;
    const key = toValue(prop);
    const el = toValue(elRef);
    if (el && window) {
      const value = (_a = window.getComputedStyle(el).getPropertyValue(key)) == null ? void 0 : _a.trim();
      variable.value = value || initialValue;
    }
  }
  if (observe) {
    useMutationObserver(elRef, updateCssVar, {
      attributeFilter: ["style", "class"],
      window
    });
  }
  watch(
    [elRef, () => toValue(prop)],
    updateCssVar,
    { immediate: true }
  );
  watch(
    variable,
    (val) => {
      var _a;
      if ((_a = elRef.value) == null ? void 0 : _a.style)
        elRef.value.style.setProperty(toValue(prop), val);
    }
  );
  return variable;
}

const topVarName = "--vueuse-safe-area-top";
const rightVarName = "--vueuse-safe-area-right";
const bottomVarName = "--vueuse-safe-area-bottom";
const leftVarName = "--vueuse-safe-area-left";
function useScreenSafeArea() {
  const top = ref("");
  const right = ref("");
  const bottom = ref("");
  const left = ref("");
  if (isClient) {
    const topCssVar = useCssVar(topVarName);
    const rightCssVar = useCssVar(rightVarName);
    const bottomCssVar = useCssVar(bottomVarName);
    const leftCssVar = useCssVar(leftVarName);
    topCssVar.value = "env(safe-area-inset-top, 0px)";
    rightCssVar.value = "env(safe-area-inset-right, 0px)";
    bottomCssVar.value = "env(safe-area-inset-bottom, 0px)";
    leftCssVar.value = "env(safe-area-inset-left, 0px)";
    update();
    useEventListener("resize", useDebounceFn(update));
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

const UseScreenSafeArea = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseScreenSafeArea",
  props: {
    top: Boolean,
    right: Boolean,
    bottom: Boolean,
    left: Boolean
  },
  setup(props, { slots }) {
    const {
      top,
      right,
      bottom,
      left
    } = useScreenSafeArea();
    return () => {
      if (slots.default) {
        return h("div", {
          style: {
            paddingTop: props.top ? top.value : "",
            paddingRight: props.right ? right.value : "",
            paddingBottom: props.bottom ? bottom.value : "",
            paddingLeft: props.left ? left.value : "",
            boxSizing: "border-box",
            maxHeight: "100vh",
            maxWidth: "100vw",
            overflow: "auto"
          }
        }, slots.default());
      }
    };
  }
});

const vScroll = {
  [directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function") {
      const handler = binding.value;
      const state = useScroll(el, {
        onScroll() {
          handler(state);
        },
        onStop() {
          handler(state);
        }
      });
    } else {
      const [handler, options] = binding.value;
      const state = useScroll(el, {
        ...options,
        onScroll(e) {
          var _a;
          (_a = options.onScroll) == null ? void 0 : _a.call(options, e);
          handler(state);
        },
        onStop(e) {
          var _a;
          (_a = options.onStop) == null ? void 0 : _a.call(options, e);
          handler(state);
        }
      });
    }
  }
};

function checkOverflowScroll(ele) {
  const style = window.getComputedStyle(ele);
  if (style.overflowX === "scroll" || style.overflowY === "scroll" || style.overflowX === "auto" && ele.clientWidth < ele.scrollWidth || style.overflowY === "auto" && ele.clientHeight < ele.scrollHeight) {
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
const elInitialOverflow = /* @__PURE__ */ new WeakMap();
function useScrollLock(element, initialState = false) {
  const isLocked = ref(initialState);
  let stopTouchMoveListener = null;
  let initialOverflow = "";
  watch(toRef(element), (el) => {
    const target = resolveElement(toValue(el));
    if (target) {
      const ele = target;
      if (!elInitialOverflow.get(ele))
        elInitialOverflow.set(ele, ele.style.overflow);
      if (ele.style.overflow !== "hidden")
        initialOverflow = ele.style.overflow;
      if (ele.style.overflow === "hidden")
        return isLocked.value = true;
      if (isLocked.value)
        return ele.style.overflow = "hidden";
    }
  }, {
    immediate: true
  });
  const lock = () => {
    const el = resolveElement(toValue(element));
    if (!el || isLocked.value)
      return;
    if (isIOS) {
      stopTouchMoveListener = useEventListener(
        el,
        "touchmove",
        (e) => {
          preventDefault(e);
        },
        { passive: false }
      );
    }
    el.style.overflow = "hidden";
    isLocked.value = true;
  };
  const unlock = () => {
    const el = resolveElement(toValue(element));
    if (!el || !isLocked.value)
      return;
    isIOS && (stopTouchMoveListener == null ? void 0 : stopTouchMoveListener());
    el.style.overflow = initialOverflow;
    elInitialOverflow.delete(el);
    isLocked.value = false;
  };
  tryOnScopeDispose(unlock);
  return computed({
    get() {
      return isLocked.value;
    },
    set(v) {
      if (v)
        lock();
      else unlock();
    }
  });
}

function onScrollLock() {
  let isMounted = false;
  const state = ref(false);
  return (el, binding) => {
    state.value = binding.value;
    if (isMounted)
      return;
    isMounted = true;
    const isLocked = useScrollLock(el, binding.value);
    watch(state, (v) => isLocked.value = v);
  };
}
const vScrollLock = onScrollLock();

const UseTimeAgo = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseTimeAgo",
  props: ["time", "updateInterval", "max", "fullDateFormatter", "messages", "showSecond"],
  setup(props, { slots }) {
    const data = reactive(useTimeAgo(() => props.time, { ...props, controls: true }));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseTimestamp = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseTimestamp",
  props: ["immediate", "interval", "offset"],
  setup(props, { slots }) {
    const data = reactive(useTimestamp({ ...props, controls: true }));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseVirtualList = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseVirtualList",
  props: [
    "list",
    "options",
    "height"
  ],
  setup(props, { slots, expose }) {
    const { list: listRef } = toRefs(props);
    const { list, containerProps, wrapperProps, scrollTo } = useVirtualList(listRef, props.options);
    expose({ scrollTo });
    if (containerProps.style && typeof containerProps.style === "object" && !Array.isArray(containerProps.style))
      containerProps.style.height = props.height || "300px";
    return () => h("div", { ...containerProps }, [
      h("div", { ...wrapperProps.value }, list.value.map((item) => h("div", { style: { overflow: "hidden", height: item.height } }, slots.default ? slots.default(item) : "Please set content!")))
    ]);
  }
});

const UseWindowFocus = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseWindowFocus",
  setup(props, { slots }) {
    const data = reactive({
      focused: useWindowFocus()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseWindowSize = /* @__PURE__ */ /* #__PURE__ */ defineComponent({
  name: "UseWindowSize",
  props: ["initialWidth", "initialHeight"],
  setup(props, { slots }) {
    const data = reactive(useWindowSize(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

export { OnClickOutside, OnLongPress, UseActiveElement, UseBattery, UseBrowserLocation, UseClipboard, UseColorMode, UseDark, UseDeviceMotion, UseDeviceOrientation, UseDevicePixelRatio, UseDevicesList, UseDocumentVisibility, UseDraggable, UseElementBounding, UseElementSize, UseElementVisibility, UseEyeDropper, UseFullscreen, UseGeolocation, UseIdle, UseImage, UseMouse, UseMouseInElement, UseMousePressed, UseNetwork, UseNow, UseObjectUrl, UseOffsetPagination, UseOnline, UsePageLeave, UsePointer, UsePointerLock, UsePreferredColorScheme, UsePreferredContrast, UsePreferredDark, UsePreferredLanguages, UsePreferredReducedMotion, UseScreenSafeArea, UseTimeAgo, UseTimestamp, UseVirtualList, UseWindowFocus, UseWindowSize, vOnClickOutside as VOnClickOutside, vOnLongPress as VOnLongPress, vElementHover, vElementSize, vElementVisibility, vInfiniteScroll, vIntersectionObserver, vOnClickOutside, vOnKeyStroke, vOnLongPress, vScroll, vScrollLock };
