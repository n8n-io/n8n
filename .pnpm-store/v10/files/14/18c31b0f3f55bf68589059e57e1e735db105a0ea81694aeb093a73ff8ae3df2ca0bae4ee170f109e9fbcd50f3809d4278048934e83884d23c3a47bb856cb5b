'use strict';

var shared = require('@vueuse/shared');
var vue = require('vue');

function computedAsync(evaluationCallback, initialState, optionsOrRef) {
  let options;
  if (vue.isRef(optionsOrRef)) {
    options = {
      evaluating: optionsOrRef
    };
  } else {
    options = optionsOrRef || {};
  }
  const {
    lazy = false,
    evaluating = void 0,
    shallow = true,
    onError = shared.noop
  } = options;
  const started = vue.shallowRef(!lazy);
  const current = shallow ? vue.shallowRef(initialState) : vue.ref(initialState);
  let counter = 0;
  vue.watchEffect(async (onInvalidate) => {
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
    return vue.computed(() => {
      started.value = true;
      return current.value;
    });
  } else {
    return current;
  }
}

function computedInject(key, options, defaultSource, treatDefaultAsFactory) {
  let source = vue.inject(key);
  if (defaultSource)
    source = vue.inject(key, defaultSource);
  if (treatDefaultAsFactory)
    source = vue.inject(key, defaultSource, treatDefaultAsFactory);
  if (typeof options === "function") {
    return vue.computed((ctx) => options(source, ctx));
  } else {
    return vue.computed({
      get: (ctx) => options.get(source, ctx),
      set: options.set
    });
  }
}

function createReusableTemplate(options = {}) {
  const {
    inheritAttrs = true
  } = options;
  const render = vue.shallowRef();
  const define = /*@__PURE__*/ vue.defineComponent({
    setup(_, { slots }) {
      return () => {
        render.value = slots.default;
      };
    }
  });
  const reuse = /*@__PURE__*/ vue.defineComponent({
    inheritAttrs,
    props: options.props,
    setup(props, { attrs, slots }) {
      return () => {
        var _a;
        if (!render.value && process.env.NODE_ENV !== "production")
          throw new Error("[VueUse] Failed to find the definition of reusable template");
        const vnode = (_a = render.value) == null ? void 0 : _a.call(render, {
          ...options.props == null ? keysToCamelKebabCase(attrs) : props,
          $slots: slots
        });
        return inheritAttrs && (vnode == null ? void 0 : vnode.length) === 1 ? vnode[0] : vnode;
      };
    }
  });
  return shared.makeDestructurable(
    { define, reuse },
    [define, reuse]
  );
}
function keysToCamelKebabCase(obj) {
  const newObj = {};
  for (const key in obj)
    newObj[shared.camelize(key)] = obj[key];
  return newObj;
}

function createTemplatePromise(options = {}) {
  let index = 0;
  const instances = vue.ref([]);
  function create(...args) {
    const props = vue.shallowReactive({
      key: index++,
      args,
      promise: void 0,
      resolve: () => {
      },
      reject: () => {
      },
      isResolving: false,
      options
    });
    instances.value.push(props);
    props.promise = new Promise((_resolve, _reject) => {
      props.resolve = (v) => {
        props.isResolving = true;
        return _resolve(v);
      };
      props.reject = _reject;
    }).finally(() => {
      props.promise = void 0;
      const index2 = instances.value.indexOf(props);
      if (index2 !== -1)
        instances.value.splice(index2, 1);
    });
    return props.promise;
  }
  function start(...args) {
    if (options.singleton && instances.value.length > 0)
      return instances.value[0].promise;
    return create(...args);
  }
  const component = /*@__PURE__*/ vue.defineComponent((_, { slots }) => {
    const renderList = () => instances.value.map((props) => {
      var _a;
      return vue.h(vue.Fragment, { key: props.key }, (_a = slots.default) == null ? void 0 : _a.call(slots, props));
    });
    if (options.transition)
      return () => vue.h(vue.TransitionGroup, options.transition, renderList);
    return renderList;
  });
  component.start = start;
  return component;
}

function createUnrefFn(fn) {
  return function(...args) {
    return fn.apply(this, args.map((i) => vue.toValue(i)));
  };
}

const defaultWindow = shared.isClient ? window : void 0;
const defaultDocument = shared.isClient ? window.document : void 0;
const defaultNavigator = shared.isClient ? window.navigator : void 0;
const defaultLocation = shared.isClient ? window.location : void 0;

function unrefElement(elRef) {
  var _a;
  const plain = vue.toValue(elRef);
  return (_a = plain == null ? void 0 : plain.$el) != null ? _a : plain;
}

function useEventListener(...args) {
  const cleanups = [];
  const cleanup = () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  };
  const register = (el, event, listener, options) => {
    el.addEventListener(event, listener, options);
    return () => el.removeEventListener(event, listener, options);
  };
  const firstParamTargets = vue.computed(() => {
    const test = shared.toArray(vue.toValue(args[0])).filter((e) => e != null);
    return test.every((e) => typeof e !== "string") ? test : void 0;
  });
  const stopWatch = shared.watchImmediate(
    () => {
      var _a, _b;
      return [
        (_b = (_a = firstParamTargets.value) == null ? void 0 : _a.map((e) => unrefElement(e))) != null ? _b : [defaultWindow].filter((e) => e != null),
        shared.toArray(vue.toValue(firstParamTargets.value ? args[1] : args[0])),
        shared.toArray(vue.unref(firstParamTargets.value ? args[2] : args[1])),
        // @ts-expect-error - TypeScript gets the correct types, but somehow still complains
        vue.toValue(firstParamTargets.value ? args[3] : args[2])
      ];
    },
    ([raw_targets, raw_events, raw_listeners, raw_options]) => {
      cleanup();
      if (!(raw_targets == null ? void 0 : raw_targets.length) || !(raw_events == null ? void 0 : raw_events.length) || !(raw_listeners == null ? void 0 : raw_listeners.length))
        return;
      const optionsClone = shared.isObject(raw_options) ? { ...raw_options } : raw_options;
      cleanups.push(
        ...raw_targets.flatMap(
          (el) => raw_events.flatMap(
            (event) => raw_listeners.map((listener) => register(el, event, listener, optionsClone))
          )
        )
      );
    },
    { flush: "post" }
  );
  const stop = () => {
    stopWatch();
    cleanup();
  };
  shared.tryOnScopeDispose(cleanup);
  return stop;
}

let _iOSWorkaround = false;
function onClickOutside(target, handler, options = {}) {
  const { window = defaultWindow, ignore = [], capture = true, detectIframe = false, controls = false } = options;
  if (!window) {
    return controls ? { stop: shared.noop, cancel: shared.noop, trigger: shared.noop } : shared.noop;
  }
  if (shared.isIOS && !_iOSWorkaround) {
    _iOSWorkaround = true;
    const listenerOptions = { passive: true };
    Array.from(window.document.body.children).forEach((el) => useEventListener(el, "click", shared.noop, listenerOptions));
    useEventListener(window.document.documentElement, "click", shared.noop, listenerOptions);
  }
  let shouldListen = true;
  const shouldIgnore = (event) => {
    return vue.toValue(ignore).some((target2) => {
      if (typeof target2 === "string") {
        return Array.from(window.document.querySelectorAll(target2)).some((el) => el === event.target || event.composedPath().includes(el));
      } else {
        const el = unrefElement(target2);
        return el && (event.target === el || event.composedPath().includes(el));
      }
    });
  };
  function hasMultipleRoots(target2) {
    const vm = vue.toValue(target2);
    return vm && vm.$.subTree.shapeFlag === 16;
  }
  function checkMultipleRoots(target2, event) {
    const vm = vue.toValue(target2);
    const children = vm.$.subTree && vm.$.subTree.children;
    if (children == null || !Array.isArray(children))
      return false;
    return children.some((child) => child.el === event.target || event.composedPath().includes(child.el));
  }
  const listener = (event) => {
    const el = unrefElement(target);
    if (event.target == null)
      return;
    if (!(el instanceof Element) && hasMultipleRoots(target) && checkMultipleRoots(target, event))
      return;
    if (!el || el === event.target || event.composedPath().includes(el))
      return;
    if ("detail" in event && event.detail === 0)
      shouldListen = !shouldIgnore(event);
    if (!shouldListen) {
      shouldListen = true;
      return;
    }
    handler(event);
  };
  let isProcessingClick = false;
  const cleanup = [
    useEventListener(window, "click", (event) => {
      if (!isProcessingClick) {
        isProcessingClick = true;
        setTimeout(() => {
          isProcessingClick = false;
        }, 0);
        listener(event);
      }
    }, { passive: true, capture }),
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
    }, { passive: true })
  ].filter(Boolean);
  const stop = () => cleanup.forEach((fn) => fn());
  if (controls) {
    return {
      stop,
      cancel: () => {
        shouldListen = false;
      },
      trigger: (event) => {
        shouldListen = true;
        listener(event);
        shouldListen = false;
      }
    };
  }
  return stop;
}

function useMounted() {
  const isMounted = vue.shallowRef(false);
  const instance = vue.getCurrentInstance();
  if (instance) {
    vue.onMounted(() => {
      isMounted.value = true;
    }, instance);
  }
  return isMounted;
}

function useSupported(callback) {
  const isMounted = useMounted();
  return vue.computed(() => {
    isMounted.value;
    return Boolean(callback());
  });
}

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
  const targets = vue.computed(() => {
    const value = vue.toValue(target);
    const items = shared.toArray(value).map(unrefElement).filter(shared.notNullish);
    return new Set(items);
  });
  const stopWatch = vue.watch(
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
    stopWatch();
    cleanup();
  };
  shared.tryOnScopeDispose(stop);
  return {
    isSupported,
    stop,
    takeRecords
  };
}

function onElementRemoval(target, callback, options = {}) {
  const {
    window = defaultWindow,
    document = window == null ? void 0 : window.document,
    flush = "sync"
  } = options;
  if (!window || !document)
    return shared.noop;
  let stopFn;
  const cleanupAndUpdate = (fn) => {
    stopFn == null ? void 0 : stopFn();
    stopFn = fn;
  };
  const stopWatch = vue.watchEffect(() => {
    const el = unrefElement(target);
    if (el) {
      const { stop } = useMutationObserver(
        document,
        (mutationsList) => {
          const targetRemoved = mutationsList.map((mutation) => [...mutation.removedNodes]).flat().some((node) => node === el || node.contains(el));
          if (targetRemoved) {
            callback(mutationsList);
          }
        },
        {
          window,
          childList: true,
          subtree: true
        }
      );
      cleanupAndUpdate(stop);
    }
  }, { flush });
  const stopHandle = () => {
    stopWatch();
    cleanupAndUpdate();
  };
  shared.tryOnScopeDispose(stopHandle);
  return stopHandle;
}

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
    if (e.repeat && vue.toValue(dedupe))
      return;
    if (predicate(e))
      handler(e);
  };
  return useEventListener(target, eventName, listener, passive);
}
function onKeyDown(key, handler, options = {}) {
  return onKeyStroke(key, handler, { ...options, eventName: "keydown" });
}
function onKeyPressed(key, handler, options = {}) {
  return onKeyStroke(key, handler, { ...options, eventName: "keypress" });
}
function onKeyUp(key, handler, options = {}) {
  return onKeyStroke(key, handler, { ...options, eventName: "keyup" });
}

const DEFAULT_DELAY = 500;
const DEFAULT_THRESHOLD = 10;
function onLongPress(target, handler, options) {
  var _a, _b;
  const elementRef = vue.computed(() => unrefElement(target));
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

function isFocusedElementEditable() {
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
}
function isTypedCharValid({
  keyCode,
  metaKey,
  ctrlKey,
  altKey
}) {
  if (metaKey || ctrlKey || altKey)
    return false;
  if (keyCode >= 48 && keyCode <= 57 || keyCode >= 96 && keyCode <= 105)
    return true;
  if (keyCode >= 65 && keyCode <= 90)
    return true;
  return false;
}
function onStartTyping(callback, options = {}) {
  const { document: document2 = defaultDocument } = options;
  const keydown = (event) => {
    if (!isFocusedElementEditable() && isTypedCharValid(event)) {
      callback(event);
    }
  };
  if (document2)
    useEventListener(document2, "keydown", keydown, { passive: true });
}

function templateRef(key, initialValue = null) {
  const instance = vue.getCurrentInstance();
  let _trigger = () => {
  };
  const element = vue.customRef((track, trigger) => {
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
  vue.onUpdated(_trigger);
  return element;
}

function useActiveElement(options = {}) {
  var _a;
  const {
    window = defaultWindow,
    deep = true,
    triggerOnRemoval = false
  } = options;
  const document = (_a = options.document) != null ? _a : window == null ? void 0 : window.document;
  const getDeepActiveElement = () => {
    var _a2;
    let element = document == null ? void 0 : document.activeElement;
    if (deep) {
      while (element == null ? void 0 : element.shadowRoot)
        element = (_a2 = element == null ? void 0 : element.shadowRoot) == null ? void 0 : _a2.activeElement;
    }
    return element;
  };
  const activeElement = vue.shallowRef();
  const trigger = () => {
    activeElement.value = getDeepActiveElement();
  };
  if (window) {
    const listenerOptions = {
      capture: true,
      passive: true
    };
    useEventListener(
      window,
      "blur",
      (event) => {
        if (event.relatedTarget !== null)
          return;
        trigger();
      },
      listenerOptions
    );
    useEventListener(
      window,
      "focus",
      trigger,
      listenerOptions
    );
  }
  if (triggerOnRemoval) {
    onElementRemoval(activeElement, trigger, { document });
  }
  trigger();
  return activeElement;
}

function useRafFn(fn, options = {}) {
  const {
    immediate = true,
    fpsLimit = void 0,
    window = defaultWindow,
    once = false
  } = options;
  const isActive = vue.shallowRef(false);
  const intervalLimit = vue.computed(() => {
    return fpsLimit ? 1e3 / vue.toValue(fpsLimit) : null;
  });
  let previousFrameTimestamp = 0;
  let rafId = null;
  function loop(timestamp) {
    if (!isActive.value || !window)
      return;
    if (!previousFrameTimestamp)
      previousFrameTimestamp = timestamp;
    const delta = timestamp - previousFrameTimestamp;
    if (intervalLimit.value && delta < intervalLimit.value) {
      rafId = window.requestAnimationFrame(loop);
      return;
    }
    previousFrameTimestamp = timestamp;
    fn({ delta, timestamp });
    if (once) {
      isActive.value = false;
      rafId = null;
      return;
    }
    rafId = window.requestAnimationFrame(loop);
  }
  function resume() {
    if (!isActive.value && window) {
      isActive.value = true;
      previousFrameTimestamp = 0;
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
    isActive: vue.readonly(isActive),
    pause,
    resume
  };
}

function useAnimate(target, keyframes, options) {
  let config;
  let animateOptions;
  if (shared.isObject(options)) {
    config = options;
    animateOptions = shared.objectOmit(options, ["window", "immediate", "commitStyles", "persist", "onReady", "onError"]);
  } else {
    config = { duration: options };
    animateOptions = options;
  }
  const {
    window = defaultWindow,
    immediate = true,
    commitStyles,
    persist,
    playbackRate: _playbackRate = 1,
    onReady,
    onError = (e) => {
      console.error(e);
    }
  } = config;
  const isSupported = useSupported(() => window && HTMLElement && "animate" in HTMLElement.prototype);
  const animate = vue.shallowRef(void 0);
  const store = vue.shallowReactive({
    startTime: null,
    currentTime: null,
    timeline: null,
    playbackRate: _playbackRate,
    pending: false,
    playState: immediate ? "idle" : "paused",
    replaceState: "active"
  });
  const pending = vue.computed(() => store.pending);
  const playState = vue.computed(() => store.playState);
  const replaceState = vue.computed(() => store.replaceState);
  const startTime = vue.computed({
    get() {
      return store.startTime;
    },
    set(value) {
      store.startTime = value;
      if (animate.value)
        animate.value.startTime = value;
    }
  });
  const currentTime = vue.computed({
    get() {
      return store.currentTime;
    },
    set(value) {
      store.currentTime = value;
      if (animate.value) {
        animate.value.currentTime = value;
        syncResume();
      }
    }
  });
  const timeline = vue.computed({
    get() {
      return store.timeline;
    },
    set(value) {
      store.timeline = value;
      if (animate.value)
        animate.value.timeline = value;
    }
  });
  const playbackRate = vue.computed({
    get() {
      return store.playbackRate;
    },
    set(value) {
      store.playbackRate = value;
      if (animate.value)
        animate.value.playbackRate = value;
    }
  });
  const play = () => {
    if (animate.value) {
      try {
        animate.value.play();
        syncResume();
      } catch (e) {
        syncPause();
        onError(e);
      }
    } else {
      update();
    }
  };
  const pause = () => {
    var _a;
    try {
      (_a = animate.value) == null ? void 0 : _a.pause();
      syncPause();
    } catch (e) {
      onError(e);
    }
  };
  const reverse = () => {
    var _a;
    if (!animate.value)
      update();
    try {
      (_a = animate.value) == null ? void 0 : _a.reverse();
      syncResume();
    } catch (e) {
      syncPause();
      onError(e);
    }
  };
  const finish = () => {
    var _a;
    try {
      (_a = animate.value) == null ? void 0 : _a.finish();
      syncPause();
    } catch (e) {
      onError(e);
    }
  };
  const cancel = () => {
    var _a;
    try {
      (_a = animate.value) == null ? void 0 : _a.cancel();
      syncPause();
    } catch (e) {
      onError(e);
    }
  };
  vue.watch(() => unrefElement(target), (el) => {
    if (el) {
      update();
    } else {
      animate.value = void 0;
    }
  });
  vue.watch(() => keyframes, (value) => {
    if (animate.value) {
      update();
      const targetEl = unrefElement(target);
      if (targetEl) {
        animate.value.effect = new KeyframeEffect(
          targetEl,
          vue.toValue(value),
          animateOptions
        );
      }
    }
  }, { deep: true });
  shared.tryOnMounted(() => update(true), false);
  shared.tryOnScopeDispose(cancel);
  function update(init) {
    const el = unrefElement(target);
    if (!isSupported.value || !el)
      return;
    if (!animate.value)
      animate.value = el.animate(vue.toValue(keyframes), animateOptions);
    if (persist)
      animate.value.persist();
    if (_playbackRate !== 1)
      animate.value.playbackRate = _playbackRate;
    if (init && !immediate)
      animate.value.pause();
    else
      syncResume();
    onReady == null ? void 0 : onReady(animate.value);
  }
  const listenerOptions = { passive: true };
  useEventListener(animate, ["cancel", "finish", "remove"], syncPause, listenerOptions);
  useEventListener(animate, "finish", () => {
    var _a;
    if (commitStyles)
      (_a = animate.value) == null ? void 0 : _a.commitStyles();
  }, listenerOptions);
  const { resume: resumeRef, pause: pauseRef } = useRafFn(() => {
    if (!animate.value)
      return;
    store.pending = animate.value.pending;
    store.playState = animate.value.playState;
    store.replaceState = animate.value.replaceState;
    store.startTime = animate.value.startTime;
    store.currentTime = animate.value.currentTime;
    store.timeline = animate.value.timeline;
    store.playbackRate = animate.value.playbackRate;
  }, { immediate: false });
  function syncResume() {
    if (isSupported.value)
      resumeRef();
  }
  function syncPause() {
    if (isSupported.value && window)
      window.requestAnimationFrame(pauseRef);
  }
  return {
    isSupported,
    animate,
    // actions
    play,
    pause,
    reverse,
    finish,
    cancel,
    // state
    pending,
    playState,
    replaceState,
    startTime,
    currentTime,
    timeline,
    playbackRate
  };
}

function useAsyncQueue(tasks, options) {
  const {
    interrupt = true,
    onError = shared.noop,
    onFinished = shared.noop,
    signal
  } = options || {};
  const promiseState = {
    aborted: "aborted",
    fulfilled: "fulfilled",
    pending: "pending",
    rejected: "rejected"
  };
  const initialResult = Array.from(Array.from({ length: tasks.length }), () => ({ state: promiseState.pending, data: null }));
  const result = vue.reactive(initialResult);
  const activeIndex = vue.shallowRef(-1);
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
      if (signal == null ? void 0 : signal.aborted) {
        updateResult(promiseState.aborted, new Error("aborted"));
        return;
      }
      if (((_a = result[activeIndex.value]) == null ? void 0 : _a.state) === promiseState.rejected && interrupt) {
        onFinished();
        return;
      }
      const done = curr(prevRes).then((currentRes) => {
        updateResult(promiseState.fulfilled, currentRes);
        if (activeIndex.value === tasks.length - 1)
          onFinished();
        return currentRes;
      });
      if (!signal)
        return done;
      return Promise.race([done, whenAborted(signal)]);
    }).catch((e) => {
      if (signal == null ? void 0 : signal.aborted) {
        updateResult(promiseState.aborted, e);
        return e;
      }
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
function whenAborted(signal) {
  return new Promise((resolve, reject) => {
    const error = new Error("aborted");
    if (signal.aborted)
      reject(error);
    else
      signal.addEventListener("abort", () => reject(error), { once: true });
  });
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
  const state = shallow ? vue.shallowRef(initialState) : vue.ref(initialState);
  const isReady = vue.shallowRef(false);
  const isLoading = vue.shallowRef(false);
  const error = vue.shallowRef(void 0);
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
  if (immediate) {
    execute(delay);
  }
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
  const base64 = vue.shallowRef("");
  const promise = vue.shallowRef();
  function execute() {
    if (!shared.isClient)
      return;
    promise.value = new Promise((resolve, reject) => {
      try {
        const _target = vue.toValue(target);
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
    promise.value.then((res) => {
      base64.value = (options == null ? void 0 : options.dataUrl) === false ? res.replace(/^data:.*?;base64,/, "") : res;
    });
    return promise.value;
  }
  if (vue.isRef(target) || typeof target === "function")
    vue.watch(target, execute, { immediate: true });
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

function useBattery(options = {}) {
  const { navigator = defaultNavigator } = options;
  const events = ["chargingchange", "chargingtimechange", "dischargingtimechange", "levelchange"];
  const isSupported = useSupported(() => navigator && "getBattery" in navigator && typeof navigator.getBattery === "function");
  const charging = vue.shallowRef(false);
  const chargingTime = vue.shallowRef(0);
  const dischargingTime = vue.shallowRef(0);
  const level = vue.shallowRef(1);
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
      useEventListener(battery, events, updateBatteryInfo, { passive: true });
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
  const device = vue.shallowRef();
  const error = vue.shallowRef(null);
  vue.watch(device, () => {
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
  const server = vue.shallowRef();
  const isConnected = vue.shallowRef(false);
  function reset() {
    isConnected.value = false;
    device.value = void 0;
    server.value = void 0;
  }
  async function connectToBluetoothGATTServer() {
    error.value = null;
    if (device.value && device.value.gatt) {
      useEventListener(device, "gattserverdisconnected", reset, { passive: true });
      try {
        server.value = await device.value.gatt.connect();
        isConnected.value = server.value.connected;
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
    isConnected: vue.readonly(isConnected),
    // Device:
    device,
    requestDevice,
    // Server:
    server,
    // Errors:
    error
  };
}

const ssrWidthSymbol = Symbol("vueuse-ssr-width");
function useSSRWidth() {
  const ssrWidth = vue.hasInjectionContext() ? shared.injectLocal(ssrWidthSymbol, null) : null;
  return typeof ssrWidth === "number" ? ssrWidth : void 0;
}
function provideSSRWidth(width, app) {
  if (app !== void 0) {
    app.provide(ssrWidthSymbol, width);
  } else {
    shared.provideLocal(ssrWidthSymbol, width);
  }
}

function useMediaQuery(query, options = {}) {
  const { window = defaultWindow, ssrWidth = useSSRWidth() } = options;
  const isSupported = useSupported(() => window && "matchMedia" in window && typeof window.matchMedia === "function");
  const ssrSupport = vue.shallowRef(typeof ssrWidth === "number");
  const mediaQuery = vue.shallowRef();
  const matches = vue.shallowRef(false);
  const handler = (event) => {
    matches.value = event.matches;
  };
  vue.watchEffect(() => {
    if (ssrSupport.value) {
      ssrSupport.value = !isSupported.value;
      const queryStrings = vue.toValue(query).split(",");
      matches.value = queryStrings.some((queryString) => {
        const not = queryString.includes("not all");
        const minWidth = queryString.match(/\(\s*min-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/);
        const maxWidth = queryString.match(/\(\s*max-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/);
        let res = Boolean(minWidth || maxWidth);
        if (minWidth && res) {
          res = ssrWidth >= shared.pxValue(minWidth[1]);
        }
        if (maxWidth && res) {
          res = ssrWidth <= shared.pxValue(maxWidth[1]);
        }
        return not ? !res : res;
      });
      return;
    }
    if (!isSupported.value)
      return;
    mediaQuery.value = window.matchMedia(vue.toValue(query));
    matches.value = mediaQuery.value.matches;
  });
  useEventListener(mediaQuery, "change", handler, { passive: true });
  return vue.computed(() => matches.value);
}

const breakpointsTailwind = {
  "sm": 640,
  "md": 768,
  "lg": 1024,
  "xl": 1280,
  "2xl": 1536
};
const breakpointsBootstrapV5 = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400
};
const breakpointsVuetifyV2 = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1264,
  xl: 1904
};
const breakpointsVuetifyV3 = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
  xxl: 2560
};
const breakpointsVuetify = breakpointsVuetifyV2;
const breakpointsAntDesign = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600
};
const breakpointsQuasar = {
  xs: 0,
  sm: 600,
  md: 1024,
  lg: 1440,
  xl: 1920
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
const breakpointsPrimeFlex = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200
};
const breakpointsElement = {
  xs: 0,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1920
};

function useBreakpoints(breakpoints, options = {}) {
  function getValue(k, delta) {
    let v = vue.toValue(breakpoints[vue.toValue(k)]);
    if (delta != null)
      v = shared.increaseWithUnit(v, delta);
    if (typeof v === "number")
      v = `${v}px`;
    return v;
  }
  const { window = defaultWindow, strategy = "min-width", ssrWidth = useSSRWidth() } = options;
  const ssrSupport = typeof ssrWidth === "number";
  const mounted = ssrSupport ? vue.shallowRef(false) : { value: true };
  if (ssrSupport) {
    shared.tryOnMounted(() => mounted.value = !!window);
  }
  function match(query, size) {
    if (!mounted.value && ssrSupport) {
      return query === "min" ? ssrWidth >= shared.pxValue(size) : ssrWidth <= shared.pxValue(size);
    }
    if (!window)
      return false;
    return window.matchMedia(`(${query}-width: ${size})`).matches;
  }
  const greaterOrEqual = (k) => {
    return useMediaQuery(() => `(min-width: ${getValue(k)})`, options);
  };
  const smallerOrEqual = (k) => {
    return useMediaQuery(() => `(max-width: ${getValue(k)})`, options);
  };
  const shortcutMethods = Object.keys(breakpoints).reduce((shortcuts, k) => {
    Object.defineProperty(shortcuts, k, {
      get: () => strategy === "min-width" ? greaterOrEqual(k) : smallerOrEqual(k),
      enumerable: true,
      configurable: true
    });
    return shortcuts;
  }, {});
  function current() {
    const points = Object.keys(breakpoints).map((k) => [k, shortcutMethods[k], shared.pxValue(getValue(k))]).sort((a, b) => a[2] - b[2]);
    return vue.computed(() => points.filter(([, v]) => v.value).map(([k]) => k));
  }
  return Object.assign(shortcutMethods, {
    greaterOrEqual,
    smallerOrEqual,
    greater(k) {
      return useMediaQuery(() => `(min-width: ${getValue(k, 0.1)})`, options);
    },
    smaller(k) {
      return useMediaQuery(() => `(max-width: ${getValue(k, -0.1)})`, options);
    },
    between(a, b) {
      return useMediaQuery(() => `(min-width: ${getValue(a)}) and (max-width: ${getValue(b, -0.1)})`, options);
    },
    isGreater(k) {
      return match("min", getValue(k, 0.1));
    },
    isGreaterOrEqual(k) {
      return match("min", getValue(k));
    },
    isSmaller(k) {
      return match("max", getValue(k, -0.1));
    },
    isSmallerOrEqual(k) {
      return match("max", getValue(k));
    },
    isInBetween(a, b) {
      return match("min", getValue(a)) && match("max", getValue(b, -0.1));
    },
    current,
    active() {
      const bps = current();
      return vue.computed(() => bps.value.length === 0 ? "" : bps.value.at(strategy === "min-width" ? -1 : 0));
    }
  });
}

function useBroadcastChannel(options) {
  const {
    name,
    window = defaultWindow
  } = options;
  const isSupported = useSupported(() => window && "BroadcastChannel" in window);
  const isClosed = vue.shallowRef(false);
  const channel = vue.ref();
  const data = vue.ref();
  const error = vue.shallowRef(null);
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
      const listenerOptions = {
        passive: true
      };
      useEventListener(channel, "message", (e) => {
        data.value = e.data;
      }, listenerOptions);
      useEventListener(channel, "messageerror", (e) => {
        error.value = e;
      }, listenerOptions);
      useEventListener(channel, "close", () => {
        isClosed.value = true;
      }, listenerOptions);
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
}

const WRITABLE_PROPERTIES = [
  "hash",
  "host",
  "hostname",
  "href",
  "pathname",
  "port",
  "protocol",
  "search"
];
function useBrowserLocation(options = {}) {
  const { window = defaultWindow } = options;
  const refs = Object.fromEntries(
    WRITABLE_PROPERTIES.map((key) => [key, vue.ref()])
  );
  for (const [key, ref] of shared.objectEntries(refs)) {
    vue.watch(ref, (value) => {
      if (!(window == null ? void 0 : window.location) || window.location[key] === value)
        return;
      window.location[key] = value;
    });
  }
  const buildState = (trigger) => {
    var _a;
    const { state: state2, length } = (window == null ? void 0 : window.history) || {};
    const { origin } = (window == null ? void 0 : window.location) || {};
    for (const key of WRITABLE_PROPERTIES)
      refs[key].value = (_a = window == null ? void 0 : window.location) == null ? void 0 : _a[key];
    return vue.reactive({
      trigger,
      state: state2,
      length,
      origin,
      ...refs
    });
  };
  const state = vue.ref(buildState("load"));
  if (window) {
    const listenerOptions = { passive: true };
    useEventListener(window, "popstate", () => state.value = buildState("popstate"), listenerOptions);
    useEventListener(window, "hashchange", () => state.value = buildState("hashchange"), listenerOptions);
  }
  return state;
}

function useCached(refValue, comparator = (a, b) => a === b, options) {
  const { deepRefs = true, ...watchOptions } = options || {};
  const cachedValue = shared.createRef(refValue.value, deepRefs);
  vue.watch(() => refValue.value, (value) => {
    if (!comparator(value, cachedValue.value))
      cachedValue.value = value;
  }, watchOptions);
  return cachedValue;
}

function usePermission(permissionDesc, options = {}) {
  const {
    controls = false,
    navigator = defaultNavigator
  } = options;
  const isSupported = useSupported(() => navigator && "permissions" in navigator);
  const permissionStatus = vue.shallowRef();
  const desc = typeof permissionDesc === "string" ? { name: permissionDesc } : permissionDesc;
  const state = vue.shallowRef();
  const update = () => {
    var _a, _b;
    state.value = (_b = (_a = permissionStatus.value) == null ? void 0 : _a.state) != null ? _b : "prompt";
  };
  useEventListener(permissionStatus, "change", update, { passive: true });
  const query = shared.createSingletonPromise(async () => {
    if (!isSupported.value)
      return;
    if (!permissionStatus.value) {
      try {
        permissionStatus.value = await navigator.permissions.query(desc);
      } catch (e) {
        permissionStatus.value = void 0;
      } finally {
        update();
      }
    }
    if (controls)
      return vue.toRaw(permissionStatus.value);
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

function useClipboard(options = {}) {
  const {
    navigator = defaultNavigator,
    read = false,
    source,
    copiedDuring = 1500,
    legacy = false
  } = options;
  const isClipboardApiSupported = useSupported(() => navigator && "clipboard" in navigator);
  const permissionRead = usePermission("clipboard-read");
  const permissionWrite = usePermission("clipboard-write");
  const isSupported = vue.computed(() => isClipboardApiSupported.value || legacy);
  const text = vue.shallowRef("");
  const copied = vue.shallowRef(false);
  const timeout = shared.useTimeoutFn(() => copied.value = false, copiedDuring, { immediate: false });
  async function updateText() {
    let useLegacy = !(isClipboardApiSupported.value && isAllowed(permissionRead.value));
    if (!useLegacy) {
      try {
        text.value = await navigator.clipboard.readText();
      } catch (e) {
        useLegacy = true;
      }
    }
    if (useLegacy) {
      text.value = legacyRead();
    }
  }
  if (isSupported.value && read)
    useEventListener(["copy", "cut"], updateText, { passive: true });
  async function copy(value = vue.toValue(source)) {
    if (isSupported.value && value != null) {
      let useLegacy = !(isClipboardApiSupported.value && isAllowed(permissionWrite.value));
      if (!useLegacy) {
        try {
          await navigator.clipboard.writeText(value);
        } catch (e) {
          useLegacy = true;
        }
      }
      if (useLegacy)
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
  function isAllowed(status) {
    return status === "granted" || status === "prompt";
  }
  return {
    isSupported,
    text,
    copied,
    copy
  };
}

function useClipboardItems(options = {}) {
  const {
    navigator = defaultNavigator,
    read = false,
    source,
    copiedDuring = 1500
  } = options;
  const isSupported = useSupported(() => navigator && "clipboard" in navigator);
  const content = vue.ref([]);
  const copied = vue.shallowRef(false);
  const timeout = shared.useTimeoutFn(() => copied.value = false, copiedDuring, { immediate: false });
  function updateContent() {
    if (isSupported.value) {
      navigator.clipboard.read().then((items) => {
        content.value = items;
      });
    }
  }
  if (isSupported.value && read)
    useEventListener(["copy", "cut"], updateContent, { passive: true });
  async function copy(value = vue.toValue(source)) {
    if (isSupported.value && value != null) {
      await navigator.clipboard.write(value);
      content.value = value;
      copied.value = true;
      timeout.start();
    }
  }
  return {
    isSupported,
    content,
    copied,
    copy
  };
}

function cloneFnJSON(source) {
  return JSON.parse(JSON.stringify(source));
}
function useCloned(source, options = {}) {
  const cloned = vue.ref({});
  const isModified = vue.shallowRef(false);
  let _lastSync = false;
  const {
    manual,
    clone = cloneFnJSON,
    // watch options
    deep = true,
    immediate = true
  } = options;
  vue.watch(cloned, () => {
    if (_lastSync) {
      _lastSync = false;
      return;
    }
    isModified.value = true;
  }, {
    deep: true,
    flush: "sync"
  });
  function sync() {
    _lastSync = true;
    isModified.value = false;
    cloned.value = clone(vue.toValue(source));
  }
  if (!manual && (vue.isRef(source) || typeof source === "function")) {
    vue.watch(source, sync, {
      ...options,
      deep,
      immediate
    });
  } else {
    sync();
  }
  return { cloned, isModified, sync };
}

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
function setSSRHandler(key, fn) {
  handlers[key] = fn;
}

function usePreferredDark(options) {
  return useMediaQuery("(prefers-color-scheme: dark)", options);
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
  const data = (shallow ? vue.shallowRef : vue.ref)(typeof defaults === "function" ? defaults() : defaults);
  const keyComputed = vue.computed(() => vue.toValue(key));
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
  const rawInit = vue.toValue(defaults);
  const type = guessSerializerType(rawInit);
  const serializer = (_a = options.serializer) != null ? _a : StorageSerializers[type];
  const { pause: pauseWatch, resume: resumeWatch } = shared.pausableWatch(
    data,
    () => write(data.value),
    { flush, deep, eventFilter }
  );
  vue.watch(keyComputed, () => update(), { flush });
  if (window && listenToStorageChanges) {
    shared.tryOnMounted(() => {
      if (storage instanceof Storage)
        useEventListener(window, "storage", update, { passive: true });
      else
        useEventListener(window, customStorageEventName, updateFromCustomEvent);
      if (initOnMounted)
        update();
    });
  }
  if (!initOnMounted)
    update();
  function dispatchWriteEvent(oldValue, newValue) {
    if (window) {
      const payload = {
        key: keyComputed.value,
        oldValue,
        newValue,
        storageArea: storage
      };
      window.dispatchEvent(storage instanceof Storage ? new StorageEvent("storage", payload) : new CustomEvent(customStorageEventName, {
        detail: payload
      }));
    }
  }
  function write(v) {
    try {
      const oldValue = storage.getItem(keyComputed.value);
      if (v == null) {
        dispatchWriteEvent(oldValue, null);
        storage.removeItem(keyComputed.value);
      } else {
        const serialized = serializer.write(v);
        if (oldValue !== serialized) {
          storage.setItem(keyComputed.value, serialized);
          dispatchWriteEvent(oldValue, serialized);
        }
      }
    } catch (e) {
      onError(e);
    }
  }
  function read(event) {
    const rawValue = event ? event.newValue : storage.getItem(keyComputed.value);
    if (rawValue == null) {
      if (writeDefaults && rawInit != null)
        storage.setItem(keyComputed.value, serializer.write(rawInit));
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
    if (event && event.key !== keyComputed.value)
      return;
    pauseWatch();
    try {
      if ((event == null ? void 0 : event.newValue) !== serializer.write(data.value))
        data.value = read(event);
    } catch (e) {
      onError(e);
    } finally {
      if (event)
        vue.nextTick(resumeWatch);
      else
        resumeWatch();
    }
  }
  function updateFromCustomEvent(event) {
    update(event.detail);
  }
  return data;
}

const CSS_DISABLE_TRANS = "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}";
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
  const system = vue.computed(() => preferredDark.value ? "dark" : "light");
  const store = storageRef || (storageKey == null ? shared.toRef(initialValue) : useStorage(storageKey, initialValue, storage, { window, listenToStorageChanges }));
  const state = vue.computed(() => store.value === "auto" ? system.value : store.value);
  const updateHTMLAttrs = getSSRHandler(
    "updateHTMLAttrs",
    (selector2, attribute2, value) => {
      const el = typeof selector2 === "string" ? window == null ? void 0 : window.document.querySelector(selector2) : unrefElement(selector2);
      if (!el)
        return;
      const classesToAdd = /* @__PURE__ */ new Set();
      const classesToRemove = /* @__PURE__ */ new Set();
      let attributeToChange = null;
      if (attribute2 === "class") {
        const current = value.split(/\s/g);
        Object.values(modes).flatMap((i) => (i || "").split(/\s/g)).filter(Boolean).forEach((v) => {
          if (current.includes(v))
            classesToAdd.add(v);
          else
            classesToRemove.add(v);
        });
      } else {
        attributeToChange = { key: attribute2, value };
      }
      if (classesToAdd.size === 0 && classesToRemove.size === 0 && attributeToChange === null)
        return;
      let style;
      if (disableTransition) {
        style = window.document.createElement("style");
        style.appendChild(document.createTextNode(CSS_DISABLE_TRANS));
        window.document.head.appendChild(style);
      }
      for (const c of classesToAdd) {
        el.classList.add(c);
      }
      for (const c of classesToRemove) {
        el.classList.remove(c);
      }
      if (attributeToChange) {
        el.setAttribute(attributeToChange.key, attributeToChange.value);
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
  vue.watch(state, onChanged, { flush: "post", immediate: true });
  shared.tryOnMounted(() => onChanged(state.value));
  const auto = vue.computed({
    get() {
      return emitAuto ? store.value : state.value;
    },
    set(v) {
      store.value = v;
    }
  });
  return Object.assign(auto, { store, system, state });
}

function useConfirmDialog(revealed = vue.shallowRef(false)) {
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
    isRevealed: vue.computed(() => revealed.value),
    reveal,
    confirm,
    cancel,
    onReveal: revealHook.on,
    onConfirm: confirmHook.on,
    onCancel: cancelHook.on
  };
}

function useCountdown(initialCountdown, options) {
  var _a, _b;
  const remaining = vue.shallowRef(vue.toValue(initialCountdown));
  const intervalController = shared.useIntervalFn(() => {
    var _a2, _b2;
    const value = remaining.value - 1;
    remaining.value = value < 0 ? 0 : value;
    (_a2 = options == null ? void 0 : options.onTick) == null ? void 0 : _a2.call(options);
    if (remaining.value <= 0) {
      intervalController.pause();
      (_b2 = options == null ? void 0 : options.onComplete) == null ? void 0 : _b2.call(options);
    }
  }, (_a = options == null ? void 0 : options.interval) != null ? _a : 1e3, { immediate: (_b = options == null ? void 0 : options.immediate) != null ? _b : false });
  const reset = (countdown) => {
    var _a2;
    remaining.value = (_a2 = vue.toValue(countdown)) != null ? _a2 : vue.toValue(initialCountdown);
  };
  const stop = () => {
    intervalController.pause();
    reset();
  };
  const resume = () => {
    if (!intervalController.isActive.value) {
      if (remaining.value > 0) {
        intervalController.resume();
      }
    }
  };
  const start = (countdown) => {
    reset(countdown);
    intervalController.resume();
  };
  return {
    remaining,
    reset,
    stop,
    start,
    pause: intervalController.pause,
    resume,
    isActive: intervalController.isActive
  };
}

function useCssVar(prop, target, options = {}) {
  const { window = defaultWindow, initialValue, observe = false } = options;
  const variable = vue.shallowRef(initialValue);
  const elRef = vue.computed(() => {
    var _a;
    return unrefElement(target) || ((_a = window == null ? void 0 : window.document) == null ? void 0 : _a.documentElement);
  });
  function updateCssVar() {
    var _a;
    const key = vue.toValue(prop);
    const el = vue.toValue(elRef);
    if (el && window && key) {
      const value = (_a = window.getComputedStyle(el).getPropertyValue(key)) == null ? void 0 : _a.trim();
      variable.value = value || variable.value || initialValue;
    }
  }
  if (observe) {
    useMutationObserver(elRef, updateCssVar, {
      attributeFilter: ["style", "class"],
      window
    });
  }
  vue.watch(
    [elRef, () => vue.toValue(prop)],
    (_, old) => {
      if (old[0] && old[1])
        old[0].style.removeProperty(old[1]);
      updateCssVar();
    },
    { immediate: true }
  );
  vue.watch(
    [variable, elRef],
    ([val, el]) => {
      const raw_prop = vue.toValue(prop);
      if ((el == null ? void 0 : el.style) && raw_prop) {
        if (val == null)
          el.style.removeProperty(raw_prop);
        else
          el.style.setProperty(raw_prop, val);
      }
    },
    { immediate: true }
  );
  return variable;
}

function useCurrentElement(rootComponent) {
  const vm = vue.getCurrentInstance();
  const currentElement = shared.computedWithControl(
    () => null,
    () => rootComponent ? unrefElement(rootComponent) : vm.proxy.$el
  );
  vue.onUpdated(currentElement.trigger);
  vue.onMounted(currentElement.trigger);
  return currentElement;
}

function useCycleList(list, options) {
  const state = vue.shallowRef(getInitialValue());
  const listRef = shared.toRef(list);
  const index = vue.computed({
    get() {
      var _a;
      const targetList = listRef.value;
      let index2 = (options == null ? void 0 : options.getIndexOf) ? options.getIndexOf(state.value, targetList) : targetList.indexOf(state.value);
      if (index2 < 0)
        index2 = (_a = options == null ? void 0 : options.fallbackIndex) != null ? _a : 0;
      return index2;
    },
    set(v) {
      set(v);
    }
  });
  function set(i) {
    const targetList = listRef.value;
    const length = targetList.length;
    const index2 = (i % length + length) % length;
    const value = targetList[index2];
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
  function getInitialValue() {
    var _a, _b;
    return (_b = vue.toValue((_a = options == null ? void 0 : options.initialValue) != null ? _a : vue.toValue(list)[0])) != null ? _b : void 0;
  }
  vue.watch(listRef, () => set(index.value));
  return {
    state,
    index,
    next,
    prev,
    go: set
  };
}

function useDark(options = {}) {
  const {
    valueDark = "dark",
    valueLight = ""
  } = options;
  const mode = useColorMode({
    ...options,
    onChanged: (mode2, defaultHandler) => {
      var _a;
      if (options.onChanged)
        (_a = options.onChanged) == null ? void 0 : _a.call(options, mode2 === "dark", defaultHandler, mode2);
      else
        defaultHandler(mode2);
    },
    modes: {
      dark: valueDark,
      light: valueLight
    }
  });
  const system = vue.computed(() => mode.system.value);
  const isDark = vue.computed({
    get() {
      return mode.value === "dark";
    },
    set(v) {
      const modeVal = v ? "dark" : "light";
      if (system.value === modeVal)
        mode.value = "auto";
      else
        mode.value = modeVal;
    }
  });
  return isDark;
}

function fnBypass(v) {
  return v;
}
function fnSetSource(source, value) {
  return source.value = value;
}
function defaultDump(clone) {
  return clone ? typeof clone === "function" ? clone : cloneFnJSON : fnBypass;
}
function defaultParse(clone) {
  return clone ? typeof clone === "function" ? clone : cloneFnJSON : fnBypass;
}
function useManualRefHistory(source, options = {}) {
  const {
    clone = false,
    dump = defaultDump(clone),
    parse = defaultParse(clone),
    setSource = fnSetSource
  } = options;
  function _createHistoryRecord() {
    return vue.markRaw({
      snapshot: dump(source.value),
      timestamp: shared.timestamp()
    });
  }
  const last = vue.ref(_createHistoryRecord());
  const undoStack = vue.ref([]);
  const redoStack = vue.ref([]);
  const _setSource = (record) => {
    setSource(source, parse(record.snapshot));
    last.value = record;
  };
  const commit = () => {
    undoStack.value.unshift(last.value);
    last.value = _createHistoryRecord();
    if (options.capacity && undoStack.value.length > options.capacity)
      undoStack.value.splice(options.capacity, Number.POSITIVE_INFINITY);
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
  const history = vue.computed(() => [last.value, ...undoStack.value]);
  const canUndo = vue.computed(() => undoStack.value.length > 0);
  const canRedo = vue.computed(() => redoStack.value.length > 0);
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
  } = shared.watchIgnorable(
    source,
    commit,
    { deep, flush, eventFilter: composedFilter }
  );
  function setSource(source2, value) {
    ignorePrevAsyncUpdates();
    ignoreUpdates(() => {
      source2.value = value;
    });
  }
  const manualHistory = useManualRefHistory(source, { ...options, clone: options.clone || deep, setSource });
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
  return {
    ...manualHistory,
    isTracking,
    pause,
    resume,
    commit,
    batch,
    dispose
  };
}

function useDebouncedRefHistory(source, options = {}) {
  const filter = options.debounce ? shared.debounceFilter(options.debounce) : void 0;
  const history = useRefHistory(source, { ...options, eventFilter: filter });
  return {
    ...history
  };
}

function useDeviceMotion(options = {}) {
  const {
    window = defaultWindow,
    requestPermissions = false,
    eventFilter = shared.bypassFilter
  } = options;
  const isSupported = useSupported(() => typeof DeviceMotionEvent !== "undefined");
  const requirePermissions = useSupported(() => isSupported.value && "requestPermission" in DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function");
  const permissionGranted = vue.shallowRef(false);
  const acceleration = vue.ref({ x: null, y: null, z: null });
  const rotationRate = vue.ref({ alpha: null, beta: null, gamma: null });
  const interval = vue.shallowRef(0);
  const accelerationIncludingGravity = vue.ref({
    x: null,
    y: null,
    z: null
  });
  function init() {
    if (window) {
      const onDeviceMotion = shared.createFilterWrapper(
        eventFilter,
        (event) => {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i;
          acceleration.value = {
            x: ((_a = event.acceleration) == null ? void 0 : _a.x) || null,
            y: ((_b = event.acceleration) == null ? void 0 : _b.y) || null,
            z: ((_c = event.acceleration) == null ? void 0 : _c.z) || null
          };
          accelerationIncludingGravity.value = {
            x: ((_d = event.accelerationIncludingGravity) == null ? void 0 : _d.x) || null,
            y: ((_e = event.accelerationIncludingGravity) == null ? void 0 : _e.y) || null,
            z: ((_f = event.accelerationIncludingGravity) == null ? void 0 : _f.z) || null
          };
          rotationRate.value = {
            alpha: ((_g = event.rotationRate) == null ? void 0 : _g.alpha) || null,
            beta: ((_h = event.rotationRate) == null ? void 0 : _h.beta) || null,
            gamma: ((_i = event.rotationRate) == null ? void 0 : _i.gamma) || null
          };
          interval.value = event.interval;
        }
      );
      useEventListener(window, "devicemotion", onDeviceMotion, { passive: true });
    }
  }
  const ensurePermissions = async () => {
    if (!requirePermissions.value)
      permissionGranted.value = true;
    if (permissionGranted.value)
      return;
    if (requirePermissions.value) {
      const requestPermission = DeviceMotionEvent.requestPermission;
      try {
        const response = await requestPermission();
        if (response === "granted") {
          permissionGranted.value = true;
          init();
        }
      } catch (error) {
        console.error(error);
      }
    }
  };
  if (isSupported.value) {
    if (requestPermissions && requirePermissions.value) {
      ensurePermissions().then(() => init());
    } else {
      init();
    }
  }
  return {
    acceleration,
    accelerationIncludingGravity,
    rotationRate,
    interval,
    isSupported,
    requirePermissions,
    ensurePermissions,
    permissionGranted
  };
}

function useDeviceOrientation(options = {}) {
  const { window = defaultWindow } = options;
  const isSupported = useSupported(() => window && "DeviceOrientationEvent" in window);
  const isAbsolute = vue.shallowRef(false);
  const alpha = vue.shallowRef(null);
  const beta = vue.shallowRef(null);
  const gamma = vue.shallowRef(null);
  if (window && isSupported.value) {
    useEventListener(window, "deviceorientation", (event) => {
      isAbsolute.value = event.absolute;
      alpha.value = event.alpha;
      beta.value = event.beta;
      gamma.value = event.gamma;
    }, { passive: true });
  }
  return {
    isSupported,
    isAbsolute,
    alpha,
    beta,
    gamma
  };
}

function useDevicePixelRatio(options = {}) {
  const {
    window = defaultWindow
  } = options;
  const pixelRatio = vue.shallowRef(1);
  const query = useMediaQuery(() => `(resolution: ${pixelRatio.value}dppx)`, options);
  let stop = shared.noop;
  if (window) {
    stop = shared.watchImmediate(query, () => pixelRatio.value = window.devicePixelRatio);
  }
  return {
    pixelRatio: vue.readonly(pixelRatio),
    stop
  };
}

function useDevicesList(options = {}) {
  const {
    navigator = defaultNavigator,
    requestPermissions = false,
    constraints = { audio: true, video: true },
    onUpdated
  } = options;
  const devices = vue.ref([]);
  const videoInputs = vue.computed(() => devices.value.filter((i) => i.kind === "videoinput"));
  const audioInputs = vue.computed(() => devices.value.filter((i) => i.kind === "audioinput"));
  const audioOutputs = vue.computed(() => devices.value.filter((i) => i.kind === "audiooutput"));
  const isSupported = useSupported(() => navigator && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
  const permissionGranted = vue.shallowRef(false);
  let stream;
  async function update() {
    if (!isSupported.value)
      return;
    devices.value = await navigator.mediaDevices.enumerateDevices();
    onUpdated == null ? void 0 : onUpdated(devices.value);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }
  async function ensurePermissions() {
    const deviceName = constraints.video ? "camera" : "microphone";
    if (!isSupported.value)
      return false;
    if (permissionGranted.value)
      return true;
    const { state, query } = usePermission(deviceName, { controls: true });
    await query();
    if (state.value !== "granted") {
      let granted = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        stream = null;
        granted = false;
      }
      update();
      permissionGranted.value = granted;
    } else {
      permissionGranted.value = true;
    }
    return permissionGranted.value;
  }
  if (isSupported.value) {
    if (requestPermissions)
      ensurePermissions();
    useEventListener(navigator.mediaDevices, "devicechange", update, { passive: true });
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
  const enabled = vue.shallowRef((_a = options.enabled) != null ? _a : false);
  const video = options.video;
  const audio = options.audio;
  const { navigator = defaultNavigator } = options;
  const isSupported = useSupported(() => {
    var _a2;
    return (_a2 = navigator == null ? void 0 : navigator.mediaDevices) == null ? void 0 : _a2.getDisplayMedia;
  });
  const constraint = { audio, video };
  const stream = vue.shallowRef();
  async function _start() {
    var _a2;
    if (!isSupported.value || stream.value)
      return;
    stream.value = await navigator.mediaDevices.getDisplayMedia(constraint);
    (_a2 = stream.value) == null ? void 0 : _a2.getTracks().forEach((t) => useEventListener(t, "ended", stop, { passive: true }));
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
  vue.watch(
    enabled,
    (v) => {
      if (v)
        _start();
      else
        _stop();
    },
    { immediate: true }
  );
  return {
    isSupported,
    stream,
    start,
    stop,
    enabled
  };
}

function useDocumentVisibility(options = {}) {
  const { document = defaultDocument } = options;
  if (!document)
    return vue.shallowRef("visible");
  const visibility = vue.shallowRef(document.visibilityState);
  useEventListener(document, "visibilitychange", () => {
    visibility.value = document.visibilityState;
  }, { passive: true });
  return visibility;
}

function useDraggable(target, options = {}) {
  var _a;
  const {
    pointerTypes,
    preventDefault,
    stopPropagation,
    exact,
    onMove,
    onEnd,
    onStart,
    initialValue,
    axis = "both",
    draggingElement = defaultWindow,
    containerElement,
    handle: draggingHandle = target,
    buttons = [0]
  } = options;
  const position = vue.ref(
    (_a = vue.toValue(initialValue)) != null ? _a : { x: 0, y: 0 }
  );
  const pressedDelta = vue.ref();
  const filterEvent = (e) => {
    if (pointerTypes)
      return pointerTypes.includes(e.pointerType);
    return true;
  };
  const handleEvent = (e) => {
    if (vue.toValue(preventDefault))
      e.preventDefault();
    if (vue.toValue(stopPropagation))
      e.stopPropagation();
  };
  const start = (e) => {
    var _a2;
    if (!vue.toValue(buttons).includes(e.button))
      return;
    if (vue.toValue(options.disabled) || !filterEvent(e))
      return;
    if (vue.toValue(exact) && e.target !== vue.toValue(target))
      return;
    const container = vue.toValue(containerElement);
    const containerRect = (_a2 = container == null ? void 0 : container.getBoundingClientRect) == null ? void 0 : _a2.call(container);
    const targetRect = vue.toValue(target).getBoundingClientRect();
    const pos = {
      x: e.clientX - (container ? targetRect.left - containerRect.left + container.scrollLeft : targetRect.left),
      y: e.clientY - (container ? targetRect.top - containerRect.top + container.scrollTop : targetRect.top)
    };
    if ((onStart == null ? void 0 : onStart(pos, e)) === false)
      return;
    pressedDelta.value = pos;
    handleEvent(e);
  };
  const move = (e) => {
    if (vue.toValue(options.disabled) || !filterEvent(e))
      return;
    if (!pressedDelta.value)
      return;
    const container = vue.toValue(containerElement);
    const targetRect = vue.toValue(target).getBoundingClientRect();
    let { x, y } = position.value;
    if (axis === "x" || axis === "both") {
      x = e.clientX - pressedDelta.value.x;
      if (container)
        x = Math.min(Math.max(0, x), container.scrollWidth - targetRect.width);
    }
    if (axis === "y" || axis === "both") {
      y = e.clientY - pressedDelta.value.y;
      if (container)
        y = Math.min(Math.max(0, y), container.scrollHeight - targetRect.height);
    }
    position.value = {
      x,
      y
    };
    onMove == null ? void 0 : onMove(position.value, e);
    handleEvent(e);
  };
  const end = (e) => {
    if (vue.toValue(options.disabled) || !filterEvent(e))
      return;
    if (!pressedDelta.value)
      return;
    pressedDelta.value = void 0;
    onEnd == null ? void 0 : onEnd(position.value, e);
    handleEvent(e);
  };
  if (shared.isClient) {
    const config = () => {
      var _a2;
      return {
        capture: (_a2 = options.capture) != null ? _a2 : true,
        passive: !vue.toValue(preventDefault)
      };
    };
    useEventListener(draggingHandle, "pointerdown", start, config);
    useEventListener(draggingElement, "pointermove", move, config);
    useEventListener(draggingElement, "pointerup", end, config);
  }
  return {
    ...shared.toRefs(position),
    position,
    isDragging: vue.computed(() => !!pressedDelta.value),
    style: vue.computed(
      () => `left:${position.value.x}px;top:${position.value.y}px;`
    )
  };
}

function useDropZone(target, options = {}) {
  var _a, _b;
  const isOverDropZone = vue.shallowRef(false);
  const files = vue.shallowRef(null);
  let counter = 0;
  let isValid = true;
  if (shared.isClient) {
    const _options = typeof options === "function" ? { onDrop: options } : options;
    const multiple = (_a = _options.multiple) != null ? _a : true;
    const preventDefaultForUnhandled = (_b = _options.preventDefaultForUnhandled) != null ? _b : false;
    const getFiles = (event) => {
      var _a2, _b2;
      const list = Array.from((_b2 = (_a2 = event.dataTransfer) == null ? void 0 : _a2.files) != null ? _b2 : []);
      return list.length === 0 ? null : multiple ? list : [list[0]];
    };
    const checkDataTypes = (types) => {
      const dataTypes = vue.unref(_options.dataTypes);
      if (typeof dataTypes === "function")
        return dataTypes(types);
      if (!(dataTypes == null ? void 0 : dataTypes.length))
        return true;
      if (types.length === 0)
        return false;
      return types.every(
        (type) => dataTypes.some((allowedType) => type.includes(allowedType))
      );
    };
    const checkValidity = (items) => {
      const types = Array.from(items != null ? items : []).map((item) => item.type);
      const dataTypesValid = checkDataTypes(types);
      const multipleFilesValid = multiple || items.length <= 1;
      return dataTypesValid && multipleFilesValid;
    };
    const isSafari = () => /^(?:(?!chrome|android).)*safari/i.test(navigator.userAgent) && !("chrome" in window);
    const handleDragEvent = (event, eventType) => {
      var _a2, _b2, _c, _d, _e, _f;
      const dataTransferItemList = (_a2 = event.dataTransfer) == null ? void 0 : _a2.items;
      isValid = (_b2 = dataTransferItemList && checkValidity(dataTransferItemList)) != null ? _b2 : false;
      if (preventDefaultForUnhandled) {
        event.preventDefault();
      }
      if (!isSafari() && !isValid) {
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "none";
        }
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      const currentFiles = getFiles(event);
      switch (eventType) {
        case "enter":
          counter += 1;
          isOverDropZone.value = true;
          (_c = _options.onEnter) == null ? void 0 : _c.call(_options, null, event);
          break;
        case "over":
          (_d = _options.onOver) == null ? void 0 : _d.call(_options, null, event);
          break;
        case "leave":
          counter -= 1;
          if (counter === 0)
            isOverDropZone.value = false;
          (_e = _options.onLeave) == null ? void 0 : _e.call(_options, null, event);
          break;
        case "drop":
          counter = 0;
          isOverDropZone.value = false;
          if (isValid) {
            files.value = currentFiles;
            (_f = _options.onDrop) == null ? void 0 : _f.call(_options, currentFiles, event);
          }
          break;
      }
    };
    useEventListener(target, "dragenter", (event) => handleDragEvent(event, "enter"));
    useEventListener(target, "dragover", (event) => handleDragEvent(event, "over"));
    useEventListener(target, "dragleave", (event) => handleDragEvent(event, "leave"));
    useEventListener(target, "drop", (event) => handleDragEvent(event, "drop"));
  }
  return {
    files,
    isOverDropZone
  };
}

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
  const targets = vue.computed(() => {
    const _targets = vue.toValue(target);
    return Array.isArray(_targets) ? _targets.map((el) => unrefElement(el)) : [unrefElement(_targets)];
  });
  const stopWatch = vue.watch(
    targets,
    (els) => {
      cleanup();
      if (isSupported.value && window) {
        observer = new ResizeObserver(callback);
        for (const _el of els) {
          if (_el)
            observer.observe(_el, observerOptions);
        }
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

function useElementBounding(target, options = {}) {
  const {
    reset = true,
    windowResize = true,
    windowScroll = true,
    immediate = true,
    updateTiming = "sync"
  } = options;
  const height = vue.shallowRef(0);
  const bottom = vue.shallowRef(0);
  const left = vue.shallowRef(0);
  const right = vue.shallowRef(0);
  const top = vue.shallowRef(0);
  const width = vue.shallowRef(0);
  const x = vue.shallowRef(0);
  const y = vue.shallowRef(0);
  function recalculate() {
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
  function update() {
    if (updateTiming === "sync")
      recalculate();
    else if (updateTiming === "next-frame")
      requestAnimationFrame(() => recalculate());
  }
  useResizeObserver(target, update);
  vue.watch(() => unrefElement(target), (ele) => !ele && update());
  useMutationObserver(target, update, {
    attributeFilter: ["style", "class"]
  });
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

function useElementByPoint(options) {
  const {
    x,
    y,
    document = defaultDocument,
    multiple,
    interval = "requestAnimationFrame",
    immediate = true
  } = options;
  const isSupported = useSupported(() => {
    if (vue.toValue(multiple))
      return document && "elementsFromPoint" in document;
    return document && "elementFromPoint" in document;
  });
  const element = vue.shallowRef(null);
  const cb = () => {
    var _a, _b;
    element.value = vue.toValue(multiple) ? (_a = document == null ? void 0 : document.elementsFromPoint(vue.toValue(x), vue.toValue(y))) != null ? _a : [] : (_b = document == null ? void 0 : document.elementFromPoint(vue.toValue(x), vue.toValue(y))) != null ? _b : null;
  };
  const controls = interval === "requestAnimationFrame" ? useRafFn(cb, { immediate }) : shared.useIntervalFn(cb, interval, { immediate });
  return {
    isSupported,
    element,
    ...controls
  };
}

function useElementHover(el, options = {}) {
  const {
    delayEnter = 0,
    delayLeave = 0,
    triggerOnRemoval = false,
    window = defaultWindow
  } = options;
  const isHovered = vue.shallowRef(false);
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
  if (triggerOnRemoval) {
    onElementRemoval(
      vue.computed(() => unrefElement(el)),
      () => toggle(false)
    );
  }
  return isHovered;
}

function useElementSize(target, initialSize = { width: 0, height: 0 }, options = {}) {
  const { window = defaultWindow, box = "content-box" } = options;
  const isSVG = vue.computed(() => {
    var _a, _b;
    return (_b = (_a = unrefElement(target)) == null ? void 0 : _a.namespaceURI) == null ? void 0 : _b.includes("svg");
  });
  const width = vue.shallowRef(initialSize.width);
  const height = vue.shallowRef(initialSize.height);
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
          const formatBoxSize = shared.toArray(boxSize);
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
  const stop2 = vue.watch(
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

function useIntersectionObserver(target, callback, options = {}) {
  const {
    root,
    rootMargin = "0px",
    threshold = 0,
    window = defaultWindow,
    immediate = true
  } = options;
  const isSupported = useSupported(() => window && "IntersectionObserver" in window);
  const targets = vue.computed(() => {
    const _target = vue.toValue(target);
    return shared.toArray(_target).map(unrefElement).filter(shared.notNullish);
  });
  let cleanup = shared.noop;
  const isActive = vue.shallowRef(immediate);
  const stopWatch = isSupported.value ? vue.watch(
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
  const {
    window = defaultWindow,
    scrollTarget,
    threshold = 0,
    rootMargin,
    once = false
  } = options;
  const elementIsVisible = vue.shallowRef(false);
  const { stop } = useIntersectionObserver(
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
      if (once) {
        shared.watchOnce(elementIsVisible, () => {
          stop();
        });
      }
    },
    {
      root: scrollTarget,
      window,
      threshold,
      rootMargin: vue.toValue(rootMargin)
    }
  );
  return elementIsVisible;
}

const events = /* @__PURE__ */ new Map();

function useEventBus(key) {
  const scope = vue.getCurrentScope();
  function on(listener) {
    var _a;
    const listeners = events.get(key) || /* @__PURE__ */ new Set();
    listeners.add(listener);
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
    listeners.delete(listener);
    if (!listeners.size)
      reset();
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

function resolveNestedOptions$1(options) {
  if (options === true)
    return {};
  return options;
}
function useEventSource(url, events = [], options = {}) {
  const event = vue.shallowRef(null);
  const data = vue.shallowRef(null);
  const status = vue.shallowRef("CONNECTING");
  const eventSource = vue.ref(null);
  const error = vue.shallowRef(null);
  const urlRef = shared.toRef(url);
  const lastEventId = vue.shallowRef(null);
  let explicitlyClosed = false;
  let retried = 0;
  const {
    withCredentials = false,
    immediate = true,
    autoConnect = true,
    autoReconnect
  } = options;
  const close = () => {
    if (shared.isClient && eventSource.value) {
      eventSource.value.close();
      eventSource.value = null;
      status.value = "CLOSED";
      explicitlyClosed = true;
    }
  };
  const _init = () => {
    if (explicitlyClosed || typeof urlRef.value === "undefined")
      return;
    const es = new EventSource(urlRef.value, { withCredentials });
    status.value = "CONNECTING";
    eventSource.value = es;
    es.onopen = () => {
      status.value = "OPEN";
      error.value = null;
    };
    es.onerror = (e) => {
      status.value = "CLOSED";
      error.value = e;
      if (es.readyState === 2 && !explicitlyClosed && autoReconnect) {
        es.close();
        const {
          retries = -1,
          delay = 1e3,
          onFailed
        } = resolveNestedOptions$1(autoReconnect);
        retried += 1;
        if (typeof retries === "number" && (retries < 0 || retried < retries))
          setTimeout(_init, delay);
        else if (typeof retries === "function" && retries())
          setTimeout(_init, delay);
        else
          onFailed == null ? void 0 : onFailed();
      }
    };
    es.onmessage = (e) => {
      event.value = null;
      data.value = e.data;
      lastEventId.value = e.lastEventId;
    };
    for (const event_name of events) {
      useEventListener(es, event_name, (e) => {
        event.value = event_name;
        data.value = e.data || null;
      }, { passive: true });
    }
  };
  const open = () => {
    if (!shared.isClient)
      return;
    close();
    explicitlyClosed = false;
    retried = 0;
    _init();
  };
  if (immediate)
    open();
  if (autoConnect)
    vue.watch(urlRef, open);
  shared.tryOnScopeDispose(close);
  return {
    eventSource,
    event,
    data,
    status,
    error,
    open,
    close,
    lastEventId
  };
}

function useEyeDropper(options = {}) {
  const { initialValue = "" } = options;
  const isSupported = useSupported(() => typeof window !== "undefined" && "EyeDropper" in window);
  const sRGBHex = vue.shallowRef(initialValue);
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
  const favicon = shared.toRef(newIcon);
  const applyIcon = (icon) => {
    const elements = document == null ? void 0 : document.head.querySelectorAll(`link[rel*="${rel}"]`);
    if (!elements || elements.length === 0) {
      const link = document == null ? void 0 : document.createElement("link");
      if (link) {
        link.rel = rel;
        link.href = `${baseUrl}${icon}`;
        link.type = `image/${icon.split(".").pop()}`;
        document == null ? void 0 : document.head.append(link);
      }
      return;
    }
    elements == null ? void 0 : elements.forEach((el) => el.href = `${baseUrl}${icon}`);
  };
  vue.watch(
    favicon,
    (i, o) => {
      if (typeof i === "string" && i !== o)
        applyIcon(i);
    },
    { immediate: true }
  );
  return favicon;
}

const payloadMapping = {
  json: "application/json",
  text: "text/plain"
};
function isFetchOptions(obj) {
  return obj && shared.containsProp(obj, "immediate", "refetch", "initialData", "timeout", "beforeFetch", "afterFetch", "onFetchError", "fetch", "updateDataOnError");
}
const reAbsolute = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;
function isAbsoluteURL(url) {
  return reAbsolute.test(url);
}
function headersToObject(headers) {
  if (typeof Headers !== "undefined" && headers instanceof Headers)
    return Object.fromEntries(headers.entries());
  return headers;
}
function combineCallbacks(combination, ...callbacks) {
  if (combination === "overwrite") {
    return async (ctx) => {
      let callback;
      for (let i = callbacks.length - 1; i >= 0; i--) {
        if (callbacks[i] != null) {
          callback = callbacks[i];
          break;
        }
      }
      if (callback)
        return { ...ctx, ...await callback(ctx) };
      return ctx;
    };
  } else {
    return async (ctx) => {
      for (const callback of callbacks) {
        if (callback)
          ctx = { ...ctx, ...await callback(ctx) };
      }
      return ctx;
    };
  }
}
function createFetch(config = {}) {
  const _combination = config.combination || "chain";
  const _options = config.options || {};
  const _fetchOptions = config.fetchOptions || {};
  function useFactoryFetch(url, ...args) {
    const computedUrl = vue.computed(() => {
      const baseUrl = vue.toValue(config.baseUrl);
      const targetUrl = vue.toValue(url);
      return baseUrl && !isAbsoluteURL(targetUrl) ? joinPaths(baseUrl, targetUrl) : targetUrl;
    });
    let options = _options;
    let fetchOptions = _fetchOptions;
    if (args.length > 0) {
      if (isFetchOptions(args[0])) {
        options = {
          ...options,
          ...args[0],
          beforeFetch: combineCallbacks(_combination, _options.beforeFetch, args[0].beforeFetch),
          afterFetch: combineCallbacks(_combination, _options.afterFetch, args[0].afterFetch),
          onFetchError: combineCallbacks(_combination, _options.onFetchError, args[0].onFetchError)
        };
      } else {
        fetchOptions = {
          ...fetchOptions,
          ...args[0],
          headers: {
            ...headersToObject(fetchOptions.headers) || {},
            ...headersToObject(args[0].headers) || {}
          }
        };
      }
    }
    if (args.length > 1 && isFetchOptions(args[1])) {
      options = {
        ...options,
        ...args[1],
        beforeFetch: combineCallbacks(_combination, _options.beforeFetch, args[1].beforeFetch),
        afterFetch: combineCallbacks(_combination, _options.afterFetch, args[1].afterFetch),
        onFetchError: combineCallbacks(_combination, _options.onFetchError, args[1].onFetchError)
      };
    }
    return useFetch(computedUrl, fetchOptions, options);
  }
  return useFactoryFetch;
}
function useFetch(url, ...args) {
  var _a;
  const supportsAbort = typeof AbortController === "function";
  let fetchOptions = {};
  let options = {
    immediate: true,
    refetch: false,
    timeout: 0,
    updateDataOnError: false
  };
  const config = {
    method: "GET",
    type: "text",
    payload: void 0
  };
  if (args.length > 0) {
    if (isFetchOptions(args[0]))
      options = { ...options, ...args[0] };
    else
      fetchOptions = args[0];
  }
  if (args.length > 1) {
    if (isFetchOptions(args[1]))
      options = { ...options, ...args[1] };
  }
  const {
    fetch = (_a = defaultWindow) == null ? void 0 : _a.fetch,
    initialData,
    timeout
  } = options;
  const responseEvent = shared.createEventHook();
  const errorEvent = shared.createEventHook();
  const finallyEvent = shared.createEventHook();
  const isFinished = vue.shallowRef(false);
  const isFetching = vue.shallowRef(false);
  const aborted = vue.shallowRef(false);
  const statusCode = vue.shallowRef(null);
  const response = vue.shallowRef(null);
  const error = vue.shallowRef(null);
  const data = vue.shallowRef(initialData || null);
  const canAbort = vue.computed(() => supportsAbort && isFetching.value);
  let controller;
  let timer;
  const abort = () => {
    if (supportsAbort) {
      controller == null ? void 0 : controller.abort();
      controller = new AbortController();
      controller.signal.onabort = () => aborted.value = true;
      fetchOptions = {
        ...fetchOptions,
        signal: controller.signal
      };
    }
  };
  const loading = (isLoading) => {
    isFetching.value = isLoading;
    isFinished.value = !isLoading;
  };
  if (timeout)
    timer = shared.useTimeoutFn(abort, timeout, { immediate: false });
  let executeCounter = 0;
  const execute = async (throwOnFailed = false) => {
    var _a2, _b;
    abort();
    loading(true);
    error.value = null;
    statusCode.value = null;
    aborted.value = false;
    executeCounter += 1;
    const currentExecuteCounter = executeCounter;
    const defaultFetchOptions = {
      method: config.method,
      headers: {}
    };
    const payload = vue.toValue(config.payload);
    if (payload) {
      const headers = headersToObject(defaultFetchOptions.headers);
      const proto = Object.getPrototypeOf(payload);
      if (!config.payloadType && payload && (proto === Object.prototype || Array.isArray(proto)) && !(payload instanceof FormData))
        config.payloadType = "json";
      if (config.payloadType)
        headers["Content-Type"] = (_a2 = payloadMapping[config.payloadType]) != null ? _a2 : config.payloadType;
      defaultFetchOptions.body = config.payloadType === "json" ? JSON.stringify(payload) : payload;
    }
    let isCanceled = false;
    const context = {
      url: vue.toValue(url),
      options: {
        ...defaultFetchOptions,
        ...fetchOptions
      },
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
    return fetch(
      context.url,
      {
        ...defaultFetchOptions,
        ...context.options,
        headers: {
          ...headersToObject(defaultFetchOptions.headers),
          ...headersToObject((_b = context.options) == null ? void 0 : _b.headers)
        }
      }
    ).then(async (fetchResponse) => {
      response.value = fetchResponse;
      statusCode.value = fetchResponse.status;
      responseData = await fetchResponse.clone()[config.type]();
      if (!fetchResponse.ok) {
        data.value = initialData || null;
        throw new Error(fetchResponse.statusText);
      }
      if (options.afterFetch) {
        ({ data: responseData } = await options.afterFetch({
          data: responseData,
          response: fetchResponse,
          context,
          execute
        }));
      }
      data.value = responseData;
      responseEvent.trigger(fetchResponse);
      return fetchResponse;
    }).catch(async (fetchError) => {
      let errorData = fetchError.message || fetchError.name;
      if (options.onFetchError) {
        ({ error: errorData, data: responseData } = await options.onFetchError({
          data: responseData,
          error: fetchError,
          response: response.value,
          context,
          execute
        }));
      }
      error.value = errorData;
      if (options.updateDataOnError)
        data.value = responseData;
      errorEvent.trigger(fetchError);
      if (throwOnFailed)
        throw fetchError;
      return null;
    }).finally(() => {
      if (currentExecuteCounter === executeCounter)
        loading(false);
      if (timer)
        timer.stop();
      finallyEvent.trigger(null);
    });
  };
  const refetch = shared.toRef(options.refetch);
  vue.watch(
    [
      refetch,
      shared.toRef(url)
    ],
    ([refetch2]) => refetch2 && execute(),
    { deep: true }
  );
  const shell = {
    isFinished: vue.readonly(isFinished),
    isFetching: vue.readonly(isFetching),
    statusCode,
    response,
    error,
    data,
    canAbort,
    aborted,
    abort,
    execute,
    onFetchResponse: responseEvent.on,
    onFetchError: errorEvent.on,
    onFetchFinally: finallyEvent.on,
    // method
    get: setMethod("GET"),
    put: setMethod("PUT"),
    post: setMethod("POST"),
    delete: setMethod("DELETE"),
    patch: setMethod("PATCH"),
    head: setMethod("HEAD"),
    options: setMethod("OPTIONS"),
    // type
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
        if (vue.isRef(config.payload)) {
          vue.watch(
            [
              refetch,
              shared.toRef(config.payload)
            ],
            ([refetch2]) => refetch2 && execute(),
            { deep: true }
          );
        }
        return {
          ...shell,
          then(onFulfilled, onRejected) {
            return waitUntilFinished().then(onFulfilled, onRejected);
          }
        };
      }
      return void 0;
    };
  }
  function waitUntilFinished() {
    return new Promise((resolve, reject) => {
      shared.until(isFinished).toBe(true).then(() => resolve(shell)).catch(reject);
    });
  }
  function setType(type) {
    return () => {
      if (!isFetching.value) {
        config.type = type;
        return {
          ...shell,
          then(onFulfilled, onRejected) {
            return waitUntilFinished().then(onFulfilled, onRejected);
          }
        };
      }
      return void 0;
    };
  }
  if (options.immediate)
    Promise.resolve().then(() => execute());
  return {
    ...shell,
    then(onFulfilled, onRejected) {
      return waitUntilFinished().then(onFulfilled, onRejected);
    }
  };
}
function joinPaths(start, end) {
  if (!start.endsWith("/") && !end.startsWith("/")) {
    return `${start}/${end}`;
  }
  if (start.endsWith("/") && end.startsWith("/")) {
    return `${start.slice(0, -1)}${end}`;
  }
  return `${start}${end}`;
}

const DEFAULT_OPTIONS = {
  multiple: true,
  accept: "*",
  reset: false,
  directory: false
};
function prepareInitialFiles(files) {
  if (!files)
    return null;
  if (files instanceof FileList)
    return files;
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  return dt.files;
}
function useFileDialog(options = {}) {
  const {
    document = defaultDocument
  } = options;
  const files = vue.ref(prepareInitialFiles(options.initialFiles));
  const { on: onChange, trigger: changeTrigger } = shared.createEventHook();
  const { on: onCancel, trigger: cancelTrigger } = shared.createEventHook();
  let input;
  if (document) {
    input = document.createElement("input");
    input.type = "file";
    input.onchange = (event) => {
      const result = event.target;
      files.value = result.files;
      changeTrigger(files.value);
    };
    input.oncancel = () => {
      cancelTrigger();
    };
  }
  const reset = () => {
    files.value = null;
    if (input && input.value) {
      input.value = "";
      changeTrigger(null);
    }
  };
  const open = (localOptions) => {
    if (!input)
      return;
    const _options = {
      ...DEFAULT_OPTIONS,
      ...options,
      ...localOptions
    };
    input.multiple = _options.multiple;
    input.accept = _options.accept;
    input.webkitdirectory = _options.directory;
    if (shared.hasOwn(_options, "capture"))
      input.capture = _options.capture;
    if (_options.reset)
      reset();
    input.click();
  };
  return {
    files: vue.readonly(files),
    open,
    reset,
    onCancel,
    onChange
  };
}

function useFileSystemAccess(options = {}) {
  const {
    window: _window = defaultWindow,
    dataType = "Text"
  } = options;
  const window = _window;
  const isSupported = useSupported(() => window && "showSaveFilePicker" in window && "showOpenFilePicker" in window);
  const fileHandle = vue.shallowRef();
  const data = vue.shallowRef();
  const file = vue.shallowRef();
  const fileName = vue.computed(() => {
    var _a, _b;
    return (_b = (_a = file.value) == null ? void 0 : _a.name) != null ? _b : "";
  });
  const fileMIME = vue.computed(() => {
    var _a, _b;
    return (_b = (_a = file.value) == null ? void 0 : _a.type) != null ? _b : "";
  });
  const fileSize = vue.computed(() => {
    var _a, _b;
    return (_b = (_a = file.value) == null ? void 0 : _a.size) != null ? _b : 0;
  });
  const fileLastModified = vue.computed(() => {
    var _a, _b;
    return (_b = (_a = file.value) == null ? void 0 : _a.lastModified) != null ? _b : 0;
  });
  async function open(_options = {}) {
    if (!isSupported.value)
      return;
    const [handle] = await window.showOpenFilePicker({ ...vue.toValue(options), ..._options });
    fileHandle.value = handle;
    await updateData();
  }
  async function create(_options = {}) {
    if (!isSupported.value)
      return;
    fileHandle.value = await window.showSaveFilePicker({ ...options, ..._options });
    data.value = void 0;
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
    fileHandle.value = await window.showSaveFilePicker({ ...options, ..._options });
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
    await updateFile();
    const type = vue.toValue(dataType);
    if (type === "Text")
      data.value = await ((_a = file.value) == null ? void 0 : _a.text());
    else if (type === "ArrayBuffer")
      data.value = await ((_b = file.value) == null ? void 0 : _b.arrayBuffer());
    else if (type === "Blob")
      data.value = file.value;
  }
  vue.watch(() => vue.toValue(dataType), updateData);
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
  const { initialValue = false, focusVisible = false, preventScroll = false } = options;
  const innerFocused = vue.shallowRef(false);
  const targetElement = vue.computed(() => unrefElement(target));
  const listenerOptions = { passive: true };
  useEventListener(targetElement, "focus", (event) => {
    var _a, _b;
    if (!focusVisible || ((_b = (_a = event.target).matches) == null ? void 0 : _b.call(_a, ":focus-visible")))
      innerFocused.value = true;
  }, listenerOptions);
  useEventListener(targetElement, "blur", () => innerFocused.value = false, listenerOptions);
  const focused = vue.computed({
    get: () => innerFocused.value,
    set(value) {
      var _a, _b;
      if (!value && innerFocused.value)
        (_a = targetElement.value) == null ? void 0 : _a.blur();
      else if (value && !innerFocused.value)
        (_b = targetElement.value) == null ? void 0 : _b.focus({ preventScroll });
    }
  });
  vue.watch(
    targetElement,
    () => {
      focused.value = initialValue;
    },
    { immediate: true, flush: "post" }
  );
  return { focused };
}

const EVENT_FOCUS_IN = "focusin";
const EVENT_FOCUS_OUT = "focusout";
const PSEUDO_CLASS_FOCUS_WITHIN = ":focus-within";
function useFocusWithin(target, options = {}) {
  const { window = defaultWindow } = options;
  const targetElement = vue.computed(() => unrefElement(target));
  const _focused = vue.shallowRef(false);
  const focused = vue.computed(() => _focused.value);
  const activeElement = useActiveElement(options);
  if (!window || !activeElement.value) {
    return { focused };
  }
  const listenerOptions = { passive: true };
  useEventListener(targetElement, EVENT_FOCUS_IN, () => _focused.value = true, listenerOptions);
  useEventListener(targetElement, EVENT_FOCUS_OUT, () => {
    var _a, _b, _c;
    return _focused.value = (_c = (_b = (_a = targetElement.value) == null ? void 0 : _a.matches) == null ? void 0 : _b.call(_a, PSEUDO_CLASS_FOCUS_WITHIN)) != null ? _c : false;
  }, listenerOptions);
  return { focused };
}

function useFps(options) {
  var _a;
  const fps = vue.shallowRef(0);
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

const eventHandlers = [
  "fullscreenchange",
  "webkitfullscreenchange",
  "webkitendfullscreen",
  "mozfullscreenchange",
  "MSFullscreenChange"
];
function useFullscreen(target, options = {}) {
  const {
    document = defaultDocument,
    autoExit = false
  } = options;
  const targetRef = vue.computed(() => {
    var _a;
    return (_a = unrefElement(target)) != null ? _a : document == null ? void 0 : document.documentElement;
  });
  const isFullscreen = vue.shallowRef(false);
  const requestMethod = vue.computed(() => {
    return [
      "requestFullscreen",
      "webkitRequestFullscreen",
      "webkitEnterFullscreen",
      "webkitEnterFullScreen",
      "webkitRequestFullScreen",
      "mozRequestFullScreen",
      "msRequestFullscreen"
    ].find((m) => document && m in document || targetRef.value && m in targetRef.value);
  });
  const exitMethod = vue.computed(() => {
    return [
      "exitFullscreen",
      "webkitExitFullscreen",
      "webkitExitFullScreen",
      "webkitCancelFullScreen",
      "mozCancelFullScreen",
      "msExitFullscreen"
    ].find((m) => document && m in document || targetRef.value && m in targetRef.value);
  });
  const fullscreenEnabled = vue.computed(() => {
    return [
      "fullScreen",
      "webkitIsFullScreen",
      "webkitDisplayingFullscreen",
      "mozFullScreen",
      "msFullscreenElement"
    ].find((m) => document && m in document || targetRef.value && m in targetRef.value);
  });
  const fullscreenElementMethod = [
    "fullscreenElement",
    "webkitFullscreenElement",
    "mozFullScreenElement",
    "msFullscreenElement"
  ].find((m) => document && m in document);
  const isSupported = useSupported(() => targetRef.value && document && requestMethod.value !== void 0 && exitMethod.value !== void 0 && fullscreenEnabled.value !== void 0);
  const isCurrentElementFullScreen = () => {
    if (fullscreenElementMethod)
      return (document == null ? void 0 : document[fullscreenElementMethod]) === targetRef.value;
    return false;
  };
  const isElementFullScreen = () => {
    if (fullscreenEnabled.value) {
      if (document && document[fullscreenEnabled.value] != null) {
        return document[fullscreenEnabled.value];
      } else {
        const target2 = targetRef.value;
        if ((target2 == null ? void 0 : target2[fullscreenEnabled.value]) != null) {
          return Boolean(target2[fullscreenEnabled.value]);
        }
      }
    }
    return false;
  };
  async function exit() {
    if (!isSupported.value || !isFullscreen.value)
      return;
    if (exitMethod.value) {
      if ((document == null ? void 0 : document[exitMethod.value]) != null) {
        await document[exitMethod.value]();
      } else {
        const target2 = targetRef.value;
        if ((target2 == null ? void 0 : target2[exitMethod.value]) != null)
          await target2[exitMethod.value]();
      }
    }
    isFullscreen.value = false;
  }
  async function enter() {
    if (!isSupported.value || isFullscreen.value)
      return;
    if (isElementFullScreen())
      await exit();
    const target2 = targetRef.value;
    if (requestMethod.value && (target2 == null ? void 0 : target2[requestMethod.value]) != null) {
      await target2[requestMethod.value]();
      isFullscreen.value = true;
    }
  }
  async function toggle() {
    await (isFullscreen.value ? exit() : enter());
  }
  const handlerCallback = () => {
    const isElementFullScreenValue = isElementFullScreen();
    if (!isElementFullScreenValue || isElementFullScreenValue && isCurrentElementFullScreen())
      isFullscreen.value = isElementFullScreenValue;
  };
  const listenerOptions = { capture: false, passive: true };
  useEventListener(document, eventHandlers, handlerCallback, listenerOptions);
  useEventListener(() => unrefElement(targetRef), eventHandlers, handlerCallback, listenerOptions);
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
  return vue.computed(() => {
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
  const gamepads = vue.ref([]);
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
      index: gamepad.index,
      connected: gamepad.connected,
      mapping: gamepad.mapping,
      timestamp: gamepad.timestamp,
      vibrationActuator: gamepad.vibrationActuator,
      hapticActuators,
      axes: gamepad.axes.map((axes) => axes),
      buttons: gamepad.buttons.map((button) => ({ pressed: button.pressed, touched: button.touched, value: button.value }))
    };
  };
  const updateGamepadState = () => {
    const _gamepads = (navigator == null ? void 0 : navigator.getGamepads()) || [];
    for (const gamepad of _gamepads) {
      if (gamepad && gamepads.value[gamepad.index])
        gamepads.value[gamepad.index] = stateFromGamepad(gamepad);
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
  const listenerOptions = { passive: true };
  useEventListener("gamepadconnected", (e) => onGamepadConnected(e.gamepad), listenerOptions);
  useEventListener("gamepaddisconnected", (e) => onGamepadDisconnected(e.gamepad), listenerOptions);
  shared.tryOnMounted(() => {
    const _gamepads = (navigator == null ? void 0 : navigator.getGamepads()) || [];
    for (const gamepad of _gamepads) {
      if (gamepad && gamepads.value[gamepad.index])
        onGamepadConnected(gamepad);
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
  const locatedAt = vue.shallowRef(null);
  const error = vue.shallowRef(null);
  const coords = vue.ref({
    accuracy: 0,
    latitude: Number.POSITIVE_INFINITY,
    longitude: Number.POSITIVE_INFINITY,
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
      watcher = navigator.geolocation.watchPosition(
        updatePosition,
        (err) => error.value = err,
        {
          enableHighAccuracy,
          maximumAge,
          timeout
        }
      );
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
  const idle = vue.shallowRef(initialState);
  const lastActive = vue.shallowRef(shared.timestamp());
  let timer;
  const reset = () => {
    idle.value = false;
    clearTimeout(timer);
    timer = setTimeout(() => idle.value = true, timeout);
  };
  const onEvent = shared.createFilterWrapper(
    eventFilter,
    () => {
      lastActive.value = shared.timestamp();
      reset();
    }
  );
  if (window) {
    const document = window.document;
    const listenerOptions = { passive: true };
    for (const event of events)
      useEventListener(window, event, onEvent, listenerOptions);
    if (listenForVisibilityChange) {
      useEventListener(document, "visibilitychange", () => {
        if (!document.hidden)
          onEvent();
      }, listenerOptions);
    }
    reset();
  }
  return {
    idle,
    lastActive,
    reset
  };
}

async function loadImage(options) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const { src, srcset, sizes, class: clazz, loading, crossorigin, referrerPolicy, width, height, decoding, fetchPriority, ismap, usemap } = options;
    img.src = src;
    if (srcset != null)
      img.srcset = srcset;
    if (sizes != null)
      img.sizes = sizes;
    if (clazz != null)
      img.className = clazz;
    if (loading != null)
      img.loading = loading;
    if (crossorigin != null)
      img.crossOrigin = crossorigin;
    if (referrerPolicy != null)
      img.referrerPolicy = referrerPolicy;
    if (width != null)
      img.width = width;
    if (height != null)
      img.height = height;
    if (decoding != null)
      img.decoding = decoding;
    if (fetchPriority != null)
      img.fetchPriority = fetchPriority;
    if (ismap != null)
      img.isMap = ismap;
    if (usemap != null)
      img.useMap = usemap;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}
function useImage(options, asyncStateOptions = {}) {
  const state = useAsyncState(
    () => loadImage(vue.toValue(options)),
    void 0,
    {
      resetOnExecute: true,
      ...asyncStateOptions
    }
  );
  vue.watch(
    () => vue.toValue(options),
    () => state.execute(asyncStateOptions.delay),
    { deep: true }
  );
  return state;
}

function resolveElement(el) {
  if (typeof Window !== "undefined" && el instanceof Window)
    return el.document.documentElement;
  if (typeof Document !== "undefined" && el instanceof Document)
    return el.documentElement;
  return el;
}

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
  const internalX = vue.shallowRef(0);
  const internalY = vue.shallowRef(0);
  const x = vue.computed({
    get() {
      return internalX.value;
    },
    set(x2) {
      scrollTo(x2, void 0);
    }
  });
  const y = vue.computed({
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
    const _element = vue.toValue(element);
    if (!_element)
      return;
    (_c = _element instanceof Document ? window.document.body : _element) == null ? void 0 : _c.scrollTo({
      top: (_a = vue.toValue(_y)) != null ? _a : y.value,
      left: (_b = vue.toValue(_x)) != null ? _b : x.value,
      behavior: vue.toValue(behavior)
    });
    const scrollContainer = ((_d = _element == null ? void 0 : _element.document) == null ? void 0 : _d.documentElement) || (_element == null ? void 0 : _element.documentElement) || _element;
    if (x != null)
      internalX.value = scrollContainer.scrollLeft;
    if (y != null)
      internalY.value = scrollContainer.scrollTop;
  }
  const isScrolling = vue.shallowRef(false);
  const arrivedState = vue.reactive({
    left: true,
    right: false,
    top: true,
    bottom: false
  });
  const directions = vue.reactive({
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
    const { display, flexDirection, direction } = getComputedStyle(el);
    const directionMultipler = direction === "rtl" ? -1 : 1;
    const scrollLeft = el.scrollLeft;
    directions.left = scrollLeft < internalX.value;
    directions.right = scrollLeft > internalX.value;
    const left = Math.abs(scrollLeft * directionMultipler) <= (offset.left || 0);
    const right = Math.abs(scrollLeft * directionMultipler) + el.clientWidth >= el.scrollWidth - (offset.right || 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
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
      const _element = vue.toValue(element);
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
      const _element = vue.toValue(element);
      if (window && _element)
        setArrivedState(_element);
    }
  };
}

function useInfiniteScroll(element, onLoadMore, options = {}) {
  var _a;
  const {
    direction = "bottom",
    interval = 100,
    canLoadMore = () => true
  } = options;
  const state = vue.reactive(useScroll(
    element,
    {
      ...options,
      offset: {
        [direction]: (_a = options.distance) != null ? _a : 0,
        ...options.offset
      }
    }
  ));
  const promise = vue.ref();
  const isLoading = vue.computed(() => !!promise.value);
  const observedElement = vue.computed(() => {
    return resolveElement(vue.toValue(element));
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
          vue.nextTick(() => checkAndLoad());
        });
      }
    }
  }
  const stop = vue.watch(
    () => [state.arrivedState[direction], isElementVisible.value],
    checkAndLoad,
    { immediate: true }
  );
  shared.tryOnUnmounted(stop);
  return {
    isLoading,
    reset() {
      vue.nextTick(() => checkAndLoad());
    }
  };
}

const defaultEvents = ["mousedown", "mouseup", "keydown", "keyup"];
function useKeyModifier(modifier, options = {}) {
  const {
    events = defaultEvents,
    document = defaultDocument,
    initial = null
  } = options;
  const state = vue.shallowRef(initial);
  if (document) {
    events.forEach((listenerEvent) => {
      useEventListener(document, listenerEvent, (evt) => {
        if (typeof evt.getModifierState === "function")
          state.value = evt.getModifierState(modifier);
      }, { passive: true });
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
  const current = vue.reactive(/* @__PURE__ */ new Set());
  const obj = {
    toJSON() {
      return {};
    },
    current
  };
  const refs = useReactive ? vue.reactive(obj) : obj;
  const metaDeps = /* @__PURE__ */ new Set();
  const usedKeys = /* @__PURE__ */ new Set();
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
  useEventListener("blur", reset, { passive });
  useEventListener("focus", reset, { passive });
  const proxy = new Proxy(
    refs,
    {
      get(target2, prop, rec) {
        if (typeof prop !== "string")
          return Reflect.get(target2, prop, rec);
        prop = prop.toLowerCase();
        if (prop in aliasMap)
          prop = aliasMap[prop];
        if (!(prop in refs)) {
          if (/[+_-]/.test(prop)) {
            const keys = prop.split(/[+_-]/g).map((i) => i.trim());
            refs[prop] = vue.computed(() => keys.map((key) => vue.toValue(proxy[key])).every(Boolean));
          } else {
            refs[prop] = vue.shallowRef(false);
          }
        }
        const r = Reflect.get(target2, prop, rec);
        return useReactive ? vue.toValue(r) : r;
      }
    }
  );
  return proxy;
}

function usingElRef(source, cb) {
  if (vue.toValue(source))
    cb(vue.toValue(source));
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
  target = shared.toRef(target);
  options = {
    ...defaultOptions,
    ...options
  };
  const {
    document = defaultDocument
  } = options;
  const listenerOptions = { passive: true };
  const currentTime = vue.shallowRef(0);
  const duration = vue.shallowRef(0);
  const seeking = vue.shallowRef(false);
  const volume = vue.shallowRef(1);
  const waiting = vue.shallowRef(false);
  const ended = vue.shallowRef(false);
  const playing = vue.shallowRef(false);
  const rate = vue.shallowRef(1);
  const stalled = vue.shallowRef(false);
  const buffered = vue.ref([]);
  const tracks = vue.ref([]);
  const selectedTrack = vue.shallowRef(-1);
  const isPictureInPicture = vue.shallowRef(false);
  const muted = vue.shallowRef(false);
  const supportsPictureInPicture = document && "pictureInPictureEnabled" in document;
  const sourceErrorEvent = shared.createEventHook();
  const playbackErrorEvent = shared.createEventHook();
  const disableTrack = (track) => {
    usingElRef(target, (el) => {
      if (track) {
        const id = typeof track === "number" ? track : track.id;
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
      const id = typeof track === "number" ? track : track.id;
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
  vue.watchEffect(() => {
    if (!document)
      return;
    const el = vue.toValue(target);
    if (!el)
      return;
    const src = vue.toValue(options.src);
    let sources = [];
    if (!src)
      return;
    if (typeof src === "string")
      sources = [{ src }];
    else if (Array.isArray(src))
      sources = src;
    else if (shared.isObject(src))
      sources = [src];
    el.querySelectorAll("source").forEach((e) => {
      e.remove();
    });
    sources.forEach(({ src: src2, type, media }) => {
      const source = document.createElement("source");
      source.setAttribute("src", src2);
      source.setAttribute("type", type || "");
      source.setAttribute("media", media || "");
      useEventListener(source, "error", sourceErrorEvent.trigger, listenerOptions);
      el.appendChild(source);
    });
    el.load();
  });
  vue.watch([target, volume], () => {
    const el = vue.toValue(target);
    if (!el)
      return;
    el.volume = volume.value;
  });
  vue.watch([target, muted], () => {
    const el = vue.toValue(target);
    if (!el)
      return;
    el.muted = muted.value;
  });
  vue.watch([target, rate], () => {
    const el = vue.toValue(target);
    if (!el)
      return;
    el.playbackRate = rate.value;
  });
  vue.watchEffect(() => {
    if (!document)
      return;
    const textTracks = vue.toValue(options.tracks);
    const el = vue.toValue(target);
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
    const el = vue.toValue(target);
    if (!el)
      return;
    el.currentTime = time;
  });
  const { ignoreUpdates: ignorePlayingUpdates } = shared.watchIgnorable(playing, (isPlaying) => {
    const el = vue.toValue(target);
    if (!el)
      return;
    if (isPlaying) {
      el.play().catch((e) => {
        playbackErrorEvent.trigger(e);
        throw e;
      });
    } else {
      el.pause();
    }
  });
  useEventListener(
    target,
    "timeupdate",
    () => ignoreCurrentTimeUpdates(() => currentTime.value = vue.toValue(target).currentTime),
    listenerOptions
  );
  useEventListener(
    target,
    "durationchange",
    () => duration.value = vue.toValue(target).duration,
    listenerOptions
  );
  useEventListener(
    target,
    "progress",
    () => buffered.value = timeRangeToArray(vue.toValue(target).buffered),
    listenerOptions
  );
  useEventListener(
    target,
    "seeking",
    () => seeking.value = true,
    listenerOptions
  );
  useEventListener(
    target,
    "seeked",
    () => seeking.value = false,
    listenerOptions
  );
  useEventListener(
    target,
    ["waiting", "loadstart"],
    () => {
      waiting.value = true;
      ignorePlayingUpdates(() => playing.value = false);
    },
    listenerOptions
  );
  useEventListener(
    target,
    "loadeddata",
    () => waiting.value = false,
    listenerOptions
  );
  useEventListener(
    target,
    "playing",
    () => {
      waiting.value = false;
      ended.value = false;
      ignorePlayingUpdates(() => playing.value = true);
    },
    listenerOptions
  );
  useEventListener(
    target,
    "ratechange",
    () => rate.value = vue.toValue(target).playbackRate,
    listenerOptions
  );
  useEventListener(
    target,
    "stalled",
    () => stalled.value = true,
    listenerOptions
  );
  useEventListener(
    target,
    "ended",
    () => ended.value = true,
    listenerOptions
  );
  useEventListener(
    target,
    "pause",
    () => ignorePlayingUpdates(() => playing.value = false),
    listenerOptions
  );
  useEventListener(
    target,
    "play",
    () => ignorePlayingUpdates(() => playing.value = true),
    listenerOptions
  );
  useEventListener(
    target,
    "enterpictureinpicture",
    () => isPictureInPicture.value = true,
    listenerOptions
  );
  useEventListener(
    target,
    "leavepictureinpicture",
    () => isPictureInPicture.value = false,
    listenerOptions
  );
  useEventListener(
    target,
    "volumechange",
    () => {
      const el = vue.toValue(target);
      if (!el)
        return;
      volume.value = el.volume;
      muted.value = el.muted;
    },
    listenerOptions
  );
  const listeners = [];
  const stop = vue.watch([target], () => {
    const el = vue.toValue(target);
    if (!el)
      return;
    stop();
    listeners[0] = useEventListener(el.textTracks, "addtrack", () => tracks.value = tracksToArray(el.textTracks), listenerOptions);
    listeners[1] = useEventListener(el.textTracks, "removetrack", () => tracks.value = tracksToArray(el.textTracks), listenerOptions);
    listeners[2] = useEventListener(el.textTracks, "change", () => tracks.value = tracksToArray(el.textTracks), listenerOptions);
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
    // Volume
    volume,
    muted,
    // Tracks
    tracks,
    selectedTrack,
    enableTrack,
    disableTrack,
    // Picture in Picture
    supportsPictureInPicture,
    togglePictureInPicture,
    isPictureInPicture,
    // Events
    onSourceError: sourceErrorEvent.on,
    onPlaybackError: playbackErrorEvent.on
  };
}

function useMemoize(resolver, options) {
  const initCache = () => {
    if (options == null ? void 0 : options.cache)
      return vue.shallowReactive(options.cache);
    return vue.shallowReactive(/* @__PURE__ */ new Map());
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
  const memory = vue.ref();
  const isSupported = useSupported(() => typeof performance !== "undefined" && "memory" in performance);
  if (isSupported.value) {
    const { interval = 1e3 } = options;
    shared.useIntervalFn(() => {
      memory.value = performance.memory;
    }, interval, { immediate: options.immediate, immediateCallback: options.immediateCallback });
  }
  return { isSupported, memory };
}

const UseMouseBuiltinExtractors = {
  page: (event) => [event.pageX, event.pageY],
  client: (event) => [event.clientX, event.clientY],
  screen: (event) => [event.screenX, event.screenY],
  movement: (event) => event instanceof MouseEvent ? [event.movementX, event.movementY] : null
};
function useMouse(options = {}) {
  const {
    type = "page",
    touch = true,
    resetOnTouchEnds = false,
    initialValue = { x: 0, y: 0 },
    window = defaultWindow,
    target = window,
    scroll = true,
    eventFilter
  } = options;
  let _prevMouseEvent = null;
  let _prevScrollX = 0;
  let _prevScrollY = 0;
  const x = vue.shallowRef(initialValue.x);
  const y = vue.shallowRef(initialValue.y);
  const sourceType = vue.shallowRef(null);
  const extractor = typeof type === "function" ? type : UseMouseBuiltinExtractors[type];
  const mouseHandler = (event) => {
    const result = extractor(event);
    _prevMouseEvent = event;
    if (result) {
      [x.value, y.value] = result;
      sourceType.value = "mouse";
    }
    if (window) {
      _prevScrollX = window.scrollX;
      _prevScrollY = window.scrollY;
    }
  };
  const touchHandler = (event) => {
    if (event.touches.length > 0) {
      const result = extractor(event.touches[0]);
      if (result) {
        [x.value, y.value] = result;
        sourceType.value = "touch";
      }
    }
  };
  const scrollHandler = () => {
    if (!_prevMouseEvent || !window)
      return;
    const pos = extractor(_prevMouseEvent);
    if (_prevMouseEvent instanceof MouseEvent && pos) {
      x.value = pos[0] + window.scrollX - _prevScrollX;
      y.value = pos[1] + window.scrollY - _prevScrollY;
    }
  };
  const reset = () => {
    x.value = initialValue.x;
    y.value = initialValue.y;
  };
  const mouseHandlerWrapper = eventFilter ? (event) => eventFilter(() => mouseHandler(event), {}) : (event) => mouseHandler(event);
  const touchHandlerWrapper = eventFilter ? (event) => eventFilter(() => touchHandler(event), {}) : (event) => touchHandler(event);
  const scrollHandlerWrapper = eventFilter ? () => eventFilter(() => scrollHandler(), {}) : () => scrollHandler();
  if (target) {
    const listenerOptions = { passive: true };
    useEventListener(target, ["mousemove", "dragover"], mouseHandlerWrapper, listenerOptions);
    if (touch && type !== "movement") {
      useEventListener(target, ["touchstart", "touchmove"], touchHandlerWrapper, listenerOptions);
      if (resetOnTouchEnds)
        useEventListener(target, "touchend", reset, listenerOptions);
    }
    if (scroll && type === "page")
      useEventListener(window, "scroll", scrollHandlerWrapper, listenerOptions);
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
  const type = options.type || "page";
  const { x, y, sourceType } = useMouse(options);
  const targetRef = vue.shallowRef(target != null ? target : window == null ? void 0 : window.document.body);
  const elementX = vue.shallowRef(0);
  const elementY = vue.shallowRef(0);
  const elementPositionX = vue.shallowRef(0);
  const elementPositionY = vue.shallowRef(0);
  const elementHeight = vue.shallowRef(0);
  const elementWidth = vue.shallowRef(0);
  const isOutside = vue.shallowRef(true);
  let stop = () => {
  };
  if (window) {
    stop = vue.watch(
      [targetRef, x, y],
      () => {
        const el = unrefElement(targetRef);
        if (!el || !(el instanceof Element))
          return;
        const {
          left,
          top,
          width,
          height
        } = el.getBoundingClientRect();
        elementPositionX.value = left + (type === "page" ? window.pageXOffset : 0);
        elementPositionY.value = top + (type === "page" ? window.pageYOffset : 0);
        elementHeight.value = height;
        elementWidth.value = width;
        const elX = x.value - elementPositionX.value;
        const elY = y.value - elementPositionY.value;
        isOutside.value = width === 0 || height === 0 || elX < 0 || elY < 0 || elX > width || elY > height;
        if (handleOutside || !isOutside.value) {
          elementX.value = elX;
          elementY.value = elY;
        }
      },
      { immediate: true }
    );
    useEventListener(
      document,
      "mouseleave",
      () => isOutside.value = true,
      { passive: true }
    );
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
    capture = false,
    initialValue = false,
    window = defaultWindow
  } = options;
  const pressed = vue.shallowRef(initialValue);
  const sourceType = vue.shallowRef(null);
  if (!window) {
    return {
      pressed,
      sourceType
    };
  }
  const onPressed = (srcType) => (event) => {
    var _a;
    pressed.value = true;
    sourceType.value = srcType;
    (_a = options.onPressed) == null ? void 0 : _a.call(options, event);
  };
  const onReleased = (event) => {
    var _a;
    pressed.value = false;
    sourceType.value = null;
    (_a = options.onReleased) == null ? void 0 : _a.call(options, event);
  };
  const target = vue.computed(() => unrefElement(options.target) || window);
  const listenerOptions = { passive: true, capture };
  useEventListener(target, "mousedown", onPressed("mouse"), listenerOptions);
  useEventListener(window, "mouseleave", onReleased, listenerOptions);
  useEventListener(window, "mouseup", onReleased, listenerOptions);
  if (drag) {
    useEventListener(target, "dragstart", onPressed("mouse"), listenerOptions);
    useEventListener(window, "drop", onReleased, listenerOptions);
    useEventListener(window, "dragend", onReleased, listenerOptions);
  }
  if (touch) {
    useEventListener(target, "touchstart", onPressed("touch"), listenerOptions);
    useEventListener(window, "touchend", onReleased, listenerOptions);
    useEventListener(window, "touchcancel", onReleased, listenerOptions);
  }
  return {
    pressed,
    sourceType
  };
}

function useNavigatorLanguage(options = {}) {
  const { window = defaultWindow } = options;
  const navigator = window == null ? void 0 : window.navigator;
  const isSupported = useSupported(() => navigator && "language" in navigator);
  const language = vue.shallowRef(navigator == null ? void 0 : navigator.language);
  useEventListener(window, "languagechange", () => {
    if (navigator)
      language.value = navigator.language;
  }, { passive: true });
  return {
    isSupported,
    language
  };
}

function useNetwork(options = {}) {
  const { window = defaultWindow } = options;
  const navigator = window == null ? void 0 : window.navigator;
  const isSupported = useSupported(() => navigator && "connection" in navigator);
  const isOnline = vue.shallowRef(true);
  const saveData = vue.shallowRef(false);
  const offlineAt = vue.shallowRef(void 0);
  const onlineAt = vue.shallowRef(void 0);
  const downlink = vue.shallowRef(void 0);
  const downlinkMax = vue.shallowRef(void 0);
  const rtt = vue.shallowRef(void 0);
  const effectiveType = vue.shallowRef(void 0);
  const type = vue.shallowRef("unknown");
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
  const listenerOptions = { passive: true };
  if (window) {
    useEventListener(window, "offline", () => {
      isOnline.value = false;
      offlineAt.value = Date.now();
    }, listenerOptions);
    useEventListener(window, "online", () => {
      isOnline.value = true;
      onlineAt.value = Date.now();
    }, listenerOptions);
  }
  if (connection)
    useEventListener(connection, "change", updateNetworkInformation, listenerOptions);
  updateNetworkInformation();
  return {
    isSupported,
    isOnline: vue.readonly(isOnline),
    saveData: vue.readonly(saveData),
    offlineAt: vue.readonly(offlineAt),
    onlineAt: vue.readonly(onlineAt),
    downlink: vue.readonly(downlink),
    downlinkMax: vue.readonly(downlinkMax),
    effectiveType: vue.readonly(effectiveType),
    rtt: vue.readonly(rtt),
    type: vue.readonly(type)
  };
}

function useNow(options = {}) {
  const {
    controls: exposeControls = false,
    interval = "requestAnimationFrame"
  } = options;
  const now = vue.ref(/* @__PURE__ */ new Date());
  const update = () => now.value = /* @__PURE__ */ new Date();
  const controls = interval === "requestAnimationFrame" ? useRafFn(update, { immediate: true }) : shared.useIntervalFn(update, interval, { immediate: true });
  if (exposeControls) {
    return {
      now,
      ...controls
    };
  } else {
    return now;
  }
}

function useObjectUrl(object) {
  const url = vue.shallowRef();
  const release = () => {
    if (url.value)
      URL.revokeObjectURL(url.value);
    url.value = void 0;
  };
  vue.watch(
    () => vue.toValue(object),
    (newObject) => {
      release();
      if (newObject)
        url.value = URL.createObjectURL(newObject);
    },
    { immediate: true }
  );
  shared.tryOnScopeDispose(release);
  return vue.readonly(url);
}

function useClamp(value, min, max) {
  if (typeof value === "function" || vue.isReadonly(value))
    return vue.computed(() => shared.clamp(vue.toValue(value), vue.toValue(min), vue.toValue(max)));
  const _value = vue.ref(value);
  return vue.computed({
    get() {
      return _value.value = shared.clamp(_value.value, vue.toValue(min), vue.toValue(max));
    },
    set(value2) {
      _value.value = shared.clamp(value2, vue.toValue(min), vue.toValue(max));
    }
  });
}

function useOffsetPagination(options) {
  const {
    total = Number.POSITIVE_INFINITY,
    pageSize = 10,
    page = 1,
    onPageChange = shared.noop,
    onPageSizeChange = shared.noop,
    onPageCountChange = shared.noop
  } = options;
  const currentPageSize = useClamp(pageSize, 1, Number.POSITIVE_INFINITY);
  const pageCount = vue.computed(() => Math.max(
    1,
    Math.ceil(vue.toValue(total) / vue.toValue(currentPageSize))
  ));
  const currentPage = useClamp(page, 1, pageCount);
  const isFirstPage = vue.computed(() => currentPage.value === 1);
  const isLastPage = vue.computed(() => currentPage.value === pageCount.value);
  if (vue.isRef(page)) {
    shared.syncRef(page, currentPage, {
      direction: vue.isReadonly(page) ? "ltr" : "both"
    });
  }
  if (vue.isRef(pageSize)) {
    shared.syncRef(pageSize, currentPageSize, {
      direction: vue.isReadonly(pageSize) ? "ltr" : "both"
    });
  }
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
  vue.watch(currentPage, () => {
    onPageChange(vue.reactive(returnValue));
  });
  vue.watch(currentPageSize, () => {
    onPageSizeChange(vue.reactive(returnValue));
  });
  vue.watch(pageCount, () => {
    onPageCountChange(vue.reactive(returnValue));
  });
  return returnValue;
}

function useOnline(options = {}) {
  const { isOnline } = useNetwork(options);
  return isOnline;
}

function usePageLeave(options = {}) {
  const { window = defaultWindow } = options;
  const isLeft = vue.shallowRef(false);
  const handler = (event) => {
    if (!window)
      return;
    event = event || window.event;
    const from = event.relatedTarget || event.toElement;
    isLeft.value = !from;
  };
  if (window) {
    const listenerOptions = { passive: true };
    useEventListener(window, "mouseout", handler, listenerOptions);
    useEventListener(window.document, "mouseleave", handler, listenerOptions);
    useEventListener(window.document, "mouseenter", handler, listenerOptions);
  }
  return isLeft;
}

function useScreenOrientation(options = {}) {
  const {
    window = defaultWindow
  } = options;
  const isSupported = useSupported(() => window && "screen" in window && "orientation" in window.screen);
  const screenOrientation = isSupported.value ? window.screen.orientation : {};
  const orientation = vue.ref(screenOrientation.type);
  const angle = vue.shallowRef(screenOrientation.angle || 0);
  if (isSupported.value) {
    useEventListener(window, "orientationchange", () => {
      orientation.value = screenOrientation.type;
      angle.value = screenOrientation.angle;
    }, { passive: true });
  }
  const lockOrientation = (type) => {
    if (isSupported.value && typeof screenOrientation.lock === "function")
      return screenOrientation.lock(type);
    return Promise.reject(new Error("Not supported"));
  };
  const unlockOrientation = () => {
    if (isSupported.value && typeof screenOrientation.unlock === "function")
      screenOrientation.unlock();
  };
  return {
    isSupported,
    orientation,
    angle,
    lockOrientation,
    unlockOrientation
  };
}

function useParallax(target, options = {}) {
  const {
    deviceOrientationTiltAdjust = (i) => i,
    deviceOrientationRollAdjust = (i) => i,
    mouseTiltAdjust = (i) => i,
    mouseRollAdjust = (i) => i,
    window = defaultWindow
  } = options;
  const orientation = vue.reactive(useDeviceOrientation({ window }));
  const screenOrientation = vue.reactive(useScreenOrientation({ window }));
  const {
    elementX: x,
    elementY: y,
    elementWidth: width,
    elementHeight: height
  } = useMouseInElement(target, { handleOutside: false, window });
  const source = vue.computed(() => {
    if (orientation.isSupported && (orientation.alpha != null && orientation.alpha !== 0 || orientation.gamma != null && orientation.gamma !== 0)) {
      return "deviceOrientation";
    }
    return "mouse";
  });
  const roll = vue.computed(() => {
    if (source.value === "deviceOrientation") {
      let value;
      switch (screenOrientation.orientation) {
        case "landscape-primary":
          value = orientation.gamma / 90;
          break;
        case "landscape-secondary":
          value = -orientation.gamma / 90;
          break;
        case "portrait-primary":
          value = -orientation.beta / 90;
          break;
        case "portrait-secondary":
          value = orientation.beta / 90;
          break;
        default:
          value = -orientation.beta / 90;
      }
      return deviceOrientationRollAdjust(value);
    } else {
      const value = -(y.value - height.value / 2) / height.value;
      return mouseRollAdjust(value);
    }
  });
  const tilt = vue.computed(() => {
    if (source.value === "deviceOrientation") {
      let value;
      switch (screenOrientation.orientation) {
        case "landscape-primary":
          value = orientation.beta / 90;
          break;
        case "landscape-secondary":
          value = -orientation.beta / 90;
          break;
        case "portrait-primary":
          value = orientation.gamma / 90;
          break;
        case "portrait-secondary":
          value = -orientation.gamma / 90;
          break;
        default:
          value = orientation.gamma / 90;
      }
      return deviceOrientationTiltAdjust(value);
    } else {
      const value = (x.value - width.value / 2) / width.value;
      return mouseTiltAdjust(value);
    }
  });
  return { roll, tilt, source };
}

function useParentElement(element = useCurrentElement()) {
  const parentElement = vue.shallowRef();
  const update = () => {
    const el = unrefElement(element);
    if (el)
      parentElement.value = el.parentElement;
  };
  shared.tryOnMounted(update);
  vue.watch(() => vue.toValue(element), update);
  return parentElement;
}

function usePerformanceObserver(options, callback) {
  const {
    window = defaultWindow,
    immediate = true,
    ...performanceOptions
  } = options;
  const isSupported = useSupported(() => window && "PerformanceObserver" in window);
  let observer;
  const stop = () => {
    observer == null ? void 0 : observer.disconnect();
  };
  const start = () => {
    if (isSupported.value) {
      stop();
      observer = new PerformanceObserver(callback);
      observer.observe(performanceOptions);
    }
  };
  shared.tryOnScopeDispose(stop);
  if (immediate)
    start();
  return {
    isSupported,
    start,
    stop
  };
}

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
  const isInside = vue.shallowRef(false);
  const state = vue.ref(options.initialValue || {});
  Object.assign(state.value, defaultState, state.value);
  const handler = (event) => {
    isInside.value = true;
    if (options.pointerTypes && !options.pointerTypes.includes(event.pointerType))
      return;
    state.value = shared.objectPick(event, keys, false);
  };
  if (target) {
    const listenerOptions = { passive: true };
    useEventListener(target, ["pointerdown", "pointermove", "pointerup"], handler, listenerOptions);
    useEventListener(target, "pointerleave", () => isInside.value = false, listenerOptions);
  }
  return {
    ...shared.toRefs(state),
    isInside
  };
}

function usePointerLock(target, options = {}) {
  const { document = defaultDocument } = options;
  const isSupported = useSupported(() => document && "pointerLockElement" in document);
  const element = vue.shallowRef();
  const triggerElement = vue.shallowRef();
  let targetElement;
  if (isSupported.value) {
    const listenerOptions = { passive: true };
    useEventListener(document, "pointerlockchange", () => {
      var _a;
      const currentElement = (_a = document.pointerLockElement) != null ? _a : element.value;
      if (targetElement && currentElement === targetElement) {
        element.value = document.pointerLockElement;
        if (!element.value)
          targetElement = triggerElement.value = null;
      }
    }, listenerOptions);
    useEventListener(document, "pointerlockerror", () => {
      var _a;
      const currentElement = (_a = document.pointerLockElement) != null ? _a : element.value;
      if (targetElement && currentElement === targetElement) {
        const action = document.pointerLockElement ? "release" : "acquire";
        throw new Error(`Failed to ${action} pointer lock.`);
      }
    }, listenerOptions);
  }
  async function lock(e) {
    var _a;
    if (!isSupported.value)
      throw new Error("Pointer Lock API is not supported by your browser.");
    triggerElement.value = e instanceof Event ? e.currentTarget : null;
    targetElement = e instanceof Event ? (_a = unrefElement(target)) != null ? _a : triggerElement.value : unrefElement(e);
    if (!targetElement)
      throw new Error("Target element undefined.");
    targetElement.requestPointerLock();
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

function usePointerSwipe(target, options = {}) {
  const targetRef = shared.toRef(target);
  const {
    threshold = 50,
    onSwipe,
    onSwipeEnd,
    onSwipeStart,
    disableTextSelect = false
  } = options;
  const posStart = vue.reactive({ x: 0, y: 0 });
  const updatePosStart = (x, y) => {
    posStart.x = x;
    posStart.y = y;
  };
  const posEnd = vue.reactive({ x: 0, y: 0 });
  const updatePosEnd = (x, y) => {
    posEnd.x = x;
    posEnd.y = y;
  };
  const distanceX = vue.computed(() => posStart.x - posEnd.x);
  const distanceY = vue.computed(() => posStart.y - posEnd.y);
  const { max, abs } = Math;
  const isThresholdExceeded = vue.computed(() => max(abs(distanceX.value), abs(distanceY.value)) >= threshold);
  const isSwiping = vue.shallowRef(false);
  const isPointerDown = vue.shallowRef(false);
  const direction = vue.computed(() => {
    if (!isThresholdExceeded.value)
      return "none";
    if (abs(distanceX.value) > abs(distanceY.value)) {
      return distanceX.value > 0 ? "left" : "right";
    } else {
      return distanceY.value > 0 ? "up" : "down";
    }
  });
  const eventIsAllowed = (e) => {
    var _a, _b, _c;
    const isReleasingButton = e.buttons === 0;
    const isPrimaryButton = e.buttons === 1;
    return (_c = (_b = (_a = options.pointerTypes) == null ? void 0 : _a.includes(e.pointerType)) != null ? _b : isReleasingButton || isPrimaryButton) != null ? _c : true;
  };
  const listenerOptions = { passive: true };
  const stops = [
    useEventListener(target, "pointerdown", (e) => {
      if (!eventIsAllowed(e))
        return;
      isPointerDown.value = true;
      const eventTarget = e.target;
      eventTarget == null ? void 0 : eventTarget.setPointerCapture(e.pointerId);
      const { clientX: x, clientY: y } = e;
      updatePosStart(x, y);
      updatePosEnd(x, y);
      onSwipeStart == null ? void 0 : onSwipeStart(e);
    }, listenerOptions),
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
    }, listenerOptions),
    useEventListener(target, "pointerup", (e) => {
      if (!eventIsAllowed(e))
        return;
      if (isSwiping.value)
        onSwipeEnd == null ? void 0 : onSwipeEnd(e, direction.value);
      isPointerDown.value = false;
      isSwiping.value = false;
    }, listenerOptions)
  ];
  shared.tryOnMounted(() => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    (_b = (_a = targetRef.value) == null ? void 0 : _a.style) == null ? void 0 : _b.setProperty("touch-action", "none");
    if (disableTextSelect) {
      (_d = (_c = targetRef.value) == null ? void 0 : _c.style) == null ? void 0 : _d.setProperty("-webkit-user-select", "none");
      (_f = (_e = targetRef.value) == null ? void 0 : _e.style) == null ? void 0 : _f.setProperty("-ms-user-select", "none");
      (_h = (_g = targetRef.value) == null ? void 0 : _g.style) == null ? void 0 : _h.setProperty("user-select", "none");
    }
  });
  const stop = () => stops.forEach((s) => s());
  return {
    isSwiping: vue.readonly(isSwiping),
    direction: vue.readonly(direction),
    posStart: vue.readonly(posStart),
    posEnd: vue.readonly(posEnd),
    distanceX,
    distanceY,
    stop
  };
}

function usePreferredColorScheme(options) {
  const isLight = useMediaQuery("(prefers-color-scheme: light)", options);
  const isDark = useMediaQuery("(prefers-color-scheme: dark)", options);
  return vue.computed(() => {
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
  return vue.computed(() => {
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
    return vue.ref(["en"]);
  const navigator = window.navigator;
  const value = vue.ref(navigator.languages);
  useEventListener(window, "languagechange", () => {
    value.value = navigator.languages;
  }, { passive: true });
  return value;
}

function usePreferredReducedMotion(options) {
  const isReduced = useMediaQuery("(prefers-reduced-motion: reduce)", options);
  return vue.computed(() => {
    if (isReduced.value)
      return "reduce";
    return "no-preference";
  });
}

function usePreferredReducedTransparency(options) {
  const isReduced = useMediaQuery("(prefers-reduced-transparency: reduce)", options);
  return vue.computed(() => {
    if (isReduced.value)
      return "reduce";
    return "no-preference";
  });
}

function usePrevious(value, initialValue) {
  const previous = vue.shallowRef(initialValue);
  vue.watch(
    shared.toRef(value),
    (_, oldValue) => {
      previous.value = oldValue;
    },
    { flush: "sync" }
  );
  return vue.readonly(previous);
}

const topVarName = "--vueuse-safe-area-top";
const rightVarName = "--vueuse-safe-area-right";
const bottomVarName = "--vueuse-safe-area-bottom";
const leftVarName = "--vueuse-safe-area-left";
function useScreenSafeArea() {
  const top = vue.shallowRef("");
  const right = vue.shallowRef("");
  const bottom = vue.shallowRef("");
  const left = vue.shallowRef("");
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
    useEventListener("resize", shared.useDebounceFn(update), { passive: true });
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
  const scriptTag = vue.shallowRef(null);
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
    let el = document.querySelector(`script[src="${vue.toValue(src)}"]`);
    if (!el) {
      el = document.createElement("script");
      el.type = type;
      el.async = async;
      el.src = vue.toValue(src);
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
    const listenerOptions = {
      passive: true
    };
    useEventListener(el, "error", (event) => reject(event), listenerOptions);
    useEventListener(el, "abort", (event) => reject(event), listenerOptions);
    useEventListener(el, "load", () => {
      el.setAttribute("data-loaded", "true");
      onLoaded(el);
      resolveWithElement(el);
    }, listenerOptions);
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
    const el = document.querySelector(`script[src="${vue.toValue(src)}"]`);
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
  const isLocked = vue.shallowRef(initialState);
  let stopTouchMoveListener = null;
  let initialOverflow = "";
  vue.watch(shared.toRef(element), (el) => {
    const target = resolveElement(vue.toValue(el));
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
    const el = resolveElement(vue.toValue(element));
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
    const el = resolveElement(vue.toValue(element));
    if (!el || !isLocked.value)
      return;
    if (shared.isIOS)
      stopTouchMoveListener == null ? void 0 : stopTouchMoveListener();
    el.style.overflow = initialOverflow;
    elInitialOverflow.delete(el);
    isLocked.value = false;
  };
  shared.tryOnScopeDispose(unlock);
  return vue.computed({
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

function useSessionStorage(key, initialValue, options = {}) {
  const { window = defaultWindow } = options;
  return useStorage(key, initialValue, window == null ? void 0 : window.sessionStorage, options);
}

function useShare(shareOptions = {}, options = {}) {
  const { navigator = defaultNavigator } = options;
  const _navigator = navigator;
  const isSupported = useSupported(() => _navigator && "canShare" in _navigator);
  const share = async (overrideOptions = {}) => {
    if (isSupported.value) {
      const data = {
        ...vue.toValue(shareOptions),
        ...vue.toValue(overrideOptions)
      };
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
    return vue.computed(() => sortFn([...vue.toValue(source)], compareFn));
  vue.watchEffect(() => {
    const result = sortFn(vue.toValue(source), compareFn);
    if (vue.isRef(source))
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
    maxAlternatives = 1,
    window = defaultWindow
  } = options;
  const lang = shared.toRef(options.lang || "en-US");
  const isListening = vue.shallowRef(false);
  const isFinal = vue.shallowRef(false);
  const result = vue.shallowRef("");
  const error = vue.shallowRef(void 0);
  let recognition;
  const start = () => {
    isListening.value = true;
  };
  const stop = () => {
    isListening.value = false;
  };
  const toggle = (value = !isListening.value) => {
    if (value) {
      start();
    } else {
      stop();
    }
  };
  const SpeechRecognition = window && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSupported = useSupported(() => SpeechRecognition);
  if (isSupported.value) {
    recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = vue.toValue(lang);
    recognition.maxAlternatives = maxAlternatives;
    recognition.onstart = () => {
      isListening.value = true;
      isFinal.value = false;
    };
    vue.watch(lang, (lang2) => {
      if (recognition && !isListening.value)
        recognition.lang = lang2;
    });
    recognition.onresult = (event) => {
      const currentResult = event.results[event.resultIndex];
      const { transcript } = currentResult[0];
      isFinal.value = currentResult.isFinal;
      result.value = transcript;
      error.value = void 0;
    };
    recognition.onerror = (event) => {
      error.value = event;
    };
    recognition.onend = () => {
      isListening.value = false;
      recognition.lang = vue.toValue(lang);
    };
    vue.watch(isListening, (newValue, oldValue) => {
      if (newValue === oldValue)
        return;
      if (newValue)
        recognition.start();
      else
        recognition.stop();
    });
  }
  shared.tryOnScopeDispose(() => {
    stop();
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
  const isPlaying = vue.shallowRef(false);
  const status = vue.shallowRef("init");
  const spokenText = shared.toRef(text || "");
  const lang = shared.toRef(options.lang || "en-US");
  const error = vue.shallowRef(void 0);
  const toggle = (value = !isPlaying.value) => {
    isPlaying.value = value;
  };
  const bindEventsForUtterance = (utterance2) => {
    utterance2.lang = vue.toValue(lang);
    utterance2.voice = vue.toValue(options.voice) || null;
    utterance2.pitch = vue.toValue(pitch);
    utterance2.rate = vue.toValue(rate);
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
  const utterance = vue.computed(() => {
    isPlaying.value = false;
    status.value = "init";
    const newUtterance = new SpeechSynthesisUtterance(spokenText.value);
    bindEventsForUtterance(newUtterance);
    return newUtterance;
  });
  const speak = () => {
    synth.cancel();
    if (utterance)
      synth.speak(utterance.value);
  };
  const stop = () => {
    synth.cancel();
    isPlaying.value = false;
  };
  if (isSupported.value) {
    bindEventsForUtterance(utterance.value);
    vue.watch(lang, (lang2) => {
      if (utterance.value && !isPlaying.value)
        utterance.value.lang = lang2;
    });
    if (options.voice) {
      vue.watch(options.voice, () => {
        synth.cancel();
      });
    }
    vue.watch(isPlaying, () => {
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
  const stepsRef = vue.ref(steps);
  const stepNames = vue.computed(() => Array.isArray(stepsRef.value) ? stepsRef.value : Object.keys(stepsRef.value));
  const index = vue.ref(stepNames.value.indexOf(initialStep != null ? initialStep : stepNames.value[0]));
  const current = vue.computed(() => at(index.value));
  const isFirst = vue.computed(() => index.value === 0);
  const isLast = vue.computed(() => index.value === stepNames.value.length - 1);
  const next = vue.computed(() => stepNames.value[index.value + 1]);
  const previous = vue.computed(() => stepNames.value[index.value - 1]);
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
  const rawInit = vue.toValue(initialValue);
  const type = guessSerializerType(rawInit);
  const data = (shallow ? vue.shallowRef : vue.ref)(vue.toValue(initialValue));
  const serializer = (_a = options.serializer) != null ? _a : StorageSerializers[type];
  if (!storage) {
    try {
      storage = getSSRHandler("getDefaultStorageAsync", () => {
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
        if (typeof mergeDefaults === "function")
          data.value = mergeDefaults(value, rawInit);
        else if (type === "object" && !Array.isArray(value))
          data.value = { ...rawInit, ...value };
        else data.value = value;
      } else {
        data.value = await serializer.read(rawValue);
      }
    } catch (e) {
      onError(e);
    }
  }
  read();
  if (window && listenToStorageChanges)
    useEventListener(window, "storage", (e) => Promise.resolve().then(() => read(e)), { passive: true });
  if (storage) {
    shared.watchWithFilter(
      data,
      async () => {
        try {
          if (data.value == null)
            await storage.removeItem(key);
          else
            await storage.setItem(key, await serializer.write(data.value));
        } catch (e) {
          onError(e);
        }
      },
      {
        flush,
        deep,
        eventFilter
      }
    );
  }
  return data;
}

let _id = 0;
function useStyleTag(css, options = {}) {
  const isLoaded = vue.shallowRef(false);
  const {
    document = defaultDocument,
    immediate = true,
    manual = false,
    id = `vueuse_styletag_${++_id}`
  } = options;
  const cssRef = vue.shallowRef(css);
  let stop = () => {
  };
  const load = () => {
    if (!document)
      return;
    const el = document.getElementById(id) || document.createElement("style");
    if (!el.isConnected) {
      el.id = id;
      if (options.media)
        el.media = options.media;
      document.head.appendChild(el);
    }
    if (isLoaded.value)
      return;
    stop = vue.watch(
      cssRef,
      (value) => {
        el.textContent = value;
      },
      { immediate: true }
    );
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
    isLoaded: vue.readonly(isLoaded)
  };
}

function useSwipe(target, options = {}) {
  const {
    threshold = 50,
    onSwipe,
    onSwipeEnd,
    onSwipeStart,
    passive = true
  } = options;
  const coordsStart = vue.reactive({ x: 0, y: 0 });
  const coordsEnd = vue.reactive({ x: 0, y: 0 });
  const diffX = vue.computed(() => coordsStart.x - coordsEnd.x);
  const diffY = vue.computed(() => coordsStart.y - coordsEnd.y);
  const { max, abs } = Math;
  const isThresholdExceeded = vue.computed(() => max(abs(diffX.value), abs(diffY.value)) >= threshold);
  const isSwiping = vue.shallowRef(false);
  const direction = vue.computed(() => {
    if (!isThresholdExceeded.value)
      return "none";
    if (abs(diffX.value) > abs(diffY.value)) {
      return diffX.value > 0 ? "left" : "right";
    } else {
      return diffY.value > 0 ? "up" : "down";
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
  const listenerOptions = { passive, capture: !passive };
  const onTouchEnd = (e) => {
    if (isSwiping.value)
      onSwipeEnd == null ? void 0 : onSwipeEnd(e, direction.value);
    isSwiping.value = false;
  };
  const stops = [
    useEventListener(target, "touchstart", (e) => {
      if (e.touches.length !== 1)
        return;
      const [x, y] = getTouchEventCoords(e);
      updateCoordsStart(x, y);
      updateCoordsEnd(x, y);
      onSwipeStart == null ? void 0 : onSwipeStart(e);
    }, listenerOptions),
    useEventListener(target, "touchmove", (e) => {
      if (e.touches.length !== 1)
        return;
      const [x, y] = getTouchEventCoords(e);
      updateCoordsEnd(x, y);
      if (listenerOptions.capture && !listenerOptions.passive && Math.abs(diffX.value) > Math.abs(diffY.value))
        e.preventDefault();
      if (!isSwiping.value && isThresholdExceeded.value)
        isSwiping.value = true;
      if (isSwiping.value)
        onSwipe == null ? void 0 : onSwipe(e);
    }, listenerOptions),
    useEventListener(target, ["touchend", "touchcancel"], onTouchEnd, listenerOptions)
  ];
  const stop = () => stops.forEach((s) => s());
  return {
    isSwiping,
    direction,
    coordsStart,
    coordsEnd,
    lengthX: diffX,
    lengthY: diffY,
    stop,
    // TODO: Remove in the next major version
    isPassiveEventSupported: true
  };
}

function useTemplateRefsList() {
  const refs = vue.ref([]);
  refs.value.set = (el) => {
    if (el)
      refs.value.push(el);
  };
  vue.onBeforeUpdate(() => {
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
  const dir = vue.ref(getValue());
  shared.tryOnMounted(() => dir.value = getValue());
  if (observe && document) {
    useMutationObserver(
      document.querySelector(selector),
      () => dir.value = getValue(),
      { attributes: true }
    );
  }
  return vue.computed({
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
  return Array.from({ length: rangeCount }, (_, i) => selection.getRangeAt(i));
}
function useTextSelection(options = {}) {
  const {
    window = defaultWindow
  } = options;
  const selection = vue.ref(null);
  const text = vue.computed(() => {
    var _a, _b;
    return (_b = (_a = selection.value) == null ? void 0 : _a.toString()) != null ? _b : "";
  });
  const ranges = vue.computed(() => selection.value ? getRangesFromSelection(selection.value) : []);
  const rects = vue.computed(() => ranges.value.map((range) => range.getBoundingClientRect()));
  function onSelectionChange() {
    selection.value = null;
    if (window)
      selection.value = window.getSelection();
  }
  if (window)
    useEventListener(window.document, "selectionchange", onSelectionChange, { passive: true });
  return {
    text,
    rects,
    ranges,
    selection
  };
}

function tryRequestAnimationFrame(window = defaultWindow, fn) {
  if (window && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(fn);
  } else {
    fn();
  }
}
function useTextareaAutosize(options = {}) {
  var _a, _b;
  const { window = defaultWindow } = options;
  const textarea = shared.toRef(options == null ? void 0 : options.element);
  const input = shared.toRef((_a = options == null ? void 0 : options.input) != null ? _a : "");
  const styleProp = (_b = options == null ? void 0 : options.styleProp) != null ? _b : "height";
  const textareaScrollHeight = vue.shallowRef(1);
  const textareaOldWidth = vue.shallowRef(0);
  function triggerResize() {
    var _a2;
    if (!textarea.value)
      return;
    let height = "";
    textarea.value.style[styleProp] = "1px";
    textareaScrollHeight.value = (_a2 = textarea.value) == null ? void 0 : _a2.scrollHeight;
    const _styleTarget = vue.toValue(options == null ? void 0 : options.styleTarget);
    if (_styleTarget)
      _styleTarget.style[styleProp] = `${textareaScrollHeight.value}px`;
    else
      height = `${textareaScrollHeight.value}px`;
    textarea.value.style[styleProp] = height;
  }
  vue.watch([input, textarea], () => vue.nextTick(triggerResize), { immediate: true });
  vue.watch(textareaScrollHeight, () => {
    var _a2;
    return (_a2 = options == null ? void 0 : options.onResize) == null ? void 0 : _a2.call(options);
  });
  useResizeObserver(textarea, ([{ contentRect }]) => {
    if (textareaOldWidth.value === contentRect.width)
      return;
    tryRequestAnimationFrame(window, () => {
      textareaOldWidth.value = contentRect.width;
      triggerResize();
    });
  });
  if (options == null ? void 0 : options.watch)
    vue.watch(options.watch, triggerResize, { immediate: true, deep: true });
  return {
    textarea,
    input,
    triggerResize
  };
}

function useThrottledRefHistory(source, options = {}) {
  const { throttle = 200, trailing = true } = options;
  const filter = shared.throttleFilter(throttle, trailing);
  const history = useRefHistory(source, { ...options, eventFilter: filter });
  return {
    ...history
  };
}

const DEFAULT_UNITS = [
  { max: 6e4, value: 1e3, name: "second" },
  { max: 276e4, value: 6e4, name: "minute" },
  { max: 72e6, value: 36e5, name: "hour" },
  { max: 5184e5, value: 864e5, name: "day" },
  { max: 24192e5, value: 6048e5, name: "week" },
  { max: 28512e6, value: 2592e6, name: "month" },
  { max: Number.POSITIVE_INFINITY, value: 31536e6, name: "year" }
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
function DEFAULT_FORMATTER(date) {
  return date.toISOString().slice(0, 10);
}
function useTimeAgo(time, options = {}) {
  const {
    controls: exposeControls = false,
    updateInterval = 3e4
  } = options;
  const { now, ...controls } = useNow({ interval: updateInterval, controls: true });
  const timeAgo = vue.computed(() => formatTimeAgo(new Date(vue.toValue(time)), options, vue.toValue(now)));
  if (exposeControls) {
    return {
      timeAgo,
      ...controls
    };
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

function useTimeoutPoll(fn, interval, options = {}) {
  const {
    immediate = true,
    immediateCallback = false
  } = options;
  const { start } = shared.useTimeoutFn(loop, interval, { immediate });
  const isActive = vue.shallowRef(false);
  async function loop() {
    if (!isActive.value)
      return;
    await fn();
    start();
  }
  function resume() {
    if (!isActive.value) {
      isActive.value = true;
      if (immediateCallback)
        fn();
      start();
    }
  }
  function pause() {
    isActive.value = false;
  }
  if (immediate && shared.isClient)
    resume();
  shared.tryOnScopeDispose(pause);
  return {
    isActive,
    pause,
    resume
  };
}

function useTimestamp(options = {}) {
  const {
    controls: exposeControls = false,
    offset = 0,
    immediate = true,
    interval = "requestAnimationFrame",
    callback
  } = options;
  const ts = vue.shallowRef(shared.timestamp() + offset);
  const update = () => ts.value = shared.timestamp() + offset;
  const cb = callback ? () => {
    update();
    callback(ts.value);
  } : update;
  const controls = interval === "requestAnimationFrame" ? useRafFn(cb, { immediate }) : shared.useIntervalFn(cb, interval, { immediate });
  if (exposeControls) {
    return {
      timestamp: ts,
      ...controls
    };
  } else {
    return ts;
  }
}

function useTitle(newTitle = null, options = {}) {
  var _a, _b, _c;
  const {
    document = defaultDocument,
    restoreOnUnmount = (t) => t
  } = options;
  const originalTitle = (_a = document == null ? void 0 : document.title) != null ? _a : "";
  const title = shared.toRef((_b = newTitle != null ? newTitle : document == null ? void 0 : document.title) != null ? _b : null);
  const isReadonly = !!(newTitle && typeof newTitle === "function");
  function format(t) {
    if (!("titleTemplate" in options))
      return t;
    const template = options.titleTemplate || "%s";
    return typeof template === "function" ? template(t) : vue.toValue(template).replace(/%s/g, t);
  }
  vue.watch(
    title,
    (newValue, oldValue) => {
      if (newValue !== oldValue && document)
        document.title = format(newValue != null ? newValue : "");
    },
    { immediate: true }
  );
  if (options.observe && !options.titleTemplate && document && !isReadonly) {
    useMutationObserver(
      (_c = document.head) == null ? void 0 : _c.querySelector("title"),
      () => {
        if (document && document.title !== title.value)
          title.value = format(document.title);
      },
      { childList: true }
    );
  }
  shared.tryOnScopeDispose(() => {
    if (restoreOnUnmount) {
      const restoredTitle = restoreOnUnmount(originalTitle, title.value || "");
      if (restoredTitle != null && document)
        document.title = restoredTitle;
    }
  });
  return title;
}

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
const TransitionPresets = /* @__PURE__ */ Object.assign({}, { linear: shared.identity }, _TransitionPresets);
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
function lerp(a, b, alpha) {
  return a + alpha * (b - a);
}
function toVec(t) {
  return (typeof t === "number" ? [t] : t) || [];
}
function executeTransition(source, from, to, options = {}) {
  var _a, _b;
  const fromVal = vue.toValue(from);
  const toVal = vue.toValue(to);
  const v1 = toVec(fromVal);
  const v2 = toVec(toVal);
  const duration = (_a = vue.toValue(options.duration)) != null ? _a : 1e3;
  const startedAt = Date.now();
  const endAt = Date.now() + duration;
  const trans = typeof options.transition === "function" ? options.transition : (_b = vue.toValue(options.transition)) != null ? _b : shared.identity;
  const ease = typeof trans === "function" ? trans : createEasingFunction(trans);
  return new Promise((resolve) => {
    source.value = fromVal;
    const tick = () => {
      var _a2;
      if ((_a2 = options.abort) == null ? void 0 : _a2.call(options)) {
        resolve();
        return;
      }
      const now = Date.now();
      const alpha = ease((now - startedAt) / duration);
      const arr = toVec(source.value).map((n, i) => lerp(v1[i], v2[i], alpha));
      if (Array.isArray(source.value))
        source.value = arr.map((n, i) => {
          var _a3, _b2;
          return lerp((_a3 = v1[i]) != null ? _a3 : 0, (_b2 = v2[i]) != null ? _b2 : 0, alpha);
        });
      else if (typeof source.value === "number")
        source.value = arr[0];
      if (now < endAt) {
        requestAnimationFrame(tick);
      } else {
        source.value = toVal;
        resolve();
      }
    };
    tick();
  });
}
function useTransition(source, options = {}) {
  let currentId = 0;
  const sourceVal = () => {
    const v = vue.toValue(source);
    return typeof v === "number" ? v : v.map(vue.toValue);
  };
  const outputRef = vue.ref(sourceVal());
  vue.watch(sourceVal, async (to) => {
    var _a, _b;
    if (vue.toValue(options.disabled))
      return;
    const id = ++currentId;
    if (options.delay)
      await shared.promiseTimeout(vue.toValue(options.delay));
    if (id !== currentId)
      return;
    const toVal = Array.isArray(to) ? to.map(vue.toValue) : vue.toValue(to);
    (_a = options.onStarted) == null ? void 0 : _a.call(options);
    await executeTransition(outputRef, outputRef.value, toVal, {
      ...options,
      abort: () => {
        var _a2;
        return id !== currentId || ((_a2 = options.abort) == null ? void 0 : _a2.call(options));
      }
    });
    (_b = options.onFinished) == null ? void 0 : _b.call(options);
  }, { deep: true });
  vue.watch(() => vue.toValue(options.disabled), (disabled) => {
    if (disabled) {
      currentId++;
      outputRef.value = sourceVal();
    }
  });
  shared.tryOnScopeDispose(() => {
    currentId++;
  });
  return vue.computed(() => vue.toValue(options.disabled) ? sourceVal() : outputRef.value);
}

function useUrlSearchParams(mode = "history", options = {}) {
  const {
    initialValue = {},
    removeNullishValues = true,
    removeFalsyValues = false,
    write: enableWrite = true,
    writeMode = "replace",
    window = defaultWindow
  } = options;
  if (!window)
    return vue.reactive(initialValue);
  const state = vue.reactive({});
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
      return `${window.location.search || ""}${hash.slice(0, index)}${stringified ? `?${stringified}` : ""}`;
    return `${window.location.search || ""}${hash}${stringified ? `?${stringified}` : ""}`;
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
  const { pause, resume } = shared.pausableWatch(
    state,
    () => {
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
      write(params, false);
    },
    { deep: true }
  );
  function write(params, shouldUpdate) {
    pause();
    if (shouldUpdate)
      updateState(params);
    if (writeMode === "replace") {
      window.history.replaceState(
        window.history.state,
        window.document.title,
        window.location.pathname + constructQuery(params)
      );
    } else {
      window.history.pushState(
        window.history.state,
        window.document.title,
        window.location.pathname + constructQuery(params)
      );
    }
    resume();
  }
  function onChanged() {
    if (!enableWrite)
      return;
    write(read(), true);
  }
  const listenerOptions = { passive: true };
  useEventListener(window, "popstate", onChanged, listenerOptions);
  if (mode !== "history")
    useEventListener(window, "hashchange", onChanged, listenerOptions);
  const initial = read();
  if (initial.keys().next().value)
    updateState(initial);
  else
    Object.assign(state, initialValue);
  return state;
}

function useUserMedia(options = {}) {
  var _a, _b;
  const enabled = vue.shallowRef((_a = options.enabled) != null ? _a : false);
  const autoSwitch = vue.shallowRef((_b = options.autoSwitch) != null ? _b : true);
  const constraints = vue.ref(options.constraints);
  const { navigator = defaultNavigator } = options;
  const isSupported = useSupported(() => {
    var _a2;
    return (_a2 = navigator == null ? void 0 : navigator.mediaDevices) == null ? void 0 : _a2.getUserMedia;
  });
  const stream = vue.shallowRef();
  function getDeviceOptions(type) {
    switch (type) {
      case "video": {
        if (constraints.value)
          return constraints.value.video || false;
        break;
      }
      case "audio": {
        if (constraints.value)
          return constraints.value.audio || false;
        break;
      }
    }
  }
  async function _start() {
    if (!isSupported.value || stream.value)
      return;
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: getDeviceOptions("video"),
      audio: getDeviceOptions("audio")
    });
    return stream.value;
  }
  function _stop() {
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
  vue.watch(
    enabled,
    (v) => {
      if (v)
        _start();
      else _stop();
    },
    { immediate: true }
  );
  vue.watch(
    constraints,
    () => {
      if (autoSwitch.value && stream.value)
        restart();
    },
    { immediate: true }
  );
  shared.tryOnScopeDispose(() => {
    stop();
  });
  return {
    isSupported,
    stream,
    start,
    stop,
    restart,
    constraints,
    enabled,
    autoSwitch
  };
}

function useVModel(props, key, emit, options = {}) {
  var _a, _b, _c;
  const {
    clone = false,
    passive = false,
    eventName,
    deep = false,
    defaultValue,
    shouldEmit
  } = options;
  const vm = vue.getCurrentInstance();
  const _emit = emit || (vm == null ? void 0 : vm.emit) || ((_a = vm == null ? void 0 : vm.$emit) == null ? void 0 : _a.bind(vm)) || ((_c = (_b = vm == null ? void 0 : vm.proxy) == null ? void 0 : _b.$emit) == null ? void 0 : _c.bind(vm == null ? void 0 : vm.proxy));
  let event = eventName;
  if (!key) {
    key = "modelValue";
  }
  event = event || `update:${key.toString()}`;
  const cloneFn = (val) => !clone ? val : typeof clone === "function" ? clone(val) : cloneFnJSON(val);
  const getValue = () => shared.isDef(props[key]) ? cloneFn(props[key]) : defaultValue;
  const triggerEmit = (value) => {
    if (shouldEmit) {
      if (shouldEmit(value))
        _emit(event, value);
    } else {
      _emit(event, value);
    }
  };
  if (passive) {
    const initialValue = getValue();
    const proxy = vue.ref(initialValue);
    let isUpdating = false;
    vue.watch(
      () => props[key],
      (v) => {
        if (!isUpdating) {
          isUpdating = true;
          proxy.value = cloneFn(v);
          vue.nextTick(() => isUpdating = false);
        }
      }
    );
    vue.watch(
      proxy,
      (v) => {
        if (!isUpdating && (v !== props[key] || deep))
          triggerEmit(v);
      },
      { deep }
    );
    return proxy;
  } else {
    return vue.computed({
      get() {
        return getValue();
      },
      set(value) {
        triggerEmit(value);
      }
    });
  }
}

function useVModels(props, emit, options = {}) {
  const ret = {};
  for (const key in props) {
    ret[key] = useVModel(
      props,
      key,
      emit,
      options
    );
  }
  return ret;
}

function useVibrate(options) {
  const {
    pattern = [],
    interval = 0,
    navigator = defaultNavigator
  } = options || {};
  const isSupported = useSupported(() => typeof navigator !== "undefined" && "vibrate" in navigator);
  const patternRef = shared.toRef(pattern);
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
    intervalControls = shared.useIntervalFn(
      vibrate,
      interval,
      {
        immediate: false,
        immediateCallback: false
      }
    );
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
  const containerRef = vue.shallowRef(null);
  const size = useElementSize(containerRef);
  const currentList = vue.ref([]);
  const source = vue.shallowRef(list);
  const state = vue.ref({ start: 0, end: 10 });
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
function useWatchForSizes(size, list, containerRef, calculateRange) {
  vue.watch([size.width, size.height, list, containerRef], () => {
    calculateRange();
  });
}
function createComputedTotalSize(itemSize, source) {
  return vue.computed(() => {
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
  const offsetLeft = vue.computed(() => getDistanceLeft(state.value.start));
  const totalWidth = createComputedTotalSize(itemWidth, source);
  useWatchForSizes(size, list, containerRef, calculateRange);
  const scrollTo = createScrollTo("horizontal", calculateRange, getDistanceLeft, containerRef);
  const wrapperProps = vue.computed(() => {
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
  const offsetTop = vue.computed(() => getDistanceTop(state.value.start));
  const totalHeight = createComputedTotalSize(itemHeight, source);
  useWatchForSizes(size, list, containerRef, calculateRange);
  const scrollTo = createScrollTo("vertical", calculateRange, getDistanceTop, containerRef);
  const wrapperProps = vue.computed(() => {
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

function useWakeLock(options = {}) {
  const {
    navigator = defaultNavigator,
    document = defaultDocument
  } = options;
  const requestedType = vue.shallowRef(false);
  const sentinel = vue.shallowRef(null);
  const documentVisibility = useDocumentVisibility({ document });
  const isSupported = useSupported(() => navigator && "wakeLock" in navigator);
  const isActive = vue.computed(() => !!sentinel.value && documentVisibility.value === "visible");
  if (isSupported.value) {
    useEventListener(sentinel, "release", () => {
      var _a, _b;
      requestedType.value = (_b = (_a = sentinel.value) == null ? void 0 : _a.type) != null ? _b : false;
    }, { passive: true });
    shared.whenever(
      () => documentVisibility.value === "visible" && (document == null ? void 0 : document.visibilityState) === "visible" && requestedType.value,
      (type) => {
        requestedType.value = false;
        forceRequest(type);
      }
    );
  }
  async function forceRequest(type) {
    var _a;
    await ((_a = sentinel.value) == null ? void 0 : _a.release());
    sentinel.value = isSupported.value ? await navigator.wakeLock.request(type) : null;
  }
  async function request(type) {
    if (documentVisibility.value === "visible")
      await forceRequest(type);
    else
      requestedType.value = type;
  }
  async function release() {
    requestedType.value = false;
    const s = sentinel.value;
    sentinel.value = null;
    await (s == null ? void 0 : s.release());
  }
  return {
    sentinel,
    isSupported,
    isActive,
    request,
    forceRequest,
    release
  };
}

function useWebNotification(options = {}) {
  const {
    window = defaultWindow,
    requestPermissions: _requestForPermissions = true
  } = options;
  const defaultWebNotificationOptions = options;
  const isSupported = useSupported(() => {
    if (!window || !("Notification" in window))
      return false;
    if (Notification.permission === "granted")
      return true;
    try {
      const notification2 = new Notification("");
      notification2.onshow = () => {
        notification2.close();
      };
    } catch (e) {
      if (e.name === "TypeError")
        return false;
    }
    return true;
  });
  const permissionGranted = vue.shallowRef(isSupported.value && "permission" in Notification && Notification.permission === "granted");
  const notification = vue.ref(null);
  const ensurePermissions = async () => {
    if (!isSupported.value)
      return;
    if (!permissionGranted.value && Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      if (result === "granted")
        permissionGranted.value = true;
    }
    return permissionGranted.value;
  };
  const { on: onClick, trigger: clickTrigger } = shared.createEventHook();
  const { on: onShow, trigger: showTrigger } = shared.createEventHook();
  const { on: onError, trigger: errorTrigger } = shared.createEventHook();
  const { on: onClose, trigger: closeTrigger } = shared.createEventHook();
  const show = async (overrides) => {
    if (!isSupported.value || !permissionGranted.value)
      return;
    const options2 = Object.assign({}, defaultWebNotificationOptions, overrides);
    notification.value = new Notification(options2.title || "", options2);
    notification.value.onclick = clickTrigger;
    notification.value.onshow = showTrigger;
    notification.value.onerror = errorTrigger;
    notification.value.onclose = closeTrigger;
    return notification.value;
  };
  const close = () => {
    if (notification.value)
      notification.value.close();
    notification.value = null;
  };
  if (_requestForPermissions)
    shared.tryOnMounted(ensurePermissions);
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
    ensurePermissions,
    permissionGranted,
    show,
    close,
    onClick,
    onShow,
    onError,
    onClose
  };
}

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
    autoConnect = true,
    autoClose = true,
    protocols = []
  } = options;
  const data = vue.ref(null);
  const status = vue.shallowRef("CLOSED");
  const wsRef = vue.ref();
  const urlRef = shared.toRef(url);
  let heartbeatPause;
  let heartbeatResume;
  let explicitlyClosed = false;
  let retried = 0;
  let bufferedData = [];
  let retryTimeout;
  let pongTimeoutWait;
  const _sendBuffer = () => {
    if (bufferedData.length && wsRef.value && status.value === "OPEN") {
      for (const buffer of bufferedData)
        wsRef.value.send(buffer);
      bufferedData = [];
    }
  };
  const resetRetry = () => {
    if (retryTimeout != null) {
      clearTimeout(retryTimeout);
      retryTimeout = void 0;
    }
  };
  const resetHeartbeat = () => {
    clearTimeout(pongTimeoutWait);
    pongTimeoutWait = void 0;
  };
  const close = (code = 1e3, reason) => {
    resetRetry();
    if (!shared.isClient && !shared.isWorker || !wsRef.value)
      return;
    explicitlyClosed = true;
    resetHeartbeat();
    heartbeatPause == null ? void 0 : heartbeatPause();
    wsRef.value.close(code, reason);
    wsRef.value = void 0;
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
      retried = 0;
      onConnected == null ? void 0 : onConnected(ws);
      heartbeatResume == null ? void 0 : heartbeatResume();
      _sendBuffer();
    };
    ws.onclose = (ev) => {
      status.value = "CLOSED";
      resetHeartbeat();
      heartbeatPause == null ? void 0 : heartbeatPause();
      onDisconnected == null ? void 0 : onDisconnected(ws, ev);
      if (!explicitlyClosed && options.autoReconnect && (wsRef.value == null || ws === wsRef.value)) {
        const {
          retries = -1,
          delay = 1e3,
          onFailed
        } = resolveNestedOptions(options.autoReconnect);
        const checkRetires = typeof retries === "function" ? retries : () => typeof retries === "number" && (retries < 0 || retried < retries);
        if (checkRetires(retried)) {
          retried += 1;
          retryTimeout = setTimeout(_init, delay);
        } else {
          onFailed == null ? void 0 : onFailed();
        }
      }
    };
    ws.onerror = (e) => {
      onError == null ? void 0 : onError(ws, e);
    };
    ws.onmessage = (e) => {
      if (options.heartbeat) {
        resetHeartbeat();
        const {
          message = DEFAULT_PING_MESSAGE,
          responseMessage = message
        } = resolveNestedOptions(options.heartbeat);
        if (e.data === vue.toValue(responseMessage))
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
    const { pause, resume } = shared.useIntervalFn(
      () => {
        send(vue.toValue(message), false);
        if (pongTimeoutWait != null)
          return;
        pongTimeoutWait = setTimeout(() => {
          close();
          explicitlyClosed = false;
        }, pongTimeout);
      },
      interval,
      { immediate: false }
    );
    heartbeatPause = pause;
    heartbeatResume = resume;
  }
  if (autoClose) {
    if (shared.isClient)
      useEventListener("beforeunload", () => close(), { passive: true });
    shared.tryOnScopeDispose(close);
  }
  const open = () => {
    if (!shared.isClient && !shared.isWorker)
      return;
    close();
    explicitlyClosed = false;
    retried = 0;
    _init();
  };
  if (immediate)
    open();
  if (autoConnect)
    vue.watch(urlRef, open);
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
  const data = vue.ref(null);
  const worker = vue.shallowRef();
  const post = (...args) => {
    if (!worker.value)
      return;
    worker.value.postMessage(...args);
  };
  const terminate = function terminate2() {
    if (!worker.value)
      return;
    worker.value.terminate();
  };
  if (window) {
    if (typeof arg0 === "string")
      worker.value = new Worker(arg0, workerOptions);
    else if (typeof arg0 === "function")
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

function depsParser(deps, localDeps) {
  if (deps.length === 0 && localDeps.length === 0)
    return "";
  const depsString = deps.map((dep) => `'${dep}'`).toString();
  const depsFunctionString = localDeps.filter((dep) => typeof dep === "function").map((fn) => {
    const str = fn.toString();
    if (str.trim().startsWith("function")) {
      return str;
    } else {
      const name = fn.name;
      return `const ${name} = ${str}`;
    }
  }).join(";");
  const importString = `importScripts(${depsString});`;
  return `${depsString.trim() === "" ? "" : importString} ${depsFunctionString}`;
}

function jobRunner(userFunc) {
  return (e) => {
    const userFuncArgs = e.data[0];
    return Promise.resolve(userFunc.apply(void 0, userFuncArgs)).then((result) => {
      postMessage(["SUCCESS", result]);
    }).catch((error) => {
      postMessage(["ERROR", error]);
    });
  };
}

function createWorkerBlobUrl(fn, deps, localDeps) {
  const blobCode = `${depsParser(deps, localDeps)}; onmessage=(${jobRunner})(${fn})`;
  const blob = new Blob([blobCode], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  return url;
}

function useWebWorkerFn(fn, options = {}) {
  const {
    dependencies = [],
    localDependencies = [],
    timeout,
    window = defaultWindow
  } = options;
  const worker = vue.ref();
  const workerStatus = vue.shallowRef("PENDING");
  const promise = vue.ref({});
  const timeoutId = vue.shallowRef();
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
    const blobUrl = createWorkerBlobUrl(fn, dependencies, localDependencies);
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
      e.preventDefault();
      reject(e);
      workerTerminate("ERROR");
    };
    if (timeout) {
      timeoutId.value = setTimeout(
        () => workerTerminate("TIMEOUT_EXPIRED"),
        timeout
      );
    }
    return newWorker;
  };
  const callWorker = (...fnArgs) => new Promise((resolve, reject) => {
    var _a;
    promise.value = {
      resolve,
      reject
    };
    (_a = worker.value) == null ? void 0 : _a.postMessage([[...fnArgs]]);
    workerStatus.value = "RUNNING";
  });
  const workerFn = (...fnArgs) => {
    if (workerStatus.value === "RUNNING") {
      console.error(
        "[useWebWorkerFn] You can only run one instance of the worker at a time."
      );
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
}

function useWindowFocus(options = {}) {
  const { window = defaultWindow } = options;
  if (!window)
    return vue.shallowRef(false);
  const focused = vue.shallowRef(window.document.hasFocus());
  const listenerOptions = { passive: true };
  useEventListener(window, "blur", () => {
    focused.value = false;
  }, listenerOptions);
  useEventListener(window, "focus", () => {
    focused.value = true;
  }, listenerOptions);
  return focused;
}

function useWindowScroll(options = {}) {
  const { window = defaultWindow, ...rest } = options;
  return useScroll(window, rest);
}

function useWindowSize(options = {}) {
  const {
    window = defaultWindow,
    initialWidth = Number.POSITIVE_INFINITY,
    initialHeight = Number.POSITIVE_INFINITY,
    listenOrientation = true,
    includeScrollbar = true,
    type = "inner"
  } = options;
  const width = vue.shallowRef(initialWidth);
  const height = vue.shallowRef(initialHeight);
  const update = () => {
    if (window) {
      if (type === "outer") {
        width.value = window.outerWidth;
        height.value = window.outerHeight;
      } else if (type === "visual" && window.visualViewport) {
        const { width: visualViewportWidth, height: visualViewportHeight, scale } = window.visualViewport;
        width.value = Math.round(visualViewportWidth * scale);
        height.value = Math.round(visualViewportHeight * scale);
      } else if (includeScrollbar) {
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
  const listenerOptions = { passive: true };
  useEventListener("resize", update, listenerOptions);
  if (window && type === "visual" && window.visualViewport) {
    useEventListener(window.visualViewport, "resize", update, listenerOptions);
  }
  if (listenOrientation) {
    const matches = useMediaQuery("(orientation: portrait)");
    vue.watch(matches, () => update());
  }
  return { width, height };
}

exports.DefaultMagicKeysAliasMap = DefaultMagicKeysAliasMap;
exports.StorageSerializers = StorageSerializers;
exports.TransitionPresets = TransitionPresets;
exports.asyncComputed = computedAsync;
exports.breakpointsAntDesign = breakpointsAntDesign;
exports.breakpointsBootstrapV5 = breakpointsBootstrapV5;
exports.breakpointsElement = breakpointsElement;
exports.breakpointsMasterCss = breakpointsMasterCss;
exports.breakpointsPrimeFlex = breakpointsPrimeFlex;
exports.breakpointsQuasar = breakpointsQuasar;
exports.breakpointsSematic = breakpointsSematic;
exports.breakpointsTailwind = breakpointsTailwind;
exports.breakpointsVuetify = breakpointsVuetify;
exports.breakpointsVuetifyV2 = breakpointsVuetifyV2;
exports.breakpointsVuetifyV3 = breakpointsVuetifyV3;
exports.cloneFnJSON = cloneFnJSON;
exports.computedAsync = computedAsync;
exports.computedInject = computedInject;
exports.createFetch = createFetch;
exports.createReusableTemplate = createReusableTemplate;
exports.createTemplatePromise = createTemplatePromise;
exports.createUnrefFn = createUnrefFn;
exports.customStorageEventName = customStorageEventName;
exports.defaultDocument = defaultDocument;
exports.defaultLocation = defaultLocation;
exports.defaultNavigator = defaultNavigator;
exports.defaultWindow = defaultWindow;
exports.executeTransition = executeTransition;
exports.formatTimeAgo = formatTimeAgo;
exports.getSSRHandler = getSSRHandler;
exports.mapGamepadToXbox360Controller = mapGamepadToXbox360Controller;
exports.onClickOutside = onClickOutside;
exports.onElementRemoval = onElementRemoval;
exports.onKeyDown = onKeyDown;
exports.onKeyPressed = onKeyPressed;
exports.onKeyStroke = onKeyStroke;
exports.onKeyUp = onKeyUp;
exports.onLongPress = onLongPress;
exports.onStartTyping = onStartTyping;
exports.provideSSRWidth = provideSSRWidth;
exports.setSSRHandler = setSSRHandler;
exports.templateRef = templateRef;
exports.unrefElement = unrefElement;
exports.useActiveElement = useActiveElement;
exports.useAnimate = useAnimate;
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
exports.useClipboardItems = useClipboardItems;
exports.useCloned = useCloned;
exports.useColorMode = useColorMode;
exports.useConfirmDialog = useConfirmDialog;
exports.useCountdown = useCountdown;
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
exports.useParentElement = useParentElement;
exports.usePerformanceObserver = usePerformanceObserver;
exports.usePermission = usePermission;
exports.usePointer = usePointer;
exports.usePointerLock = usePointerLock;
exports.usePointerSwipe = usePointerSwipe;
exports.usePreferredColorScheme = usePreferredColorScheme;
exports.usePreferredContrast = usePreferredContrast;
exports.usePreferredDark = usePreferredDark;
exports.usePreferredLanguages = usePreferredLanguages;
exports.usePreferredReducedMotion = usePreferredReducedMotion;
exports.usePreferredReducedTransparency = usePreferredReducedTransparency;
exports.usePrevious = usePrevious;
exports.useRafFn = useRafFn;
exports.useRefHistory = useRefHistory;
exports.useResizeObserver = useResizeObserver;
exports.useSSRWidth = useSSRWidth;
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
  if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
    enumerable: true,
    get: function () { return shared[k]; }
  });
});
