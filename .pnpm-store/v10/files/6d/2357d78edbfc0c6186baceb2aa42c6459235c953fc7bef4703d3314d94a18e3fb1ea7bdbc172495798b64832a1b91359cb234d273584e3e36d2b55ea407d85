'use strict';

var vueDemi = require('vue-demi');
var core = require('@vueuse/core');
var shared = require('@vueuse/shared');

const OnClickOutside = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "OnClickOutside",
  props: ["as", "options"],
  emits: ["trigger"],
  setup(props, { slots, emit }) {
    const target = vueDemi.ref();
    core.onClickOutside(target, (e) => {
      emit("trigger", e);
    }, props.options);
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target }, slots.default());
    };
  }
});

function unrefElement(elRef) {
  var _a;
  const plain = shared.toValue(elRef);
  return (_a = plain == null ? void 0 : plain.$el) != null ? _a : plain;
}

const defaultWindow = shared.isClient ? window : void 0;

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
  const stopWatch = vueDemi.watch(
    () => [unrefElement(target), shared.toValue(options)],
    ([el, options2]) => {
      cleanup();
      if (!el)
        return;
      const optionsClone = shared.isObject(options2) ? { ...options2 } : options2;
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
  shared.tryOnScopeDispose(stop);
  return stop;
}

let _iOSWorkaround = false;
function onClickOutside(target, handler, options = {}) {
  const { window = defaultWindow, ignore = [], capture = true, detectIframe = false } = options;
  if (!window)
    return shared.noop;
  if (shared.isIOS && !_iOSWorkaround) {
    _iOSWorkaround = true;
    Array.from(window.document.body.children).forEach((el) => el.addEventListener("click", shared.noop));
    window.document.documentElement.addEventListener("click", shared.noop);
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
  [shared.directiveHooks.mounted](el, binding) {
    const capture = !binding.modifiers.bubble;
    if (typeof binding.value === "function") {
      el.__onClickOutside_stop = onClickOutside(el, binding.value, { capture });
    } else {
      const [handler, options] = binding.value;
      el.__onClickOutside_stop = onClickOutside(el, handler, Object.assign({ capture }, options));
    }
  },
  [shared.directiveHooks.unmounted](el) {
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
    if (e.repeat && shared.toValue(dedupe))
      return;
    if (predicate(e))
      handler(e);
  };
  return useEventListener(target, eventName, listener, passive);
}

const vOnKeyStroke = {
  [shared.directiveHooks.mounted](el, binding) {
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
  const elementRef = vueDemi.computed(() => unrefElement(target));
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

const OnLongPress = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "OnLongPress",
  props: ["as", "options"],
  emits: ["trigger"],
  setup(props, { slots, emit }) {
    const target = vueDemi.ref();
    onLongPress(
      target,
      (e) => {
        emit("trigger", e);
      },
      props.options
    );
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target }, slots.default());
    };
  }
});

const vOnLongPress = {
  [shared.directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function")
      onLongPress(el, binding.value, { modifiers: binding.modifiers });
    else
      onLongPress(el, ...binding.value);
  }
};

const UseActiveElement = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseActiveElement",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      element: core.useActiveElement()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseBattery = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseBattery",
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useBattery(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseBrowserLocation = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseBrowserLocation",
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useBrowserLocation());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseClipboard = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseClipboard",
  props: [
    "source",
    "read",
    "navigator",
    "copiedDuring",
    "legacy"
  ],
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useClipboard(props));
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
  const data = (shallow ? vueDemi.shallowRef : vueDemi.ref)(typeof defaults === "function" ? defaults() : defaults);
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
  const rawInit = shared.toValue(defaults);
  const type = guessSerializerType(rawInit);
  const serializer = (_a = options.serializer) != null ? _a : StorageSerializers[type];
  const { pause: pauseWatch, resume: resumeWatch } = shared.pausableWatch(
    data,
    () => write(data.value),
    { flush, deep, eventFilter }
  );
  if (window && listenToStorageChanges) {
    shared.tryOnMounted(() => {
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
        vueDemi.nextTick(resumeWatch);
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
  const isMounted = vueDemi.ref(false);
  const instance = vueDemi.getCurrentInstance();
  if (instance) {
    vueDemi.onMounted(() => {
      isMounted.value = true;
    }, vueDemi.isVue2 ? void 0 : instance);
  }
  return isMounted;
}

function useSupported(callback) {
  const isMounted = useMounted();
  return vueDemi.computed(() => {
    isMounted.value;
    return Boolean(callback());
  });
}

function useMediaQuery(query, options = {}) {
  const { window = defaultWindow } = options;
  const isSupported = useSupported(() => window && "matchMedia" in window && typeof window.matchMedia === "function");
  let mediaQuery;
  const matches = vueDemi.ref(false);
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
  const stopWatch = vueDemi.watchEffect(() => {
    if (!isSupported.value)
      return;
    cleanup();
    mediaQuery = window.matchMedia(shared.toValue(query));
    if ("addEventListener" in mediaQuery)
      mediaQuery.addEventListener("change", handler);
    else
      mediaQuery.addListener(handler);
    matches.value = mediaQuery.matches;
  });
  shared.tryOnScopeDispose(() => {
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
  const system = vueDemi.computed(() => preferredDark.value ? "dark" : "light");
  const store = storageRef || (storageKey == null ? shared.toRef(initialValue) : useStorage(storageKey, initialValue, storage, { window, listenToStorageChanges }));
  const state = vueDemi.computed(() => store.value === "auto" ? system.value : store.value);
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
  vueDemi.watch(state, onChanged, { flush: "post", immediate: true });
  shared.tryOnMounted(() => onChanged(state.value));
  const auto = vueDemi.computed({
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

const UseColorMode = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseColorMode",
  props: ["selector", "attribute", "modes", "onChanged", "storageKey", "storage", "emitAuto"],
  setup(props, { slots }) {
    const mode = useColorMode(props);
    const data = vueDemi.reactive({
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

const UseDark = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseDark",
  props: ["selector", "attribute", "valueDark", "valueLight", "onChanged", "storageKey", "storage"],
  setup(props, { slots }) {
    const isDark = core.useDark(props);
    const data = vueDemi.reactive({
      isDark,
      toggleDark: shared.useToggle(isDark)
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDeviceMotion = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseDeviceMotion",
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useDeviceMotion());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDeviceOrientation = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseDeviceOrientation",
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useDeviceOrientation());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDevicePixelRatio = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseDevicePixelRatio",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      pixelRatio: core.useDevicePixelRatio()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDevicesList = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseDevicesList",
  props: ["onUpdated", "requestPermissions", "constraints"],
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useDevicesList(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDocumentVisibility = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseDocumentVisibility",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      visibility: core.useDocumentVisibility()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseDraggable = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
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
    const target = vueDemi.ref();
    const handle = vueDemi.computed(() => {
      var _a;
      return (_a = props.handle) != null ? _a : target.value;
    });
    const disabled = vueDemi.computed(() => !!props.disabled);
    const storageValue = props.storageKey && core.useStorage(
      props.storageKey,
      shared.toValue(props.initialValue) || { x: 0, y: 0 },
      core.isClient ? props.storageType === "session" ? sessionStorage : localStorage : void 0
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
    const data = vueDemi.reactive(core.useDraggable(target, {
      ...props,
      handle,
      initialValue,
      onEnd,
      disabled
    }));
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target, style: `touch-action:none;${data.style}` }, slots.default(data));
    };
  }
});

const UseElementBounding = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseElementBounding",
  props: ["box", "as"],
  setup(props, { slots }) {
    const target = vueDemi.ref();
    const data = vueDemi.reactive(core.useElementBounding(target));
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

function useElementHover(el, options = {}) {
  const {
    delayEnter = 0,
    delayLeave = 0,
    window = defaultWindow
  } = options;
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

const vElementHover = {
  [shared.directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function") {
      const isHovered = useElementHover(el);
      vueDemi.watch(isHovered, (v) => binding.value(v));
    }
  }
};

const UseElementSize = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseElementSize",
  props: ["width", "height", "box", "as"],
  setup(props, { slots }) {
    const target = vueDemi.ref();
    const data = vueDemi.reactive(core.useElementSize(target, { width: props.width, height: props.height }, { box: props.box }));
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target }, slots.default(data));
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
  const targets = vueDemi.computed(() => Array.isArray(target) ? target.map((el) => unrefElement(el)) : [unrefElement(target)]);
  const stopWatch = vueDemi.watch(
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
  shared.tryOnScopeDispose(stop);
  return {
    isSupported,
    stop
  };
}

function useElementSize(target, initialSize = { width: 0, height: 0 }, options = {}) {
  const { window = defaultWindow, box = "content-box" } = options;
  const isSVG = vueDemi.computed(() => {
    var _a, _b;
    return (_b = (_a = unrefElement(target)) == null ? void 0 : _a.namespaceURI) == null ? void 0 : _b.includes("svg");
  });
  const width = vueDemi.ref(initialSize.width);
  const height = vueDemi.ref(initialSize.height);
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
  shared.tryOnMounted(() => {
    const ele = unrefElement(target);
    if (ele) {
      width.value = "offsetWidth" in ele ? ele.offsetWidth : initialSize.width;
      height.value = "offsetHeight" in ele ? ele.offsetHeight : initialSize.height;
    }
  });
  const stop2 = vueDemi.watch(
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
  [shared.directiveHooks.mounted](el, binding) {
    var _a;
    const handler = typeof binding.value === "function" ? binding.value : (_a = binding.value) == null ? void 0 : _a[0];
    const options = typeof binding.value === "function" ? [] : binding.value.slice(1);
    const { width, height } = useElementSize(el, ...options);
    vueDemi.watch([width, height], ([width2, height2]) => handler({ width: width2, height: height2 }));
  }
};

const UseElementVisibility = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseElementVisibility",
  props: ["as"],
  setup(props, { slots }) {
    const target = vueDemi.ref();
    const data = vueDemi.reactive({
      isVisible: core.useElementVisibility(target)
    });
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target }, slots.default(data));
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
  const targets = vueDemi.computed(() => {
    const _target = shared.toValue(target);
    return (Array.isArray(_target) ? _target : [_target]).map(unrefElement).filter(shared.notNullish);
  });
  let cleanup = shared.noop;
  const isActive = vueDemi.ref(immediate);
  const stopWatch = isSupported.value ? vueDemi.watch(
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
        cleanup = shared.noop;
      };
    },
    { immediate, flush: "post" }
  ) : shared.noop;
  const stop = () => {
    cleanup();
    stopWatch();
    isActive.value = false;
  };
  shared.tryOnScopeDispose(stop);
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
  const elementIsVisible = vueDemi.ref(false);
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
  [shared.directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function") {
      const handler = binding.value;
      const isVisible = useElementVisibility(el);
      vueDemi.watch(isVisible, (v) => handler(v), { immediate: true });
    } else {
      const [handler, options] = binding.value;
      const isVisible = useElementVisibility(el, options);
      vueDemi.watch(isVisible, (v) => handler(v), { immediate: true });
    }
  }
};

const UseEyeDropper = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseEyeDropper",
  props: {
    sRGBHex: String
  },
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useEyeDropper());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseFullscreen = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseFullscreen",
  props: ["as"],
  setup(props, { slots }) {
    const target = vueDemi.ref();
    const data = vueDemi.reactive(core.useFullscreen(target));
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

const UseGeolocation = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseGeolocation",
  props: ["enableHighAccuracy", "maximumAge", "timeout", "navigator"],
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useGeolocation(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseIdle = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseIdle",
  props: ["timeout", "events", "listenForVisibilityChange", "initialState"],
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useIdle(props.timeout, props));
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
    onError = shared.noop,
    onSuccess = shared.noop,
    resetOnExecute = true,
    shallow = true,
    throwError
  } = options != null ? options : {};
  const state = shallow ? vueDemi.shallowRef(initialState) : vueDemi.ref(initialState);
  const isReady = vueDemi.ref(false);
  const isLoading = vueDemi.ref(false);
  const error = vueDemi.shallowRef(void 0);
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
      shared.until(isLoading).toBe(false).then(() => resolve(shell)).catch(reject);
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
    () => loadImage(shared.toValue(options)),
    void 0,
    {
      resetOnExecute: true,
      ...asyncStateOptions
    }
  );
  vueDemi.watch(
    () => shared.toValue(options),
    () => state.execute(asyncStateOptions.delay),
    { deep: true }
  );
  return state;
}

const UseImage = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
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
    const data = vueDemi.reactive(useImage(props));
    return () => {
      if (data.isLoading && slots.loading)
        return slots.loading(data);
      else if (data.error && slots.error)
        return slots.error(data.error);
      if (slots.default)
        return slots.default(data);
      return vueDemi.h(props.as || "img", props);
    };
  }
});

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
    behavior = "auto",
    window = defaultWindow,
    onError = (e) => {
      console.error(e);
    }
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
    var _a, _b, _c, _d;
    if (!window)
      return;
    const _element = shared.toValue(element);
    if (!_element)
      return;
    (_c = _element instanceof Document ? window.document.body : _element) == null ? void 0 : _c.scrollTo({
      top: (_a = shared.toValue(_y)) != null ? _a : y.value,
      left: (_b = shared.toValue(_x)) != null ? _b : x.value,
      behavior: shared.toValue(behavior)
    });
    const scrollContainer = ((_d = _element == null ? void 0 : _element.document) == null ? void 0 : _d.documentElement) || (_element == null ? void 0 : _element.documentElement) || _element;
    if (x != null)
      internalX.value = scrollContainer.scrollLeft;
    if (y != null)
      internalY.value = scrollContainer.scrollTop;
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
    throttle ? shared.useThrottleFn(onScrollHandler, throttle, true, false) : onScrollHandler,
    eventListenerOptions
  );
  shared.tryOnMounted(() => {
    try {
      const _element = shared.toValue(element);
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
      const _element = shared.toValue(element);
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
  const state = vueDemi.reactive(useScroll(
    element,
    {
      ...options,
      offset: {
        [direction]: (_a = options.distance) != null ? _a : 0,
        ...options.offset
      }
    }
  ));
  const promise = vueDemi.ref();
  const isLoading = vueDemi.computed(() => !!promise.value);
  const observedElement = vueDemi.computed(() => {
    return resolveElement(shared.toValue(element));
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
          vueDemi.nextTick(() => checkAndLoad());
        });
      }
    }
  }
  vueDemi.watch(
    () => [state.arrivedState[direction], isElementVisible.value],
    checkAndLoad,
    { immediate: true }
  );
  return {
    isLoading
  };
}

const vInfiniteScroll = {
  [shared.directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function")
      useInfiniteScroll(el, binding.value);
    else
      useInfiniteScroll(el, ...binding.value);
  }
};

const vIntersectionObserver = {
  [shared.directiveHooks.mounted](el, binding) {
    if (typeof binding.value === "function")
      useIntersectionObserver(el, binding.value);
    else
      useIntersectionObserver(el, ...binding.value);
  }
};

const UseMouse = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseMouse",
  props: ["touch", "resetOnTouchEnds", "initialValue"],
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useMouse(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseMouseInElement = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseMouseElement",
  props: ["handleOutside", "as"],
  setup(props, { slots }) {
    const target = vueDemi.ref();
    const data = vueDemi.reactive(core.useMouseInElement(target, props));
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

const UseMousePressed = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseMousePressed",
  props: ["touch", "initialValue", "as"],
  setup(props, { slots }) {
    const target = vueDemi.ref();
    const data = vueDemi.reactive(core.useMousePressed({ ...props, target }));
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

const UseNetwork = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseNetwork",
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useNetwork());
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseNow = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseNow",
  props: ["interval"],
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useNow({ ...props, controls: true }));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseObjectUrl = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseObjectUrl",
  props: [
    "object"
  ],
  setup(props, { slots }) {
    const object = shared.toRef(props, "object");
    const url = core.useObjectUrl(object);
    return () => {
      if (slots.default && url.value)
        return slots.default(url);
    };
  }
});

const UseOffsetPagination = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
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
    const data = vueDemi.reactive(core.useOffsetPagination({
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

const UseOnline = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseOnline",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      isOnline: core.useOnline()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePageLeave = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UsePageLeave",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      isLeft: core.usePageLeave()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePointer = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UsePointer",
  props: [
    "pointerTypes",
    "initialValue",
    "target"
  ],
  setup(props, { slots }) {
    const el = vueDemi.ref(null);
    const data = vueDemi.reactive(core.usePointer({
      ...props,
      target: props.target === "self" ? el : defaultWindow
    }));
    return () => {
      if (slots.default)
        return slots.default(data, { ref: el });
    };
  }
});

const UsePointerLock = /* #__PURE__ */ vueDemi.defineComponent({
  name: "UsePointerLock",
  props: ["as"],
  setup(props, { slots }) {
    const target = vueDemi.ref();
    const data = vueDemi.reactive(core.usePointerLock(target));
    return () => {
      if (slots.default)
        return vueDemi.h(props.as || "div", { ref: target }, slots.default(data));
    };
  }
});

const UsePreferredColorScheme = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UsePreferredColorScheme",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      colorScheme: core.usePreferredColorScheme()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePreferredContrast = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UsePreferredContrast",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      contrast: core.usePreferredContrast()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePreferredDark = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UsePreferredDark",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      prefersDark: core.usePreferredDark()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePreferredLanguages = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UsePreferredLanguages",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      languages: core.usePreferredLanguages()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UsePreferredReducedMotion = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UsePreferredReducedMotion",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      motion: core.usePreferredReducedMotion()
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
  const targets = vueDemi.computed(() => {
    const value = shared.toValue(target);
    const items = (Array.isArray(value) ? value : [value]).map(unrefElement).filter(shared.notNullish);
    return new Set(items);
  });
  const stopWatch = vueDemi.watch(
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
  shared.tryOnScopeDispose(stop);
  return {
    isSupported,
    stop,
    takeRecords
  };
}

function useCssVar(prop, target, options = {}) {
  const { window = defaultWindow, initialValue = "", observe = false } = options;
  const variable = vueDemi.ref(initialValue);
  const elRef = vueDemi.computed(() => {
    var _a;
    return unrefElement(target) || ((_a = window == null ? void 0 : window.document) == null ? void 0 : _a.documentElement);
  });
  function updateCssVar() {
    var _a;
    const key = shared.toValue(prop);
    const el = shared.toValue(elRef);
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
  vueDemi.watch(
    [elRef, () => shared.toValue(prop)],
    updateCssVar,
    { immediate: true }
  );
  vueDemi.watch(
    variable,
    (val) => {
      var _a;
      if ((_a = elRef.value) == null ? void 0 : _a.style)
        elRef.value.style.setProperty(shared.toValue(prop), val);
    }
  );
  return variable;
}

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

const UseScreenSafeArea = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
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
        return vueDemi.h("div", {
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
  [shared.directiveHooks.mounted](el, binding) {
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
  const isLocked = vueDemi.ref(initialState);
  let stopTouchMoveListener = null;
  let initialOverflow = "";
  vueDemi.watch(shared.toRef(element), (el) => {
    const target = resolveElement(shared.toValue(el));
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
    const el = resolveElement(shared.toValue(element));
    if (!el || isLocked.value)
      return;
    if (shared.isIOS) {
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
    const el = resolveElement(shared.toValue(element));
    if (!el || !isLocked.value)
      return;
    shared.isIOS && (stopTouchMoveListener == null ? void 0 : stopTouchMoveListener());
    el.style.overflow = initialOverflow;
    elInitialOverflow.delete(el);
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
      else unlock();
    }
  });
}

function onScrollLock() {
  let isMounted = false;
  const state = vueDemi.ref(false);
  return (el, binding) => {
    state.value = binding.value;
    if (isMounted)
      return;
    isMounted = true;
    const isLocked = useScrollLock(el, binding.value);
    vueDemi.watch(state, (v) => isLocked.value = v);
  };
}
const vScrollLock = onScrollLock();

const UseTimeAgo = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseTimeAgo",
  props: ["time", "updateInterval", "max", "fullDateFormatter", "messages", "showSecond"],
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useTimeAgo(() => props.time, { ...props, controls: true }));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseTimestamp = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseTimestamp",
  props: ["immediate", "interval", "offset"],
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useTimestamp({ ...props, controls: true }));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseVirtualList = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseVirtualList",
  props: [
    "list",
    "options",
    "height"
  ],
  setup(props, { slots, expose }) {
    const { list: listRef } = vueDemi.toRefs(props);
    const { list, containerProps, wrapperProps, scrollTo } = core.useVirtualList(listRef, props.options);
    expose({ scrollTo });
    if (containerProps.style && typeof containerProps.style === "object" && !Array.isArray(containerProps.style))
      containerProps.style.height = props.height || "300px";
    return () => vueDemi.h("div", { ...containerProps }, [
      vueDemi.h("div", { ...wrapperProps.value }, list.value.map((item) => vueDemi.h("div", { style: { overflow: "hidden", height: item.height } }, slots.default ? slots.default(item) : "Please set content!")))
    ]);
  }
});

const UseWindowFocus = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseWindowFocus",
  setup(props, { slots }) {
    const data = vueDemi.reactive({
      focused: core.useWindowFocus()
    });
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

const UseWindowSize = /* @__PURE__ */ /* #__PURE__ */ vueDemi.defineComponent({
  name: "UseWindowSize",
  props: ["initialWidth", "initialHeight"],
  setup(props, { slots }) {
    const data = vueDemi.reactive(core.useWindowSize(props));
    return () => {
      if (slots.default)
        return slots.default(data);
    };
  }
});

exports.OnClickOutside = OnClickOutside;
exports.OnLongPress = OnLongPress;
exports.UseActiveElement = UseActiveElement;
exports.UseBattery = UseBattery;
exports.UseBrowserLocation = UseBrowserLocation;
exports.UseClipboard = UseClipboard;
exports.UseColorMode = UseColorMode;
exports.UseDark = UseDark;
exports.UseDeviceMotion = UseDeviceMotion;
exports.UseDeviceOrientation = UseDeviceOrientation;
exports.UseDevicePixelRatio = UseDevicePixelRatio;
exports.UseDevicesList = UseDevicesList;
exports.UseDocumentVisibility = UseDocumentVisibility;
exports.UseDraggable = UseDraggable;
exports.UseElementBounding = UseElementBounding;
exports.UseElementSize = UseElementSize;
exports.UseElementVisibility = UseElementVisibility;
exports.UseEyeDropper = UseEyeDropper;
exports.UseFullscreen = UseFullscreen;
exports.UseGeolocation = UseGeolocation;
exports.UseIdle = UseIdle;
exports.UseImage = UseImage;
exports.UseMouse = UseMouse;
exports.UseMouseInElement = UseMouseInElement;
exports.UseMousePressed = UseMousePressed;
exports.UseNetwork = UseNetwork;
exports.UseNow = UseNow;
exports.UseObjectUrl = UseObjectUrl;
exports.UseOffsetPagination = UseOffsetPagination;
exports.UseOnline = UseOnline;
exports.UsePageLeave = UsePageLeave;
exports.UsePointer = UsePointer;
exports.UsePointerLock = UsePointerLock;
exports.UsePreferredColorScheme = UsePreferredColorScheme;
exports.UsePreferredContrast = UsePreferredContrast;
exports.UsePreferredDark = UsePreferredDark;
exports.UsePreferredLanguages = UsePreferredLanguages;
exports.UsePreferredReducedMotion = UsePreferredReducedMotion;
exports.UseScreenSafeArea = UseScreenSafeArea;
exports.UseTimeAgo = UseTimeAgo;
exports.UseTimestamp = UseTimestamp;
exports.UseVirtualList = UseVirtualList;
exports.UseWindowFocus = UseWindowFocus;
exports.UseWindowSize = UseWindowSize;
exports.VOnClickOutside = vOnClickOutside;
exports.VOnLongPress = vOnLongPress;
exports.vElementHover = vElementHover;
exports.vElementSize = vElementSize;
exports.vElementVisibility = vElementVisibility;
exports.vInfiniteScroll = vInfiniteScroll;
exports.vIntersectionObserver = vIntersectionObserver;
exports.vOnClickOutside = vOnClickOutside;
exports.vOnKeyStroke = vOnKeyStroke;
exports.vOnLongPress = vOnLongPress;
exports.vScroll = vScroll;
exports.vScrollLock = vScrollLock;
